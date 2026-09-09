# Complete Route Experience: authored overhaul and bounded rollout

Status: in-progress
Decision state: original design retained with the explicit implementation amendments below
Release: BLOCKED — CI qualification and remaining execution packages outstanding
Delivery: implementation in progress; not released UI
Implementation authorization: user-authorized implementation, installation, commits and PR publication; deployment not authorized
Parent: [Complete Route Experience map](map.md)
Rollout snapshot: [Exact 83-Route partition](research/35-route-rollout.json)

`ready-for-agent` means ready to implement when the user requests implementation; design decisions are settled, not awaiting another design interview. This specs-only delivery starts no execution. A subsequent implementation request authorizes routine matching code edits without repeated confirmation; installation, commits, and deployment still require their own authorization. Material out-of-scope deviations require a human decision. Routine matching work and baseline successors receive recorded agent review, never falsely attributed human approval.

## User-approved implementation amendments

These amendments supersede conflicting historical planning restrictions only for the scope stated here. Historical measurements and failures below remain historical evidence, not current qualification.

- The user selected **Original replacement** for `rigid-body-collisions`: independently written code and teaching content at the same public URL, with tested physics and explicit limits. The replacement is a one-dimensional two-cart collision lab, not a reproduction of the unavailable multidimensional article. It uses conservation of momentum and restitution, distinguishes non-approaching carts, and discloses omitted rotation, deformation and collision duration. The old compiled application and its assets are removed from the active route. No permission to copy unavailable upstream material is implied. This is the only authorized exception to the no-runtime-replacement restriction.
- The replacement receives independent mathematical, accessibility, interaction, geometry and resource review. Its output is not compared for equivalence to the broken archived engine. A failed archived initialization is not an acceptable performance baseline. Any replacement-specific admission contract must be explicit and independently reviewed; absent comparable evidence remains unqualified.
- The user selected **Configure CI qualification**. Timing comparisons run against immutable PR base/head inputs on the same runner and browser, with three fresh samples per side and cell, retained raw samples, same-source calibration and variance checks. Existing regression allowances remain unchanged. Noisy or failed measurements remain blocked/inconclusive. Historical local timing references are not promoted into CI acceptance. Functional, geometry and performance qualification remain separate required obligations, not interchangeable passes.
- Publication target is **https://github.com/Kohnnn/interactive-explanation**, through a PR for the user's approval. This repository's root is the product root: application commands use `.` rather than the former parent `interactive-explanation/` prefix. Parent-repository commit references and external evidence locations identify historical inputs; they are not assumed available to a fresh CI checkout.
- W0 still gates packages 02–07. Creating a draft PR or replacing the failed route does not complete W0, authorize deployment, or waive final qualification. The user approves the PR; do not merge it remotely on their behalf.

## Problem Statement

A learner can discover 83 independently launchable Routes through the Atlas, but the collection spans essays, simulations, labs, practice activities, creation tools, and Guided Paths with different runtime ownership. Reusable shell work exists, yet a common visual treatment alone cannot make every experience understandable, usable on narrow screens, or honest about what its model demonstrates. Learners need one clear question or task, readable evidence, purposeful controls, recoverable interactions, and a useful next step without flattening every Route into an essay.

Current evidence identifies investigation priorities, not a completed quality certification. The passive snapshot captured **504/504 cells**: Atlas plus 83 Routes, three viewports, two stored themes. Its 514 total samples include limited representative repeats. Captured is not passed. There are **42 overflow cells**, reaching **68px** on all six Ableton synth Routes at 320px in both themes. Missing visible `musicmap` primary surfaces and `anxiety` continuations require runtime-readiness triage; intermittent Ableton music continuation signals do too. The `rigid-body-collisions` favicon and `markov-chains` child request require separate investigations.

Existing syntax/policy checks and 363 unit tests passed for the then-dirty tree. **The full 83-Route smoke gate is unfulfilled: both full and strict MLU attempts failed at browser launch, with zero Route checks executed.** A passive Chromium 151 snapshot collected through an explicitly selected mismatched revision is not a substitute. Keyboard, touch, system fallback, reduced motion, semantic accessibility, child states, real devices, cross-browser behavior, and learner outcomes were not established.

## Solution

Deliver this master specification, a manifest-derived rollout snapshot, and seven execution work packages. Adapt the Atlas and owned Route surfaces when implementation is requested, preserving working engines and distinct teaching modes. Use shared authored CSS and selective prose/control improvements at existing seams rather than a new component platform or wholesale rewrite.

Selected visual A, **Editorial brief**, draws from the sibling `f1-racing/` product's modern broadcast/editorial restraint, not the `formula-1-racing` Route. Both light and dark are fully supported: one dominant question, fine rules, whitespace, fewer decorative panels, system sans UI/body, serif headlines, and mono metadata. Orange marks actions and blue explanatory data, with visible labels rather than racing semantics or the sibling's Recorded/Derived mapping. Decision 33 settles the tokens and geometry below. Workbench is a justified tool-first exception and Reading room a prose-heavy exception, not competing universal defaults.

