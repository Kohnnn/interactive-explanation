# Sequence family execution and graduate implementation tickets

Type: grilling
Status: resolved
Blocked by: 07, 08, 09

## Question

In what family order should implementation proceed to maximize reusable learning and minimize regression risk? Define atomic commit boundaries, prerequisites, parallel-safe groups, and the exact implementation tickets that should graduate from the map's fog.

## Answer

Build the universal contract once, freeze shared seams, then migrate from authored low-risk HTML toward opaque and geometry-sensitive runtimes.

### Foundation

1. [Encode the manifest experience contract](11-encode-manifest-experience-contract.md).
2. [Synchronize universal Route HTML seams](12-synchronize-universal-route-html-seams.md).
3. [Render shared Route and Atlas continuation UI](13-render-shared-continuation-ui.md).
4. [Enforce complete-experience acceptance gates](14-enforce-complete-experience-gates.md).

Each foundation ticket is one atomic commit. The fourth ticket freezes shared manifest, synchronizer, shell, theme, continuation, and smoke interfaces. Later family work may add only root-scoped family adapters, Route-owned styles, parity evidence, and probe declarations. A newly discovered shared defect returns to a separate foundation fix rather than being hidden in a family commit.

### Family order

Default single-worker order:

1. [Migrate local hubs and Guided Paths](15-migrate-local-hubs-and-guided-paths.md) — prove static semantics and Progress separation.
2. [Migrate MLU Explain Routes](16-migrate-mlu-routes.md).
3. [Migrate Explained Visually Routes](17-migrate-explained-visually-routes.md).
4. [Migrate authored engineering longforms](18-migrate-authored-engineering-longforms.md).
5. [Migrate systems Routes](19-migrate-systems-routes.md).
6. [Migrate Anders Brownworth labs](20-migrate-anders-labs.md).
7. [Migrate Teoria practice Routes](21-migrate-teoria-practice-routes.md).
8. [Migrate Ableton Learning Music Routes](22-migrate-ableton-music-routes.md).
9. [Migrate Ableton Learning Synths Routes](23-migrate-ableton-synths-routes.md).
10. [Migrate NCase games and tools](24-migrate-ncase-games-and-tools.md).
11. [Migrate NCase iframe and nested Routes](25-migrate-ncase-iframe-routes.md).
12. [Migrate compiled music and QR tools](26-migrate-compiled-music-and-qr-tools.md).
13. [Migrate binary engineering and watch Routes](27-migrate-binary-engineering-and-watch-routes.md).
14. [Migrate the stargazing dashboard](28-migrate-stargazing-dashboard.md).
15. [Close the complete Route experience](29-close-complete-route-experience.md).

Each family ticket covers every named Route or none, leaves one verified atomic commit, and runs focused plus full gates before commit. No partial-family commit is accepted.

### Parallel-safe lanes

After the local-hub proof, four lanes may run in separate worktrees: prose (`16` → `17` → `18` → `19`), controls/audio (`20` → `21` → `22` → `23` → `26`), NCase (`24` → `25`), and intrinsic/high-risk (`18` → `27` → `28`). Route HTML, Route-owned CSS, parity files, and family adapter files are disjoint. `routes.manifest.json` and generated `pages.json` are merge hotspots: rebase first, edit only assigned entries, regenerate `pages.json`, run all gates, then serialize commits onto `main`. Shared files are not parallel-safe after foundation freeze.

The 14 family tickets cover all 83 manifest slugs exactly once: 3 + 10 + 9 + 11 + 4 + 3 + 6 + 7 + 6 + 7 + 6 + 3 + 7 + 1.

Skipped: a rewrite wave and a universal runtime adapter. Add a new ticket only for a proven shared-contract defect or an independently owned iframe-child migration.
