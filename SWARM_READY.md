# Swarm-ready handoff

Repository: `Kohnnn/interactive-explanation`. Contract: `swarm-ready/v1`. Source inspection: 2026-11-23.
Default branch: `main`. Inspected base: [72fb29027e06](https://github.com/Kohnnn/interactive-explanation/commit/72fb29027e063b46f52d4193d4aa45932a8b3bb8).

**Status: documented; runtime qualification is unverified.** This file defines an agent workflow. It does not install a shell command, enroll the repository in a scheduler, certify test success, or activate VMs. Follow the current user task and existing repository instructions; retain prior authorization within its actual scope.

## Invoke

Give the working agent this prompt:

```text
swarm ready: <one measurable repository objective>
Read SWARM_READY.md and the applicable AGENTS.md. Continue the current owned
work or ready issue, establish the baseline and acceptance check, then prepare
a bounded worker handoff. Use existing authorized tools and capacity. Report
what is documented, implemented, tested, and observed separately.
```

If a `swarm-ready` skill is installed, load it. Otherwise execute the documented workflow directly. Treat the phrase as an agent instruction unless the installed CLI explicitly advertises it. Inspect help/version before using optional command adapters.

## Repository starting point

Read: [AGENTS.md](AGENTS.md), [package.json](package.json), [docs](docs), [.github](.github).

Continue an existing approved issue or a clearly scoped user objective after inspecting the source map below. If none is selected, return the smallest useful improvement and its verifier as the handoff; do not begin a portfolio-wide rewrite.

Start with one writer. Add workers only for disjoint changes or independent experiments whose results can be checked separately. Keep shared interfaces and final integration with one owner.

Publication boundary: the existing Pages workflow can publish pushes to the default branch independently of CI. Use the repository's review and prepublication checks before merging.

Keep verify and functional as the existing hard gates. paired-performance is a separate nonblocking qualification report; its unresolved historical timing and geometry evidence does not become passed.

Legacy Pages publishing from main is independent of CI. Preserve review and prepublication requirements, and do not refresh performance or geometry baselines wholesale.

The base above is an inspection snapshot, not a permanent working branch. Refresh the actual target branch, current issues, incumbent worker and applicable nested instructions before editing. Preserve unrelated changes and upstream/fork boundaries.

## Execution logic

1. **Recover context.** Read the current issue, work order and last evidence-backed handoff. Keep useful work and the active worker. Record source commit, unresolved criteria and the next action; avoid repeating completed investigation.
2. **Define success.** State one outcome, baseline, target, changed paths, verification command and expected result. Keep acceptance criteria and reference data fixed unless the user changes the requirement.
3. **Bound the attempt.** Reuse the existing owner/task/attempt identities, action scope, resource limits, time/cost budget and retry allowance. Do not demand a new user-written permission receipt for already authorized work. If a real capability or grant is missing, name the exact blocked action and continue independent work.
4. **Partition only useful work.** Use one writer per branch/worktree and non-overlapping change scope. Reuse the existing task ledger and dependency graph. Reserve verification capacity before adding workers; avoid recursive worker growth and duplicate coordinators.
5. **Implement and measure.** Make the smallest coherent change. Use differential checks when a trusted reference exists, and deterministic failure simulation when it materially improves reproduction. Record the seed/configuration and counterexamples. Do not weaken tests, rewrite baselines or hide pre-existing failures to claim success.
6. **Verify and integrate.** Verify the exact returned commit independently in a clean environment. Recheck the final integrated revision when changes interact. Follow existing review, merge and deployment rules; a green worker report alone cannot override them. Use the narrowest checks that resolve a concrete risk.
7. **Checkpoint and finish.** Save candidate SHA, evidence, measured outcome, remaining blockers and a precise next action before context/lease expiry. Reconcile lost or duplicate completions before retrying. Release only the run's owned resources after preserving evidence. Stop when the requested outcome is met or a concrete blocker prevents the next required action.

## Verification starting point

| Declared command | Working directory | Source and limit |
| --- | --- | --- |
| `node tools/sync-route-metadata.mjs .` | `.` | AGENTS.md; regenerates route metadata when relevant; inspect resulting diff |
| `node tools/check-public-surface.mjs .` | `.` | AGENTS.md; docs/provenance audit |
| `npm test` | `.` | AGENTS.md and package.json; sync, public audit, syntax and unit checks |
| `node tools/smoke-bundle.mjs .` | `.` | AGENTS.md; full browser suite for shared runtime/assets; focused route syntax is documented there |

These commands were read from the pinned source, not executed for this documentation change. A declared script is not a passing baseline. Confirm the current environment and hooks, select the checks relevant to the scoped change, and record the exact candidate SHA and evidence. For a documentation-only task, review factual anchors, links and whitespace; do not run unrelated application builds.

## Required handoff result

Return a concise record with `repository`, `objective`, `issue_or_work_order`, `base_sha`, `candidate_sha`, `owner`, `task_id`, `attempt_id`, `worker/session`, `branch/worktree`, `changed_paths`, `environment`, `resource/budget limits`, `acceptance`, `commands_and_results`, `evidence_refs`, `known_failures`, `blocker_owner`, `next_action`, and `cleanup_status`. Use null/unknown when a field is unavailable; never manufacture evidence or authority.

Keep documentation readiness, command availability, source tests, live environment qualification and accepted outcome as separate states. Count verified outcomes, regressions, elapsed time, cost and human interventions. Commits, lines, tokens and worker count describe activity only.
