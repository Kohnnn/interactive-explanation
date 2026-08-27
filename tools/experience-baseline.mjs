export const EXPERIENCE_BASELINE_VERSION = 2;

const THEMES = ["light", "dark"];
const VIEWPORTS = ["desktop", "mobile", "narrow"];
const EVIDENCE_KEYS = [
  "domContentLoadedMs",
  "loadMs",
  "resourceCount",
  "resourceCountDelta",
  "sameOriginTransfer",
  "longestLocalResource",
];
const GEOMETRY_KEYS = ["rect", "css", "aspectRatio", "intrinsic"];
const RECT_KEYS = ["top", "right", "bottom", "left", "width", "height"];
const CSS_KEYS = ["width", "height", "transform", "touchAction", "pointerEvents"];
const INTRINSIC_KEYS = ["key", "tag", "rect", "width", "height", "viewBox", "title"];

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function assertKeys(value, expected, label) {
  assert(isRecord(value), `${label} must be an object`);
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  assert(JSON.stringify(actual) === JSON.stringify(wanted), `${label} keys must be ${wanted.join(", ")}`);
}

function assertFinite(value, label) {
  assert(Number.isFinite(value), `${label} must be a finite number`);
}

function assertFiniteNonNegative(value, label) {
  assertFinite(value, label);
  assert(value >= 0, `${label} must be non-negative`);
}

function validateRect(rect, label) {
  assertKeys(rect, RECT_KEYS, label);
  RECT_KEYS.forEach((key) => assertFinite(rect[key], `${label}.${key}`));
  assert(rect.width >= 0 && rect.height >= 0, `${label} dimensions must be non-negative`);
}

export function validateGeometryEvidence(geometry, label = "geometry evidence") {
  assertKeys(geometry, GEOMETRY_KEYS, label);
  validateRect(geometry.rect, `${label}.rect`);
  assertKeys(geometry.css, CSS_KEYS, `${label}.css`);
  CSS_KEYS.forEach((key) => assert(typeof geometry.css[key] === "string", `${label}.css.${key} must be a string`));
  assertFiniteNonNegative(geometry.aspectRatio, `${label}.aspectRatio`);
  assert(geometry.aspectRatio > 0, `${label}.aspectRatio must be positive`);
  assert(Array.isArray(geometry.intrinsic), `${label}.intrinsic must be an array`);
  geometry.intrinsic.forEach((surface, index) => {
    const surfaceLabel = `${label}.intrinsic[${index}]`;
    assertKeys(surface, INTRINSIC_KEYS, surfaceLabel);
    assert(typeof surface.key === "string" && surface.key.trim(), `${surfaceLabel}.key must be a non-empty string`);
    assert(typeof surface.tag === "string" && surface.tag.trim(), `${surfaceLabel}.tag must be a non-empty string`);
    validateRect(surface.rect, `${surfaceLabel}.rect`);
    for (const key of ["width", "height"]) {
      assert(surface[key] === null || (Number.isInteger(surface[key]) && surface[key] >= 0), `${surfaceLabel}.${key} must be null or a non-negative integer`);
    }
    for (const key of ["viewBox", "title"]) {
      assert(surface[key] === null || typeof surface[key] === "string", `${surfaceLabel}.${key} must be null or a string`);
    }
  });
  return geometry;
}

function validateRouteGeometry(geometry, label) {
  assertKeys(geometry, VIEWPORTS, label);
  VIEWPORTS.forEach((viewport) => validateGeometryEvidence(geometry[viewport], `${label}.${viewport}`));
}

function parseColor(value) {
  const normalized = value.trim().toLowerCase();
  const hex = normalized.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i)?.[1];
  if (hex) {
    const channels = hex.length === 3
      ? hex.split("").map((channel) => Number.parseInt(channel + channel, 16))
      : [0, 2, 4].map((index) => Number.parseInt(hex.slice(index, index + 2), 16));
    return [...channels, 1];
  }
  const rgb = normalized.match(/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/);
  assert(rgb, `unsupported CSS color: ${value}`);
  const alpha = rgb[4]?.endsWith("%") ? Number.parseFloat(rgb[4]) / 100 : Number.parseFloat(rgb[4] || "1");
  return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3]), alpha];
}

