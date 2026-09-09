# Migrate Ableton Learning Music Routes

Type: task
Status: resolved
Blocked by: 21

## Question

Complete and verify `ableton-learning-music-playground`, `ableton-learning-music-play-with-beats`, `ableton-learning-music-play-with-notes-and-scales`, `ableton-learning-music-play-with-chords`, `ableton-learning-music-play-with-basslines`, `ableton-learning-music-play-with-melodies`, and `ableton-learning-music-play-with-song-structures`. Theme only the authored frame and verified widget DOM; preserve archived widget synchronization, grids, transport, samples, audio, and intrinsic output. Update parity records and leave one atomic family commit after focused and full gates.

## Answer

Migrated all seven Ableton Learning Music Routes through declared runtime hooks: `.playground-route-shell` owns Playground, while `.story-practice-surface` owns the six lesson Routes. The root-scoped family adapter themes authored frames and generated widget controls without changing vendored assets, runtime geometry, or intrinsic sequencer output. Exact widget hydration, recorder links, shared-transport joins, pointer and keyboard transport parity, local sample banks, Tone context state, grid counts, SVG geometry, post-interaction paint, and stored light/dark intrinsic grid paint remain verified.

Verified with `npm test` (363 passing tests), metadata synchronization, policy and syntax checks, `git diff --check`, the combined seven-Route strict experience gate, the full unfiltered 83-Route smoke suite under reversible scheduler isolation, and final green Standards/Spec reviews.
