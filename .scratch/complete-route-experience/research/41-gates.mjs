import fs from "node:fs";
import { spawnSync } from "node:child_process";
const cwd = process.argv[2];
if (!cwd) throw new Error("Pass the absolute interactive-explanation site directory");
const commands = [
  ["check", "npm", ["run", "check"]],
  ["audit", "npm", ["run", "audit"]],
  ["unit", "npm", ["run", "unit"]],
  ...["remember", "covid-19", "sim", "reading-qr-codes-without-a-computer"].map(slug => [slug, "node", ["tools/smoke-bundle.mjs", ".", "--route", slug, "--baseline", "/tmp/opencode/40-geometry-successor-004.json"]]),
];
const results = [];
for (const [name, command, args] of commands) {
  const result = spawnSync(command, args, { cwd, env: { ...process.env, SMOKE_PORT: "4221" }, encoding: "utf8", timeout: 120000 });
  results.push({ name, command, args, status: result.status, signal: result.signal, error: result.error?.message, stdout: result.stdout, stderr: result.stderr });
  console.log(name, result.status, result.stderr.trim());
}
fs.writeFileSync(new URL("41-gates.json", import.meta.url), JSON.stringify(results, null, 2) + "\n");
if (results.slice(0, 3).some(r => r.status !== 0)) process.exitCode = 1;