function relativeLuminance(channels) {
  const linear = channels.slice(0, 3).map((channel) => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
}

export function contrastRatio(foreground, background) {
  const foregroundChannels = parseColor(foreground);
  const backgroundChannels = parseColor(background);
  assert(foregroundChannels[3] === 1 && backgroundChannels[3] === 1, "contrast colors must be opaque");
  const foregroundLuminance = relativeLuminance(foregroundChannels);
  const backgroundLuminance = relativeLuminance(backgroundChannels);
  return (Math.max(foregroundLuminance, backgroundLuminance) + 0.05) /
    (Math.min(foregroundLuminance, backgroundLuminance) + 0.05);
}

function validateTransfer(transfer, label) {
  assert(isRecord(transfer), `${label} must be an object`);
  assert(transfer.status === "supported" || transfer.status === "unsupported", `${label}.status must be supported or unsupported`);
  if (transfer.status === "supported") {
    assertKeys(transfer, ["status", "bytes"], label);
    assertFiniteNonNegative(transfer.bytes, `${label}.bytes`);
    return;
  }
  assertKeys(transfer, ["status"], label);
}

function validateLongestResource(resource, label) {
  if (resource === null) {
    return;
  }
  assertKeys(resource, ["path", "durationMs"], label);
  assert(typeof resource.path === "string" && resource.path.trim(), `${label}.path must be a non-empty string`);
  assertFiniteNonNegative(resource.durationMs, `${label}.durationMs`);
}

export function validatePerformanceEvidence(evidence, label = "performance evidence") {
  assertKeys(evidence, EVIDENCE_KEYS, label);
  assertFiniteNonNegative(evidence.domContentLoadedMs, `${label}.domContentLoadedMs`);
  assertFiniteNonNegative(evidence.loadMs, `${label}.loadMs`);
  assert(Number.isInteger(evidence.resourceCount) && evidence.resourceCount >= 0, `${label}.resourceCount must be a non-negative integer`);
  assert(Number.isInteger(evidence.resourceCountDelta) && evidence.resourceCountDelta >= 0, `${label}.resourceCountDelta must be a non-negative integer`);
  validateTransfer(evidence.sameOriginTransfer, `${label}.sameOriginTransfer`);
  validateLongestResource(evidence.longestLocalResource, `${label}.longestLocalResource`);
  return evidence;
}

export function median(values) {
  assert(Array.isArray(values) && values.length > 0, "median requires at least one value");
  values.forEach((value) => assertFiniteNonNegative(value, "median value"));
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) {
    return sorted[middle];
  }
  return (sorted[middle - 1] + sorted[middle]) / 2;
}

export function summarizePerformanceRuns(runs, resourceCountDelta = 0) {
  assert(Array.isArray(runs) && runs.length === 3, "performance evidence requires exactly three runs");
  assert(Number.isInteger(resourceCountDelta) && resourceCountDelta >= 0, "resource count delta must be a non-negative integer");
  runs.forEach((run, index) => validatePerformanceEvidence(run, `performance run ${index + 1}`));
  const supportedTransfers = runs.every((run) => run.sameOriginTransfer.status === "supported");
  const resources = runs
    .map((run) => run.longestLocalResource)
    .filter(Boolean)
    .sort((left, right) => left.durationMs - right.durationMs);
  const longestLocalResource = resources.length > 0
    ? resources[Math.floor(resources.length / 2)]
    : null;
  return {
    domContentLoadedMs: Math.round(median(runs.map((run) => run.domContentLoadedMs))),
    loadMs: Math.round(median(runs.map((run) => run.loadMs))),
    resourceCount: Math.round(median(runs.map((run) => run.resourceCount))),
    resourceCountDelta,
    sameOriginTransfer: supportedTransfers
      ? {
          status: "supported",
          bytes: Math.round(median(runs.map((run) => run.sameOriginTransfer.bytes))),
        }
      : { status: "unsupported" },
    longestLocalResource: longestLocalResource
      ? {
          path: longestLocalResource.path,
          durationMs: Math.round(longestLocalResource.durationMs),
        }
      : null,
  };
}

