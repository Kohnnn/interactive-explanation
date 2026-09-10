# 56 — Exact geometry source rebinding

## Scope and evidence

CI run `34442195321` rejected expected head product digest `40d2e69bf997353eda8f00ed8e560a84164fbb7a9132fc0c1968cb0ecdf16de8`; source head `9618d8b9d6d03ec0ed27dd1c0c4c2775bbd9f3d3` has digest `e3d6a2c2feb9eab8bdd3594037bac93c2c8f0e472ee00738073145c923c3045d`. Relative to the reviewed source represented by the old digest, the only product-binding changes are `package.json`, `pages.json`, and `routes.manifest.json`.

Git blob comparison proves `pages.json` and `routes.manifest.json` changed only the Musicmap deferred-network host arrays. Musicmap title remains exactly `Musicmap`; summary remains exactly `Local replica of Musicmap with vendored graph, search, genre panels, and user-click-triggered YouTube or Spotify embeds under a scoped music-family exception.` Atlas renders and sorts titles/summaries in `shared/site.js`; it does not consume network policy. Network policy is consumed by diagnostics and runtime request enforcement. `package.json` changed only the `check` script to syntax-check `tools/resource-review.mjs`; it is not browser-rendered.

The current whole-file SHA-256 values are pinned as geometry dependencies: `package.json` `212ec481ebff5d0952b6ffc07df25a5bd3d123330e2dbe25a911f6e8085bc4cc`, `pages.json` and `routes.manifest.json` `5b7ba62e8ff1a5beb1370579448ef6c10eb1eace176a5c603fa45eb9dbe7dde9`. There is no generic field exclusion or path approval. Any later byte change, including Musicmap title, summary, rendered metadata, network policy, or test script, changes the dependency map and fails verification.

## Preserved review

`tools/geometry-review.json` retains exactly 62 reviewed cells and 1,590 path/before/after leaves. Review artifact SHA-256 remains `23054c887be2a6a0df0fc18822246811b711efe69ccdbff72f97f75c37f0f776`; raw journal SHA-256 remains `951a010e8965261cb10fb5162608dd05f586af0e1585abfed031646d9f071926`; raw cell count remains 504. No cell, leaf, value, raw hash, approval path, mask, tolerance, or legacy baseline changed.

The capture dependencies are rebound to their exact current blobs. Focused unit coverage mutates Musicmap title and summary independently and verifies source admission fails. Existing inventory tests continue to reject additions, removals, and arbitrary metadata digest drift. The historical review checker passes without browser capture. W0 remains blocked pending independent review and CI; this checkpoint claims no new geometry, performance, functional, release, merge, or deployment approval.
