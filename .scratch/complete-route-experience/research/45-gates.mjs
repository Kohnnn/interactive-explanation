import fs from "node:fs";
import { spawnSync } from "node:child_process";
const root = new URL("../../../", import.meta.url).pathname;
const results = [];
for (const [command, args] of [
  ["node", ["--check", ".scratch/complete-route-experience/research/45-visible-controls.mjs"]],
  ["node", ["--check", ".scratch/complete-route-experience/research/45-watch.mjs"]],
  ["npm", ["--prefix", "interactive-explanation", "run", "check"]],
  ["npm", ["--prefix", "interactive-explanation", "run", "unit"]],
  ["npm", ["--prefix", "interactive-explanation", "run", "audit"]],
  ["node", ["interactive-explanation/tools/smoke-bundle.mjs", "interactive-explanation", "--route", "train-test-validation", "--experience", "--baseline", "/tmp/opencode/42-geometry-successor-005.json", "--verbose"]],
  ["node", ["interactive-explanation/tools/smoke-bundle.mjs", "interactive-explanation", "--route", "interactive-mechanical-watch", "--baseline", "/tmp/opencode/42-geometry-successor-005.json", "--verbose"]],
]) {
  if (process.argv.includes("--ttv-only") && args.includes("interactive-mechanical-watch")) continue;
  const startedAt = new Date().toISOString();
  const result = spawnSync(command, args, { cwd: root, encoding: "utf8", timeout: 240000, maxBuffer: 8 * 1024 * 1024 });
  results.push({ command, args, startedAt, finishedAt: new Date().toISOString(), exit: result.status, signal: result.signal, stdout: result.stdout, stderr: result.stderr });
  console.log(JSON.stringify({ command, args, exit: result.status, stderr: result.stderr }));
}
fs.writeFileSync(process.argv[2], JSON.stringify(results, null, 2) + "\n", { flag: "wx" });
process.exitCode = results.some(result => result.exit !== 0) ? 1 : 0;