Decision 34 selects **intent-shaped question, action, consequence, reason, and optional transfer** as shared ingredients, not a required wizard. Essays orient and compare before interpreting; labs lead with manipulation, dependency feedback, and recovery; practice offers a short prompt and recoverable explanatory feedback. Opaque experiences keep intrinsic pacing with bounded authored orientation and continuation. The three sample prototypes demonstrate these principles, not production runtime replacements. Prototype checks support agent selection; they do not establish production compatibility, human approval, or learning gains.

## User Stories

1. As a new learner, I want the Atlas to explain what each Route lets me do, so that I can choose an explanation, simulation, practice activity, or creation tool deliberately.
2. As a returning learner, I want existing Route URLs and deep links to continue working, so that saved references still take me to the intended activity.
3. As a learner, I want one question or task to dominate the opening view, so that I know where to begin.
4. As a reader, I want headings, readable copy, and restrained visual grouping, so that I can distinguish the argument from controls and supporting detail.
5. As a light-theme user, I want every authored state to remain readable and usable, so that the redesign does not favor dark mode at my expense.
6. As a dark-theme user, I want legible controls, feedback, and explanatory data, so that low-light reading does not obscure meaning.
7. As a returning visitor, I want my saved theme applied before first paint and preserved across Routes, so that navigation does not reset my preference or flash the wrong theme.
8. As a visitor without a saved preference, I want the existing system-theme fallback and storage-failure behavior preserved, so that the interface remains usable without configuration.
9. As a narrow-screen learner, I want content and controls to reflow in reading order, so that I can reach every action without hidden clipping or accidental sideways page scrolling.
10. As a touch user, I want adequately sized and separated controls, so that changing a value does not activate the adjacent action.
11. As a keyboard user, I want equivalent control operations, visible focus, and a predictable focus order, so that I can use the same learning activities without a pointer.
12. As an assistive-technology user, I want semantic headings, named controls, meaningful status feedback, and accessible runtime boundaries, so that I can understand orientation and state.
13. As a motion-sensitive learner, I want nonessential animation removed under reduced motion, so that state changes remain clear without discomfort.
14. As an essay reader, I want claims connected to observations and stated assumptions, so that a demonstration supports an explanation rather than merely decorating it.
15. As a bias–variance learner, I want the squared-error decomposition explained with its assumptions, so that I do not mistake a fixed-point expectation for a universal rule about model complexity.
16. As a lab learner, I want to change an input and see the corresponding output with a nearby interpretation, so that I can investigate cause and effect.
17. As a blockchain learner, I want tampering and recomputation demonstrated with explicit toy-model limits, so that I do not mistake the lab for proof of real-world consensus or security.
18. As a practice learner, I want to attempt an answer before revealing it and receive useful feedback, so that I can revise my reasoning rather than merely view a solution.
19. As a scale-construction learner, I want accurate interval patterns and note spelling, so that practice reinforces musical understanding rather than an incorrect shortcut.
20. As an audio learner, I want intentional playback, clear playing/stopped state, and recovery from unavailable audio, so that audio controls remain understandable and under my control.
21. As a learner experimenting with controls, I want reset and retry to have explicit scope, so that I can recover without losing unrelated saved work.
22. As a returning creator, I want existing local data, saved artifacts, and export/share behavior preserved, so that a presentation update does not destroy my work.
23. As a learner in an opaque simulation, I want clear authored orientation without interference with the simulation, so that existing gestures, rendering, and state still work.
24. As a learner using an embedded activity, I want its loading, ready, and fallback states distinguished, so that a parent-page pass does not conceal an inaccessible child activity.
25. As a reader using chapter navigation, I want generated and native navigation to preserve their intended behavior, so that deep links and stateful controls remain predictable.
26. As a learner finishing a Route, I want one named Suggested Next Route, so that continuing is a deliberate local navigation rather than autoplay or an unexpected focus move.
27. As a Guided Path learner, I want existing local Progress and its retention semantics preserved, so that I can return without gaining account-like tracking on ordinary Routes.
28. As a learner on a constrained device, I want loading cost and responsiveness kept within declared budgets, so that visual polish does not make the activity harder to use.
29. As a learner encountering an error, I want an honest limitation and safe recovery option, so that a blank panel or disabled-looking message does not leave me stuck.
30. As a learner checking a claim, I want sources, attribution, and model limitations retained, so that I can distinguish original interpretation from retained material.
31. As a maintainer, I want every manifest Route assigned once with explicit ownership and evidence references, so that staged work neither duplicates nor omits experiences.
32. As a reviewer, I want measured results, reviewed judgments, blocked checks, and unsupported claims separated, so that planning evidence cannot be mistaken for release acceptance.
33. As a collaborator, I want small rollback units that preserve existing dirty work, so that a failed slice can be reversed without deleting someone else's changes.

## Implementation Decisions

### Authority, ownership, and compatibility

