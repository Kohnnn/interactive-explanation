import test from "node:test";
import assert from "node:assert/strict";
import {
  EXPERIENCE_BASELINE_VERSION,
  contrastRatio,
  median,
  mergeExperienceBaseline,
  performanceRegressions,
  serializeExperienceBaseline,
  summarizePerformanceRuns,
  validateExperienceBaseline,
  validateGeometryEvidence,
} from "../experience-baseline.mjs";

function evidence(overrides = {}) {
  return {
    domContentLoadedMs: 1000,
    loadMs: 1500,
    resourceCount: 20,
    resourceCountDelta: 0,
    sameOriginTransfer: { status: "supported", bytes: 1024 * 1024 },
    longestLocalResource: { path: "route/app.js", durationMs: 80 },
    ...overrides,
  };
}

function geometry(overrides = {}) {
  return {
    rect: { top: 10, right: 310, bottom: 210, left: 10, width: 300, height: 200 },
    css: { width: "300px", height: "200px", transform: "none", touchAction: "auto", pointerEvents: "auto" },
    aspectRatio: 1.5,
    intrinsic: [
      {
        key: "canvas:demo",
        tag: "canvas",
        rect: { top: 10, right: 310, bottom: 210, left: 10, width: 300, height: 200 },
        width: 600,
        height: 400,
        viewBox: null,
        title: null,
      },
    ],
    ...overrides,
  };
}

function routeEvidence(overrides = {}) {
  return {
    light: evidence(),
    dark: evidence(),
    geometry: {
      desktop: geometry(),
      mobile: geometry(),
      narrow: geometry(),
    },
    ...overrides,
  };
}

test("median selects the middle controlled run", () => {
  assert.equal(median([900, 300, 600]), 600);
  assert.equal(median([1, 4, 2, 3]), 2.5);
});

test("contrast ratio accepts opaque hex and rgb colors", () => {
  assert.equal(contrastRatio("#000", "rgb(255, 255, 255)"), 21);
  assert.ok(contrastRatio("#2b2620", "#f6efe0") > 4.5);
  assert.throws(() => contrastRatio("rgba(0, 0, 0, 0.5)", "#fff"), /opaque/);
});

test("performance timing budgets use the larger of twenty percent or 250ms", () => {
  const baseline = evidence();
  assert.deepEqual(performanceRegressions(evidence({ domContentLoadedMs: 1250, loadMs: 1800 }), baseline), []);
  assert.match(performanceRegressions(evidence({ domContentLoadedMs: 1251 }), baseline).join("\n"), /DOMContentLoaded/);
  assert.match(performanceRegressions(evidence({ loadMs: 1801 }), baseline).join("\n"), /load/);
});

test("performance transfer budgets use the larger of twenty percent or 250KiB", () => {
  const smallBaseline = evidence({ sameOriginTransfer: { status: "supported", bytes: 500 * 1024 } });
  assert.deepEqual(performanceRegressions(evidence({ sameOriginTransfer: { status: "supported", bytes: 750 * 1024 } }), smallBaseline), []);
  assert.match(performanceRegressions(evidence({ sameOriginTransfer: { status: "supported", bytes: 750 * 1024 + 1 } }), smallBaseline).join("\n"), /same-origin transfer/);
  const largeBaseline = evidence({ sameOriginTransfer: { status: "supported", bytes: 2 * 1024 * 1024 } });
  assert.deepEqual(performanceRegressions(evidence({ sameOriginTransfer: { status: "supported", bytes: 2.4 * 1024 * 1024 } }), largeBaseline), []);
});

test("unsupported transfer evidence remains unsupported", () => {
  const unsupported = evidence({ sameOriginTransfer: { status: "unsupported" } });
  const summary = summarizePerformanceRuns([unsupported, unsupported, unsupported]);
  assert.deepEqual(summary.sameOriginTransfer, { status: "unsupported" });
  assert.equal(Object.hasOwn(summary.sameOriginTransfer, "bytes"), false);
  assert.match(performanceRegressions(unsupported, evidence()).join("\n"), /became unsupported/);
});

test("resource count uses its approved delta", () => {
  const baseline = evidence({ resourceCountDelta: 2 });
  assert.deepEqual(performanceRegressions(evidence({ resourceCount: 22 }), baseline), []);
  assert.match(performanceRegressions(evidence({ resourceCount: 23 }), baseline).join("\n"), /resource count/);
});

test("geometry evidence validates exact runtime and intrinsic dimensions", () => {
  const valid = geometry();
  assert.equal(validateGeometryEvidence(valid), valid);
  assert.throws(() => validateGeometryEvidence({ ...valid, aspectRatio: 0 }), /positive/);
  assert.throws(() => validateGeometryEvidence({ ...valid, unexpected: true }), /keys must be/);
  assert.throws(() => validateGeometryEvidence({ ...valid, intrinsic: [{ ...valid.intrinsic[0], width: 600.5 }] }), /non-negative integer/);
});

test("experience baseline validates exact route, theme, and geometry evidence", () => {
  const baseline = {
    version: EXPERIENCE_BASELINE_VERSION,
    runs: 3,
    viewport: { width: 1400, height: 1000 },
    routes: {
      crowds: routeEvidence(),
    },
  };
  assert.equal(validateExperienceBaseline(baseline, ["crowds"]), baseline);
  assert.throws(() => validateExperienceBaseline(baseline, ["trust"]), /missing route trust/);
  assert.throws(() => validateExperienceBaseline({ ...baseline, runs: 2 }), /three runs/);
  assert.throws(() => validateExperienceBaseline({ ...baseline, version: 1 }), /version must be 2/);
});

test("experience baseline merge replaces selected routes and preserves others", () => {
  const existing = mergeExperienceBaseline(null, {
    crowds: routeEvidence(),
    trust: routeEvidence(),
  });
  const replacement = routeEvidence({
    light: evidence({ loadMs: 1700, resourceCountDelta: 2 }),
    dark: evidence({ loadMs: 1800, resourceCountDelta: 2 }),
  });
  const merged = mergeExperienceBaseline(existing, { crowds: replacement });
  assert.deepEqual(merged.routes.crowds, replacement);
  assert.deepEqual(merged.routes.trust, existing.routes.trust);
  assert.deepEqual(Object.keys(merged.routes), ["crowds", "trust"]);
});

test("experience baseline serialization is stable and newline terminated", () => {
  const baseline = mergeExperienceBaseline(null, {
    trust: routeEvidence(),
    crowds: routeEvidence(),
  });
  const serialized = serializeExperienceBaseline(baseline);
  assert.ok(serialized.endsWith("\n"));
  assert.equal(serializeExperienceBaseline(JSON.parse(serialized)), serialized);
  assert.deepEqual(Object.keys(JSON.parse(serialized).routes), ["crowds", "trust"]);
});

test("performance summaries retain an approved resource-count delta", () => {
  const summary = summarizePerformanceRuns([evidence(), evidence(), evidence()], 3);
  assert.equal(summary.resourceCountDelta, 3);
  assert.throws(() => summarizePerformanceRuns([evidence(), evidence(), evidence()], -1), /resource count delta/);
});
