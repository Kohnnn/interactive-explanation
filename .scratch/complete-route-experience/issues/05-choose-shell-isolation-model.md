# Choose the canonical shell isolation model

Type: grilling
Status: resolved
Blocked by: 01, 04

## Question

Which authored wrapper, cascade-layer, selector-scope, or adapter pattern becomes the canonical way to put every Route under the Engineering Sandbox contract while preserving runtime behavior and dimensions? Which exceptions, if any, require a family-specific pattern?

## Answer

Use no universal content wrapper. The canonical shell seam is the existing Route document: manifest-owned shell metadata is rendered as `data-story-shell`, `data-story-route`, `data-story-family`, `data-story-variant`, and `data-story-nav` on `<body>`; shared chrome remains body-level sibling DOM; each Route's existing `<main>` and runtime roots stay in their current position and script order.

Shared shell CSS may target only explicit shell metadata plus shell-owned classes. Generated chrome must use namespaced `.ie-*` classes; existing `.story-*` editorial classes remain the Engineering Sandbox interface. Remove broad inherited shell styling of route `main`, `article`, `section`, headings, links, text, and controls unless a selector also names shell-owned markup. Cascade layers may organize shared tokens, chrome, and adapters, but they are not the isolation boundary. Do not make `@scope`, Shadow DOM, a reset, `!important`, or a MutationObserver part of the canonical contract.

Runtime adaptation is family-owned and root-scoped. An adapter may style an authored outer frame or map a verified existing runtime token under a declared runtime root; it may not wrap or restyle opaque descendants, alter dimensions or positioning, or recolor canvas, WebGL, image, video, or iframe-document output. Static selectors cover runtime-created DOM only when that DOM is inside the declared owned root and matches a documented hook.

Required exceptions are seam declarations, not alternate shell systems:

- Iframe estates own only the parent article and frame element; each child document is autonomous and requires a separate approved migration.
- Canvas, WebGL, SVG, image, video, audio, compiled, minified, and binary-model roots stay opaque unless a documented hook is declared.
- Fullscreen and tool-first Routes may use overlay top-bar chrome and `native` or `none` navigation; no generated rail or layout wrapper is forced onto them.
- Ableton Synths keeps the proven `#app[data-ableton-synth-lesson]` adapter seam.
- Shared watch Routes declare the authored article/workbench separately from the shared renderer and binary meshes.
- Route-specific structural contracts remain intact, including direct-child selectors in the Anders labs, viewport ownership in `watch-mesh-explorer`, the Song Maker `<base>` path, framework resets in `rigid-body-collisions`, and Musicmap's explicit chrome stacking.

The manifest is the sole source for shell variant, navigation mode, runtime root, and exception metadata. Route HTML is generated or synchronized from it; no second JavaScript route registry is added. A family migration is accepted only after before/after geometry, interaction, focus, overflow, and runtime-cleanliness probes confirm the seam preserved behavior and dimensions.

Skipped: a universal wrapper and generic runtime adapter. Add a new family seam only when an existing authored root or supported runtime hook is proven.
