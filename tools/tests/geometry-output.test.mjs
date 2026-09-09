import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { geometryBaseline, emitGeometry } from "../geometry-output.mjs";
import { compareGeometry, compareCell } from "../qualify-pr.mjs";
import { planCells } from "../diagnose-baseline.mjs";
import { runFunctional, strictRoutes } from "../functional-qualified.mjs";
import { simReferenceSha, simSource, verifySimSources } from "../sim-reference.mjs";

const manifest = JSON.parse(fs.readFileSync(new URL("../../routes.manifest.json", import.meta.url)));
const inherited = JSON.parse(fs.readFileSync(new URL("../experience-baselines.json", import.meta.url)));
const geometry = inherited.routes.sim.geometry.desktop;
const sample = () => ({ status: "measured", ready: true, errors: [], geometry: structuredClone(geometry) });
const runs = () => Array.from({ length: 3 }, sample);
const rows = () => planCells(manifest, []).map(cell => ({ cell: `${cell.route.slug}/${cell.viewport.name}/${cell.theme}`, geometry: { status: "passed" }, headGeometry: structuredClone(geometry) }));

test("all 504 cells yield version 2 light-only geometry with untouched historical performance", () => {
  const input = rows();
  for (const row of input.filter(row => row.cell.endsWith("/dark"))) row.headGeometry.rect.top = 999;
  const result = geometryBaseline(manifest, inherited, input);
  assert.equal(result.version, 2);
  assert.equal(Object.keys(result.routes).length, 83);
  for (const slug of Object.keys(result.routes)) {
    const { geometry: actual, ...rest } = result.routes[slug];
    const { geometry: old, ...expected } = inherited.routes[slug];
    assert.deepEqual(rest, expected);
    for (const viewport of ["desktop", "mobile", "narrow"]) assert.deepEqual(actual[viewport], geometry);
  }
});

for (const kind of ["missing", "duplicate", "unknown", "blocked", "inconclusive", "unapproved", "invalid-geometry", "atlas-blocked"]) {
  test(`geometry generation rejects ${kind}`, () => {
    const input = rows();
    if (kind === "missing") input.pop();
    if (kind === "duplicate") input[1] = input[0];
    if (kind === "unknown") input[1].cell = "unknown/mobile/light";
    if (["blocked", "inconclusive", "unapproved"].includes(kind)) input[1].geometry.status = kind;
    if (kind === "invalid-geometry") input[1].headGeometry = null;
    if (kind === "atlas-blocked") input.find(row => row.cell.startsWith("atlas/")).geometry.status = "blocked";
    assert.throws(() => geometryBaseline(manifest, inherited, input));
  });
}

test("performance-only capture errors do not approve performance or block exact geometry", () => {
  const failed = runs().map(row => ({ ...row, status: "failed", errors: [{ phase: "performance", message: "unsupported" }] }));
  assert.equal(compareGeometry(failed, failed, failed).status, "passed");
  assert.equal(compareCell(failed, failed, failed).status, "inconclusive");
});
for (const phase of ["context", "navigation", "readiness", "theme", "scroll", "geometry", "raw", "runtime", "console", "network", "cleanup"]) {
  test(`geometry rejects failed ${phase} sample`, () => {
    const failed = runs();
    failed[0].status = "failed";
    failed[0].errors = [{ phase, message: "failed" }];
    assert.equal(compareGeometry(failed, runs(), runs()).status, "blocked");
  });
}

test("unstable controls and head remain blocked", () => {
  for (const side of [0, 1, 2]) {
    const groups = [runs(), runs(), runs()];
    groups[side][1].geometry.rect.top += 1;
    assert.equal(compareGeometry(...groups).status, "blocked");
  }
});

test("no output on missing source proof", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "geometry-proof-"));
  try {
    const output = path.join(dir, "geometry.json");
    assert.throws(() => emitGeometry(output, manifest, inherited, rows(), { sourcesVerified: false, nativeSim: "passed" }));
    assert(!fs.existsSync(output));
    assert(!fs.existsSync(`${output}.proof.json`));
  } finally { fs.rmSync(dir, { recursive: true }); }
});

test("fixed Sim rejects wrong pin and unpinned source inventory", () => {
  assert.throws(() => verifySimSources({ revision: "a".repeat(40) }, {}), /revision/);
  assert.throws(() => verifySimSources({ revision: simReferenceSha, inventory: "copied head" }, {}), /inventory/);
});

test("same-source fixed Sim fixture admits exact dependency arrays and entry without reference checkout", () => {
  const head = simSource(fileURLToPath(new URL("../../", import.meta.url)));
  const reference = { ...head, revision: simReferenceSha };
  assert.equal(simReferenceSha, "94bb7ebc9daaf651a59cbbc6a1e9a11220001df1");
  assert.equal(verifySimSources(reference, head).inventorySha256, "c07300985b64ca156abba61602a1c48eb29c69bcd8445d2831031ffe21c551c8");
  assert.equal(verifySimSources(reference, head).cells.length, 4);
  assert.throws(() => verifySimSources({ ...reference, revision: "7b09f49e2ab3a3d0feacfcea0d40d6a773aa764f" }, head), /revision/);
  assert.throws(() => verifySimSources(reference, { ...head, inventory: head.inventory + "extra" }));
  assert.throws(() => verifySimSources(reference, { ...head, entry: { ...head.entry, title: "changed" } }));
});

test("strict explicit membership matches retained strict59 without browser execution", () => {
  const retained = JSON.parse(fs.readFileSync(new URL("../../.scratch/complete-route-experience/research/46-final-results.json", import.meta.url)));
  const args = retained.combined.find(row => row.args.includes("--experience")).args;
  assert.deepEqual(strictRoutes, args.filter((value, index) => args[index - 1] === "--route"));
});

for (const exits of [[0, 0], [1, 0], [0, 1], [1, 1], [null, 0]]) {
  test(`functional retains full and strict exits ${exits}`, () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "functional-proof-"));
    try {
      let count = 0;
      const result = runFunctional("/source", "/geometry", path.join(dir, "result.jsonl"), () => {}, (command, args) => {
        assert(args.includes("--skip-performance"));
        assert(!args.includes("--skip-geometry"));
        assert.equal(args.filter(value => value === "--route").length, count === 0 ? 0 : 59);
        return { status: exits[count++] };
      });
      assert.equal(count, 2);
      assert.equal(result, exits.every(code => code === 0) ? 0 : 1);
      const journal = fs.readFileSync(path.join(dir, "result.jsonl"), "utf8").trim().split("\n").map(JSON.parse);
      assert.deepEqual(journal.slice(0, 2).map(row => row.exit), exits);
    } finally { fs.rmSync(dir, { recursive: true }); }
  });
}

test("existing baseline without generator proof cannot start functional commands", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "functional-blocked-"));
  try {
    let called = false;
    assert.equal(runFunctional("/source", "/missing", path.join(dir, "result.jsonl"), undefined, () => { called = true; }), 1);
    assert.equal(called, false);
  } finally { fs.rmSync(dir, { recursive: true }); }
});
