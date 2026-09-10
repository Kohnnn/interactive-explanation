import fs from "node:fs";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { geometryReview, geometrySourceBinding, verifyGeometryReview } from "../geometry-review.mjs";
import { sourceIdentity } from "../diagnose-baseline.mjs";
import { compareGeometry, compareCell } from "../qualify-pr.mjs";

const identities = Object.fromEntries(["base", "head"].map(side => [side, { head: side === "base" ? geometryReview.baseSha : geometryReview.admittedHeadSha, status: "", sources: geometryReview.sources[side] }]));
const tools = { admittedHeadSha: geometryReview.admittedHeadSha, capture: geometryReview.captureTools, measurementFunctions: geometryReview.measurementFunctions.hashes, replay: geometryReview.replayTools, replayFunctions: geometryReview.replayFunctions.hashes };
const review = verifyGeometryReview(geometryReview, identities, tools);
const cell = "atlas/desktop/light";
function fixture() {
  const before = { rect: { top: 0, right: 100, bottom: 100, left: 0, width: 100, height: 100 }, css: { width: "100px", height: "100px", transform: "none", touchAction: "auto", pointerEvents: "auto" }, aspectRatio: 1, intrinsic: [] };
  const after = structuredClone(before);
  for (const [pointer, left, right] of geometryReview.cells[cell]) {
    for (const [geometry, value] of [[before, left], [after, right]]) {
      const parts = pointer.slice(1).split("/");
      const key = parts.pop();
      const parent = parts.reduce((object, part) => object[part] ??= {}, geometry);
      parent[key] = value;
    }
  }
  const samples = geometry => Array.from({ length: 3 }, () => ({ status: "measured", ready: true, errors: [], geometry: structuredClone(geometry) }));
  return [samples(before), samples(before), samples(after)];
}
const result = groups => compareGeometry(...groups, review, cell);
for (const group of [0, 1, 2]) test(`full geometry rejects malformed intrinsic in group ${group}`, () => {
  const groups = fixture();
  for (const sample of groups[group]) sample.geometry.intrinsic = {};
  assert.equal(result(groups).status, "blocked");
});
test("committed review has exactly 62 cells and 1590 leaves, no rigid or bridge admissions", () => {
  assert.equal(Object.keys(geometryReview.cells).length, 62);
  assert.equal(Object.values(geometryReview.cells).flat().length, 1590);
  assert(!Object.keys(geometryReview.cells).some(cell => /^(rigid-body-collisions|sim|markov-chains)\//.test(cell)));
  for (const leaves of Object.values(geometryReview.cells)) assert.equal(new Set(leaves.map(([pointer]) => pointer)).size, leaves.length);
  assert.equal(result(fixture()).status, "passed-reviewed");
  assert.equal(compareGeometry(...fixture()).status, "blocked");
});
test("unknown cell or unverified review cannot admit geometry", () => {
  assert.equal(compareGeometry(...fixture(), review, "atlas/desktop/unknown").status, "blocked");
  assert.equal(compareGeometry(...fixture(), {}, cell).status, "blocked");
});
for (const mode of ["unknown-path", "empty-object", "before", "extra", "missing", "protected", "missing-control", "extra-control", "aa", "unstable-control", "unstable-before", "unstable-after", "failed", "not-ready"]) {
  test(`review rejects ${mode}`, () => {
    const groups = fixture();
    if (mode === "empty-object") for (const sample of groups[2]) sample.geometry.rect = { ...sample.geometry.rect, unknown: {} };
    if (mode === "unknown-path") for (const sample of groups[2]) sample.geometry.unknown = 1;
    if (mode === "before") for (const group of groups.slice(0, 2)) for (const sample of group) sample.geometry.rect.height++;
    if (mode === "extra") for (const sample of groups[2]) sample.geometry.rect.width = 7;
    if (mode === "missing") for (const sample of groups[2]) sample.geometry.rect.height = groups[1][0].geometry.rect.height;
    if (mode === "protected") for (const sample of groups[2]) sample.geometry.intrinsic.push({ naturalWidth: 100 });
    if (mode === "missing-control") groups[0].pop();
    if (mode === "extra-control") groups[0].push(structuredClone(groups[0][0]));
    if (mode === "aa") for (const sample of groups[0]) sample.geometry.rect.height++;
    if (mode.startsWith("unstable-")) groups[{ "unstable-control": 0, "unstable-before": 1, "unstable-after": 2 }[mode]][1].geometry.rect.height++;
    if (mode === "failed") groups[2][1].errors.push("capture failed");
    if (mode === "not-ready") groups[1][1].ready = false;
    assert.equal(result(groups).status, "blocked");
  });
}
for (const mode of ["base", "head", "capture-tool", "measurement", "replay-tool", "replay-function", "revision", "admitted-revision", "dirty", "contract"]) {
  test(`source verification rejects ${mode} drift`, () => {
    const actual = structuredClone(identities);
    const actualTools = structuredClone(tools);
    const contract = structuredClone(geometryReview);
    if (mode === "base" || mode === "head") actual[mode].sources.atlas = "0".repeat(64);
    if (mode === "capture-tool") actualTools.capture["tools/diagnose-baseline.mjs"] = "0".repeat(64);
    if (mode === "measurement") actualTools.measurementFunctions.measureRuntimeSurface = "0".repeat(64);
    if (mode === "replay-tool") actualTools.replay["tools/qualify-pr.mjs"] = "0".repeat(64);
    if (mode === "replay-function") actualTools.replayFunctions.compareGeometry = "0".repeat(64);
    if (mode === "revision") actual.base.head = "0".repeat(40);
    if (mode === "admitted-revision") actualTools.admittedHeadSha = "0".repeat(40);
    if (mode === "dirty") actual.head.status = "M pages.json";
    if (mode === "contract") contract.cells[cell].push(["/unknown", 1, 2]);
    assert.throws(() => verifyGeometryReview(contract, actual, actualTools));
  });
}
test("registry binds exact reviewed route, shared, Atlas and geometry metadata dependencies", () => {
  const root = fileURLToPath(new URL("../../", import.meta.url));
  const identity = sourceIdentity(root);
  const pages = JSON.parse(fs.readFileSync(new URL("../../pages.json", import.meta.url), "utf8"));
  const manifest = JSON.parse(fs.readFileSync(new URL("../../routes.manifest.json", import.meta.url), "utf8"));
  const bind = (source = identity, left = pages, right = manifest) => geometrySourceBinding(source, left, right);
  assert.deepEqual(bind().sources, geometryReview.sources.head);
  for (const file of ["covid-19/index.html", "shared/site.css", "index.html"]) {
    const changed = structuredClone(identity);
    changed.files.find(([path]) => path === file)[1] = "0".repeat(64);
    assert.notDeepEqual(bind(changed).sources, geometryReview.sources.head);
  }
  for (const field of ["title", "summary"]) {
    const changed = structuredClone(pages);
    changed.find(page => page.slug === "musicmap")[field] += " changed";
    assert.notEqual(bind({ ...identity, files: identity.files.map(row => [...row]) }, changed, changed).sources.atlas, geometryReview.sources.head.atlas);
  }
  const selector = structuredClone(manifest);
  selector.find(route => route.slug === "covid-19").experience.runtimeSurface += " changed";
  assert.notEqual(bind({ ...identity, files: identity.files.map(row => [...row]) }, selector, selector).sources["covid-19"], geometryReview.sources.head["covid-19"]);
  const sim = structuredClone(identity);
  sim.files.find(([path]) => path === "sim/index.html")[1] = "0".repeat(64);
  assert.deepEqual(bind(sim).sources, geometryReview.sources.head);
  assert.throws(() => bind({ ...identity, files: [...identity.files, identity.files[0]] }));
});
test("geometry approval cannot override independent performance failure or functional geometry gate", () => {
  assert.equal(result(fixture()).status, "passed-reviewed");
  assert.equal(compareCell(...fixture()).status, "inconclusive");
  const workflow = fs.readFileSync(new URL("../../.github/workflows/ci.yml", import.meta.url), "utf8");
  assert(!workflow.includes("--skip-geometry"));
  assert(workflow.includes("functional-qualified.mjs"));
  assert(workflow.includes("--geometry-output"));
  assert(!workflow.includes("continue-on-error"));
});
