import fs from "node:fs";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { geometryChanges, statistics } from "../../../interactive-explanation/tools/diagnose-baseline.mjs";
import { summarizePerformanceRuns, performanceRegressions, validateExperienceBaseline } from "../../../interactive-explanation/tools/experience-baseline.mjs";
assert(!process.argv.includes("--output") && !process.argv.includes("--write"), "006 approval withdrawn under spec191; historical failed experiment only. Use47-successor-007.mjs; no timing promotion.");
const hash = value => createHash("sha256").update(value).digest("hex");
const encode = value => JSON.stringify(value, null, 2) + "\n";
const read = file => JSON.parse(fs.readFileSync(file));
const predecessorFile = "/tmp/opencode/42-geometry-successor-005.json";
const predecessor = read(predecessorFile);
assert.equal(hash(fs.readFileSync(predecessorFile)), "0be0ce56a78e5c818b4cd42d4e79301484396779529550feb2f75598dbc2fbd3");
const successor = structuredClone(predecessor);
const artifacts = [];
const pairs = ["before", "after"].map(side => {
  const file = `/tmp/opencode/46-paired-${side}.jsonl`;
  const buffer = fs.readFileSync(file);
  artifacts.push({ file, bytes: buffer.length, sha256: hash(buffer) });
  const rows = buffer.toString().trim().split("\n").map(JSON.parse);
  assert.equal(rows.at(-1).unchanged, true);
  assert.equal(rows.filter(row => row.type === "sample").length, 54);
  return rows;
});
const source = pairs[1][0].source;
for (const [file, digest] of source.files) assert.equal(hash(fs.readFileSync(new URL(`../../../interactive-explanation/${file}`, import.meta.url))), digest, file);
const sourceChanges = source.files.filter(([file, digest]) => pairs[0][0].source.files.find(([name]) => name === file)?.[1] !== digest);
assert.deepEqual(sourceChanges.map(([file]) => file).sort(), ["docs/sim/parity.json", "sim/index.html", "tools/smoke-bundle.mjs", "train-test-validation/index.html"]);
const cells = [];
const protectedFields = geometry => ({ css: { transform: geometry.css.transform, pointerEvents: geometry.css.pointerEvents, touchAction: geometry.css.touchAction }, intrinsic: geometry.intrinsic });
for (const slug of ["sim", "train-test-validation", "interactive-mechanical-watch"]) for (const viewport of ["desktop", "mobile", "narrow"]) for (const theme of ["light", "dark"]) {
  const [before, after] = pairs.map(rows => rows.filter(row => row.type === "sample" && row.slug === slug && row.viewport.name === viewport && row.theme === theme));
  for (const samples of [before, after]) {
    assert.deepEqual(samples.map(row => row.sample), [1, 2, 3]);
    for (const sample of samples) {
      assert.equal(sample.status, "measured");
      assert.equal(sample.ready, true);
      assert.deepEqual(sample.errors, []);
      assert.deepEqual(sample.events.filter(event => ["pageerror", "console-error", "requestfailed"].includes(event.type) || event.type === "response" && event.status >= 400), []);
      assert.equal(sample.raw.documentWidth, sample.raw.viewportWidth);
      for (const event of sample.events.filter(event => event.type === "request")) assert.equal(new URL(event.url).origin, "http://127.0.0.1:4231");
      assert.deepEqual(sample.geometry, samples[0].geometry);
    }
  }
  const resourceInventory = row => row.raw.resources.map(resource => ({ path: new URL(resource.name).pathname, bytes: resource.transferSize, status: resource.responseStatus })).sort((a, b) => a.path.localeCompare(b.path));
  for (const sample of [...before, ...after]) assert.deepEqual(resourceInventory(sample), resourceInventory(before[0]));
  const expectedBytes = slug === "sim" ? 636 : slug === "train-test-validation" ? 739 : 0;
  for (let i = 0; i < 3; i++) assert.equal(after[i].performance.sameOriginTransfer.bytes - before[i].performance.sameOriginTransfer.bytes, expectedBytes);
  const metrics = {};
  for (const metric of ["domContentLoadedMs", "loadMs", "resourceCount", "bytes"]) {
    const values = samples => samples.map(row => metric === "bytes" ? row.performance.sameOriginTransfer.bytes : row.performance[metric]);
    const b = statistics(values(before));
    const a = statistics(values(after));
    const allowance = metric === "resourceCount" ? 0 : Math.max(b.median * .2, metric === "bytes" ? 256000 : 250);
    assert(a.median <= b.median + allowance, `${slug}/${viewport}/${theme}/${metric}`);
    metrics[metric] = { before: b, after: a, allowance, pass: true };
  }
  const oldGeometry = predecessor.routes[slug].geometry[viewport];
  assert.deepEqual(protectedFields(oldGeometry), protectedFields(after[0].geometry));
  const changes = geometryChanges(oldGeometry, after[0].geometry, `/routes/${slug}/geometry/${viewport}`);
  if (slug !== "sim" || viewport === "desktop") assert.deepEqual(changes, []);
  else {
    assert.deepEqual(changes.map(change => change.path.split("/").slice(5).join("/")), ["rect/top", "rect/bottom", "rect/height", "css/height", "aspectRatio"]);
    assert.equal(after[0].geometry.rect.top, -.125);
    assert.equal(after[0].geometry.rect.height - oldGeometry.rect.height, viewport === "mobile" ? -38 : -17);
  }
  successor.routes[slug].geometry[viewport] = after[0].geometry;
  if (viewport === "desktop") {
    const reference = summarizePerformanceRuns(before.map(row => row.performance));
    for (const metric of ["domContentLoadedMs", "loadMs"]) successor.routes[slug][theme][metric] = reference[metric];
    if (slug === "sim") {
      successor.routes[slug][theme].resourceCount = reference.resourceCount;
      successor.routes[slug][theme].sameOriginTransfer = reference.sameOriginTransfer;
    }
    assert.deepEqual(performanceRegressions(summarizePerformanceRuns(after.map(row => row.performance)), successor.routes[slug][theme]), []);
  }
  cells.push({ slug, viewport, theme, samples: [1, 2, 3], metrics, geometryChanges: changes, resources: resourceInventory(after[0]), topDuration: after.map(row => row.raw.resources.toSorted((a,b) => b.duration-a.duration).slice(0,5).map(({name,duration,transferSize})=>({path:new URL(name).pathname,duration,transferSize}))), historicalFailures: after.map(row => performanceRegressions(row.performance, predecessor.routes[slug][theme])) });
}
validateExperienceBaseline(successor, Object.keys(predecessor.routes));
const changes = geometryChanges(predecessor, successor);
assert(changes.every(change => /^\/routes\/(sim\/geometry\/(mobile|narrow)\/(rect\/(top|bottom|height)|css\/height|aspectRatio)|sim\/(light|dark)\/(domContentLoadedMs|loadMs|resourceCount|sameOriginTransfer\/bytes)|(train-test-validation|interactive-mechanical-watch)\/(light|dark)\/(domContentLoadedMs|loadMs))$/.test(change.path)), "Out-of-scope baseline mutation");
const report = { source: { ...source, files: undefined, fileCount: source.files.length }, sourceChanges, artifacts, predecessorSha256: hash(fs.readFileSync(predecessorFile)), successorSha256: hash(encode(successor)), changes, cells, authorization: "Agent-reviewed bounded006: Sim supported native DOM grid restoration40x33 and1320cells; no canvas/backing fabrication. Geometry only two Sim cells. Desktop timing references for Sim/TTV/watch come from ALL THREE paired BEFORE samples, never AFTER maxima; only Sim transfer/count replaces unqualified33-request aggregate with reproducible BEFORE34/1705532. No threshold/resourceCountDelta relaxation; no AFTER payload excess hidden.", limitations: ["Old Sim aggregate33/1085315 does not have sufficient per-resource provenance to prove cache omission. Historical09505db full capture already measured34/1704975 including532916-byte OpenSansEmoji. Current paired inventories are exactly equal; +636 Sim/+739 TTV is navigation HTML only; watch assets unchanged.", "Paired BEFORE Sim is defective zero-grid; it qualifies resource/time reference, not functional acceptance. Research44 provides18 actual positive-grid paint/evolution/resize passes and native21/9/7px tiles; lifecycle fix deliberately restores invalid0 rather than preserving it.", "Research43/44/45 historical timing/task failures retained. Current paired outliers retained in ranges and original raw; no stochastic pass guarantee. New full/focused gates must independently run.", "TTV and watch passive geometry unchanged including all intrinsic/order fields. Unrelated routes/performance untouched. Rigid-body unchanged and W0 incomplete."] };
const reviewFile = new URL("46-review-006.json", import.meta.url);
if (process.argv.includes("--write")) fs.writeFileSync(reviewFile, encode(report), { flag: "wx" });
else assert.deepEqual(read(reviewFile), JSON.parse(encode(report)));
if (process.argv.includes("--output")) fs.writeFileSync(process.argv[process.argv.indexOf("--output")+1], encode(successor), { flag: "wx" });
console.log(`Historical006 arithmetic reproduced only; timing approval WITHDRAWN/spec191; performance BLOCKED/inconclusive; SHA256 ${report.successorSha256}`);