- Visual and story decisions are finalized under delegated autopilot planning. Execution begins when the user requests implementation, with no additional approval for routine matching edits. Package dependencies and evidence gates remain binding. Agent selection is not human review; installation, commits, deployment, and material out-of-scope departures retain separate authorization boundaries.
- Preserve static delivery and existing authored adaptation seams. Prefer deleting redundant authored styles and wrappers to adding abstractions. No new framework, runtime dependency, font download, analytics, or generalized component registry is required.
- The canonical manifest owns Route inventory, shell family, theme ownership, navigation, declared surfaces, interaction/network contracts, and Suggested Next Route. Generated Atlas metadata remains synchronized from that source. The rollout JSON is a planning projection, never a second runtime source of truth.
- Retain body-level shell metadata, namespaced tokens, and declared root-scoped adapters. Do not force universal wrappers, broad descendant selectors, global resets, generated rails on tool-first activities, or inherited theming into independent child documents.
- Shell-only means authored shell adaptation, not permission to recolor intrinsic output. Runtime-hook means only the declared supported lifecycle/theme hook. Fixed-runtime means the intrinsic engine stays fixed while owned chrome supports both themes. An opaque engine remains opaque even when its parent is classified shell-only.
- Preserve URLs, hashes, relative subpath asset loading, native navigation state, manifest continuation targets, keyboard ownership, local user data, exports, numerical results, script ordering dependencies, renderer backing dimensions, and pointer-coordinate mapping. Do not remount a runtime on theme change.
- Preserve the saved light/dark preference, existing local theme storage key, system fallback, and pre-paint initialization. Preserve graceful handling when storage is unavailable. Retain Guided Path-only Progress, its existing 30-day retention, and published Music continuation semantics; ordinary Routes gain no Progress.

### Selected visual and editorial contract

- A is Editorial brief: a dominant question, evidence-led hierarchy, fine rules, restrained accents, and panels only for independently interactive workspaces, grouped controls, or bounded feedback. Atlas discovery remains scannable; not every card becomes a lengthy lesson introduction.
- Map these settled semantic values into existing namespaced authored tokens; prototype token names and descendant selectors are not a production API. Both palettes are first-class and no external font is introduced.

| Role | Light | Dark |
| --- | --- | --- |
| Page background | `#f5f7fa` | `#0b1018` |
| Functional surface | `#ffffff` | `#141d2a` |
| Primary text | `#17202d` | `#eef3f8` |
| Muted text | `#526174` | `#b2bfd0` |
| Rule / control outline | `#748297` | `#718299` |
| Action / ordinary underlined link | `#a33d00` | `#ff9b55` |
| Text on action | `#ffffff` | `#0b1018` |
| Explanatory data / focus | `#185abd` | `#81b6ff` |

- Body/UI: system-ui, Segoe UI, sans-serif at 16px with 1.65 leading. Headlines: Iowan Old Style, Palatino Linotype, Georgia, serif; display clamp from 2.25rem through 4.5vw to 4.6rem, 1.08 leading, maximum 18ch. Metadata: ui-monospace, Consolas, monospace; contextual labels .8rem with 1.6 leading.
- Authored shell maximum 1200px with 16px gutters; suitable editorial layouts use a 2.3:1 main/support grid, minimum 240px support column and 48px gap, stacking below 800px in DOM order. These dimensions do not resize intrinsic engines or force rails onto native/none navigation. Fine rules are 1px; functional control radii 4px; controls target 44px in both dimensions. Focus is a 3px data-color outline with 4px offset.
- Orange identifies action and blue explanatory data, with text and shape reinforcing meaning. These colors do not establish truth, success, failure, or racing evidence classes. Intrinsic scientific colors, notation, and engine output keep their meaning.
- Authored navigation and control placement may reflow after approval. Reading order remains question, relevant limitation, primary task/evidence, supporting controls, explanation, and continuation where the mode warrants it. Labs and practice may lead with the task rather than lengthy prose. No mandatory essay frame surrounds an opaque tool.
- No ornamental motion or new media. Under reduced motion, disable nonessential animation, transitions, and smooth scrolling; preserve immediate usable state changes through existing native controls.

### Three distinct pilot teaching contracts

- **Essay pilot: bias-variance.** Explain why predictions vary across training samples and distinguish systematic error from variability. A learner can inspect the existing supported demonstration, compare observations, and read the assumptions before interpreting them. For squared-error prediction at a fixed input, with a target equal to its conditional mean plus zero-mean noise independent of the training process, expected error decomposes into squared bias, prediction variance, and irreducible noise variance. State what is averaged and what is held fixed. Do not promise that increasing complexity universally decreases bias or increases variance; double-descent examples are not contradictory exceptions to a universal monotonic law, because no such law is asserted. A new illustrative diagram must be labeled illustrative and cannot masquerade as engine output.
- **Lab pilot: blockchain.** Put an input edit, changed hash/link validity, observation, and safe recovery/recomputation in one task-focused workspace using existing supported behavior. Separate a toy hash-linked ledger demonstration from distributed consensus, adversarial security, finality, or a production cryptocurrency. Do not claim that restoring a local chain proves real-world consensus or security, and do not replace the cryptographic engine.
- **Practice pilot: teoria-scale-construction.** Preserve the existing exercise mount, answer/score state, reveal behavior, and supported retry. Ask for an attempt, provide non-color-only correction and explanatory spelling, then permit another attempt without automatically marking unrelated Progress. A major scale uses **W W H W W W H**; D major is **D E F# G A B C# D**, with successive letter names. Explain the interval pattern rather than accepting enharmonic spellings indiscriminately. Do not add scoring or audio behavior that the engine does not support; any matching authored practice aid has separate, transient state and receives routine agent review. The sample D-major exercise introduces neither audio nor persistent Progress.
- Other Routes adopt the approved intent, not these exact stories. Creation tools remain creation tools, Guided Paths remain advisory sequences, and simulation-native pacing remains intact where authored control is unavailable. A concise explanation or diagram is preferable when extra interaction teaches nothing.
- Record retained, adapted, and new material with sources and changed behavior in local provenance/parity records during implementation. Required attribution and license notices remain wherever their terms require, even if a legacy public-surface audit conflicts. Resolve a narrowly documented audit exception or policy correction; never remove obligations to make an audit green. Uncertain reuse blocks the affected slice.

