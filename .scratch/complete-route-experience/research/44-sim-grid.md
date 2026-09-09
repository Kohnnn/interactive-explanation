# Research 44 — Sim native grid sizing

## Result

Supported authored CSS fix on isolated `w0-native-readiness`, parent `0d9a576`. Main/integration untouched. The engine now renders an operational grid. Transfer acceptance is **not resolved**; no baseline was changed.

## Red-capable reproduction and cause

`node /tmp/opencode/44-sim-probe.mjs <site>` failed on both detached `a5aa4a9` and `0d9a576`: initialized 33 rows × 40 columns, `Grid.tileSize=0`, grid 0×0. The desktop body had only 112.469px computed content height and main had zero height. Grid's existing sizing calculation (`scripts/engine/Grid.js:125-137`) subtracts play height from body height and editor width from body width. At desktop the resulting grid container was 28px tall, too short for 33 rows. At narrow widths the full-width stacked editor also leaves zero width under that subtraction. This predates the font-ready adapter. The diff from a5aa4a9 to 0d9a576 changes only font-ready textarea callbacks; it does not publish `ui/resize` or call `Grid.updateSize`.

Ranked hypotheses were collapsed body sizing, narrow editor subtraction, and initialization before layout. Explicit CSS container sizing alone restored 21px desktop tiles, proving a supported authored layout correction exists. No new lifecycle hook, engine mutation, or resize publication is needed. Native model initialization and native window resize still own Grid.updateSize.

## Minimal correction

Route-local index CSS establishes the main viewport height and zero body inset, bounds the desktop grid to the space beside the editor and above the existing 60px controls, and preserves the stacked 52vh narrow grid. Two narrow pixels are reserved for native decoration; this prevents edge overflow during autoplay without hiding or clipping cells. The background outer border becomes an inset outline, and padded editor textareas use border-box sizing. Existing shared CSS remains last per the canonical seam test. No engine, font loader, compiled file, shared CSS, smoke implementation, or baseline is edited.

## Actual simulation checks

`44-sim-operational.mjs <site-root> <exclusive-jsonl>` uses three fresh contexts at each of 1400×1000, 390×844, 320×844 and light/dark: exactly six cells and 18 samples per side. It waits for initialized model and font-ready authored state, then:

1. Requires positive tile size and exactly 1320 rendered DOM cells.
2. Chooses a different brush if necessary and physically clicks cell (5,5).
3. Requires that exact model cell to equal the brush and its rendered text to equal the corresponding emoji.
4. Clicks play, waits for actual model evolution, pauses, and checks every rendered cell against its model agent.
5. Resizes the viewport and requires a positive in-bounds grid; rejects page errors and document overflow.

BEFORE: all 18 fail the positive tile assertion. Final AFTER (`after-final5`): all 18 pass. Final tiles are 21px desktop, 9px mobile, and 7px narrow; all 1320 cells are present. This native engine uses DOM emoji cells, not canvas: canvas inventory is zero on both revisions, so fabricated canvas-backing checks would be misleading. Actual cell/model rendering is the backing check here. Paused initial state is used only to make pointer attribution deterministic; separate unmodified diagnostic captures exercise default autoplay.

## Paired passive and performance evidence

`44-sim-evidence.json` retains source identities, browser, full measured geometry/performance, resource response bytes/statuses, operational rows, and per-cell min/median/max. Passive BEFORE and final AFTER each contain exactly six cells × three samples = 18 measured ready samples. All final AFTER document overflow values are zero. Browser work was serial, same Playwright 1.60.0 / Chromium 148.0.7778.96 and existing diagnostic fixture; fresh contexts, no interception/cache manipulation, unthrottled local server. OS cache and scheduler remain uncontrolled.

Transfer is exactly 1,705,532 bytes BEFORE and 1,706,168 AFTER in every passive sample: +636 bytes, with resource count unchanged at 34. The immutable successor-005 reference is 1,085,315 bytes and 33 resources. Every final sample still fails transfer and count against that reference. Research43's exact original failure was `same-origin transfer 1705532 bytes exceeded 1085315 bytes + 256000 bytes` and `resource count 34 exceeded 33 + 0`.

Current responses include the working OpenSansEmoji font (532,916 transferred bytes, HTTP 200). The corrected URL exists even at reference source `4c4c352`; therefore the missing historical request cannot be conclusively attributed to this patch or to a broken historical URL from source alone. The old aggregate has no per-resource capture here that proves a cache/response explanation. Removing a required emoji fallback is not an acceptable budget fix. A separately reviewed performance reference/resource audit is needed; no claim that the old reference is automatically invalid is made.

Final paired timing ranges (all 18 samples, ms): DCL BEFORE 41–174.8, AFTER 87.4–473.7; load BEFORE 97.2–194.9, AFTER 111.2–594.2. Per-cell medians/ranges are retained. Mobile-light paired medians regress beyond 250ms: DCL 87.4 to 356, load 112.1 to 448.4. These real timing trips are retained, not averaged away or called a speedup. Rendering a real grid now does work that the zero-size state avoided; scheduler/resource timing also varies. The evidence does not isolate their relative contribution. Historical-reference timing trips are likewise retained per sample; those per-sample diagnostics are not represented as the CLI's median verdict.

## Gates and limitations

Final `npm run check`, `npm run audit`, and all 370 unit tests pass; complete output in `44-sim-gates.json`. An earlier unit failure caught stylesheet ordering and was corrected before final captures. Focused successor-005 smoke now stops at `sim mobile geometry baseline runtime top shifted by more than 1 CSS px`; it does not reach its performance gate. Direct performance comparisons above retain the independent transfer failure despite this early geometry stop.

The fix deliberately changes runtime layout and native computed tile sizes from zero to operational values; the model remains 40×33. Geometry baseline follow-up is separate. No blanket baseline approval, forced cache behavior, canvas shim, fake pass, or engine modification is included. The original red probe and intermediate candidate journals remain under `/tmp/opencode`; committed evidence uses only the final exact-source operational and passive samples. Reconciliation regeneration uses these named temporary journals; the committed JSON is the durable result if temporary artifacts expire.
