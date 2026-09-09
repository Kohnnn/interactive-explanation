# Reconcile the original overhaul with completed Route work

Type: grilling
Label: wayfinder:grilling
Status: resolved
Blocked by: none
Parent: ../map.md

## Question

Which revised scope reconciles the original whole-site overhaul with the completed Route work and its locked invariant contract?

## Decision boundaries

- The user approved extending this map to an all-83-Route benchmark and an original modern F1-inspired visual and storytelling redesign.
- Preserve completed tickets 01–23 as history and reusable infrastructure, not proof that the broader overhaul is complete.
- Reconcile the map's behavior/content/layout restrictions, agent-only visual approval, geometry gates, and commit expectations explicitly; do not silently supersede them.
- Decide where behavior, learner-facing content, layout, and supported runtime presentation may change, and which inherited guarantees remain binding.
- Preserve URLs, user data, security, accessibility, and runtime ownership seams by default; require explicit approval for exceptions rather than rewriting opaque runtimes.
- Define original authorship, licensing, attribution, and local provenance boundaries for retained, adapted, and newly written material.
- The reference is the sibling `f1-racing/` product, not the `formula-1-racing` Route; borrow design principles, not race branding or subject matter.
- Decide criteria for revising or retiring legacy migration tickets 24–28 and rewiring the closure ticket 29 after rollout approval. No automatic unblocking or release of their old bodies.

## Resolution gate

Resolve only through live human agreement on the revised scope and retained guarantees, with explicit pointers to superseded decisions.
The user waived Astra and selected the current model; this charting session creates planning artifacts only, with no benchmark, prototype, application edit, or commit.

## Answer

Resolved through live user decisions on 2026-09-08. The user selected Authored redesign, Both themes, Approved reflow, Reconcile at rollout, and Confirm boundaries. This resolution governs the expanded overhaul wherever historical decisions conflict; completed work remains history and reusable infrastructure, not invalidated implementation.

### Approved scope

- Cover the Atlas, shared components, and all 83 manifest Routes. Redesign authored prose, teaching sequences, controls, navigation, and layout after representative prototype approval and rollout authorization. Reference material informs factual concepts; the new expression and storytelling are original.
- Borrow modern broadcast/editorial design principles from the sibling `f1-racing/` product, not racing branding or its subject-specific data semantics. No work on that sibling product is authorized.
- Retain fully supported light and dark themes. Preserve the existing saved preference, system fallback, and pre-paint initialization contract; prototype both palettes rather than deciding whether light mode survives.
- Permit intentional authored reflow and changes to control placement. Verify keyboard/touch behavior, pointer-coordinate mapping, state, and responsive readability against the approved new design. Preserve engine backing dimensions, intrinsic output, and opaque runtime behavior by default. A needed supported adaptation requires its own explicit approval and compatibility evidence; opaque engine replacement or edits are not authorized.
- Preserve URLs, user data, numerical correctness, security, accessibility, source attribution, and license obligations. Keep static delivery, manifest-owned declarations, scoped ownership boundaries, and authored seams. No framework rewrite or new runtime dependency is approved.
- Maintain one curated Suggested Next Route and Guided Path-only Progress. Its authored presentation may change; the continuation graph and Progress semantics are not implicitly redesigned.

### Authorship and human approval

- Write an original voice and teaching structure while preserving factual meaning. Record retained, adapted, and newly authored material in the relevant local provenance/parity records, with sources, changes, and evidence. Do not describe new teaching behavior as unchanged upstream parity.
- Retain required attribution and license material wherever the applicable obligations require it; visual cleanup and existing public-surface policy do not override those obligations. Uncertain reuse remains blocked pending a specific decision.
- The human approves representative visual and storytelling prototypes and material departures. Routine changes matching the approved patterns use agreed checks; individual manual approval of every Route or minor edit is not required. Rollout defines the wave checkpoints and what constitutes a material departure.
- Automated checks support, but do not replace, human design approval. Editorial learning-value judgments remain hypotheses unless supported by actual learner evidence.

### Explicit reconciliation of inherited decisions

- [Choose the canonical shell isolation model](05-choose-shell-isolation-model.md): supersede the freeze on authored placement, layout, and appearance only within approved redesign scope. Retain shell/Route-owned selector boundaries, explicit runtime roots, structural compatibility, manifest ownership, and the prohibition on styling opaque descendants. This does not authorize broad CSS resets or a universal wrapper.
- [Choose the canonical theme adapter model](06-choose-theme-adapter-model.md): allow approved replacement of authored token values and authored geometry. Retain `html[saved-theme="light|dark"]`, `localStorage["theme"]`, system fallback, pre-paint initialization, namespacing, declared hooks, and intrinsic exclusions. Existing declarations remain authoritative until an approved migration updates them.
- [Assign Route navigation modes and ownership boundaries](07-assign-route-navigation-modes.md): allow proposals for authored navigation presentation and declared-mode changes with prototype and rollout approval. Retain semantic navigation, keyboard/state ownership, manifest synchronization, and opaque runtime boundaries; current assignments remain the baseline, not an irrevocable future layout.
- [Lock the acceptance and rollback contract](08-lock-acceptance-and-rollback-contract.md) and [Enforce complete-experience acceptance gates](14-enforce-complete-experience-gates.md): replace old authored-geometry parity as a design constraint with explicit approved before/after evidence. Historical baselines stay intact; new accepted references require approval per wave. Existing gates and performance ceilings remain active until the benchmark contract and rollout explicitly approve replacements. Never refresh baselines merely to hide a failure. Historical screenshot unavailability is an evidence limitation to reassess, not authority to skip live prototype approval.
- [Lock the Suggested Next Route contract](09-lock-suggested-next-route-contract.md): permit approved presentation and placement changes while retaining the local named link, manifest-owned target, accessible focus, no autoplay or unsolicited focus movement, and Guided Path-only Progress semantics.
- [Sequence family execution and graduate implementation tickets](10-sequence-family-execution.md): supersede the frozen shared-design interface, mandatory legacy family order, and automatic commit expectations for the new effort. Reuse sound infrastructure, plan evidence-led bounded waves, serialize shared-file edits, and retain focused/full regression and rollback discipline. No commit or deployment occurs without an explicit user request.

### Legacy disposition and next decisions

- Keep all unfinished legacy migrations and the close gate blocked behind [Approve the evidence-led overhaul rollout](35-approve-overhaul-rollout.md). Do not complete old-design work just to consume existing tickets.
- At rollout, retain or rewrite useful unfinished work against the approved new contract; retire superseded work with its reason recorded. Rewire the close gate to all approved implementation and acceptance dependencies before resolving rollout approval. Closing that decision must not release unchanged legacy instructions automatically.
- The next frontier is [Define the all-Route component benchmark contract](31-define-component-benchmark-contract.md). Baseline collection, visual/storytelling prototypes, numeric budgets, rollout waves, and implementation are not resolved here.
- No new decision ticket is needed yet: the existing benchmark, evidence, prototype, and rollout tickets own the remaining precise questions. Runtime exceptions, uncertain reuse, and Route-specific opportunities graduate only when evidence identifies them.

## Comments

### Scope resolution — 2026-09-08

The live choices recorded above approve authored redesign with both themes and measured reflow, preserve runtime and authorship safeguards, and defer legacy disposition to rollout. Scope is resolved; no application edit, benchmark run, prototype approval, commit, or deployment is implied.
