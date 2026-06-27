/*
 * StargazingCatalog: lazy data loaders + strict validation + pure transforms.
 * Public shape on window.StargazingCatalog (also exported via module.exports
 * for node:test):
 *   async loadStars() -> Array
 *   async loadConstellations() -> { lines, names }
 *   async loadMeteorShowers() -> Array
 *   validateStarRecord(record) -> boolean
 *   validateConstellationData(data) -> boolean
 *   validateMeteorShowerRecord(record) -> boolean
 *   indexStars(stars) -> Map keyed by star i
 *   bvToRgb(bv) -> { r, g, b } in 0..1
 *   magnitudeToSize(mag, options) -> positive point size
 *   visibleMagnitudeLimit(lightPollution) -> limiting magnitude
 *   filterVisibleStars(stars, magLimit) -> Array
 *   resolveConstellationSegments(constellationData, starIndex) -> Array<{ a, b }>
 *
 * Catalog paths are relative only: ./data/stars.json,
 * ./data/constellations.json, ./data/meteor-showers.json.
 * Loaders are lazy; nothing fetches at script load. Loaders never throw and
 * validators never throw (they return safe empties / false).
 */
(function () {
  "use strict";

  const PATHS = {
    stars: "./data/stars.json",
    constellations: "./data/constellations.json",
    meteorShowers: "./data/meteor-showers.json",
  };

  const EMPTY_CONSTELLATIONS = { lines: [], names: {} };

  function isFiniteNumber(value) {
    return typeof value === "number" && Number.isFinite(value);
  }

  function isInteger(value) {
    return isFiniteNumber(value) && Number.isInteger(value);
  }

  function isPlainObject(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
  }

  function clamp(value, min, max) {
    if (value < min) {
      return min;
    }
    if (value > max) {
      return max;
    }
    return value;
  }

  async function fetchJson(path) {
    if (typeof fetch !== "function") {
      return null;
    }

    try {
      const response = await fetch(path);
      if (!response || !response.ok) {
        return null;
      }
      return await response.json();
    } catch (error) {
      return null;
    }
  }

  async function loadStars() {
    const data = await fetchJson(PATHS.stars);
    return Array.isArray(data) ? data : [];
  }

  async function loadConstellations() {
    const data = await fetchJson(PATHS.constellations);
    if (!isPlainObject(data)) {
      return { lines: [], names: {} };
    }
    const lines = Array.isArray(data.lines) ? data.lines : [];
    const names = isPlainObject(data.names) ? data.names : {};
    return { lines, names };
  }

  async function loadMeteorShowers() {
    const data = await fetchJson(PATHS.meteorShowers);
    return Array.isArray(data) ? data : [];
  }

  function validateStarRecord(record) {
    if (!isPlainObject(record)) {
      return false;
    }
    if (!isInteger(record.i) || record.i < 0) {
      return false;
    }
    if (!isFiniteNumber(record.ra) || record.ra < 0 || record.ra >= 24) {
      return false;
    }
    if (!isFiniteNumber(record.dec) || record.dec < -90 || record.dec > 90) {
      return false;
    }
    if (!isFiniteNumber(record.mag)) {
      return false;
    }
    if (record.bv !== undefined && !isFiniteNumber(record.bv)) {
      return false;
    }
    if (record.n !== undefined && typeof record.n !== "string") {
      return false;
    }
    return true;
  }

  function isIntegerPair(pair) {
    return Array.isArray(pair) && pair.length === 2 && isInteger(pair[0]) && isInteger(pair[1]);
  }

  function validateConstellationData(data) {
    if (!isPlainObject(data)) {
      return false;
    }
    if (!Array.isArray(data.lines)) {
      return false;
    }
    if (!isPlainObject(data.names)) {
      return false;
    }
    return data.lines.every(isIntegerPair);
  }

  function validateMeteorShowerRecord(record) {
    if (!isPlainObject(record)) {
      return false;
    }
    if (typeof record.id !== "string" || record.id.length === 0) {
      return false;
    }
    if (typeof record.name !== "string" || record.name.length === 0) {
      return false;
    }
    if (!isFiniteNumber(record.peakMonth) || record.peakMonth < 1 || record.peakMonth > 12) {
      return false;
    }
    if (!isFiniteNumber(record.peakDay) || record.peakDay < 1 || record.peakDay > 31) {
      return false;
    }
    if (!isFiniteNumber(record.radiantRaHours) || record.radiantRaHours < 0 || record.radiantRaHours > 24) {
      return false;
    }
    if (!isFiniteNumber(record.radiantDecDeg) || record.radiantDecDeg < -90 || record.radiantDecDeg > 90) {
      return false;
    }
    if (!isFiniteNumber(record.zhr) || record.zhr < 0) {
      return false;
    }
    return true;
  }

  function indexStars(stars) {
    const index = new Map();
    if (!Array.isArray(stars)) {
      return index;
    }
    for (const star of stars) {
      if (isPlainObject(star) && isInteger(star.i)) {
        index.set(star.i, star);
      }
    }
    return index;
  }

  // Approximate B-V color index -> linear RGB (0..1) blackbody-ish mapping.
  // Anchor points span hot blue stars (bv ~ -0.4) through white (~0.0) to
  // cool red stars (~ +2.0); intermediate values are linearly interpolated.
  const BV_STOPS = [
    { bv: -0.4, r: 0.61, g: 0.70, b: 1.0 },
    { bv: 0.0, r: 0.92, g: 0.94, b: 1.0 },
    { bv: 0.4, r: 1.0, g: 0.96, b: 0.86 },
    { bv: 0.8, r: 1.0, g: 0.89, b: 0.70 },
    { bv: 1.2, r: 1.0, g: 0.80, b: 0.55 },
    { bv: 1.6, r: 1.0, g: 0.71, b: 0.45 },
    { bv: 2.0, r: 1.0, g: 0.62, b: 0.40 },
  ];

  function bvToRgb(bv) {
    const value = isFiniteNumber(bv) ? clamp(bv, -0.4, 2.0) : 0.0;

    let lower = BV_STOPS[0];
    let upper = BV_STOPS[BV_STOPS.length - 1];
    for (let i = 0; i < BV_STOPS.length - 1; i += 1) {
      if (value >= BV_STOPS[i].bv && value <= BV_STOPS[i + 1].bv) {
        lower = BV_STOPS[i];
        upper = BV_STOPS[i + 1];
        break;
      }
    }

    const span = upper.bv - lower.bv;
    const t = span === 0 ? 0 : (value - lower.bv) / span;
    return {
      r: clamp(lower.r + (upper.r - lower.r) * t, 0, 1),
      g: clamp(lower.g + (upper.g - lower.g) * t, 0, 1),
      b: clamp(lower.b + (upper.b - lower.b) * t, 0, 1),
    };
  }

  const DEFAULT_SIZE_OPTIONS = {
    minSize: 1.0,
    maxSize: 6.0,
    magLimit: 6.0,
  };

  // Brighter stars (lower magnitude) render larger. Monotonically decreasing
  // in mag, clamped to [minSize, maxSize].
  function magnitudeToSize(mag, options) {
    const opts = isPlainObject(options) ? options : {};
    const minSize = isFiniteNumber(opts.minSize) ? opts.minSize : DEFAULT_SIZE_OPTIONS.minSize;
    const maxSize = isFiniteNumber(opts.maxSize) ? opts.maxSize : DEFAULT_SIZE_OPTIONS.maxSize;
    const magLimit = isFiniteNumber(opts.magLimit) ? opts.magLimit : DEFAULT_SIZE_OPTIONS.magLimit;

    const low = Math.min(minSize, maxSize);
    const high = Math.max(minSize, maxSize);

    if (!isFiniteNumber(mag)) {
      return low;
    }

    // Map mag onto [0, 1] where the brightest reference (mag = -1.5) is 1 and
    // the faintest visible (mag = magLimit) is 0, then scale into the size band.
    const brightRef = -1.5;
    const span = magLimit - brightRef;
    const fraction = span === 0 ? 1 : clamp((magLimit - mag) / span, 0, 1);
    return low + (high - low) * fraction;
  }

  // Naked-eye limiting magnitude as a function of light pollution in [0, 1].
  // 0 (pristine skies) -> ~6.5, 1 (inner city) -> ~4.0, linear between.
  function visibleMagnitudeLimit(lightPollution) {
    const pristineLimit = 6.5;
    const cityLimit = 4.0;
    const value = isFiniteNumber(lightPollution) ? clamp(lightPollution, 0, 1) : 0;
    return pristineLimit + (cityLimit - pristineLimit) * value;
  }

  function filterVisibleStars(stars, magLimit) {
    if (!Array.isArray(stars)) {
      return [];
    }
    const limit = isFiniteNumber(magLimit) ? magLimit : DEFAULT_SIZE_OPTIONS.magLimit;
    return stars.filter(function (star) {
      return isPlainObject(star) && isFiniteNumber(star.mag) && star.mag <= limit;
    });
  }

  function resolveConstellationSegments(constellationData, starIndex) {
    if (!isPlainObject(constellationData) || !Array.isArray(constellationData.lines)) {
      return [];
    }

    const getStar = (key) => {
      if (starIndex instanceof Map) {
        return starIndex.get(key);
      }
      if (isPlainObject(starIndex)) {
        return starIndex[key];
      }
      return undefined;
    };

    const segments = [];
    for (const pair of constellationData.lines) {
      if (!isIntegerPair(pair)) {
        continue;
      }
      const a = getStar(pair[0]);
      const b = getStar(pair[1]);
      if (a !== undefined && a !== null && b !== undefined && b !== null) {
        segments.push({ a, b });
      }
    }
    return segments;
  }

  const API = {
    loadStars,
    loadConstellations,
    loadMeteorShowers,
    validateStarRecord,
    validateConstellationData,
    validateMeteorShowerRecord,
    indexStars,
    bvToRgb,
    magnitudeToSize,
    visibleMagnitudeLimit,
    filterVisibleStars,
    resolveConstellationSegments,
  };

  if (typeof window !== "undefined") {
    window.StargazingCatalog = API;
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = API;
  }
}());
