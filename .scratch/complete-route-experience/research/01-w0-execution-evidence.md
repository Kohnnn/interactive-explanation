# Package 01 first-session evidence — blocked

## Verdict and identity

Package 01 is in progress and BLOCKED, not complete. W1/package 02 is not ready. No production redesign, application edit, baseline refresh, or signal acceptance occurred. User authorization covers this evidence implementation and commit; it does not bypass sequential gates.

- Worktree: `/tmp/opencode/complete-route-experience-w0`; branch: `implement/complete-route-experience-w0`.
- Measured HEAD: `b3a2f5d33fec3a47fe6e380f7dc56c1b2562bcc9`; tree: `cbe01fa383b86f857cb76aa710506774bd0d9a9e`.
- Initial tracked tree clean; no unrelated dirty files. Only untracked environment addition: `interactive-explanation/node_modules`, a symlink to `/media/compute_01/New Volume/PersonalWebsite/interactive-note/interactive-explanation/node_modules`. It is not staged or committed. No dependency/browser installation was necessary.
- Linux x86_64, kernel `7.1.5-76070105-generic`; Node `v24.20.0`; npm `11.19.0`; Playwright `1.60.0`; default headless launch succeeded with Chromium `148.0.7778.96`, provisioned `chromium_headless_shell-1223`. No executable override or Chrome 151 substitution.
- Process UTC timestamps are September 8, 2026 (local session date September 9). Identity capture began `2026-09-08T18:54:58Z`.
- Raw logs and disposable diagnostic scripts: `/tmp/opencode/complete-route-experience-w0-evidence/`. These are local external artifacts, not portable committed artifacts; this report preserves the decisive results and exact resume scope.
- Production and historical evidence preimages remain in measured HEAD. Owned repository changes are this new report and the appended package checkpoint only. Rollback removes this report and reverses only the checkpoint hunks; preserve the symlink and all failed logs.

## Boundary commands and results

All commands run from the worktree root. Browser workloads were sequential; static gates ran concurrently only after browser work finished. `tee` captured combined raw stdout/stderr; wrappers record child exit statuses, not tee success. No timeout fired on the actual gates.

| Command | Actual outcome | External log |
| --- | --- | --- |
| `node /tmp/opencode/complete-route-experience-w0-evidence/validate-snapshot.mjs` | Exit 0; spec assertion recipe: exact ordered 83 unique slugs, canonical families/ownership, pilots, risks, wave counts and signal references match. Includes all 83 inventory rows plus separate Atlas identity. | `snapshot.log` |
| `SMOKE_PORT=4197 timeout 1800s node interactive-explanation/tools/smoke-bundle.mjs interactive-explanation --verbose` | Exit 1; 18:55:59–18:56:29Z, 30 seconds. Full selection actually launched and executed; fail-fast at polygons mobile geometry. Not an all-83 execution/pass. | `full-smoke.log` |
| `node /tmp/opencode/complete-route-experience-w0-evidence/run-strict.mjs` | Exit 1; 18:57:27.877–18:57:29.616Z. Expands the explicit 59 route filters below with `SMOKE_PORT=4198 timeout 1800s node ... --experience --verbose`; fail-fast at decision-tree desktop geometry before strict state dispatch. | `strict-smoke.log` |
| `SMOKE_PORT=4199 timeout 120s node /tmp/opencode/complete-route-experience-w0-evidence/diagnose-geometry.mjs interactive-explanation --route <slug> --verbose` | Two sequential runs each for polygons and decision-tree; all exit 1 at the same assertion with identical rectangles. | `geometry-diagnostic-v3.log` |
| Same diagnostic with `DIAGNOSTIC_SETTLE=1` | One run each; fonts ready plus 3-second settle does not change rectangles or failure. | `geometry-settle.log` |
| `npm --prefix interactive-explanation run check` | Exit 0; all 10 configured syntax checks. No separate lint/typecheck script exists. | `check.log` |
| `npm --prefix interactive-explanation run unit` | Exit 1; 363 tests, 356 pass, 7 fail, 0 skipped/cancelled/todo. Missing three canonical Route entrypoints, detailed below. | `unit.log` |
| `node interactive-explanation/tools/check-public-surface.mjs interactive-explanation` | Exit 0. Audit success is not route-file completeness or browser acceptance. | `audit.log` |

