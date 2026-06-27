# Cloning a Route (Engineering-Longform Pattern)

This note captures how `interactive-mechanical-watch/` was built as a dark-editorial
sibling clone of `mechanical-watch/`, so the same recipe can be reused for the next
route without a bespoke script.

## When to use this
You want a NEW route that reuses an existing route's interactive engine (WebGL,
canvas, etc.) verbatim, but reframes it with a different reading surface and/or
additive sections. Delivery is a new sibling folder + manifest entry, never an
in-place edit of the source route.

## Steps

### 1. Copy the engine 1:1
Copy the entire source route folder to the new slug, preserving structure:
```
interactive-explanation/<source-slug>/  ->  interactive-explanation/<new-slug>/
```
Include everything the engine binds to: `index.html`, `css/*`, `js/*`,
`models/*.dat` (binary geometry cannot be regenerated), and all `images/*`.
Keep paths relative (`./`, `../`) for subpath hosting under
`/interactive-explanation/`.

> The interactive engine binds demos by element `id`. Preserve EVERY demo id and
> the DOM structure verbatim. Restyle only through a route-local CSS layer; never
> rewrite the markup or edit `js/*`.

### 2. Add the manifest entry
In `routes.manifest.json`, add an entry modeled on `formula-1-racing` (the neutral
template). For a local recomposition that should not surface an upstream page:
```json
{
  "slug": "<new-slug>",
  "title": "<Title>",
  "summary": "<one-sentence summary>",
  "topicTags": ["...", "..."],
  "addedDate": "YYYY-MM-DD",
  "docsUrl": "./docs/<new-slug>/",
  "referenceMode": "neutral",
  "familyKey": "engineering-longform"
}
```
- Omit `referenceUrl` when `referenceMode` is `"neutral"`.
- `docsUrl` must be exactly `./docs/<new-slug>/`.

Then sync:
```
node tools/sync-route-metadata.mjs .
```

### 3. Rewrite the head + body contract in `index.html`
- Update `<title>`, `<meta name="description">`, `og:*`, `keywords`.
- Set the body to neutral provenance so no upstream creator link is surfaced
  (the public-surface audit flags upstream creator/article links under the
  `engineering-longform` policy):
  ```html
  <body data-reference-mode="neutral"
    data-reference-note="<provenance sentence>"
    data-footer-label="Route provenance" data-show-reference-footer="true"
    data-canonical-url="./"
    data-story-shell="engineering-sandbox" data-story-family="engineering-longform"
    data-story-nav="generated" data-story-route="<new-slug>">
  ```
- `data-story-route` MUST equal the slug — the shell and route-local CSS scope
  off it.

### 4. Add a route-local CSS override layer
Create `css/<route>-shell.css` (here: `editorial-shell.css`), linked LAST in the
head so it wins by source order. Scope EVERY rule under
`body[data-story-route="<new-slug>"]` so nothing leaks to other routes.

For a dark surface over a light interactive engine:
- Darken the article/prose background and lighten text, headings, links.
- Wrap each interactive `.drawer_container` in a LIGHT framed inset — the WebGL
  engine assumes a light backdrop (loading text is `#333`, explainers are light).
  Darkening the canvas host breaks legibility.
- Style only classes that actually exist in `shared/engineering-sandbox.css`
  (e.g. `.story-rail`, `.story-progress`, `.story-mobile-bar`) and `css/watch.css`
  (`.color_*` legend). Do not invent classes.
- Respect `prefers-reduced-motion`; guarantee no horizontal overflow at 375 /
  768 / 1280 px (the smoke test checks desktop AND mobile).

### 5. Add any additive sections
New chapters go inside `.article`, anchored with a top-level `h1[id]` so the
generated chapter rail picks them up. For image-backed sections, use slots that
degrade gracefully so missing art never breaks layout:
```html
<figure class="resin-figure">
  <img src="./images/generated/<name>.png" alt="..." loading="lazy" />
  <figcaption>...</figcaption>
</figure>
```
Style `:not([src])` / `[src=""]` and broken-image states in the route CSS with a
min-height placeholder so the build ships before the art exists.

### 6. Write the docs + parity
Scaffold then replace the stubs:
```
node tools/sync-route-metadata.mjs . --scaffold <new-slug>
```
Fill `docs/<new-slug>/index.html` (source snapshot, asset handoff, known
deviations, validation guidance) and `docs/<new-slug>/parity.json` (one module
entry per real subsystem: shell, engine, CSS layer, additive section).

### 7. Generate AI art (optional, backfillable)
The route ships fine without art thanks to graceful slots. To backfill via
9Router:
- Reusable generator: `gen-watch-images.ps1` (parametrized `-OutDir`, `-Model`,
  `-EnvFile`; skips existing >1KB files; retries with backoff).
- Endpoint: `POST $NINEROUTER_URL/images/generations?response_format=binary` with
  `{ "model": "...", "prompt": "..." }`, `Authorization: Bearer $key`,
  `-OutFile` to save the PNG directly.
- Model note: Gemini image models (`gemini/gemini-3-pro-image-preview`,
  `gemini-2.5-flash-image`) returned HTTP 429 `limit: 0` (free-tier capped at
  zero). `cx/gpt-5.5-image` had open quota and produced ~2 MB PNGs. Probe a model
  with a single test call before batching, and fall back across models on 429.
- Creds live in `.env` (`NINEROUTER_URL`, `NINEROUTER_KEY`) — never echo the key.

### 8. Verify
```
node tools/sync-route-metadata.mjs .
node tools/check-public-surface.mjs .
node tools/smoke-bundle.mjs . --route <new-slug>
```
All three must pass. The audit must list the new slug and must not flag any
upstream creator/article link. The smoke run checks footer presence, route
selectors, and desktop/mobile overflow.

## Gotchas
- Binary `.dat` geometry is opaque and cannot be regenerated — always copy it.
- Keep the copied `js/*` engine unmodified; all visual change goes through the
  route-local CSS layer.
- Neutral provenance is required for recomposed routes so the audit does not flag
  the original upstream link.
- Preserve all demo element ids; the engine binds by id.
