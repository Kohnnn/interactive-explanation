# Research the Suggested Next Route map

Type: research
Status: resolved
Blocked by:

## Question

Using the manifest, Route documentation, parity records, existing Guided Paths, intent, topic, difficulty, duration, and prerequisites, what explicit editorial mapping should assign exactly one Suggested Next Route to each of the 83 Routes? Preserve known path order, avoid self-links and accidental dead ends, explain deliberate cycles or returns, and do not use personalized or runtime inference.

## Answer

[Research artifact](../research/03-suggested-next-route-map.md)

Use the artifact's literal 83-entry editorial map as a candidate contract: 83 unique source Routes, zero self-links, and zero missing targets. It preserves the Blockchain order and existing companion handoffs.

The authoritative matrix found two unresolved editorial defects: the candidate does not preserve the published final Music Guided Path edge, and it creates an undocumented five-Route engineering loop. [Lock the Suggested Next Route contract](09-lock-suggested-next-route-contract.md) must resolve both before adoption.

Suggested Next Route remains static editorial metadata. It never derives from learner state or tags and creates Progress only when the handoff is part of a Guided Path.
