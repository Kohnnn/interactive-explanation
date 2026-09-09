# 07 Final qualification

Status: ready-for-agent
Spec: [Master specification](../spec.md)
Blocked by: [06 Opaque Route slices](06-opaque-route-slices.md)
Execution: not started
Wave: W5 — zero new implementation assignments; qualify all 83 Routes plus Atlas

## Scope and first-session boundary

Begin after package 06, transitively every earlier package, passes its gates. This supersedes retired closure 29, not a claim that its implementation finished.
First slice: reconcile checkpoint coverage and source identity, then execute full compatible-browser smoke. Do not treat one run or one session as all modality qualification.
Validate exact manifest/snapshot/package membership: packages 03–06 partition 83 Routes as 3/31/22/27 with no duplicate; Atlas belongs only to 02.
Account for every canonical family, theme ownership, navigation mode, primary/runtime surface, continuation and declared network/interaction boundary.
Review all package logs, unresolved signal dispositions, known baseline failures and retained historical references; absence of evidence remains blocked rather than accepted.

## Observable release gates

- Full 83-Route smoke plus Atlas must actually pass in the compatible environment. Run strict experience for every migrated Route and retain actual selection/results; no representative-family substitution.
- Complete every applicable master component/state/theme/input cell, including saved/system theme, keyboard/pointer/touch, reduced motion, zoom/focus, feedback/reset, loading/error, audio and child boundaries.
- Real-device, cross-browser, assistive-technology and child-state obligations require qualified evidence; unavailable modalities block full-experience release qualification. Do not claim whole-site AA from token contrast or shell probes.
- Zero new unexpected runtime exceptions, console/local HTTP/network failures; zero unexplained geometry, masked clipping, lost data, broken URL or altered intrinsic engine behavior.
- Paired before/after measurements use the same provisioned browser/environment and three fresh contexts per side, with median/range and explicit cache/readiness limitations. No direct comparison to mismatched Chrome 151 snapshots.
- DCL/load deltas stay within max(20% of before,250ms); transfer within max(20% of before,250KiB). Declare all resource deltas; unsupported/missing measurements are not zero or passes.
- Approved authored reflow has separate reviewed successor baselines retaining history; no blanket refresh to hide regressions.
- Accuracy, attribution/license obligations and honest retained/adapted/new provenance hold. Bias–variance assumptions, toy blockchain limits and major-scale spelling remain correct.
- Preserve one local Suggested Next Route, Guided Path-only Progress, existing user data/theme persistence and opaque ownership; no new framework, fonts, analytics or runtime dependency.
- Report visual/content judgments as agent review and learning value as hypothesis. No invented human approval, learning result, field CWV or production-device certification.

## Commands and output

Run from parent `interactive-note/` root:
`npm --prefix interactive-explanation run check`
`npm --prefix interactive-explanation run unit`
`node interactive-explanation/tools/check-public-surface.mjs interactive-explanation`
`node interactive-explanation/tools/smoke-bundle.mjs interactive-explanation`
`node interactive-explanation/tools/smoke-bundle.mjs interactive-explanation --route <migrated-slug> --experience`
Repeat exact Route flags across the full migrated set; supplement existing seams for all applicable manual/device states. No new testing framework or implicit synchronization command.
Deliver a qualification report with exact passed/failed/blocked/unsupported scope, source/environment and raw evidence references, budgets, resource changes, baseline history and remaining obligations.
Qualification may report ready only when every mandatory gate is fulfilled; otherwise release stays BLOCKED with owners and next actions. Even qualification success does not deploy or commit.

## Checkpoint, resume and failure handling

Append completed/remaining checks and exact Route sets, input identity, commands/evidence, outstanding modalities, decisions and next safe action here each session.
On failure, return the smallest affected owned slice to its package with reproduction evidence; do not reopen the entire wave or erase unrelated dirty work.
Retain failed runs and baseline history. Rollback only owned hunks with preimages and coordination for overlap; protect local user data and licenses.
Routine matching remediation follows existing package scope under an implementation request; material out-of-scope departures require human decision. Installation, commits and deployment remain separately authorized.
