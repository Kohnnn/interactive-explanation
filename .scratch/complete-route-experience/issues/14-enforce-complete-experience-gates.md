# Enforce complete-experience acceptance gates

Type: task
Status: resolved
Blocked by: 08, 11, 12, 13

## Question

Turn the locked acceptance contract into reusable static and Playwright gates: all three viewports, stored and system theme states, declared navigation, continuation placement, primary/runtime geometry, deterministic interaction or read-only probes, keyboard/focus/accessibility checks, network policy, and comparative performance evidence. Extend existing Node and smoke tooling rather than adding a framework. Establish approved baselines, cover `crowds`, and leave focused plus full commands green before freezing shared interfaces.

## Answer

Extended the existing smoke harness with manifest-driven complete-experience gates for 1400×1000, 390×844, and 320×844 viewports; stored and system light/dark states; generated, native, and none navigation; Suggested Next Route placement; primary/runtime and intrinsic geometry; explicit read-only probes; accessibility; declared network policy; and three-run comparative performance. Default smoke now enforces approved performance and persisted geometry for all selected Routes; `--experience` adds strict migrated-Route state gates, and `--record-baseline` atomically records only explicit Route/group selections while allowing pre-migration viewport fit to remain red.

Added strict version-2 baseline validation, stable merge/serialization helpers, 11 focused unit tests, and approved evidence for 83 Routes, 166 Route-theme performance states, and 249 Route-viewport geometry states. Geometry records exact rectangles, CSS size/transform/touch/pointer ownership, aspect ratios, and intrinsic canvas/iframe/SVG/image/video dimensions. `crowds` now has a deterministic initial read-only scenario. Long docs provenance tokens wrap without affecting Route runtimes.

Review accepted persisted cross-commit geometry, complete system-theme checks, runnable all-Route recording, visible native-control and none-mode dominance assertions, and shared helper cleanup. Review rejected mandatory state-changing probes before family migrations, treating primary surfaces as focusable controls, removing default performance/geometry enforcement, invalidating active `claimed` status, and requiring an all-Route strict migration run before Routes are migrated.

Verified with `npm test` (361 passing tests), focused `--experience` runs covering generated, native-link, native-iframe, native-peer, and none modes, three consecutive enforced `interactive-mechanical-watch` repetitions after evidence recalibration, the public-surface audit, syntax checks, stable 83/166/249 baseline validation, final Standards/Spec reviews, `git diff --check`, and the full 83-Route `npm run smoke` suite.
