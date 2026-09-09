# Research42: TTV feature-control availability

Base: 4c4c352 in /tmp/opencode/w0-ttv-controls.

## Fix

Initial inert on the existing button container. The existing a11y-state observer also observes style mutations, ignores style changes outside the control container, and sets inert unless the engine explicitly sets inline opacity to 1. No additional observer, stage owner, numerical change, CSS change, or compiled edit.

## Evidence

- `node .scratch/complete-route-experience/research/42-ttv-controls.mjs interactive-explanation .scratch/complete-route-experience/research/42-ttv-before.json --before`: all 18 contexts reproduced undefined.includes at js.6c47f979.js:729:21936.
- The added test in `interactive-explanation/tools/tests/route-html-sync.test.mjs` failed before the fix and passed after. It executes the real adapter in a VM and checks initial inert, one observer, style observation, and repeated visible/hidden transitions.
- `42-ttv-after-final.json`: six viewport/theme cells, three fresh contexts each; all pass startup inert, hidden focus/Tab exclusion, available hidden pointer checks, visible Enter/aria-pressed/boundary updates, repeated Model/Train transitions, and engine-opacity synchronization. Zero page errors. Stages include Model, Validation, Test, Summary, Train, Split, and Introduction. Mobile uses the actual mobile Introduction/Summary sections.
- Pointer acceptance is NOT universally passed: 390px has a Model-stage occlusion; 320px has several occluded stages. The top bar covers Weight's center at 390px; a genuine exposed-pixel click works where available. The probe records pointerBlocks rather than forcing clicks or mutating layout. These require separate layout investigation and baseline authorization.
- `42-ttv-after-002.json` retains center-click failures. `42-ttv-after-003.json` retains an incorrect padding-relative edge-coordinate experiment. The first and fourth attempts exceeded the command timeout; their terminal output is not a completed evidence capture. No passing claim relies on them.
- Some reverse transitions retain engine opacity 1 in Intro/Split. The adapter follows authentic opacity rather than inventing a new stage model.

## Gates

- `node --check train-test-validation/a11y-state.js`: passed.
- `npm run check`: passed.
- `npm run unit`: 371 passed, zero failures.
- `npm run audit`: passed.
- `node interactive-explanation/tools/smoke-bundle.mjs interactive-explanation --route train-test-validation --experience --baseline /tmp/opencode/40-geometry-successor-004.json --verbose`: blocked at `train-test-validation desktop geometry baseline img:9 right shifted by more than 1 CSS px`. Later strict/performance gates are unverified; no baseline was rewritten.

No model source, vendor asset, geometry CSS, or performance baseline was changed. This is a bounded keyboard/availability repair, not full route acceptance.
