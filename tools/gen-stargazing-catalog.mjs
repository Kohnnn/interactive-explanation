import fs from "node:fs";
import path from "node:path";
import process from "node:process";

/*
 * gen-stargazing-catalog.mjs
 *
 * OFFLINE generator for the stargazing-dashboard static catalog.
 * Reads a LOCAL bright-star catalogue file (HYG-database derived CSV) and a
 * LOCAL constellation stick-figure line file (GeoJSON MultiLineString of real
 * star positions), then emits three static JSON datasets consumed by the route
 * via relative paths:
 *   - stars.json            naked-eye star subset (mag <= 5.5), reindexed
 *   - constellations.json   line pairs over the reindexed star indices + names
 *   - meteor-showers.json   well-known annual showers (embedded public knowledge)
 *
 * This tool performs NO network access. All inputs are local file paths passed
 * on the command line. See data/build/gen-catalog.README.md for provenance.
 */

const MAG_LIMIT = 5.5;
const MAX_STARS = 3000;
const MIN_STARS = 2000;
// Angular tolerance (degrees) for matching a constellation-line vertex (a real
// star position) to an emitted star. Vertices are catalogue positions, so the
// nearest emitted star is typically < 0.05 deg away; this is a safety margin.
const MATCH_TOLERANCE_DEG = 0.4;

// IAU three-letter abbreviation -> full constellation name (88 constellations).
// Public, stable nomenclature; embedded so the emitted names map needs no input.
const CONSTELLATION_NAMES = {
  And: "Andromeda",
  Ant: "Antlia",
  Aps: "Apus",
  Aql: "Aquila",
  Aqr: "Aquarius",
  Ara: "Ara",
  Ari: "Aries",
  Aur: "Auriga",
  Boo: "Bootes",
  CMa: "Canis Major",
  CMi: "Canis Minor",
  CVn: "Canes Venatici",
  Cae: "Caelum",
  Cam: "Camelopardalis",
  Cap: "Capricornus",
  Car: "Carina",
  Cas: "Cassiopeia",
  Cen: "Centaurus",
  Cep: "Cepheus",
  Cet: "Cetus",
  Cha: "Chamaeleon",
  Cir: "Circinus",
  Cnc: "Cancer",
  Col: "Columba",
  Com: "Coma Berenices",
  CrA: "Corona Australis",
  CrB: "Corona Borealis",
  Crt: "Crater",
  Cru: "Crux",
  Crv: "Corvus",
  Cyg: "Cygnus",
  Del: "Delphinus",
  Dor: "Dorado",
  Dra: "Draco",
  Equ: "Equuleus",
  Eri: "Eridanus",
  For: "Fornax",
  Gem: "Gemini",
  Gru: "Grus",
  Her: "Hercules",
  Hor: "Horologium",
  Hya: "Hydra",
  Hyi: "Hydrus",
  Ind: "Indus",
  LMi: "Leo Minor",
  Lac: "Lacerta",
  Leo: "Leo",
  Lep: "Lepus",
  Lib: "Libra",
  Lup: "Lupus",
  Lyn: "Lynx",
  Lyr: "Lyra",
  Men: "Mensa",
  Mic: "Microscopium",
  Mon: "Monoceros",
  Mus: "Musca",
  Nor: "Norma",
  Oct: "Octans",
  Oph: "Ophiuchus",
  Ori: "Orion",
  Pav: "Pavo",
  Peg: "Pegasus",
  Per: "Perseus",
  Phe: "Phoenix",
  Pic: "Pictor",
  PsA: "Piscis Austrinus",
  Psc: "Pisces",
  Pup: "Puppis",
  Pyx: "Pyxis",
  Ret: "Reticulum",
  Scl: "Sculptor",
  Sco: "Scorpius",
  Sct: "Scutum",
  Ser: "Serpens",
  Sex: "Sextans",
  Sge: "Sagitta",
  Sgr: "Sagittarius",
  Tau: "Taurus",
  Tel: "Telescopium",
  TrA: "Triangulum Australe",
  Tri: "Triangulum",
  Tuc: "Tucana",
  UMa: "Ursa Major",
  UMi: "Ursa Minor",
  Vel: "Vela",
  Vir: "Virgo",
  Vol: "Volans",
  Vul: "Vulpecula",
};

