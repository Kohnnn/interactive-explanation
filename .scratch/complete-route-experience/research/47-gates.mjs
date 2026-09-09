import fs from "node:fs";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { sourceIdentity } from "../../../interactive-explanation/tools/diagnose-baseline.mjs";
const root = new URL("../../../", import.meta.url).pathname;
const source = sourceIdentity(`${root}interactive-explanation`);
const baseline = new URL("47-successor-007.json", import.meta.url).pathname;
const hash = bytes => createHash("sha256").update(bytes).digest("hex");
const previous = JSON.parse(fs.readFileSync(new URL("46-final-results.json", import.meta.url)));
const combined = previous.combined.map(row => ({ name: row.name, command: process.execPath, args: row.args.map(arg => arg === previous.baseline ? baseline : arg) }));
assert.equal(combined.length, 2);
const strict = combined.find(row => row.args.includes("--experience"));
assert.equal(strict.args.filter(arg => arg === "--route").length, 59);
const jobs = [
  ...["check", "unit", "audit"].map(name => ({ name, command: "npm", args: ["--prefix", "interactive-explanation", "run", name] })),
  { name: "negative37", command: process.execPath, args: [".scratch/complete-route-experience/research/37-prerequisite-verify.mjs", "--negative-check"] },
  { name: "negative40", command: process.execPath, args: [".scratch/complete-route-experience/research/40-reviewed-cells-verify.mjs", "--negative-check"] },
  { name: "successor007", command: process.execPath, args: [".scratch/complete-route-experience/research/47-successor-007.mjs"] },
  { name: "sim-actual", command: process.execPath, args: [".scratch/complete-route-experience/research/44-sim-operational.mjs", "interactive-explanation", "/tmp/opencode/47-sim-actual-002.jsonl"] },
  { name: "sim-geometry", command: process.execPath, args: ["interactive-explanation/tools/diagnose-baseline.mjs", "--root", "interactive-explanation", "--output", "/tmp/opencode/47-sim-geometry.jsonl", "--route", "sim"] },
  { name: "sim-normal", command: process.execPath, args: ["interactive-explanation/tools/smoke-bundle.mjs", "interactive-explanation", "--route", "sim", "--baseline", baseline] },
  ...combined,
];
const selectedJobs = process.argv.includes("--corrected-launch") ? jobs.filter(job => ["successor007", "sim-normal", "full-normal", "combined-strict59"].includes(job.name)) : jobs;
const output = new URL(process.argv.includes("--corrected-launch") ? "47-gates-002.jsonl" : "47-gates.jsonl", import.meta.url);
const fd = fs.openSync(output, "wx");
const append = row => { fs.writeSync(fd, JSON.stringify(row) + "\n"); fs.fsyncSync(fd); };
append({ type: "identity", source, baseline, baselineSha256: hash(fs.readFileSync(baseline)), concurrency: 1, historicalSweep: "00662/83 normal48/59 strict is historical, not current green", startedAt: new Date().toISOString() });
let failed = false;
try {
  for (const job of selectedJobs) {
    const startedAt = new Date().toISOString();
    const result = spawnSync(job.command, job.args, { cwd: root, env: { ...process.env, SMOKE_PORT: "4231", SMOKE_VERBOSE: "0" }, encoding: "utf8", timeout: 3600000, maxBuffer: 32 * 1024 * 1024 });
    append({ type: "result", ...job, startedAt, finishedAt: new Date().toISOString(), exit: result.status, signal: result.signal, error: result.error?.message, stdout: result.stdout, stderr: result.stderr });
    if (result.status !== 0) failed = true;
    console.log(`${job.name}: exit ${result.status}${result.signal ? ` signal ${result.signal}` : ""}`);
  }
  assert.equal(sourceIdentity(`${root}interactive-explanation`).digest, source.digest);
  append({ type: "complete", sourceUnchanged: true, verdict: failed ? "failed-or-inconclusive; retained, not a gate pass" : "commands completed; separate qualification required", finishedAt: new Date().toISOString() });
} finally { fs.closeSync(fd); }
process.exitCode = failed ? 1 : 0;