### Execution rollout and handoff dependencies

The exact partition contains **83 Routes**, excluding the additional Atlas surface. Canonical shell families are ncase 13, mlu-pilot 10, ev-essay 9, anders-lab 4, engineering-longform 15, runtime 7, teoria-practice 6, ableton-practice 7, ableton-synths 6, local-hub 2, samwho-essay 2, and systems-essay 2. Theme ownership is shell-only 41, runtime-hook 24, fixed-runtime 18. These are manifest values, not smoke-family approximations or claims of completed migration.

| Wave | Route count | Dependency | Bounded delivery and exit |
| --- | ---: | --- | --- |
| W0: foundation/environment | 0 | User requests implementation; installation separately authorized if needed | Package 01 first resolves compatible-browser launch, then establishes reproducible full/strict pre-change evidence, signal triage, and ownership inventory. No production redesign while smoke cannot launch. |
| W1: shared system, Atlas, pilots | 3 | W0 | Serialize shared token/Atlas work; then bias-variance, blockchain, teoria-scale-construction, one pilot at a time. All three intent contracts and shared matrix pass before expansion. |
| W2: owned essays/hubs | 31 | W1 | Remaining lower-coupling shell-only Routes, excluding explicit high-risk boundaries. Same-family slices of at most five Routes, each gated before the next. |
| W3: runtime hooks/audio | 22 | W2 | Remaining supported hook Routes; same-family slices of at most three. Start with synth narrow-layout reproduction, then verify generated states, audio, and recovery without engine edits. |
| W4: opaque/ncase/high-risk | 27 | W3 | All fixed-runtime entries, all runtime-family entries, and seven explicit high-risk overrides. Default one Route per slice, readiness/child evidence first. |
| W5: final acceptance | 0 | W4 and all unresolved evidence obligations | Full 83-Route smoke plus Atlas and applicable strict checks; complete acceptance matrix and review. No implied deployment. |

The seven W4 overrides are bicycle, airfoil, internal-combustion-engine, mechanical-watch, naval-architecture, rigid-body-collisions, and markov-chains. The first five are conservative intrinsic-renderer/geometry judgments, not measured defects. The latter two also have captured asset/child signals. Risk follows ownership and review judgment; an empty evidence list does not mean a Route passed. Pilot rows occur only in W1, never again in later waves. Early read-only investigation of a later-wave signal does not reassign or duplicate its implementation.

Seven execution packages carry the work: 01 Restore release evidence; 02 Shared system and Atlas; 03 Intent pilots; 04 Owned Route slices; 05 Runtime-hook slices; 06 Opaque Route slices; 07 Final qualification. Each depends on the preceding package. W1 is deliberately split into shared acceptance first, then three independently gated pilots. Package lists are exact manifest-derived assignments, not one-session promises.

At every session checkpoint, append to the current package an execution log containing exact completed and remaining slugs, current slice, owned changes/preimages, source/environment identity, commands and evidence locations, failures/blocked modalities, baseline decisions, and the next safe action. Resume by checking source drift and the last gate, not by repeating completed slices or claiming the whole wave is atomic. Package completion requires every assigned Route and its checkpoint evidence; a partially completed package stays in progress.

Completed decisions and migrations 01–23 remain history. Legacy 24–29 are retired as superseded, not implemented; their successors are the execution packages, not new Wayfinder decision tickets. The planning map closes for specs delivery only. Actual release remains BLOCKED until qualification, with no automatic deployment.

### Stops, checkpoints, and rollback