// Well-known annual meteor showers (standard peak dates, radiants, ZHR).
// Authored from established public almanac knowledge; no external references.
const METEOR_SHOWERS = [
  { id: "quadrantids", name: "Quadrantids", peakMonth: 1, peakDay: 3, radiantRaHours: 15.33, radiantDecDeg: 49, zhr: 120 },
  { id: "lyrids", name: "Lyrids", peakMonth: 4, peakDay: 22, radiantRaHours: 18.13, radiantDecDeg: 34, zhr: 18 },
  { id: "eta-aquariids", name: "Eta Aquariids", peakMonth: 5, peakDay: 6, radiantRaHours: 22.47, radiantDecDeg: -1, zhr: 50 },
  { id: "delta-aquariids", name: "Southern Delta Aquariids", peakMonth: 7, peakDay: 30, radiantRaHours: 22.67, radiantDecDeg: -16, zhr: 25 },
  { id: "perseids", name: "Perseids", peakMonth: 8, peakDay: 12, radiantRaHours: 3.13, radiantDecDeg: 58, zhr: 100 },
  { id: "orionids", name: "Orionids", peakMonth: 10, peakDay: 21, radiantRaHours: 6.33, radiantDecDeg: 16, zhr: 20 },
  { id: "southern-taurids", name: "Southern Taurids", peakMonth: 11, peakDay: 5, radiantRaHours: 3.5, radiantDecDeg: 14, zhr: 5 },
  { id: "northern-taurids", name: "Northern Taurids", peakMonth: 11, peakDay: 12, radiantRaHours: 3.87, radiantDecDeg: 22, zhr: 5 },
  { id: "leonids", name: "Leonids", peakMonth: 11, peakDay: 17, radiantRaHours: 10.13, radiantDecDeg: 22, zhr: 15 },
  { id: "geminids", name: "Geminids", peakMonth: 12, peakDay: 14, radiantRaHours: 7.47, radiantDecDeg: 33, zhr: 150 },
  { id: "ursids", name: "Ursids", peakMonth: 12, peakDay: 22, radiantRaHours: 14.48, radiantDecDeg: 76, zhr: 10 },
];

const USAGE = `gen-stargazing-catalog.mjs - offline stargazing catalog generator

Usage:
  node tools/gen-stargazing-catalog.mjs --stars <localCsv> --lines <localGeoJson> --out-dir <dir>

Options:
  --stars <path>    LOCAL bright-star catalogue CSV (HYG-database derived).
                    Required. Reads columns by header: id, hip, proper, ra
                    (hours), dec (degrees), mag, ci (B-V).
  --lines <path>    LOCAL constellation line file. GeoJSON FeatureCollection of
                    MultiLineString geometries whose vertices are [raDeg, decDeg]
                    real star positions, with a feature "id" holding the IAU
                    three-letter constellation abbreviation. Required.
  --out-dir <dir>   Output directory for the three JSON files.
                    Default: stargazing-dashboard/data
  -h, --help        Print this usage and exit.

Emits (into --out-dir):
  stars.json, constellations.json, meteor-showers.json

Notes:
  - Only naked-eye stars (mag <= ${MAG_LIMIT}) are kept; capped at ${MAX_STARS}.
  - Stars are deduped and reindexed to a contiguous 0-based "i".
  - Constellation segments reference the reindexed indices; a segment is dropped
    when either endpoint has no emitted star within ${MATCH_TOLERANCE_DEG} degrees.
  - Performs no network access. All inputs are local files.
`;

function fail(message) {
  process.stderr.write(`error: ${message}\n`);
  process.exit(1);
}

function parseArgs(argv) {
  const args = { stars: null, lines: null, outDir: null, help: false };
  for (let k = 0; k < argv.length; k += 1) {
    const token = argv[k];
    if (token === "-h" || token === "--help") {
      args.help = true;
    } else if (token === "--stars") {
      args.stars = argv[k += 1];
    } else if (token === "--lines") {
      args.lines = argv[k += 1];
    } else if (token === "--out-dir") {
      args.outDir = argv[k += 1];
    } else {
      fail(`unknown argument: ${token}`);
    }
  }
  return args;
}

