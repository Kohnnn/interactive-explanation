# 05 Runtime-hook slices

Status: ready-for-agent
Spec: [Master specification](../spec.md)
Blocked by: [04 Owned Route slices](04-owned-route-slices.md)
Execution: not started
Wave: W3 — exactly 22 Routes

## Exact membership by canonical family

- anders-lab (2): `public-private-keys`, `zero-knowledge-proof-demo`
- teoria-practice (5): `teoria-interval-ear-training`, `teoria-note-ear-training`, `teoria-key-and-note-ear-training`, `teoria-random-key-and-note-ear-training`, `teoria-interval-identification-and-inversion`
- ableton-practice (7): `ableton-learning-music-playground`, `ableton-learning-music-play-with-beats`, `ableton-learning-music-play-with-notes-and-scales`, `ableton-learning-music-play-with-chords`, `ableton-learning-music-play-with-basslines`, `ableton-learning-music-play-with-melodies`, `ableton-learning-music-play-with-song-structures`
- ableton-synths (6): `ableton-learning-synths-get-started`, `ableton-learning-synths-how-synths-make-sound`, `ableton-learning-synths-filter-resonance`, `ableton-learning-synths-modulating-amplitude-with-envelopes`, `ableton-learning-synths-matching-envelopes`, `ableton-learning-synths-recipes`
- samwho-essay (2): `memory-allocation`, `load-balancing`

Every row is runtime-hook in the [snapshot](../research/35-route-rollout.json). Retain hooks from completed migration work; the two hook pilots belong only to package 03. Atlas is not implemented here.

## Scope and first slice

After W2 closure, take at most three Routes of one canonical family per slice. First slice: ableton-learning-synths-get-started alone, reproducing narrow controls at runtime readiness before adapting them.
Then finish synth slices before the remaining families. Preserve actual lesson/practice/essay intent, generated-control lifecycle, native navigation and declared theme hooks.
Use exact authored roots and supported hook APIs; never copy prototype descendant CSS into engines or remount on theme toggle.
Keep sequencer timing, local samples, gesture-gated playback, cryptographic behavior, notation, score/work state and renderer backing dimensions unchanged.
Reproduce missing Ableton continuation signals after lifecycle readiness; treat 68px synth overflow and other captured cells as evidence to investigate, not certified failures of every engine.
Adapt questions and recoverable feedback around authentic behavior; no new lesson controller, fake audio, analytics, fonts or runtime dependencies.

## Observable acceptance

- Both themes, all three viewports and applicable master states remain usable under keyboard/pointer/touch, system/saved preference, reduced motion and zoom.
- Starting/stopping/replaying audio, unavailable-audio recovery, editing during playback, answer/reveal/retry and existing scoring retain supported behavior; no duplicate event or score mutation after generated mounts.
- Native controls retain focus and arrow ownership; textual states explain invalid/correct/playing/stopped conditions without color alone. Targets/contrast meet the master AA criteria and 44px design target.
- Theme/reflow retains local data, runtime state, grid/notation dimensions, pointer mapping, URLs, declared next targets and Guided Path-only Progress.
- Zero new unexpected runtime/network failures, unexplained geometry or masked overflow. Declare resource deltas; paired three-context measurements in the same provisioned environment meet inherited DCL/load and transfer ceilings.
- Preserve attribution/license requirements and truthful parity records even if an audit needs narrow reconciliation. No claim that shell checks certify child or intrinsic accessibility.

## Commands and checkpoints

From parent `interactive-note/` root, select every current slice member by exact Route flag:
`npm --prefix interactive-explanation run check`
`npm --prefix interactive-explanation run unit`
`node interactive-explanation/tools/check-public-surface.mjs interactive-explanation`
`node interactive-explanation/tools/smoke-bundle.mjs interactive-explanation --route <slug> --experience`
`node interactive-explanation/tools/smoke-bundle.mjs interactive-explanation`
Require focused lifecycle/audio probes and strict gates before each next slice; full smoke after shared changes and at W3 closure. Retain unsupported/blocked audio-device and assistive-technology coverage for final qualification.
Append completed/remaining exact slugs, current family, owned preimages/hunks, source/environment identity, results/evidence, baseline decisions, gaps and next action here each session.
Resume from the last passing slice after drift checks. Stop for required opaque edits, uncertain license, state loss, hard regression or overlapping dirty work; rollback only owned hunks, never user data or baseline history.
Package 06 begins only after all 22 Routes and W3 gates pass. Routine matching agent review needs no new design interview; material out-of-scope deviations need a human decision. No automatic install, commit, deployment, or release.
