# Migrate local hubs and Guided Paths

Type: task
Status: resolved
Blocked by: 14

## Question

Complete and verify `music-interactive-hub`, `primary-interactive-hub`, and `blockchain-101-combined-flow`. Theme all authored HTML, fit declared navigation, render continuation, preserve numbered 30-day Progress only on the published Music and Blockchain paths, and prove `primary-interactive-hub` remains an unnumbered editorial Guided Path. Update parity records and leave one atomic family commit after focused and full gates.

## Answer

Migrated all three local Guided Paths with Route-scoped token adapters for authored light/dark surfaces, manifest-owned generated chapters for Music and Primary, preserved no-nav behavior for Blockchain, one manifest continuation per Route, and updated parity evidence.

`music-interactive-hub` retains its five-step local 30-day Progress and sharing contract. `blockchain-101-combined-flow` retains its three-step local 30-day Progress and sharing contract with `data-story-nav="none"`. `primary-interactive-hub` keeps generated chapter links but hides chapter counts, numbered positions, and scroll-progress chrome; it has no Progress metadata, Start/Resume controls, numbered steps, or Progress writes.

Verified with 283 focused static tests, the three-Route strict `--experience` gate, a computed light/dark authored-surface contrast probe, `npm test` with 362 passing tests, the public-surface and syntax checks included there, `git diff --check`, and the full 83-Route `npm run smoke` suite with persisted geometry and comparative performance enforcement.
