# Research safe shell isolation and full UI theming

Type: research
Status: resolved
Blocked by:

## Question

Which CSS, DOM, and loading architecture can place all 83 Routes under the Engineering Sandbox contract, theme every HTML and runtime-owned UI surface in light and dark modes, and preserve behavior, content, accessibility, and runtime dimensions while leaving intrinsic canvas, WebGL, image, and video palettes unchanged? Inventory existing repository seams, collision cases, and standards-backed isolation options, then recommend the smallest canonical patterns.

## Answer

[Research artifact](../research/01-shell-isolation-and-theming.md)

Use an additive authored seam per Route: synchronous pre-paint theme initialization and color-scheme metadata in `<head>`, complete body shell metadata, unchanged runtime roots and script order, and family adapters scoped to documented runtime roots. Explicit ancestor selectors and shared classes provide the compatibility boundary; cascade layers may organize shared CSS but cannot provide isolation.

Use namespaced shared tokens and map them into runtime variables only when an existing hook is verified. Classify theme ownership as `shell-only`, `runtime-hook`, `fixed-runtime`, or explicitly migrated `iframe-child`. Iframes and intrinsic canvas, WebGL, image, and video output stay opaque unless separately owned. Reject global resets, universal wrappers, vendor edits, global observers, Shadow DOM retrofits, and `@scope` as the sole boundary.
