# Research 41 — authored overflow and native readiness

## Scope and verdict

Base: `a5aa4a9fb13fd2bc2f6fbde6e766ab2384f77af6`. Worktree: `/tmp/opencode/w0-native-readiness`.
Owned runtime changes are limited to Remember chapter wrapping, COVID article image decoration, QR story-table reflow/accessibility, and Sim textarea font readiness. Engines, compiled assets, manifests, shared smoke, intrinsic image dimensions, SVG viewBoxes, and iframe seams are unchanged.

**Verified:** 24 AFTER cells have identical geometry across three fresh contexts and zero document overflow. Four native interaction helpers pass before and after. The custom interaction assertions pass in 30/72 BEFORE samples and 72/72 AFTER samples. These assertions are deliberately narrower than complete route acceptance.

**Not complete route acceptance:** Sim's visible grid remains 0×0 with `Grid.tileSize === 0` in all 18 BEFORE and 18 AFTER initial-load interaction samples, at desktop as well as narrow widths. Editing/restoring descriptions and native save/export/control checks pass but do not establish a usable visible grid. This is an observed current rendering failure, not a baseline-only discrepancy. A separate grid/container sizing investigation must preserve engine ownership; publishing `ui/resize` would invoke `Grid.updateSize`, so it was not used to disguise the problem in this typography patch. No baseline should bless this zero-size state as complete parity.

## Paired fixture and exact counts

Both passive captures use the unchanged `tools/diagnose-baseline.mjs` and shared geometry fixture: manifest readiness, fonts plus two animation frames, existing scroll behavior and 150ms scroll settle, no generic animation suppression. Chromium headless shell 148.0.7778.96, locked Playwright 1.60.0, local mount `/interactive-explanation/`, port 4221. Browser work ran serially in the exclusive window. The final AFTER capture overlaps lightweight Node unit/audit work, not another browser; therefore timing improvements are not attributed causally to the patch.

Each side has exactly four routes × desktop 1400×1000, mobile 390×844, narrow 320×844 × light/dark = **24 cells, 72 measured samples**, numbered 1–3 per cell. Every passive sample is ready, measured, and has no capture errors or HTTP >=400 responses. Separate interaction runs also contain exactly 24 cells and 72 samples per side, plus four native helper results each. Native bodies are imported unchanged from smoke SHA-256 `ad33c3e7cade9c47f32de006508dbc4db798fcac3001621ab3a902e693db6386`; import paths, root, main detection, and exports alone are adapted.

The first custom interaction attempt is excluded: uppercase-only `NATIVE READINESS 41` selected alphanumeric encoding and legitimately removed the ASCII table, causing a harness timeout. Both accepted interaction runs use mixed-case `Native readiness 41`, which exercises byte encoding. No assertion was removed. The diagnostic geometry pair was not modified to match this interaction fixture.

Evidence:
- `41-native-before.json`, `41-native-after.json`: durable extracted geometry, performance, source file hashes, browser identity, resource timings/transfers, HTTP failures, interaction measurements, and exact interaction harness source. The full temporary JSONL paths and hashes are retained; these JSON files omit verbose request events and navigation internals, not measured geometry/performance results.
- `41-reconciliation.json`: all 24 paired cells, per-cell three-sample min/median/max, exact runtime rectangles, overflow, stability, protected box changes and performance budgets.
- `41-reconcile.mjs`: runnable assertions against captures, with committed evidence fallback when temporary captures are absent.
- `41-gates.json` and `41-gates.mjs`: exact commands, exit statuses and complete check/audit/unit/focused-smoke output.

Run `node .scratch/complete-route-experience/research/41-reconcile.mjs` from the parent worktree. No baseline is written.

## Verified authored corrections and protected dimensions

- **Remember:** at 320px the chapter text previously reached x=346; `overflow-wrap: anywhere` keeps text ranges within the viewport. The fixed illustration/activity frames were not resized. Runtime rectangles and all intrinsic surface sizes remain identical in this paired fixture.
- **COVID:** 18 `p > img` elements had 100% content width plus two 1px borders. The inset outline preserves image content size while removing exactly 2px from each decorated border-box width and height. Natural image widths/heights remain equal in every paired sample. Article height decreases exactly 36px at every viewport/theme; downstream element positions legitimately move. Simulation iframe sizes are unchanged.
- **QR:** the 320px story table previously pushed a 192×192 mask SVG beyond the viewport. Stacking the story table's cells below 380px retains all eight 192×192 SVGs and their viewBoxes. The runtime height grows by 779.265625px only at narrow width; desktop/mobile runtime rectangles remain unchanged. The existing ASCII scroller receives keyboard focus, region label, and inset visible focus styling; mixed-case encoding, arrow-key scrolling when overflowing, and 24px input/button targets pass in all 18 AFTER samples.
- **Sim:** the existing textarea autosizer runs before fonts can settle. The authored adapter waits for the next frame and `document.fonts.ready`, invokes existing textarea `oninput` callbacks, and releases `aria-busy`. It also subscribes to model initialization. Geometry is repeat-stable in all six AFTER cells; baseline samples include differing narrow/mobile textarea-driven heights. No grid resize or engine mutation was added. A rejected async readiness operation remains observable and does not falsely clear busy. The separate zero-size grid failure remains open.

