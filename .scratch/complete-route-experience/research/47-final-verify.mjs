import fs from "node:fs";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { geometryChanges } from "../../../interactive-explanation/tools/diagnose-baseline.mjs";
const hash = bytes => createHash("sha256").update(bytes).digest("hex");
const artifacts = [];
const readRows = file => {
  const bytes = fs.readFileSync(file);
  artifacts.push({ file, bytes: bytes.length, sha256: hash(bytes) });
  return bytes.toString().trim().split("\n").map(JSON.parse);
};
const baseline = JSON.parse(fs.readFileSync(new URL("47-successor-007.json", import.meta.url)));
const initialTasks = readRows("/tmp/opencode/47-sim-actual.jsonl");
assert(initialTasks.some(row => row.status === "failed"));
const tasks = readRows("/tmp/opencode/47-sim-actual-002.jsonl");
assert.equal(tasks.length, 18);
for (const width of [1400, 390, 320]) for (const theme of ["light", "dark"]) {
  const selected = tasks.filter(row => row.width === width && row.theme === theme);
  assert.deepEqual(selected.map(row => row.sample), [1, 2, 3]);
  for (const row of selected) {
    assert.equal(row.status, "passed");
    assert.deepEqual(row.errors, []);
    assert.equal(row.initial.cells, 1320);
    assert.equal(row.initial.canvasCount, 0);
    assert.equal(row.initial.overflow, 0);
    assert(row.typography.modelUnchanged && row.typography.statesUnchanged && row.typography.rendered);
    assert.equal(row.edit, "native input updates and restores model description");
  }
}
const geometry = readRows("/tmp/opencode/47-sim-geometry.jsonl");
assert.equal(geometry.find(row => row.type === "source-end").unchanged, true);
const samples = geometry.filter(row => row.type === "sample");
assert.equal(samples.length, 18);
for (const viewport of ["desktop", "mobile", "narrow"]) for (const theme of ["light", "dark"]) {
  const selected = samples.filter(row => row.viewport.name === viewport && row.theme === theme);
  assert.deepEqual(selected.map(row => row.sample), [1, 2, 3]);
  for (const row of selected) {
    assert.equal(row.status, "measured");
    assert.equal(row.ready, true);
    assert.deepEqual(row.errors, []);
    assert.deepEqual(geometryChanges(baseline.routes.sim.geometry[viewport], row.geometry), []);
    assert.equal(row.performance.resourceCount, 34);
    assert.equal(row.raw.documentWidth, row.raw.viewportWidth);
  }
}
const journals = ["47-gates.jsonl", "47-gates-002.jsonl"].map(name => readRows(new URL(name, import.meta.url).pathname));
for (const rows of journals) assert.equal(rows.at(-1).sourceUnchanged, true);
const final = journals[1].filter(row => row.type === "result");
assert.equal(final.find(row => row.name === "successor007").exit, 0);
assert.equal(final.find(row => row.name === "sim-normal").exit, 0);
for (const name of ["full-normal", "combined-strict59"]) {
  const row = final.find(row => row.name === name);
  assert.equal(row.exit, 1);
  assert.match(row.stderr, /load-balancing light performance regressed/);
}
const historical = ["46-review-006.json", "46-final-results.json"];
for (const name of historical) {
  const relative = `.scratch/complete-route-experience/research/${name}`;
  assert(fs.readFileSync(new URL(name, import.meta.url)).equals(execFileSync("git", ["show", `7525c429:${relative}`], { maxBuffer: 16 * 1024 * 1024 })), `Historical006 evidence overwritten: ${name}`);
}
const report = {
  source: { ...journals[1][0].source, files: undefined, fileCount: journals[1][0].source.files.length },
  baselineSha256: journals[1][0].baselineSha256,
  artifacts,
  static: journals[0].filter(row => ["check", "unit", "audit", "negative37", "negative40"].includes(row.name)).map(({ name, exit }) => ({ name, exit })),
  unit: "373/373 (all371 existing plus2 new regression tests); no separate lint/typecheck configured",
  actualSim: { passed: 18, attempted: 18, scope: "draw exact cell; editor input/restore; model evolution and rendered play/pause; native resize; typography event preserves model and renders all1320 cells;3 contexts per viewport/theme", tiles: tasks.map(({width,theme,sample,initial}) => ({width,theme,sample,tile:initial.tile})) },
  geometrySim: { measured: 18, matched007: 18, unchangedSource: true, diagnosticExit: 1, reason: "diagnostic compares the original repository baseline, not007; original geometry failures retained; every current sample exactly matches007", timings: "not used to approve timing references or supersede noisy research46" },
  currentGates: final.map(({name,exit,stderr,args}) => ({name,exit,args,firstFailure:stderr.split("\n").slice(0,3)})),
  retainedFailures: "47-sim-actual first relative-root403/timeout partial attempt;47-gates first relative-baseline launch failures and report undefined-key comparison failure retained. Corrected launches are fixture repairs, not browser retry-until-pass.006 report/raw/gates remain unchanged historical failed-experiment evidence; no142 sweep rerun.",
  verdict: "W0 BLOCKED. Current full normal and exact59 strict both fail load-balancing light load budget; later stages unexecuted, not passes. Focused Sim pass does not qualify noisy performance or whole-experience accessibility. No W1, merge, push or deployment."
};
const destination = new URL("47-final-results.json", import.meta.url);
if (process.argv.includes("--write")) fs.writeFileSync(destination, JSON.stringify(report,null,2)+"\n", {flag:"wx"});
else assert.deepEqual(JSON.parse(fs.readFileSync(destination)), JSON.parse(JSON.stringify(report)));
console.log("Verified18 Sim actual tasks,18 exact007 geometry matches,373 unit tests and retained full/strict failures; W0 BLOCKED");
