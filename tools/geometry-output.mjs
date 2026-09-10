import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { geometryChanges, planCells, sourceIdentity } from "./diagnose-baseline.mjs";
import { validateGeometryEvidence } from "./experience-baseline.mjs";
import { geometryReview } from "./geometry-review.mjs";

const require = createRequire(import.meta.url);
export const sha256 = bytes => createHash("sha256").update(bytes).digest("hex");
export function environmentIdentity() {
  const { registry } = require(path.join(path.dirname(require.resolve("playwright-core/package.json")), "lib/coreBundle.js"));
  const executable = registry.registry.findExecutable("chromium-headless-shell").executablePath();
  return { hostname: os.hostname(), platform: os.platform(), release: os.release(), arch: os.arch(), node: process.version, playwright: require("playwright/package.json").version, executable, executableSha256: sha256(fs.readFileSync(executable)), runner: process.env.RUNNER_NAME || null, run: process.env.GITHUB_RUN_ID || null, attempt: process.env.GITHUB_RUN_ATTEMPT || null };
}

export function geometryBaseline(manifest, inherited, rows) {
  const expected = planCells(manifest, []).map(cell => `${cell.route.slug}/${cell.viewport.name}/${cell.theme}`);
  assert.equal(expected.length, 504);
  assert.equal(rows.length, 504, "Incomplete geometry matrix");
  assert.equal(new Set(rows.map(row => row.cell)).size, 504, "Duplicate geometry cell");
  assert.deepEqual(rows.map(row => row.cell).sort(), expected.sort(), "Wrong geometry matrix");
  assert.equal(inherited.version, 2);
  assert.deepEqual(Object.keys(inherited.routes).sort(), manifest.map(route => route.slug).sort());
  const baseline = structuredClone(inherited);
  for (const row of rows) {
    assert(["passed", "passed-reviewed"].includes(row.geometry.status), `Unapproved geometry: ${row.cell}`);
    const changes = row.geometry.changes ?? [];
    if (row.geometry.status === "passed") assert.equal(changes.length, 0, `Changed geometry: ${row.cell}`);
    else {
      const expected = geometryReview.cells[row.cell];
      assert(expected, `Missing geometry review cell: ${row.cell}`);
      assert.deepEqual(changes.map(({ path, before, after }) => [path, before, after]).sort(), [...expected].sort(), `Reviewed geometry differs: ${row.cell}`);
      assert.equal(row.geometry.acceptedLeaves, expected.length, `Reviewed geometry leaf count differs: ${row.cell}`);
      assert.equal(row.geometry.reviewSha256, geometryReview.reviewSha256, `Geometry review identity differs: ${row.cell}`);
    }
    validateGeometryEvidence(row.headGeometry);
    const [slug, viewport, theme] = row.cell.split("/");
    if (slug !== "atlas" && theme === "light") baseline.routes[slug].geometry[viewport] = structuredClone(row.headGeometry);
  }
  return baseline;
}

export function balancedSchedule(baseSha, headSha, cellKey, groups = ["base-control", "base", "head"]) {
  assert.equal(groups.length, 3, "Comparison schedule requires a triplet");
  assert.equal(new Set(groups).size, 3, "Comparison groups must be distinct");
  const seed = createHash("sha256").update(`${baseSha}:${headSha}:${cellKey}`).digest().readUInt32BE(0);
  const start = seed % groups.length;
  const first = groups.map((_, index) => groups[(start + index) % groups.length]);
  return Array.from({ length: 3 }, (_, round) => first.map((_, ordinal) => first[(ordinal + round) % first.length]));
}

export function geometryReceiptCells(rows) {
  return rows.map(({ cell, geometry }) => geometry.status === "passed-reviewed" ? {
    cell,
    status: geometry.status,
    acceptedLeaves: geometry.acceptedLeaves,
    reviewSha256: geometry.reviewSha256,
    changes: geometry.changes.map(({ path, before, after }) => [path, before, after]).sort(),
  } : { cell, status: geometry.status });
}

