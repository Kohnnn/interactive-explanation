import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { planCells, sourceIdentity } from "./diagnose-baseline.mjs";
import { validateGeometryEvidence } from "./experience-baseline.mjs";

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
    validateGeometryEvidence(row.headGeometry);
    const [slug, viewport, theme] = row.cell.split("/");
    if (slug !== "atlas" && theme === "light") baseline.routes[slug].geometry[viewport] = structuredClone(row.headGeometry);
  }
  return baseline;
}

export function emitGeometry(output, manifest, inherited, rows, proof) {
  assert(proof.sourcesVerified && proof.nativeSim === "passed", "Missing source or native acceptance proof");
  const baseline = geometryBaseline(manifest, inherited, rows);
  const bytes = JSON.stringify(baseline, null, 2) + "\n";
  const receipt = { version: 1, kind: "same-runner-qualified-geometry", ...proof, cells: rows.map(({ cell, geometry }) => ({ cell, status: geometry.status })), baselineSha256: sha256(bytes), journalSha256: sha256(fs.readFileSync(proof.journal)) };
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
  const expected = planCells(JSON.parse(fs.readFileSync(`${root}/routes.manifest.json`)), []).map(cell => `${cell.route.slug}/${cell.viewport.name}/${cell.theme}`).sort();
  assert.equal(proof.cells.length, 504);
  assert.deepEqual(proof.cells.map(row => row.cell).sort(), expected);
  assert(proof.cells.every(row => ["passed", "passed-reviewed"].includes(row.status)));
  const complete = JSON.parse(fs.readFileSync(proof.journal, "utf8").trim().split("\n").at(-1));
  assert.equal(complete.type, "complete");
  assert.equal(complete.completed, 504);
  assert.equal(complete.geometryQualified, true);
  return proof;
}