Launch-only procedure: use `createRequire` rooted at `interactive-explanation/package.json`, require `playwright`, call `chromium.launch({ headless: true })`, print `browser.version()`, then close. `identity.log` preserves source, environment, and success. `source-diagnosis.log` records the unchanged application diff, gitlinks, and inherited baseline history.

Strict membership comes from historical completed migration issues 15–23, not from rollout risk or smoke groups: 3 hubs/bridge, 10 MLU, 9 EV, exactly 11 engineering from issue 18, 4 systems/SamWho, 3 Anders labs, 6 Teoria, 7 Ableton music, 6 synths = 59. Historical migration is a selection fact, not fresh acceptance.

Exact strict child command:

```bash
SMOKE_PORT=4198 timeout 1800s node interactive-explanation/tools/smoke-bundle.mjs interactive-explanation --route decision-tree --route random-forest --route conditional-probability --route markov-chains --route principal-component-analysis --route exponentiation --route pi --route sine-and-cosine --route eigenvectors-and-eigenvalues --route image-kernels --route ordinary-least-squares-regression --route blockchain --route public-private-keys --route zero-knowledge-proof-demo --route alpha-compositing --route color-spaces --route sound --route cameras-and-lenses --route lights-and-shadows --route tesseract --route gears --route gps --route earth-and-sun --route curves-and-surfaces --route naval-architecture --route teoria-interval-ear-training --route teoria-note-ear-training --route teoria-key-and-note-ear-training --route teoria-random-key-and-note-ear-training --route teoria-scale-construction --route teoria-interval-identification-and-inversion --route ableton-learning-music-playground --route ableton-learning-music-play-with-beats --route ableton-learning-music-play-with-notes-and-scales --route ableton-learning-music-play-with-chords --route ableton-learning-music-play-with-basslines --route ableton-learning-music-play-with-melodies --route ableton-learning-music-play-with-song-structures --route ableton-learning-synths-get-started --route ableton-learning-synths-how-synths-make-sound --route ableton-learning-synths-filter-resonance --route ableton-learning-synths-modulating-amplitude-with-envelopes --route ableton-learning-synths-matching-envelopes --route ableton-learning-synths-recipes --route music-interactive-hub --route linear-regression --route logistic-regression --route precision-recall --route roc-auc --route bias-variance --route train-test-validation --route double-descent --route double-descent2 --route memory-allocation --route load-balancing --route hysteresis-slack --route rigid-body-collisions --route blockchain-101-combined-flow --route primary-interactive-hub --experience --verbose
```

## Exact execution frontier

No Route passed the complete smoke pipeline. Atlas, route/docs sweep, wayfinding and later route-specific interaction checks were never reached (`tools/smoke-bundle.mjs:9754–10057`). `OK route` means only that invocation's selector check, not route acceptance.

Full first-loop completed slugs: **trust only**. It passed geometry, desktop/mobile compatibility, and inherited performance comparisons for both themes. Three fresh performance contexts per theme: light median DCL 149ms/load 212ms; dark 117ms/188ms; each 104 resources and 6,134,714 reported bytes. These logged summaries lack raw sample ranges and a provisioned paired before/after side; they are not new benchmark fixtures or a numerical comparison with the Chromium 151 snapshot.

Full first-loop failed slug: **polygons**, after desktop geometry, at mobile geometry. Full first-loop unexecuted slugs (81):

