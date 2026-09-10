# AGENTS.md

## Repo Shape
- This is a self-contained static site. Root `package.json` declares verification commands and locks Playwright; `.github/workflows/ci.yml` defines CI. There is no build or TypeScript step.
- Each shipped route lives at `<slug>/index.html` with route-local assets; matching provenance/parity docs live at `docs/<slug>/`.
- `index.html` is the atlas page and reads `pages.json`; edit route inventory in `routes.manifest.json` and sync `pages.json` instead of hand-editing both.
- `shared/` owns cross-route shell assets: `site.*`, `public-footer.*`, `engineering-sandbox.*`, fonts, and a few archived runtimes.

## Commands
- Run npm commands from this repo root. Pass `.` explicitly to smoke/audit tools.
- Sync route metadata: `node tools/sync-route-metadata.mjs .`
- Scaffold docs/parity for one manifest entry: `node tools/sync-route-metadata.mjs . --scaffold <slug>`
- Scaffold missing docs/parity for all manifest entries: `node tools/sync-route-metadata.mjs . --scaffold-all`
- Public-surface audit: `node tools/check-public-surface.mjs .`
- Full Playwright smoke suite: `node tools/smoke-bundle.mjs .`
- Focus smoke by route or inferred group: `node tools/smoke-bundle.mjs . --route <slug>` or `node tools/smoke-bundle.mjs . --group <group>`
- Strict complete-experience gates for migrated Routes: add `--experience` to a focused route/group command.
- Record approved performance and geometry evidence only with an explicit filter: add `--record-baseline --route <slug>` or `--record-baseline --group <group>`; use `--baseline <path>` for a non-default baseline file.
- Smoke port and verbosity: `SMOKE_PORT=4173` and `SMOKE_VERBOSE=1` or `--verbose`.

## Route Metadata Contract
- `routes.manifest.json` entries must have unique `slug`, non-empty `title` and `summary`, one required `intent` from `explainer|simulation|practice|create|guided-path`, and `docsUrl` exactly `./docs/<slug>/`.
- Normal routes need an absolute `referenceUrl`; original/local curated routes use `referenceMode: "neutral"` and must omit `referenceUrl`.
- After changing `routes.manifest.json`, run `node tools/sync-route-metadata.mjs .` so `pages.json` matches.
- New shipped routes should include both `docs/<slug>/index.html` and `docs/<slug>/parity.json`; the scaffolder creates stubs that must be replaced before treating a route as verified.

## Public Surface And Provenance
- Keep public route bodies focused on local replicas; the public footer is the intended original-page/provenance surface.
- `shared/public-footer.js` mounts `#reference-footer` from body data attributes and hides it unless `data-show-reference-footer="true"`; smoke checks still expect the element.
- The public-surface audit intentionally flags upstream branding, creator links, analytics/widgets, translation-guide leftovers, and remote media surfaces outside allowed exceptions.
- For public route links, prefer local route/docs links; keep external originals in manifest/docs/footer metadata unless a docs page explicitly uses an allowed original link.

## Engineering Sandbox Shell
- `ENGINEERING_SANDBOX.md` is the source for the shared editorial shell contract; use it before changing `shared/engineering-sandbox.*` or routes that opt in.
- Opt-in routes expose body data such as `data-story-shell="engineering-sandbox"`, `data-story-family`, `data-story-variant="essay|lab|practice"`, `data-story-nav="generated|native|none"`, and `data-story-route`.
- Generated navigation depends on `data-story-chapter` sections or route configs in `shared/engineering-sandbox.js`; do not force generated rails onto tool-first lab/practice routes.
- For vendored or compiled routes, prefer additive shell/footer enhancements over rewriting the runtime.

## Verification
- After manifest/docs/provenance changes, run `node tools/sync-route-metadata.mjs .` and `node tools/check-public-surface.mjs .`.
- After route runtime, shell, layout, or link changes, run `node tools/smoke-bundle.mjs . --route <slug>` at minimum; run the full smoke suite for shared assets.
- `tools/smoke-bundle.mjs` serves the repo at `/interactive-explanation/` and checks desktop/mobile overflow, footer presence, route-specific selectors, and runtime console/network failures.
- Install locked dependencies with `npm ci`; CI installs the matching Chromium headless shell. Run `npm test` for sync, audit, syntax and unit checks.

## CI Qualification
- PR checks `verify`, `full-smoke`, and `paired-performance` are independent outcomes. Configure all three as required branch-protection checks before treating CI as a merge gate; workflow code alone cannot configure repository rules.
- `npm run qualify -- --base-control <clean-base-control-checkout> --base <clean-base-checkout> --head <clean-head-checkout> --base-sha <40-character-SHA> --head-sha <40-character-SHA> --output <outside-sources.jsonl>` measures separate immutable base-control, base, and head checkouts on one host, with one browser and sequential fresh contexts. Source files are verified against Git blobs before capture and hashed again after capture. The head harness/server/fixtures are used for all sources.
- Every one of 504 cells (83 routes plus Atlas, three viewports, both themes) receives one unscored warm-up and three retained samples per source group. Immutable-SHA-seeded cyclic rounds place base-control, base, and head at each ordinal exactly once. One same-origin server lasts for the whole cell and closes connections before switching roots. Expect roughly 90–150 minutes on a healthy GitHub runner; 180 minutes is the job ceiling, not a completion guarantee. There is no browser concurrency, retry, outlier deletion or accepted noisy baseline.
- Admissibility method: each timing group's raw max-minus-min and the A/A median drift must be at most half of the existing timing allowance, `max(20%, 250ms) / 2`. Resource counts and transfer bytes must be identical within each group and across A/A controls. This is an additional rejection criterion, not a budget relaxation or proof that host noise is absent. Failed readiness, missing samples, unsupported transfer and unstable controls are inconclusive and fail the job.
- Only admissible medians reach the existing budgets: timing `max(20%, 250ms)`, bytes `max(20%, 250KiB)`, resource-count increase zero. Raw samples, events, medians, ranges, exact source hashes, browser and host identity are retained with `always()` artifacts, including partial failure evidence. `readyMs` is journal-only telemetry measured immediately after named manifest readiness and has no budget or pass effect. Requested URL multisets must be stable within each group and exact across base controls; head additions/removals are retained and require an exact cell-, SHA-, and blob-bound entry in `tools/resource-review.json`. Resource review never overrides transfer or count budgets. Rigid original admission evaluates its independent original-reference/head URLs while retaining legacy URL differences as archived evidence only. A timed-out journal without a qualified completion record is incomplete.
- Geometry is compared across stable same-source controls and same-environment base/head captures without masks. Any changed geometry is blocked for specific review. This does not approve historical baseline provenance. Full functional smoke retains its explicit legacy geometry baseline and may remain blocked until the reviewed `007` reconstruction and same-source CI environment comparison are available; do not refresh the baseline wholesale.
- An original replacement such as rigid-body-collisions cannot inherit a pass from a failed old engine. Missing before evidence remains blocked in paired qualification. Independent original-route functional/geometry acceptance and any comparison waiver require the parent specification's explicit contract; this runner supplies no blanket waiver.
