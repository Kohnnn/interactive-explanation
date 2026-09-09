import fs from "node:fs";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { statistics, geometryChanges } from "../../../interactive-explanation/tools/diagnose-baseline.mjs";
const prefix = process.argv[2] || "/tmp/opencode/39-owned";
const read = side => fs.readFileSync(`${prefix}-${side}.jsonl`, "utf8").trim().split("\n").map(JSON.parse);
const before = read("before"), after = read("after");
const samples = records => records.filter(r => r.type === "sample");
assert.equal(samples(before).length, 126);
assert.equal(samples(after).length, 126);
const key = r => `${r.slug}/${r.viewport.name}/${r.theme}`;
const cells = [];
for (const cell of before.filter(r => r.type === "cell")) {
  const b = samples(before).filter(r => key(r) === key(cell));
  const a = samples(after).filter(r => key(r) === key(cell));
  assert.deepEqual(b.map(r => r.sample), [1, 2, 3]);
  assert.deepEqual(a.map(r => r.sample), [1, 2, 3]);
  const metrics = {};
  for (const metric of ["domContentLoadedMs", "loadMs", "resourceCount", "transferBytes"]) {
    const values = rows => rows.map(r => metric === "transferBytes" ? r.performance?.sameOriginTransfer?.bytes : r.performance?.[metric]);
    const bs = statistics(values(b)), as = statistics(values(a));
    assert.equal(bs.count, 3); assert.equal(as.count, 3);
    const delta = as.median - bs.median;
    const budget = metric === "resourceCount" ? 0 : Math.max(bs.median * 0.2, metric === "transferBytes" ? 250 * 1024 : 250);
    metrics[metric] = { before: bs, after: as, delta, budget, pass: delta <= budget };
  }
  const differences = geometryChanges(b[0].geometry, a[0].geometry);
  const protectedChanges = differences.filter(d => /\/(transform|touchAction|pointerEvents|widthAttribute|heightAttribute|viewBox|naturalWidth|naturalHeight|videoWidth|videoHeight)$/.test(d.path) || (/^\/intrinsic\//.test(d.path) && /\/(width|height|key|tag|title)$/.test(d.path)));
  cells.push({ key: key(cell), beforeErrors: b.map(r => r.errors), afterErrors: a.map(r => r.errors), beforeWidth: b.map(r => r.raw.documentWidth), afterWidth: a.map(r => r.raw.documentWidth), metrics, protectedChanges, differences, topResources: a[0].raw.resources.toSorted((x,y) => y.duration-x.duration).slice(0,5).map(r => ({name:r.name, duration:r.duration, transferSize:r.transferSize})), stableBefore: b.every(r => JSON.stringify(r.geometry) === JSON.stringify(b[0].geometry)), stableAfter: a.every(r => JSON.stringify(r.geometry) === JSON.stringify(a[0].geometry)) });
}
assert.equal(cells.length, 42);
const artifacts = ["before", "after"].map(side => { const file = `${prefix}-${side}.jsonl`, bytes = fs.readFileSync(file); return { file, bytes: bytes.length, sha256:createHash("sha256").update(bytes).digest("hex") }; });
assert(cells.every(c => c.stableBefore && c.stableAfter), "Unstable geometry; retain diagnostic capture, do not approve");
assert(cells.every(c => !c.protectedChanges.length), "Intrinsic geometry or pointer ownership changed");
assert(cells.every(c => Object.values(c.metrics).every(m => m.pass)), "Performance budget exceeded");
assert(cells.every(c => c.afterErrors.every(e => !e.length)), "Runtime capture failed");
const result = { artifacts, identities: [before[0], after[0]].map(({source, ...r}) => ({...r,source:{head:source.head,status:source.status,digest:source.digest}})), unchanged: [before,after].map(r => r.find(x => x.type === "source-end")?.unchanged), cells };
fs.writeFileSync(process.argv[3], JSON.stringify(result,null,2)+"\n", {flag:"wx"});
console.log(JSON.stringify({cells:cells.length, unchanged:result.unchanged, budgetFailures:cells.filter(c=>Object.values(c.metrics).some(m=>!m.pass)).map(c=>({key:c.key,metrics:Object.fromEntries(Object.entries(c.metrics).filter(([,m])=>!m.pass))})), errors:cells.filter(c=>c.afterErrors.some(e=>e.length)).map(c=>c.key), protectedChanges:cells.filter(c=>c.protectedChanges.length).map(c=>({key:c.key,changes:c.protectedChanges})), unstable:cells.filter(c=>!c.stableBefore || !c.stableAfter).map(c=>({key:c.key,before:geometryChanges(samples(before).filter(r=>key(r)===c.key)[0].geometry,samples(before).filter(r=>key(r)===c.key)[2].geometry),after:geometryChanges(samples(after).filter(r=>key(r)===c.key)[0].geometry,samples(after).filter(r=>key(r)===c.key)[2].geometry)}))},null,2));
