import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { readPerformanceEvidence } from "../smoke-bundle.mjs";
import { parseOptions, planCells, statistics, geometryChanges, openJournal, summarizeCell, capture, verifySourceFixture } from "../diagnose-baseline.mjs";

const route = { slug: "polygons", experience: { primarySurface: "main", runtimeSurface: "main", networkPolicy: { mode: "local-only" } } };

test("diagnostic validates arguments and manifest before launch", () => {
  assert.equal(parseOptions(["--root", ".", "--output", "/tmp/new", "--route", "polygons"]).routes[0], "polygons");
  for (const args of [["--record-baseline"], ["--root"], ["--root", ".", "--root", "."], ["--route", "../private"]]) assert.throws(() => parseOptions(args));
  assert.throws(() => planCells([route], ["unknown"]));
  assert.throws(() => planCells([route, route], []));
  assert.equal(planCells([route], []).length, 12);
  assert.equal(planCells([route], ["polygons"]).length, 6);
  assert.equal(planCells([route], ["atlas"]).length, 6);
});

test("journal is durable exclusive output, never truncates existing evidence", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "baseline-journal-"));
  try {
    const output = path.join(directory, "raw.jsonl");
    const journal = openJournal(output);
    journal.append({ type: "failed", message: "retained" });
    journal.close();
    assert.throws(() => openJournal(output), /EEXIST/);
    assert.deepEqual(JSON.parse(fs.readFileSync(output, "utf8")), { type: "failed", message: "retained" });
  } finally { fs.rmSync(directory, { recursive: true }); }
});

test("Sim typography guards missing main and publishes resize without invoking input", async () => {
  const html = fs.readFileSync(new URL("../../sim/index.html", import.meta.url), "utf8");
  const script = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(match => match[1]).find(value => value.includes("settleEditorTypography"));
  assert(script);
  let present = false;
  let events = 0;
  const attributes = [];
  const context = vm.createContext({
    document: { querySelector: () => present ? { setAttribute: (...args) => attributes.push(args) } : null, fonts: { ready: Promise.resolve() } },
    requestAnimationFrame: resolve => resolve(),
    publish: event => { assert.equal(event, "ui/resize"); events++; },
    subscribe: () => {}, Model: { data: {} },
  });
  vm.runInContext(script, context);
  await context.settleEditorTypography();
  assert.equal(events, 0);
  present = true;
  await context.settleEditorTypography();
  assert.equal(events, 1);
  assert.deepEqual(attributes, [["aria-busy", "true"], ["aria-busy", "false"]]);
});

test("source fixture requires Git blob bytes, mode and exact paths before capture", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "baseline-source-"));
  const site = fileURLToPath(new URL("../../", import.meta.url));
  const repository = spawnSync("git", ["rev-parse", "--show-toplevel"], { cwd: site, encoding: "utf8" }).stdout.trim();
  const prefix = path.relative(repository, path.join(site, "docs/sim")).split(path.sep).join("/");
  try {
    const tree = spawnSync("git", ["ls-tree", "-r", "HEAD", "--", prefix], { cwd: repository, encoding: "utf8" });
    assert.equal(tree.status, 0);
    for (const record of tree.stdout.trim().split("\n")) {
      const [header, name] = record.split("\t");
      const destination = path.join(directory, name.slice(prefix.length + 1));
      fs.mkdirSync(path.dirname(destination), { recursive: true });
      fs.writeFileSync(destination, spawnSync("git", ["show", `HEAD:${name}`], { cwd: repository }).stdout);
      fs.chmodSync(destination, header.startsWith("100755") ? 0o755 : 0o644);
    }
    const original = verifySourceFixture(directory, repository, "HEAD", prefix);
    const file = path.join(directory, original.files[0][0]);
    const bytes = fs.readFileSync(file);
    fs.appendFileSync(file, "altered fixture");
    assert.throws(() => verifySourceFixture(directory, repository, "HEAD", prefix), /Git blob bytes differ/);
    fs.writeFileSync(file, bytes);
    fs.chmodSync(file, 0o755);
    assert.throws(() => verifySourceFixture(directory, repository, "HEAD", prefix), /mode differs/);
    fs.chmodSync(file, 0o644);
    fs.writeFileSync(path.join(directory, "extra.html"), "extra");
    assert.throws(() => verifySourceFixture(directory, repository, "HEAD", prefix), /paths differ/);
    fs.unlinkSync(path.join(directory, "extra.html"));
    for (const name of ["node_modules", ".git"]) {
      fs.mkdirSync(path.join(directory, name));
      fs.writeFileSync(path.join(directory, name, "excluded"), "excluded explicitly");
    }
    assert.deepEqual(verifySourceFixture(directory, repository, "HEAD", prefix), original);
    fs.unlinkSync(file);
    assert.throws(() => verifySourceFixture(directory, repository, "HEAD", prefix), /paths differ/);
  } finally { fs.rmSync(directory, { recursive: true }); }
});

