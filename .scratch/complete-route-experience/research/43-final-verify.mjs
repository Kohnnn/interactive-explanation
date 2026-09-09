import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { geometryChanges } from "../../../interactive-explanation/tools/diagnose-baseline.mjs";
const hash = value => createHash("sha256").update(value).digest("hex");
const readRows = file => fs.readFileSync(file, "utf8").trim().split("\n").map(JSON.parse);
const journal = "/tmp/opencode/43-final-gates.jsonl";
const rows = readRows(journal);
assert.equal(rows.at(-1).sourceUnchanged, true);
const identity = rows[0];
const results = rows.filter(row => row.type === "result");
assert.equal(results.length, 145);
const normal = results.filter(row => row.name.startsWith("normal/"));
const strict = results.filter(row => row.name.startsWith("strict/"));
assert.equal(normal.length, 83);
assert.equal(strict.length, 59);
assert.equal(new Set(normal.map(row => row.name)).size, 83);
assert.equal(new Set(strict.map(row => row.name)).size, 59);
const baseline = JSON.parse(fs.readFileSync(identity.baseline));
assert.equal(hash(fs.readFileSync(identity.baseline)), identity.baselineSha256);
const capture = readRows("/tmp/opencode/43-ttv-rebind.jsonl");
assert.equal(capture[0].source.digest, identity.source.digest);
assert.equal(capture.find(row => row.type === "source-end").unchanged, true);
const samples = capture.filter(row => row.type === "sample");
assert.equal(samples.length, 18);
for (const viewport of ["desktop", "mobile", "narrow"]) for (const theme of ["light", "dark"]) {
  const cell = samples.filter(row => row.viewport.name === viewport && row.theme === theme);
  assert.deepEqual(cell.map(row => row.sample), [1, 2, 3]);
  for (const sample of cell) {
    assert.equal(sample.status, "measured");
    assert.deepEqual(sample.errors, []);
    assert.deepEqual(geometryChanges(baseline.routes[sample.slug].geometry[viewport], sample.geometry), []);
    assert.equal(sample.raw.documentWidth, sample.raw.viewportWidth);
    assert.deepEqual(sample.events.filter(event => ["pageerror", "console-error", "requestfailed"].includes(event.type) || event.type === "response" && event.status >= 400), []);
    for (const event of sample.events.filter(event => event.type === "request")) assert.equal(new URL(event.url).origin, "http://127.0.0.1:4231");
  }
}
const artifacts = [journal, "/tmp/opencode/43-ttv-rebind.jsonl", "/tmp/opencode/43-tight-probes.json", "/tmp/opencode/43-watch-repeats.json"].map(file => ({ file, bytes: fs.statSync(file).size, sha256: hash(fs.readFileSync(file)) }));
const report = {
  source: { ...identity.source, fileCount: identity.source.files.length, files: undefined },
  sourceUnchanged: true,
  sourceDiff: identity.sourceDiff,
  baseline: { path: identity.baseline, sha256: identity.baselineSha256, originalSource: identity.baselineOriginalSource, performanceChanged: false },
  artifacts,
  ttvRebind: { sourceDigest: capture[0].source.digest, samples: 18, themeCells: 6, exactGeometryDeltas: 0, errors: 0, overflow: 0, diagnosticExit: 1, diagnosticClassification: "Retained failed-or-inconclusive exit reflects inherited default comparison, not sample capture errors; exact005 comparison independently asserts all18 samples" },
  normal: { attempted: 83, passed: normal.filter(row => row.exit === 0).length, failed: normal.filter(row => row.exit !== 0).map(row => row.name) },
  strict: { attempted: 59, passed: strict.filter(row => row.exit === 0).length, failed: strict.filter(row => row.exit !== 0).map(row => row.name) },
  results,
  tightProbes: JSON.parse(fs.readFileSync("/tmp/opencode/43-tight-probes.json")),
  watchRepeats: JSON.parse(fs.readFileSync("/tmp/opencode/43-watch-repeats.json")),
  findings: [
    "Normal sweep80/83 and strict58/59; not82 clean normal routes. Full normal stops at Sim performance; combined strict59 stops at rigid-body geometry. Original failures retained.",
    "Sim transfer1705532 exceeds1085315+256000; resources34 exceeds33. Three fresh reduced-motion desktop probes also reproduce tileSize0 and zero backing canvas without runtime/network errors. Existing research41 already reports all36 initial samples zero-size; no source/performance fix authorized here.",
    "Watch original normal fails reduced-motion canvas dataset.playing at smoke6443. Three isolated startup probes pass; unchanged focused repetitions fail same task, pass all tasks, then fail timing912/954 versus616+250/661+250. Mixed evidence is not a clean pass. Authored exploded-view-three.js560-578 publishes dataset.playing only inside visible renderFrame; IntersectionObserver600-605 can suppress initial publication offscreen. Candidate race requires parent bounded seam investigation, not engine edit or timeout relaxation.",
    "TTV normal and strict pass in this sweep and18 passive samples exactly rebind005. Prior research42 still records top-bar pointer occlusion at390/320; gate success is not universal pointer acceptance.",
    "Rigid-body remains blocked at desktop runtime bottom; initialization/hydration failure remains known. No geometry or engine masking, no W0 completion, no main merge or push."
  ],
};
const destination = new URL("43-final-results.json", import.meta.url);
const serialized = JSON.stringify(report, null, 2) + "\n";
if (process.argv.includes("--write")) fs.writeFileSync(destination, serialized, { flag: "wx" });
else assert.deepEqual(JSON.parse(fs.readFileSync(destination)), JSON.parse(serialized));
console.log(`Verified83 normal (${report.normal.passed} pass),59 strict (${report.strict.passed} pass), both combined failures,18 exact TTV rebind samples; no complete acceptance.`);
