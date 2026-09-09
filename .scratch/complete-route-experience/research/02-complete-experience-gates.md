# Complete-Experience Acceptance Gates

## Decision

Use the manifest as the route inventory and make every acceptance gate measurable against all **83 Routes**. A green focused family run is necessary for iteration; a green all-route run is required before accepting or committing a family slice. Any unexpected change to runtime-owned content, dimensions, behavior, local-network boundary, or approved visual baseline rolls back that slice.

This is a test-plan recommendation, not a product-code change.

## Evidence reviewed

| Area | Existing contract | Current coverage | Gap against destination |
| --- | --- | --- | --- |
| Inventory and docs | `sync-route-metadata.mjs` validates unique slug, title, summary, intent, reference mode, docs URL, and learning prerequisites; `route-baseline.test.mjs` requires route and docs/parity files. | All 83 manifest entries; `pages.json` equality. | No shell mode, Suggested Next Route, theme, runtime-dimension, or route interaction contract in manifest. |
| Browser baseline | `assertManifestRouteBaseline` loads every selected manifest Route at 1400×1000 and 390×844. It requires one visible, meaningful `main`, Atlas and Docs exits, footer accessibility state, no more than 32 px horizontal overflow, local initial requests, and no page/request/HTTP runtime error. | All selected routes, both viewports. | It cannot prove fitted navigation, dark/light rendering, curated next-route data, usable controls, visual composition, or equivalent interaction output. |
| Family behavior | `smoke-bundle.mjs` dispatches route-specific scenarios and has shell, canvas drag, touch, media, keyboard, and interaction helpers. | Strong but route-specific and uneven; behavior is not declared as a reusable per-family contract. | No explicit before/after preservation fixture for every runtime surface or dimension. |
| Shell geometry | Engineering Sandbox checks cover opted-in routes: metadata, nav mode, rail/mobile bar geometry, dialog Escape/focus return, scroll progress, and primary-control visibility where scenarios ask for it. | Only routes that currently opt in and call those helpers. | Destination requires every Route to declare a fitted navigation mode and shell boundary. |
| Theme | `theme-init.js` applies `html[saved-theme]` from `localStorage["theme"]` or `prefers-color-scheme`; docs audit requires it before `site.css`; one smoke assertion checks dark mode on `docs/trust/`. | Docs static contract; one browser example. | No all-route light/dark contract, no route-shell theme check, and no guard against recoloring intrinsic canvas/WebGL/image/video output. |
| Accessibility | Static baseline checks `lang`, title, viewport, one `main`; policy audit checks iframe titles; smoke protects a hidden footer from tab order and has selected keyboard assertions. | Foundational requirements and selected controls. | No all-route keyboard/target-size/focus-visible/primary-control contract. |
| Policy and network | Public-surface audit scans deployable source for provenance, analytics, remote media, metadata, source maps, duplicate assets, and iframe titles. Browser monitor rejects initial off-origin requests; Musicmap explicitly permits deferred approved embeds after a user action. | Static repository scan plus initial browser loads. | No per-route approved-network manifest, theme-safe asset check, or resource/performance regression budget. |

Primary implementation references: `tools/sync-route-metadata.mjs:82`, `tools/tests/route-baseline.test.mjs:12`, `tools/smoke-bundle.mjs:367`, `tools/smoke-bundle.mjs:649`, `tools/smoke-bundle.mjs:690`, `tools/smoke-bundle.mjs:746`, `tools/smoke-bundle.mjs:7955`, and `tools/check-public-surface.mjs:257`.

## Canonical contracts to add

Keep the smallest possible source of truth: add route-level experience fields to `routes.manifest.json`, validate them in `sync-route-metadata.mjs`, and consume them from smoke helpers. Do not duplicate the data in route code or a second registry.

```json
{
  "shell": {
    "variant": "essay",
    "navigation": "generated"
  },
  "suggestedNextSlug": "polygons",
  "experience": {
    "primaryControl": "#play",
    "interactionProbe": "play-state",
    "runtimeSurface": "canvas#simulation",
    "themeOwnership": "shell-only",
    "networkMode": "local-only"
  }
}
```

