import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { classifySamples, compareCell, compareGeometry, collectCellPair, balancedSchedule, compareUrlContracts, reviewResourceUrls, assertIdentity, isGeometryQualified, parseOptions } from "../qualify-pr.mjs";
import { verifyResourceReview } from "../resource-review.mjs";
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
  const collect = async (root, cell, group, position) => {
    calls.push({ root, cell, group, position });
    if (position.warmup) return [];
    return [group === "head" ? runs()[0] : failed[0]];
  };
  const sha = "a".repeat(40);
  const result = await collectCellPair({ "base-control": "/base-control", base: "/base", head: "/head", "base-sha": sha, "head-sha": "b".repeat(40) }, baseCell, headCell, collect, { append: value => journal.push(value) });
  assert.equal(calls.length, 12);
  assert.deepEqual(calls.slice(0, 3).map(({ root, group, position }) => ({ root, group, warmup: position.warmup })), [
    { root: "/base-control", group: "base-control", warmup: true }, { root: "/base", group: "base", warmup: true }, { root: "/head", group: "head", warmup: true },
  ]);
  assert.equal(calls.filter(call => !call.position.warmup && call.group === "base-control").length, 3);
  assert.equal(calls.find(call => call.group === "base-control").cell, baseCell);
  assert.equal(calls.find(call => call.group === "head").cell, headCell);
  assert.equal(calls.find(call => call.group === "base-control").cell.route.experience.networkPolicy, route.experience.networkPolicy);
  assert.equal(calls.find(call => call.group === "head").cell.route.experience.networkPolicy, replacement.experience.networkPolicy);
  assert.equal(journal.find(entry => entry.type === "calibration").result.status, "inconclusive");
  assert.equal(classifySamples(result.after).status, "admissible");
  assert.equal(compareCell(result.control, result.before, result.after).status, "inconclusive");
  assert.equal(compareGeometry(result.control, result.before, result.after).status, "blocked");
});

test("deterministic schedule balances every group across every ordinal", () => {
  const groups = ["base-control", "base", "head"];
  const args = ["a".repeat(40), "b".repeat(40), "route/desktop/light", groups];
  const schedule = balancedSchedule(...args);
  assert.deepEqual(balancedSchedule(...args), schedule);
  for (const group of groups) {
    assert.deepEqual(schedule.flat().filter(value => value === group), [group, group, group]);
    assert.deepEqual(schedule.map(round => round.indexOf(group)).sort(), [0, 1, 2]);
  }
});

test("URL multisets require stable exact controls and explicit head source review", () => {
  const raw = names => ({ raw: { navigation: [{ name: names[0] }], resources: names.slice(1).map(name => ({ name })) } });
  const stable = [raw(["http://local/route/", "http://local/a.js?x=1", "http://local/a.js?x=1"])];
  stable.push(stable[0], stable[0]);
  assert.equal(compareUrlContracts({ "base-control": stable, base: stable, head: stable }).status, "stable");
  const changed = stable.map(() => raw(["http://local/route/", "http://local/b.js"]));
  const result = compareUrlContracts({ "base-control": stable, base: stable, head: changed });
  assert.equal(result.status, "review-required");
  assert.equal(result.exactBase, true);
  assert.deepEqual(result.additions, { "http://local/b.js": 1 });
  assert.deepEqual(result.removals, { "http://local/a.js?x=1": 2 });
  const unstable = compareUrlContracts({ "base-control": stable, base: [stable[0], changed[0], stable[0]], head: stable });
  assert.equal(unstable.status, "review-required");
  assert(Object.hasOwn(unstable.unstable, "base"));
});

test("resource identity ignores only local cache queries while raw contracts retain them", () => {
  const raw = (cache, origin = "http://127.0.0.1:4173") => ({ raw: { navigation: [{ name: `${origin}/interactive-explanation/route/` }], resources: [{ name: `${origin}/interactive-explanation/a.js?cache=${cache}` }] } });
  const groups = { "base-control": [raw(1), raw(2), raw(3)], base: [raw(4), raw(5), raw(6)], head: [raw(7), raw(8), raw(9)] };
  const result = compareUrlContracts(groups);
  assert.equal(result.status, "stable");
  assert.equal(result.contracts.base[0]["http://127.0.0.1:4173/interactive-explanation/a.js?cache=4"], 1);
  const meaningful = { ...groups, head: [raw("other"), raw("other"), raw("other")] };
  assert.equal(compareUrlContracts(meaningful).status, "review-required");
  const external = { ...groups, head: [raw(7, "https://example.invalid"), raw(8, "https://example.invalid"), raw(9, "https://example.invalid")] };
  assert.equal(compareUrlContracts(external).status, "review-required");
});

