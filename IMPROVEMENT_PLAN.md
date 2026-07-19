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

Status: Complete

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

Status: Complete

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

Status: Complete

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

Status: Complete

- Remove tracked Playwright output screenshots.
- Remove COVID-19 GIMP authoring sources and update their README.
- Remove source maps and all valid or stale `sourceMappingURL` comments.
- Ignore and audit against future output, XCF, and source-map artifacts.

Acceptance:

- Remove at least 70 MiB of non-runtime files.
- No shipped stylesheet or script requests a missing source map.
- Audit rejects future deploy-only artifacts.

### 6. Safe runtime deduplication

Status: Complete

- Share the seven identical Tone.js copies.
- Share identical Learning Synths React, ReactDOM, and application scripts while retaining route-local lesson content.
- Share identical mechanical-watch styles, scripts, helper images, and geometry across both watch routes.
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
- 2026-07-16: Phase 2 verified with metadata sync, manifest validation, audit, full test suite, focused Music Hub smoke with atlas coverage, and diff hygiene.
- 2026-07-16: Phase 4 verified with syntax checks, full test suite, focused Ballot, Polygons, and Formula 1 smoke, responsive Polygons overflow coverage, and diff hygiene.
- 2026-07-16: Phase 5 removed 70.76 MiB across 34 tracked deploy artifacts, stripped 56 source-map directives, added ignore and audit guardrails, and passed the 226-test suite plus focused browser smoke.
- 2026-07-16: Phase 6 consolidated seven Tone.js copies, six Learning Synths runtime sets, and the common runtime for both watch routes, reducing tracked runtime payload by 16,213,739 bytes (15.46 MiB), adding an audit guard against restored route-local copies, and passing the 227-test suite, focused smoke across all 15 consumers, and the full 82-route smoke suite.

## Approved Phase 7–11 roadmap

### 7. Universal route baseline

Status: Complete

- Isolate desktop and mobile generic smoke coverage for every selected manifest route.
- Enforce local, off-origin-clean baseline requests and complete iframe title policy coverage.
- Validate manifest, docs, and parity contracts from their authoritative sources.

Acceptance:

- Every selected route passes isolated desktop and 390 × 844 mobile baseline checks.
- Every iframe under a manifest route has a title unique within its document.
- Route, docs, and parity inventory contracts pass without hard-coded counts.

### 8. Discovery and wayfinding

Status: Complete

- Add topic filtering, guided-path promotion, and useful card labels to the atlas.
- Restore filter state through the native History API and keep Atlas and Docs exits deterministic.
- Preserve the current static-site architecture and relative GitHub Pages paths.

Acceptance:

- Atlas filters are keyboard-usable, URL-restorable, and responsive.
- Guided paths are easier to identify without hiding the complete route inventory.
- Representative route and docs exits resolve under `/interactive-explanation/`.

### 9. Learning paths and progress

- Add optional advisory difficulty, duration, order, and prerequisite metadata to the manifest contract.
- Persist progress only through explicit Start, Resume, or numbered-path actions and expire it after 30 days.
- Add native sharing with a clipboard fallback while keeping Music and Blockchain guidance advisory.

Acceptance:

- Manifest sync validates optional learning metadata and generates matching `pages.json` output.
- Resume state restores only valid, unexpired, explicit progress.
- Music and Blockchain paths expose clear next steps; `primary-interactive-hub` remains promotional.

### 10. Accessibility and semantics

- Add meaningful main landmarks where static route structure permits and preserve intentional runtime-populated mains.
- Improve iframe, canvas, keyboard, focus, and narrow-screen semantics without rewriting vendored runtimes.
- Extend automated coverage for the accessibility contracts applied.

Acceptance:

- Every route has a usable main-content path or a documented runtime-populated equivalent.
- Interactive surfaces expose deterministic names and keyboard or adjacent native controls.
- Desktop and mobile smoke coverage passes without layout regressions.

### 11. Resilience and release readiness

- Add consistent canonical, robots, social text metadata, and early theme initialization to docs surfaces.
- Consolidate verified duplicate assets only after browser playback proves shared paths preserve behavior.
- Re-run complete audit and smoke coverage, resolve release blockers, and prepare one deployment handoff.

Acceptance:

- Docs metadata and theme behavior are consistent under GitHub Pages subpath hosting.
- Any asset consolidation is guarded by audit coverage and representative browser checks.
- Tests, audit, syntax checks, full smoke, CI, Pages deployment, and production probes pass.

## Phase 7–11 delivery decisions

- Make one verified commit per phase, continue automatically between phases, then push and deploy once after Phase 11.
- Use explicit resume writes with a 30-day expiry.
- Treat Music and Blockchain metadata as proposed advisory metadata until separately approved.

## Phase 7 progress

- 2026-07-19: Phase 7 implementation started; generic route isolation, iframe policy coverage, and route contract validation in progress.
- 2026-07-19: Phase 7 passed the 312-test suite, audit, syntax checks, diff hygiene, focused route smoke, and the full 82-route desktop/mobile and interaction suite at port 49173. Universal coverage also corrected responsive overflow in `neurons` and `wbwwb`, a subpath loader URL in Song Maker, and local blob request classification.
- 2026-07-19: Phase 8 added exact topic filtering, three promoted guided paths without removing inventory entries, clearer route labels, Back/Forward-restorable atlas state, and deterministic Atlas/Docs exits. The 312-test suite, focused discovery checks, OLS coordinate regression check, and full 82-route smoke suite passed.
