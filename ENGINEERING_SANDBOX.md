# Engineering Sandbox Design Brief

This brief scopes the editorial design language for `interactive-explanation/` play-first technical essays.

## Intent

The Engineering Sandbox layer is for replicas that already teach through interaction and only need stronger framing, pacing, and navigation. It should make the first viewport feel like an invitation to experiment, not a textbook cover page.

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
- `data-story-chapter` on major sections
- `data-story-callout` on inserted callouts where needed

## Guardrails

- Do not rewrite the underlying interactive runtime unless the shell patch reveals a real bug.
- Keep all fonts and visual assets local.
- Preserve provenance policy: the shared footer remains the only public original-page reference surface.
- Prefer additive enhancement over DOM surgery for compiled or vendored routes.