```text
ballot, crowds, loopy, neurons, remember, anxiety, wbwwb,
coming-out-simulator-2014, covid-19, simulating, sim, decision-tree,
random-forest, conditional-probability, markov-chains,
principal-component-analysis, exponentiation, pi, sine-and-cosine,
eigenvectors-and-eigenvalues, image-kernels, ordinary-least-squares-regression,
blockchain, public-private-keys, zero-knowledge-proof-demo, alpha-compositing,
color-spaces, sound, cameras-and-lenses, lights-and-shadows, tesseract, gears,
gps, earth-and-sun, bicycle, airfoil, curves-and-surfaces,
internal-combustion-engine, mechanical-watch, naval-architecture,
formula-1-racing, interactive-mechanical-watch,
reading-qr-codes-without-a-computer, teoria-interval-ear-training,
teoria-note-ear-training, teoria-key-and-note-ear-training,
teoria-random-key-and-note-ear-training, teoria-scale-construction,
teoria-interval-identification-and-inversion, ableton-learning-music-playground,
ableton-learning-music-play-with-beats,
ableton-learning-music-play-with-notes-and-scales,
ableton-learning-music-play-with-chords, ableton-learning-music-play-with-basslines,
ableton-learning-music-play-with-melodies,
ableton-learning-music-play-with-song-structures, ableton-learning-synths-get-started,
ableton-learning-synths-how-synths-make-sound, ableton-learning-synths-filter-resonance,
ableton-learning-synths-modulating-amplitude-with-envelopes,
ableton-learning-synths-matching-envelopes, ableton-learning-synths-recipes,
chrome-music-lab-song-maker, musicmap, music-interactive-hub, linear-regression,
logistic-regression, precision-recall, roc-auc, bias-variance, train-test-validation,
double-descent, double-descent2, memory-allocation, load-balancing, hysteresis-slack,
rigid-body-collisions, blockchain-101-combined-flow, primary-interactive-hub,
stargazing-dashboard, watch-mesh-explorer
```

Strict first-loop passed slugs: **none**. Strict first-loop failed slug: **decision-tree** at the geometry prerequisite; **zero strict experience state checks executed**. The remaining 58 selected slugs are unexecuted:

```text
random-forest, conditional-probability, markov-chains,
principal-component-analysis, exponentiation, pi, sine-and-cosine,
eigenvectors-and-eigenvalues, image-kernels, ordinary-least-squares-regression,
blockchain, public-private-keys, zero-knowledge-proof-demo, alpha-compositing,
color-spaces, sound, cameras-and-lenses, lights-and-shadows, tesseract, gears,
gps, earth-and-sun, curves-and-surfaces, naval-architecture,
teoria-interval-ear-training, teoria-note-ear-training,
teoria-key-and-note-ear-training, teoria-random-key-and-note-ear-training,
teoria-scale-construction, teoria-interval-identification-and-inversion,
ableton-learning-music-playground, ableton-learning-music-play-with-beats,
ableton-learning-music-play-with-notes-and-scales,
ableton-learning-music-play-with-chords, ableton-learning-music-play-with-basslines,
ableton-learning-music-play-with-melodies,
ableton-learning-music-play-with-song-structures, ableton-learning-synths-get-started,
ableton-learning-synths-how-synths-make-sound, ableton-learning-synths-filter-resonance,
ableton-learning-synths-modulating-amplitude-with-envelopes,
ableton-learning-synths-matching-envelopes, ableton-learning-synths-recipes,
music-interactive-hub, linear-regression, logistic-regression, precision-recall,
roc-auc, bias-variance, train-test-validation, double-descent, double-descent2,
memory-allocation, load-balancing, hysteresis-slack, rigid-body-collisions,
blockchain-101-combined-flow, primary-interactive-hub
```

Strict nonselected slugs (24; not a conformity claim): trust, polygons, ballot, crowds, loopy, neurons, remember, anxiety, wbwwb, coming-out-simulator-2014, covid-19, simulating, sim, bicycle, airfoil, internal-combustion-engine, mechanical-watch, formula-1-racing, interactive-mechanical-watch, reading-qr-codes-without-a-computer, chrome-music-lab-song-maker, musicmap, stargazing-dashboard, watch-mesh-explorer.

## Read-only blocker diagnosis and ownership

### Geometry gate mismatch

The failing code is `interactive-explanation/tools/smoke-bundle.mjs:1154–1159`: compare all runtime rectangle coordinates against `tools/experience-baselines.json` at tolerance 1 CSS pixel, then exact CSS dimensions. `measureRouteGeometry` waits for declared readiness and network idle before measurement (`:1177–1196`); failure precedes strict dispatch (`:9730–9737`).

