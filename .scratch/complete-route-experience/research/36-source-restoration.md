# Source restoration and font rights remediation

Date: 2026-09-09. Branch: implement/complete-route-source. Base: 62828b88d5aa9ada8f6e3387f59d257abc00e671.

## Authorized scope

The user explicitly authorized completing this source commit, selecting the smallest lawful font correction, and preserving intrinsic mechanics. Only wbwwb, coming-out-simulator-2014, covid-19, their existing docs, and this source-specific evidence are owned. Original parent/nested working trees are read-only. Shared smoke/baseline tools and package01 checkpoint are untouched. Independent tools commit 8e428f6 is not integrated here.

Input is nested commit 5f7c6ef337e9c8935a43708147d86bdf1d68f4df plus reviewed working entrypoint shell/theme additions, not upstream-only gitlinks. Adapted trees: wbwwb 8693452d0f97ea59b251d73970cfccb9b3a3eb89 (205 entries), coming-out-simulator-2014 3a071e876a7348c9cf0082c3a2c94b91a0a5af59 (114), covid-19 867753d9f68cf75a0d87831acfcce60e9617ceb6 (84). Existing provenance retains upstream pins.

## Font decision and expected delta

Excluded wbwwb/css/Cairo-Regular.ttf: actually B Kamran Bold, copyright 2000 Borna Rayaneh. Original blob 597a1d44468de90615d87ac434790248df2c13bd; SHA-256 f8d187e12761df982cc8a3b92269212606dfa1deaea9f4c542541286c9e10f8d. Upstream introduction 4da517c7710f26fc4923b44d203ed6140fd97f03. Cairo OFL does not cover it. No binary copy is included in evidence or staged distribution.

Removed its @font-face import and selected browser sans-serif for page CSS and eleven PIXI text declarations across five files. No download, dependency, renderer resize, pointer conversion, state machine, timing, audio or numerical change. Expected delta is platform-dependent glyph metrics and one fewer network resource (160 rather than 161). Existing rasterized Persian title/button artwork remains unchanged; removal of a font program is not removal of existing game artwork.

Added local credits links and primary-source software notices. The initial credits overlay was obscured by the mobile toolbar; moved route-local credits below it without shared edits. Font inspection found no clipping within the 960x540 intrinsic stage. Small scaled mobile warning text and shared dark-shell contrast remain acceptance limitations, not certified accessible by these checks.

## License evidence

Primary release license URLs are retained in each LICENSE-THIRD-PARTY.txt. WBWWB retains CC0 author dedication and original sound credits; Freesound pages 130011 (ermfilm), 77034 (cs272), 319590 (Hybrid_V), 184476 (Andromadax24) were retrieved and show CC BY 4.0. Hybrid_V additionally explicitly states CC BY 3.0; both are preserved. Sound mappings follow the retained README and runtime manifests, not a new audio derivation claim. Other original CC0 sound/art references remain unchanged.

Coming Out preserves UNLICENSE and README, with SoundJS 0.5.2 MIT terms recovered from the release's src/soundjs/Sound.js header. COVID preserves COPYING.txt; Littlefoot matches published 3.2.4 after terminal whitespace normalization. Its package metadata pins tslib 1.11.1. MIT notices cover Littlefoot, SimpleBar and bundled helpers; tslib Apache terms are in LICENSE-TSLIB.txt. Dependency license source versions identify notices, not an unsupported claim that every transitive bundle version was independently byte-matched. No attribution-removing audit exception was needed.

## Runnable verification

From parent checkout:

```
node .scratch/complete-route-experience/research/36-source-identity-check.mjs /path/to/read-only/nested/repository
node .scratch/complete-route-experience/research/36-source-font-check.mjs interactive-explanation /tmp/opencode/source-font-evidence
```

Corrected final review count: 194/205 WBWWB files byte-identical, with one omitted font, three omitted nonruntime Windows thumbnail caches (`sprites/Thumbs.db`, `sprites/misc/Thumbs.db`, `sprites/peeps/Thumbs.db`), six font-only text/CSS changes and one entrypoint; Coming Out 113/114 byte-identical; COVID 83/84 byte-identical. The previous 197/205 claim incorrectly included absent caches. All four intentional omissions are explicitly asserted absent; no cache is restored. Final review reran the corrected check with exact source argument `/media/compute_01/New Volume/PersonalWebsite/interactive-note/interactive-explanation` in `/tmp/opencode/complete-route-review-final` and in `/tmp/opencode/review-final-clean-export` (the three routes exported from parent integration `f51e601`); both pass. All remaining changes are entrypoints and new notices. Existing engine files outside those declared font substitutions remain byte-identical.

Font check passed in both the implementation checkout and clean export (export screenshots: /tmp/opencode/source-clean-font-evidence), 24 scene/viewport/theme cells each: Preloader, Quote, Credits, Post_Post_Credits at 320x844, 390x844, 1400x1000, stored light/dark. All measured text bounds fit 960x540; renderer backing dimensions retained. Keyboard credits activation and center-point hit testing passed. Screenshots and measurements are generated into /tmp/opencode/source-font-evidence, not deployed route assets. Scene reveal is a test-only snapshot manipulation; it is not a natural-timing acceptance test. Visual review of representative screenshots across all six viewport/theme cells found no new glyph clipping; intrinsic small mobile text is not a readability pass.

## Clean parent-tree export

Staged only owned routes/docs/checks; used git archive of git write-tree into /tmp/opencode/source-clean-export. No nested Git store or original route working files are needed to serve the export. An untracked node_modules symlink supplies already-installed test dependencies only; neither export payload nor source commit includes that symlink.

From exported interactive-explanation: npm run check PASS; node --test --test-reporter=dot "tools/tests/*.test.mjs" PASS; npm run audit PASS. There is no separate configured lint/typecheck. Focused commands were SMOKE_PORT=4211 timeout 180s node tools/smoke-bundle.mjs . --route SLUG --verbose, independently for all three.

- wbwwb: exit 0, desktop/mobile geometry, light/dark performance, pointer capture coordinate checks and replay PASS. Clean-export medians: light 80ms DOMContentLoaded/126ms load; dark 72ms/115ms; 160 resources, 6081630 bytes.
- coming-out-simulator-2014: exit 0, desktop/mobile geometry, opening branches, outro/restart PASS. Clean-export medians: light 55ms/132ms; dark 58ms/127ms; 97 resources, 3522618 bytes.
- covid-19: exit 1 at `covid-19 desktop geometry baseline runtime bottom shifted by more than 1 CSS px`, assertRuntimeGeometry tools/smoke-bundle.mjs:1157. Same known failure before this correction; no baseline replacement or suppression. Later COVID interaction gates did not execute in this run.

## Review and remaining gates

Standards review: bounded source-only changes, existing dependencies, no shared edits or new runtime abstraction. Spec review: font program excluded, identity retained, narrow font-metric delta disclosed, historical adaptations not misrepresented as unchanged upstream. Review performed in-session; parallel sub-agent tool unavailable, no independent review claimed.

Remaining: COVID geometry qualification with the independent baseline work; strict complete-experience matrix, full 83-route release gate, cross-browser/real-device and comprehensive accessibility acceptance. Shared dark contrast and intrinsic mobile text readability remain visible limitations. This source packaging commit is not a release or blanket legal/accessibility certification. No push or merge authorized or performed.
