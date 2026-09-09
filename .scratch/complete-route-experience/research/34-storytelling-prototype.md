# 34 — Original storytelling prototype decision

## Decision

**Select intent-shaped question/action/consequence/reason/optional-transfer storytelling for specifications. Agent-selected, NOT human approved.** Autopilot delegation replaces the historical interview gate for this bounded planning task; it does not authorize production implementation. Ticket 34 remains untouched by this report.

Use Editorial brief A's original dual-theme hierarchy and token roles, not a copy of prototype 33's variant switcher. The shared voice asks a concrete question, gives the learner an action, names the observed consequence, explains it briefly, and offers optional transfer. These are editorial ingredients, not a universal mandatory sequence.

- **Essay:** orient with one question and a stated model; compare two computed outcomes, then interpret. Keep the caveat next to the experiment, with longer detail behind a native hint.
- **Lab:** start with a direct manipulation, expose the entire relevant state, let an invalid operation explain the dependency, and make recovery available immediately. Do not require a prediction questionnaire before touching controls.
- **Practice:** short question, immediate answer buttons, specific recoverable feedback, optional hint. No mandatory long-form navigation, score pressure, audio pretense, or preceding essay.
- Use visible words for validity and correctness; never encode them only by color. Preserve native keyboard and touch activation, stable feedback placement, and independent reset.
- Make each interaction earn its place by exposing a contrast, dependency, or misconception. Use concise prose or a diagram when there is no meaningful state change; preserve existing runtimes where their authentic behavior is the learning experience.

Learning-value hypothesis: visible equal-error components, blocked out-of-order repairs, and enharmonic spelling feedback may help learners distinguish a result from an unjustified interpretation. Automated checks establish runnable behavior, not improved understanding or learner preference.

Lazier implementation alternative: adapt existing authored questions and feedback around retained engines, rather than introducing a reusable lesson controller or promoting this disposable HTML.

## Artifacts and reproduction

Only three new owned files, all relative to this report:

- [34-storytelling-prototype.html](34-storytelling-prototype.html): self-contained, system fonts, no dependencies or network resources; double-click to explore three independent sections.
- [34-storytelling-prototype.mjs](34-storytelling-prototype.mjs): existing Playwright, Node assertions, temporary loopback server; no browser MCP or installation. Writes no artifacts.
- [34-storytelling-prototype.md](34-storytelling-prototype.md): this decision, provenance, exact output, and limitations.

Run from `interactive-note/`:

```bash
node --check .scratch/complete-route-experience/research/34-storytelling-prototype.mjs && node .scratch/complete-route-experience/research/34-storytelling-prototype.mjs
```

Checker explicitly uses `/home/compute_01/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome`, resolving Playwright from the existing `interactive-explanation/package.json`. It does not fall back to a missing package-default browser. No dependency install, production/full-app gates, commit, deployment, ticket, spec, map, baseline, screenshot, or source-route edit was performed. No separate TypeScript system exists here; the checker compiles all three inline scripts and `node --check` validates the `.mjs`.

The prototype skill's logic branch informed the pure functions, visible state, one-file artifact, and free exploration. Explicit task instructions override its no-tests, production promotion, and throwaway-branch capture advice: checks are required, and production/commits are forbidden. The scratch placement is intentional ownership isolation.

## Representative selection and local provenance

Read [scope 30](../issues/30-reconcile-overhaul-scope.md), [resolved visual decision 33](../issues/33-prototype-f1-inspired-visual-system.md), [storytelling question 34](../issues/34-prototype-original-storytelling.md), [baseline 32](32-browser-baseline.md), [33 report](33-visual-prototype.md), [33 HTML](33-visual-prototype.html), and [33 checker](33-visual-prototype.mjs) before authoring.

Baseline 32 measured 504 passive cells, including 42 overflow cells; those are not 42 Routes. It did not activate keyboard, touch, or recovery paths. Its repeated examples include bias-variance, blockchain, and Teoria interval practice. This artifact uses bias-variance and blockchain concepts plus scale-construction as a representative spelling-focused Teoria practice sibling. It neither fixes baseline findings nor inherits production correctness from those measurements.

