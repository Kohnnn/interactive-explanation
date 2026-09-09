import fs from "node:fs";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
const dir = new URL("./", import.meta.url);
const read = file => fs.readFileSync(file, "utf8").trim().split("\n").map(JSON.parse);
const key = row => `${row.slug}/${row.viewport.name}/${row.theme}`;
const stats = values => {
  assert(values.length === 3 && values.every(Number.isFinite));
  const sorted = [...values].sort((a, b) => a - b);
  return { min: sorted[0], median: sorted[1], max: sorted[2] };
};
const protectedDimensions = geometry => geometry.intrinsic.map(({ key, tag, width, height, viewBox, rect }) => ({ key, tag, width, height, viewBox, cssWidth: rect.width, cssHeight: rect.height }));
const summary = { sides: {}, cells: [], protectedChanges: [], budgetFailures: [] };
for (const side of ["before", "after"]) {
  const filename = `/tmp/opencode/41-native-${side}.jsonl`;
  const savedPath = new URL(`41-native-${side}.json`, dir);
  const saved = fs.existsSync(savedPath) ? JSON.parse(fs.readFileSync(savedPath, "utf8")) : null;
  const rows = fs.existsSync(filename) ? read(filename) : null;
  const samples = rows ? rows.filter(row => row.type === "sample") : saved.samples;
  const groups = Object.groupBy(samples, key);
  assert.equal(samples.length, 72);
  assert.equal(Object.keys(groups).length, 24);
  for (const group of Object.values(groups)) {
    assert.deepEqual(group.map(row => row.sample).sort(), [1, 2, 3]);
    assert(group.every(row => row.status === "measured" && row.ready && row.errors.length === 0));
  }
  const interactionPath = `/tmp/opencode/41-interactions-${side}-v2.jsonl`;
  const interactions = fs.existsSync(interactionPath) ? read(interactionPath) : saved.interactions;
  const custom = interactions.filter(row => row.type === "interaction");
  assert.equal(custom.length, 72);
  const customGroups = Object.groupBy(custom, key);
  assert.equal(Object.keys(customGroups).length, 24);
  assert.deepEqual(Object.keys(customGroups).sort(), Object.keys(groups).sort());
  for (const group of Object.values(customGroups)) assert.deepEqual(group.map(row => row.sample).sort(), [1, 2, 3]);
  assert.equal(interactions.filter(row => row.type === "native" && row.status === "passed").length, 4);
  if (side === "after") assert(custom.every(row => row.status === "passed"));
  for (const row of custom.filter(row => row.slug === "sim")) {
    assert.equal(row.before.grid.width, 0);
    assert.equal(row.before.grid.height, 0);
    assert.equal(row.before.tileSize, 0);
  }
  if (rows) {
  const identity = rows.find(row => row.type === "identity");
  const compact = { interactionHarness: fs.readFileSync("/tmp/opencode/41-interactions.mjs", "utf8"), source: identity.source, browser: rows.find(row => row.type === "browser"), rawPath: filename, rawSha256: createHash("sha256").update(fs.readFileSync(filename)).digest("hex"), samples: samples.map(({ events, raw, ...row }) => ({ ...row, raw: { fonts: raw.fonts, readyState: raw.readyState, documentWidth: raw.documentWidth, viewportWidth: raw.viewportWidth }, networkErrors: events.filter(e => e.type === "response" && e.status >= 400), resources: raw.resources.map(r => ({ name: r.name, duration: r.duration, transferSize: r.transferSize, responseStatus: r.responseStatus })) })), interactions };
  fs.writeFileSync(new URL(`41-native-${side}.json`, dir), JSON.stringify(compact, null, 2) + "\n");
  }
  summary.sides[side] = { samples: samples.length, cells: Object.keys(groups).length, nativePassed: 4, interactionPassed: custom.filter(row => row.status === "passed").length, groups };
}
for (const [cell, before] of Object.entries(summary.sides.before.groups)) {
  const after = summary.sides.after.groups[cell];
  assert(after);
  const result = { cell, stableBefore: new Set(before.map(r => JSON.stringify(r.geometry))).size === 1, stableAfter: new Set(after.map(r => JSON.stringify(r.geometry))).size === 1, overflowBefore: before.map(r => r.raw.documentWidth - r.raw.viewportWidth), overflowAfter: after.map(r => r.raw.documentWidth - r.raw.viewportWidth), runtimeBefore: before.map(r => r.geometry.rect), runtimeAfter: after.map(r => r.geometry.rect), performance: {} };
  assert(result.overflowAfter.every(n => n === 0));
  assert(result.stableAfter, `${cell}: unstable AFTER geometry`);
  const oldDims = protectedDimensions(before[0].geometry);
  const newDims = protectedDimensions(after[0].geometry);
  for (const oldSample of before) for (const newSample of after) {
    const b = protectedDimensions(oldSample.geometry);
    const a = protectedDimensions(newSample.geometry);
    assert.equal(a.length, b.length);
    for (let i = 0; i < b.length; i++) {
      const { cssWidth: bw, cssHeight: bh, ...bi } = b[i];
      const { cssWidth: aw, cssHeight: ah, ...ai } = a[i];
      assert.deepEqual(ai, bi, `${cell}: intrinsic dimensions changed`);
      if (bw !== aw || bh !== ah) {
        assert(cell.startsWith("covid-19/") && bi.tag === "img");
        assert.equal(bw - aw, 2);
        assert.equal(bh - ah, 2);
      }
    }
  }
  if (JSON.stringify(oldDims) !== JSON.stringify(newDims)) summary.protectedChanges.push({ cell, before: oldDims, after: newDims });
  for (const metric of ["domContentLoadedMs", "loadMs", "resourceCount", "transferBytes", "longestLocalResourceMs"]) {
    const value = r => metric === "transferBytes" ? r.performance.sameOriginTransfer.bytes : metric === "longestLocalResourceMs" ? r.performance.longestLocalResource.durationMs : r.performance[metric];
    const b = stats(before.map(value));
    const a = stats(after.map(value));
    const allowance = metric === "resourceCount" ? 0 : Math.max(b.median * 0.2, metric === "transferBytes" ? 250 * 1024 : 250);
    const passed = a.median <= b.median + allowance;
    result.performance[metric] = { before: b, after: a, allowance, passed };
    if (!passed) summary.budgetFailures.push({ cell, metric, before: b, after: a, allowance });
  }
  summary.cells.push(result);
}
for (const side of Object.values(summary.sides)) delete side.groups;
fs.writeFileSync(new URL("41-reconciliation.json", dir), JSON.stringify(summary, null, 2) + "\n");
console.log(JSON.stringify({ sides: summary.sides, stableAfter: summary.cells.filter(c => c.stableAfter).length, protectedChanges: summary.protectedChanges.map(c => c.cell), budgetFailures: summary.budgetFailures }, null, 2));
