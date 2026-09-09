import fs from "node:fs";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { geometryChanges, statistics, verifySourceFixture, sourceIdentity } from "../../../interactive-explanation/tools/diagnose-baseline.mjs";
import { validateExperienceBaseline } from "../../../interactive-explanation/tools/experience-baseline.mjs";
const root = new URL("../../../interactive-explanation", import.meta.url).pathname;
const hash = value => createHash("sha256").update(value).digest("hex");
const encode = value => JSON.stringify(value, null, 2) + "\n";
const predecessorFile = "/tmp/opencode/42-geometry-successor-005.json";
const predecessorBytes = fs.readFileSync(predecessorFile);
assert.equal(hash(predecessorBytes), "0be0ce56a78e5c818b4cd42d4e79301484396779529550feb2f75598dbc2fbd3");
const predecessor = JSON.parse(predecessorBytes);
const successor = structuredClone(predecessor);
const artifacts = [];
const pairs = ["before", "after"].map(side => {
  const file = `/tmp/opencode/46-paired-${side}.jsonl`;
  const bytes = fs.readFileSync(file);
  artifacts.push({ file, bytes: bytes.length, sha256: hash(bytes) });
  const rows = bytes.toString().trim().split("\n").map(JSON.parse);
  assert.equal(rows.at(-1).unchanged, true);
  assert.equal(rows.filter(row => row.type === "sample").length, 54);
  return rows;
});
const verified = verifySourceFixture("/tmp/opencode/46-before/interactive-explanation", root, "2366c641");
assert.deepEqual(verified.files, pairs[0][0].source.files);
assert.equal(verified.digest, pairs[0][0].source.digest);
const historicalReview = JSON.parse(fs.readFileSync(new URL("46-review-006.json", import.meta.url)));
assert.deepEqual(artifacts, historicalReview.artifacts);
const cells = [];
for (const slug of ["sim", "train-test-validation", "interactive-mechanical-watch"]) for (const viewport of ["desktop", "mobile", "narrow"]) for (const theme of ["light", "dark"]) {
  const [before, after] = pairs.map(rows => rows.filter(row => row.type === "sample" && row.slug === slug && row.viewport.name === viewport && row.theme === theme));
  for (const samples of [before, after]) {
    assert.deepEqual(samples.map(row => row.sample), [1, 2, 3]);
    for (const row of samples) {
      assert.equal(row.status, "measured");
      assert.equal(row.ready, true);
      assert.deepEqual(row.errors, []);
      assert.deepEqual(row.geometry, samples[0].geometry);
      assert.equal(row.raw.documentWidth, row.raw.viewportWidth);
      assert.deepEqual(row.events.filter(event => ["pageerror", "console-error", "requestfailed"].includes(event.type) || event.type === "response" && event.status >= 400), []);
    }
  }
  const inventory = row => row.raw.resources.map(resource => ({ path: new URL(resource.name).pathname, bytes: resource.transferSize, status: resource.responseStatus })).sort((a, b) => a.path.localeCompare(b.path));
  for (const row of [...before, ...after]) {
    assert.deepEqual(inventory(row), inventory(before[0]));
    assert.equal(row.performance.resourceCount, before[0].performance.resourceCount);
    assert.equal(row.performance.sameOriginTransfer.status, "supported");
  }
  for (let i = 0; i < 3; i++) assert.equal(after[i].performance.sameOriginTransfer.bytes - before[i].performance.sameOriginTransfer.bytes, slug === "sim" ? 636 : slug === "train-test-validation" ? 739 : 0);
  const metrics = {};
  for (const metric of ["domContentLoadedMs", "loadMs", "resourceCount", "bytes"]) {
    const values = samples => samples.map(row => metric === "bytes" ? row.performance.sameOriginTransfer.bytes : row.performance[metric]);
    const b = statistics(values(before));
    const a = statistics(values(after));
    assert.equal(b.count, 3);
    assert.equal(a.count, 3);
    const allowance = metric === "resourceCount" ? 0 : Math.max(b.median * .2, metric === "bytes" ? 250 * 1024 : 250);
    metrics[metric] = { before: b, after: a, allowance, arithmeticWithinCeiling: a.median <= b.median + allowance, qualification: ["domContentLoadedMs", "loadMs"].includes(metric) ? "BLOCKED/inconclusive: materially noisy campaign; no timing approval" : "stable resource inventory only" };
  }
  if (slug === "sim") {
    const old = predecessor.routes[slug].geometry[viewport];
    assert.deepEqual(after[0].geometry.intrinsic, old.intrinsic);
    for (const field of ["transform", "pointerEvents", "touchAction"]) assert.equal(after[0].geometry.css[field], old.css[field]);
    successor.routes[slug].geometry[viewport] = after[0].geometry;
    if (viewport === "desktop") {
      for (const row of before) assert.deepEqual(row.performance.sameOriginTransfer, before[0].performance.sameOriginTransfer);
      assert.equal(before[0].performance.resourceCount, 34);
      assert.equal(before[0].performance.sameOriginTransfer.bytes, 1705532);
      successor.routes[slug][theme].resourceCount = before[0].performance.resourceCount;
      successor.routes[slug][theme].sameOriginTransfer = before[0].performance.sameOriginTransfer;
    }
  } else assert.deepEqual(after[0].geometry, predecessor.routes[slug].geometry[viewport]);
  cells.push({ slug, viewport, theme, metrics });
}
for (const [slug, route] of Object.entries(predecessor.routes)) for (const theme of ["light", "dark"]) for (const metric of ["domContentLoadedMs", "loadMs"]) assert.equal(successor.routes[slug][theme][metric], route[theme][metric]);
validateExperienceBaseline(successor, Object.keys(predecessor.routes));
const changes = geometryChanges(predecessor, successor);
assert.equal(changes.length, 14);
assert(changes.every(change => /^\/routes\/sim\/(geometry\/(mobile|narrow)\/(rect\/(top|bottom|height)|css\/height|aspectRatio)|(light|dark)\/(resourceCount|sameOriginTransfer\/bytes))$/.test(change.path)));
const report = {
  source: sourceIdentity(root),
  historicalSource: historicalReview.source,
  provenance: { ...verified, files: undefined, fileCount: verified.files.length, status: "Historical BEFORE measurement provenance retroverified, not a new capture. Retained fixture bytes match every recorded file hash and Git blob; current modes and exact path set also match. Historical capture did not record modes." },
  predecessorSha256: hash(predecessorBytes), successorSha256: hash(encode(successor)), artifacts, changes, cells,
  policy: "006 timing approval withdrawn under spec191. 006 raw samples, report and failed gates remain historical failed-experiment evidence, not accepted references. 007 inherits ALL timing values unchanged from005. No cherry-picked timing reruns. Arithmetic within a ceiling is not performance qualification.",
  resourceCorrection: "Sim BEFORE34 requests/1705532 bytes reproduce across all desktop samples/themes and identical paired resource inventories; historical09505db also recorded34/1704975 including532916-byte OpenSansEmoji. Correct the unqualified33/1085315 aggregate, not timing. No proven cache-omission cause. AFTER navigation-only +636 bytes remains visible; current adapter delta needs current checks. Transfer scope is completed top-document requests, not child/unfinished or field-network proof.",
  geometryCorrection: "Only Sim mobile/narrow authored40x33 DOM grid container restoration, ten paths. Stable three samples per theme with protected fields unchanged. Current resize-only adapter requires fresh actual-task and geometry checks; historical evidence is not those checks.",
  verdict: "W0 BLOCKED; noisy performance inconclusive; no W1; rigid-body matching source and permission remain hard constraints."
};
const reportFile = new URL("47-review-007.json", import.meta.url);
const output = new URL("47-successor-007.json", import.meta.url);
if (process.argv.includes("--write")) {
  fs.writeFileSync(output, encode(successor), { flag: "wx" });
  fs.writeFileSync(reportFile, encode(report), { flag: "wx" });
} else {
  assert.deepEqual(JSON.parse(fs.readFileSync(output)), successor);
  const retained = JSON.parse(fs.readFileSync(reportFile));
  assert.deepEqual(JSON.parse(encode({ ...retained, source: undefined })), JSON.parse(encode({ ...report, source: undefined })));
}
console.log(`007 verified: ${changes.length} geometry/resource paths; ALL timings inherited005; performance BLOCKED/inconclusive; ${report.successorSha256}`);
