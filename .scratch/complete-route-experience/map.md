# Complete Route Experience

Label: wayfinder:map
Status: resolved
Disposition: specs delivered; production implementation not started
Specification: [Authored overhaul and bounded rollout](spec.md)
Execution entry: [Restore release evidence](implementation/01-restore-release-evidence.md)
Release: blocked pending compatible-browser execution and full qualification

## Destination

Establish reproducible benchmarks for the Atlas, shared components, and all 83 manifest Routes, then approve an evidence-led overhaul with an original modern visual identity inspired by the sibling `f1-racing/` product and distinctive, reference-informed interactive storytelling.

The immediate destination is a settled benchmark contract, an honestly labeled current-site evidence snapshot, agent-selected visual and storytelling prototypes, and published implementation-ready specs with staged acceptance gates. The user delegated remaining planning decisions in autopilot; this is not a claim of human prototype review or authorization to deploy. Preserve URLs, user data, factual accuracy, accessibility, provenance, and license obligations.

## Notes

- Scope amended with the user on 2026-09-08: extend this map rather than duplicate it; cover functionality, accessibility, mobile usability, visual consistency, loading cost, interaction responsiveness, and learning clarity. Current-site measurements are the before/after baseline; reference content informs teaching, not a copied appearance.
- The style reference is the sibling `f1-racing/` product, not the `formula-1-racing` Route. Consult [Prototype the broadcast and editorial visual system](../f1-racing-product-evolution/issues/11-prototype-broadcast-editorial-visual-system.md) as inspiration, not a transferred approval or an instruction to reuse racing-specific semantics.
- The user chose the current model after Astra was found unavailable in configuration. No Astra participation is claimed.
- On 2026-09-08 the user requested: "enter autopilot please finish all wayfinder and ship specs". This explicitly overrides the one-decision-per-session workflow and live-review requirements for the remaining planning tickets: settle them sequentially using delegated agent judgment, record actual evidence and limitations, and publish local specs. Do not impersonate human approval. Measurement and disposable prototypes are authorized to support these decisions; production implementation, commits, deployment, dependency installation, and replacement of approved baselines remain outside this request.
- Completed decisions below remain historical evidence, not blanket authority for the expanded redesign. [Reconcile the original overhaul with completed Route work](issues/30-reconcile-overhaul-scope.md) governs conflicts with their appearance, behavior, content, geometry, acceptance, and execution constraints. Historical uncompleted migration and closure tickets are retired as superseded, not implemented; the published execution packages replace them without authorizing production changes.
- Use the canonical Atlas, Route, Guided Path, Progress, Learning Guide, and Suggested Next Route vocabulary from `CONTEXT.md`. Progress remains exclusive to Guided Paths unless separately approved.
- Remaining visual identity, storytelling, and rollout planning choices are agent-selected under the user's autopilot delegation, superseding the earlier live human approval cadence for this specs-only delivery. Human review remains available, not falsely recorded. Do not claim improved learning outcomes without learner evidence.
- Keep static delivery and authored adaptation seams by default. No framework rewrite, new runtime dependency, vendored/minified/bundled/archive edit, or intrinsic renderer replacement is authorized by this extension.
- Preserve URLs, user data, security, accessibility, factual accuracy, and provenance/license obligations. Proposed content, interaction, layout, and theme changes require explicit scope and regression evidence rather than a silent relaxation of old gates.
- Work from the parent `interactive-note` Git repository; the nested repository has divergent history. Preserve unrelated working-tree changes. Do not commit, deploy, overwrite approved baselines, or install dependencies without explicit authorization; historical ticket requests for atomic commits are not current authorization.
- Consult `grilling` and `domain-modeling` for decisions, `prototype` for live design reviews, `web-perf` for performance investigation, and `code-review` for implementation review. Use available skills only.

## Decisions so far