The exact selectors and probe names are family-owned, not inferred from tags. A route with no safe state-changing action uses an explicit `interactionProbe: "read-only"`; it is not silently skipped. `suggestedNextSlug` must be a different manifest slug, must not self-reference, and must resolve to a local route URL. It is editorial data, not a tag-derived recommendation.

`themeOwnership` must be one of:

- `shell-only`: light/dark affects route-owned HTML chrome only; canvas, WebGL, image, video, iframe, and vendored visual output are masked from visual theme comparison and retain their current pixels.
- `runtime-hook`: a documented existing runtime hook changes runtime colors; the probe records that hook and expected state.
- `fixed-runtime`: runtime has no supported theme hook; only surrounding shell changes.

`networkMode` defaults to `local-only`. A deferred third-party embed needs an explicit action selector and host allow-list. It must make no remote request before that action.

## Required gates

### 1. Static inventory, metadata, and editorial gates

Run before every family commit and in repository-wide CI.

| Gate | Pass condition | Rollback condition |
| --- | --- | --- |
| Manifest and atlas parity | 83 unique entries; `pages.json` byte-equivalent to generated manifest output; route directory, docs page, and non-empty parity data exist for each slug. | Any missing, duplicate, stale, or invalid entry. |
| Shell declaration | Every Route has exactly one valid shell variant and navigation mode. `generated` requires chapter contract; `native` requires declared native selector; `none` requires a primary-control or read-only explanation. | Missing, inferred, or incompatible navigation contract. |
| Suggested Next Route | Every ordinary Route and Guided Path has exactly one `suggestedNextSlug`; target exists, differs from source, has a local relative target, and renders once in the designated shell seam. | Zero, multiple, self, unknown, external, or tag-inferred target. |
| Theme declaration | Every Route declares ownership; no intrinsic surface is marked themeable without a documented existing hook. | Unclassified runtime surface or unapproved intrinsic recoloring. |
| Accessibility source baseline | Exactly one meaningful `main`; `lang`, `title`, charset, viewport; unique non-empty iframe titles; no hidden footer focus targets. | Any failure. |
| Public policy | Existing public-surface audit passes with zero findings. | Any provenance, analytics, remote-media, metadata, source-map, duplicate-asset, or iframe-title finding. |

Current static checks already cover most of the first and fifth rows. The new validation should reject invalid data before browser work begins.

### 2. All-route browser baseline

For every Route, run at 1400×1000, 390×844, and 320×844. Set a fresh browser context per route and state so local storage, audio permission, and prior interactions cannot hide a regression.

1. Route and docs URL return an OK document and mount their expected readiness selectors.
2. One visible, meaningful `main` exists; Atlas and Docs exits resolve to the route's own local destinations.
3. `scrollWidth <= innerWidth + 32` at every viewport. At 320 px, require no clipped shell control and no horizontal page-pan dependency.
4. The declared primary control or read-only surface has non-zero geometry, can be scrolled into view, and remains inside the viewport after scroll.
5. Navigation is fitted to its declared mode:
   - `generated`: desktop rail has no overlap with content; mobile bar/tray is visible; dialog opens, Escape closes it, and focus returns; every chapter link resolves locally.
   - `native`: required native links exist, resolve, and stay visible at 390 and 320 px.
   - `none`: generated rail/bar is absent and the primary runtime surface remains visually dominant.
6. Suggested Next Route is visible once, has an accessible name, resolves to the declared local target, and does not create an ordinary-route progress contract.
7. Initial load has zero `pageerror`, failed same-origin request, local HTTP response ≥400, or off-origin request unless the route's declared network policy permits it.

The existing baseline already establishes items 1–3 in two viewports and initial runtime cleanliness at `tools/smoke-bundle.mjs:690`. Add the 320 px case, declared primary control, nav mode, Suggested Next Route, and docs runtime monitor.

### 3. Theme gate

For every Route and docs page, execute both stored states before navigation:

```js
localStorage.setItem("theme", "light");
localStorage.setItem("theme", "dark");
```

At desktop and mobile, require:

- `html[saved-theme]` equals the requested valid state before route readiness.
- The shared shell exposes an intentional light/dark computed-color pair for its page background, foreground, and interactive chrome; light and dark cannot be pixel-identical across all three sampled shell elements.
- Text and controls retain non-zero dimensions, are not clipped, and pass the browser baseline in both states.
- A screenshot comparison masks every `shell-only` or `fixed-runtime` intrinsic surface. Outside masks, approved shell visual output must remain within the baseline tolerance.
- A `runtime-hook` route verifies the documented hook state and its authored visual snapshot; no generic recoloring is injected.

