# Build the authoritative Route migration matrix

Type: task
Status: resolved
Blocked by: 01, 02, 03

## Question

Compile one authoritative matrix for all 83 Routes that records current shell state, runtime family, ownership boundary, proposed navigation mode, themeable UI surfaces, intrinsic media exclusions, Suggested Next Route, existing smoke coverage, missing gates, migration risk, and recommended family wave. What facts does that matrix establish for later architecture and sequencing decisions?

## Answer

[Authoritative Route Migration Matrix](../research/04-authoritative-route-matrix.md)

The matrix validates one row for each of 83 unique manifest Routes and identifies each current shell state, runtime ownership boundary, themeable UI, intrinsic exclusions, candidate navigation, candidate continuation, smoke state, missing gate, migration risk, and provisional wave.

It establishes 58 current Engineering Sandbox Routes: 39 generated, three native, and 16 none. Twenty-five Routes remain non-shell, including six Ableton Synths Routes with the committed family frame. All 83 receive the universal smoke baseline, 82 have explicit Route scenarios, and `crowds` is the only scenario gap. Theme/runtime ownership and all complete-experience manifest contracts remain undeclared.

The candidate Suggested Next Route map is structurally valid but has two unresolved editorial defects: one published Music Guided Path edge conflicts with the synth-family sequence, and an undocumented five-Route engineering cycle exists. `primary-interactive-hub` also has Guided Path intent without numbered Progress semantics. These remain inputs to the continuation-contract decision, not matrix decisions.

The provisional inventory contains three W1, 29 W2, 34 W3, and 17 W4 Routes, with three low-, 39 medium-, and 41 high-risk migrations. These cohorts expose the runtime boundaries needed by the shell, theme, navigation, acceptance, continuation, and sequencing decisions without fixing their final implementation order.
