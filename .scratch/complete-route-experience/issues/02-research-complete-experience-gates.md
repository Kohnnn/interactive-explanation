# Research complete-experience acceptance gates

Type: research
Status: resolved
Blocked by:

## Question

Which static and browser contracts can prove that every Route has valid shell metadata, fitted navigation, light/dark UI support, preserved interaction behavior and dimensions, accessible controls, one curated Suggested Next Route, responsive usability, policy compliance, and a clean runtime? Identify gaps in current tests and recommend objective per-family and repository-wide rollback thresholds.

## Answer

[Research artifact](../research/02-complete-experience-gates.md)

Make `routes.manifest.json` the single source for shell variant/navigation, Suggested Next Route, primary control, interaction probe, runtime surface, theme ownership, and network policy. Validate all declarations statically, then consume them in reusable Playwright gates.

Every family slice requires 83/83 static and browser integrity after its focused run: desktop, 390px, and 320px; stored light and dark states; fitted navigation; one Suggested Next Route; deterministic interaction and runtime-dimension checks; keyboard, focus, name/state, and target-size checks; local network policy; visual review with intrinsic surfaces masked; and comparative performance budgets. Geometry may vary by at most 1 CSS pixel unless explicitly declared. Any unexplained intrinsic visual, behavior, dimension, network, or unrelated full-suite regression rolls back the family slice.
