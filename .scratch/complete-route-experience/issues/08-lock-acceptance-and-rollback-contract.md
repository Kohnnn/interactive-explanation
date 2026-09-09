# Lock the acceptance and rollback contract

Type: grilling
Status: resolved
Blocked by: 02, 04, 05, 06

## Question

Which objective gates are mandatory before each family commit and before the complete effort closes? Define required interaction parity, geometry tolerance, theme contrast and state checks, accessibility behavior, responsive viewports, network cleanliness, performance ceilings, documentation updates, full-suite results, and rollback triggers.

## Answer

A family slice is atomic: every selected Route must pass every applicable hard gate before commit. The complete effort closes only at exact 83/83 coverage; no percentage threshold or known-red allowance is accepted.

### Before each family commit

1. Validate and synchronize the manifest. Require unique complete shell, navigation, theme-ownership, primary-surface, interaction, network, and Suggested Next Route declarations; generated chapter and native selector contracts must resolve; `pages.json` must match generated output.
2. Run `npm test`, `node tools/check-public-surface.mjs .`, `node --check` for every touched JavaScript file, and `git diff --check` from `interactive-explanation/` or their documented parent-directory equivalents. Update each affected `docs/<slug>/` parity record when behavior or ownership changes.
3. Run focused smoke checks for every affected Route at 1400×1000, 390×844, and 320×844 in fresh contexts under stored light and dark themes. Also test no stored theme with both `prefers-color-scheme` values.
4. Require one visible meaningful `<main>`, local Atlas/Docs exits, one correctly placed Suggested Next Route link, no page pan beyond 32 CSS px, no clipped shell control, and navigation matching the declared mode. Generated navigation must preserve rail/mobile geometry, Escape closure, and focus return; native controls must remain visible and state-owned; `none` must render no generated navigation.
5. Run one safe deterministic interaction probe per Route, or an explicit read-only probe. Pointer and keyboard paths must produce the same semantic state where both apply. Reload/reset must restore the declared initial state.
6. Compare the declared runtime surface before and after shell/theme work. Allow at most 1 CSS px per rectangle edge for browser rounding; require exact backing dimensions and aspect ratio at the same device scale. Iframe, canvas, WebGL, SVG, image, video, and compiled-runtime ownership cannot change without its declared hook.
7. Require pre-paint `html[saved-theme]`, intentional light/dark shell color differences, WCAG contrast of at least 4.5:1 for normal text, 3:1 for large text and meaningful control boundaries, and preserved control geometry in both states. `shell-only` and `fixed-runtime` intrinsic output must remain unchanged; `runtime-hook` output must match its explicit state contract.
8. Require non-empty accessible names and exposed state, visible keyboard focus, no keyboard trap, modal Escape/focus return, and at least 24×24 CSS px pointer targets or the WCAG spacing/equivalent-control exception. Preserve hidden-footer focus safety and unique iframe titles.
9. Require zero unexpected `pageerror`, failed same-origin request, local HTTP response at or above 400, or initial off-origin request. A deferred embed may run only after its declared action and only against its declared host allow-list.
10. Measure three fresh-context runs and compare medians to the approved per-Route baseline. Fail when DOMContentLoaded or load time grows by more than the larger of 20% or 250 ms, same-origin transfer grows by more than the larger of 20% or 250 KiB, resource count exceeds the declared shell delta, or any new initial off-origin request appears. Unsupported transfer fields are reported as unsupported rather than zero.
11. Run the full 83-Route baseline and full smoke suite after the focused family checks. An unrelated regression blocks the family commit.

Screenshot inspection is unavailable in this environment and is not silently claimed. Computed colors, geometry, focus, accessibility state, deterministic interaction output, and runtime/network checks are the approval evidence. Add pixel baselines only when deterministic screenshot review becomes available; continue masking intrinsic runtime output according to `themeOwnership`.

### Complete-effort close gate

Require 83/83 valid manifest, Route, docs, parity, shell, navigation, theme, primary-surface, interaction/read-only, accessibility, network, and Suggested Next Route contracts; 249/249 Route-viewport checks per theme; 166/166 stored Route-theme states before viewport permutations; zero policy, syntax, unit, manifest-drift, runtime, or unexplained performance failures; and a green standards/spec review of the complete diff.

### Rollback

Before commit, discard only the failing family slice. After commit, revert that atomic family commit. Roll back immediately for any hard-gate failure, unapproved intrinsic/runtime change, unrelated full-suite regression, data loss, or unexplained geometry/performance change. Do not widen selectors, weaken tolerances, add exceptions, or update baselines merely to turn red green.

Skipped: a new test framework, generic crawler, and unverifiable screenshot gate. Add them only when manifest declarations and deterministic Playwright probes cannot express the contract.