- [Research safe shell isolation and full UI theming](issues/01-research-shell-isolation-and-theming.md) — use additive authored seams, explicit selector boundaries, namespaced tokens, declared theme ownership, and root-scoped adapters; intrinsic and opaque runtimes stay isolated.
- [Research complete-experience acceptance gates](issues/02-research-complete-experience-gates.md) — make the manifest the experience source of truth and require exact all-Route theme, navigation, interaction, geometry, accessibility, network, visual, performance, and full-suite gates.
- [Research the Suggested Next Route map](issues/03-research-suggested-next-route-map.md) — a static candidate covers all 83 Routes with no self-links or missing targets; the matrix exposed one Music Guided Path conflict and one undocumented engineering loop for the contract decision.
- [Build the authoritative Route migration matrix](issues/04-build-authoritative-route-matrix.md) — all 83 Routes now have evidence-backed shell, runtime-boundary, UI-theme, intrinsic-exclusion, candidate-navigation, continuation, smoke-gap, risk, and provisional-wave records.
- [Choose the canonical shell isolation model](issues/05-choose-shell-isolation-model.md) — keep body metadata and body-level chrome as the universal seam, preserve each Route's existing main/runtime placement, and permit only declared family-root adapters instead of wrappers or global styling.
- [Choose the canonical theme adapter model](issues/06-choose-theme-adapter-model.md) — apply one pre-paint saved-theme contract, classify every Route as shell-only, runtime-hook, or fixed-runtime, and permit only namespaced root-scoped adapters with explicit iframe-child migrations.
- [Assign Route navigation modes and ownership boundaries](issues/07-assign-route-navigation-modes.md) — assign all 83 Routes exactly once across 43 generated, 15 native, and 25 none modes, with explicit native-control contracts and opaque runtime boundaries.
- [Lock the acceptance and rollback contract](issues/08-lock-acceptance-and-rollback-contract.md) — require exact per-family and 83-Route static, viewport, theme, interaction, geometry, accessibility, network, performance, and full-suite gates with atomic rollback.
- [Lock the Suggested Next Route contract](issues/09-lock-suggested-next-route-contract.md) — adopt one manifest-owned continuation per Route, preserve the published Music edge, remove the undocumented engineering loop, and keep ordinary continuations separate from Progress.
- [Sequence family execution and graduate implementation tickets](issues/10-sequence-family-execution.md) — establish four foundation commits followed by 14 complete family slices from authored HTML to opaque runtimes and one repository-wide close gate.
- [Encode the manifest experience contract](issues/11-encode-manifest-experience-contract.md) — make the manifest authoritative for all 83 Route shell, theme, surface, interaction, network, and Suggested Next Route declarations; validate exact schema and cross-Route invariants while preserving generated `pages.json` parity.
- [Synchronize universal Route HTML seams](issues/12-synchronize-universal-route-html-seams.md) — deterministically synchronize canonical body metadata and shared theme/Sandbox assets across all 83 top-level Routes while preserving authored main/runtime placement, script order, child documents, and parity evidence.
- [Render shared Route and Atlas continuation UI](issues/13-render-shared-continuation-ui.md) — consume the canonical manifest to render one accessible local continuation on every Route and Atlas card while preserving subpath URLs, footer geometry, focus behavior, and Guided Path Progress isolation.
- [Enforce complete-experience acceptance gates](issues/14-enforce-complete-experience-gates.md) — freeze manifest-driven viewport, theme, navigation, continuation, surface, accessibility, network, persisted geometry, and comparative performance gates; keep strict `--experience` checks scoped to migrated Routes and baseline recording explicit and atomic.
- [Migrate local hubs and Guided Paths](issues/15-migrate-local-hubs-and-guided-paths.md) — theme authored Music, Primary, and Blockchain bridge surfaces; preserve numbered Music and Blockchain Progress, keep Primary unnumbered, and verify manifest navigation, continuation, parity, and complete-experience gates.
- [Migrate MLU Explain Routes](issues/16-migrate-mlu-routes.md) — migrate all ten MLU Routes with exact-family authored-surface theming, manifest chapters for nine Routes, the preserved responsive native TOC for Train/Test/Validation, intrinsic compiled scenes, Route-owned cold-jump compatibility for Bias-Variance, and green focused, family, static, and full smoke gates.
- [Migrate Explained Visually Routes](issues/17-migrate-explained-visually-routes.md) — migrate all nine Explained Visually Routes with exact-family authored-surface theming, manifest-owned generated chapters, intrinsic runtime and MathJax output, authored-root narrow containment, and green focused, family, static, and full smoke gates.
- [Migrate authored engineering longforms](issues/18-migrate-authored-engineering-longforms.md) — migrate all 11 authored engineering longforms with exact-route authored-surface theming, manifest-owned generated chapters, preserved media and interaction geometry, the canonical Lights and Shadows continuation, and green static, focused strict experience, Bicycle regression, and full 83-Route smoke gates.
- [Migrate systems Routes](issues/19-migrate-systems-routes.md) — migrate all four systems Routes with exact manifest chapters, canonical SamWho runtime hooks, authored-only Hysteresis theming, intrinsic Nuxt/WebGL output, preserved state and geometry, and green static, focused strict experience, final review, and full 83-Route smoke gates.
- [Migrate Anders Brownworth labs](issues/20-migrate-anders-labs.md) — migrate all three Anders labs with declared authored runtime roots, semantic Bootstrap state theming, native keyboard-owned navigation, intrinsic jVectorMap output, preserved cryptographic behavior and dimensions, and green static, focused strict experience, final review, and full 83-Route smoke gates.
- [Migrate Teoria practice Routes](issues/21-migrate-teoria-practice-routes.md) — migrate all six Teoria practices with an exact generated-DOM theme hook, intrinsic audio/notation exclusions, preserved mount and score state, pointer/keyboard reveal parity, and green static, focused strict experience, final review, and full 83-Route smoke gates.
- [Migrate Ableton Learning Music Routes](issues/22-migrate-ableton-music-routes.md) — migrate all seven Ableton Learning Music Routes with declared widget runtime hooks, exact local sample and synchronization checks, preserved sequencer geometry and intrinsic grid paint, and green static, focused strict experience, final review, and full 83-Route smoke gates.
- [Migrate Ableton Learning Synths Routes](issues/23-migrate-ableton-synths-routes.md) — migrate all six Ableton Learning Synths Routes through the exact lesson runtime seam with archived runtime-token identities, native keyboard TOC navigation, preserved React/RNBO behavior and geometry, both `musicmap` continuations, and green static, focused strict experience, final review, and full 83-Route smoke gates.

