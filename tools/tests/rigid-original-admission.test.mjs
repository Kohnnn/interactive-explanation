import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { rigidAdmission, verifyRigidAdmission, collectRigidAdmission, compareCell, compareGeometry, compareUrlContracts } from "../qualify-pr.mjs";

const options = { base: "/base", head: "/head", reference: "/reference", "base-sha": rigidAdmission.baseSha, "head-sha": "b".repeat(40) };
const resolve = (_root, file) => rigidAdmission.sources[file];
const readMetadata = (_root, file) => fs.readFileSync(new URL(`../../${file}`, import.meta.url), "utf8");
const runs = (loadMs = 1000, url = "http://local/original.js") => Array.from({ length: 3 }, () => ({
  status: "measured", ready: true, errors: [], geometry: { rect: { top: 0, right: 100, bottom: 100, left: 0, width: 100, height: 100 }, css: { width: "100px", height: "100px", transform: "none", touchAction: "auto", pointerEvents: "auto" }, aspectRatio: 1, intrinsic: [] },
  performance: { domContentLoadedMs: 1000, loadMs, resourceCount: 10, resourceCountDelta: 0, sameOriginTransfer: { status: "supported", bytes: 1000 }, longestLocalResource: null },
  raw: { navigation: [{ name: "http://local/rigid/" }], resources: [{ name: url }] },
}));

test("original admission is exact, source-bound and only for the authorized base", () => {
  assert.equal(verifyRigidAdmission(rigidAdmission, options, resolve, readMetadata), rigidAdmission);
  for (const patch of [{ version: 1 }, { slug: "atlas" }, { sources: {} }, { projections: {} }, { referenceSha: "a".repeat(40) }]) {
    assert.throws(() => verifyRigidAdmission({ ...rigidAdmission, ...patch }, options, resolve, readMetadata));
  }
  assert.throws(() => verifyRigidAdmission(rigidAdmission, { ...options, reference: undefined }, resolve, readMetadata));
  assert.throws(() => verifyRigidAdmission(rigidAdmission, { ...options, "base-sha": "a".repeat(40) }, resolve, readMetadata));
  for (const side of ["/head", "/reference"]) for (const file of Object.keys(rigidAdmission.sources)) {
    assert.throws(() => verifyRigidAdmission(rigidAdmission, options, (root, name) => root === side && name === file ? "0".repeat(40) : resolve(root, name), readMetadata));
  }
  assert.throws(() => verifyRigidAdmission(rigidAdmission, options, () => { throw new Error("Missing Git source"); }, readMetadata));
});

for (const file of Object.keys(rigidAdmission.projections)) for (const [name, mutation] of [
  ["changed", routes => routes.map(route => route.slug === rigidAdmission.slug ? { ...route, summary: `${route.summary} changed` } : route)],
  ["duplicate", routes => [...routes, routes.find(route => route.slug === rigidAdmission.slug)]],
  ["missing", routes => routes.filter(route => route.slug !== rigidAdmission.slug)],
]) {
  test(`original admission rejects ${name} ${file} route metadata`, () => {
    assert.throws(() => verifyRigidAdmission(rigidAdmission, options, resolve, (root, name) => {
      const routes = JSON.parse(readMetadata(root, name));
      return JSON.stringify(root === "/head" && name === file ? mutation(routes) : routes);
    }));
  });
}

test("original admission allows unrelated route metadata changes", () => {
  assert.equal(verifyRigidAdmission(rigidAdmission, options, resolve, (root, file) => {
    const routes = JSON.parse(readMetadata(root, file));
    return JSON.stringify(routes.map(route => route.slug === "musicmap" ? { ...route, summary: `${route.summary} changed` } : route));
  }), rigidAdmission);
});

test("contract pins all four route files, route metadata and complete shared dependency tree without a self hash", () => {
  const root = fileURLToPath(new URL("../../", import.meta.url));
  const revision = side => side === "/reference" ? rigidAdmission.referenceSha : "HEAD";
  assert.equal(verifyRigidAdmission(
    rigidAdmission,
    options,
    (side, file) => execFileSync("git", ["rev-parse", `${revision(side)}:${file}`], { cwd: root, encoding: "utf8" }).trim(),
    (side, file) => execFileSync("git", ["show", `${revision(side)}:${file}`], { cwd: root, encoding: "utf8" }),
  ), rigidAdmission);
  assert.equal(Object.keys(rigidAdmission.sources).filter(file => file.startsWith(`${rigidAdmission.slug}/`)).length, 4);
  assert.ok(rigidAdmission.sources.shared);
  assert.deepEqual(Object.keys(rigidAdmission.projections), ["pages.json", "routes.manifest.json"]);
  assert.ok(!Object.keys(rigidAdmission.sources).some(file => file.startsWith("tools/")));
});

test("archived failure is retained without passing legacy equivalence; original groups are fresh", async () => {
  const failed = runs().map(sample => ({ ...sample, status: "failed", ready: false, geometry: null }));
  const legacy = { control: failed, before: failed, after: runs(1000, "http://local/legacy-head.js") };
  const cell = { route: { slug: rigidAdmission.slug }, viewport: { name: "desktop" }, theme: "light" };
  const calls = [];
  const records = [];
  const collect = async (root, _cell, group, position) => { calls.push([root, group, position]); return position.warmup ? [] : [runs()[0]]; };
  const result = await collectRigidAdmission(options, cell, cell, collect, { append: record => records.push(record) }, legacy);
  assert.deepEqual(calls.slice(0, 3).map(([root, group]) => [root, group]), [["/reference", "original-control"], ["/reference", "original-reference"], ["/head", "original-head"]]);
  assert(calls.slice(0, 3).every(([, , position]) => position.warmup));
  for (const group of ["original-control", "original-reference", "original-head"]) assert.equal(calls.filter(([, value, position]) => value === group && !position.warmup).length, 3);
  assert.equal(records[0].performance.status, "inconclusive");
  assert.equal(records[0].geometry.status, "blocked");
  assert.equal(records[0].urls.status, "review-required");
  assert.match(records[0].equivalence, /not claimed/);
  assert.equal(compareCell(result.control, result.before, result.after).status, "passed");
  assert.equal(compareGeometry(result.control, result.before, result.after).status, "passed");
  await assert.rejects(collectRigidAdmission(options, cell, { ...cell, route: { slug: "atlas" } }, collect, { append() {} }, legacy));
});

test("rigid resource admission compares only exact original controls and head", () => {
  assert.equal(compareUrlContracts({ "original-control": runs(), "original-reference": runs(), "original-head": runs() }).status, "stable");
  assert.equal(compareUrlContracts({ "original-control": runs(), "original-reference": runs(), "original-head": runs(1000, "http://local/different.js") }).status, "review-required");
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

test("CI provisions a literal immutable original reference and retains independent same-host functional smoke", () => {
  const workflow = fs.readFileSync(new URL("../../.github/workflows/ci.yml", import.meta.url), "utf8");
  assert.ok(workflow.includes(`ref: ${rigidAdmission.referenceSha}`));
  assert.match(workflow, /--reference \.\.\/original-reference/);
  assert.match(workflow, /node tools\/functional-qualified.mjs/);
  assert.doesNotMatch(workflow, /continue-on-error/);
  const runner = fs.readFileSync(new URL("../qualify-pr.mjs", import.meta.url), "utf8");
  assert.match(runner, /await verifyRigidBrowser\(options.head, browser\)/);
  assert.match(runner, /"--test", "tools\/tests\/rigid-body-collisions.test.mjs"/);
});
