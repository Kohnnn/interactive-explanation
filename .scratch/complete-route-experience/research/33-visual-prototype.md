# 33 — Visual structure prototype

## Decision

**Select A, Editorial brief, for implementation specifications. Agent-selected, NOT human approved.** The latest autopilot delegation in the governing map supersedes ticket 33's historical live-review gate for specs-only planning. This report does not edit or resolve that ticket and does not authorize production migration or deployment.

Question: which original modern F1-product-inspired editorial structure suits Atlas discovery, essay, lab, and practice in both themes while preserving opaque seams?

A makes one question dominant, follows it with rule-led essay/lab/practice sections, and keeps discovery and state specimens in one supporting rail. All three candidates passed the measured checks, so A is selected on agent editorial judgment after feasibility checks, not because automation proved aesthetic or learning superiority. The same restrained role system can support Atlas discovery and Route teaching without importing race-specific evidence classifications.

## Artifacts and reproduction

All paths below are relative to `.scratch/complete-route-experience/research/`:

- `33-visual-prototype.html`: one disposable HTML file; open directly, with `?variant=A`, `?variant=B`, or `?variant=C`. Floating previous/next buttons and left/right keys change the shareable parameter. Input, select, textarea, and contenteditable focus retain arrow ownership.
- `33-visual-prototype.mjs`: runnable check using the existing app's Playwright; starts and closes its own loopback server and browser, without browser MCP or a shared session.
- `33-visual-prototype.md`: this decision and evidence report.
- `33-visual-prototype-A-light-1400.png`, `33-visual-prototype-A-dark-1400.png`, `33-visual-prototype-A-light-320.png`, `33-visual-prototype-A-dark-320.png`: full-page captures from the passing run. Rerunning the check overwrites only these owned screenshots.

Run from the parent `interactive-note/` directory:

```bash
node --check .scratch/complete-route-experience/research/33-visual-prototype.mjs
node .scratch/complete-route-experience/research/33-visual-prototype.mjs
```

Optional executable override: `PLAYWRIGHT_EXECUTABLE_PATH`. Default: `/home/compute_01/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome`. No dependencies, fonts, CDN, or runtime copies are added.

The isolated artifact is an explicit exception to the prototype skill's preferred in-route placement: this task prohibits production and sibling edits. No prototype branch, commit, promotion, or shared switcher component was created. The lazier implementation alternative is scoped changes to existing authored tokens and sections, not a new component library or universal Route wrapper.

## Sources reviewed before authoring

- Prototype skill and `UI.md`: three structurally distinct variants, URL selector, floating switcher, disposable state.
- `../map.md`: delegated specs-only decisions, retained authored seams, both themes, no production changes.
- `../issues/30-reconcile-overhaul-scope.md`: authored redesign/reflow, preserved data, runtime, provenance, and saved-theme contract.
- `../issues/31-define-component-benchmark-contract.md`: distinguish measurements from source/agent/human review; representative sizes and missing modalities.
- `../issues/32-capture-current-site-benchmark.md`: 42 passive overflow cells, uncertain readiness findings, blocked smoke launch and deeper modality coverage. The prototype does not fix or remeasure these production findings.
- `../issues/33-prototype-f1-inspired-visual-system.md`: representative discovery, teaching modes, control density, boundary and state specimens.
- `../../f1-racing-product-evolution/issues/11-prototype-broadcast-editorial-visual-system.md`: broadcast restraint, editorial hierarchy, fine rules, functional rather than decorative panels, sans/serif/mono roles. Its approval does not transfer here.
- `../../../interactive-explanation/shared/site.css` and `shared/tokens.css`: existing bounded layout, rule-led sections, semantic token roles and `saved-theme` selector. Existing bone-paper/Prussian-blue values were reviewed, not modified or imported. No sibling app files were edited or needed.

## Alternatives and editorial judgment

| Variant | Actual structure | Decision |
| --- | --- | --- |
| A — Editorial brief | Large single question; 2.3:1 main/support grid; main essay, lab, practice; rail discovery then state specimens; stacks below 800px in DOM order | Select as the default direction. Supports orientation before manipulation and limits decorative panels to controls and runtime frame. |
| B — Workbench | Compact question; near-equal columns; functional workspace foregrounds lab then practice, while explanation and discovery occupy the adjacent reference column | Reject as the universal default. Controls arrive before conceptual orientation, especially on narrow screens. Retain as a possible separately scoped tool-first lab pattern, not a forced generated rail. |
| C — Reading room | 760px maximum shell; no support rail; sequential discovery, essay, lab, practice, states; larger vertical section spacing | Reject as the universal default. Strong linear reading but delays hands-on work and discovery becomes an extra step before the essay. Could suit a prose-heavy Route after scoped validation. |

