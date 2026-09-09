import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
const directory = new URL(".", import.meta.url);
const files = ["/tmp/opencode/45-before-final.json", "/tmp/opencode/45-after-final-003.json", "/tmp/opencode/45-watch-after.json", "/tmp/opencode/45-gates.json", "/tmp/opencode/45-gates-final.json"];
const read = file => JSON.parse(fs.readFileSync(file));
const before = read(files[0]);
const after = read(files[1]);
assert.equal(before.results.length, 18);
assert.equal(after.results.length, 18);
assert.equal(before.results.filter(result => result.failures.length).length, 12);
assert(after.results.every(result => !result.failures.length && !result.errors.length));
const protectedFields = ({ x, y, ...rest }) => rest;
for (let i = 0; i < 18; i++) {
  const b = before.results[i];
  const a = after.results[i];
  assert.deepEqual([a.viewport, a.theme, a.sample], [b.viewport, b.theme, b.sample]);
  assert.equal(a.stages.length, 11);
  for (let j = 0; j < a.stages.length; j++) {
    assert.deepEqual(a.stages[j].protected.map(protectedFields), b.stages[j].protected.map(protectedFields));
    assert.equal(a.stages[j].documentWidth, a.viewport.width);
  }
  if (a.viewport.width < 500) {
    const layers = a.stages.find(stage => stage.stage === "model").layers;
    assert.equal(layers[1].y, 72);
    assert.equal(layers[2].y, 176);
    assert(layers[1].y >= layers[0].height);
    assert(layers[2].y >= layers[1].y + layers[1].height);
  }
}
for (const file of ["train-test-validation/a11y-state.js", "train-test-validation/js.6c47f979.js", "train-test-validation/main.67dee0d6.css"]) assert.equal(before.source[file], after.source[file]);
const screenshots = [...before.results, ...after.results].flatMap(result => result.stages.map(stage => stage.screenshot).filter(Boolean));
const artifacts = [...new Set([...files, ...screenshots])].map(file => ({ file, bytes: fs.statSync(file).size, sha256: createHash("sha256").update(fs.readFileSync(file)).digest("hex") }));
const median = values => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
const performance = [before, after].map(data => [1400, 390, 320].flatMap(width => ["light", "dark"].map(theme => {
  const samples = data.results.filter(result => result.viewport.width === width && result.theme === theme).map(result => ({ dcl: result.performance.navigation.domContentLoadedEventEnd, load: result.performance.navigation.loadEventEnd, resources: result.performance.resources.length, transfer: result.performance.resources.reduce((sum, resource) => sum + resource.transferSize, result.performance.navigation.transferSize) }));
  return { width, theme, samples, medianDcl: median(samples.map(sample => sample.dcl)), medianLoad: median(samples.map(sample => sample.load)) };
})));
const report = { beforeSource: before.source, afterSource: after.source, beforeFailed: 12, afterPassed: 18, protectedDimensionsEqual: true, watch: read(files[2]), performance, artifacts, limitations: ["Model screenshots retain scrolly prose painting over controls despite valid hit stacks; no visual-completion claim.", "Summary controls entirely outside viewport are inapplicable to pointer checks, not certified clickable.", "Final Watch focused run stops before interactions at DCL1010/load1046ms; preceding focused run passes all tasks. Timing budgets unchanged.", "Fixed mobile offsets qualified only at captured 390/320 widths and default font scale; no zoom or real-device certification.", "Raw evidence and screenshots are external artifacts bound by SHA256; no baseline changes."] };
const destination = new URL("45-results.json", directory);
if (process.argv.includes("--write")) fs.writeFileSync(destination, JSON.stringify(report, null, 2) + "\n", { flag: "wx" });
else assert.deepEqual(read(destination), report);
console.log("Verified 18 matched contexts, 12 BEFORE failures, 18 AFTER passes, protected dimensions and artifact hashes.");