- Each slice begins with declared Route membership, owned shared/Route edits, expected behavior/content/resource/geometry deltas, unchanged intrinsic boundaries, baseline identity, and applicable checks. Serialize shared edits; stop for overlapping ownership or unexplained concurrent source changes.
- Exit a slice only with its focused checks, matrix evidence, source/provenance review, approved visual comparison, and no hard regression. A shared change additionally requires full 83-Route regression before the next wave; run full smoke at each wave close and at final acceptance. Strict experience checks cover migrated Routes without pretending unmigrated entries already conform.
- Stop on missing compatible browser, manifest drift, new unexpected runtime/network failure, state or URL loss, incorrect science, lost attribution, inaccessible authored controls, unexplained geometry, exceeded performance ceilings, or a required opaque edit. Classify a pre-existing signal with evidence and an owner; it is neither a new failure allowance nor an automatic pass.
- A material departure includes a changed theme palette/hierarchy outside the approved pattern, a different teaching claim or interaction model, changed navigation/continuation semantics, new persistent state, new payload class, or an expanded runtime/child ownership seam. Request a human decision for a material out-of-scope departure before extending the wave; routine matching changes receive agent review.
- Before editing, retain an ownership-scoped preimage/patch and record existing dirty work without committing it. Rollback reverses only the slice's own hunks and associated approved metadata, in dependency order. Never use a whole-tree reset, clean, or baseline replacement; never discard unrelated changes or local user data. If hunks overlap concurrent work, stop for coordination rather than guessing.
- Retain failed evidence, the reason for rollback, and historical baselines. Intentional reflow requires an explicitly approved separate successor baseline with before/after references and preserved history; baseline recording never serves as a failure suppressor. No automatic commits, installation, deployment, or release follow any checkpoint.

## Testing Decisions

### Existing seams and evidence discipline

Test external behavior at the manifest-driven browser seam: what the learner can read, activate, change, recover, and navigate to. Reuse existing Node unit tests for manifest/metadata/theme/continuation contracts and the existing smoke, baseline, and public-surface tools. Add only a small deterministic check at an existing seam for genuinely new non-trivial authored logic; do not introduce a test framework or assert private DOM implementation merely to match a mockup.

Implementation command reference, run from `interactive-explanation/` after re-reading its current package and agent instructions:

- `npm run check` — configured syntax checks; there is no separate lint or typecheck script in the inspected package.
- `npm run unit` — existing Node test runner.
- `npm run audit` — existing policy checks; attribution/license obligations take precedence over conflicting legacy rules, with explicit narrow reconciliation rather than suppressed failures.
- `node tools/smoke-bundle.mjs . --route <slug>` — focused external behavior; add `--experience` for migrated scope.
- `node tools/smoke-bundle.mjs .` — mandatory full 83-Route gate, not replaced by a filtered family pass.

Use explicit Route filters for rollout membership. Smoke groups are inferred separately and must not replace canonical `shell.family` values. `npm test` includes a synchronization write, so it is not a read-only planning check. No browser/benchmark/application tests are rerun during this specs-only delivery. No application baseline is refreshed. The supplied baseline reports remain the evidence for existing results, not results produced by this spec.

### Universal state and modality contract

For every applicable row below, assess **stored light and stored dark at 1400×1000, 390×844, and 320×844**, then system-light/system-dark fallback with no preference, persisted navigation/reload, storage-unavailable handling, and live authored theme changes. Cover keyboard-only, mouse/pointer, and touch activation; hover must have a focus/touch equivalent. Apply reduced motion and narrow/zoomed reading. Verify default, hover, focus-visible, active/pressed, selected/expanded, disabled, loading, ready, empty, success/correct, invalid/incorrect, error/fallback, and reset/retry states **where they actually exist**. A non-applicable state requires a reason, not an invented component. Every Route receives a applicability record, not just a family-level extrapolation.

Evidence records identify Route/component/state/theme/viewport/input, exact fixture and readiness condition, source revision plus dirty content identity, environment/browser, command or review procedure, sample count, outcome, and limitations. Distinguish measured pass/fail, source-reviewed, agent visual review, human review, blocked, unsupported, and not applicable. A passive measurement is not a behavioral pass. No synthetic all-node, blanket accessibility, field-performance, or learning-outcome certification is permitted.

### Acceptance matrix

The universal contract applies to every row; additional states and observable acceptance are explicit here.

