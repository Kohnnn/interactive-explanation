# Capture the current-site benchmark evidence

Type: task
Label: wayfinder:task
Status: resolved
Blocked by: 31
Parent: ../map.md
Mode: AFK

## Question

What does the current site actually demonstrate under the approved benchmark contract, and which evidenced weaknesses should inform the prototypes?

## Evidence boundaries

- Execute the approved provisional method across Atlas shared components, all 83 Routes, and the relevant embedded child states; this task supplies evidence for decisions rather than implementing the overhaul.
- Run existing unit tests, policy audit, and full smoke checks using the repository's documented commands; scope strict migrated-experience checks to migrated Routes only.
- Preserve approved `experience-baselines` unchanged. Store benchmark evidence separately; never refresh acceptance baselines to make failures pass.
- Record repository identity, commit, Git dirty state, tool/browser versions, environment, devices/viewports, theme/input states, fixtures, commands, repetitions, and collection time.
- Report actual measurements separately from reviewed judgments, unsupported checks, and blocked work. Do not turn an unavailable metric into zero or an unreviewed state into a pass.
- Apply the agreed all-Route automation and risk-based manual matrix; mark manual checks blocked when the necessary reviewer or device is unavailable.
- Investigate tooling gaps against the approved contract only after it resolves. Use existing tools; no new runtime dependencies or unrelated application fixes.
- Prioritize findings by severity, affected reach, learner friction, confidence, and runtime risk; retain failures and uncertainty instead of manufacturing a composite score.
- Present measured distributions and variance to inform later budgets; do not invent learning outcomes or approve thresholds on the user's behalf.

## Resolution gate

Resolve when reproducible evidence and a prioritized findings summary are linked, with every coverage cell labeled measured, reviewed, unsupported, or blocked.
Disclose blockers to prototype selection; this task grants no visual, content, budget, or rollout approval.

## Answer

Captured the bounded planning snapshot defined by [Define the all-Route component benchmark contract](31-define-component-benchmark-contract.md). This resolves evidence collection with disclosed gaps, not browser acceptance or a complete quality certification.

- [Browser evidence report and complete Route/component inventory](../research/32-browser-baseline.md): 504/504 base cells across the Atlas and 83 Routes, three viewports, both stored themes; 514 total samples including three samples for each of five desktop-light representatives. [Raw evidence](../research/32-browser-baseline.json) and [runnable collector](../research/32-browser-baseline.mjs) preserve reproduction details and per-cell observations.
- [Existing gate report](../research/32-existing-gates.md): syntax and policy checks passed; 363 unit tests passed. Full and strict MLU smoke both failed before any Route checks because the expected Playwright headless shell was missing. These are blocked browser gates, not successful smoke tests.
- The passive collector used an explicitly selected already-installed Chromium revision different from the package expectation. No installation or application changes were made. The dirty working tree, possible concurrent changes, browser mismatch, local unthrottled network, short settling, and passive-only checks prevent release certification.

### Findings used for planning

1. Narrow layout is the strongest actionable cross-Route signal: 42 overflow cells, including up to 68px overflow on six Ableton synth Routes at 320px in both themes. Prioritize readiness-verified reproduction and authored containment, never global overflow hiding or renderer shrinking.
2. `musicmap` lacks a visible declared primary surface in all six captures. `anxiety` lacks a visible continuation in all six, plus three intermittent Ableton music cells. Confirm readiness and lifecycle before calling these persistent defects.
3. Six `rigid-body-collisions` captures request `/favicon.png` outside the required subpath; the collector server returns 403. Investigate the root-absolute asset, not a nonexistent lesson-rendering failure.
4. Six `markov-chains` captures record a child playground request failure. Cancellation versus a real child failure is unresolved; do not assign an engine rewrite based on this signal.
5. No navigation errors, page exceptions, stored-theme attribute mismatches, or outbound interventions were observed in the snapshots. This does not establish functional interactions, semantic theming, final rendering, or child-document correctness.

### Remaining evidence obligations

The report labels interaction, keyboard/touch, reset/recovery, system fallback, reduced motion, focus/contrast, child state, cross-browser, real device, visual/learner review, and field metrics as blocked or unsupported. Chrome DevTools tracing is unavailable. These gaps become implementation/release acceptance work, not reasons to invent results or refresh the historical approved baselines.

Prototype selection: Atlas for reach; essay, lab, and practice for distinct teaching modes; a narrow control layout and an explicitly opaque runtime placeholder as boundary stress cases. The prototypes may demonstrate the proposed design, not claim to repair these production findings. Keep current performance ceilings until controlled paired measurements justify an approved change.

## Comments

### Evidence resolution — 2026-09-08

Resolved under delegated autopilot planning. Measurement completed for the specified passive matrix; smoke execution and other modalities remain explicitly blocked. No production release or human design approval is implied.