test("resource review admits only exact stable multiset changes bound to exact sources", () => {
  const digest = value => value.repeat(64);
  const identities = {
    base: { head: "a".repeat(40), files: [["route/index.html", digest("1")], ["route/runtime.js", digest("2")]] },
    head: { head: "b".repeat(40), files: [["route/index.html", digest("3")], ["route/runtime.js", digest("4")]] },
  };
  const entry = {
    cells: ["route/desktop/light", "route/desktop/dark"], baseSha: identities.base.head, headSha: identities.head.head,
    purpose: "Replace one exact route-local resource.",
    additions: { "http://local/new.js": 1 }, removals: { "http://local/old.js": 2 },
    implications: {
      scope: "Top-document same-origin Resource Timing.",
      requestCount: { base: 10, head: 9, delta: -1 },
      sameOriginTransferBytes: { base: 1000, head: 900, delta: -100 },
      childRuntime: "No child runtime exists.",
    },
    sources: { base: { "route/index.html": digest("1") }, head: { "route/index.html": digest("3") } },
    dependencies: { base: { "route/runtime.js": digest("2") }, head: { "route/runtime.js": digest("4") } },
  };
  const contract = { version: 2, reviews: [entry] };
  const manifest = [{ slug: "route" }, { slug: "other" }];
  const successor = structuredClone(identities);
  successor.head.head = "c".repeat(40);
  const isAncestor = (ancestor, descendant) => ancestor === entry.headSha && [identities.head.head, successor.head.head].includes(descendant);
  const token = verifyResourceReview(contract, identities, manifest, isAncestor);
  assert.doesNotThrow(() => verifyResourceReview(contract, successor, manifest, isAncestor));
  assert.throws(() => verifyResourceReview(contract, { ...identities, head: { ...identities.head, head: "d".repeat(40) } }, manifest, isAncestor));
  const urls = { status: "review-required", unstable: {}, exactBase: true, additions: entry.additions, removals: entry.removals };
  const implications = { base: runs(), head: runs({ resourceCount: 9, sameOriginTransfer: { status: "supported", bytes: 900 } }) };
  for (const cell of entry.cells) assert.equal(reviewResourceUrls(urls, token, cell, implications).status, "passed-reviewed-resource");
  assert.equal(reviewResourceUrls({ ...urls, unstable: { head: [] } }, token, entry.cells[0], implications).status, "review-required");
  assert.equal(reviewResourceUrls(urls, token, entry.cells[0], { ...implications, head: runs() }).status, "review-required");
  assert.equal(compareCell(runs(), runs(), runs({ resourceCount: 11 })).status, "regression");
  assert.equal(compareCell(runs(), runs(), runs({ sameOriginTransfer: { status: "supported", bytes: 257001 } })).status, "regression");
  for (const patch of [
    { additions: { ...entry.additions, "http://local/extra.js": 1 } },
    { additions: {} },
    { additions: { "http://local/new.js": 2 } },
  ]) assert.equal(reviewResourceUrls({ ...urls, ...patch }, token, entry.cells[0], implications).status, "review-required");
  const changedSuccessor = structuredClone(successor);
  changedSuccessor.head.files.find(([file]) => file === "route/index.html")[1] = digest("0");
  assert.throws(() => verifyResourceReview(contract, changedSuccessor, [{ slug: "route" }], isAncestor));
  for (const mutate of [
    value => { value.reviews[0].cells = ["unknown/desktop/light"]; },
    value => { value.reviews[0].cells = ["route/*/light"]; },
    value => { value.reviews[0].cells.push(value.reviews[0].cells[0]); },
    value => { value.reviews[0].cells.push("other/desktop/light"); },
    value => { value.reviews.push(structuredClone(value.reviews[0])); },
    value => { delete value.reviews[0].removals; },
    value => { delete value.reviews[0].purpose; },
    value => { value.reviews[0].implications.requestCount.delta = 0; },
    value => { value.reviews[0].headSha = "invalid"; },
    value => { value.reviews[0].sources.head["route/index.html"] = digest("0"); },
  ]) {
    const changed = structuredClone(contract);
    mutate(changed);
    assert.throws(() => verifyResourceReview(changed, identities, manifest, isAncestor));
  }
});

test("readyMs remains journal-only and cannot excuse DCL or load regression", () => {
  const before = runs().map((value, index) => ({ ...value, readyMs: 10 + index }));
  const after = runs({ loadMs: 1251 }).map((value, index) => ({ ...value, readyMs: 1 + index }));
  assert.equal(compareCell(before, before, after).status, "regression");
  assert.equal(Object.hasOwn(classifySamples(before).metrics, "readyMs"), false);
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

test("geometry qualification accepts unchanged and exact reviewed states only", () => {
  assert.equal(isGeometryQualified({ status: "passed" }), true);
  assert.equal(isGeometryQualified({ status: "passed-reviewed" }), true);
  for (const status of ["blocked", "inconclusive", "unapproved", undefined]) assert.equal(isGeometryQualified({ status }), false);
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

test("CI uses read-only PR sandbox and same-host independent functional obligations", () => {
  const workflow = fs.readFileSync(new URL("../../.github/workflows/ci.yml", import.meta.url), "utf8");
  assert.match(workflow, /permissions:\r?\n  contents: read/);
  assert.doesNotMatch(workflow, /pull_request_target|secrets\.|continue-on-error|skip-geometry/);
  assert.match(workflow, /paired-performance:[\s\S]*timeout-minutes: 180/);
  assert.match(workflow, /repository: Kohnnn\/interactive-explanation/);
  assert.match(workflow, /ref: \$\{\{ github.event.pull_request.base.sha \}\}/);
  assert.match(workflow, /ref: \$\{\{ github.event.pull_request.head.sha \}\}/);
  assert.match(workflow, /--only-shell --with-deps chromium/);
  assert.match(workflow, /--geometry-output "\$RUNNER_TEMP\/geometry.json"/);
  assert.match(workflow, /functional gates[\s\S]*if: always\(\)[\s\S]*working-directory: head[\s\S]*node tools\/functional-qualified.mjs/);
  assert.doesNotMatch(workflow, /full-smoke:|--skip-performance/);
  assert.match(workflow, /if: always\(\)/);
});