| Component or experience | Additional states / task | Required observable acceptance |
| --- | --- | --- |
| Atlas discovery and cards | Initial inventory, existing search/filter selection, no results, clear/reset, returning visit | Canonical entries remain discoverable; titles/intents and links are correct; controls retain existing behavior and focus; empty results explain recovery; no fabricated Progress. |
| Shared shell and identity | Initial load, long titles, sticky/narrow behavior, zoom | One dominant question/task; semantic landmarks/headings; readable copy and metadata; fine rules do not replace labels; no hidden content or overlay-obscured focus. |
| Theme control and initialization | No stored value, stored light/dark, denied storage, cross-Route navigation, active runtime | Correct preference before paint; working system fallback; usable named control in both themes; runtime state and user data unchanged after toggling. |
| Navigation and chapters | Generated, native, none; cold hash jump, back/forward, expanded/collapsed where supported | Existing mode contract and local URLs work; native state/keyboard ownership preserved; no forced rail for none; anchors visible and focus predictable. |
| Suggested Next Route and footer | Before/after runtime readiness, narrow placement, activation | Exactly one manifest-owned named continuation on each Route, accessible when the intended ready state is reached; target resolves locally; no autoplay or unsolicited focus; required attribution remains available in its obligated location. |
| Guided Path and hub surfaces | New visit, retained Progress, revisit, reset/expiry if supported | Advisory sequencing and existing 30-day local retention preserved; Music edge unchanged; Primary remains unnumbered; ordinary Routes do not acquire Progress. |
| Buttons, links, choices, inputs, sliders | Focus/hover/pressed, selected, disabled, min/max, invalid input, changed value | Named semantic controls, correct keyboard/touch equivalents, meaningful bounds, distinguishable states; no color-only feedback or theme-induced state loss. |
| Feedback, disclosure, dialog, fallback | Open/close, loading, ready, empty, success/error, retry, interrupted operation | Status understandable to assistive technology without noisy repeated announcements; dialog focus managed and returned where applicable; retry/reset scope clear; recover without losing unrelated data. |
| Figures, data, equations, notation | Alternate text/description, wide content, theme, zoom | Accurate labels/units/assumptions; readable contrast; essential meaning not conveyed solely by color/canvas/audio; accessible authored description where needed without falsely claiming intrinsic accessibility. |
| Essay | Read/skimming order, chapter jump, existing interaction, observation and explanation | Argument and demonstration agree; assumptions precede generalization; bias–variance pilot meets the fixed-point squared-error contract; no obligatory quiz or invented universal complexity rule. |
| Lab | Initial conditions, input change, result, invalid input, recovery, repeated manipulation | Observable effect corresponds to the supported model; inputs/state preserved on theme change; blockchain limits explicit; no false proof of consensus/security. |
| Practice | Prompt, unanswered, attempt, incorrect/correct, reveal, retry, retained score where present | Keyboard/touch reveal parity; feedback teaches the distinction; major-scale pattern and D-major spelling exact; no duplicate score mutation, accidental answer reveal, or new ordinary-Route Progress. |
| Audio/sequencer/runtime hooks | Gesture-start, stopped/playing, edits during playback, unavailable audio, replay/retry | User controls playback; existing local samples and synchronization behave; labels/states accessible; grids, notation, engine dimensions, and score/work state preserved across theme/reflow. |
| Opaque runtime and embedded child | Loading, declared ready selector, native controls, fallback, frame focus, continuation readiness | Parent chrome improves without engine edits/remounts; backing dimensions and pointer mapping preserved; child navigation/state checked separately through supported seams. Missing access remains blocked, never inherited from parent. |

### Accessibility and geometry gates

- Target WCAG 2.2 AA for authored changes: normal text contrast at least 4.5:1, large text at least 3:1, and applicable non-text controls/state indicators at least 3:1. Check actual foreground/background combinations in both themes and interaction states; do not infer contrast from token names. Disabled-state exceptions must not make essential limitations look optional or unreadable.
- Authored interactive targets meet the **24×24 CSS-pixel AA minimum** or a documented applicable WCAG exception; **44×44 CSS pixels is the design target**, especially for touch and primary controls. Any smaller design-target departure needs an explicit usability rationale and AA evidence. Preserve native control semantics and do not expand hit areas over neighbors.
- Check focus visibility and non-obscuration, accessible names/roles/states, text alternatives, error association, reading order, no keyboard traps, and non-hover access. Verify relevant 200% text/zoom behavior and reflow at the narrow equivalent. Retained opaque limitations need explicit route-boundary evidence and resolution planning; do not claim whole-experience AA from authored-shell checks.
- Hard gate: **zero unexplained geometry changes** and no new hidden or unreachable content. Approved authored reflow is allowed with separate before/after evidence; engine backing dimensions, intrinsic output, and pointer mapping remain stable unless a separate supported-adaptation decision authorizes otherwise. No global overflow hiding, clipping masks, renderer shrinking, or blanket exceptions to make snapshots pass. Necessary two-dimensional runtime scrolling must be explicit, bounded, usable, and reviewed rather than silently truncating content.

### Performance and runtime/network gates

1. Fix the smoke launch environment first through authorized provisioning; installation is not authorized by this spec delivery. The package expected `chromium_headless_shell-1223`, which was absent. The passive snapshot used Chromium **151.0.7922.34**, revision 1234, with Playwright 1.60.0. Do not compare that mismatched snapshot directly against a new browser and call the difference a regression or improvement.
2. Establish paired before/after runs from stable identified inputs in the **same provisioned browser and environment**, same server/subpath, viewport, theme, readiness fixtures, resource policy, concurrency, cache assumptions, and throttling. Use **at least three fresh browser contexts per side per compared cell**, report median and range and actual sample counts; pair before/after conditions and retain raw samples. Fresh contexts do not prove cold OS/server caches. Record warm repeats separately if used; never pool cold-like and warm results.
3. Retain inherited ceilings: for each comparable Route/Atlas cell, after-median DCL and load may increase by no more than **max(20% of the corresponding before median, 250ms)**. Comparable transfer may increase by no more than **max(20% of before transfer, 250KiB)**. Evaluate metrics independently; faster DCL does not excuse excessive transfer. Missing/unsupported transfer, absent load completion, unstable readiness, or materially noisy ranges are blocked/inconclusive, not zero or a pass; investigate and repeat without selectively dropping slow samples.
4. Declare every expected resource-count and payload delta with its purpose before accepting it, including removed resources and child/runtime implications. Count requests as well as measured transfer. Top-document completed Resource Timing excludes unfinished/child requests and may truncate; retain scope limitations and supplement through existing network seams when necessary. Zero reported transfer is not proof of zero bytes. No speculative byte-saving or aggregate quality score.
5. Hard gate: **zero new unexpected runtime exceptions, console errors, local HTTP failures, or network failures**. Preserve manifest network policies and runtime checks. Known failures must be separately reproduced and classified; do not wildcard-ignore them or recategorize them as expected simply to pass. Resolve confirmed blocking defects before affected-slice acceptance; retain cancellation evidence if a captured event is benign.
6. Measure important authored interaction completion using existing deterministic probes where available, with the same fixtures and sample reporting; preserve response behavior and investigate stalls. Do not invent an interaction budget from passive navigation captures. DCL/load are not LCP; scripted response timing is not field INP; the snapshot does not certify CLS, Core Web Vitals, Lighthouse, or production-network performance.