| State | Actual bottom/height | Inherited bottom/height | Delta | Reproduction |
| --- | ---: | ---: | ---: | --- |
| polygons stored-light 390×844 | 16239 | 16276.390625 | -37.390625px | Original full failure, two logged diagnostic repeats, one font-ready + 3s repeat |
| decision-tree stored-light 1400×1000 | 22520.640625 | 22571.28125 | -50.640625px | Original strict failure, two logged diagnostic repeats, one font-ready + 3s repeat |

Polygons desktop geometry exactly matches at 12038.828125px height. In both failing states top/left/right/width match; CSS height also differs. Body font reports `"Be Vietnam Pro", "Segoe UI", sans-serif`; settled documents report `readyState=complete`, fonts `loaded`. The diagnostic imports existing source into memory with only import resolution, rectangle logging and optional settling changes. Assertions, runtime code and accepted baseline are unchanged.

Ranked hypotheses: stable inherited reference/current-environment mismatch; delayed font/layout completion; browser/font-metric differences. Settling falsifies a short font/layout delay as the explanation for these samples. Stable geometry mismatch is confirmed, but the historical baseline does not establish a matched source/browser/font environment here, so the underlying reason for differing heights is **unresolved**, not a proven application regression or benign browser difference. Do not claim a precise CSS defect without evidence. No source drift occurred during this task. Baseline history's latest commit is `7fd4f8d3358cc64e127d90f8d90131e96afa77e0` (`fix(anxiety): fit pre-start game shell`). No baseline was replaced.

Owner: package 01 evidence/environment maintainer for historical reference provenance and reproducibility; polygons authored/opaque boundary owner in package 06 and decision-tree authored owner in package 04 for any separately authorized route correction. This is not authorization to begin those waves. Next safe action: reconcile baseline source/browser/font identity and inspect supported authored layout boundaries read-only; obtain a bounded correction decision if needed, preserve references, then rerun the unchanged failing gate before wider execution. Do not shrink runtime surfaces or relax tolerances.

Two earlier disposable diagnostic attempts failed before application execution: `geometry-diagnostic.log` and `geometry-diagnostic-v2.log` retain import-resolution failures (CommonJS Playwright entry imported as named ESM). The final diagnostic uses Playwright's existing `index.mjs`; those failures are tooling-only, not Route failures. Retain all logs, including the large data-URL stack in the first attempt.

### Canonical Route gitlink provisioning

The 7 unit failures are one aggregate canonical HTML-seam test plus two entrypoint/UI-baseline tests each for wbwwb, coming-out-simulator-2014 and covid-19 (`tools/tests/route-baseline.test.mjs:251`, `:326`, `:330`). Their missing `index.html` files are not deleted tracked files: measured HEAD stores the following uninitialized gitlinks, not ordinary directories:

| Canonical Route | Mode | Required gitlink commit |
| --- | --- | --- |
| wbwwb | 160000 | `7c68c7e44e66b5be95ebd07d22391de707090397` |
| coming-out-simulator-2014 | 160000 | `69918f33e749117586ebd0fb57d9ec6ab047e7a3` |
| covid-19 | 160000 | `44622302aa7394d8ce521d6f603ea40993675e70` |

Owner: source/worktree provisioning, with package 06 owning later opaque Route implementation. These are canonical product inputs required by the manifest and unit gate, not the unrelated uninitialized submodules the user said to ignore. No unrelated submodule was investigated or initialized. Next safe action: provision exactly these pinned Route inputs from a trusted available source, retaining identity and any local changes; do not copy an unidentified dirty source or mark the tests skipped. Origin inaccessibility is a separately reported PR/remote blocker, not grounds to substitute missing inputs. No remote access, PR, push, merge, or worktree removal attempted.

## Deferred signals and coverage

Per the user stop rule, remaining signal triage and paired before fixtures were **not run** after the blocking boundary failures. Historical evidence is retained verbatim, not recategorized as passed:

- 42 overflow cells, maximum 68px: unresolved; synth controls first when gates permit, owner package 05 for six synth Routes. Other affected authored/opaque Route owners remain the exact rollout assignments in `35-route-rollout.json`; no implementation reassignment.
- musicmap primary readiness and anxiety continuation: unresolved, package 06 boundary owners.
- Intermittent Ableton chords/melodies continuation: unresolved, package 05 owners plus shared continuation seam coordination.
- rigid-body-collisions favicon subpath request: historical asset signal, not freshly reproduced; package 06 owner.
- markov-chains child cancellation versus genuine failure: unresolved, package 06 boundary owner; child checks not inherited from parent.
- Generic main absence: not canonical-primary defect evidence; no new defect classification.

Same-browser three-fresh-context-per-side paired fixtures, medians/ranges/raw samples, Atlas fixtures, 320px matrix, keyboard/touch, system-theme fallback, persisted navigation, storage-denied behavior, reduced motion, focus/contrast/semantic accessibility, child state/interactions, assistive technology, real devices and cross-browser coverage remain blocked/unexecuted for qualification. No full-experience AA, field-performance, visual approval, human review or learning outcome is claimed. Existing trust compatibility assertions do not certify these broader modalities.

## Resume investigation — exact pins and historical geometry

This appended investigation starts from evidence commit `c160a3cd4ccc2e124ca8892d234ad97c4e6a7f57` in the same worktree and branch. Application tracked content and gitlinks remain unchanged. Previous logs/results above are historical and retained; the following results supersede the current static-gate status.

### Provisioning result: two exact archives, one unresolved object

The three original canonical Route directories have no independent Git HEAD: `git -C <original-route> rev-parse --show-toplevel --absolute-git-dir HEAD` resolves to the enclosing original `interactive-explanation` repository at `5f7c6ef337e9c8935a43708147d86bdf1d68f4df`. None of the three pinned commit objects exists in either the original parent or nested repository object store (`git cat-file -t` fails). This is not merely an uninitialized checkout with immediately available canonical objects.

Trusted `.codex-temp/wbwwb-upstream` and `.codex-temp/coming-out-simulator-2014-upstream` stores do have independent HEADs exactly equal to the required pins. Verified their commit object types and `index.html` blob identities before using `git archive <pin> | tar -x -C <worktree-route>`. Only those two previously empty canonical directories were populated. Original dirty files, archive stores, Git configuration, remotes and gitlinks were not modified; no source symlink or dirty-content copy was used. These are archive-populated directories, not initialized submodule repositories, so parent Git status alone cannot attest their content.

- wbwwb pin `7c68c7e44e66b5be95ebd07d22391de707090397`, index blob `c85a44388cd88017b8494c7af1cabb4ecec2693c`.
- coming-out-simulator-2014 pin `69918f33e749117586ebd0fb57d9ec6ab047e7a3`, index blob `8013ae799f250f1abb200378f52a6840dc3f98fc`.
- covid-19 pin `44622302aa7394d8ce521d6f603ea40993675e70`: no verified local store located; remains unprovisioned. Searched original parent/nested stores and inspected original `.codex-temp`, `_vendor_archive`, `.tmp` and canonical directories; did not claim exhaustive host-wide object discovery. A trusted store path/bundle containing this exact commit is the next provisioning input required.

Exact pin provisioning reveals a **source packaging/contract mismatch**, not a sufficient environment repair: the committed upstream entrypoints lack the authored shared footer, and wbwwb lacks canonical `data-story-shell`. Tests expect adapted product content that these gitlinks do not contain. Do not copy the original dirty adaptation, synchronize it automatically, or remove attribution to obtain green policy results. Parent/source owner must identify and approve an immutable authored adaptation source and how it is represented alongside the pins; that exceeds provisioning-only/no-application-change scope.

Post-provision checks:

| Check | Result |
| --- | --- |
| `npm --prefix interactive-explanation run unit` | Exit 1: 358/363 pass, 5 fail. wbwwb canonical seam, wbwwb footer, coming-out footer, covid-19 entrypoint and covid-19 UI baseline. |
| `npm --prefix interactive-explanation run check` | Exit 0, 10 syntax checks. |
| `node interactive-explanation/tools/check-public-surface.mjs interactive-explanation` | Exit 1, 12 findings in the newly provisioned upstream content: missing canonical/og:url metadata, source-map directive and creator/supporter material. Preserve attribution/license obligations; audit success before provisioning did not cover absent file contents. |
| Archive compare | `git archive <pin> | tar --compare -f - -C <route>` exits 1 solely listing UID/GID differences from unprivileged extraction; no content difference reported. This is not reported as a clean metadata comparison. |
| Tracked application diff | Empty; gitlinks unchanged; only environment symlink untracked before documentation edits. |

### Geometry: failure predates later migrations under the current browser

Ranked hypotheses were incomplete isolated fixtures, browser/layout environment difference, and stale source baseline. Read-only original-tree probes and post-provision worktree probes use the same existing diagnostic, default Playwright 1.60.0 Chromium 148 launch, port 4199, explicit single-route filters and unchanged assertions. Both reproduce polygons mobile height 16239 versus 16276.390625 and decision-tree desktop height 22520.640625 versus 22571.28125. Thus missing isolated canonical Routes do not explain these two geometry failures. Original and isolated source are **not byte-identical**: route-folder SHA-256 inventories list differences; shared files differ only at the unrelated synth musiclab file. Equal measurements do not certify all original dirty content.

Inherited baseline top-level keys are exactly `version`, `runs`, `viewport`, `routes`: **no recorded browser, source revision, fonts or environment identity**. The two expected rectangles are unchanged at baseline introduction `7c71c99`, MLU migration `34c9883`, anxiety baseline update `7fd4f8d`, current HEAD and original dirty baseline. The later shared JS change is engineering-family-scoped; site CSS change is docs-scoped; inspected later font-related Sandbox CSS change is Ableton-practice-scoped. No causal later change to these two route heights was identified.

To test source history rather than assume it, archived the relevant committed folders from **baseline-introducing `7c71c99`** into external `historical/interactive-explanation`: shared, both target Routes, tools, manifests, docs, Atlas and package metadata. Reused the existing dependency store via an external symlink. Ran the same diagnostic from the historical parent with `--route polygons` and `--route decision-tree`; both exit 1 with **exactly the same actual and expected rectangles** as current/original. This is a targeted historical fixture, not a complete historical-site regression pass. No application history/worktree was reset or modified.

Conclusion: the inherited geometry references do not reproduce even with their introducing committed source in the currently provisioned browser. A later source-staleness explanation is **not source-proven**; historical browser/layout conditions or unrecorded baseline input state remain unresolved. No arbitrary baseline acceptance or successor was recorded.

**Exact next decision:** source owner must supply the covid pinned object store and choose an immutable, reviewed representation of the missing authored adaptations rather than treating upstream pins as adapted product inputs. Evidence owner must recover the baseline recording browser/font/source identity (or explicitly approve a separate baseline-provenance reconstruction investigation). Only if that investigation explains the mismatch may a bounded successor proposal cover polygons mobile and decision-tree desktop, preserving old references, with three fresh contexts per side, complete runtime/intrinsic geometry and accessible-content review under one fixed environment. Current measurements are diagnostic, not those acceptance fixtures. No global baseline refresh, tolerance relaxation, or W1 advancement is authorized by this result.

### Resume evidence and coverage

All new raw artifacts remain under `/tmp/opencode/complete-route-experience-w0-evidence/`, prefixed `resume-`: `object-stores.log`, `archive-stores.log`, `provision.log`, `provision-verify.log`, `original-geometry.log`, `worktree-geometry.log`, `historical-geometry.log`, `history.log`, `source-history.log`, `css-history.log`, `shared-history.log`, `source-identity.log`, `unit.log`, `check.log`, `audit.log`. Disposable scripts and historical fixture are external and uncommitted. Earlier failed diagnostic logs remain untouched.

No new complete Route pass. Full-suite and 59-filter strict-suite results/remaining slug lists above remain the frontier; neither full sweep was rerun because the focused prerequisite still fails and static provisioning exposes new blockers. Atlas, wider signal triage and before fixtures remain unexecuted. W0 remains BLOCKED; W1 not ready. No runtime patch, baseline write, remote/config mutation, push, merge or worktree removal.