// Minimal RFC-4180-ish CSV line splitter (handles double-quoted fields).
function splitCsvLine(line) {
  const fields = [];
  let current = "";
  let quoted = false;
  for (let k = 0; k < line.length; k += 1) {
    const ch = line[k];
    if (ch === "\"") {
      if (quoted && line[k + 1] === "\"") {
        current += "\"";
        k += 1;
      } else {
        quoted = !quoted;
      }
    } else if (ch === "," && !quoted) {
      fields.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields;
}

function round(value, decimals) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

// Estimate a B-V color index from a spectral class letter when ci is absent.
function bvFromSpectral(spect) {
  const letter = (spect || "").trim().charAt(0).toUpperCase();
  const table = { O: -0.32, B: -0.13, A: 0.06, F: 0.43, G: 0.7, K: 1.1, M: 1.5 };
  return Object.prototype.hasOwnProperty.call(table, letter) ? table[letter] : 0;
}

function readStars(starsPath) {
  const text = fs.readFileSync(starsPath, "utf8");
  const lines = text.split(/\r?\n/);
  if (lines.length < 2) {
    fail(`stars file has no data rows: ${starsPath}`);
  }
  const header = splitCsvLine(lines[0]).map((name) => name.replace(/"/g, "").trim());
  const col = {};
  header.forEach((name, index) => {
    col[name] = index;
  });
  for (const required of ["ra", "dec", "mag"]) {
    if (!Object.prototype.hasOwnProperty.call(col, required)) {
      fail(`stars file is missing required column "${required}"`);
    }
  }

  // Dedupe key prefers HIP id; falls back to rounded position. Keep brightest.
  const byKey = new Map();
  for (let k = 1; k < lines.length; k += 1) {
    const raw = lines[k];
    if (!raw) {
      continue;
    }
    const cells = splitCsvLine(raw);
    const id = (cells[col.id] || "").trim();
    if (id === "0") {
      continue; // Sol
    }
    const ra = Number.parseFloat(cells[col.ra]);
    const dec = Number.parseFloat(cells[col.dec]);
    const mag = Number.parseFloat(cells[col.mag]);
    if (!Number.isFinite(ra) || !Number.isFinite(dec) || !Number.isFinite(mag)) {
      continue;
    }
    if (mag > MAG_LIMIT) {
      continue;
    }
    let bv = col.ci !== undefined ? Number.parseFloat(cells[col.ci]) : Number.NaN;
    if (!Number.isFinite(bv)) {
      bv = bvFromSpectral(col.spect !== undefined ? cells[col.spect] : "");
    }
    const proper = col.proper !== undefined ? (cells[col.proper] || "").trim() : "";
    const hip = col.hip !== undefined ? (cells[col.hip] || "").trim() : "";
    const key = hip !== "" ? `hip:${hip}` : `pos:${ra.toFixed(4)},${dec.toFixed(4)}`;

    const record = {
      ra: round(ra, 5),
      dec: round(dec, 5),
      mag: round(mag, 2),
      bv: round(bv, 2),
      proper,
    };
    const existing = byKey.get(key);
    if (!existing || record.mag < existing.mag) {
      byKey.set(key, record);
    }
  }

  let stars = [...byKey.values()];
  // Brightest first so the magnitude cap (if hit) keeps the most visible stars.
  stars.sort((a, b) => a.mag - b.mag);
  if (stars.length > MAX_STARS) {
    stars = stars.slice(0, MAX_STARS);
  }
  // Stable spatial order for output (RA then dec) before reindexing.
  stars.sort((a, b) => (a.ra - b.ra) || (a.dec - b.dec));

  return stars.map((star, index) => {
    const out = {
      i: index,
      ra: star.ra,
      dec: star.dec,
      mag: star.mag,
      bv: star.bv,
    };
    if (star.proper) {
      out.n = star.proper;
    }
    return out;
  });
}

// Great-circle angular distance (degrees) between two equatorial positions.
function angularDistanceDeg(raHoursA, decDegA, raHoursB, decDegB) {
  const toRad = Math.PI / 180;
  const ra1 = raHoursA * 15 * toRad;
  const ra2 = raHoursB * 15 * toRad;
  const dec1 = decDegA * toRad;
  const dec2 = decDegB * toRad;
  const cosSep =
    Math.sin(dec1) * Math.sin(dec2) +
    Math.cos(dec1) * Math.cos(dec2) * Math.cos(ra1 - ra2);
  const clamped = Math.min(1, Math.max(-1, cosSep));
  return Math.acos(clamped) / toRad;
}

// Build a coarse RA/dec grid index for fast nearest-star lookup.
function buildSpatialIndex(stars) {
  const cell = 5; // degrees
  const buckets = new Map();
  const keyOf = (raDeg, decDeg) => {
    const rb = Math.floor(((raDeg % 360) + 360) % 360 / cell);
    const db = Math.floor((decDeg + 90) / cell);
    return `${rb}:${db}`;
  };
  for (const star of stars) {
    const k = keyOf(star.ra * 15, star.dec);
    if (!buckets.has(k)) {
      buckets.set(k, []);
    }
    buckets.get(k).push(star);
  }
  return { cell, buckets, keyOf };
}

function nearestStar(index, stars, raDeg, decDeg) {
  const { cell, buckets } = index;
  const rbCenter = Math.floor(((raDeg % 360) + 360) % 360 / cell);
  const dbCenter = Math.floor((decDeg + 90) / cell);
  const raHours = raDeg / 15;
  let best = null;
  let bestDist = Infinity;
  const span = Math.max(1, Math.ceil(MATCH_TOLERANCE_DEG / cell) + 1);
  for (let dr = -span; dr <= span; dr += 1) {
    for (let dd = -span; dd <= span; dd += 1) {
      const rb = ((rbCenter + dr) % (360 / cell) + (360 / cell)) % (360 / cell);
      const db = dbCenter + dd;
      const bucket = buckets.get(`${rb}:${db}`);
      if (!bucket) {
        continue;
      }
      for (const star of bucket) {
        const dist = angularDistanceDeg(raHours, decDeg, star.ra, star.dec);
        if (dist < bestDist) {
          bestDist = dist;
          best = star;
        }
      }
    }
  }
  return best && bestDist <= MATCH_TOLERANCE_DEG ? best : null;
}

function readConstellations(linesPath, stars) {
  const text = fs.readFileSync(linesPath, "utf8");
  let geo;
  try {
    geo = JSON.parse(text);
  } catch (cause) {
    fail(`lines file is not valid JSON: ${linesPath} (${cause.message})`);
  }
  const features = Array.isArray(geo.features) ? geo.features : [];
  if (features.length === 0) {
    fail(`lines file has no features: ${linesPath}`);
  }

  const index = buildSpatialIndex(stars);
  const seen = new Set();
  const linePairs = [];
  const usedAbbrs = new Set();

  for (const feature of features) {
    const abbr = feature && feature.id ? String(feature.id) : "";
    const geometry = feature && feature.geometry ? feature.geometry : null;
    if (!geometry || geometry.type !== "MultiLineString" || !Array.isArray(geometry.coordinates)) {
      continue;
    }
    let abbrUsed = false;
    for (const segment of geometry.coordinates) {
      if (!Array.isArray(segment)) {
        continue;
      }
      for (let v = 0; v + 1 < segment.length; v += 1) {
        const a = segment[v];
        const b = segment[v + 1];
        if (!Array.isArray(a) || !Array.isArray(b)) {
          continue;
        }
        const starA = nearestStar(index, stars, a[0], a[1]);
        const starB = nearestStar(index, stars, b[0], b[1]);
        if (!starA || !starB || starA.i === starB.i) {
          continue;
        }
        const lo = Math.min(starA.i, starB.i);
        const hi = Math.max(starA.i, starB.i);
        const key = `${lo}-${hi}`;
        if (seen.has(key)) {
          abbrUsed = true;
          continue;
        }
        seen.add(key);
        linePairs.push([lo, hi]);
        abbrUsed = true;
      }
    }
    if (abbrUsed && abbr) {
      usedAbbrs.add(abbr);
    }
  }

  linePairs.sort((p, q) => (p[0] - q[0]) || (p[1] - q[1]));

  const names = {};
  for (const abbr of [...usedAbbrs].sort()) {
    if (CONSTELLATION_NAMES[abbr]) {
      names[abbr] = CONSTELLATION_NAMES[abbr];
    }
  }

  return { lines: linePairs, names };
}

function writeJson(outDir, fileName, payload) {
  const target = path.join(outDir, fileName);
  fs.writeFileSync(target, `${JSON.stringify(payload)}\n`, "utf8");
  return target;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || process.argv.slice(2).length === 0) {
    process.stdout.write(USAGE);
    return;
  }
  if (!args.stars) {
    fail("missing required --stars <localCsv>");
  }
  if (!args.lines) {
    fail("missing required --lines <localGeoJson>");
  }
  if (!fs.existsSync(args.stars)) {
    fail(`stars file not found: ${args.stars}`);
  }
  if (!fs.existsSync(args.lines)) {
    fail(`lines file not found: ${args.lines}`);
  }

  const outDir = args.outDir
    ? path.resolve(args.outDir)
    : path.resolve("stargazing-dashboard", "data");
  fs.mkdirSync(outDir, { recursive: true });

  const stars = readStars(args.stars);
  if (stars.length < MIN_STARS) {
    fail(`emitted ${stars.length} stars, below minimum ${MIN_STARS}; check input`);
  }
  if (stars.length > MAX_STARS) {
    fail(`emitted ${stars.length} stars, above maximum ${MAX_STARS}`);
  }

  const constellations = readConstellations(args.lines, stars);
  if (constellations.lines.length === 0) {
    fail("no constellation line segments matched emitted stars; check inputs");
  }

  const starsPath = writeJson(outDir, "stars.json", stars);
  const constellationsPath = writeJson(outDir, "constellations.json", constellations);
  const showersPath = writeJson(outDir, "meteor-showers.json", METEOR_SHOWERS);

  const mags = stars.map((s) => s.mag);
  process.stdout.write(
    [
      `stars:          ${stars.length} -> ${starsPath}`,
      `  magnitude:    min ${Math.min(...mags).toFixed(2)}  max ${Math.max(...mags).toFixed(2)}`,
      `constellations: ${constellations.lines.length} line pairs, ${Object.keys(constellations.names).length} names -> ${constellationsPath}`,
      `meteor showers: ${METEOR_SHOWERS.length} -> ${showersPath}`,
      "",
    ].join("\n"),
  );
}

main();