export function performanceRegressions(actual, baseline) {
  validatePerformanceEvidence(actual, "actual performance evidence");
  validatePerformanceEvidence(baseline, "baseline performance evidence");
  const regressions = [];
  const timingChecks = [
    ["domContentLoadedMs", "DOMContentLoaded"],
    ["loadMs", "load"],
  ];
  for (const [key, label] of timingChecks) {
    const allowance = Math.max(baseline[key] * 0.2, 250);
    if (actual[key] > baseline[key] + allowance) {
      regressions.push(`${label} ${actual[key]}ms exceeded ${baseline[key]}ms + ${Math.round(allowance)}ms`);
    }
  }
  if (baseline.sameOriginTransfer.status === "supported") {
    if (actual.sameOriginTransfer.status !== "supported") {
      regressions.push("same-origin transfer reporting became unsupported");
    } else {
      const allowance = Math.max(baseline.sameOriginTransfer.bytes * 0.2, 250 * 1024);
      if (actual.sameOriginTransfer.bytes > baseline.sameOriginTransfer.bytes + allowance) {
        regressions.push(`same-origin transfer ${actual.sameOriginTransfer.bytes} bytes exceeded ${baseline.sameOriginTransfer.bytes} bytes + ${Math.round(allowance)} bytes`);
      }
    }
  }
  if (actual.resourceCount > baseline.resourceCount + baseline.resourceCountDelta) {
    regressions.push(`resource count ${actual.resourceCount} exceeded ${baseline.resourceCount} + ${baseline.resourceCountDelta}`);
  }
  return regressions;
}

export function validateExperienceBaseline(baseline, requiredSlugs = []) {
  assertKeys(baseline, ["version", "runs", "viewport", "routes"], "experience baseline");
  assert(baseline.version === EXPERIENCE_BASELINE_VERSION, `experience baseline version must be ${EXPERIENCE_BASELINE_VERSION}`);
  assert(baseline.runs === 3, "experience baseline must use three runs");
  assertKeys(baseline.viewport, ["width", "height"], "experience baseline viewport");
  assert(baseline.viewport.width === 1400 && baseline.viewport.height === 1000, "experience baseline viewport must be 1400x1000");
  assert(isRecord(baseline.routes), "experience baseline routes must be an object");
  for (const [slug, route] of Object.entries(baseline.routes)) {
    assert(typeof slug === "string" && slug.trim(), "experience baseline route slug must be non-empty");
    assertKeys(route, [...THEMES, "geometry"], `experience baseline route ${slug}`);
    for (const theme of THEMES) {
      validatePerformanceEvidence(route[theme], `experience baseline route ${slug} ${theme}`);
    }
    validateRouteGeometry(route.geometry, `experience baseline route ${slug} geometry`);
  }
  for (const slug of requiredSlugs) {
    assert(Object.hasOwn(baseline.routes, slug), `experience baseline is missing route ${slug}`);
  }
  return baseline;
}

export function mergeExperienceBaseline(existingBaseline, recordedRoutes) {
  assert(isRecord(recordedRoutes), "recorded routes must be an object");
  const existingRoutes = existingBaseline
    ? validateExperienceBaseline(existingBaseline).routes
    : {};
  const merged = {
    version: EXPERIENCE_BASELINE_VERSION,
    runs: 3,
    viewport: { width: 1400, height: 1000 },
    routes: Object.fromEntries(
      Object.entries({ ...existingRoutes, ...recordedRoutes })
        .sort(([left], [right]) => left.localeCompare(right)),
    ),
  };
  validateExperienceBaseline(merged, Object.keys(recordedRoutes));
  return merged;
}

export function serializeExperienceBaseline(baseline) {
  validateExperienceBaseline(baseline);
  return `${JSON.stringify(baseline, null, 2)}\n`;
}
