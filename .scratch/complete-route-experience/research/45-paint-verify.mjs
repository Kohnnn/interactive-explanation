import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
const beforeFile = "/tmp/opencode/45-after-final-003.json";
const afterFile = "/tmp/opencode/45-paint-final.json";
const gatesFile = "/tmp/opencode/45-paint-gates.json";
const before = JSON.parse(fs.readFileSync(beforeFile));
const after = JSON.parse(fs.readFileSync(afterFile));
assert.equal(after.results.length, 18);
const intrinsic = ({ x, y, ...rest }) => rest;
for (let i = 0; i < 18; i++) {
  const a = after.results[i];
  const b = before.results[i];
  assert.deepEqual([a.viewport, a.theme, a.sample], [b.viewport, b.theme, b.sample]);
  assert.deepEqual(a.failures, []);
  assert.deepEqual(a.errors, []);
  assert.equal(a.stages.length, 11);
  for (let j = 0; j < 11; j++) {
    assert.deepEqual(a.stages[j].protected.map(intrinsic), b.stages[j].protected.map(intrinsic));
    if (a.viewport.width <= 750 && a.stages[j].paint.overlap) {
      assert.equal(a.stages[j].paint.isolation, "isolate");
      assert.equal(a.stages[j].paint.articleZ, "0");
      assert.equal(a.stages[j].paint.figureZ, "1");
      assert.equal(a.stages[j].paint.background, "rgb(250, 245, 232)");
      assert.equal(a.stages[j].paint.articleOverflow, "visible");
    }
  }
}
for (const file of ["train-test-validation/a11y-state.js", "train-test-validation/js.6c47f979.js", "train-test-validation/main.67dee0d6.css", "tools/smoke-bundle.mjs"]) assert.equal(after.source[file], before.source[file]);
const files = [beforeFile, afterFile, gatesFile, "/tmp/opencode/45-paint-candidate.json", "/tmp/opencode/45-paint-candidate-002.json", ...after.results.flatMap(result => result.stages.map(stage => stage.screenshot).filter(Boolean))];
const report = { delta: "Mobile scrolly isolation; article local layer0, figure layer1; opaque intrinsic light workspace; pointer events limited to workspace without changing chart or figure dimensions/transforms.", source: after.source, contexts: 18, protectedDimensionsEqual: true, gates: JSON.parse(fs.readFileSync(gatesFile)), artifacts: [...new Set(files)].map(file => ({ file, bytes: fs.statSync(file).size, sha256: createHash("sha256").update(fs.readFileSync(file)).digest("hex") })), screenshotReview: "All six Model viewport/theme images reviewed. Mobile controls and intrinsic chart readable without prose bleed. Desktop unchanged, including existing dark chart-label contrast defect.", remaining: ["Tall mobile sticky workspace leaves a narrow prose reading strip, especially at320px. Overflow remains visible but this is not full reading-layout acceptance; requires explicit layout scope beyond stacking repair.", "TTV strict load588ms exceeds297+250ms; failure retained, no performance baseline changes.", "Watch not rerun or edited in this follow-up."] };
const destination = new URL("45-paint-results.json", import.meta.url);
if (process.argv.includes("--write")) fs.writeFileSync(destination, JSON.stringify(report, null, 2) + "\n", { flag: "wx" });
else assert.deepEqual(JSON.parse(fs.readFileSync(destination)), report);
console.log("Verified18 paint/interaction contexts, protected dimensions, unchanged engines and Watch, exact evidence hashes.");