### Signal triage and release closure

- Reproduce 42 overflow cells at declared runtime readiness, starting with six synth Routes at 320px and the larger observed QR/ncase/exponentiation cases. The count is cells, not 42 defective Routes. Distinguish tiny rounding from inaccessible content, retaining evidence either way.
- Investigate `musicmap` primary visibility and `anxiety` continuation only after lifecycle/readiness checks. The three intermittent Ableton music cells also need a readiness probe. Generic missing `main` is not itself a defect when the manifest declares another primary surface, as on `loopy`.
- Reproduce the root-absolute `/favicon.png` request on `rigid-body-collisions` under subpath hosting. Investigate the asset seam without claiming the lesson failed. For `markov-chains`, distinguish cancellation from real failure of the child playground and check the child independently; no engine rewrite follows from that signal.
- Full 83-Route smoke remains mandatory and currently unfulfilled. An environment fix must enable actual execution; its success alone does not pass any Route. Final closure requires full regression, applicable strict experience coverage, Atlas checks, approved visual/content comparisons, and resolved authored accessibility/interaction gaps. Carry real-device, cross-browser, assistive-technology, and child-state obligations explicitly to qualified review; if unavailable, final full-experience acceptance remains blocked rather than silently certified.
- Learning review asks whether the question is clear, the interaction changes understanding rather than decoration, the explanation matches the observation, the model limits are explicit, recovery is understandable, and the next task supports transfer. Record this as editorial judgment or a learning hypothesis. Learner studies and field metrics are outside this implementation evidence; no learning gains are claimed.

## Out of Scope

- Production execution, browser measurement, application test reruns, installation, commits, deployment, and baseline replacement during specs delivery. Execution packages describe later work, not work already performed.
- New Wayfinder decision tickets or changes to the map, decisions, legacy tickets, evidence reports, application, or tracker configuration by this package-authoring task. Parent-owned planning closure does not release UI.
- A framework migration, new runtime dependency, runtime replacement, opaque engine edits, minified/bundled/vendor/archive changes, or unapproved independently owned iframe-child migration.
- Reusing racing branding, subject-specific data semantics, the sibling's palette approval, or the `formula-1-racing` Route as authority for this visual direction; changing the sibling product itself.
- Uniform essay rewrites, forced wrappers, a new design-system runtime, a new test framework, new analytics, accounts, web fonts, ordinary-Route Progress, personalized recommendations, or implicit continuation-graph changes.
- Hiding overflow, stripping attribution/license material, deleting user data, relaxing security/accessibility, or refreshing baselines to conceal a failing gate.
- Blanket all-node accessibility claims, field Core Web Vitals certification, production-device performance claims, or measured learning outcomes from source/editorial review.

## Further Notes

### Final decisions and evidence boundaries

- [Resolved visual decision 33](issues/33-prototype-f1-inspired-visual-system.md) and [exact visual report](research/33-visual-prototype.md) select A by agent judgment. The report records 18/18 sample variant/theme/viewport checks and selected screenshot review, not all-Route production approval. Token contrast does not certify native-widget or whole-experience accessibility.
- [Resolved storytelling decision 34](issues/34-prototype-original-storytelling.md) and [story report](research/34-storytelling-prototype.md) record 12/12 pure-check groups and 6/6 sample theme/viewport cells. The fixed-target essay toy computes empirical squared bias plus variance without target noise; the receipt lab is explicitly non-cryptographic; the spelling exercise has no audio or persistence. Preserve those disclosures and existing production engines rather than transplanting sample implementations.
- [Rollout decision 35](issues/35-approve-overhaul-rollout.md) owns the parent-approved package sequence and specs-only planning closure. The current release remains BLOCKED; settled design does not resolve the missing compatible browser or qualification gaps.

### Execution packages and retired legacy successors

| Package | Scope | Retired predecessor / retained work |
| --- | --- | --- |
| [01 Restore release evidence](implementation/01-restore-release-evidence.md) | W0 environment, full/strict pre-change evidence, signal triage | Benchmark evidence retained, not overwritten |
| [02 Shared system and Atlas](implementation/02-shared-system-and-atlas.md) | W1 shared acceptance; Atlas only | Existing shared seams retained |
| [03 Intent pilots](implementation/03-intent-pilots.md) | W1 three Routes, one at a time | Existing essay/lab/practice engines retained |
| [04 Owned Route slices](implementation/04-owned-route-slices.md) | W2 exact 31 Routes | Completed authored migration work reused |
| [05 Runtime-hook slices](implementation/05-runtime-hook-slices.md) | W3 exact 22 Routes | Retained hooks from completed work; pilot hooks remain in 03 |
| [06 Opaque Route slices](implementation/06-opaque-route-slices.md) | W4 exact 27 Routes | NCase 24/25, compiled 26, binary 27, stargazing 28 superseded |
| [07 Final qualification](implementation/07-final-qualification.md) | W5 all-Route evidence closure | Old closure 29 superseded |

