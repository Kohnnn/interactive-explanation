# Lock the Suggested Next Route contract

Type: grilling
Status: resolved
Blocked by: 03, 04

## Question

Which curated Route mapping becomes canonical, where should it live, how should Atlas cards and Route shells expose it, and how should Guided Path position coexist with it without creating ordinary Route Progress? Resolve deliberate cycles, terminal experiences, labels, and accessibility behavior.

The matrix establishes three required editorial decisions: reconcile the published Music Guided Path edge `ableton-learning-synths-get-started` → `musicmap` with the proposed synth-family continuation; confirm or remove the undocumented `curves-and-surfaces` → `image-kernels` → `alpha-compositing` → `color-spaces` → `lights-and-shadows` loop; and define how `primary-interactive-hub` may retain Guided Path intent without inventing numbered Progress.

## Answer

Adopt the literal 83-entry table in [Suggested Next Route Map](../research/03-suggested-next-route-map.md) with exactly two overrides:

- `ableton-learning-synths-get-started` → `musicmap`, preserving the published Music Guided Path.
- `lights-and-shadows` → `primary-interactive-hub`, removing the undocumented engineering loop.

Keep `ableton-learning-synths-recipes` → `musicmap`; this preserves the separate synth-family arc for learners who enter later synth lessons. Keep the deliberate primary-collection, Music, and machine-learning returns. The canonical result has one non-null, local, non-self `suggestedNextSlug` for every manifest Route, with no inferred or external fallback.

`routes.manifest.json` is the only authored source. Route chrome reads the current Route and target title from manifest data and renders one block after `<main>` and before `#reference-footer`: heading `Suggested Next Route` and one locally relative target-title link. Atlas cards render one separate `Suggested next: <Route title>` local link. Both surfaces expose an ordinary named link, retain visible keyboard focus, and never redirect, autoplay, move focus, or infer from tags or learner state.

The Music and Blockchain Guided Paths retain their existing numbered, local 30-day Progress behavior. `primary-interactive-hub` remains an unnumbered editorial `guided-path` hub: it receives no Progress metadata, Start/Resume control, step count, numbered position, or Progress write. Following Suggested Next Route never writes ordinary Route Progress; only an explicit action already owned by a numbered Guided Path may do so.

Skipped: terminal nulls and personalization. Add multiple choices only if the domain definition changes from one editorial continuation per Route.