The verifier compares all nine BEFORE/AFTER sample combinations within each cell: intrinsic `width`, `height`, `viewBox`, tags and keys must match. CSS width/height must also match except for COVID images, where the only permitted delta is exactly -2px in both dimensions. All combinations pass. Position changes from authored reflow are recorded, not misrepresented as immutable intrinsic changes.

## Performance reconciliation

Per-cell comparisons use medians of three fresh contexts, with allowance `max(20% of BEFORE, 250ms)` for DOMContentLoaded, load and longest local resource duration, and `max(20%, 250KiB)` for transfer bytes. Resource count allowance is zero. All 24 cells pass every paired median budget. Detailed min/median/max values are retained without rounding in `41-reconciliation.json`.

The following ranges span all 18 samples per route, not confidence intervals or per-cell medians. Milliseconds are rounded to one decimal for readability:

| Route | DCL BEFORE / AFTER ms | Load BEFORE / AFTER ms | Longest local BEFORE / AFTER ms | Transfer BEFORE / AFTER bytes | Resources BEFORE / AFTER |
|---|---|---|---|---|---|
| Remember | 111.9–262.5 / 93.9–309.4 | 348.8–710.0 / 251.3–604.4 | 184.6–308.1 / 131.5–254.6 | 12,530,104–12,745,176 / 12,530,131 | 55–56 / 55 |
| COVID | 129.5–559.1 / 59.3–172.5 | 469.9–843.0 / 235.4–367.3 | 448.3–828.1 / 214.9–353.6 | 3,215,391 / 3,215,415 | 44 / 44 |
| Sim | 55.1–219.6 / 34.4–182.3 | 126.2–262.8 / 98.0–206.8 | 47.2–114.9 / 31.2–78.9 | 1,704,975 / 1,705,532 | 34 / 34 |
| QR | 142.6–367.8 / 85.0–195.4 | 218.3–412.3 / 161.3–218.0 | 32.3–69.5 / 7.7–36.5 | 1,341,216 / 1,342,054 | 16 / 16 |

These are local unthrottled navigation measurements, not field Core Web Vitals, readiness latency, or proof of speedup. Remember's request/transfer range reflects timing-sensitive resource completion in the snapshot; no asset removal is claimed. Custom `interactionMs` includes assertions and waiting, and the native helper duration includes its complete scripted flow; neither is presented as input latency. The original capture preserves finite measured values rather than substituting zeros for missing evidence.

## Focused baseline follow-up, separate from fixes

Successor-004 is unchanged. Each focused CLI invocation exits 1 before native checks because its geometry comparison fails:

- Remember: narrow runtime bottom differs by more than 1px.
- COVID: desktop runtime bottom differs by more than 1px.
- Sim: mobile runtime top differs by more than 1px.
- QR: narrow runtime bottom differs by more than 1px.

The independent native helpers ensure these early failures do not hide the exercised semantics. The baseline owner must reconcile exact AFTER geometry with successor-004 under the same fixture, retaining the protected-dimension rules. COVID's -36px and QR narrow's +779.265625px are directly attributable authored changes. Remember's paired runtime is unchanged, so its successor drift cannot be attributed to this wrap patch. Sim's fixture-relative vertical positions and prior variable heights need separate review, and its zero-size grid must not be approved merely because measurements stabilize. No blanket successor, threshold relaxation, or shared-smoke edit is included.

## Final verification and limits

`npm run check`, `npm run audit`, and `npm run unit` pass (370 tests). Focused smoke failures are retained above and in the gate journal. Shared runtime code was not changed, so browser verification is scoped to the four owned routes rather than a concurrent full-site browser run. The Sim parity note now explicitly records the remaining visible-grid failure. Route code captured for final AFTER is unchanged by that documentation-only update.

This commit delivers bounded layout/readiness fixes and reproducible evidence, not a claim that all four routes satisfy complete experience acceptance. No merge or push is performed.
