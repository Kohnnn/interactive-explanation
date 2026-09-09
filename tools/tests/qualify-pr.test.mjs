import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { classifySamples, compareCell, compareGeometry, collectCellPair, assertIdentity, parseOptions } from "../qualify-pr.mjs";
import { planCells } from "../diagnose-baseline.mjs";

const sample = (overrides = {}) => ({
  status: "measured", ready: true, errors: [], geometry: { rect: { top: 0, right: 100, bottom: 100, left: 0, width: 100, height: 100 }, css: { width: "100px", height: "100px", transform: "none", touchAction: "auto", pointerEvents: "auto" }, aspectRatio: 1, intrinsic: [] },
  performance: { domContentLoadedMs: 1000, loadMs: 1000, resourceCount: 10, resourceCountDelta: 0, sameOriginTransfer: { status: "supported", bytes: 1000 }, longestLocalResource: null, ...overrides },
});
const runs = (overrides) => Array.from({ length: 3 }, () => sample(overrides));

test("paired capture uses each source's selectors and network policy for the same cell key", async () => {
  const route = { slug: "rigid-body-collisions", experience: { primarySurface: "#old-primary", runtimeSurface: "#old-runtime", networkPolicy: { mode: "deferred-remote", hosts: ["example.org"] } } };
  const replacement = { ...route, experience: { primarySurface: "#new-primary", runtimeSurface: "#new-runtime", networkPolicy: { mode: "local-only" } } };
  const baseCell = planCells([route], [route.slug])[0];
  const headCell = planCells([replacement], [route.slug])[0];
  const calls = [];
  const journal = [];
  const failed = runs().map(value => ({ ...value, status: "failed", ready: false, geometry: null, performance: null, errors: [{ phase: "readiness", message: "Old runtime unavailable" }] }));
  const collect = async (root, cell, group) => {
    calls.push({ root, cell, group });
    if (group === "head") assert.equal(journal[0].type, "calibration");
    return group === "head" ? runs() : failed;
  };
  const result = await collectCellPair({ base: "/base", head: "/head" }, baseCell, headCell, collect, { append: value => journal.push(value) });
  assert.deepEqual(calls.map(({ root, group }) => ({ root, group })), [
    { root: "/base", group: "base-control" }, { root: "/base", group: "base" }, { root: "/head", group: "head" },
  ]);
  assert.equal(calls[0].cell, baseCell);
  assert.equal(calls[1].cell, baseCell);
  assert.equal(calls[2].cell, headCell);
  assert.equal(calls[0].cell.route.experience.networkPolicy, route.experience.networkPolicy);
  assert.equal(calls[2].cell.route.experience.networkPolicy, replacement.experience.networkPolicy);
  assert.equal(journal[0].result.status, "inconclusive");
  assert.equal(classifySamples(result.after).status, "admissible");
  assert.equal(compareCell(result.control, result.before, result.after).status, "inconclusive");
  assert.equal(compareGeometry(result.control, result.before, result.after).status, "blocked");
});

test("paired qualification admits stable three-run groups and preserves raw ranges", () => {
  const result = compareCell(runs(), runs(), runs({ loadMs: 1250 }));
  assert.equal(result.status, "passed");
  assert.equal(result.calibration, "passed");
  assert.deepEqual(result.groups.after.metrics.loadMs, { count: 3, median: 1250, min: 1250, max: 1250 });
  assert.equal(compareCell(runs(), runs(), runs({ loadMs: 1251 })).status, "regression");
  assert.equal(compareCell(runs({ loadMs: 2000 }), runs({ loadMs: 2000 }), runs({ loadMs: 2401 })).status, "regression");
});

test("unchanged byte and resource budgets reject over-budget evidence", () => {
  assert.equal(compareCell(runs(), runs(), runs({ sameOriginTransfer: { status: "supported", bytes: 257000 } })).status, "passed");
  assert.equal(compareCell(runs(), runs(), runs({ sameOriginTransfer: { status: "supported", bytes: 257001 } })).status, "regression");
  assert.equal(compareCell(runs(), runs(), runs({ resourceCount: 11, resourceCountDelta: 100 })).status, "regression");
});

