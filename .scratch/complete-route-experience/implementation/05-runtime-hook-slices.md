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

## Flattened repository port — 2026-09-13

Imported append-only from the frozen parent integration at `6111af8d7a53a1e716f3b7b784072c3c55c3d45a` plus authored edits onto live `bbf680a92b25adbf5ca302268d7e7a94dec06cc8`. Earlier header status is historical: all 22 authored route/parity pairs are implemented; W3 acceptance remains open. Parent `interactive-explanation/` paths map to this repository root; parent Git commands and reported checks remain historical parent-context evidence. Use root npm scripts and `node tools/smoke-bundle.mjs .` here. Only the public-private-keys summary replacement was ported; its preexisting parent head formatting remains solely in the parent. No browser or acceptance result is implied by this port.

## 2026-09-13 authored-source checkpoint

User explicitly authorized the redesign and proceeding with W0 timing/review unresolved; browser execution is deferred to the parent, not waived as acceptance. Worktree: `/tmp/opencode/complete-route-integration`; base HEAD `6111af8d7a53a1e716f3b7b784072c3c55c3d45a`. Current family: samwho-essay, final authored slice. All 22 authored indexes and matching parity records changed; no route remains untouched in this source pass. All 22 still require W3 runtime/visual acceptance.

Exact source-pass slices (one family, at most three members; these are not passing browser slices):

1. ableton-synths: `ableton-learning-synths-get-started`.
2. ableton-synths: `ableton-learning-synths-how-synths-make-sound`, `ableton-learning-synths-filter-resonance`, `ableton-learning-synths-modulating-amplitude-with-envelopes`.
3. ableton-synths: `ableton-learning-synths-matching-envelopes`, `ableton-learning-synths-recipes`.
4. teoria-practice: `teoria-interval-ear-training`, `teoria-note-ear-training`, `teoria-key-and-note-ear-training`.
5. teoria-practice: `teoria-random-key-and-note-ear-training`, `teoria-interval-identification-and-inversion`.
6. ableton-practice: `ableton-learning-music-playground`, `ableton-learning-music-play-with-beats`, `ableton-learning-music-play-with-notes-and-scales`.
7. ableton-practice: `ableton-learning-music-play-with-chords`, `ableton-learning-music-play-with-basslines`, `ableton-learning-music-play-with-melodies`.
8. ableton-practice: `ableton-learning-music-play-with-song-structures`.
9. anders-lab: `public-private-keys`, `zero-knowledge-proof-demo`.
10. samwho-essay: `memory-allocation`, `load-balancing`.

### Owned files, preimages and deltas

For every exact slug above, own only `interactive-explanation/<slug>/index.html` authored prose and `interactive-explanation/docs/<slug>/parity.json` new leading package05 entry, plus this checkpoint. All other route/parity preimages were clean at base HEAD. Existing shared CSS/JS, Atlas, W0 checkpoint/research changes and node_modules were already dirty/untracked and remain parent-owned. No shared files, manifests, baselines, engines, minified assets, dependencies, comments or commits added or edited by this pass.

- Synths: only the existing `#runtime-error-message` text outside `#app` changed. New persistent orientation cannot be geometry-certified without parent probes, so no wrapper, app content, viewport dimensions, styles or runtime script changed. Orientation is explicitly fallback-only; it does not claim a visible ready-state hero. Expanded fallback text needs narrow/error-state overlap review before acceptance.
- Teoria: existing reason paragraphs now explain interval number/quality, note/reference comparison, tonic changes and simple-interval inversion rules, with bounded score/learning claims. Generated mounts, answer/reveal/retry, score, saves and audio remain untouched.
- Ableton music: existing hero summaries ask one comparative task with consequence/reason/limits. Song structures remains a static primer and its action now says Read song forms. No sequencer, transport, gesture, export, state or grid configuration changes.
- Anders: key summary warns about cookie-backed disposable demo keys and distinguishes key ownership from personal identity. Map summary and nearby percentage caption identify selective disclosure, the illustrative formula, missing adjacency/commitment checks and reset scope; percentage engine and state unchanged.
- Samwho: existing summaries explain fragmented contiguous space and unequal service times under model limits. Article, canvas, backing dimensions, timelines, simulation controls and hooks untouched.
- Resources: zero new requests, assets or payload classes intended; only HTML text and docs JSON bytes change. No transfer/timing measurement claimed. Text can change authored wrapping and vertical offsets; those remain unapproved geometry pending paired evidence.

### Preexisting overlapping hunk: public-private-keys

The initial dirty diff was whitespace-only: split color-scheme/theme-init lines and closing style/Sandbox link/head lines. Those exact bytes remain intact. The owned summary replacement is in the body on the same long line as the preexisting closing-head change, so Git may present a combined hunk. Report/reverse the summary string separately; do not restore or normalize the head, and do not treat that entire hunk as package05-owned. No semantic overlapping edit was made.

### Checks and applicability

- `rtk npm run check` from `interactive-explanation/`: PASS (configured syntax suite; no separate lint/typecheck script).
- `rtk npm run unit`: PASS, 373/373 tests, zero failures/skips. Existing fixture tests do not constitute runtime or accessibility acceptance.
- `rtk npm run audit`: PASS for the current integrated tree.
- `rtk git diff --check`: PASS. Synth diff statistics confirm one text-line replacement per route. Environment: Linux, Node v24.20.0, npm 11.19.0.
- No browser launched, no smoke/baseline recorded, no install, no commit. Shared assets are concurrently parent-owned, so static results identify this integrated session, not an isolated release build.
- Each changed parity file has route-specific source-reviewed applicability and retained-history qualifications. Playback, generated feedback, focus/touch, device recovery, reveal/retry availability, exports and state retention remain probes, not fabricated passes. Song-structures playback/score/arranger exports are not applicable because no arranger is mounted.

### Remaining exact work and next action

No additional index/parity source-pass member remains; acceptance remains open for every exact slug in slices 1–10. Parent must review source drift/combined key hunk, reproduce synth readiness and fallback at 320px, and decide whether a safe visible ready-state seam is needed. Run serial focused strict and lifecycle probes for each bounded slice, both themes at 1400×1000, 390×844 and 320×844, followed by full regression. Carry system/saved/storage-denied themes, reduced motion/zoom, keyboard/pointer/touch, audio-device and assistive-technology limits, native navigation/continuation, paired geometry/performance and W0 timing/review into qualification. No baseline successor approved and no W3/W4/release closure claimed.