## Review and resume

Self-review only: no sub-agent tool is available. Standards review: evidence-only diff, no runtime/dependency/license changes, historical inputs preserved. Spec review: first-session execution recorded honestly; full all-83/Atlas completion, strict 59-route coverage, signal dispositions and paired fixtures remain unmet. This is a blocked checkpoint, not package acceptance. Syntax and audit passed; unit failure remains visible and does not prevent the explicitly authorized evidence-only commit.

Resume by verifying source identity and the checkpoint, resolving canonical gitlink provisioning and geometry-reference blockers without baseline relaxation, rerunning full smoke plus the exact strict filters, and only then proceeding to remaining W0 signal triage/paired before fixtures. W0 completion must precede package 02; release stays BLOCKED until package 07 qualification. Evidence commit identity is supplied by Git and the session handoff, rather than a self-referential hash embedded in this report.

## Review corrections and portable evidence — 2026-09-09

This is a separately dated successor checkpoint, not a revision of historical measurements. Starting source is `9049362ce105ebf1d4b4746603a7131fa3cbac3d`. W0 remains BLOCKED. No W1, route redesign, baseline replacement, dependency installation or attribution removal.

### Review dispositions

1. P1: removed generic baseline-preserved right-edge allowance from `assertPrimarySurfaceVisible`, including unused runtime/baseline arguments. The viewport +4px check now applies regardless of primary/runtime identity. Runtime geometry comparison remains separate and unchanged. No replacement wildcard or new logic; existing unit/browser seams reused. Focused strict smoke still fails its earlier geometry prerequisite, so this session does not claim browser execution of the restored reachability assertion.
2. P2: qualified both `complete-route-experience-ticket-24` parity modules as BLOCKED/pending, with exact source pins/index blobs and historical/current evidence pointers. No `completeExperienceMigration` key exists in this checkout. Schema reviewed at `tools/tests/route-baseline.test.mjs:340–355`: nonempty string status plus string-array evidence; retained this shape. Both docs metadata tests pass. Other historical modules are not blanket re-certified.
3. P2: portable evidence now lives in [01-w0-review-evidence](01-w0-review-evidence/). Actual final diagnostic and source-identity scripts, raw historical/current geometry comparisons, settling comparisons, full-smoke failure, strict failure excerpt, diagnostic import failures, source hashes and current gate failures are retained. Original external evidence is untouched. Full geometry logs and source-identity log are verbatim; full-smoke/import log local prefixes are redacted as `<WORKTREE>`/`<DEPENDENCIES>`. Strict and unit logs explicitly identify excerpts; no removed failure is represented as passing. The enormous first data-URL diagnostic stack remains external, not duplicated; v2 retains all four equivalent pre-execution import failures. No secret found in selected evidence. Unrelated store listings/host details are omitted; the original source path in the historical identity script is a necessary fixture input, not portable discovery logic.
4. Standards: minimal null guards added to prototype33, including render/readout lookups reached by its handlers. Historical preimage remains `9049362:.scratch/complete-route-experience/research/33-visual-prototype.html`; successor Git blob `188849d62ed9c593d223bcd1963492fc714c9407`. Separate pure check compiles both inline scripts and exercises intact DOM, each of 27 absent IDs, and all IDs absent; intact sample feedback assertions pass. Existing Chromium 151 browser script/screenshots/reports were not run or overwritten. No successor browser/layout/contrast/keyboard certification.
5. Duplication heuristic: no shared calculator extraction justified. Prototype33/34 calculators are separate historical fixtures with immutable preimages and distinct evidence; no calculator behavior changed. A speculative helper would couple historical inputs without a production requirement.

### Reproducible source and fixture recipe