Use fixed browser color scheme plus stored preference tests separately: the first checks the storage contract; the second removes stored preference and checks `matchMedia` fallback. `theme-init.js` defines this behavior at `shared/theme-init.js:7`.

### 4. Interaction and dimension preservation gate

Each family owns a compact probe table: one safe, deterministic action per interaction class rather than a generic click-everything crawler. Existing smoke scenarios are the starting fixtures, not behavior to rewrite.

For every route:

- Capture an approved pre-action state: declared runtime-surface rectangle, CSS width/height, backing canvas width/height where applicable, iframe rectangle, and named/readable state value.
- Execute the declared action with mouse and keyboard when the control supports both. Require a deterministic semantic state change, canvas/image change, selected ARIA state change, or documented read-only result.
- Reload or reset and confirm initial state restoration where the route contract requires it.
- Re-measure the runtime surface. Its viewport dimensions, backing dimensions, and aspect ratio must equal the approved baseline unless the action itself intentionally resizes it and the probe declares that expected range.
- Check the same geometry after shell/theme initialization. A shell patch must not alter an intrinsic runtime's width, height, aspect ratio, transform, or pointer/touch ownership.

Use explicit tolerances only for browser layout rounding: at most 1 CSS px per edge, 1 px backing-store delta only when device scale factor differs, and 0 change to declared runtime aspect ratio. A larger or unclassified difference is a failure, not a warning.

### 5. Accessibility gate

Use semantic and interaction assertions, not a new dependency or a generic score. The test must verify the actual declared primary controls and navigation for each family.

| Requirement | Objective browser contract |
| --- | --- |
| Keyboard | Focus each declared navigation control and primary control. Enter/Space or documented arrow-key action performs the same semantic state transition as pointer input; no keyboard trap; modal Escape returns focus to its trigger. |
| Focus visible | After keyboard focus, the target has a visible indicator: non-transparent outline, box-shadow, or a measurable style/geometry change distinct from unfocused state. |
| Target size | Pointer controls that require precision have at least 24×24 CSS px hit area, or meet the WCAG spacing exception. Do not apply this to dense runtime canvas coordinates; provide an equivalent keyboard or accessible control path instead. |
| Names and states | Interactive controls have a non-empty accessible name; selected/toggle/range controls expose current state through native semantics or ARIA. |
| Runtime canvas/WebGL | Pointer canvases are hidden from the accessibility tree only when equivalent named controls, description, and keyboard path exist. Decorative canvases remain hidden. |
| Footer and iframe | Preserve current hidden-footer tab-order protection and unique non-empty iframe titles. |

