# Shell Isolation and Full UI Theming

## Decision

Use one additive, authored **route shell seam** per Route. The seam loads shared tokens and the pre-paint theme initializer in `<head>`, marks the route body with the Engineering Sandbox contract, and loads shared chrome after the route runtime has claimed its DOM. Scope every shared selector to an explicit shared class or `body[data-story-shell="engineering-sandbox"]`; scope runtime adapters to a documented runtime root. Do not wrap, reset, layer, recolor, resize, observe, or otherwise modify a runtime merely because it is inside a themed Route.

This is the smallest architecture that covers all 83 Routes without changing vendored assets or relying on fragile global selectors. It keeps intrinsic canvas, WebGL, image, video, iframe-document, and unhooked compiled-runtime palettes unchanged.

## Constraints preserved

- The destination requires all 83 Routes to adopt the Engineering Sandbox contract while preserving behavior, content, URLs, assets, accessibility, and runtime dimensions. Intrinsic canvas, WebGL, image, and video palettes remain unchanged unless an existing runtime hook supports them ([map](../map.md#L6-L10)).
- Minified, bundled, archived, and vendored assets are not edited; adaptations belong at authored seams ([map](../map.md#L17-L20)).
- `pages.json` is the 83-Route inventory. At review time, 58 Route documents already declare `data-story-shell="engineering-sandbox"`; 25 do not. All 83 currently load `public-footer.js`, but none directly load `theme-init.js`.
- The shared footer stylesheet contains global `body.has-top-bar`, `.top-bar`, and `.public-footer` selectors (`shared/public-footer.css:3-170`). This is an observed collision risk, not a theoretical one.

## Standards-backed boundaries

| Boundary | What it isolates | What it does not solve | Decision |
| --- | --- | --- | --- |
| Explicit ancestor selector | Shared shell selectors affect only declared shell markup. | Inherited values and route-local global CSS remain in the same document. | Primary mechanism. Use `body[data-story-shell="engineering-sandbox"]` plus dedicated `.ie-*` classes. |
| Cascade layer | Resolves conflicts among deliberately layered declarations; unlayered author styles override normal layered styles. [MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/@layer) | Does not create a DOM boundary or protect against runtime CSS with `!important`, inline styles, or inheritance. | Optional organization inside shared CSS; never the isolation guarantee. |
| CSS `@scope` | Limits selector matching to a subtree. [MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/@scope) | Inherited values can cross the scope limit; support is only Baseline 2025. | Do not make it the canonical mechanism. Explicit ancestor selectors work on the repository's broader support floor. |
| CSS custom properties | Values cascade and inherit from parents. [MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Cascading_variables/Using_CSS_custom_properties) | They can accidentally enter a runtime that reads the same property name. | Publish only namespaced shared tokens; map into runtime tokens only at a named runtime root. |
| Shadow DOM | Page CSS does not affect nodes inside a shadow tree. [MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_shadow_DOM#encapsulation_from_css) | Cannot style an existing opaque runtime; does not help iframe documents; changing a runtime to use it is a rewrite. | No retrofit. If a future owned runtime exposes parts or variables, use its documented API. |
| `<iframe>` | Every iframe is a nested browsing context with its own document. [MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/iframe) | Parent CSS cannot theme the frame document; frame geometry is still owned by the parent. | Theme only the iframe element and surrounding shell. Edit same-origin child documents only as a separately declared family migration. |

`@scope` is specifically unsuitable as the only safety boundary: its own documentation states that inherited properties still pass beyond the scope limit. The existing `engineering-sandbox.css` already uses the compatible explicit-ancestor pattern (`shared/engineering-sandbox.css:57-110`).

## Canonical route seam

Every Route should have the following ownership order. The exact relative paths differ by depth; no root-absolute assets are introduced.

1. In `<head>`, before render-blocking route styles: `shared/theme-init.js`, then `shared/tokens.css` through the shared chrome stylesheet, then the route's current stylesheet(s). Add `<meta name="color-scheme" content="light dark">` before CSS. MDN recommends declaring the meta value before CSS to reduce native-chrome flashes ([color-scheme](https://developer.mozilla.org/en-US/docs/Web/CSS/color-scheme)).
2. On `<body>`, declare `data-story-shell="engineering-sandbox"`, `data-story-route`, `data-story-family`, `data-story-variant`, `data-story-nav`, and an explicit `data-theme-ownership` value.
3. Keep the existing runtime root and DOM placement intact. Do not add a wrapper around position-sensitive, fullscreen, canvas, iframe, or compiled roots without an approved geometry baseline.
4. Load runtime scripts in their current order. Load `engineering-sandbox.js` after authored route DOM is present and after the runtime's required boot scripts; load `public-footer.js` last unless a route proves a different dependency.
5. Attach an adapter stylesheet only where a family has a documented owned root and an existing theme token or class seam. The adapter may style the root's surrounding frame and map documented custom properties; it may not use universal selectors, `filter`, `mix-blend-mode`, `transform`, dimension rules, or canvas/image/video recoloring.

`shared/theme-init.js:7-18` already synchronously selects `localStorage["theme"]` when valid and otherwise uses `prefers-color-scheme`, then writes `html[saved-theme]`. Its placement in `<head>` is the correct pre-paint seam. `shared/public-footer.js:4-27` has a fallback, but that runs after script parsing and cannot replace a head initializer.

## Theme model

### Shared chrome

Retain `html[saved-theme="light|dark"]` as the only persisted theme state. `shared/tokens.css:1-105` already defines the shared palette and sets `color-scheme: dark` for dark mode; it also has a no-JavaScript media-query fallback (`shared/tokens.css:107-156`). Add the light equivalent explicitly:

```css
:root[saved-theme="light"] {
  color-scheme: light;
}
```

`color-scheme` lets the browser theme its canvas surface, form controls, scrollbars, and other browser-provided UI, but it does not theme authored runtime controls by itself ([MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/color-scheme)). Route-owned native controls must use shared tokens in their own authored CSS. Do not put `color-scheme: only light` on a runtime unless its design is intentionally fixed and that exception is declared.

### Namespaced shared tokens

Keep existing `--paper`, `--ink`, and footer variables for the already-shared chrome. New cross-route tokens must use an `--ie-` prefix, for example `--ie-surface`, `--ie-text`, and `--ie-border`, to avoid accidental collision with vendor names such as Ableton's `--color-background`. Two-dash custom properties inherit, so placing a generic token on `:root` can alter any descendant runtime which consumes the same name ([MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Cascading_variables/Using_CSS_custom_properties#inheritance_of_custom_properties)).

For a documented runtime hook, map only at its owned root:

```css
:root[saved-theme="dark"] body[data-story-family="example"] [data-runtime-root] {
  --runtime-background: var(--ie-surface);
  --runtime-foreground: var(--ie-text);
}
```

This is an adapter, not a universal theme. It requires an existing runtime property and a before/after geometry and interaction probe.

### Theme ownership declaration

Each Route needs one manifest-owned classification:

- `shell-only`: shared chrome and authored outer HTML theme; every intrinsic or runtime-owned surface retains current pixels.
- `runtime-hook`: named existing hook and runtime root; only the documented HTML/runtime controls change.
- `fixed-runtime`: the runtime is deliberately unchanged; surrounding chrome changes only.
- `iframe-child`: parent shell changes; listed same-origin child documents are separately migrated and tested. This is not implied merely because a frame is local.

The `themeOwnership` labels proposed in [acceptance gates](02-complete-experience-gates.md#L46-L51) cover the first three values; add `iframe-child` only if child-document migration is approved. Default every unclassified Route to `shell-only` during inventory, then reject that default before a family is accepted.

## Selector and cascade rules

1. Shared CSS may target only a shared class (`.ie-top-bar`, `.ie-footer`, `.story-*`) or an explicit shell ancestor. Rename global `.top-bar` and `.public-footer` selectors to `body[data-story-shell="engineering-sandbox"] .ie-top-bar` and `body[data-story-shell="engineering-sandbox"] .ie-footer`, updating only markup made by `public-footer.js`.
2. Shell CSS must not use tag-only selectors below `body`, `main`, `article`, `section`, `button`, `input`, `canvas`, `svg`, `iframe`, `img`, `video`, or `*` unless it also identifies a shared class. Existing broad font selectors in `engineering-sandbox.css:83-103` need per-family review because they can change runtime-owned HTML controls.
3. Do not use `!important` to win against a runtime. It hides collisions and can alter geometry or state styling. The current footer's visibility `!important` rules (`public-footer.css:111-115`) are a localized legacy exception that should be contained beneath its own selector, not copied.
4. If layers are introduced, establish one early order such as `@layer ie.tokens, ie.chrome, ie.adapters;`. Keep route runtime styles unlayered. Normal unlayered styles override layered styles, so a layer is useful for shared style discipline but cannot override a runtime by accident ([MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/@layer#description)).
5. Do not move vendor CSS into a layer: that changes its cascade relationship and violates the no-vendor-edit constraint.

## Runtime-created DOM

Static selectors apply to nodes inserted later if they match, so a correctly scoped adapter needs no observer for ordinary runtime-owned HTML. `public-footer.js` demonstrates this pattern: it creates known chrome nodes using `document.createElement` and class names (`shared/public-footer.js:225-259`).

Do not add a repository-wide `MutationObserver`. The API observes DOM changes ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver)); a global observer would race runtimes, repeatedly scan large interactive trees, and blur ownership. Use one only when a specific runtime has no stable root or hook, and then:

- observe the smallest known runtime container;
- match one documented inserted control selector;
- perform idempotent decoration only;
- disconnect once the target appears or when the route unloads;
- test that it changes neither child order nor runtime geometry.

The repository-wide source search found no authored `attachShadow(` use. Treat third-party or browser-native shadow roots as opaque unless the component exposes documented CSS custom properties, `::part`, or another supported API.

## Iframe and intrinsic-surface rules

An iframe has an independent document and navigation context ([MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/iframe#scripting)). The parent may style its frame border/background and preserve its declared rectangle, but cannot make its HTML controls dark through parent CSS. Frame documents must retain their own `title` and behavior. Do not apply `sandbox` during this work: it can alter scripts, forms, storage, navigation, and pointer behavior.

The iframe-heavy Nicky Case routes are explicit separate-document cases:

- `polygons`: 19 frames.
- `ballot`: 14 frames, including authored fixed `width`/`height` simulations (`ballot/index.html:47-49`, `ballot/index.html:81-87`, `ballot/index.html:173-193`).
- `remember`: 5 frames.
- `covid-19`: 26 frames, including `800×540` simulation frames (`covid-19/index.html:94-96`, `covid-19/index.html:110-124`).
- `neurons`: 1 frame.

Do not responsive-resize these rectangles as part of theming. The iframe reference states that a frame's `width` and `height` are CSS pixels and that parent-frame sizing does not reveal child size by default ([MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/iframe#responsive_iframe_sizing)).

Canvas and WebGL pixels are not CSS backgrounds. Never theme them with `filter: invert()`, compositing, a canvas overlay, or global `color` inheritance. Canvas-heavy unshelled Nicky Case routes are `crowds` (2 canvas elements) and `anxiety` (1); their shell must use `shell-only` unless a current runtime-supported hook is documented. The same rule applies to all existing shelled canvas routes.

## Repository inventory and authored seams

| Migration cohort | Routes | Safe starting seam | Required exception |
| --- | --- | --- | --- |
| Unshelled Nicky Case longforms | `trust`, `polygons`, `ballot`, `crowds`, `loopy`, `neurons`, `remember`, `anxiety`, `wbwwb`, `coming-out-simulator-2014`, `covid-19`, `simulating`, `sim` | Add head initializer/tokens, body contract, scoped shared chrome, then use the existing route-local CSS file for an outer adapter. | Frames and canvases remain fixed; use native or no generated navigation where runtime dominates. |
| Ableton Synths | `ableton-learning-synths-get-started`, `ableton-learning-synths-how-synths-make-sound`, `ableton-learning-synths-filter-resonance`, `ableton-learning-synths-modulating-amplitude-with-envelopes`, `ableton-learning-synths-matching-envelopes`, `ableton-learning-synths-recipes` | Authored `#app[data-ableton-synth-lesson]` seam and `shared/prototype-visual.css`. | `styles/styles.min.css` remains untouched. Its `--color-*` variables can be adapted only under `#app` after a per-lesson hook verification. |
| Compiled/music archives | `chrome-music-lab-song-maker`, `musicmap`, `watch-mesh-explorer` | Existing outer body/main and shared footer seam. | Default `fixed-runtime`; discover a documented owned root before adapting runtime UI. |
| Local editorial and standalone Routes | `reading-qr-codes-without-a-computer`, `music-interactive-hub`, `primary-interactive-hub` | Their authored HTML/CSS and shared chrome. | They can use normal shell tokens once their primary control geometry is baselined. |

The six Ableton Synths currently have a controlled adapter precedent: `shared/prototype-visual.css:29-53` selects only `body[data-story-family="ableton-synths"] #app[data-ableton-synth-lesson]` and uses the runtime's `--color-background` without editing the minified stylesheet. Preserve that root-specific approach.

## Loading and migration order

1. **Contain shared chrome first.** Rename or qualify global footer/top-bar selectors and ensure generated chrome has only `.ie-*` classes. Verify all current 83 footer mounts still work.
2. **Make theme pre-paint universal.** Add `theme-init.js` and `<meta name="color-scheme">` to every Route head, before route CSS. Do not infer the theme from a post-load script.
3. **Migrate the 25 unshelled Routes by cohort.** Add body metadata and only the supported navigation mode. Preserve body class lists and route script ordering.
4. **Declare ownership before adapters.** Add shell variant, navigation mode, runtime root, intrinsic mask selectors, and theme ownership to `routes.manifest.json`; validate them in `sync-route-metadata.mjs` as proposed in [acceptance gates](02-complete-experience-gates.md#L23-L52).
5. **Add adapters one runtime family at a time.** Start with an outer frame; map runtime properties only when an existing safe hook is demonstrated. Do not create a generic runtime-theme script.
6. **Migrate iframe children only as explicit child-document work.** A parent Route is not dark-mode complete inside frames unless its declaration is `shell-only`/`fixed-runtime`, or each named child document has its own audited migration.

## Verification required per family

Before and after each family slice, run the repository policy audit and focused smoke test; run the full smoke suite for shared CSS or JS changes. Add these assertions to the manifest-driven gates:

- Before readiness in fresh light and dark storage states, `html[saved-theme]` equals the requested state.
- Shared chrome background, foreground, and control colors differ across themes; route runtime dimensions do not.
- Every declared runtime root, canvas, iframe, image, video, and WebGL surface has an unchanged bounding rectangle and aspect ratio unless the route action itself declares a range.
- A visual comparison masks `shell-only` and `fixed-runtime` intrinsic surfaces. `runtime-hook` compares its declared root. Iframe child content is masked unless separately migrated.
- Computed styles for route runtime controls are sampled before/after shell loading to detect inheritance collisions; no global selector or token may change a control without a declared adapter.
- At 1400×1000, 390×844, and 320×844, shell controls do not cover primary runtime controls, and native/no-navigation routes do not acquire a generated rail.

These conditions align with the broader all-route theme, geometry, accessibility, and interaction recommendations in [acceptance gates](02-complete-experience-gates.md#L71-L145).

## Rejected approaches

- **A global dark-mode override:** breaks intrinsic visuals and runtime controls through inheritance/cascade.
- **One wrapper around every runtime:** can alter containing blocks, flex/grid behavior, `position: fixed`, event coordinates, and iframe/canvas geometry.
- **Shadow-DOM wrapping of existing apps:** requires changing runtime boot and cannot contain iframe documents.
- **A universal MutationObserver decorator:** has no stable ownership contract and risks runtime mutation/performance regressions.
- **Editing vendor/minified CSS:** prohibited by the destination and creates an unreviewable upgrade boundary.
- **`@scope` as the safety guarantee:** newer support floor and inherited values still cross its boundary.

## Smallest implementation delta

1. Qualify generated shared chrome selectors and class names.
2. Add head pre-paint theme initialization and native color-scheme metadata to all Route documents.
3. Add the missing body shell declarations with route-specific navigation and theme ownership metadata.
4. Add family adapters only where an authored outer root or verified existing runtime token exists.
5. Extend manifest validation and Playwright checks; do not add a framework or a generic theming runtime.

Skipped: a global reset, dynamic theme injection, runtime rewrites, Shadow DOM retrofit, and iframe sandboxing. Add a runtime adapter only when a family demonstrates an existing hook and passes the geometry/interaction baseline.
