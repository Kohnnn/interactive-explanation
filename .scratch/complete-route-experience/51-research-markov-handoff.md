# Research 51: validated Markov child handoff

Source HEAD: `1a2abf9b53e698dd397eff621abcbe5f9287c2c0`. Only tools and this note changed; route sources, native panes, geometry baselines, `qualify-pr.mjs`, budgets and noise admission are unchanged. Future paired CI uses the same head capture adapter for both source fixtures. This is not paired performance acceptance.

The reported first CI's 54 Markov failures lack frame identity, completed-document and native-readiness evidence; they cannot retrospectively pass. The new adapter retains request/response/failure events and adds capture-local request/frame IDs, navigation, requestfinished, committed frame URL and native editor initialization. Queries/fragments/credentials are omitted (empty query whitelist). Failed requests remain in evidence alongside classification.

Observed child `f2`: aborted directory request `r13`; completed exact directory repeat (`r14` or `r18`); direct `playground/playground.html` request `r23`, HTTP 200, committed navigation, requestfinished and nativeeditorready for that same request/frame. Only this exact same-origin Markov child chain qualifies. Other destinations, frames, resources, routes, missing completion/readiness and native errors remain unknown failures. Broad local document-abort suppression is removed; every smoke caller awaits validation.

## Evidence (SHA-256)

- Initial stricter diagnostic, retained: `/tmp/opencode/research51-markov.jsonl`, `a41b0ea974e378f8bf3919b7154415cdae9bc4bc1fb04c1aec26e91161d81a90`. Exposed the completed directory repeat; not deleted or relabeled as a pass.
- Intermediate capture: `/tmp/opencode/research51-markov-after.jsonl`, `35cd95b3d3d378d71c769b982eb0f12e70398d22683f2abc32961a779bfc2a69`.
- Final capture: `/tmp/opencode/research51-markov-final.jsonl`, `9a281aa04d041d82ded7e0258e505579b8f389741f671772b8127fb2e268f4b0`. Six cells (1400x1000, 390x844, 320x844; light/dark), three fresh sequential contexts each: 18 measured, 18 validated handoffs, zero runtime/network errors, source-end unchanged true. Overall failed-or-inconclusive retained for geometry; no performance approval.
- Actual-child interaction output: `/home/compute_01/.local/share/opencode/tool-output/tool_087f44792001LiCjyJl2acbs1Y`, `efad17ff7c3f008a7f5b24ea079ae22756b0424941bf6cea1186263581cbac1c`. Separate exclusive browser, same six cells times three contexts: matrix edit, invalid row sum, recovery, ArrowRight speed/duration and Tab exit all passed. Runnable: `SMOKE_PORT=4191 node tools/markov-browser.mjs`.

## Verification and remaining blocks

Root unit 408/408, root check and audit passed; helper/probe syntax and 16 focused classifier tests passed. Negative tests cover wrong frame/destination, missing finished/readiness/navigation, native/console error, stylesheet abort, external request, other route, main frame, HTTP error, old evidence and incomplete directory repeat.

Markov focused smoke stops at `markov-chains mobile geometry baseline runtime bottom shifted by more than 1 CSS px`. Ncase group stops at `polygons mobile geometry baseline runtime bottom shifted by more than 1 CSS px`; later canonical runtime paths remain unverified, not exempted. No remaining Markov runtime block in final 18-context capture. Historical CI remains failed; full smoke and paired qualification remain blocked/unverified. No noisy timing group is promoted, no threshold relaxed, no geometry/native-pane edits or baseline refresh.
