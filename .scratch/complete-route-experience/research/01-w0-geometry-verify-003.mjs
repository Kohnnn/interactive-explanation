import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { geometryChanges } from "../../../interactive-explanation/tools/diagnose-baseline.mjs";
import { validateExperienceBaseline } from "../../../interactive-explanation/tools/experience-baseline.mjs";
import "./37-prerequisite-verify.mjs";

const read = name => JSON.parse(fs.readFileSync(new URL(name, import.meta.url)));
const before = read("./01-w0-geometry-successor-002.json");
const evidence = read("./37-prerequisite-evidence.json");
const after = structuredClone(before);
const approved = [];
const deferred = [];
for (const cell of evidence.cells.filter(cell => cell.theme === "light")) {
  const pointer = `/routes/${cell.slug}/geometry/${cell.viewport.name}`;
  const current = before.routes[cell.slug].geometry[cell.viewport.name];
  const changes = geometryChanges(cell.geometryBefore[0], cell.geometryAfter[0], pointer);
  if (!changes.length) continue;
  if (geometryChanges(current, cell.geometryBefore[0]).length) {
    deferred.push({ slug: cell.slug, viewport: cell.viewport.name, reason: "Inherited geometry differs from paired BEFORE; authored delta alone cannot certify replacement" });
    continue;
  }
  const dark = evidence.cells.find(value => value.slug === cell.slug && value.viewport.name === cell.viewport.name && value.theme === "dark");
  for (const side of ["Before", "After"]) assert.deepEqual(cell[`geometry${side}`], dark[`geometry${side}`]);
  assert(cell.widthAfter.every(width => width === cell.viewport.width));
  if (cell.slug === "decision-tree") {
    assert.equal(cell.viewport.name, "desktop");
    assert.deepEqual(changes.map(change => change.path.slice(pointer.length)).sort(), ["/intrinsic/0/rect/bottom", "/intrinsic/0/rect/left", "/intrinsic/0/rect/right", "/intrinsic/0/rect/top"]);
  } else {
    assert(cell.slug.startsWith("ableton-learning-synths-"));
    assert.deepEqual(changes.map(change => change.path.slice(pointer.length)).sort(), ["/aspectRatio", "/css/height", "/rect/bottom", "/rect/height"]);
    const delta = cell.viewport.name === "mobile" ? -44.1875 : -22.09375;
    assert.equal(cell.geometryAfter[0].rect.height - cell.geometryBefore[0].rect.height, delta);
    assert.equal(cell.geometryAfter[0].rect.bottom - cell.geometryBefore[0].rect.bottom, delta);
  }
  after.routes[cell.slug].geometry[cell.viewport.name] = cell.geometryAfter[0];
  approved.push({ slug: cell.slug, viewport: cell.viewport.name, samplesPerSide: 6, classification: cell.slug === "decision-tree" ? "Existing 50x46 home image relocated into authored hero; desktop image position only" : "Authored footer whole-label wrapping; runtime height and derived aspect ratio only; intrinsic surfaces unchanged", changes: changes.map(change => ({ ...change, review: "approved authored delta only; not route acceptance" })) });
}
assert.equal(approved.length, 11);
assert.equal(deferred.length, 4);
assert.equal(geometryChanges(before, after).length, 44);
validateExperienceBaseline(after, Object.keys(before.routes));
for (const slug of Object.keys(before.routes)) for (const theme of ["light", "dark"]) assert.deepEqual(before.routes[slug][theme], after.routes[slug][theme]);
const hash = name => createHash("sha256").update(fs.readFileSync(new URL(name, import.meta.url))).digest("hex");
const review = { source: "f51e601", sourceFix: "83ae687", browser: "148.0.7778.96", predecessorSha256: hash("./01-w0-geometry-successor-002.json"), evidenceSha256: hash("./37-prerequisite-evidence.json"), performance: "All inherited values unchanged", scope: "11 exact cells, 44 paths; no historical mismatch normalization, no Markov or rigid-body replacement; W0 release blocked", approved, deferred };
for (const [name, value] of [["./01-w0-geometry-successor-003.json", after], ["./01-w0-geometry-review-003.json", review]]) {
  const url = new URL(name, import.meta.url);
  if (process.argv.includes("--write")) fs.writeFileSync(url, JSON.stringify(value, null, 2) + "\n", { flag: "wx" });
  else assert.deepEqual(read(name), value);
}
console.log("Successor003: 11 bounded authored geometry cells, 44 exact paths; 4 changed cells deferred; all other geometry and performance unchanged.");
