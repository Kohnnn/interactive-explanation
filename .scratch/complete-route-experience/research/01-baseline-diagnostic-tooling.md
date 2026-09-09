# Diagnostic tooling checkpoint

Source: isolated branch implement/complete-route-baseline, starting commit 62828b88d5aa9ada8f6e3387f59d257abc00e671. No browser measurements performed. Source integration and sequential browser scheduling remain prerequisites; wbwwb, coming-out-simulator-2014 and covid-19 were not provisioned or measured here.

## Delivered boundary

`interactive-explanation/tools/diagnose-baseline.mjs` imports existing smoke geometry, readiness, theme, scroll, runtime-monitor and performance seams. Smoke main and console filtering run only for direct CLI invocation. Performance extraction preserves the existing evaluator. No inherited assertion or baseline changed. No collect-all acceptance framework or baseline writer added.

Default selection is manifest routes plus Atlas, six stored cells each and three new contexts per cell, sequentially. Explicit repeated `--route` selects only those slugs (use `--route atlas` to include Atlas in a filtered run). An 83-route source therefore plans 504 cells and 1512 contexts. Historical partial fixtures can select two routes without measuring missing unrelated entries.

Output is exclusive-create, mode 0600 JSONL outside the measured site, fsynced after each record. Existing output fails rather than truncates. Attempt records precede samples; a killed run lacking `complete` is incomplete. Startup failures and source drift remain failures. Full file SHA-256 inventories exclude .git and node_modules, reject other source symlinks, and include actual route-directory contents. Git identity, dirty status, baseline/tool hashes, browser catalog/version, OS/runtime, concurrency and cache limitations are retained. Historical archives must retain an identifiable enclosing Git source or be prepared as identified Git worktrees; a bare anonymous archive without Git identity is rejected.

Samples retain complete parent runtime/intrinsic geometry, raw top-document Navigation/Resource Timing, request/response/failure events, console errors/warnings, readiness, fonts, scroll and viewport overflow measurements. Existing runtime policy is monitored, not bypassed. Failed requests including cancellations require classification. Child interiors, opaque interactions, pointer mapping, accessibility and resource timing beyond browser buffer/parent-document scope are not certified. Full intrinsic geometry means the existing smoke surface inventory, not recursive iframe instrumentation. No credentials are supplied; review raw public URL/console data before publishing evidence.

Each cell reports actual counts, medians/ranges, outer geometry ranges, exact full-geometry stability, and unreviewed geometry-only JSON-pointer differences against the inherited light reference. All raw intrinsic samples remain available. Failed samples are retained, not silently removed from metric ranges. Inherited comparisons use unchanged smoke assertions and keep exit status nonzero on mismatch. Reference comparability is explicitly false because inherited environment provenance is missing. A proposal requires three successful, exactly stable geometry samples; no synthetic geometry median or performance replacement is generated.

## Commands after coordination

Run from this worktree root, with an existing output parent and a new filename for every invocation:

```bash
SMOKE_PORT=4199 node interactive-explanation/tools/diagnose-baseline.mjs --root /absolute/historical/interactive-explanation --output /tmp/opencode/historical-polygons-decision-tree-001.jsonl --route polygons --route decision-tree
SMOKE_PORT=4199 node interactive-explanation/tools/diagnose-baseline.mjs --root /absolute/immutable-merged/interactive-explanation --output /tmp/opencode/before-polygons-decision-tree-001.jsonl --route polygons --route decision-tree
SMOKE_PORT=4199 node interactive-explanation/tools/diagnose-baseline.mjs --root /absolute/immutable-merged/interactive-explanation --output /tmp/opencode/before-all-001.jsonl
```

Do not run these concurrently with source-agent focused tests. Compare historical/current raw samples under identical tool/browser/server settings, inspect every geometry difference and source cause, then record agent review separately. Geometry proposals are not approved successors. Preserve untouched geometry and all inherited performance fields when constructing any separately reviewed successor. Use the normal smoke CLI with `--baseline <new-reviewed-file>` for subsequent comparisons, never recording mode as acceptance. Full smoke and strict gates remain separately mandatory.

## Static verification

Initial checks: configured `npm run check` and explicit diagnostic syntax check passed; six initial diagnostic tests passed. `npm run audit` passed, which does not prove absent canonical route contents. `npm run unit` ran 369 tests: 362 passed, seven failed. Failures: aggregate canonical HTML seam plus entrypoint/UI baseline tests for each of wbwwb, coming-out-simulator-2014 and covid-19, all ENOENT/missing index.html. These source-integration failures remain visible, not skipped. Final rerun: configured syntax checks, explicit diagnostic syntax, seven diagnostic tests and audit passed. Full Node suite repeated with dot reporter and retained the same seven missing-route failures (370 total tests, 363 passing). No browser acceptance is claimed.

No package01 edits, production route edits, source-agent docs/audit edits, baseline overwrite, measurements, successor approval, merge or deployment occurred. Only the existing node_modules installation was linked; the symlink is not committed.
