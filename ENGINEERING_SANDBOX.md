# Engineering Sandbox Design Brief

This brief scopes the editorial design language for `interactive-explanation/` play-first technical essays and compact interactive labs.

## Intent

The Engineering Sandbox layer is for replicas that already teach through interaction and only need stronger framing, pacing, and navigation. It should make the first viewport feel like an invitation to experiment, not a textbook cover page or a product dashboard.

## Core Direction

- Warm paper background with layered gradients, not flat white dashboards.
- Dark ink typography with steel and blue engineering accents.
- `Be Vietnam Pro` for editorial copy and headings.
- `IBM Plex Mono` for labels, controls, metadata, and chapter navigation.
- Strong hierarchy, generous spacing, and short lead-ins before dense technical sections.
- Calm motion only: chapter highlighting, gentle hover shifts, and no decorative animation loops.

## Reusable Patterns

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

## Route Contract

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

## Guardrails

- Do not rewrite the underlying interactive runtime unless the shell patch reveals a real bug.
- Keep all fonts and visual assets local.
- Preserve provenance policy: the shared footer remains the only public original-page reference surface.
- Prefer additive enhancement over DOM surgery for compiled or vendored routes.
- Do not force the essay rail onto demo-lab families just because they also contain explanatory copy.
