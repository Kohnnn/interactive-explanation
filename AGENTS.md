# AGENTS.md

## Repo Shape
- This is a self-contained static site of interactive-explanation replicas; there is no root `package.json`, build step, lint config, or CI workflow in this directory.
- Each shipped route lives at `<slug>/index.html` with route-local assets; matching provenance/parity docs live at `docs/<slug>/`.
- `index.html` is the atlas page and reads `pages.json`; edit route inventory in `routes.manifest.json` and sync `pages.json` instead of hand-editing both.
- `shared/` owns cross-route shell assets: `site.*`, `public-footer.*`, `engineering-sandbox.*`, fonts, and a few archived runtimes.

## Commands
- From this repo root, pass `.` to the Node tools; their default path is `process.cwd()/interactive-explanation`, which is wrong inside this repo.
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
- Playwright is imported by the smoke tool but not declared locally; if `node tools/smoke-bundle.mjs .` cannot resolve it, use the environment's existing Playwright install rather than adding a manifest casually.