- Historical source: `7c71c992be944895438ec2467d20f18a7ccd4a63`; subsequent references `34c9883349913aaa604a52c506a7192bdd54799e`, `7fd4f8d3358cc64e127d90f8d90131e96afa77e0`. Resume logs measured source at `c160a3cd4ccc2e124ca8892d234ad97c4e6a7f57`; original source is dirty and identified by folder SHA-256 in `resume-source-identity.log`, not by its enclosing HEAD alone.
- Create a new empty external fixture parent, never overwrite the retained fixture. Export with `git archive 7c71c992be944895438ec2467d20f18a7ccd4a63 interactive-explanation/shared interactive-explanation/polygons interactive-explanation/decision-tree interactive-explanation/tools interactive-explanation/routes.manifest.json interactive-explanation/pages.json interactive-explanation/docs interactive-explanation/index.html interactive-explanation/package.json interactive-explanation/package-lock.json | tar -x -C <new-fixture-parent>`. This reconstructs the targeted source selection, not a complete historical site. Attach the existing Playwright 1.60.0 dependency store at fixture `interactive-explanation/node_modules`; do not install or substitute browsers implicitly.
- From that fixture parent run `SMOKE_PORT=4199 timeout 120s node <absolute-path-to-retained-diagnose-geometry.mjs> interactive-explanation --route polygons --verbose`, then the same with `--route decision-tree`. Run separately with `DIAGNOSTIC_SETTLE=1` for the font-ready/3-second variant. Default compatible Chromium 148.0.7778.96, stored light, desktop 1400×1000/mobile 390×844, declared readiness plus network idle, unchanged 1px assertions. Not paired acceptance/performance fixtures; no three-context statistical claim.
- The retained diagnostic is byte-identical to the final external script, Git blob `13d63244c0ddbb97d993679b627d4239ffdb1502`. It instruments source in memory only. Historical failed versions were not retained as scripts; v2's import-resolution error is recorded, not silently recreated as a successful run. `resume-source-identity.mjs` is the actual historical inventory recipe; its `HEAD` label means the measured resume source above when interpreting the retained log, not today's moving HEAD.
- Current smoke tool successor blob: `99676906702136cd3a33ad411d8039d222476933`. Git commit containing this checkpoint identifies all other owned evidence. Existing baseline and route inputs remain unchanged.

### Exact current checks

Commands run from isolated worktree root unless stated. Raw output in the scoped evidence directory; logs are new, no existing evidence overwritten.

| Command | Result | Evidence |
| --- | --- | --- |
| `npm --prefix interactive-explanation run check` | 0; ten syntax checks, no separate lint/typecheck configured | `current-checks.log` |
| `npm --prefix interactive-explanation run unit -- --test-reporter=dot` | 1; 358/363 pass, same five source-contract failures; npm argument position did not select dot reporter | `current-unit.log` (failure/totals excerpts) |
| `node --test --test-reporter=dot "tools/tests/*.test.mjs"` from `interactive-explanation/` | 1; same five failures on repeat | session tool output; no separate pass claim |
| `npm --prefix interactive-explanation run audit` | 1; same 12 upstream findings, attribution retained | `current-audit.log` |
| `SMOKE_PORT=4199 timeout 120s node interactive-explanation/tools/smoke-bundle.mjs interactive-explanation --route decision-tree --experience --verbose` | 1; desktop bottom mismatch, before strict state checks | `current-checks.log` |
| `SMOKE_PORT=4199 timeout 120s node .scratch/complete-route-experience/research/01-w0-review-evidence/diagnose-geometry.mjs interactive-explanation --route polygons --verbose` | 1; mobile bottom mismatch unchanged | `current-polygons.log` |
| `node .scratch/complete-route-experience/research/01-w0-review-evidence/prototype33-pure-check.mjs` | 0; syntax and pure DOM-stub checks only | `current-checks.log` |

Full/59-filter sweeps not repeated past known prerequisite failures; historical full failure retained. No complete Route passes, no strict state suites reached. Atlas, remaining signal triage, paired fixtures and broader modalities stay blocked as previously enumerated.

Review is single-implementer self-review against spec/standards, not independent review. Earlier 'no sub-agent tool available' referred only to this implementer's exposed tool environment; the parent can invoke review agents. No global workflow deficiency is implied. Parent review remains available before accepting the corrections; package acceptance still requires resolving source packaging/covid pin and baseline provenance, then rerunning unchanged gates.

