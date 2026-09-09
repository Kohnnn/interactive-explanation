# Repository preparation for parent review

Status: prepared with verification blockers; not release-qualified, pushed, or submitted as a PR.

## Identity and integration

- Approved target: Kohnnn/interactive-explanation.
- Branch: feat/complete-route-experience.
- Remote/main and sole intended commit parent: db191963fd9a061ca063b9e73fd460b1dc77d4b0.
- Immutable product/document source: 6111af8d7a53a1e716f3b7b784072c3c55c3d45a in the parent integration repository; product prefix interactive-explanation.
- Original nested baseline: 5f7c6ef337e9c8935a43708147d86bdf1d68f4df.
- Inspected all four remote commits after that baseline. Remote 6730ead already carries the migration. A synthetic product-tree commit with 5f7c6e as parent produced overlapping migration conflicts in merge-tree only; no conflict tree was installed. A refined synthetic parent of 6730ead isolates the reviewed prerequisite delta and merges cleanly with db19196. Only the merged tree is imported; synthetic commits and parent history are not ancestors of the delivery commit.
- Retained remote CI verbatim: Windows runners, migrated NCase subset and --skip-performance invocations. Retained both --skip-performance implementation lines. Reconciled tools/smoke-bundle.mjs by retaining remote prepareNativeNavigation, assertPrimarySurfaceVisible and assertRouteExperienceState functions byte-for-byte, avoiding downgrades of readiness and approved right-edge checks. All other product differences are the fixed source prerequisite delta.
- Parent dirty public-private-keys/index.html and node_modules.agent were not copied, modified or removed. The new clone's public-private-keys/index.html comes from the immutable commit.
- Removed the already-approved four exclusions: wbwwb/css/Cairo-Regular.ttf, wbwwb/sprites/Thumbs.db, wbwwb/sprites/misc/Thumbs.db, wbwwb/sprites/peeps/Thumbs.db. Existing fixed-source sans-serif remediation and license notices accompany the removal.
- No package or lockfile changes, new dependency, Git configuration file, dependency directory or credential file is staged. Existing locked Playwright 1.60.0 installed with npm ci. Token/private-key pattern scan of the imported tracker found no matches; this is not an exhaustive secret certification.

## Exact document import

All 183 files under 6111af8:.scratch/complete-route-experience/ were copied byte-for-byte, totaling 39,906,149 bytes, largest file 3,674,244 bytes. No historical files within this set were omitted. The exact inventory is reproducible with `git ls-tree -r --name-only 6111af8d7a53a1e716f3b7b784072c3c55c3d45a -- .scratch/complete-route-experience` in the parent repository. This preparation report is the only additional tracker document.

The specification/tracker core is spec.md, map.md, all 35 issues/01 through issues/35 files, and these seven implementation files:

- implementation/01-restore-release-evidence.md
- implementation/02-shared-system-and-atlas.md
- implementation/03-intent-pilots.md
- implementation/04-owned-route-slices.md
- implementation/05-runtime-hook-slices.md
- implementation/06-opaque-route-slices.md
- implementation/07-final-qualification.md

The complete research/ directory is included, including research/35-route-rollout.json, all current 47-series evidence/generators, earlier source/provenance and geometry/performance reports, and prototype images. Historical absolute commands, commit identities, parent-relative paths and claims were deliberately not rewritten. They describe parent-context captures, not new validation of this clone.

## Unresolved parent-context references

Checked 206 relative Markdown links by file existence; nine occurrences remain unresolved in this standalone layout. No within-set research file was silently dropped. Parent amendment must resolve or explicitly contextualize these references before publication:

| Source | Unresolved original href | Meaning |
| --- | --- | --- |
| issues/33-prototype-f1-inspired-visual-system.md | ../../f1-racing-product-evolution/issues/11-prototype-broadcast-editorial-visual-system.md | Sibling parent tracker; not copied |
| map.md | ../f1-racing-product-evolution/issues/11-prototype-broadcast-editorial-visual-system.md | Same sibling tracker |
| spec.md | ../f1-racing-product-evolution/issues/11-prototype-broadcast-editorial-visual-system.md | Same sibling tracker |
| spec.md | ../../CONTEXT.md | Parent domain context; not copied |
| spec.md | ../../docs/agents/issue-tracker.md | Parent tracker configuration; not copied |
| spec.md | ../../docs/agents/triage-labels.md | Parent labels; not copied |
| research/34-storytelling-prototype.md | ../../../interactive-explanation/docs/bias-variance/parity.json | Parent prefix; current file is root docs/bias-variance/parity.json |
| research/34-storytelling-prototype.md | ../../../interactive-explanation/docs/blockchain/parity.json | Parent prefix; current file is root docs/blockchain/parity.json |
| research/34-storytelling-prototype.md | ../../../interactive-explanation/docs/teoria-scale-construction/parity.json | Parent prefix; current file is root docs/teoria-scale-construction/parity.json |

This check does not validate Markdown anchors, prose/backtick paths, external URLs, historical commit availability in a fresh clone, or generators' absolute source paths. Parent source remains authoritative for those historical contexts. Do not run historical capture generators without checking their pinned paths and output destinations.

## Current validation

- npm ci: passed, two locked packages installed, three audited.
- npm run check: passed; no separate lint/typecheck is configured.
- npm run audit: passed.
- npm run unit: 372 passed, 1 failed, 373 total. tools/tests/diagnose-baseline.test.mjs:59 assumes a parent repository one level above this standalone clone, and line 60 uses interactive-explanation/docs/sim. git ls-tree exits 128 at line 63 because /tmp/opencode is not a repository. This imported path-assumption failure is left for parent review under the no-product-edits constraint; no fake parent repository/configuration was created to hide it.
- npm run smoke: attempted full suite, stopped at trust dark performance: load 386ms exceeded 134ms + 250ms. No full-suite pass or new baseline approval is claimed.
- node tools/smoke-bundle.mjs . --skip-performance --route trust: passed. This verifies the retained remote skip flag and focused behavior only, not performance acceptance or all Routes.
- node --check tools/diagnose-baseline.mjs: passed.
- Metadata synchronizer: passed without unstaged pages.json/routes.manifest.json drift.
- git diff --check: unstaged changes passed. Staged check reports seven inherited whitespace findings in four immutable imported research/implementation Markdown files (three terminal blank lines and four trailing-space lines). Preserved rather than rewriting historical blob identities; no product whitespace error identified.
- External runnable preparation check: /tmp/opencode/verify-complete-route-pr.mjs verifies all 183 imported blob identities, exact retained remote guards/CI/package/configuration, exclusions, forbidden staged path categories, and the Markdown-link inventory. It is not committed as product code.

## Review

Standards: imported code retains fixed-source conventions; no speculative refactor or new dependency. One standalone-test portability blocker remains as detailed above. Review performed locally without subagents because no subagent tool is available.

Spec: this is repository preparation only, not implementation of the pending authored overhaul or W0 release acceptance. Remote-only guards and CI remain intact. Nine link occurrences and one test path need parent-context amendment; full performance qualification remains blocked. Parent review is required before push or PR creation; main is not updated.
