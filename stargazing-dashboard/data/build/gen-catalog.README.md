# Stargazing catalog — generation and provenance

This note records how the three static datasets under `stargazing-dashboard/data/`
were produced and where the underlying numbers come from. It is descriptive
prose only: it contains no live links, no remote endpoints, and no runtime
network dependency. The route loads the emitted JSON through relative paths
(`./data/stars.json`, `./data/constellations.json`, `./data/meteor-showers.json`).

## Generator

The datasets are produced by `tools/gen-stargazing-catalog.mjs`, an offline
ESM Node script. It performs no network access; every input is a local file
path supplied on the command line. Run `node tools/gen-stargazing-catalog.mjs --help`
for usage.

Invocation used to build the committed files:

```
node tools/gen-stargazing-catalog.mjs \
  --stars <local-bright-star-csv> \
  --lines <local-constellation-line-geojson> \
  --out-dir stargazing-dashboard/data
```

## stars.json

- **Source catalogue.** A naked-eye subset derived from the open HYG database,
  an amateur-astronomy compilation that merges the Hipparcos catalogue, the Yale
  Bright Star Catalogue, and the Gliese catalogue of nearby stars. The HYG
  "CURRENT" combined CSV (v4.1) was used as the local input. Only the columns
  the generator needs are read by header name: `id`, `hip`, `proper`, `ra`
  (right ascension in hours), `dec` (declination in degrees), `mag` (apparent
  visual magnitude), `ci` (B–V color index), and `spect` (spectral type, used as
  a B–V fallback).
- **Filtering.** The Sun (catalogue id `0`) is removed. Only stars with apparent
  magnitude ≤ 5.5 are kept, which approximates the naked-eye limit under good
  skies.
- **Dedupe.** Rows are keyed by Hipparcos id where present, otherwise by rounded
  sky position; the brightest record wins for any collision.
- **Cap and ordering.** If more than 3000 stars survive the filter they are
  truncated brightest-first; the committed build contains 2863 stars (the full
  set under the magnitude cut, none discarded). Output is then sorted by right
  ascension then declination and reindexed to a contiguous 0-based `i`.
- **Rounding.** `ra` and `dec` to 5 decimal places, `mag` and `bv` to 2.
- **Names.** The catalogue `proper` name is attached as `n` for stars that carry
  one (332 stars in the committed build, covering the bright, well-known stars).
- **B–V fallback.** When the catalogue color index is missing, an approximate
  B–V is assigned from the leading spectral-class letter (O/B/A/F/G/K/M) using a
  standard representative value per class.

Record shape: `{ "i": int, "ra": hours, "dec": deg, "mag": float, "bv": float, "n": string? }`.

## constellations.json

- **Topology source.** Constellation stick-figure segments come from an open
  constellation-lines dataset distributed as GeoJSON `MultiLineString`
  geometries. Each vertex in that file is a real catalogue star position
  (`[raDeg, decDeg]`), and each feature carries the IAU three-letter
  constellation abbreviation as its `id`.
- **Index binding.** For every line segment the generator snaps each endpoint to
  the nearest emitted star within a 0.4° tolerance and records the pair of
  reindexed `i` values. Because the snap targets the same star list emitted to
  `stars.json`, referential integrity is guaranteed. Any segment whose endpoint
  star did not survive the magnitude cut is dropped, so the figures degrade
  gracefully rather than referencing a missing star.
- **Coverage.** The committed build contains 739 unique line pairs spanning all
  88 IAU constellations, including the prominent figures (Orion, Ursa Major,
  Crux, Cassiopeia, Scorpius, Cygnus, and so on).
- **Names map.** The `names` object maps each abbreviation that appears in the
  emitted lines to its full constellation name. The abbreviation→name table is
  embedded in the generator using the standard IAU nomenclature.

Record shape: `{ "lines": [[i, j], ...], "names": { "<ABBR>": "<Full Name>" } }`.

## meteor-showers.json

The annual meteor showers are hand-authored in the generator from established
public almanac knowledge — there is no input file for this dataset. The set
covers the well-known annual showers: Quadrantids, Lyrids, Eta Aquariids,
Southern Delta Aquariids, Perseids, Orionids, Southern and Northern Taurids,
Leonids, Geminids, and Ursids. Each entry carries a standard peak month/day, the
approximate radiant position, and a representative zenithal hourly rate (ZHR).

Record shape: `{ "id": slug, "name": string, "peakMonth": 1-12, "peakDay": 1-31, "radiantRaHours": 0..24, "radiantDecDeg": -90..90, "zhr": int }`.

## Reproducing

1. Obtain the HYG "CURRENT" combined star CSV and an HIP/position-based
   constellation-lines GeoJSON locally (both are openly licensed amateur
   astronomy datasets).
2. Run the generator with `--stars` and `--lines` pointed at those local files.
3. Validate the output: confirm `stars.json` parses, holds 2000–3000 entries,
   every magnitude ≤ 5.5, every numeric field present; confirm every
   `constellations.json` line pair references a valid star index; confirm the
   meteor shower entries fall in plausible ranges.

## Licensing note

The HYG database and the constellation-line topology are openly licensed for
reuse. Only derived numeric values (positions, magnitudes, color indices, and
index pairs) are committed here; no upstream branding, attribution links, or
remote assets are embedded in the shipped JSON or in the route.
