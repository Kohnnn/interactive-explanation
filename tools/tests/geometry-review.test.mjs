import fs from "node:fs";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test } from "node:test";
import { geometryReview, geometrySourceBinding, verifyGeometryReview } from "../geometry-review.mjs";
import { compareGeometry, compareCell } from "../qualify-pr.mjs";

const identities = Object.fromEntries(["base", "head"].map(side => [side, { head: side === "base" ? geometryReview.baseSha : geometryReview.capturedHeadSha, status: "", product: geometryReview.sources[side], dependencies: geometryReview.dependencies }]));
const review = verifyGeometryReview(geometryReview, identities);
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
for (const mode of ["base", "head", "dependency", "revision", "dirty", "contract"]) {
  test(`source verification rejects ${mode} drift`, () => {
    const actual = structuredClone(identities);
    const contract = structuredClone(geometryReview);
    if (mode === "base" || mode === "head") actual[mode].product = "0".repeat(64);
    if (mode === "dependency") actual.head.dependencies["tools/diagnose-baseline.mjs"] = "0".repeat(64);
    if (mode === "revision") actual.base.head = "0".repeat(40);
    if (mode === "dirty") actual.head.status = "M pages.json";
    if (mode === "contract") contract.cells[cell].push(["/unknown", 1, 2]);
    assert.throws(() => verifyGeometryReview(contract, actual));
  });
}
test("tooling-only head revision is not a registry self-loop", () => {
  const actual = structuredClone(identities);
  actual.head.head = "1a2abf9b53e698dd397eff621abcbe5f9287c2c0";
  assert(verifyGeometryReview(geometryReview, actual));
});
test("product binding includes Atlas, metadata, shared dependencies and exact inventory, excludes registry", () => {
  const files = ["index.html", "pages.json", "routes.manifest.json", "shared/site.css", "shared/fonts/font.woff", "covid-19/index.html", "sim/index.html", "package-lock.json"].map(file => [file, "a".repeat(64)]);
  const binding = rows => geometrySourceBinding({ files: rows, head: "h", status: "" }).product;
  assert.equal(binding(files), createHash("sha256").update(JSON.stringify([...files].sort(([a], [b]) => a < b ? -1 : 1))).digest("hex"));
  for (let index = 0; index < files.length; index++) {
    const changed = structuredClone(files);
    changed[index][1] = "b".repeat(64);
    assert.notEqual(binding(changed), binding(files));
    assert.notEqual(binding(files.filter((_, position) => position !== index)), binding(files));
  }
  assert.notEqual(binding([...files, ["shared/new.css", "a".repeat(64)]]), binding(files));
  assert.equal(binding([...files, ["tools/geometry-review.json", "x"]]), binding(files));
  assert.throws(() => binding([...files, files[0]]));
  const exact = ["package.json", "pages.json", "routes.manifest.json"].map(file => [file, createHash("sha256").update(fs.readFileSync(new URL(`../../${file}`, import.meta.url))).digest("hex")]);
  const bind = rows => geometrySourceBinding({ files: rows, head: geometryReview.capturedHeadSha, status: "" });
  assert.deepEqual(bind(exact).dependencies, Object.fromEntries(exact));
  for (const file of ["pages.json", "routes.manifest.json"]) {
    for (const field of ["title", "summary"]) {
      const metadata = JSON.parse(fs.readFileSync(new URL(`../../${file}`, import.meta.url), "utf8"));
      metadata.find(page => page.slug === "musicmap")[field] += " changed";
      const changed = structuredClone(exact);
      changed.find(([path]) => path === file)[1] = createHash("sha256").update(`${JSON.stringify(metadata, null, 2)}\n`).digest("hex");
      assert.notDeepEqual(bind(changed).dependencies, geometryReview.dependencies);
      assert.throws(() => verifyGeometryReview(geometryReview, { ...identities, head: bind(changed) }));
    }
  }
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
