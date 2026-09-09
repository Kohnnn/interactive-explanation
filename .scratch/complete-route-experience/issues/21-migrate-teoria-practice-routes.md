# Migrate Teoria practice Routes

Type: task
Status: resolved
Blocked by: 20

## Question

Complete and verify `teoria-interval-ear-training`, `teoria-note-ear-training`, `teoria-key-and-note-ear-training`, `teoria-random-key-and-note-ear-training`, `teoria-scale-construction`, and `teoria-interval-identification-and-inversion`. Theme authored practice frames and verified exercise DOM while preserving audio preload, notation output, score state, keyboard behavior, and vendored mounts. Update parity records and leave one atomic family commit after focused and full gates.

## Answer

Migrated all six Teoria practices through the existing `.story-practice-surface` runtime hook. The exact family adapter themes authored frames and stable generated Bootstrap exercise DOM while excluding audio, notation canvas/image pixels, and vendored internals. A non-vendored accessibility bridge gives the generated reveal button matching Enter/Space and pointer semantics without replacing its authored click handler. All five mounts, 63-sample local preload, answer and score state, notation redraw, intrinsic dimensions, and local-only networking remain Route-owned.

Verified with `npm test` (363 passing tests), metadata synchronization, policy and syntax checks, `git diff --check`, the combined six-Route strict experience gate, the full 83-Route smoke suite under reversible scheduler isolation, and final green Standards/Spec reviews.
