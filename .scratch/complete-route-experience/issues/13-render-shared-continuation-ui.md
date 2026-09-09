# Render shared Route and Atlas continuation UI

Type: task
Status: resolved
Blocked by: 11, 12

## Question

Render one namespaced Suggested Next Route block after each Route `<main>` and before `#reference-footer`, and one separate `Suggested next: <Route title>` link on every Atlas card, using only manifest data. Preserve local subpath URLs, semantic heading/link behavior, focus visibility, Guided Path Progress isolation, and existing footer/shell geometry. Add shared styles and deterministic DOM tests without adding a second route registry.

## Answer

`shared/public-footer.js` now validates and consumes canonical `routes.manifest.json`, renders one local target-title continuation after each top-level Route `<main>` and before `#reference-footer`, preserves `<base>` and subpath hosting through the shared-script root, and exposes an observable non-inferred fallback when manifest data is unavailable. `shared/site.js` derives one separate continuation link for every inventory and promoted Guided Path card from the loaded manifest mirror.

Namespaced shared styles preserve family footer widths and visible focus without touching runtime surfaces. The smoke suite validates all 83 Route continuations at desktop and mobile sizes, Atlas rerenders and history states, DOM placement, semantic labels, local URLs, focus preservation and visibility, footer geometry, and Guided Path Progress isolation. `npm test` and the full `npm run smoke` suite pass.