export function readGeometryJournal(file) {
  const records = [];
  const fd = fs.openSync(file, "r");
  const buffer = Buffer.allocUnsafe(64 * 1024);
  const maxRecordLength = 64 * 1024 * 1024;
  let pending = Buffer.alloc(0);
  const retain = bytes => {
    assert(bytes.length <= maxRecordLength, "Qualification journal record exceeds limit");
    const row = JSON.parse(bytes.toString("utf8"));
    if (row.type === "sample") records.push({ type: row.type, cell: row.cell, group: row.group, round: row.round, ordinal: row.ordinal, status: row.status, ready: row.ready, errors: row.errors, geometry: row.geometry });
    else if (["source", "source-end", "cell", "complete"].includes(row.type)) records.push(row);
  };
  try {
    for (;;) {
      const count = fs.readSync(fd, buffer, 0, buffer.length, null);
      if (!count) break;
      const chunk = Buffer.concat([pending, buffer.subarray(0, count)]);
      let start = 0;
      for (let index = chunk.indexOf(10); index !== -1; index = chunk.indexOf(10, start)) {
        retain(chunk.subarray(start, index));
        start = index + 1;
      }
      pending = Buffer.from(chunk.subarray(start));
      assert(pending.length <= maxRecordLength, "Qualification journal record exceeds limit");
    }
    if (pending.length) retain(pending);
  } finally { fs.closeSync(fd); }
  return records;
}

export function geometryRowsFromJournal(records, baseSha, headSha) {
  assert(/^[a-f0-9]{40}$/.test(baseSha) && /^[a-f0-9]{40}$/.test(headSha), "Geometry journal schedule requires immutable SHAs");
  const cells = records.filter(row => row.type === "cell");
  assert.equal(cells.length, 504, "Incomplete geometry journal cells");
  assert.equal(new Set(cells.map(row => row.cell)).size, 504, "Duplicate geometry journal cell");
  return cells.map(row => {
    const slug = row.cell.split("/")[0];
    const groups = slug === "rigid-body-collisions"
      ? ["original-control", "original-reference", "original-head"]
      : slug === "sim" ? ["sim-fixed-control", "sim-fixed-reference", "sim-fixed-head"] : ["base-control", "base", "head"];
    const samples = Object.fromEntries(groups.map(group => [group, records.filter(sample => sample.type === "sample" && sample.cell === row.cell && sample.group === group)]));
    const schedule = balancedSchedule(baseSha, headSha, row.cell, groups);
    for (const [group, values] of Object.entries(samples)) {
      assert.equal(values.length, 3, `Incomplete generated geometry samples: ${row.cell}/${group}`);
      const expectedPositions = schedule.flatMap((round, roundIndex) => round.map((value, ordinal) => ({ value, round: roundIndex + 1, ordinal: ordinal + 1 }))).filter(position => position.value === group).map(({ round, ordinal }) => [round, ordinal]).sort();
      assert.deepEqual(values.map(sample => [sample.round, sample.ordinal]).sort(), expectedPositions, `Generated geometry sample positions differ: ${row.cell}/${group}`);
      for (const sample of values) {
        assert(["measured", "failed"].includes(sample.status) && sample.ready === true && Array.isArray(sample.errors) && sample.errors.every(error => error.phase === "performance") && (sample.status === "measured" || sample.errors.length > 0), `Missing or failed generated geometry sample: ${row.cell}/${group}`);
        validateGeometryEvidence(sample.geometry);
        assert.deepEqual(sample.geometry, values[0].geometry, `Unstable generated geometry samples: ${row.cell}/${group}`);
      }
    }
    assert.deepEqual(samples[groups[0]][0].geometry, samples[groups[1]][0].geometry, `Generated geometry A/A differs: ${row.cell}`);
    const changes = geometryChanges(samples[groups[1]][0].geometry, samples[groups[2]][0].geometry);
    assert.deepEqual(changes, row.geometry.changes ?? [], `Generated geometry journal result differs: ${row.cell}`);
    return { cell: row.cell, geometry: row.geometry, headGeometry: samples[groups[2]][0].geometry };
  });
}