This aligns to WCAG 2.2 Keyboard, Focus Visible, and Target Size (Minimum), with the 24×24 CSS-pixel AA minimum: [Keyboard](https://www.w3.org/TR/WCAG22/#keyboard), [Focus Visible](https://www.w3.org/TR/WCAG22/#focus-visible), and [Target Size](https://www.w3.org/TR/WCAG22/#target-size-minimum). Playwright locator assertions and accessibility snapshots support stable DOM/ARIA checks without introducing an accessibility scanner: [assertions](https://playwright.dev/docs/test-assertions) and [accessibility testing](https://playwright.dev/docs/accessibility-testing).

### 6. Visual and geometry approval gate

Automation catches regression; an agent reviews the approved screenshots for each family slice. Capture deterministic desktop and 390 px screenshots in light and dark after readiness, with animation disabled where the runtime supports it.

- Compare shell regions using screenshot baselines; mask intrinsic runtime surfaces according to `themeOwnership`.
- Require zero unapproved shell overlap, clipping, horizontal overflow, or navigation obstruction.
- Allow no more than 0.5% changed pixels within a shell comparison after anti-aliasing tolerance, and no changed text/control bounding rectangle over 1 CSS px. Any larger visual difference requires an intentional baseline update with a recorded reason.
- Screenshot baselines are per family/viewport/theme, never one universal image for animated or canvas-heavy routes.

Playwright supports screenshot snapshot comparisons; do not snapshot an unmasked animation and call the resulting flakes acceptable: [visual comparisons](https://playwright.dev/docs/test-snapshots).

### 7. Network and performance gate

Continue the default local-only runtime rule on initial load. For routes with declared deferred embeds, assert zero remote request before the exact user action and only declared hostnames afterward. Keep the existing Musicmap pattern as the exception model at `tools/smoke-bundle.mjs:6321`.

Performance needs a measured baseline before enforcing a budget. Capture `PerformanceNavigationTiming`, resource count, total decoded transfer size where exposed, and longest local resource for every Route in a controlled Chromium run. Freeze the approved per-route baseline, then fail a family slice when either state causes:

- more than 20% or 250 ms increase in `domContentLoadedEventEnd` or `loadEventEnd`, whichever is larger;
- more than 20% or 250 KiB increase in same-origin transfer size, whichever is larger;
- any new initial off-origin request; or
- a new resource error, HTTP ≥400, or failed same-origin request.

Performance Resource Timing exposes resource timing and transfer metadata; unavailable fields should be reported as unsupported, not treated as zero: [PerformanceResourceTiming](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceResourceTiming). Use the API for comparative regression only, not a cross-machine absolute speed claim.

## Family matrix and rollout gate

The current smoke classification gives these execution families: ableton 13, ncase 13, engineering-longform 15, mlu 10, setosa 9, custom 9, teoria 6, anders 3, samwho 2, and one each for musicmap, horowitz, and sassnowski. The `music` group crosses Ableton, Teoria, Musicmap, Chrome Music Lab, and the music hub. Classification comes from `shared/route-families.js:24`.

For each family slice:

1. Define/update every affected route's shell, Suggested Next Route, interaction, dimension, theme-ownership, and network declarations.
2. Run static manifest, docs, and public-policy gates.
3. Run only that family with all three viewports, both stored themes, geometry, accessibility, and family interaction probes.
4. Review family screenshots and record intentional baseline changes.
5. Run the full 83-route baseline plus the full smoke suite before committing the family slice.

No percentage threshold is safe for an atomic family migration: each selected route must pass every applicable hard gate. A 12/13 green Ableton slice is not a green Ableton slice.

## Repository-wide release threshold and rollback

Accept the completed experience only when all values are exact:

| Release metric | Required result |
| --- | --- |
| Manifest, route, docs, parity, shell, and Suggested Next Route coverage | 83 / 83 |
| Desktop, 390 px, and 320 px browser baselines | 249 / 249 route-viewports green per theme state |
| Stored light and dark checks | 166 / 166 route-theme states green before adding viewport permutations |
| Route interaction/dimension probes | 83 / 83 declared and green, including explicit read-only declarations where applicable |
| Navigation-mode assertions | 83 / 83 green |
| Accessibility primary-control/navigation checks | 83 / 83 green |
| Policy audit, syntax, unit tests, manifest-drift check | zero failures |
| Initial runtime/network violations | zero, except explicit deferred action/host allow-lists |
| Unapproved visual or intrinsic-runtime visual diffs | zero |
| Performance regressions beyond approved per-route budget | zero |

Rollback a family slice immediately when a hard gate fails, an intrinsic surface changes without its documented runtime hook, a focused run is green but the full run regresses an unrelated route, or an approved visual baseline cannot explain the diff. Revert the family commit; do not widen selectors, loosen a shared tolerance, or update a screenshot baseline merely to turn red green.

## Current gaps, ordered by leverage

1. Add manifest validation for shell mode, one curated next route, theme ownership, network exception, primary control, interaction probe, and runtime surface; this turns requirements into an inventory-complete contract.
2. Extend `assertManifestRouteBaseline` with 320 px, nav mode, Suggested Next Route, primary-control, and docs runtime checks.
3. Add one reusable theme helper that runs both stored states and masks declared intrinsic surfaces for visual comparison.
4. Convert existing scenario knowledge into per-family probe declarations while retaining route-specific probes where behavior is unique.
5. Add keyboard/focus/target-size assertions to those declared primary/navigation controls.
6. Record first approved timing/resource baselines, then enforce comparative budgets.

Skipped: a new test framework and a generic accessibility scanner. Add either only if route declarations and Playwright assertions cannot represent a verified runtime contract.