Legacy 24–29 are retired as superseded, not completed implementations. These are execution packages, not Wayfinder child decision tickets. Validate the snapshot and package membership before each wave; retain exact W1 3, W2 31, W3 22, W4 27 assignments unless a manifest change is explicitly reconciled.

### Assumptions and evidence pointers

- The manifest remains at 83 Routes; source family and ownership values are authoritative even where a smoke helper uses a broader family. The JSON preserves manifest order, each slug exactly once, three pilot flags, and references only observed summary signals or an empty list. Regeneration must check unique exact slug equality, canonical fields, counts, pilots, rule-consistent assignments, and signal membership against the evidence source. Do not add this snapshot to application imports or synchronize the manifest from it.
- [Scope resolution 30](issues/30-reconcile-overhaul-scope.md) authorizes original authored redesign, both themes, and approved reflow while retaining runtime/data/provenance safeguards. [The map](map.md) records the later user delegation, “enter autopilot please finish all wayfinder and ship specs.” That grants planning decisions, not production work or impersonated human approval.
- [Benchmark contract 31](issues/31-define-component-benchmark-contract.md) defines meaningful component/state coverage and evidence labels. [Evidence resolution 32](issues/32-capture-current-site-benchmark.md), [existing gate report](research/32-existing-gates.md), and [browser baseline report](research/32-browser-baseline.md) preserve measured results and blockers; [raw snapshot](research/32-browser-baseline.json) holds exact cells. Dirty-tree and concurrent-change limitations remain binding.
- The baseline representative practice repeats were for `teoria-interval-ear-training`, not the proposed scale-construction pilot. That pilot therefore needs its own controlled before/after evidence later; do not transfer another Route's timings or story approval.
- [Sibling visual decision](../f1-racing-product-evolution/issues/11-prototype-broadcast-editorial-visual-system.md) supplies design inspiration only. [Domain vocabulary](../../CONTEXT.md), [local tracker rules](../../docs/agents/issue-tracker.md), and [triage labels](../../docs/agents/triage-labels.md) govern this planning handoff.

### Read-only snapshot validation recipe

From the parent repository, this Node assertion checks planning data only; it does not execute application tests, launch a browser, write files, synchronize metadata, or certify UI quality. Run again after regeneration and before each execution wave.

```bash
node --input-type=module -e '
import fs from "node:fs";
import assert from "node:assert/strict";
const m = JSON.parse(fs.readFileSync("interactive-explanation/routes.manifest.json", "utf8"));
const p = JSON.parse(fs.readFileSync(".scratch/complete-route-experience/research/35-route-rollout.json", "utf8"));
const b = JSON.parse(fs.readFileSync(".scratch/complete-route-experience/research/32-browser-baseline.json", "utf8"));
const pilots = new Set(["bias-variance", "blockchain", "teoria-scale-construction"]);
const overrides = new Set(p.highRiskOverrides);
assert.equal(m.length, 83);
assert.equal(p.routeCount, m.length);
assert.equal(new Set(p.routes.map(r => r.slug)).size, m.length);
assert.deepEqual(p.routes.map(r => r.slug), m.map(r => r.slug));
for (const [i, r] of p.routes.entries()) {
  const source = m[i];
  assert.equal(r.manifestShellFamily, source.shell.family);
  assert.equal(r.themeOwnership, source.experience.themeOwnership);
  assert.equal(r.pilot, pilots.has(r.slug));
  const wave = r.pilot ? "W1" : r.themeOwnership === "fixed-runtime" || r.manifestShellFamily === "runtime" || overrides.has(r.slug) ? "W4" : r.themeOwnership === "runtime-hook" ? "W3" : "W2";
  assert.equal(r.waveId, wave);
  assert.equal(r.risk, wave === "W4" ? "high" : r.themeOwnership === "runtime-hook" ? "elevated" : "moderate");
  const signals = Object.entries(p.signalDefinitions).filter(([, d]) => b.summary[d.reference.split("/").at(-1)].some(cell => cell.split("/")[0] === r.slug)).map(([key]) => key).sort();
  assert.deepEqual([...r.evidenceSignals].sort(), signals);
}
for (const wave of p.waves) assert.equal(p.routes.filter(r => r.waveId === wave.id).length, wave.routeCount);
for (const [family, count] of Object.entries(p.familyCounts)) assert.equal(m.filter(r => r.shell.family === family).length, count);
for (const [owner, count] of Object.entries(p.themeOwnershipCounts)) assert.equal(m.filter(r => r.experience.themeOwnership === owner).length, count);
console.log("Planning snapshot: 83 unique Routes; W1=3 W2=31 W3=22 W4=27; canonical fields, risks and evidence references match.");
'
```
