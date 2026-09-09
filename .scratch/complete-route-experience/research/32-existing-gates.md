# Existing gate measurements

## Result

Measured the existing dirty working tree without fixing application code, installing dependencies/browsers, syncing metadata, recording baselines, or committing. Syntax checks, all 363 unit tests, and the public-surface audit passed. Both requested browser smoke invocations failed at browser launch because the required Playwright headless-shell executable is absent. **No routes received browser validation in either run; this is not an 83-route smoke pass.** Browser collection by the main agent remains separate evidence.

## Scope and environment

- Command working directory: `/media/compute_01/New Volume/PersonalWebsite/interactive-note/interactive-explanation`.
- Artifact directory: `/media/compute_01/New Volume/PersonalWebsite/interactive-note/.scratch/complete-route-experience/research`. The corresponding directory inside `interactive-explanation/` did not exist; the existing parent-repo research directory was verified with Read and `ls -ld "../.scratch/complete-route-experience/research"` before capture.
- Read `AGENTS.md`, `package.json`, CLI parsing, group classification, main execution order, and output/baseline handling before measurement commands.
- Node: `v24.20.0`; npm: `11.19.0`; installed Playwright package: `1.60.0`; app package: `interactive-explanation@1.0.0`.
- `chromium.executablePath()` reported `/home/compute_01/.cache/ms-playwright/chromium-1223/chrome-linux64/chrome`; this reports an expected path, not proof of installation. No running browser version was obtainable from the requested smoke runs.
- Environment capture: 2026-09-08T14:39:06Z through 2026-09-08T14:39:07Z, tool timeout 120000 ms. See [environment and initial git status](32-gates-environment.log).
- Initial `git status --short`: 754 modified tracked files and five untracked files. The untracked files included `tools/experience-baseline.mjs`, `tools/experience-baselines.json`, and related tests. These results describe this existing work-in-progress tree, not a clean commit or an independently verified baseline. No exclusive workspace lock or content-hash snapshot was taken; concurrent changes by other agents cannot be excluded.
- Only this report and `32-gates-*.log` evidence files were authored by this task. Unit tests may create their own temporary fixtures; no production sync command was run.

## Results and timings

All timestamps are UTC on 2026-09-08. Elapsed seconds use Bash `SECONDS` and therefore have whole-second precision. The three npm gates ran concurrently; browser smoke workloads ran sequentially after those gates.

| Gate / exact measured command | Start | End | Elapsed s | Timeout ms | Exit | Coverage/result | Log |
| --- | --- | --- | ---: | ---: | ---: | --- | --- |
| `timeout 120s npm run check` | 14:39:38 | 14:39:38 | 0 | 120000 | 0 | 10 JS syntax checks passed; no separate lint/typecheck script is configured | [check](32-gates-check.log) |
| `timeout 120s npm run unit` | 14:39:38 | 14:39:40 | 2 | 120000 | 0 | 363 tests passed, 0 failed/cancelled/skipped/todo; runner duration 1822.338896 ms | [unit](32-gates-unit.log) |
| `timeout 120s npm run audit` | 14:39:38 | 14:39:41 | 3 | 120000 | 0 | Public-surface audit passed for its listed routes; no assertion-count summary emitted | [audit](32-gates-audit.log) |
| `SMOKE_PORT=4187 timeout 240s node tools/smoke-bundle.mjs .` | 14:39:53 | 14:39:54 | 1 | 240000 | 1 | 1 launch failure; 0 routes executed, 0 route passes, route failures not measured | [full smoke](32-gates-smoke-full.log) |
| `SMOKE_PORT=4188 timeout 120s node tools/smoke-bundle.mjs . --group mlu --experience` | 14:40:26 | 14:40:26 | 0 | 120000 | 1 | 1 launch failure; 0 of 10 selected MLU routes executed, strict gates not reached | [MLU strict smoke](32-gates-smoke-mlu-experience.log) |

No timeout fired. Exit values above are the measured command's status, not merely `tee` success.

## Reproducible failure and actual covered scope

Both smoke logs contain the same failure at line 3:

```text
browserType.launch: Executable doesn't exist at /home/compute_01/.cache/ms-playwright/chromium_headless_shell-1223/chrome-headless-shell-linux64/chrome-headless-shell
```