export function verifyGeometryReceiptCells(cells, expected) {
  assert.equal(cells.length, 504);
  assert.equal(new Set(cells.map(row => row.cell)).size, 504, "Duplicate geometry proof cell");
  assert.deepEqual(cells.map(row => row.cell).sort(), expected.sort(), "Wrong geometry proof matrix");
  for (const row of cells) {
    if (row.status === "passed") {
      assert.deepEqual(Object.keys(row).sort(), ["cell", "status"], `Unexpected unchanged geometry proof: ${row.cell}`);
      continue;
    }
    assert.equal(row.status, "passed-reviewed", `Unapproved geometry proof: ${row.cell}`);
    assert.deepEqual(Object.keys(row).sort(), ["acceptedLeaves", "cell", "changes", "reviewSha256", "status"], `Incomplete reviewed geometry proof: ${row.cell}`);
    const review = geometryReview.cells[row.cell];
    assert(review, `Missing reviewed geometry proof cell: ${row.cell}`);
    assert.equal(row.acceptedLeaves, review.length, `Reviewed geometry proof leaf count differs: ${row.cell}`);
    assert.equal(row.reviewSha256, geometryReview.reviewSha256, `Reviewed geometry proof identity differs: ${row.cell}`);
    assert.deepEqual(row.changes, [...review].sort(), `Reviewed geometry proof differs: ${row.cell}`);
  }
  return true;
}

export function emitGeometry(output, manifest, inherited, rows, proof) {
  assert(proof.sourcesVerified && proof.nativeSim === "passed", "Missing source or native acceptance proof");
  const baseline = geometryBaseline(manifest, inherited, rows);
  const bytes = JSON.stringify(baseline, null, 2) + "\n";
  const receipt = { version: 1, kind: "same-runner-qualified-geometry", ...proof, cells: geometryReceiptCells(rows), baselineSha256: sha256(bytes), journalSha256: sha256(fs.readFileSync(proof.journal)) };
  const fd = fs.openSync(output, "wx");
  try {
    fs.writeFileSync(`${output}.proof.json`, JSON.stringify(receipt, null, 2) + "\n", { flag: "wx" });
    fs.writeFileSync(fd, bytes);
  } catch (error) {
    fs.unlinkSync(output);
    throw error;
  } finally { fs.closeSync(fd); }
  return receipt;
}

export function verifyGeneratedGeometry(output, root) {
  const proof = JSON.parse(fs.readFileSync(`${output}.proof.json`, "utf8"));
  assert.equal(proof.version, 1);
  assert.equal(proof.kind, "same-runner-qualified-geometry");
  assert.equal(proof.sourcesVerified, true);
  assert.equal(proof.nativeSim, "passed");
  assert.equal(proof.baselineSha256, sha256(fs.readFileSync(output)), "Generated baseline modified");
  assert.equal(proof.journalSha256, sha256(fs.readFileSync(proof.journal)), "Qualification journal modified");
  assert.deepEqual(proof.environment, environmentIdentity(), "Different functional environment");
  assert.deepEqual(proof.head, sourceIdentity(root), "Different functional source");
  const manifest = JSON.parse(fs.readFileSync(`${root}/routes.manifest.json`));
  const expected = planCells(manifest, []).map(cell => `${cell.route.slug}/${cell.viewport.name}/${cell.theme}`).sort();
  verifyGeometryReceiptCells(proof.cells, expected);
  const records = readGeometryJournal(proof.journal);
  for (const [side, identity] of Object.entries(proof.sources)) {
    const starts = records.filter(row => row.type === "source" && row.side === side);
    const ends = records.filter(row => row.type === "source-end" && row.side === side);
    assert.equal(starts.length, 1, `Geometry proof source start count differs: ${side}`);
    assert.equal(ends.length, 1, `Geometry proof source end count differs: ${side}`);
    assert.deepEqual(starts[0].identity, identity, `Geometry proof source start differs: ${side}`);
    assert.deepEqual(ends[0].identity, identity, `Geometry proof source end differs: ${side}`);
    assert.equal(ends[0].unchanged, true, `Geometry proof source changed: ${side}`);
  }
  assert.deepEqual(proof.sources.head, proof.head, "Geometry proof head identities differ");
  const complete = records.at(-1);
  assert.equal(complete.type, "complete");
  assert.equal(complete.completed, 504);
  assert.equal(complete.geometryQualified, true);
  const inherited = JSON.parse(fs.readFileSync(`${root}/tools/experience-baselines.json`));
  const reconstructed = JSON.stringify(geometryBaseline(manifest, inherited, geometryRowsFromJournal(records, proof.sources.base.head, proof.sources.head.head)), null, 2) + "\n";
  assert.equal(sha256(reconstructed), proof.baselineSha256, "Generated baseline does not match qualification journal");
  return proof;
}
