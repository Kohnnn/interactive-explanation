# Define the all-Route component benchmark contract

Type: grilling
Label: wayfinder:grilling
Status: resolved
Blocked by: 30
Parent: ../map.md

## Question

What repeatable component-and-state benchmark will support credible overhaul decisions across the Atlas and all 83 Routes?

## Decision boundaries

- Inventory Atlas shared components, every manifest Route, and relevant embedded child states, identifying ownership and inaccessible or opaque boundaries.
- Cover navigation, controls, content hierarchy, loading, interaction, feedback, errors, and recovery where applicable.
- Specify keyboard, touch, stored/system themes, narrow/mobile layouts, reduced motion, and relevant runtime states.
- Separate functional correctness, accessibility, visual quality, loading/interaction performance, and learning-design review; do not collapse them into an invented quality score.
- Require all-Route automated checks plus risk-based manual coverage, explicitly labeled by Route, component, state, and modality. Never claim every DOM node was tested.
- Distinguish measured results, human-reviewed judgments, unsupported checks, and blocked coverage; record the reason and next decision for each gap.
- Choose run counts, cold/warm conditions, environment, browser/device versions, viewports, real-device versus emulated coverage, fixtures, and repeatability/variance reporting.
- Agree a provisional measurement method before collection; approve numeric performance and regression budgets only after the baseline informs them, at rollout approval.
- Define learning-review questions and evidence limits. Expert review is not a measured learning outcome; any outcome claim requires actual supporting evidence.

## Resolution gate

Resolve through live human approval of the coverage matrix and provisional methodology, including how tooling gaps will be investigated during baseline capture.
This defines evidence collection, not a new test platform or runtime dependency.

## Answer

Settled under the user's 2026-09-08 autopilot delegation, not a live human methodology review. Use the existing manifest-driven smoke/baseline seams and Node unit tests; do not introduce a parallel runtime registry or test framework.

### Coverage contract

- Inventory exactly the 83 manifest Routes plus the Atlas. Preserve a per-Route record of family, ownership, declared surfaces, navigation, interactions, continuation, and evidence status. Components are named roles and meaningful states, not every DOM node.
- Inventory shared navigation, Atlas discovery/cards, typography/content hierarchy, theme control, controls/feedback, lesson sections, continuation, dialogs/fallbacks, and runtime frames. Embedded child documents are separate ownership boundaries; mark undeclared child state coverage blocked rather than inheriting a parent pass.
- Run existing syntax checks, unit tests, public-surface audit, and full smoke without synchronization writes or approved-baseline refresh. Attempt strict experience checks for migrated Routes only. Record early failure and actual covered set; an attempted full suite is not 83 passing Routes.
- For the fresh lightweight lab snapshot, attempt every Route and the Atlas at 1400×1000, 390×844, and 320×844, each with stored light and dark. One navigation sample per cell is discovery evidence, not a performance distribution. Capture navigation/load timing, resource count/transfer support, primary geometry/overflow, console/network failures, theme state, and basic component counts using existing browser tooling.
- Where feasible, repeat three fresh-context samples of representative Atlas, essay, lab, practice, and opaque runtime surfaces. Report median and range only for actual repetitions. Fresh context does not prove OS/server cache cold; browser-local HTTP serving is neither production network performance nor field Core Web Vitals.
- Full release acceptance additionally requires system-theme fallback, keyboard/touch semantic parity, reset/recovery, reduced motion, focus/contrast, and known loading/error states for every applicable authored component. Use existing deterministic probes where available; label the rest as reviewed, unsupported, or blocked. A short lab snapshot does not certify these dimensions.

### Evidence schema and limitations

Record command/collector identity, timestamp, root/commit/dirty state, Node and browser versions, OS, viewport/device-scale settings, theme, sample count, cache/throttling assumptions, timeout/error, and the exact Route/state. Separate measured results, source-reviewed observations, agent visual review, human review, unsupported metrics, blocked checks, and not-applicable states. Store evidence under this planning effort, separate from approved application baselines.

Chrome DevTools MCP is unavailable in this session; its trace workflow cannot run. Do not install tooling, claim Lighthouse/axe coverage, call navigation time LCP, or call a scripted interaction field INP. Real-device, assistive-technology, cross-browser, and learner-outcome evaluation remain explicit release-validation obligations, not fabricated passes.

Use source and rendered evidence to rank severity, learner friction, affected reach, confidence, and runtime risk. Numeric performance limits remain the inherited ceilings until the rollout decision; no aesthetic aggregate score or speculative byte-saving claim is permitted. Prefer deleting duplication at verified authored seams over adding a framework.

## Comments

### Delegated resolution — 2026-09-08

The user requested completing Wayfinder and shipping specs in autopilot. The bounded evidence snapshot above enables planning despite unavailable device/trace coverage; those gaps must survive into acceptance criteria and cannot be used to certify a release.
