# Interactive Explanation Improvement Plan

Last updated: 2026-07-16

## Goal

Make the atlas easier to browse, improve keyboard and screen-reader access across high-impact routes, reduce the GitHub Pages payload, and prevent route or metadata regressions.

## Delivery decisions

- Deliver independent, reviewable phases.
- Use five primary atlas intents: Explainers, Simulations, Practice, Create, and Guided paths.
- Keep source-family provenance as an advanced filter.
- Remove non-runtime artifacts from the repository because GitHub Pages publishes `main` directly.
- Run the full Playwright suite weekly and on manual dispatch; keep focused smoke checks on pushes and pull requests.
- Add no runtime dependency, UI framework, accessibility framework, or test DSL.

## Phases

### 1. Test and metadata guardrails

Status: Complete

- Generate baseline route and docs smoke coverage from `routes.manifest.json`.
- Reject unknown route filters and filters that select no routes.
- Add a deterministic Formula 1 interaction scenario.
- Require production canonical and `og:url` metadata for the atlas and every manifest route.
- Reject loopback canonical and Open Graph URLs throughout the public surface.
- Add focused policy and manifest tests.
- Add weekly/manual full smoke CI and a focused Formula 1 smoke check.

Acceptance:

- Every manifest route automatically receives browser baseline coverage.
- `--route does-not-exist` fails before browser work.
- Formula 1 controls update linked captions without runtime errors.
- All 83 public entry pages use `https://kohnnn.github.io/interactive-explanation/` metadata.

### 2. Atlas redesign and fast wins

Status: Pending

- Add one validated primary intent to every manifest route.
- Replace archive-oriented hero copy with visitor outcomes.
- Consolidate featured routes, source-family board, and route inventory into one discovery surface.
- Keep search, intent, global sort, and an advanced source-family filter.
- Simplify route cards and show Clear filters whenever a filter is active.
- Correct and simplify the Music Hub path, route counts, docs, parity evidence, and smoke assertions.

Acceptance:

- One discovery surface presents all routes.
- Five intent filters work through mouse, keyboard, and URL state.
- Sort labels match rendered order.
- Cards expose one primary route action and quiet docs access without deployment boilerplate.
- The Music Hub consistently reports 21 routes, four clusters, five families, and five starter stops.

### 3. Native accessibility and iframe loading

Status: Pending

- Add unique titles to Ballot, Polygons, and COVID-19 iframes.
- Lazily load below-fold simulation frames.
- Convert Anxiety and COVID controls to native controls.
- Use native dialogs with focus placement, containment, Escape handling, and focus restoration.
- Add labels, text alternatives, focus indicators, selectable text, and reduced-motion behavior.
- Convert the shared mobile chapter sheet to a native dialog.

Acceptance:

- No meaningful interactive iframe is unnamed.
- Every persistent control works with keyboard input and exposes a useful accessible name.
- Modal focus remains contained and returns to its opener.
- Reduced-motion preferences remove decorative transitions without disabling interaction.

### 4. Canvas interaction accessibility

Status: Pending

- Add keyboard-equivalent controls and textual state for Ballot and Polygons drag tasks.
- Replace suitable custom sliders with native range controls.
- Make Formula 1 segmented controls and sliders semantic and keyboard-operable.
- Remove document-wide narrow-screen overflow in Polygons.

Acceptance:

- Required learning interactions have non-pointer paths.
- Selected objects and values are available as text.
- Formula 1 linked state can be changed with the keyboard.
- Polygons does not force whole-page horizontal scrolling at 320 CSS pixels.

### 5. Deploy-weight cleanup

Status: Pending

- Remove tracked Playwright output screenshots.
- Remove COVID-19 GIMP authoring sources and update their README.
- Remove source maps and all valid or stale `sourceMappingURL` comments.
- Ignore and audit against future output, XCF, and source-map artifacts.

Acceptance:

- Remove at least 70 MiB of non-runtime files.
- No shipped stylesheet or script requests a missing source map.
- Audit rejects future deploy-only artifacts.

### 6. Safe runtime deduplication

Status: Pending

- Share the seven identical Tone.js copies.
- Share identical Learning Synths React, ReactDOM, and application scripts while retaining route-local lesson content.
- Share mechanical-watch geometry and update all consumers.
- Defer Learning Synths content-tree consolidation unless browser network verification proves a shared runtime base is safe.

Acceptance:

- All rewritten asset requests resolve under subpath hosting.
- Music lessons and both watch routes initialize without console or network failures.
- Remove at least another 15 MiB without changing route behavior.

## Verification

Each phase receives targeted syntax, unit, audit, and route smoke checks. Shared changes also receive:

```powershell
npm test
node tools/smoke-bundle.mjs .
git diff --check
git diff --exit-code pages.json
```

## Progress log

- 2026-07-16: Audit completed; six-phase plan approved.
- 2026-07-16: Implementation started from clean `main` at `fe27461`.
- 2026-07-16: Phase 1 verified with metadata policy tests, syntax checks, audit, unit suite, and focused Formula 1 smoke; full smoke deferred to scheduled/manual CI.
