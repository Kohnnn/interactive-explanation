# Approve the evidence-led overhaul rollout

Type: grilling
Label: wayfinder:grilling
Status: resolved
Blocked by: 34
Parent: ../map.md

## Question

Does the resolved scope, benchmark evidence, and human-approved visual and storytelling direction justify a bounded overhaul rollout, and under what gates?

## Decision boundaries

- Require resolution of every earlier ticket in this extension: scope reconciliation, benchmark contract, current-site evidence, visual prototype, and storytelling prototype.
- Approve final methodology and baseline-informed metric budgets, with environments, repetitions, variance treatment, comparison rules, and explicit handling of unsupported or blocked evidence.
- Decide whether remaining evidence gaps block rollout or require a bounded follow-up; absence of evidence is not acceptance.
- Set priority waves from measured/reviewed needs, learner value, shared-component leverage, runtime risk, and representative coverage rather than inherited family order alone.
- Approve functional, accessibility, visual, content, learning-review, and loading/interaction acceptance gates; preserve non-negotiable security, data, URL, and runtime safeguards.
- Apply [Reconcile the original overhaul with completed Route work](30-reconcile-overhaul-scope.md): the user approves representative prototypes and material visual/content departures; routine matching changes use agreed checks. Define wave checkpoints and material-departure criteria, without requiring individual approval of every Route or claiming learning outcomes without evidence.
- Define rollback units, triggers, evidence retention, and the process for approving changed baselines without overwriting historical evidence to hide regressions.
- On resolution, create new implementation tickets sized to the approved waves, then wire their dependencies after the files exist.
- Explicitly revise or retire legacy migration tickets 24–28 and rewire [Close the complete Route experience](29-close-complete-route-experience.md) to the approved implementation and acceptance work.
- Preserve completed tickets 01–23 as history. Closing this ticket must not automatically release unchanged legacy bodies or authorize commits.

## Resolution gate

Resolve only through live human approval of scope, budgets, priority waves, acceptance/rollback rules, and the legacy disposition.
If evidence or approval is insufficient, keep rollout blocked and chart the missing decision rather than beginning implementation.

## Answer

Approve the **specification and gated rollout plan**, under the user's later autopilot delegation, not a production release or human visual sign-off. [Master specification](../spec.md) is the canonical implementation contract; [exact Route partition](../research/35-route-rollout.json) is its manifest-derived planning snapshot. Visual and storytelling decisions are resolved with their real prototype evidence. Missing production acceptance remains a gate, not a missing design decision.

### Sequencing and coverage

- [Restore release evidence](../implementation/01-restore-release-evidence.md): first resolve compatible smoke launch, then capture actual full/strict results, controlled baseline identity, and readiness-verified signal dispositions. No redesign before the harness can execute. Installation still needs authorization.
- [Shared system and Atlas](../implementation/02-shared-system-and-atlas.md): serialize common authored token and discovery work; full regression required before pilot expansion.
- [Intent pilots](../implementation/03-intent-pilots.md): three separately gated Routes, `bias-variance`, `blockchain`, and `teoria-scale-construction`.
- [Owned Route slices](../implementation/04-owned-route-slices.md): 31 remaining owned Routes, at most five same-family Routes per session slice.
- [Runtime-hook slices](../implementation/05-runtime-hook-slices.md): 22 supported-hook Routes, at most three same-family Routes per slice; reproduce synth narrow-layout signals early.
- [Opaque Route slices](../implementation/06-opaque-route-slices.md): 27 fixed/high-risk Routes, one per slice by default; independent child readiness and runtime boundaries are mandatory.
- [Final qualification](../implementation/07-final-qualification.md): depends transitively on all previous packages; full 83-Route and Atlas acceptance, applicable strict checks, review, and unresolved modality obligations remain mandatory.

The four Route-owning packages partition 83 slugs exactly once (3 + 31 + 22 + 27); Atlas is additional shared work. Risk assignment is conservative source/ownership judgment, not a defect classification. Packages are resumable bounded work queues, not promises that a whole wave fits one session. Their separate execution tracker keeps open implementation out of the completed decision frontier.

### Acceptance, budgets, and exceptions

Retain inherited DCL/load increase ceilings of max(20% of comparable before median, 250ms), and transfer increase max(20%, 250KiB), with declared resource deltas. Require at least three paired fresh-context samples per side in the same provisioned browser/environment and report ranges; the mismatched passive snapshot is not a numerical acceptance baseline. Unsupported/unstable results are blocked or inconclusive, never zero/pass. No field CWV or learner improvement claims are authorized.

Use the selected dual-theme Editorial brief and intent-specific teaching rules. Prototype measured contrast and controls establish feasibility only; actual authored states still need keyboard/touch, focus, contrast, theme persistence, reduced-motion, readiness, and responsive evidence. Preserve opaque engine/state/backing dimensions, URLs, user data, provenance/licenses, and manifest ownership. No global overflow hiding, blanket renderer resizing, permissive network exclusions, or baseline refresh to suppress failures.

Agent review may approve routine matching implementation and separately recorded successor layout baselines when implementation is requested, with historical evidence retained. New runtime ownership, persistent state, teaching claims outside scope, or material design departures return to a human decision. Rollback is limited to owned hunks/preimages; never discard unrelated dirty work. Commits, installations, and deployment are not automatically authorized.

### Legacy disposition and planning closure

The original execution tickets are now explicitly closed as **superseded, not implemented**, rather than released unchanged when this decision closes. NCase, iframe, compiled music/QR, binary/watch, and stargazing work transfers to Opaque Route slices with its inherited safeguards. The old product close gate transfers to Final qualification and its full dependency chain. Completed prior decisions remain intact.

No unresolved planning fog remains for the specs-only destination: measured defects and evidence gaps have explicit investigation/acceptance owners; per-Route adaptations are bounded execution decisions, and any newly proven out-of-scope engine or license question requires a new decision ticket. Product implementation and release are not declared complete.

## Comments

### Delegated rollout resolution — 2026-09-08

The user asked to finish Wayfinder and ship specs in autopilot. Seven dependency-linked implementation packages and the master spec are published locally. This resolves planning authority and sequencing without impersonating a human review or overriding the blocked production smoke gate.