These are different information hierarchies and DOM sequences, not recolors. Selection is not a learner-tested preference or measured learning gain. All retain the same original sample content for comparison.

## Exact proposed tokens and roles

Tokens are namespaced `--vp-*` and isolated to `.vp-root` / `.vp-body`; do not copy the prototype's descendant rules into a production runtime root.

| Token | Light | Dark | Role |
| --- | --- | --- | --- |
| `--vp-bg` | `#f5f7fa` | `#0b1018` | Page background |
| `--vp-surface` | `#ffffff` | `#141d2a` | Functional control group, placeholder frame, preview chrome |
| `--vp-text` | `#17202d` | `#eef3f8` | Primary readable text |
| `--vp-muted` | `#526174` | `#b2bfd0` | Secondary copy, contextual labels, disabled explanation; never hidden uncertainty |
| `--vp-rule` | `#748297` | `#718299` | Fine section rules, control outlines, neutral bounded states |
| `--vp-action` | `#a33d00` | `#ff9b55` | One filled primary action, ordinary underlined links, native range accent |
| `--vp-on-action` | `#ffffff` | `#0b1018` | Text on primary action |
| `--vp-data` | `#185abd` | `#81b6ff` | Explicitly illustrative numeric output, feedback rule, focus outline |

Orange does not mean Derived; blue does not mean Recorded. Neither conveys racing, performance ranking, completion, or evidential authority. Status specimens use visible words and explanatory prose rather than color-only signals.

Typography and geometry:

- Body/navigation/controls: `system-ui, "Segoe UI", sans-serif`; body `16px/1.65`.
- Display/section headlines only: `"Iowan Old Style", "Palatino Linotype", Georgia, serif`; A/C display `clamp(2.25rem, 4.5vw, 4.6rem)/1.08`, maximum `18ch`.
- Context labels and illustrative output: `ui-monospace, Consolas, monospace`; context labels `.8rem/1.6`.
- Shell maximum `1200px`, `16px` side gutters; A grid `minmax(0, 2.3fr) minmax(240px, 1fr)` with `48px` gap; single-column breakpoint `800px`.
- Rule width `1px`; functional controls `4px` radius; no decorative nested cards.
- Native buttons, range, select, links and summary: at least `44px` tall; measured boxes also at least `44px` wide. Focus: `3px solid --vp-data`, `4px` offset.
- No ornamental motion or new media. Reduced-motion rule explicitly disables animation, transitions and smooth scrolling.

## Authored behavior and ownership

The discovery list, sampling analogy, lab labels, interpretation choices, feedback and caveat are newly authored for this artifact, not copied Route or engine content. Discovery links target existing sections in the same HTML; they are visibly labeled as sample document navigation, not fake published Route links.

The native range changes a label from 10 to 100 in increments of 10 and emits immediate textual feedback; it computes no statistical result. Practice offers two interpretations with honest local feedback; it does not grade, persist, or create Progress. The details element reveals the sampling analogy's caveat. Loading/error copy is labeled as static specimens; retry is genuinely disabled with a visible reason.

The dashed opaque-runtime frame is explicitly not an engine. Its minimum height is illustrative authored geometry, not a claim about an existing renderer's dimensions. No canvas, iframe, audio, model, child document or engine is loaded. Actual migrations must retain manifest-owned navigation, one curated Suggested Next Route, Guided Path-only Progress, theme ownership, intrinsic geometry, pointer mapping and runtime state. No universal wrapper or descendant theme override is approved.

Theme initialization sets `html[saved-theme="light|dark"]` in the head from the system preference before body rendering. The toggle overrides that value in memory; system changes follow until a toggle is used. Reload restores system selection. This deliberately does not read or write saved preferences: it previews the attribute, not the existing production `localStorage["theme"]` integration. Production preference retention and pre-paint behavior still require integration evidence; no flash measurement is claimed.

## Measured evidence

