# Choose the canonical theme adapter model

Type: grilling
Status: resolved
Blocked by: 01, 04

## Question

How should shared tokens, pre-paint theme initialization, runtime-family adapters, and intrinsic-media exclusions combine so every HTML and runtime-owned UI surface supports light and dark modes without editing vendored assets or changing interaction geometry?

## Answer

Use one synchronous pre-paint contract on every Route: place `<meta name="color-scheme" content="light dark">` and `shared/theme-init.js` in `<head>` before Route styles. `html[saved-theme="light|dark"]` is the only theme selector; `localStorage["theme"]` is the only persisted preference; an absent or invalid value follows `prefers-color-scheme`. Add explicit `color-scheme: light` for stored light mode and retain the media-query fallback.

The manifest owns one `themeOwnership` value per Route:

- `shell-only`: theme shared chrome and Route-authored HTML; intrinsic canvas, WebGL, SVG, image, video, audio, and iframe-document output retains its pixels.
- `runtime-hook`: theme only a declared runtime root through a verified existing class, attribute, or custom-property hook.
- `fixed-runtime`: theme only surrounding shell because the compiled, archived, vendored, or otherwise opaque runtime has no supported hook.

Same-origin iframe children are not implicitly themeable and do not add a fourth default ownership mode. Migrate them only through a separately approved family declaration that lists each child document and gives it the same pre-paint, geometry, interaction, and visual checks.

Preserve existing shared tokens for current chrome. Prefix every new cross-Route token with `--ie-`; map it to a runtime token only beneath the declared owned root. Family adapters use static root-scoped selectors, never universal selectors, generic inheritance, filters, overlays, transforms, dimension rules, `!important`, vendor edits, or a repository-wide observer.

A family passes only when both stored themes apply before readiness, shared shell colors intentionally differ, declared runtime hooks switch as specified, and runtime controls and intrinsic surfaces preserve behavior, focus, rectangles, backing dimensions, and aspect ratios. Visual checks mask `shell-only` and `fixed-runtime` intrinsic surfaces; `runtime-hook` surfaces are compared against their approved themed state.

Skipped: a generic runtime-theme script and automatic iframe theming. Add an adapter only after an existing owned hook is proven.