test("statistics preserve sample count and range without fabricated zero", () => {
  assert.deepEqual(statistics([3, undefined, 1, 8]), { count: 3, median: 3, min: 1, max: 8 });
  assert.deepEqual(statistics([]), { count: 0, median: null, min: null, max: null });
});

test("proposal contains exact geometry paths only, requires three stable successful samples", () => {
  const geometry = { rect: { height: 20 } };
  const sample = { slug: "polygons", theme: "light", viewport: { name: "mobile" }, status: "measured", geometry, performance: { loadMs: 3 } };
  const before = { rect: { height: 21 } };
  const result = summarizeCell([sample, sample, sample], before);
  assert.deepEqual(result.proposal, [{ path: "/routes/polygons/geometry/mobile/rect/height", before: 21, after: 20, review: "unreviewed" }]);
  assert.deepEqual(before, { rect: { height: 21 } });
  assert.equal(result.approval, "none");
  assert.equal(summarizeCell([sample, sample], before).proposal.length, 0);
  assert.equal(summarizeCell([sample, sample, { ...sample, status: "failed" }], before).proposal.length, 0);
  assert.equal(summarizeCell([sample, sample, { ...sample, geometry: before }], before).proposal.length, 0);
  assert.deepEqual(geometryChanges({ "a/b": 1 }, { "a/b": 2 }), [{ path: "/a~1b", before: 1, after: 2, review: "unreviewed" }]);
});

test("a failed context is retained and the next independent capture still executes", async () => {
  let contexts = 0;
  const browser = { newContext: async () => { contexts++; throw new Error("synthetic launch seam failure"); } };
  const cell = planCells([route], ["polygons"])[0];
  const first = await capture(browser, cell);
  const second = await capture(browser, cell);
  assert.equal(contexts, 2);
  assert.equal(first.status, "failed");
  assert.equal(second.errors[0].phase, "context");
});

test("extracted performance seam retains navigation transfer and resource semantics", async () => {
  const originalPerformance = globalThis.performance;
  const originalWindow = globalThis.window;
  const origin = "http://127.0.0.1:4173";
  const navigation = { name: `${origin}/interactive-explanation/polygons/`, domContentLoadedEventEnd: 12, loadEventEnd: 20, transferSize: 100 };
  const resource = { name: `${origin}/interactive-explanation/shared/site.js`, transferSize: 200, duration: 5 };
  try {
    globalThis.window = { location: { origin } };
    globalThis.performance = { getEntriesByType: (type) => type === "navigation" ? [navigation] : [resource] };
    const evidence = await readPerformanceEvidence({ evaluate: (fn, arg) => fn(arg) });
    assert.equal(evidence.loadMs, 20);
    assert.equal(evidence.resourceCount, 1);
    assert.deepEqual(evidence.sameOriginTransfer, { status: "supported", bytes: 300 });
    assert.deepEqual(evidence.longestLocalResource, { path: "shared/site.js", durationMs: 5 });
  } finally {
    globalThis.performance = originalPerformance;
    if (originalWindow === undefined) delete globalThis.window;
    else globalThis.window = originalWindow;
  }
});

test("smoke import preserves console and does not launch; CLI still validates filters", () => {
  const smoke = new URL("../smoke-bundle.mjs", import.meta.url);
  const imported = spawnSync(process.execPath, ["--input-type=module", "-e", `const log = console.log; const m = await import(${JSON.stringify(smoke.href)}); if (console.log !== log || typeof m.measureRuntimeSurface !== "function") process.exit(2);`], { encoding: "utf8", timeout: 15000 });
  assert.equal(imported.status, 0, imported.stderr);
  assert.equal(imported.stdout, "");
  const cli = spawnSync(process.execPath, [smoke.pathname, "--route", "not-a-manifest-route"], { encoding: "utf8", timeout: 15000 });
  assert.equal(cli.status, 1);
  assert.match(cli.stderr, /Unknown --route slug/);
});
