# Interactive Explanation — Atheneum-native redesign

Make the interactive-explanation site feel native to the Keith's Atheneum Quartz app,
and repair the interactives the user flagged. Single pass, shipped together.

## Design source of truth
Keith's Atheneum tokens live in `ProjectObsidian/keith-digital-garden/quartz.config.ts`.
Fonts already match (Be Vietnam Pro + IBM Plex Mono). The divergence is palette + theme model.

| role | old (interactive) | Atheneum-native target (light / dark) |
|------|-------------------|----------------------------------------|
| base surface | `#f6efe2` | `#f4eddc` / `#0f141e` |
| primary ink | `#201813` | `#2b2620` / `#f3ebdd` |
| muted | `#68574b` | `#8a6f4d` / `#8fa3b3` |
| accent | `#b44c2f` terracotta | `#1f3a5f` prussian blue / `#94b4c1` steel |
| secondary accent | `#1f6c63` teal | `#6f7f5c` olive / `#b9cbd2` |
| borders | `rgba(32,24,19,.14)` | warm low-contrast bone lines |

## Theme model (the gating decision — recommendation adopted)
Adopt the Quartz model verbatim so a visitor's choice carries across both surfaces:
- attribute `saved-theme="light|dark"` on `<html>` (was `data-theme`)
- persistence `localStorage["theme"]` (was `ie-theme`)
- default from `prefers-color-scheme` when unset

Route-local theme CSS in `load-balancing/` and `memory-allocation/` still uses `data-theme`
by their own vendored runtimes; left untouched — migrating shared chrome decouples them cleanly.

## Phases
1. Theme-model alignment — `shared/theme-init.js`, `shared/public-footer.js`, `shared/tokens.css`,
   `tools/smoke-bundle.mjs` (dark-mode probe key).
2. Palette retune — `shared/tokens.css` only; reskins all 82 routes + atlas + footer + top bar.
3. Atlas chrome polish + missing home theme toggle — `index.html`, `shared/site.css`, `shared/site.js`.
4. Interactive repairs — driven by the user's route-slug list (symptom-first, rewrite from logic,
   preserve teaching intent). MLU + `ev/` audited clean; awaiting the additional slugs.
5. Validate — `check-public-surface.mjs .` + `smoke-bundle.mjs .` per family, both themes,
   desktop + mobile.

## Progress
- [x] Phase 0: audits (design language mapped, theme-model gap confirmed, MLU/`ev` verified working)
- [x] Phase 1: theme-model alignment to Quartz `saved-theme` / `localStorage["theme"]`
- [x] Phase 2: palette retune to Atheneum tokens
- [x] Phase 3: atlas chrome polish + home theme toggle
- [ ] Phase 4: interactive repairs (blocked on user route-slug list; MLU + `ev` confirmed clean)
- [x] Phase 5: validation (audit + smoke)
