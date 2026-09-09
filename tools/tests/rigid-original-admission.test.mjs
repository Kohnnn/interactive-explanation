import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { rigidAdmission, verifyRigidAdmission, collectRigidAdmission, compareCell, compareGeometry } from "../qualify-pr.mjs";

const options = { base: "/base", head: "/head", reference: "/reference", "base-sha": rigidAdmission.baseSha };
const resolve = (_root, file) => rigidAdmission.sources[file];
const runs = (loadMs = 1000) => Array.from({ length: 3 }, () => ({
  status: "measured", ready: true, errors: [], geometry: { rect: { width: 100 } },
  performance: { domContentLoadedMs: 1000, loadMs, resourceCount: 10, resourceCountDelta: 0, sameOriginTransfer: { status: "supported", bytes: 1000 }, longestLocalResource: null },
}));

test("original admission is exact, source-bound and only for the authorized base", () => {
  assert.equal(verifyRigidAdmission(rigidAdmission, options, resolve), rigidAdmission);
  for (const patch of [{ version: 2 }, { slug: "atlas" }, { sources: {} }, { referenceSha: "a".repeat(40) }]) {
    assert.throws(() => verifyRigidAdmission({ ...rigidAdmission, ...patch }, options, resolve));
  }
  assert.throws(() => verifyRigidAdmission(rigidAdmission, { ...options, reference: undefined }, resolve));
  assert.throws(() => verifyRigidAdmission(rigidAdmission, { ...options, "base-sha": "a".repeat(40) }, resolve));
  for (const side of ["/head", "/reference"]) for (const file of Object.keys(rigidAdmission.sources)) {
    assert.throws(() => verifyRigidAdmission(rigidAdmission, options, (root, name) => root === side && name === file ? "0".repeat(40) : resolve(root, name)));
  }
  assert.throws(() => verifyRigidAdmission(rigidAdmission, options, () => { throw new Error("Missing Git source"); }));
});

test("contract pins all four route files and complete shared dependency tree without a self hash", () => {
  const root = new URL("../../", import.meta.url);
  for (const [file, hash] of Object.entries(rigidAdmission.sources)) {
    assert.equal(execFileSync("git", ["rev-parse", `HEAD:${file}`], { cwd: root, encoding: "utf8" }).trim(), hash);
  }
  assert.equal(Object.keys(rigidAdmission.sources).filter(file => file.startsWith(`${rigidAdmission.slug}/`)).length, 4);
  assert.ok(rigidAdmission.sources.shared);
  assert.ok(!Object.keys(rigidAdmission.sources).some(file => file.startsWith("tools/")));
});

test("archived failure is retained without passing legacy equivalence; original groups are fresh", async () => {
  const failed = runs().map(sample => ({ ...sample, status: "failed", ready: false, geometry: null }));
  const legacy = { control: failed, before: failed, after: runs() };
  const cell = { route: { slug: rigidAdmission.slug }, viewport: { name: "desktop" }, theme: "light" };
  const calls = [];
  const records = [];
  const collect = async (root, _cell, group) => { calls.push([root, group]); return runs(); };
  const result = await collectRigidAdmission(options, cell, cell, collect, { append: record => records.push(record) }, legacy);
  assert.deepEqual(calls, [["/reference", "original-control"], ["/reference", "original-reference"], ["/head", "original-head"]]);
  assert.equal(records[0].performance.status, "inconclusive");
  assert.equal(records[0].geometry.status, "blocked");
  assert.match(records[0].equivalence, /not claimed/);
  assert.equal(compareCell(result.control, result.before, result.after).status, "passed");
  assert.equal(compareGeometry(result.control, result.before, result.after).status, "passed");
  await assert.rejects(collectRigidAdmission(options, cell, { ...cell, route: { slug: "atlas" } }, collect, { append() {} }, legacy));
});

test("original acceptance rejects noisy, failed and geometrically changed reference evidence", () => {
  const noisy = runs();
  noisy[2].performance.loadMs = 1126;
  for (const before of [[], noisy, runs().map(sample => ({ ...sample, status: "failed" }))]) {
    assert.equal(compareCell(runs(), before, runs()).status, "inconclusive");
  }
  assert.equal(compareCell(runs(), runs(), runs(1251)).status, "regression");
  assert.equal(compareGeometry(runs(), runs(), runs().map(sample => ({ ...sample, geometry: { rect: { width: 101 } } }))).status, "blocked");
});

test("CI provisions a literal immutable original reference and retains independent legacy smoke", () => {
  const workflow = fs.readFileSync(new URL("../../.github/workflows/ci.yml", import.meta.url), "utf8");
  assert.ok(workflow.includes(`ref: ${rigidAdmission.referenceSha}`));
  assert.match(workflow, /--reference \.\.\/original-reference/);
  assert.match(workflow, /--skip-performance --baseline tools\/experience-baselines.json/);
  const runner = fs.readFileSync(new URL("../qualify-pr.mjs", import.meta.url), "utf8");
  assert.match(runner, /await verifyRigidBrowser\(options.head, browser\)/);
  assert.match(runner, /"--test", "tools\/tests\/rigid-body-collisions.test.mjs"/);
});
