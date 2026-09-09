# Assign Route navigation modes and ownership boundaries

Type: grilling
Status: resolved
Blocked by: 04, 05

## Question

Which of `generated`, `native`, or `none` should each Route use, and where does shell ownership stop for iframe documents, canvases, WebGL stages, compiled app roots, legacy slideshows, and runtime-created controls? Resolve every exception before family migration tickets are created.

## Answer

Assign all 83 Routes exactly once: 43 `generated`, 15 `native`, and 25 `none`.

### Generated

`remember`, `covid-19`, `decision-tree`, `random-forest`, `linear-regression`, `logistic-regression`, `precision-recall`, `roc-auc`, `bias-variance`, `double-descent`, `double-descent2`, `conditional-probability`, `markov-chains`, `principal-component-analysis`, `exponentiation`, `pi`, `sine-and-cosine`, `eigenvectors-and-eigenvalues`, `image-kernels`, `ordinary-least-squares-regression`, `alpha-compositing`, `color-spaces`, `sound`, `cameras-and-lenses`, `lights-and-shadows`, `tesseract`, `gears`, `gps`, `earth-and-sun`, `bicycle`, `airfoil`, `curves-and-surfaces`, `internal-combustion-engine`, `mechanical-watch`, `naval-architecture`, `formula-1-racing`, `interactive-mechanical-watch`, `music-interactive-hub`, `primary-interactive-hub`, `memory-allocation`, `load-balancing`, `hysteresis-slack`, and `rigid-body-collisions`.

Generated navigation owns only manifest-declared chapter metadata and generated `.ie-*` rail, mobile bar, sheet, and progress chrome. It scrolls to existing authored roots and may assign stable IDs only through an explicit chapter declaration. The five declarations currently in `routeChapterConfigs` for `rigid-body-collisions`, `linear-regression`, `logistic-regression`, `precision-recall`, and `roc-auc` move into manifest metadata; the JavaScript registry is removed.

### Native

| Route | Declared native contract |
| --- | --- |
| `trust` | `#select .dot`, at least 10 runtime-owned slide controls |
| `crowds` | `#navigation > div[chapter]`, at least nine runtime-owned chapter controls |
| `neurons` | `iframe[title="Neurotic Neurons interactive"]` with child-local `#control_play, #control_volume, #control_captions`; the child document remains independently owned |
| `anxiety` | `#game_choices > button`, at least one visible runtime-owned choice when the choice state is ready |
| `simulating` | `.links a[href="../sim/"], .links a[href="./original/"]`, two local handoff links |
| `train-test-validation` | `#toc a[href^="#"]`, at least six fragment links |
| `blockchain` | `nav a`, at least six route-owned links; fragment-only validation is disabled |
| `public-private-keys` | `nav a`, at least four route-owned links; fragment-only validation is disabled |
| All six `ableton-learning-synths-*` Routes | `main[data-ableton-synth-lesson] a[data-archive-localized="true"]`, at least two localized lesson links after mount |
| `watch-mesh-explorer` | `[data-lesson-list] button`, at least ten lesson-state controls; `[data-prev-lesson]` and `[data-next-lesson]` operate the same state |

Native controls retain all state, focus, event, and layout ownership. The shell validates and frames them but does not duplicate, intercept, reorder, or convert state controls into fragment links.

### None

`polygons`, `ballot`, `loopy`, `wbwwb`, `coming-out-simulator-2014`, `sim`, `zero-knowledge-proof-demo`, `reading-qr-codes-without-a-computer`, all six `teoria-*` Routes, all seven `ableton-learning-music-*` Routes, `chrome-music-lab-song-maker`, `musicmap`, `blockchain-101-combined-flow`, and `stargazing-dashboard`.

These Routes render no generated rail, mobile bar, sheet, chapter progress, or duplicate native navigation. Their declared primary runtime control or read-only surface remains dominant.

Across all modes, shell ownership stops at each declared authored root. Parent Routes own iframe frames but not child documents; DOM framing may surround canvas, WebGL, SVG, image, video, audio, compiled, minified, or binary runtimes but may not change their pixels, dimensions, transforms, event handling, or state. A child document or runtime-created control becomes themeable or navigable only through its own explicit family declaration and verified hook.

Skipped: inferred navigation and a generic runtime-control adapter. Add a family declaration only when a stable owned selector and interaction contract are proven.