| Classification | Local source | Retained, adapted, or new expression |
| --- | --- | --- |
| Retained design contract | [33 decision and exact tokens](33-visual-prototype.md) | Both A palettes unchanged in value; namespaced `--sp-*`. Fine rules, functional control surfaces, one 2.3:1 supporting rail, 1200px maximum, 16px gutters, stacking at 800px. Orange actions, blue explanatory feedback. No race branding, evidence-ranking colors, or copied switcher. |
| Adapted presentation | [33 HTML](33-visual-prototype.html) | System sans body and controls, locally available Georgia headings, system monospace context labels. Independent sections replace variant navigation. The support rail offers optional direct anchors, not required practice chapters. |
| Retained conceptual scope, new lesson | [bias-variance local parity](../../../interactive-explanation/docs/bias-variance/parity.json) | Retain distinction between bias, variance, and squared error. New deterministic arrays, computation, question, interpretation choices, feedback, and transfer prompt. No compiled chart, LOESS, KNN, scrollytelling, KaTeX, or upstream prose copied or rewritten. |
| Adapted conceptual dependency, new toy | [blockchain local parity](../../../interactive-explanation/docs/blockchain/parity.json) | Source documents downstream invalidation and live mining/hash behavior. Adapt only the dependency idea into three revision-labeled receipts with explicit validity flags and ordered acknowledgment. No source algorithm, cryptographic implementation, proof-of-work, peer network, or security semantics are retained. |
| Retained intent, new exercise | [scale-construction local parity](../../../interactive-explanation/docs/teoria-scale-construction/parity.json) | Preserve compact practice-first intent and recoverable answers. New D-major spelling prompt and explanation; no score, staff, audio samples, source exercise scripts, or runtime mounts copied. |
| New authorship | [this HTML](34-storytelling-prototype.html) | All learner-facing teaching prose, arrays, receipt state machine, spelling feedback, hints, and transfer questions are authored for this isolated artifact. |

These are local provenance pointers, not a license determination. No claim that these are licensed-source rewrites, and no license inference from a parity record. Existing attribution and license obligations remain untouched; any future source-expression reuse requires its own review. The prototype is not unchanged upstream parity.

## Accuracy and state contract

### Essay

Target `10`, one fixed input, four equally weighted predictions per chosen set:

| Choice | Predictions | Mean | Squared bias | Variance | MSE |
| --- | --- | ---: | ---: | ---: | ---: |
| Stable but shifted | `[6, 6, 6, 6]` | 6 | 16 | 0 | 16 |
| Centered but variable | `[6, 6, 14, 14]` | 10 | 0 | 16 | 16 |

Values are computed, not placeholder readouts. Variance divides by sample count, not the unbiased-estimator denominator. Algebra over this equally weighted sample gives `MSE = squared bias + variance`. There is no random target noise and therefore no irreducible-noise term. These empirical repeated-fit quantities are not a generalization proof or population estimate. No claim that complexity always reduces bias or increases variance; no complexity engine exists.

The checker also verifies `[6, 8, 12, 14]` has MSE 10, not 16; `[10, 10, 10, 10]` has MSE 0; and several other arrays satisfy the identity. “Centered means zero MSE” produces a specific retry explanation; the equal-MSE interpretation explains the distinct components. Reset restores shifted predictions, unanswered feedback, and closed hint.

### Lab

Initial state: three receipts at revision 1, all valid. Changing position `i` increments only its revision and marks it and every descendant invalid; earlier receipts retain their state. Repair acknowledges one receipt only if every earlier receipt is valid. An out-of-order attempt leaves the full state unchanged and reports the blocked action. Repairing an already-valid receipt is harmless. Reset restores all revisions, validity, initial feedback, and closed hint.

This is **NON-cryptographic illustrative link state, no mining/hashing**. The dependency is represented by explicit flags, not a digest. “Valid” means only current according to this toy's rules; anyone can repair it. Authenticity, immutability, security, mining, and consensus are neither simulated nor established. The toy deliberately exposes the dependency/recovery story rather than inventing fake crypto.

### Practice

Correct sequence: `D E F# G A B C# D`; major-scale semitone pattern `2–2–1–2–2–2–1`. Each letter appears once before the tonic repeats. Gb is enharmonic to F# in twelve-tone equal temperament but repeats G and omits F in this scale spelling. Wrong feedback explains the mistake and permits immediate retry; right feedback supplies the complete sequence and pattern. No playback or hearing-based learning claim. Reset restores the unanswered prompt and closes the hint.

### Themes and ownership

Pre-paint system selection sets `html[saved-theme]`. Theme switching is memory-only, leaves lesson state intact, and overrides subsequent system changes until reload. Reload clears lesson state and restores system following. No storage API is present in the HTML; no saved progress exists. This does not implement or replace production's saved-preference contract. No production engine integration, shared component, route navigation declaration, intrinsic dimensions, or pointer mapping is changed.

