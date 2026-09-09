# Prototype the F1-inspired visual system

Type: prototype
Label: wayfinder:prototype
Status: resolved
Blocked by: 32
Parent: ../map.md

## Question

Which original visual system adapts the sibling F1 product's broadcast restraint and editorial clarity to this site's varied subjects, based on the current-site evidence?

## Decision boundaries

- Reference the sibling `f1-racing/` product and [Prototype the broadcast and editorial visual system](../../f1-racing-product-evolution/issues/11-prototype-broadcast-editorial-visual-system.md), not the `formula-1-racing` Route.
- Explore dark broadcast/editorial principles: clear hierarchy, purposeful typography, fine rules, restrained accents, evidence-first composition, and fewer decorative panels.
- Do not copy race branding, telemetry metaphors, subject-specific colors, or the reference's exact palette onto every subject.
- Choose representative Atlas and Route surfaces from benchmark findings, including dense controls and a difficult runtime boundary; keep the artifact small and disposable.
- Prototype both fully supported light and dark palettes under [Reconcile the original overhaul with completed Route work](30-reconcile-overhaul-scope.md); preserve saved preference, system fallback, and pre-paint behavior. Theme availability is settled, not an open prototype choice.
- Compare mobile reflow, touch targets, keyboard focus, reduced motion, readable density, and contrast for controls and active, disabled, loading, error, and fallback states.
- Show what remains intrinsic runtime output and what is authored presentation; preserve approved accessibility, data, and runtime seams.
- Evaluate the candidate against baseline weaknesses and provisional measurement methodology without presenting a prototype as all-Route validation.

## Resolution gate

Use the prototype skill when this ticket is worked. Link the artifact and its limitations, then obtain live human approval of the visual direction and explicit rejected alternatives.
Agent checks alone cannot resolve this ticket. No production migration or blanket approval of unrepresented states follows from the prototype.

## Answer

The user's later autopilot delegation explicitly supersedes the historical live-review requirement for specs-only planning. Select **Editorial brief (A)** by delegated agent judgment, not human approval. [Visual decision report](../research/33-visual-prototype.md) holds the exact tokens, typography, structure, alternatives, evidence, and limitations; [disposable HTML](../research/33-visual-prototype.html) and [runnable checks](../research/33-visual-prototype.mjs) are its primary artifacts.

- Choose one dominant question, rule-led sections, one supporting rail, and functional rather than decorative panels. Both light and dark palettes have measured token contrast; orange marks actions and blue explanatory data, never racing-specific evidence authority.
- All three structurally distinct variants passed 18/18 viewport/theme cells, with zero document overflow, measured 44px controls, theme/state checks, native keyboard control behavior, and reduced-motion assertions. A wins on editorial judgment, not a claimed measured learning advantage.
- Workbench (B) is not the universal default because controls can precede orientation; retain its pattern for justified tool-first labs. Reading room (C) is not the universal default because discovery and interaction are delayed; retain it as a prose-heavy exception. Do not force the editorial rail onto `native` or `none` runtimes.
- The prototype includes sample essay/lab/practice controls, loading/error/disabled specimens, and a labeled opaque placeholder. It does not integrate production engines or exercise existing saved preferences. Production must preserve the current theme persistence contract, pointer mapping, intrinsic dimensions, manifest declarations, and ownership boundaries.
- Agent visual review covered selected A dark desktop and light narrow captures. No human review, learner outcome, real-device, all-Route accessibility, or browser acceptance is claimed. The full smoke blocker from the baseline remains open as a release gate.

## Comments

### Delegated design resolution — 2026-09-08

The selected design is ready to inform original storytelling and implementation specs. Production code remains unchanged; the artifact is disposable and must not be promoted wholesale.
