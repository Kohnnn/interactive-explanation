# 49 — Source-bound original collision admission

Status: implemented for independent review; CI qualification and release remain BLOCKED.

## Authority and exact scope

The user approved independent original replacement admission, not equivalence to the archived multidimensional engine. This change implements only `rigid-body-collisions`, for PR base `db191963fd9a061ca063b9e73fd460b1dc77d4b0`. Reference `63a8bddc982ab8cb5d641386d0186027fe0b57b1` is the first original 1D implementation, not a measurement-derived successor. Its route, shared tree and metadata are identical to product checkpoint `542b16ada9dfcac0edb1e6ce9f3f29e2e1122d23`.

`tools/rigid-original-admission.json` records all four exact route Git blobs, the complete route tree (rejecting extra files), the complete shared tree (including fonts and transitive CSS/runtime dependencies), favicon, and canonical SHA-256 projections of the complete `rigid-body-collisions` object in both metadata files. Unrelated route metadata may change without redefining this admission; any rigid route field change, missing/duplicate rigid entry, source pin change, or base change requires new review. The tree pins are conservative source coverage, not permission to execute archived shared runtimes. No harness/document self-hash loop or automatic changed-route admission exists. Full immutable filesystem/Git verification runs before measurement, and all three source identities are rechecked afterward.

## Admission conditions and CI integration

The workflow checks out the original reference from the fixed product repository using a literal 40-character SHA. No dynamic fetch script or reference supplied by measured content is executed. The head harness, locked browser and server capture every source; each source supplies its own declared readiness selectors and network policy.

All 504 base-control/base/head cells remain captured. The six rigid archived comparisons remain explicitly recorded as `legacy-original-evidence`, including readiness failures and blocked geometry; no equivalence or speedup is claimed. Only these six cells then receive three original-control, three original-reference and three original-head samples, sequential fresh contexts on the same browser/server/subpath. This adds 54 contexts to the existing 4,536, plus 18 independent functional and four fallback contexts. There are no retries, discarded outliers, masks or accepted noisy controls.

Original timing/transfer/count qualification uses existing `compareCell` unchanged: timing allowance max(20%, 250ms), transfer max(20%, 250KiB), count increase zero; same-source ranges and median drift at most half the timing allowance, exact stable resources. No absolute load/DCL SLO was supplied, so no 5s/2.5s ceiling is invented. This is regression control against the reviewed original artifact, not proof of an absolute performance SLO. Original geometry must be stable within every three-sample group and unchanged between original reference and head in all three viewports and both themes.

Before admission, CI must pass the existing five mathematical tests (including the 2,000-case bounded conservation/restitution/energy grid and invalid inputs) and the original browser matrix. The latter checks numeric consequences, no-approach behavior, reset/error recovery, theme preservation, named 44px controls, keyboard focus, touch reset, stored themes, system/storage-denied fallback, four preserved hashes, continuation, overflow and runtime/network failures. Request monitoring forbids remote or archived `/_nuxt/` requests, including incomplete ones. These are scoped authored checks, not a blanket WCAG, assistive-technology, real-device or learner-outcome certification.

## Exact source byte inventory

These are uncompressed source bytes, not measured wire-transfer ceilings. Owned replacement total: **17,258 bytes**, four files, zero change from first-original reference:

| Route file | Bytes |
| --- | ---: |
| index.html | 7,778 |
| lesson.css | 5,561 |
| lesson.js | 2,971 |
| physics.js | 948 |

Shared/requested source inventory (all pinned through the shared tree): theme-init.js 821; public-footer.css 5,825; engineering-sandbox.css 104,797; engineering-sandbox.js 35,932; public-footer.js 20,431; tokens.css 5,700; be-vietnam-pro-400.ttf 120,228; be-vietnam-pro-600.ttf 123,064; be-vietnam-pro-700.ttf 126,228; ibm-plex-mono-400.ttf 128,812; ibm-plex-mono-600.ttf 133,444. The complete rigid entry is projected from both metadata files; whole-file metadata bytes are intentionally not an admission pin because unrelated routes share those files. Favicon is 810 bytes. The complete pinned shared tree additionally covers unused shared files, deliberately rejecting silent dependency substitutions. No new payload class, font or dependency is added by admission. Rigid source and projected metadata delta against first-original reference is exactly zero; inherited shared fonts remain a real cost, not a claim that this route transfers only 17KB.

## Local evidence, not CI qualification

- `npm run check` and `npm run audit`: passed. Initial unit attempt failed because this isolated worktree lacked Playwright; `npm ci` installed the unchanged lockfile dependencies, then **392/392** unit tests passed (387 existing + five admission tests). No Windows-owned existing qualification test was edited.
- `node tools/rigid-body-browser.mjs`: Chromium 148.0.7778.96, six cells × three contexts plus four fallback contexts passed. No horizontal overflow; sliders 44px high, reset 44.390625px high. Observed top-document transfer 1,034,370 bytes and 16 resource entries (17 including navigation), not an approved absolute budget.
- `node tools/diagnose-baseline.mjs --root . --route rigid-body-collisions --output /tmp/opencode/w0-admission-geometry.jsonl`: 18/18 measured, stable geometry in all six cells. Both themes: desktop rect left 84, top 0, width 1232, height 2823.171875; mobile left/top 0, width 390, height 3974.640625; narrow left/top 0, width 320, height 4460.90625. Journal retains full raw geometry, source identities and historical comparison failures. Local timing is noisy (mobile-light range exceeds the unchanged control allowance); it is not promoted into acceptance.
- Focused strict smoke with `--skip-performance` remains failed: `rigid-body-collisions desktop geometry baseline runtime right shifted by more than 1 CSS px`. No legacy baseline file was changed.

## Review and remaining blockers

Implementation self-review covered documented conventions and the parent spec separately. No second reviewer/sub-agent is available in this session; this note makes the contract independently reviewable and does not falsely attribute independent or human sign-off. Review the exact pins, original mathematical/content limits, byte inventory and same-browser CI evidence before acceptance.

The full CI run has not been executed locally. The existing `full-smoke` job intentionally retains legacy geometry and remains a separate blocking obligation, including rigid's legacy baseline until its distinct integration is reviewed. Every other changed route still goes through unchanged PR-base/head geometry comparison and may block; authored successors such as the `007` reconstruction are NOT admitted by this contract. Required-check repository configuration, complete geometry reconciliation and final experience obligations remain outstanding. This commit neither pushes, merges nor releases anything.
