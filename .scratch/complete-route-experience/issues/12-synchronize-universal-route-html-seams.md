# Synchronize universal Route HTML seams

Type: task
Status: resolved
Blocked by: 11

## Question

Extend manifest synchronization so every top-level `<slug>/index.html` receives canonical body shell metadata, Engineering Sandbox assets, `<meta name="color-scheme" content="light dark">`, and synchronous `shared/theme-init.js` before Route styles without changing main/runtime placement or script order. Handle one-line documents, `<base>`, comments containing tag text, omitted closing tags, and existing partial shell markup deterministically. Never descend into child runtime documents. Add idempotence and special-structure tests, synchronize all 83 Routes, and update affected parity evidence.

## Answer

Extended `tools/sync-route-metadata.mjs` with deterministic top-level HTML scanning and all-or-nothing synchronization. All 83 Routes now carry canonical body metadata, one light/dark color-scheme declaration, synchronous theme initialization before Route styles, Sandbox CSS after Route styles, and one deferred Sandbox runtime. Existing Sandbox runtimes retain their authored head/body region and script order; missing runtimes are added after existing head scripts. Child runtime documents remain untouched.

Added traversal-safe slug validation, malformed parity rejection, dedicated `universal-route-html-seams` parity modules, idempotence fixtures, and coverage for one-line documents, `<base>`, comments, raw script/style text, omitted closing tags, partial seams, and existing head/body runtime placement. Generated-navigation preparation now follows `data-story-nav="generated"`; focused geometry fixes preserve Remember and Ableton Synth layouts.

Verified with `npm test` (350 passing tests), the policy audit, syntax checks, `git diff --check`, explicit all-Route idempotence and baseline-position checks, and the full 83-Route Playwright smoke suite.

The parent repository stores `coming-out-simulator-2014`, `covid-19`, and `wbwwb` as unmapped Git links. Their verified synchronized HTML remains in the working tree because recording those files would require either converting the links or committing divergent nested history; neither repository-structure change belongs to this ticket.