- Failure call site: `interactive-explanation/tools/smoke-bundle.mjs:9724:34`, `await chromium.launch({ headless: true })`.
- Evidence: [full smoke](32-gates-smoke-full.log), lines 3 and 12; [MLU strict smoke](32-gates-smoke-mlu-experience.log), lines 3 and 12.
- Selection validation and approved-baseline loading occur before the startup message (`tools/smoke-bundle.mjs:9718-9722`) and returned without error. The server start was awaited before launch (`:9723`). The first route loop begins only at `:9728`, after launch, so no geometry, compatibility, strict experience, performance, route/docs, atlas, wayfinding, or route-specific browser assertions ran.
- The existing code emits phase messages through `phaseLog` regardless of verbosity (`:70-80`), suppresses ordinary `console.log` unless verbose, and prints the fatal stack to stderr before exiting 1 (`:10065-10067`). Default logs do not provide per-route pass counts. Combined stdout/stderr capture preserves the actual launch error.
- Baseline writes occur only under `recordBaseline` (`:10053-10055`); that flag was never passed. No baseline was refreshed to obtain a pass.
- The missing executable is an environment blocker, not evidence that any route's runtime behavior passed or failed. Installation is outside this task's authorization and was not attempted.

## Strict representative selection

`mlu` is a valid source-defined smoke family: `shared/route-families.js:31-35` maps MLU reference URLs to `smoke: "mlu"`; `:155-169` includes the family in each route's group set. The manifest has ten matching entries: decision-tree, random-forest, linear-regression, logistic-regression, precision-recall, roc-auc, bias-variance, train-test-validation, double-descent, double-descent2. Source references appear at `routes.manifest.json:409`, `:468`, and `:2699-3088`.

The strict invocation passed selection validation and printed `Starting smoke run [groups: mlu] [experience gates]`. Strict experience dispatch is at `tools/smoke-bundle.mjs:9736-9737`, which was not reached. Selection validity must not be confused with measured migration/experience conformance.

## Exact capture procedure

Each gate was executed with the following Bash wrapper, substituting the measured command from the table, the corresponding timeout in seconds, and its linked log filename:

```bash
set -o pipefail; { date -u +START=%Y-%m-%dT%H:%M:%SZ; SECONDS=0; <measured command>; result=$?; date -u +END=%Y-%m-%dT%H:%M:%SZ; printf 'EXIT=%s\nELAPSED_SECONDS=%s\nTIMEOUT_SECONDS=<120 or 240>\n' "$result" "$SECONDS"; exit "$result"; } 2>&1 | tee "../.scratch/complete-route-experience/research/<log filename>"
```

For example, the full smoke command was exactly:

```bash
set -o pipefail; { date -u +START=%Y-%m-%dT%H:%M:%SZ; SECONDS=0; SMOKE_PORT=4187 timeout 240s node tools/smoke-bundle.mjs .; result=$?; date -u +END=%Y-%m-%dT%H:%M:%SZ; printf 'EXIT=%s\nELAPSED_SECONDS=%s\nTIMEOUT_SECONDS=240\n' "$result" "$SECONDS"; exit "$result"; } 2>&1 | tee "../.scratch/complete-route-experience/research/32-gates-smoke-full.log"
```

The environment capture command was:

```bash
ls -ld "../.scratch/complete-route-experience/research" && set -o pipefail && { date -u +START=%Y-%m-%dT%H:%M:%SZ; node --version; npm --version; node --input-type=module -e 'import { createRequire } from "node:module"; import { chromium } from "playwright"; const require = createRequire(import.meta.url); console.log("playwright=" + require("playwright/package.json").version); console.log("chromiumExecutable=" + chromium.executablePath());'; git status --short; date -u +END=%Y-%m-%dT%H:%M:%SZ; } 2>&1 | tee "../.scratch/complete-route-experience/research/32-gates-environment.log"
```

The CLI presentation compressed some tool output; the saved raw logs were read directly with the Read tool. No `head`/`tail` truncation was used. `npm test`, `npm run sync`, `--record-baseline`, installs, production edits, and Git-mutating operations were not invoked.

## Delivery implication

Existing static/unit gates are green for this dirty tree. Browser acceptance remains unmeasured and blocked by the missing compatible headless-shell executable. Keep complete-route-experience browser acceptance open; rerun the same isolated smoke commands in an authorized, provisioned environment without changing the approved baseline. Main-agent browser evidence should be reported independently rather than substituted for these failed gate runs.