test("missing, failed, unsupported and unstable samples cannot qualify", () => {
  for (const samples of [[], runs().slice(1), [...runs(), sample()], [sample(), sample(), { ...sample(), status: "failed" }], runs({ loadMs: 0 }), runs({ loadMs: NaN }), runs({ sameOriginTransfer: { status: "unsupported" } }), [sample(), sample(), sample({ loadMs: 1126 })], [sample(), sample(), sample({ resourceCount: 11 })], [sample(), sample(), sample({ sameOriginTransfer: { status: "supported", bytes: 1001 } })]]) {
    assert.equal(classifySamples(samples).status, "inconclusive");
    assert.equal(compareCell(runs(), runs(), samples).status, "inconclusive");
    assert.equal(compareCell(samples, runs(), runs()).status, "inconclusive");
  }
});

test("A/A calibration rejects drift before considering head even when head meets budget", () => {
  assert.equal(compareCell(runs(), runs({ loadMs: 1126 }), runs()).status, "inconclusive");
  assert.equal(compareCell(runs({ loadMs: 1126 }), runs(), runs()).status, "inconclusive");
  assert.equal(compareCell(runs(), runs({ resourceCount: 11 }), runs()).status, "inconclusive");
  assert.equal(compareCell(runs(), runs({ sameOriginTransfer: { status: "supported", bytes: 1001 } }), runs()).status, "inconclusive");
});

test("geometry requires complete stable same-source controls and specific change review", () => {
  assert.equal(compareGeometry(runs(), runs(), runs()).status, "passed");
  const changed = runs().map(value => ({ ...value, geometry: { ...value.geometry, rect: { ...value.geometry.rect, width: 101 } } }));
  assert.equal(compareGeometry(runs(), changed, changed).status, "blocked");
  const result = compareGeometry(runs(), runs(), changed);
  assert.equal(result.status, "blocked");
  assert.deepEqual(result.changes, [{ path: "/rect/width", before: 100, after: 101, review: "unreviewed" }]);
  assert.equal(compareGeometry([], runs(), runs()).status, "blocked");
  assert.equal(compareGeometry(runs(), runs(), [sample(), sample(), changed[0]]).status, "blocked");
});

test("source identity rejects mutable revisions, dirt, hash drift and missing identity", () => {
  const sha = "a".repeat(40);
  const identity = { head: sha, status: "", digest: "b".repeat(64), files: [["index.html", "c".repeat(64)]] };
  assertIdentity(identity, sha, identity);
  assert.throws(() => assertIdentity(identity, "HEAD"));
  assert.throws(() => assertIdentity(identity, "d".repeat(40)));
  assert.throws(() => assertIdentity({ ...identity, status: " M index.html" }, sha));
  assert.throws(() => assertIdentity({ ...identity, digest: "" }, sha));
  assert.throws(() => assertIdentity({ ...identity, digest: "e".repeat(64) }, sha, identity));
  assert.throws(() => assertIdentity({ ...identity, files: [] }, sha, identity));
});

test("qualification has exact full matrix and rejects CLI injection or filter bypass", () => {
  const manifest = JSON.parse(fs.readFileSync(new URL("../../routes.manifest.json", import.meta.url)));
  assert.equal(planCells(manifest, []).length, 504);
  for (const args of [[], ["--route", "atlas"], ["--base-sha", "main;id"], ["--head", ".", "--head", "."], ["--skip-performance"], ["--output"]]) assert.throws(() => parseOptions(args));
});

test("CI uses read-only PR sandbox, immutable paired checkouts and independent functional job", () => {
  const workflow = fs.readFileSync(new URL("../../.github/workflows/ci.yml", import.meta.url), "utf8");
  assert.match(workflow, /permissions:\r?\n  contents: read/);
  assert.doesNotMatch(workflow, /pull_request_target|secrets\.|continue-on-error|skip-geometry/);
  assert.match(workflow, /paired-performance:[\s\S]*timeout-minutes: 180/);
  assert.match(workflow, /repository: Kohnnn\/interactive-explanation/);
  assert.match(workflow, /ref: \$\{\{ github.event.pull_request.base.sha \}\}/);
  assert.match(workflow, /ref: \$\{\{ github.event.pull_request.head.sha \}\}/);
  assert.match(workflow, /--only-shell --with-deps chromium/);
  assert.match(workflow, /full-smoke:[\s\S]*--skip-performance --baseline tools\/experience-baselines.json/);
  assert.match(workflow, /if: always\(\)/);
});