## Exact actual verification output

Command above exited 0. `node --check` emitted no text. Runnable checker output:

```text
Environment: Node v24.20.0; Playwright 1.60.0; Chromium 151.0.7922.34; linux
Inline syntax: 3/3 passed; pure check groups: 12/12 passed
1400x1000/light: PASS (overflow 0px; 22 controls >=44x44; interactions/reset/theme PASS)
390x844/light: PASS (overflow 0px; 22 controls >=44x44; interactions/reset/theme PASS)
320x844/light: PASS (overflow 0px; 22 controls >=44x44; interactions/reset/theme PASS)
1400x1000/dark: PASS (overflow 0px; 22 controls >=44x44; interactions/reset/theme PASS)
390x844/dark: PASS (overflow 0px; 22 controls >=44x44; interactions/reset/theme PASS)
320x844/dark: PASS (overflow 0px; 22 controls >=44x44; interactions/reset/theme PASS)
Token contrast: {"light":{"text/bg":15.28,"text/surface":16.39,"muted/bg":5.89,"muted/surface":6.32,"action/bg":6.07,"action/surface":6.51,"data/bg":6.05,"data/surface":6.49,"rule/bg":3.64,"rule/surface":3.9,"on-action/action":6.51},"dark":{"text/bg":17.08,"text/surface":15.18,"muted/bg":10.22,"muted/surface":9.09,"action/bg":9.14,"action/surface":8.13,"data/bg":9.14,"data/surface":8.13,"rule/bg":4.86,"rule/surface":4.32,"on-action/action":9.14}}
PASS: 12/12 pure check groups; 6/6 viewport-theme cells; no page errors or external requests.
```

### What those passes mean

- Twelve named pure check groups, not twelve total assertions: two exact decompositions, alternative array, transfer, additional identities, math input guards, all three invalidation positions with guarded/ordered recovery and input immutability, repeated mutation, transition guards, correct spelling, recoverable spelling, spelling guard.
- Six fresh browser contexts: `1400×1000`, `390×844`, `320×844`, each light/dark, reduced-motion emulation and touch enabled. Existing desktop Chromium revision 1234, not the package-default headless shell; no real-device claim.
- Every cell checks zero horizontal document overflow and 22 native buttons/links/summaries at least 44×44px and within viewport width. Rechecks follow expanded feedback, all open hints, and theme switching; no overflow hiding.
- Token luminance ratios from actual computed custom properties: tested text pairs at least 4.5:1, rule pairs at least 3:1. Focus uses the tested data color with a 3px solid outline; computed keyboard focus checked.
- Essay values and both interpretation branches; lab edits at all three positions, blocked repair with unchanged state, ordered repair and reset; practice wrong/right via both emulated tap and keyboard, exact scale/pattern, and Space reset.
- All hints open with keyboard and close on lesson reset. Native Tab from practice reset reaches its hint. Four atomic polite live outputs exist; all in-document navigation anchors resolve.
- Theme activation by tap and keyboard, state retention across switching, memory override, reload reset, subsequent system following, empty browser storage, reduced motion, no observed page exceptions or external requests.

## Alternatives rejected and remaining limits

Reject a mandatory predict/manipulate/observe/explain/transfer wizard: it delays labs and practice without evidence that the delay teaches. Reject long-form-first practice navigation: the spelling question needs direct answers, not a chapter gate. Reject decorative interaction or label-only sliders: each toy here produces an actual computed or stateful consequence. Reject a complexity slider with universal monotonic claims and a fake-hash blockchain: both would misrepresent what was demonstrated. Reject a new shared runtime or whole-site content rewrite from this sample.

This is agent editorial selection supported by assertions and DOM geometry, not human approval, screenshot-based visual review, or real learner validation. No screen reader, exhaustive focus traversal, real touch device, cross-browser/zoom suite, pixel-level contrast audit, performance distribution, production saved-theme integration, actual audio/chart/chain runtime, or all-83-Route coverage was measured. Token contrast is not accessibility certification. Baseline 32's production findings and blocked full-smoke release evidence remain unchanged.

Carry these rules into bounded implementation specifications; retain intent-specific pacing and original authorship records. Production changes still need separately authorized runtime compatibility, persistence, accessibility, attribution, and regression evidence. Do not promote the disposable artifact wholesale.
