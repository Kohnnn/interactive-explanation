# 50 — Bounded paired geometry admission

## Scope

Starting HEAD: `1a2abf9b53e698dd397eff621abcbe5f9287c2c0` in `/tmp/opencode/w0-ci-geometry`.

`tools/geometry-review.json` projects only the 62 approved source-delta cells and 1,590 exact path/before/after leaves from `/tmp/opencode/w0-ci-first-run/source-bound-geometry-review-v2.json` (SHA-256 `23054c887be2a6a0df0fc18822246811b711efe69ccdbff72f97f75c37f0f776`). Raw journal SHA-256: `951a010e8965261cb10fb5162608dd05f586af0e1585abfed031646d9f071926`, 504 cells. No predecessor bridge or baseline values are imported.

The map binds immutable base `db191963fd9a061ca063b9e73fd460b1dc77d4b0` and captured product head `542b16ada9dfcac0edb1e6ce9f3f29e2e1122d23`. Sorted normalized path/SHA-256 product inventories include root Atlas, all route files, shared assets/fonts, public metadata and package locks. Tooling, docs, research, workflow, root Markdown and gitignore are excluded from the product digest; capture/measurement/server dependencies are separately pinned to the captured head. Thus CI-only commits and the new registry do not create a head-SHA self-loop. Product additions, deletions and byte drift fail. Existing qualification verifies clean immutable Git fixtures and rechecks identities at completion.

## Enforcement

`compareGeometry` accepts an optional verified review token and exact cell identity. All three groups still require three identical measured geometry samples; A/A must remain exact before review. Reviewed samples additionally require readiness and no errors. Protected runtime ownership and intrinsic properties other than rectangles must remain deeply equal. Complete changed-path sets and exact values must match; presence is verified, and reconstructing only approved leaves must reproduce the complete after object. Unknown fields, extra/missing deltas, changed protected data or unstable controls fail closed.

Only exact admitted cells report `passed-reviewed`; ordinary equality remains `passed`. Totals preserve these separate statuses. Performance remains independently mandatory with unchanged budgets and classification. Rigid original admission is untouched and uses its separate reference. No accepted functional baseline is emitted.

## Verification and remaining work

Syntax checks, all 417 unit tests (392 existing plus 25 new) and public-surface audit passed without browser capture. Initial unit imports failed because this worktree lacked Playwright; `npm ci` installed the lockfile dependencies without downloading browsers, then checks passed. Tests use synthetic source bindings, not historical Git availability, so shallow CI checkouts remain supported.

Read-only streaming replay of the authoritative raw journal verified its complete SHA-256 and all 504 cell records: 62 `passed-reviewed`, 426 `passed`, 16 `blocked`, exactly 1,590 admitted leaves. Every performance status matched the original journal; six geometry-reviewed cells remain performance-inconclusive. No browser or new measured values were used.

Remaining: four unstable Sim cells, six failed Markov cells, six separately handled original rigid cells. The additional 57 legacy/environment bridge cells remain unapproved; the functional gate still uses and enforces its legacy baseline and remains blocked until separate bounded bridge review. No smoke/diagnostic functions, existing qualify tests, workflow, route products or legacy baseline were edited.

Standards/spec self-review found and closed an empty-object structural-diff loophole with full reconstructed-after equality and a negative test. No independent sub-agent facility was available; this is implementation self-review, not a new independent source review.

## Exact source-binding successor — 2026-09-10

Research 56 rebinds this unchanged 62-cell/1,590-leaf review from product digest `40d2e69bf997353eda8f00ed8e560a84164fbb7a9132fc0c1968cb0ecdf16de8` to `e3d6a2c2feb9eab8bdd3594037bac93c2c8f0e472ee00738073145c923c3045d` at source head `9618d8b9d6d03ec0ed27dd1c0c4c2775bbd9f3d3`. The raw and reviewed artifact hashes remain exact. This is a source/dependency rebind only, not new geometry approval; see [exact evidence and fail-closed blob contract](56-exact-source-rebinding.md).