- [Reconcile the original overhaul with completed Route work](issues/30-reconcile-overhaul-scope.md) — approve original authored redesign in both themes and measured reflow with human prototype approval; retain runtime, data, accessibility, and provenance safeguards, and reconcile unfinished legacy work at rollout.

- [Define the all-Route component benchmark contract](issues/31-define-component-benchmark-contract.md) — use manifest-driven checks plus an all-Route lab snapshot, distinguish measured/reviewed/blocked coverage, and retain inherited limits until rollout; settled by delegated agent judgment.

- [Capture the current-site benchmark evidence](issues/32-capture-current-site-benchmark.md) — capture 504/504 passive cells and representative repeats; static/unit checks pass, while smoke launch and deeper interaction/device coverage remain blocked and explicit.

- [Prototype the F1-inspired visual system](issues/33-prototype-f1-inspired-visual-system.md) — select Editorial brief in both themes by delegated agent judgment; three structural variants pass 18/18 prototype cells, with engine integration and human review not claimed.

- [Prototype original interactive storytelling](issues/34-prototype-original-storytelling.md) — select intent-shaped essay, lab, and practice patterns; computed/stateful demos pass 12/12 pure-check groups and 6/6 theme/viewport cells without claiming learner validation.

- [Approve the evidence-led overhaul rollout](issues/35-approve-overhaul-rollout.md) — publish the master spec and seven sequential implementation packages covering 83 Routes exactly once; retire legacy execution, retain budgets and rollback safeguards, and keep release qualification blocked pending real evidence.

## Not yet specified

None for this specs-only planning destination. [Restore release evidence](implementation/01-restore-release-evidence.md) owns the observed signal investigations; [Final qualification](implementation/07-final-qualification.md) owns outstanding release evidence. New opaque-runtime, license, or materially out-of-scope discoveries must open a new decision, not silently expand this completed map.

## Out of scope

- Product implementation and release during this specs delivery; the [master specification](spec.md) and [execution packages](implementation/) are the handoff, not shipped UI.
- [Migrate NCase games and tools](issues/24-migrate-ncase-games-and-tools.md) and [Migrate NCase iframe and nested Routes](issues/25-migrate-ncase-iframe-routes.md) are superseded, not implemented; their execution belongs to Opaque Route slices beyond the planning destination.
- [Migrate compiled music and QR tools](issues/26-migrate-compiled-music-and-qr-tools.md), [Migrate binary engineering and watch Routes](issues/27-migrate-binary-engineering-and-watch-routes.md), and [Migrate the stargazing dashboard](issues/28-migrate-stargazing-dashboard.md) are superseded, not implemented; their execution and safeguards belong to Opaque Route slices.
- [Close the complete Route experience](issues/29-close-complete-route-experience.md) is superseded by Final qualification; production acceptance is not a prerequisite for delivering an honestly gated spec and has not passed.
- Redesigning or modifying the sibling `f1-racing/` product itself.
- A framework migration, runtime replacement, or edits to minified, bundled, archived, or vendored assets without a separately approved scope change.
- Breaking URLs, discarding user data, weakening accessibility/security, or removing required attribution/license material to obtain a new look.
- Adding accounts, analytics, completion tracking, or persistent Progress to ordinary Routes.
- Personalized or tag-inferred recommendations; Suggested Next Route remains explicitly curated.
- Claiming exhaustive element coverage from sampled checks, field Core Web Vitals from lab runs, or proven learning gains from an editorial review.