Run started `2026-09-08T15:03:11.894Z`; Linux, Node `v24.20.0`, existing Playwright `1.60.0`, explicit existing Chrome `151.0.7922.34`. One fresh browser context per cell, default device scale, desktop browser with emulated viewport/theme/reduced motion, loopback HTTP, no network or CPU throttling. Browser revision is explicitly overridden; not the package's default headless shell. These are prototype checks, not repeat performance measurements or real devices.

**18/18 cells passed:** A/B/C × light/dark × `1400×1000`, `390×844`, `320×844`.

Per-cell assertions passed:

- Document horizontal overflow `0px`; every visible native control/link/summary bounding box stays within viewport width and meets `44×44px` minimum. No overflow hiding is used.
- Correct initial system theme, theme toggle and reload reset; subsequent system-theme change propagates. Browser local/session storage remain empty.
- Correct variant parameter and DOM state; keyboard and button next/previous switching; wraparound through all variants; reload retains URL selection; moving sections retains range state.
- Primary action moves focus to range; ArrowRight changes 30 to 40 and updates output without switching variants; visible computed focus outline is solid.
- Select retains arrow ownership and both interpretation feedback branches work; injected text input, textarea and contenteditable specimens do not trigger switching.
- Native details opens; retry is disabled; every sample anchor resolves to exactly one local target.
- Under emulated reduced motion, every descendant has no animation and zero transition duration. Source includes the explicit reduced-motion media rule.
- No page exceptions or non-loopback requests observed. This does not claim exhaustive console/network-state testing.
- Inline scripts compile via `vm.Script`; source has no storage API references, external URLs, canvas or iframe elements.

Contrast ratios computed from the actual rendered custom-property hex values using WCAG relative luminance:

| Pair | Light | Dark |
| --- | ---: | ---: |
| text / page | 15.28 | 17.08 |
| text / surface | 16.39 | 15.18 |
| muted / page | 5.89 | 10.22 |
| muted / surface | 6.32 | 9.09 |
| action / page | 6.07 | 9.14 |
| action / surface | 6.51 | 8.13 |
| data / page | 6.05 | 9.14 |
| data / surface | 6.49 | 8.13 |
| rule / page | 3.64 | 4.86 |
| rule / surface | 3.90 | 4.32 |
| on-action / action | 6.51 | 9.14 |

All tested text pairs exceed 4.5:1 and rule/focus-supporting pairs exceed 3:1. This is token contrast, not an exhaustive pixel-level or native-widget accessibility audit.

Additional read-only checks passed: `node --check` on the artifact checker, app `npm run audit`, and app `npm run check`. There is no TypeScript typecheck configured. No production sync, baseline refresh, full smoke, installation, dependency change, commit or deployment was performed by this task; ticket 32's blocked production smoke evidence remains unchanged.

## Review and remaining limits

- **Source reviewed:** source documents above, variant sequences, authored seam descriptions, neutral state labels, lack of persistence/external resources, reduced-motion treatment.
- **Agent visually reviewed:** selected A dark desktop and light 320px full-page screenshots. Their question hierarchy, single rail, rule-led sections and narrow readable stack support selecting A. A light desktop and dark 320px screenshots were captured but not separately visually inspected. B/C have DOM/geometry/interaction evidence, not screenshot-based visual review.
- **Screenshot caveat:** the required fixed preview switcher overlays a strip of the initial viewport in full-page screenshots. Content is scroll-reachable, with 160px bottom padding, but these captures are not clean production compositions. The switcher is throwaway chrome, not a proposed Route feature.
- **Not reviewed or measured:** human design review, learner outcomes, real touch devices, screen readers, exhaustive keyboard traversal, browser zoom, cross-browser behavior, native slider thumb pixel contrast, all-Route element coverage, loading/recovery integration, actual engine states, performance distributions, Core Web Vitals, production storage integration, numerical correctness of any runtime.
- No new learning or performance improvement is claimed. Original text is illustrative editorial material, not a production content/provenance migration. Opaque compatibility remains a separate release obligation.

Recommendation: carry A's question-first hierarchy, token roles, one support rail and native functional control groups into specs. Use B only for a separately justified tool-first layout and C only for a separately justified long-read layout. Adapt existing authored seams rather than promoting this disposable HTML or changing opaque descendants. Keep all unresolved runtime, saved-preference, accessibility and learner-review obligations explicit in rollout acceptance.
