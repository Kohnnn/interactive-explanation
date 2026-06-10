# Interactive-Explanation Repository Audit

> Audit date: 2026-06-10. Scope: `interactive-explanation/` only.
> The original Engineering Sandbox design brief is preserved verbatim in the
> [Appendix](#appendix-engineering-sandbox-design-brief) because `AGENTS.md` declares this file
> the source of the shared editorial shell contract.
>
> Review depth: deep on `shared/*`, `tools/*`, manifests, and the atlas page (the ~20% that
> drives the whole site). Vendored per-route runtimes (ncase, setosa, ableton, mlu, ciechanowski
> ports, etc.) received lighter, spot-check review only.

---

## 1. Executive Summary

**Overall health grade: B−**

**Top 3 risks**

1. **Verification is not reproducible from a clean clone.** The smoke suite imports Playwright
   (`tools/smoke-bundle.mjs:4`) but no `package.json` or lockfile exists anywhere in the repo;
   Playwright currently resolves from a machine-global `C:\Users\Admin\node_modules`. There is no
   CI (`.github/` absent), so nothing enforces the two audit tools that the repo's whole quality
   story depends on.
2. **A dead root file carries live Google Analytics and escapes the policy scanner.**
   `mlu-home.html:23-35` loads `googletagmanager.com/gtag/js?id=G-1FYW57GW3G`, references assets
   that do not exist (`./assets/mlu_robot.png`, `css/styles.css` — both verified missing), and is
   invisible to `tools/check-public-surface.mjs` because that tool only scans three root files
   (`check-public-surface.mjs:5`) plus route dirs. This directly violates the site's own
   "external promo widget" policy (`check-public-surface.mjs:53`).
3. **Dual git identity.** The parent repo (`interactive-note/.git`) tracks 3,514 files under
   `interactive-explanation/`, while the nested `interactive-explanation/.git` tracks 6,058 files
   with a different history, and there is no `.gitmodules`. Commits can land in either history and
   silently diverge.

**Top 3 opportunities**

1. A minimal `package.json` + one CI workflow makes the existing, already-good audit tooling
   enforceable — small effort, large payoff.
2. Extending the policy scan to all root-level HTML files closes the only observed provenance gap
   and removes the GA tracker.
3. Decomposing the 7,028-line `tools/smoke-bundle.mjs` into per-family scenario modules makes the
   strongest asset of the repo (deep behavioral smoke tests) maintainable.

**Justification.** This is a disciplined, convention-heavy static replica site at hobby/portfolio
maturity. Manifest validation, provenance policy enforcement, route/docs parity (80/80 routes have
docs dirs; no scaffold stubs remain), and graceful UI fallbacks are all genuinely good. Both audit
tools pass today (`check-public-surface.mjs` run 2026-06-10: passed; `node --check` on all core JS:
passed). What drags the grade down is operational fragility: undeclared dependencies, no CI, a dead
analytics-bearing file, duplicated family-classification logic in three places, and a test monolith.
None of these are product-breaking today; all of them get more expensive every month.

---

## 2. Repo Map

**Purpose & maturity.** A self-contained, build-less static site of interactive-explanation
replicas ("atlas" + 80 route folders), designed for subpath hosting at
`/interactive-explanation/`. Active solo project (latest nested-repo commit 2026-06-05,
"accessibility and UI polish"). No framework, no bundler, no transpilation — deliberate and
appropriate for the content.

**Stack.** Plain ES5/ES2017+ JavaScript, HTML, CSS. Node.js ESM scripts for tooling. Playwright
(Chromium) for the smoke suite. Python `http.server` suggested for local serving. No TypeScript,
no lint config, no CI, no package manifest.

**Entry points & core modules**

| File | Role | Size |
|---|---|---|
| `index.html` | Atlas/landing page; mounts data-attribute hooks | 109 lines |
| `pages.json` / `routes.manifest.json` | Route manifest (identical, 80 entries, verified in sync) | 563 lines each |
| `shared/site.js` | Renders atlas (stats, featured, family board, inventory) + docs parity pages + a11y enhancements | 858 lines |
| `shared/engineering-sandbox.js` | Opt-in editorial shell (chapter rail, callouts) for routes with `data-story-shell` | 936 lines |
| `shared/public-footer.js` | Mounts `#reference-footer` provenance surface from body data attributes | 209 lines |
| `tools/check-public-surface.mjs` | Regex policy audit: bans upstream branding, analytics, share widgets, remote media per family | 316 lines |
| `tools/sync-route-metadata.mjs` | Validates manifest contract, syncs `pages.json`, scaffolds docs stubs | 251 lines |
| `tools/smoke-bundle.mjs` | Static server + full Playwright behavioral smoke suite for every route | **7,028 lines** |

**Control flow sketch.** `index.html` → `shared/site.js` `DOMContentLoaded` → fetch `./pages.json`
→ `enrichPage()` classifies each route into a family by reference-URL host
(`shared/site.js:183-222`) → renders filterable card UI. Each route is an independent static
folder; docs pages fetch `docs/<slug>/parity.json` via `initParity()` (`shared/site.js:728`).
Tools are run manually from the repo root with `.` as the explicit root argument (their default
`process.cwd()/interactive-explanation` is wrong inside this repo — `check-public-surface.mjs:4`,
`smoke-bundle.mjs:44`).

**Key directories**

- `<slug>/` ×80 — one folder per shipped replica route, route-local assets, relative paths.
- `docs/<slug>/` ×80 — provenance/parity page + `parity.json` per route (1:1 with manifest, verified).
- `shared/` — cross-route shell: `site.*`, `public-footer.*`, `engineering-sandbox.*`, fonts, archived runtimes.
- `tools/` — the three Node ESM scripts above.
- `ev/` — 46.9 MB of shared Setosa runtime assets (d3, angular, MathJax, fonts) consumed via
  `../ev/...` by setosa routes (e.g. `pi/index.html:20-24`). The only top-level directory that is
  neither a route nor `shared|docs|tools`.

**Conventions.** kebab-case slugs; `docsUrl` must equal `./docs/<slug>/` (enforced at
`sync-route-metadata.mjs:112-115`); relative asset paths everywhere; double quotes + semicolons +
2-space indent in tooling; fail-fast assertions in tools, graceful fallback UI in browser code
(`site.js:705-725`); deterministic `data-*` selectors for tests.

**Surprises / unclear**

- `mlu-home.html` at root: dead (no inbound references found repo-wide), broken asset links, live GA tag.
- Nested `.git` inside `interactive-explanation/` with a history diverging from the parent repo's.
- `AGENTS.md` is untracked in the nested repo (`git status`: `?? AGENTS.md`).
- `ev/` placement outside `shared/` despite being a shared runtime.

---

## 3. Audit Report

### 3.1 Security & Provenance

| # | Finding | Evidence | Impact | Severity | Type |
|---|---|---|---|---|---|
| S1 | Dead root file `mlu-home.html` ships a live Google Analytics tag (`G-1FYW57GW3G`) and Open Graph pointing at upstream `mlu-explain.github.io`; its local asset references (`./assets/mlu_robot.png`, `css/styles.css`) do not exist | `mlu-home.html:11-12,20-21,23-35`; missing assets verified by filesystem check | If deployed, visitors hitting this URL are tracked by an upstream GA property; violates the repo's own analytics ban (`check-public-surface.mjs:53`) and provenance policy | **High** | Fact |
| S2 | Policy scanner has a root-file blind spot: only `index.html`, `pages.json`, `routes.manifest.json` are scanned at root | `tools/check-public-surface.mjs:5,300-302` | Any future root-level file (like S1) bypasses the entire policy engine; the audit "passed" while S1 exists | **High** | Fact |
| S3 | Docs parity renderer concatenates `parity.json` fields directly into `innerHTML` without escaping | `shared/site.js:753-790` (`sourceFiles`, `notes`, `evidence`, `moduleId`, `originalBehavior`, `localStatus`) | Self-authored data, so practical risk is low today; but any future tooling that auto-writes parity notes from upstream content becomes an XSS vector | Low | Fact |
| — | Smoke server path-traversal guard is present and correct (`path.resolve` + prefix check) | `tools/smoke-bundle.mjs:239-244` | Healthy | — | Fact |

### 3.2 DevEx & Operations

| # | Finding | Evidence | Impact | Severity | Type |
|---|---|---|---|---|---|
| D1 | No dependency manifest anywhere: no `package.json` in `interactive-explanation/` or parent; Playwright imported but resolved from machine-global `C:\Users\Admin\node_modules\playwright` | `tools/smoke-bundle.mjs:4`; `Test-Path package.json` → False (both levels); `require.resolve('playwright')` output | Smoke suite cannot run from a clean clone; Playwright version is unpinned, so suite behavior can change when the global install changes | **High** | Fact |
| D2 | No CI of any kind (`.github/` absent at both repo levels) | filesystem check | The two audit tools are advisory only; a regression in policy or smoke passes silently into history | **High** | Fact |
| D3 | Dual git tracking: parent repo tracks 3,514 files under `interactive-explanation/`; nested `interactive-explanation/.git` tracks 6,058 files with a separate history; no `.gitmodules` | `git ls-files` counts at both levels; parent log (`8416e0f feat: new sites`) vs nested log (`0cac3ed feat: accessibility...`) | Commits made at one level are invisible to the other; risk of losing work or shipping stale trees depending on which repo deploys | **High** | Fact |
| D4 | `AGENTS.md` (the operating contract for agents) is untracked in the nested repo | nested `git status --porcelain` → `?? AGENTS.md` | The most important onboarding doc can be lost by any clean/checkout operation | Medium | Fact |
| D5 | Tool default root is wrong inside this repo (`process.cwd()/interactive-explanation`), requiring the easy-to-forget `.` argument | `check-public-surface.mjs:4`, `smoke-bundle.mjs:44`, `sync-route-metadata.mjs:26`; documented in `AGENTS.md` | Running tools without `.` fails confusingly or audits the wrong tree | Low | Fact |

### 3.3 Architecture & Design

| # | Finding | Evidence | Impact | Severity | Type |
|---|---|---|---|---|---|
| A1 | Family-classification logic exists in three independent copies that must be hand-synchronized: host→family mapping in `shared/site.js:183-222` (`getFamilyKey`), `tools/smoke-bundle.mjs:131-173` (`inferRouteFamily`), and the family policy tables in `tools/check-public-surface.mjs:48-211` | cited lines | Adding a new source family requires three coordinated edits; drift produces wrong filtering, wrong smoke grouping, or missing policy coverage | Medium | Fact |
| A2 | `ev/` (46.9 MB) is shared runtime for 9 setosa routes but lives at top level, excluded from manifest and from per-route policy/smoke conventions only by special-casing | `pi/index.html:20-24` (`../ev/scripts/d3.js` etc.); directory diff vs manifest shows `ev` as the only unmatched dir | Confusing layout; tools must special-case it forever; violates the otherwise-clean "every top dir is a route" invariant | Low | Judgment |
| — | Otherwise the architecture is healthy: strict manifest contract (`sync-route-metadata.mjs:77-117`), single source of truth for route metadata, clean docs/route 1:1 parity (verified 80/80, zero scaffold stubs remaining), relative-path discipline | — | — | — | Fact |

### 3.4 Code Quality

| # | Finding | Evidence | Impact | Severity | Type |
|---|---|---|---|---|---|
| Q1 | `tools/smoke-bundle.mjs` is a 7,028-line monolith containing ~119 top-level functions: server, CLI parsing, route grouping, and every per-route behavioral scenario in one file | `smoke-bundle.mjs` (7,028 lines; function count via grep) | Hard to review, easy to break unrelated scenarios when editing one route's checks; discourages adding tests for new routes | Medium | Judgment |
| Q2 | Smoke tool globally monkey-patches `console.log` to implement verbosity | `tools/smoke-bundle.mjs:50-56` | Any imported helper's logging is silently swallowed; surprising debugging behavior | Low | Fact |
| Q3 | `mlu-home.html` is dead code (zero inbound references repo-wide) with broken internal links | repo-wide grep for `mlu-home` → no matches outside the file itself | Dead code carrying the S1 risk; misleads readers into thinking an MLU hub route exists | Medium (subsumes into S1) | Fact |
| — | Browser code quality is otherwise good: guarded DOM lookups, `textContent` used in atlas card rendering (`site.js:146-155`), graceful fetch-failure fallbacks (`site.js:705-725`), a11y enhancement layer (`site.js:804-852`) | — | — | — | Fact |

### 3.5 Testing

| # | Finding | Evidence | Impact | Severity | Type |
|---|---|---|---|---|---|
| T1 | The smoke suite is strong but unenforced and environment-fragile (see D1/D2): it cannot run without an ambient Playwright and is never run automatically | `smoke-bundle.mjs:4`; no CI | Regression detection depends entirely on operator discipline | High (rolled into D1/D2 remediation) | Fact |
| T2 | No unit tests for the pure logic that has real branching: `getFamilyKey`, `enrichPage`, manifest validation, policy regex tables | absence verified (no test files outside smoke suite) | Policy regexes (e.g. the long alternations at `check-public-surface.mjs:50-53,120,174`) are the kind of code that silently breaks on edit; today they are only tested by "did the audit still pass" | Medium | Judgment |
| — | Positive: the smoke suite checks real behavior (overflow at two viewports, footer presence, route-specific selectors, console/network failures), not just HTTP 200s; route/group filtering exists (`smoke-bundle.mjs:128-129,203-207`) | — | — | — | Fact |

### 3.6 Performance

Healthy for the architecture. Static files, no build, `no-store` only on the manifest fetch
(`site.js:658`) and smoke server. The 417 MB repo size is dominated by vendored media (e.g. `ev/`
fonts, route media) which is inherent to the replica mission, not waste. One note: atlas re-renders
the full card list on every keystroke (`site.js:698-702`) — fine at 80 routes, revisit at ~300+.
No findings warranting action now.

### 3.7 Dependencies

Only one real dependency (Playwright) and it is undeclared — covered by D1. Vendored route
libraries (d3, angular 1.x in `ev/`, MathJax) are frozen snapshots by design; they are excluded
from policy scanning intentionally (`check-public-surface.mjs:14-21`). Accept as-is for a replica
archive; do not "upgrade" them.

### 3.8 Documentation

| # | Finding | Evidence | Impact | Severity | Type |
|---|---|---|---|---|---|
| O1 | Two AGENTS.md files disagree: the root-level `interactive-note/AGENTS.md` documents commands without the required `.` argument (e.g. `node interactive-explanation/tools/check-public-surface.mjs`) and a `--route=trust` flag style, while `interactive-explanation/AGENTS.md` documents `node tools/check-public-surface.mjs .` | both files, command sections | An agent or human following the root doc from the wrong cwd gets wrong-root audits; conflicting flag syntax wastes time | Medium | Fact |
| — | Otherwise documentation is a strength: per-route docs pages with parity JSON, a real design-brief contract (Appendix), and an unusually precise inner `AGENTS.md` | — | — | — | Judgment |

### 3.9 Strengths (preserve these)

1. **Manifest contract with hard validation** — unique slugs, required fields, exact `docsUrl`
   shape, `referenceMode` rules (`tools/sync-route-metadata.mjs:77-117`). `pages.json` verified
   byte-identical to `routes.manifest.json`.
2. **Provenance policy engine** — family-scoped regex tables with explicit allow-listing
   (`check-public-surface.mjs:48-246`) encode a real editorial policy in code; it passed cleanly
   on all 80 route dirs today.
3. **Behavioral smoke coverage** — per-route scenarios assert interactions and layout, with
   viewport checks and console/network failure capture; far beyond typical static-site testing.
4. **Docs/route parity discipline** — 80/80 docs dirs, zero remaining scaffold stubs (verified by
   grep for the scaffolder's stub strings).
5. **Graceful degradation + a11y layer** in shared UI (`site.js:705-725`, `site.js:804-852`).
6. **Relative-path/subpath-hosting discipline** throughout, including the smoke server mounting at
   `/interactive-explanation/` to match production shape.

---

## 4. Improvement Strategy

### Theme 1 — Make verification reproducible and enforced

- **Current problem:** Playwright undeclared (D1); no CI (D2); the quality gates are opt-in.
- **Target state:** `package.json` pins Playwright; one GitHub Actions workflow runs
  `sync-route-metadata` (drift check), `check-public-surface`, `node --check` on core JS, and the
  smoke suite (full or a representative `--group` subset) on every push/PR.
- **Principle:** A check that doesn't run automatically is documentation, not a check.
- **Trade-offs / not now:** No lint/format toolchain, no TypeScript, no bundler — the repo's
  build-less nature is a feature. Full 80-route smoke in CI may be slow; start with a curated
  subset plus weekly full run if needed.
- **Definition of done:** clean clone + `npm ci` + `npm test` runs all gates locally; CI fails on
  policy violation, manifest drift, syntax error, or smoke failure; Playwright version pinned in a
  lockfile.

### Theme 2 — Close the provenance blind spot and delete dead surface

- **Current problem:** S1/S2 — a dead root file with live GA escapes the scanner that exists
  precisely to ban it.
- **Target state:** `mlu-home.html` removed (or moved under an archive dir excluded from
  hosting); `check-public-surface.mjs` scans **all** root-level `.html`/`.js`/`.md` files instead
  of a hardcoded trio.
- **Principle:** Policy tools must cover the whole deployable surface, not an enumerated subset.
- **Trade-offs / not now:** Don't build a generic crawler; a one-line change from a hardcoded list
  to `readdirSync` filtering is enough.
- **Definition of done:** policy audit fails if an analytics tag is placed in any root file
  (verified by temporary fixture test); `mlu-home.html` gone; audit passes.

### Theme 3 — Single source of truth for git history and route-family knowledge

- **Current problem:** D3 (dual git histories), D4 (untracked AGENTS.md), A1 (family logic ×3),
  O1 (conflicting command docs).
- **Target state:** One canonical git history (either make the parent stop tracking the subtree,
  or delete the nested `.git` after reconciling — **needs owner decision**, see Open Questions).
  Family host→key mapping extracted to one shared data module consumed by `site.js` and
  `smoke-bundle.mjs` (policy tables stay separate — they encode different, policy-specific
  knowledge). Root AGENTS.md corrected to match the inner one.
- **Principle:** Knowledge duplicated in N places is wrong in at least N−1 of them eventually.
- **Trade-offs / not now:** Don't merge the policy regex tables into the shared mapping; their
  family granularity legitimately differs (e.g. `abletonSynths` vs `ableton`).
- **Definition of done:** one `.git` governs the tree; `git status` clean; one module defines
  host→family; both consumers import it; smoke + policy still pass.

### Theme 4 — Decompose the smoke monolith

- **Current problem:** Q1/Q2 — 7,028 lines, ~119 functions, global `console.log` override.
- **Target state:** `tools/smoke/` package: `server.mjs`, `cli.mjs`, `helpers.mjs` (assert*,
  shell checks), and `scenarios/<family>.mjs` modules exporting scenario lists; `smoke-bundle.mjs`
  becomes a thin orchestrator. Verbosity via an explicit logger, not console patching.
- **Principle:** Test code is production code for the maintainer; structure it like you'd review it.
- **Trade-offs / not now:** Pure mechanical extraction — do not rewrite scenario logic or "improve"
  assertions while moving them, or you can't attribute failures. Do this only after Theme 1 lands
  (CI catches extraction mistakes).
- **Definition of done:** no file in `tools/smoke/` exceeds ~800 lines; full suite output (pass
  counts, route list) identical before/after extraction; `--route`/`--group` flags unchanged.

---

## 5. Task Plan

### Milestone 0 — Safety Net

| ID | Title | Description | Files/areas | Acceptance criteria | Effort | Risk | Deps |
|---|---|---|---|---|---|---|---|
| M0.1 | Decide & reconcile git identity | Owner picks canonical history (parent vs nested). Snapshot both (`git bundle`) before changing anything. Then either add `interactive-explanation/` to parent `.gitignore`-equivalent strategy or remove nested `.git` after merging unique commits | both `.git` trees | Exactly one repo tracks the tree; both prior histories preserved in bundles; documented in AGENTS.md | M | **High** | Owner decision (Open Q1) |
| M0.2 | Commit `AGENTS.md` | Track the agent contract in the canonical repo | `AGENTS.md` | `git status` clean | S | Low | M0.1 |
| M0.3 | Add `package.json` + lockfile | Declare `playwright` (devDependency, pinned), add scripts: `audit`, `smoke`, `sync`, `check` (node --check loop), `test` (all of the above) | new `package.json`, `package-lock.json` | Clean clone + `npm ci && npm test` passes; AGENTS.md command list updated | S | Low | M0.1 |
| M0.4 | Add CI workflow | GitHub Actions: install, cache Playwright browsers, run manifest-drift check, policy audit, syntax checks, smoke `--group` subset (e.g. ncase+mlu+custom); optional scheduled full smoke | `.github/workflows/ci.yml` | CI red on injected policy violation or smoke failure (verified once with a deliberate break on a branch) | M | Low | M0.3 |

### Milestone 1 — Critical Fixes

| ID | Title | Description | Files/areas | Acceptance criteria | Effort | Risk | Deps |
|---|---|---|---|---|---|---|---|
| M1.1 | Remove `mlu-home.html` | Delete the dead file (it has zero inbound references and broken asset links). If owner wants it kept as reference, move to a non-deployed archive dir | `mlu-home.html` | File gone from deployable root; policy audit passes; full smoke passes | S | Low | Open Q2 (default: delete) |
| M1.2 | Scan all root files in policy audit | Replace the hardcoded `rootPublicFiles` trio with `readdirSync(rootDir)` filtered to `.html/.js/.md` + the two JSON manifests | `tools/check-public-surface.mjs:5,300-302` | A fixture root file containing `googletagmanager.com` makes the audit exit 1; audit passes on the real tree | S | Low | none |
| M1.3 | Fix root `interactive-note/AGENTS.md` commands | Align command examples (root arg `.`, flag syntax) with the inner AGENTS.md, or delete the duplicated command section and point at the inner file | `../AGENTS.md` | Both docs give commands that work verbatim from their stated cwd | S | Low | none |

### Milestone 2 — High-Leverage Improvements

| ID | Title | Description | Files/areas | Acceptance criteria | Effort | Risk | Deps |
|---|---|---|---|---|---|---|---|
| M2.1 | Extract shared family mapping | Create `shared/route-families.js` (plain data + classify function, dual-consumable from browser and Node); `site.js` and `smoke-bundle.mjs` import/consume it | `shared/site.js:183-222`, `tools/smoke-bundle.mjs:131-173`, new module | Identical classification for all 80 routes before/after (assert via one-off script); smoke grouping unchanged | M | Medium | M0.4 |
| M2.2 | Decompose smoke suite | Mechanical split into `tools/smoke/{server,cli,helpers}.mjs` + `scenarios/*.mjs`; remove `console.log` patch in favor of a logger param | `tools/smoke-bundle.mjs` → `tools/smoke/` | Same pass/fail output and route counts as pre-split run (diff the verbose logs); no file >800 lines; flags unchanged | L | Medium | M0.4 |
| M2.3 | Unit tests for pure logic | `node:test` (zero new deps) covering manifest validation rules, `classifyFamily`, and 3–5 policy regex positive/negative fixtures | new `tools/tests/`, hooks into `npm test` | Tests run in CI; deliberately broken regex caught by a failing test | M | Low | M0.3 |

### Milestone 3 — Quality & Polish

| ID | Title | Description | Files/areas | Acceptance criteria | Effort | Risk | Deps |
|---|---|---|---|---|---|---|---|
| M3.1 | Escape parity-JSON rendering | Build docs parity cards with `createElement`/`textContent` instead of `innerHTML` concatenation | `shared/site.js:749-791` | Docs pages render identically; `<script>` in a fixture parity note renders inert | S | Low | none |
| M3.2 | Relocate `ev/` under `shared/` | Move to `shared/ev/` and update the 9 setosa routes' relative references; or document the exception prominently if churn is unwanted | `ev/`, setosa route HTML | Route-dir set equals manifest slug set exactly; setosa smoke group passes | M | Medium | M0.4, Open Q3 |
| M3.3 | Default tool root to script location | Derive default root from `import.meta.url` (`path.resolve(scriptDir, "..")`) instead of `process.cwd()` so the `.` argument becomes optional | all three `tools/*.mjs` root resolution lines | Tools work with no args from any cwd; explicit arg still wins | S | Low | none |

### Quick Wins (high impact, S effort)

- **M1.1** — delete `mlu-home.html` (kills the GA tracker).
- **M1.2** — root-file policy coverage (one small edit, closes the structural gap).
- **M0.2** — commit `AGENTS.md`.
- **M1.3** — fix root AGENTS.md commands.
- **M3.3** — sane tool default root.

### Top 3 Implementation Sketches

**M1.2 — Scan all root files in policy audit**

- Approach: replace the static `rootPublicFiles` array (`check-public-surface.mjs:5`) with a
  directory read.
- Steps: (1) `const rootPublicFiles = fs.readdirSync(rootDir, {withFileTypes:true}).filter(e => e.isFile()).map(e => e.name).filter(n => [".html",".js",".md"].includes(path.extname(n)) || ["pages.json","routes.manifest.json"].includes(n));`
  (2) keep the existing `scanFile` loop (`check-public-surface.mjs:300-302`) unchanged — it
  already handles extension filtering defensively. (3) Run `node tools/check-public-surface.mjs .`
  — it should now **fail on `mlu-home.html`**, which is the desired proof; land M1.1 in the same
  change so the audit ends green.
- Gotchas: `favicon.png` and other binaries are filtered by extension already; don't scan
  `ENGINEERING_SANDBOX.md`'s appendix into a false positive — this audit file mentions
  `googletagmanager.com` (this very report!), so either keep `.md` out of the root scan set or
  add this file to the ignore list. Recommended: scan root `.html`/`.js` + the two JSONs only.

**M0.3 + M0.4 — package.json and CI**

- Approach: minimal manifest, no toolchain creep.
- Steps: (1) `npm init -y`; set `"private": true`, `"type": "module"`; `npm i -D playwright@<pinned>`.
  (2) Scripts: `"sync": "node tools/sync-route-metadata.mjs ."`,
  `"audit": "node tools/check-public-surface.mjs ."`,
  `"smoke": "node tools/smoke-bundle.mjs ."`,
  `"check": "node --check shared/site.js && node --check shared/engineering-sandbox.js && node --check shared/public-footer.js && node --check tools/check-public-surface.mjs && node --check tools/sync-route-metadata.mjs && node --check tools/smoke-bundle.mjs"`,
  `"test": "npm run sync && git diff --exit-code pages.json && npm run audit && npm run check"`.
  (3) Workflow: `actions/setup-node`, `npm ci`, `npx playwright install --with-deps chromium`,
  `npm test`, then `node tools/smoke-bundle.mjs . --group ncase --group custom` (tune subset to
  ≤10 min). (4) Verify gate: push a branch with a deliberate policy violation; confirm red.
- Gotchas: `git diff --exit-code pages.json` is the manifest-drift gate — it requires M0.1 done
  (one canonical repo). Playwright browser download is the slow step; cache
  `~/.cache/ms-playwright`. Windows dev box vs Linux CI: the tools use `path.sep`-aware regexes
  (`check-public-surface.mjs:23-46`) — already portable, but verify the teoria/ableton path
  patterns match on `/` separators in CI before trusting a green run.

**M2.2 — Decompose smoke suite**

- Approach: mechanical extraction, zero behavior change, verified by output diff.
- Steps: (1) Capture baseline: `SMOKE_VERBOSE=1 node tools/smoke-bundle.mjs . > baseline.log`.
  (2) Extract `tools/smoke/server.mjs` (`serveFile`, `startServer`, `contentTypes` —
  `smoke-bundle.mjs:62-265`), `tools/smoke/cli.mjs` (arg parsing, root/group/route selection —
  lines 6-56, 123-217), `tools/smoke/helpers.mjs` (`assert`, `assertRoute`,
  `assertEngineeringSandboxShell`, viewport/footer checks). (3) Group the ~100 scenario functions
  by family into `tools/smoke/scenarios/<family>.mjs`, each exporting
  `[{slug, run(page, helpers)}]`. (4) Orchestrator iterates scenario modules under the existing
  group/route filters. (5) Replace the `console.log` override (lines 50-56) with a `log(verbose)`
  helper passed down. (6) Re-run; diff against `baseline.log` — only ordering-free differences
  acceptable.
- Gotchas: scenario functions share closures over `baseUrl`/`exists()` — pass these explicitly via
  a context object rather than re-importing module state. Some scenarios depend on execution order
  side effects only accidentally (same `page` reused) — keep one-page-per-scenario semantics
  identical to the original loop. Do **not** rename scenario log strings; the diff verification
  depends on them.

---

## 6. Open Questions (need owner input)

1. **Git identity (blocks M0.1):** Which history is canonical — the parent `interactive-note`
   repo or the nested `interactive-explanation` repo? The nested one has more files (6,058 vs
   3,514) and the newer commit; the parent presumably drives deployment of the whole site.
2. **`mlu-home.html` intent:** Is it a forgotten import from the MLU vendor snapshot (it appears
   to be), or a planned hub route? Default plan: delete (M1.1).
3. **`ev/` placement:** Acceptable to move 46.9 MB of shared Setosa runtime under `shared/ev/`
   (touching 9 route HTML files), or prefer documenting the exception?
4. **Deployment target:** Where does this actually host (GitHub Pages? Cloudflare? subpath of the
   personal site)? CI smoke mount path and base-URL assumptions should match it.
5. **Performance bar:** Is there any route-load-time or asset-size budget, or is "replica fidelity
   first" the standing rule? (Audit assumed the latter.)
6. **Smoke-in-CI budget:** Full 80-route suite vs curated subset — what wall-clock time is
   acceptable per push?

---

## 7. Handoff Prompt for an Implementation AI

Copy-paste the prompt below to an AI coding agent to ship the improvements. It is scoped to the
already-decided, low-controversy work (Milestones 0, 1, and quick wins) and explicitly defers the
items that need owner decisions.

```text
You are working in the static site repo at
C:\Users\Admin\Desktop\PersonalWebsite\interactive-note\interactive-explanation (Windows, pwsh).

Read these first, in order:
1. AGENTS.md (in this directory) — operating contract, commands, route metadata rules.
2. ENGINEERING_SANDBOX.md — section "5. Task Plan" of the audit. You are implementing
   M0.2, M0.3, M0.4, M1.1, M1.2, M1.3, M3.3 ONLY. Do NOT start M0.1 (git reconciliation),
   M2.x, M3.1, or M3.2 — they are blocked on owner decisions or on CI existing first.

Hard constraints:
- This is a build-less static site. Do NOT add bundlers, TypeScript, linters, frameworks,
  or any dependency other than a pinned playwright devDependency.
- Do not modify vendored route runtimes under <slug>/ directories or ev/.
- All tools take the repo root as an explicit "." argument today; preserve that behavior
  even after making the default smarter (M3.3).
- After ANY change, run: node tools/sync-route-metadata.mjs .  then
  node tools/check-public-surface.mjs .  Both must pass before you proceed.
- After tooling changes, run node --check on every file you touched.

Tasks, in this exact order:

1. (M1.1) Delete mlu-home.html from the repo root. Verify first that nothing references it:
   search the whole tree for "mlu-home" — expect zero matches outside the file itself.
   It contains a live Google Analytics tag (lines 23-35) and broken asset links; it is dead code.

2. (M1.2) In tools/check-public-surface.mjs, replace the hardcoded rootPublicFiles array
   (line 5: ["index.html","pages.json","routes.manifest.json"]) with a dynamic listing of
   root-level files: all *.html and *.js files in the root directory plus pages.json and
   routes.manifest.json. Do NOT include *.md root files in the scan (the audit report
   ENGINEERING_SANDBOX.md legitimately mentions banned strings as evidence and must not
   self-flag). Keep the scanFile() loop at lines 300-302 structurally unchanged.
   Verification: temporarily create a root file ga-test.html containing
   "googletagmanager.com" and confirm the audit exits non-zero and names that file;
   then delete the fixture and confirm the audit passes.

3. (M3.3) In all three tools/*.mjs files, change the default root from
   path.join(process.cwd(), "interactive-explanation") to the parent directory of the
   tools/ folder derived from import.meta.url (path.resolve(path.dirname(
   fileURLToPath(import.meta.url)), "..")). An explicit positional root argument must
   still override the default. Verify each tool now works when invoked with no root
   argument from BOTH the repo root and from inside tools/.

4. (M0.3) Create package.json in the repo root: { "private": true, "type": "module" },
   devDependency on playwright pinned to the exact version currently installed globally
   (check with: node -e "console.log(require('playwright/package.json').version)").
   Add scripts:
     "sync":  "node tools/sync-route-metadata.mjs .",
     "audit": "node tools/check-public-surface.mjs .",
     "smoke": "node tools/smoke-bundle.mjs .",
     "check": node --check over: shared/site.js, shared/engineering-sandbox.js,
              shared/public-footer.js, and the three tools/*.mjs files,
     "test":  "npm run sync && npm run audit && npm run check"
   Run npm install to produce package-lock.json. Then run npm test — must pass.

5. (M0.4) Create .github/workflows/ci.yml in THIS directory's repo root: on push and
   pull_request; ubuntu-latest; actions/checkout; actions/setup-node (node 22, npm cache);
   npm ci; npx playwright install --with-deps chromium (cache ~/.cache/ms-playwright keyed
   on the playwright version); npm test; then a manifest-drift gate:
   git diff --exit-code pages.json; then a smoke subset:
   node tools/smoke-bundle.mjs . --group ncase --group custom
   Note: the policy tool's path regexes use path.sep (tools/check-public-surface.mjs:23-46);
   they are written portably but you must confirm the audit passes on Linux-style paths —
   if you cannot run Linux locally, state this as a residual risk in your summary.

6. (M0.2) git add AGENTS.md plus all files created/changed above in the repo whose .git
   lives in THIS directory (interactive-explanation/.git). Do not touch the parent
   repository at interactive-note/. Do NOT push. Single commit, message:
   "chore: reproducible verification (package manifest, CI, policy root-scan, remove dead mlu-home)"

7. (M1.3) Edit ../AGENTS.md (interactive-note/AGENTS.md): its command examples omit the
   required "." root argument and use a different flag style than the inner
   interactive-explanation/AGENTS.md. Fix the commands to work verbatim, or replace the
   command section with a pointer to interactive-explanation/AGENTS.md. This file belongs
   to the PARENT repo — leave it uncommitted and mention it in your summary.

Final verification checklist (all must pass; report each):
- npm test passes from a state equivalent to a clean clone (delete node_modules, npm ci, npm test).
- node tools/check-public-surface.mjs . passes and root .html/.js files are demonstrably in scope.
- node tools/smoke-bundle.mjs . --group ncase passes locally.
- git status in interactive-explanation is clean except intentionally uncommitted parent-repo files.
- mlu-home.html no longer exists.

Report at the end: files changed, commands run with outcomes, residual risks, and which
audit tasks remain open (M0.1, M2.1, M2.2, M2.3, M3.1, M3.2) with their blocking questions.
```

---

## Appendix: Engineering Sandbox Design Brief

This brief scopes the editorial design language for `interactive-explanation/` play-first technical essays and compact interactive labs.

### Intent

The Engineering Sandbox layer is for replicas that already teach through interaction and only need stronger framing, pacing, and navigation. It should make the first viewport feel like an invitation to experiment, not a textbook cover page or a product dashboard.

### Core Direction

- Warm paper background with layered gradients, not flat white dashboards.
- Dark ink typography with steel and blue engineering accents.
- `Be Vietnam Pro` for editorial copy and headings.
- `IBM Plex Mono` for labels, controls, metadata, and chapter navigation.
- Strong hierarchy, generous spacing, and short lead-ins before dense technical sections.
- Calm motion only: chapter highlighting, gentle hover shifts, and no decorative animation loops.

### Reusable Patterns

- Hero block:
  - one sentence for the system to explore
  - one paragraph for what the reader will build or observe
  - one short “how to use this page” prompt
  - one direct play-first action
- Lab briefing:
  - one compact framing sentence
  - one “try this first” action row
  - one short manipulation checklist
  - stronger panel separation around controls, state, and results
- Practice shell:
  - one compact onboarding hero
  - one quick-start checklist
  - one keyboard or gesture hint strip
  - one primary-control focus marker around the first real exercise surface
  - calm framing that helps drills feel approachable without adding chapter structure
- Chapter jump rail:
  - generated from chapter-marked sections
  - fixed on desktop
  - compact bottom bar on mobile
- Inline callouts:
  - `play` for “try this first”
  - `engineering` for implementation or model-behavior notes
  - `story` for framing and transitions
- Sticky-figure coexistence:
  - never obscure the primary chart
  - avoid wrapping the vendored runtime in new positioning systems unless necessary

### Route Contract

Routes opting into this shell should expose:

- `data-story-shell="engineering-sandbox"` on `<body>`
- `data-story-family="mlu-pilot"` or another family marker on `<body>`
- `data-story-variant="essay|lab"` on `<body>`
- `data-story-variant="essay|lab|practice"` on `<body>`
- `data-story-nav="generated|native|none"` on `<body>`
- `data-story-route="<slug>"` on `<body>` for runtime-rendered or portability-sensitive routes
- `data-story-chapter` on major sections
- `data-story-callout` on inserted callouts where needed

Navigation modes:

- `generated`:
  - uses the shared chapter rail on desktop when the viewport is wide enough for a reserved gutter
  - collapses to the shared compact mobile bar below the desktop breakpoint
- `native`:
  - keeps the route's existing route-level navigation as the official navigation system
  - opts into shared styling and active-state enhancement when anchor-based sections exist
- `none`:
  - does not inject the chapter rail or the mobile jump bar
  - is intended for tool-first routes where the main interaction should stay visually dominant

Route identity:

- Prefer `data-story-route` whenever a route needs runtime chapter configs.
- Pathname parsing is only a fallback for pages still served under `/interactive-explanation/<slug>/`.
- New runtime-rendered routes should set the explicit body contract so chapter configs remain portable across hosting setups.

Variant guidance:

- `essay`:
  - use for prose-first explainers with visible section progression
  - pairs naturally with `generated` or `native` navigation
- `lab`:
  - use for tool-first routes with compact workflows and dense controls
  - does not use the chapter rail or mobile chapter bar
  - should rely on a compact hero, action row, and short manipulation checklist instead of long section framing
- `practice`:
  - use for controls-first drills, lessons, and creation sandboxes where the first exercise surface matters more than chapter progression
  - defaults to `data-story-nav="none"` unless the route already has a useful native lesson nav
  - should rely on a compact onboarding hero, quick-start checklist, keyboard or gesture hints, and a clear primary-control focus frame
  - should not inherit the essay rail or the denser lab checklist styling unchanged

### Guardrails

- Do not rewrite the underlying interactive runtime unless the shell patch reveals a real bug.
- Keep all fonts and visual assets local.
- Preserve provenance policy: the shared footer remains the only public original-page reference surface.
- Prefer additive enhancement over DOM surgery for compiled or vendored routes.
- Do not force the essay rail onto demo-lab families just because they also contain explanatory copy.
