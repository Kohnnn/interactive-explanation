# Encode the manifest experience contract

Type: task
Status: resolved
Blocked by: 05, 06, 07, 09

## Question

Implement the complete manifest-owned experience schema for all 83 Routes: shell family and variant, navigation mode and any chapter/native-control declaration, theme ownership, primary/runtime surface, interaction or explicit read-only probe, network policy, and `suggestedNextSlug`. Validate cross-Route targets and mode-specific requirements in `tools/sync-route-metadata.mjs`, preserve unchanged generation into `pages.json`, move the five `routeChapterConfigs` declarations out of `shared/engineering-sandbox.js`, and leave focused validation tests. Do not change Route HTML or UI in this slice.

## Answer

Encoded all 83 Route experience declarations in `routes.manifest.json` and preserved byte-equivalent generated data in `pages.json`. The synchronizer now rejects unknown keys, malformed contracts, invalid navigation/theme/network combinations, duplicate or missing cross-Route targets, and the five missing manifest-owned chapter declarations.

`shared/engineering-sandbox.js` now loads those five chapter declarations from generated manifest data and exposes manifest readiness on the Route body. Focused fixtures lock the complete 83-Route shell/theme/navigation/continuation matrix, chapter declarations, native-control contracts, schema failures, and generated parity.

Route HTML/UI synchronization remains Ticket 12, Suggested Next Route rendering remains Ticket 13, and executable DOM/interaction/network gates remain Ticket 14.

Verified with `npm test` (341 passing tests), `npm run smoke`, and `git diff --check`.
