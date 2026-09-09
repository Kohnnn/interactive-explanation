# Authoritative Route Migration Matrix

## Scope

This matrix is the authoritative planning inventory for the 83 entries in `interactive-explanation/routes.manifest.json`. It records current repository facts and the smallest candidate inputs needed by the remaining architecture, navigation, continuation, acceptance, and sequencing decisions. It does not modify the product manifest or make those later decisions.

Current shell state, runtime boundaries, themeable surfaces, intrinsic exclusions, and smoke coverage are observed facts. **Nav**, **Suggested next**, and **Wave** are recommendations pending their named decision tickets. Risk is an inventory judgment based on the current ownership and runtime boundary.

## Legend

### Shell now

- `E/G`: Engineering Sandbox `essay` with generated navigation.
- `E/N`: Engineering Sandbox `essay` with native navigation.
- `L/N`: Engineering Sandbox `lab` with native navigation.
- `L/0`: Engineering Sandbox `lab` with no generated navigation.
- `P/0`: Engineering Sandbox `practice` with no generated navigation.
- `Ø`: Engineering Sandbox metadata absent.
- `Ø/F`: Engineering Sandbox metadata absent; the committed Ableton Synths family frame is present.

### Boundary and exclusions

The ownership boundary names the outermost surface this effort may adapt without a separate runtime migration. Child iframe documents and intrinsic output stay outside that boundary.

- `C`: canvas pixels.
- `GL`: WebGL pixels.
- `SVG`: runtime-generated SVG or plot output.
- `IMG`: image or animated-image pixels.
- `VID`: video pixels.
- `IF`: child iframe document.
- `AUD`: audio engine, samples, or audio output.
- `BND`: compiled, archived, minified, or vendored runtime internals.
- `BIN`: binary mesh/model data and the renderer consuming it.
- `MATH`: MathJax or KaTeX-rendered internals.

### Smoke and missing gates

- `B`: universal route baseline at 1400×1000 and 390×844, meaningful `main`, Atlas/Docs exits, overflow, hidden-footer focus safety, initial local-network policy, and runtime errors.
- `R`: an explicit Route-specific scenario is dispatched. Scenario depth varies and does not imply complete interaction, geometry, or accessibility coverage.
- `E`: explicit deferred-embed network behavior is covered.
- `U`: the universal complete-experience contract is still missing: manifest-owned shell/runtime declarations, 320 px and fresh-context coverage, Suggested Next Route, both stored themes, declared interaction and geometry, complete primary-control accessibility, masked visual approval, and comparative performance.
- `R-gap`: no explicit Route-specific scenario exists.

### Risk and provisional waves

- `L`, `M`, `H`: low, medium, or high migration risk.
- `W1`: low-risk, locally authored HTML, hubs, and Guided Paths.
- `W2`: prose-first or stable owned-root Routes that already have the shell.
- `W3`: interaction-sensitive tools, practices, games, and known family adapters.
- `W4`: iframe estates, fragile compiled lifecycles, shared binary runtimes, canvas-heavy systems, or WebGL.

## Matrix

### Nicky Case runtimes

| Route | Shell now | Runtime family | Ownership boundary | Nav | Themeable UI | Intrinsic or opaque exclusions | Suggested next | Smoke | Missing | Risk | Wave |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `trust` | Ø | NCase slideshow/simulation | Route document; stop at game/simulation stage | native | Slide text, framing, DOM buttons and readouts | C, IMG | `polygons` | B+R | U | H—stateful slideshow and tournament sequencing | W3/NCase games |
| `polygons` | Ø | NCase iframe essay | Parent article; stop at 19 local child documents | none | Parent prose and iframe frames | IF, C/IMG inside children | `ballot` | B+R | U | H—19 autonomous simulations and fixed frame geometry | W4/iframe essays |
| `ballot` | Ø | NCase iframe essay | Parent article; stop at 14 local child documents | none | Parent prose and iframe frames | IF, C/IMG inside children | `crowds` | B+R | U | H—14 autonomous voting models and sandbox state | W4/iframe essays |
| `crowds` | Ø | NCase canvas slideshow | Route document; stop at two canvas stages | native | Outer framing, chapter text, DOM labels and buttons | C, IMG | `loopy` | B | U+R-gap | H—drawing, contagion, and slideshow state; no Route scenario | W3/NCase games |
| `loopy` | Ø | NCase editor/tool | Route-owned toolbar, sidebar, modal, and model boundary | none | Toolbar, sidebar, modal, export/share controls | C, IMG | `simulating` | B+R | U | H—editor coordinates, persistence, export, and share state | W3/NCase tools |
| `neurons` | Ø | NCase iframe essay | Parent article; stop at `interactive.html` child document | native | Parent article, captions, and iframe frame | IF, C/IMG inside child | `anxiety` | B+R | U | H—autonomous sequential-animation child runtime | W4/iframe essays |
| `remember` | Ø | NCase comic with practices | Parent comic; stop at five local practice frames and external tutorial | generated | Comic prose, chapter framing, practice/download links | IF, VID, C/IMG inside children | `primary-interactive-hub` | B+R | U | H—scroll timing, child simulations, and external video boundary | W4/iframe essays |
| `anxiety` | Ø | NCase narrative game | Route document; stop at scene stage and media | native | Content note, dialogue, choices, options, pacing controls | C, IMG, AUD | `remember` | B+R | U | H—branching narrative, timing, audio, and persistent state | W3/NCase games |
| `wbwwb` | Ø | NCase Pixi game | Outer document; stop at Pixi stage | none | Outer framing and any DOM-owned controls | C, IMG, BND | `crowds` | B+R | U | H—opaque timing-sensitive game stage | W3/NCase games |
| `coming-out-simulator-2014` | Ø | NCase branching game | Route document; stop at game stage and media | none | Menu, dialogue, and choice overlays when DOM-owned | C, IMG, AUD | `anxiety` | B+R | U | H—branch graph, consequences, timing, and assets | W3/NCase games |
| `covid-19` | Ø | NCase iframe essay | Parent article; stop at 26 local child documents | generated | Parent prose, sections, and iframe frames | IF, C/SVG/IMG inside children | `crowds` | B+R | U | H—26 autonomous simulations and fixed frame geometry | W4/iframe essays |
| `simulating` | Ø | NCase launcher/nested legacy | Authored launcher; stop at legacy article and model-editor subtrees | native | Launcher cards, copy, and local handoffs | IF/C/BND in nested runtimes | `sim` | B+R | U | H—multiple independently owned legacy surfaces | W4/nested legacy |
| `sim` | Ø | NCase simulation editor | Route-owned control bar and rule editor; stop at simulation grid | none | Actions, menus, rule editor, save/load/export UI | C/runtime grid, IMG | `primary-interactive-hub` | B+R | U | H—editable model, local serialization, and reset state | W3/NCase tools |

### MLU Explain runtimes

| Route | Shell now | Runtime family | Ownership boundary | Nav | Themeable UI | Intrinsic or opaque exclusions | Suggested next | Smoke | Missing | Risk | Wave |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `decision-tree` | E/G | MLU compiled essay | Authored document and shell; stop at compiled scene mounts | generated | Shell, prose, DOM controls and readouts | BND, SVG/C, IMG | `random-forest` | B+R | U | M—compiled scrollytelling with stable chapters | W2/MLU essays |
| `random-forest` | E/G | MLU compiled essay | Authored document and shell; stop at compiled tree/barcode mounts | generated | Shell, prose, sliders, prediction controls | BND, SVG/C, IMG | `linear-regression` | B+R | U | M—multiple compiled entrypoints and scroll-linked state | W2/MLU essays |
| `linear-regression` | E/G | MLU compiled essay | Authored document and configured runtime chapter targets | generated | Shell, prose, DOM controls and readouts | BND, SVG/C | `logistic-regression` | B+R | U | M—bundle lifecycle and configured mount targets | W2/MLU essays |
| `logistic-regression` | E/G | MLU compiled essay | Authored document and configured runtime chapter targets | generated | Shell, prose, threshold/probability controls | BND, SVG/C | `train-test-validation` | B+R | U | M—bundle lifecycle and linked classifier scenes | W2/MLU essays |
| `precision-recall` | E/G | MLU compiled essay | Authored document and configured runtime chapter targets | generated | Shell, prose, sliders, matrix readouts | BND, SVG/C, MATH | `roc-auc` | B+R | U | M—compiled chart and generated chapter targets | W2/MLU essays |
| `roc-auc` | E/G | MLU compiled essay | Authored document and configured runtime chapter targets | generated | Shell, prose, threshold controls and captions | BND, SVG/C | `bias-variance` | B+R | U | M—linked threshold and curve scenes | W2/MLU essays |
| `bias-variance` | E/G | MLU compiled essay | Authored document and shell; stop at compiled sandbox mounts | generated | Shell, prose, model-complexity controls | BND, SVG/C, MATH | `double-descent` | B+R | U | M—multiple compiled model sandboxes | W2/MLU essays |
| `train-test-validation` | E/N | MLU compiled essay with native TOC | Existing `#toc` and authored document; stop at compiled scene mounts | native | Native TOC, prose, controls and readouts | BND, SVG/C, IMG | `precision-recall` | B+R | U | M—native anchor contract must remain aligned with bundle | W2/MLU essays |
| `double-descent` | E/G | MLU compiled scrollytelling | Authored document and shell; stop at sticky compiled charts | generated | Shell, prose, slider wrappers and readouts | BND, SVG/C, IMG | `double-descent2` | B+R | U | M—sticky scroll geometry and animated media | W2/MLU essays |
| `double-descent2` | E/G | MLU compiled essay | Authored document and shell; stop at compiled math/chart mounts | generated | Shell, prose, control wrappers | BND, SVG/C, MATH | `decision-tree` | B+R | U | M—compiled math and chart runtime | W2/MLU essays |

### Setosa / Explained Visually runtimes

| Route | Shell now | Runtime family | Ownership boundary | Nav | Themeable UI | Intrinsic or opaque exclusions | Suggested next | Smoke | Missing | Risk | Wave |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `conditional-probability` | E/G | EV SVG essay | Route document and ordinary controls; stop at SVG geometry | generated | Shell, prose, controls and probability readouts | SVG, IMG | `logistic-regression` | B+R | U | M—shared legacy globals and synchronized interaction | W2/EV essays |
| `markov-chains` | E/G | EV essay plus playground | Parent article and ordinary controls; stop at playground child and SVG output | generated | Shell, prose, transition controls and frame | IF, SVG | `eigenvectors-and-eigenvalues` | B+R | U | H—article and autonomous playground must remain coordinated | W3/EV tools |
| `principal-component-analysis` | E/G | EV Three.js essay | Route document and labels; stop at Three.js/canvas roots | generated | Shell, prose, labels, instructions and dataset controls | GL, C, IMG, BND | `eigenvectors-and-eigenvalues` | B+R | U | H—legacy Three.js controls and draggable PCA state | W4/EV WebGL |
| `exponentiation` | E/G | EV SVG essay | Route document and stepper controls; stop at SVG output | generated | Shell, prose, steppers and readouts | SVG, IMG | `conditional-probability` | B+R | U | M—linked growth demos under shared globals | W2/EV essays |
| `pi` | E/G | EV SVG essay | Route document and drag framing; stop at SVG output | generated | Shell, prose, labels and readouts | SVG | `sine-and-cosine` | B+R | U | M—drag geometry synchronizes multiple scenes | W2/EV essays |
| `sine-and-cosine` | E/G | EV SVG/math essay | Route document and controls; stop at graphs and math renderer | generated | Shell, prose, controls and formula containers | SVG, MATH | `eigenvectors-and-eigenvalues` | B+R | U | M—autoplay transforms and legacy MathJax | W2/EV essays |
| `eigenvectors-and-eigenvalues` | E/G | EV SVG/math essay | Route document and controls; stop at map/spiral/matrix scenes | generated | Shell, prose, sliders and readouts | SVG, MATH | `tesseract` | B+R | U | M—several interactive scenes share route globals | W2/EV essays |
| `image-kernels` | E/G | EV image/video lab essay | Route document and matrix/mode controls; stop at media-processing surfaces | generated | Shell, prose, matrix inputs, modes and readouts | C, IMG, VID, BND | `alpha-compositing` | B+R | U | H—camera/upload permissions and Angular/D3 media runtime | W4/EV media |
| `ordinary-least-squares-regression` | E/G | EV compiled essay | Route document and coefficient UI; stop at compiled fit rendering | generated | Shell, prose, coefficient controls and readouts | BND, SVG/C | `linear-regression` | B+R | U | M—compiled draggable-data interaction | W2/EV essays |

### Anders Brownworth labs

| Route | Shell now | Runtime family | Ownership boundary | Nav | Themeable UI | Intrinsic or opaque exclusions | Suggested next | Smoke | Missing | Risk | Wave |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `blockchain` | L/N | Anders Bootstrap lab | Route-owned nav, cards, inputs, buttons, and state classes | native | All authored lab HTML and controls | BND library internals only | `public-private-keys` | B+R | U | M—legacy Bootstrap/jQuery and cascading hash invalidation | W3/Anders labs |
| `public-private-keys` | L/N | Anders Bootstrap/crypto lab | Route-owned nav, forms, cards, and state classes | native | All authored lab HTML and controls | BND crypto library internals | `zero-knowledge-proof-demo` | B+R | U | M—legacy crypto libraries, cookies, and multiple scenes | W3/Anders labs |
| `zero-knowledge-proof-demo` | L/0 | Anders map lab | Outer lab and route buttons; stop at jVectorMap root | none | Hero, checklist, Show/Hide/Shuffle controls | SVG, BND | `blockchain-101-combined-flow` | B+R | U | M—plugin-owned vector regions and event state | W3/Anders labs |

### Engineering longforms and watch runtimes

| Route | Shell now | Runtime family | Ownership boundary | Nav | Themeable UI | Intrinsic or opaque exclusions | Suggested next | Smoke | Missing | Risk | Wave |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `alpha-compositing` | E/G | Engineering canvas longform | Authored article and inline controls; stop at figure canvases | generated | Shell, prose, controls and captions | C, SVG, IMG | `color-spaces` | B+R | U | M—legacy base CSS and interactive canvas figures | W2/engineering essays |
| `color-spaces` | E/G | Engineering canvas longform | Authored article and color controls; stop at plots/canvases | generated | Shell, prose, pickers, sliders and readouts | C, SVG, IMG | `lights-and-shadows` | B+R | U | M—linked color and matrix state | W2/engineering essays |
| `sound` | E/G | Engineering audio/canvas longform | Authored article and playback controls; stop at figures and audio engine | generated | Shell, prose, play/pause, sliders and readouts | C, AUD, IMG | `ableton-learning-synths-get-started` | B+R | U | M—animation and audio timing | W2/engineering essays |
| `cameras-and-lenses` | E/G | Engineering canvas longform | Authored article and controls; stop at optical figures | generated | Shell, prose, sliders, labels and captions | C, IMG | `lights-and-shadows` | B+R | U | M—dense interactive optics scenes | W2/engineering essays |
| `lights-and-shadows` | E/G | Engineering canvas longform | Authored article and controls; stop at light-transport figures | generated | Shell, prose, controls, captions and companion panel | C, IMG | `curves-and-surfaces` | B+R | U | M—many animated light scenes | W2/engineering essays |
| `tesseract` | E/G | Engineering canvas longform | Authored article and controls; stop at projection figures | generated | Shell, prose, controls and captions | C, IMG | `curves-and-surfaces` | B+R | U | M—multi-dimensional rotation and projection state | W2/engineering essays |
| `gears` | E/G | Engineering canvas longform | Authored article and controls; stop at gear figures | generated | Shell, prose, sliders, labels and captions | C, IMG | `bicycle` | B+R | U | M—procedural simulation and touch behavior | W2/engineering essays |
| `gps` | E/G | Engineering canvas longform | Authored article and controls; stop at orbital figures | generated | Shell, prose, controls, captions and companion panel | C, IMG | `stargazing-dashboard` | B+R | U | M—interactive timing/orbit scenes and textures | W2/engineering essays |
| `earth-and-sun` | E/G | Engineering canvas longform | Authored article and controls; stop at globe/orbit figures | generated | Shell, prose, controls, captions and companion panel | C, IMG | `stargazing-dashboard` | B+R | U | M—rendered globe and orbit scenes | W2/engineering essays |
| `bicycle` | E/G | Engineering binary-model longform | Authored article and controls; stop at mechanical renderer | generated | Shell, prose, controls and captions | C/GL, BIN, IMG | `airfoil` | B+R | U | H—binary geometry and interactive force/stability runtime | W4/engineering simulation |
| `airfoil` | E/G | Engineering flow-simulation longform | Authored article and controls; stop at flow figures | generated | Shell, prose, sliders, trigger links and captions | C, BIN, IMG | `formula-1-racing` | B+R | U | H—coupled particle/flow scenes and binary model | W4/engineering simulation |
| `curves-and-surfaces` | E/G | Engineering canvas longform | Authored article and controls; stop at geometry figures | generated | Shell, prose, control points, labels and captions | C, IMG | `image-kernels` | B+R | U | M—draggable control points and geometry renderer | W2/engineering essays |
| `internal-combustion-engine` | E/G | Engineering binary-model longform | Authored article and controls; stop at engine renderer | generated | Shell, prose, sliders and captions | C/GL, BIN, IMG | `gears` | B+R | U | H—binary geometry and multi-scene animated mechanism | W4/engineering simulation |
| `mechanical-watch` | E/G | Shared watch longform | Authored article; stop at `shared/mechanical-watch` renderer | generated | Shell, prose, control labels and captions | GL/C, BIN, IMG | `interactive-mechanical-watch` | B+R | U | H—canonical shared runtime and binary buffers | W4/watch runtime |
| `naval-architecture` | E/G | Engineering canvas longform | Authored article and controls; stop at buoyancy/wave figures | generated | Shell, prose, controls, captions and companion panel | C, IMG | `airfoil` | B+R | U | M—dynamic hull, wave, and stability scenes | W2/engineering essays |
| `formula-1-racing` | E/G | Local engineering canvas longform | Entire authored HTML/control model; stop at procedural figures | generated | Shell, article, 42 controls, panels and readouts | C | `stargazing-dashboard` | B+R | U | H—shared lap state drives many procedural canvases | W4/local engineering |
| `interactive-mechanical-watch` | E/G | Shared watch plus Three.js teardown | Authored editorial/inspector UI; stop at shared watch and exploded-view renderers | generated | Shell, article, component list, inspector, speed/depth controls | GL/C, BIN, IMG, BND | `watch-mesh-explorer` | B+R | U | H—two renderers, 71 parts, and shared model contract | W4/watch runtime |

### QR and Teoria practice runtimes

| Route | Shell now | Runtime family | Ownership boundary | Nav | Themeable UI | Intrinsic or opaque exclusions | Suggested next | Smoke | Missing | Risk | Wave |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `reading-qr-codes-without-a-computer` | Ø | Bundled QR app | Outer document/loading boundary; stop at compiled app root | none | Outer loading/failure state; runtime HTML only after a verified hook | BND, SVG, IMG | `blockchain` | B+R | U | H—hashed bundle and unstable generated DOM contract | W3/compiled apps |
| `teoria-interval-ear-training` | P/0 | Teoria practice | Authored practice frame and five stable exercise mounts | none | Hero, checklist, hints, exercise/score DOM | AUD, SVG/notation, BND | `ableton-learning-music-play-with-beats` | B+R | U | M—vendored exercise boot and audio preload | W3/Teoria practice |
| `teoria-note-ear-training` | P/0 | Teoria practice | Authored practice frame and stable exercise mounts | none | Hero, answer controls and score DOM | AUD, SVG/notation, BND | `teoria-key-and-note-ear-training` | B+R | U | M—vendored exercise boot and audio preload | W3/Teoria practice |
| `teoria-key-and-note-ear-training` | P/0 | Teoria practice | Authored practice frame and stable exercise mounts | none | Hero, reference/audio controls, answer and score DOM | AUD, SVG/notation, BND | `teoria-random-key-and-note-ear-training` | B+R | U | M—multi-step exercise and preload state | W3/Teoria practice |
| `teoria-random-key-and-note-ear-training` | P/0 | Teoria practice | Authored practice frame and stable exercise mounts | none | Hero, drill controls and score DOM | AUD, SVG/notation, BND | `teoria-scale-construction` | B+R | U | M—randomized tonal context and audio assets | W3/Teoria practice |
| `teoria-scale-construction` | P/0 | Teoria practice | Authored practice frame and stable exercise mounts | none | Hero, note-entry controls and score DOM | AUD, SVG/notation, BND | `teoria-interval-identification-and-inversion` | B+R | U | M—exercise state, notation, and playback | W3/Teoria practice |
| `teoria-interval-identification-and-inversion` | P/0 | Teoria practice | Authored practice frame and stable exercise mounts | none | Hero, interval grid, two-step answer and score DOM | AUD, SVG/notation, BND | `ableton-learning-music-play-with-beats` | B+R | U | M—two-step state and audio preload | W3/Teoria practice |

### Ableton Learning Music and Synths

| Route | Shell now | Runtime family | Ownership boundary | Nav | Themeable UI | Intrinsic or opaque exclusions | Suggested next | Smoke | Missing | Risk | Wave |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `ableton-learning-music-playground` | P/0 | Ableton Learning Music widgets | Authored practice frame; stop at archived synchronized widgets | none | Hero, onboarding, widget DOM and transport controls at verified roots | AUD, BND, C/SVG, IMG | `ableton-learning-synths-get-started` | B+R | U | H—multiple synchronized widgets and sample banks | W3/Ableton Music |
| `ableton-learning-music-play-with-beats` | P/0 | Ableton Learning Music widgets | Authored practice frame; stop at archived sequencer runtime | none | Practice frame, drum grid and transport DOM | AUD, BND, C/SVG | `ableton-learning-music-playground` | B+R | U | H—recordable grid and archived widget runtime | W3/Ableton Music |
| `ableton-learning-music-play-with-notes-and-scales` | P/0 | Ableton Learning Music widgets | Authored practice frame; stop at linked archived widgets | none | Practice frame, piano/drum controls, tonic and scale pickers | AUD, BND, C/SVG | `ableton-learning-music-play-with-chords` | B+R | U | H—linked scale state and sample runtime | W3/Ableton Music |
| `ableton-learning-music-play-with-chords` | P/0 | Ableton Learning Music widgets | Authored practice frame; stop at linked archived widgets | none | Practice frame, chord/piano/drum and transport controls | AUD, BND, C/SVG | `ableton-learning-music-play-with-basslines` | B+R | U | H—archived widgets and audio transport state | W3/Ableton Music |
| `ableton-learning-music-play-with-basslines` | P/0 | Ableton Learning Music widgets | Authored practice frame; stop at synchronized sequencers | none | Practice frame, bass/drum grids and transport controls | AUD, BND, C/SVG | `ableton-learning-music-play-with-melodies` | B+R | U | H—synchronized sequencer widgets and samples | W3/Ableton Music |
| `ableton-learning-music-play-with-melodies` | P/0 | Ableton Learning Music widgets | Authored practice frame; stop at synchronized sequencers | none | Practice frame, melody/drum grids and transport controls | AUD, BND, C/SVG | `ableton-learning-music-play-with-song-structures` | B+R | U | H—archived sequencer and playback state | W3/Ableton Music |
| `ableton-learning-music-play-with-song-structures` | P/0 | Ableton Learning Music lesson | Authored practice frame; stop at archived lesson/media runtime | none | Practice frame, arrangement lesson and DOM controls | AUD, BND, IMG | `chrome-music-lab-song-maker` | B+R | U | M—lighter lesson with archived media/runtime | W3/Ableton Music |
| `ableton-learning-synths-get-started` | Ø/F | Ableton Synths React/RNBO app | `#app[data-ableton-synth-lesson]`; family adapter only at verified hooks | native | Outer loading/frame and mounted lesson HTML at verified tokens | AUD, BND, C/GL, IMG/GLB | `ableton-learning-synths-how-synths-make-sound` | B+R | U | H—React archive, RNBO boot, media, and link rewriting | W3/Ableton Synths |
| `ableton-learning-synths-how-synths-make-sound` | Ø/F | Ableton Synths React/RNBO app | `#app[data-ableton-synth-lesson]`; family adapter only at verified hooks | native | Outer loading/frame and mounted lesson HTML at verified tokens | AUD, BND, C/GL, IMG/GLB | `ableton-learning-synths-filter-resonance` | B+R | U | H—React/RNBO archive and visualizations | W3/Ableton Synths |
| `ableton-learning-synths-filter-resonance` | Ø/F | Ableton Synths React/RNBO app | `#app[data-ableton-synth-lesson]`; family adapter only at verified hooks | native | Outer loading/frame and mounted lesson/filter HTML at verified tokens | AUD, BND, C/GL, IMG/GLB | `ableton-learning-synths-modulating-amplitude-with-envelopes` | B+R | U | H—React/RNBO archive and filter visualization | W3/Ableton Synths |
| `ableton-learning-synths-modulating-amplitude-with-envelopes` | Ø/F | Ableton Synths React/RNBO app | `#app[data-ableton-synth-lesson]`; family adapter only at verified hooks | native | Outer loading/frame and mounted ADSR HTML at verified tokens | AUD, BND, C/GL, IMG/GLB | `ableton-learning-synths-matching-envelopes` | B+R | U | H—React/RNBO archive and envelope runtime | W3/Ableton Synths |
| `ableton-learning-synths-matching-envelopes` | Ø/F | Ableton Synths React/RNBO app | `#app[data-ableton-synth-lesson]`; family adapter only at verified hooks | native | Outer loading/frame and mounted matching-task HTML at verified tokens | AUD, BND, C/GL, IMG/GLB | `ableton-learning-synths-recipes` | B+R | U | H—React/RNBO archive and task state | W3/Ableton Synths |
| `ableton-learning-synths-recipes` | Ø/F | Ableton Synths React/RNBO app | `#app[data-ableton-synth-lesson]`; family adapter only at verified hooks | native | Outer loading/frame and mounted recipe/preset HTML at verified tokens | AUD, BND, C/GL, IMG/GLB | `musicmap` | B+R | U | H—React/RNBO archive and preset runtime | W3/Ableton Synths |

### Music tools and local hubs

| Route | Shell now | Runtime family | Ownership boundary | Nav | Themeable UI | Intrinsic or opaque exclusions | Suggested next | Smoke | Missing | Risk | Wave |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `chrome-music-lab-song-maker` | Ø | Bundled music tool | Authored outer metadata/frame; stop at bundled sequencer root | none | Outer frame and stable top/bottom/settings controls after hook verification | C, AUD, BND, IMG | `music-interactive-hub` | B+R | U | H—opaque bundle, canvas coordinates, audio, and neutralized sharing | W3/music tools |
| `musicmap` | Ø | Bundled graph/music app | Authored outer frame; stable search/sidebar controls only after root verification | none | Search, zoom, side pane, and action buttons at verified roots | SVG, BND, IF, VID/AUD | `music-interactive-hub` | B+R+E | U | H—large graph bundle and deferred remote-media exception | W3/music tools |
| `music-interactive-hub` | Ø | Local editorial hub | Entire authored document | generated | All page HTML, path, clusters, cards, and links | — | `teoria-interval-ear-training` | B+R | U | L—static semantic HTML | W1/local hubs |
| `primary-interactive-hub` | Ø | Local editorial hub | Entire authored document | generated | All page HTML, clusters, cards, and links | — | `trust` | B+R | U | L—static semantic HTML; Guided Path semantics remain open | W1/local hubs |

### Systems, local paths, and original tools

| Route | Shell now | Runtime family | Ownership boundary | Nav | Themeable UI | Intrinsic or opaque exclusions | Suggested next | Smoke | Missing | Risk | Wave |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `memory-allocation` | E/G | Samwho systems essay | Route article, controls, and owned memory-grid roots | generated | Shell, prose, controls, readouts, and owned grid DOM | IMG | `load-balancing` | B+R | U | M—stateful allocator implementations and scene timing | W2/systems essays |
| `load-balancing` | E/G | Samwho simulation essay | Route article and controls; stop at Pixi/Plotly roots | generated | Shell, prose, algorithm controls and readouts | C, SVG, BND | `primary-interactive-hub` | B+R | U | H—multiple renderers and live playground state | W3/systems labs |
| `hysteresis-slack` | E/G | Compiled systems essay | Route article and paired controls; stop at compiled chart | generated | Shell, prose, sliders and readouts | BND, SVG/C, IMG | `rigid-body-collisions` | B+R | U | M—compiled slider/chart runtime and animated image | W2/systems essays |
| `rigid-body-collisions` | E/G | Nuxt collision essay | Authored shell and configured chapter targets; stop at Nuxt/canvas runtime | generated | Shell, prose, Nuxt-emitted HTML controls at verified roots | C, BND | `bicycle` | B+R | U | H—Nuxt lifecycle, canvas interaction, and delayed mounts | W4/compiled simulation |
| `blockchain-101-combined-flow` | L/0 | Local Guided Path | Entire authored document and existing Progress attributes | none | Hero, chapter cards, route links, Progress/share UI | — | `primary-interactive-hub` | B+R | U | L—static local roadmap; preserve three-step Progress contract | W1/local paths |
| `stargazing-dashboard` | L/0 | Local Three.js astronomy lab | Authored hero, HUD, controls, telemetry, and dialogs; stop at sky renderer | none | All dashboard HTML controls and telemetry | GL, BND, IMG | `primary-interactive-hub` | B+R | U | H—WebGL lifecycle, catalog loading, astronomy state, and fallback | W4/local WebGL |
| `watch-mesh-explorer` | Ø | Local Three.js watch workbench | Authored workbench UI; stop at Three.js and shared watch meshes | native | Lesson list, filters, register, inspector, and mode controls | GL, BIN, BND | `primary-interactive-hub` | B+R | U | H—shared binary geometry, 71 parts, and guided/atlas modes | W4/watch runtime |

## Facts established

1. **Inventory is complete.** `routes.manifest.json` and `pages.json` contain the same 83 ordered Routes. Every Route has an `index.html`, docs page, and parity record; this matrix contains one row per unique slug.
2. **Current shell coverage is 58/83, not 59/83.** The exact split is 39 `generated`, 3 `native`, and 16 `none`; 25 Routes lack Engineering Sandbox metadata. Six of those 25 have the committed Ableton Synths family frame.
3. **Theme ownership is undeclared.** No Route directly loads `shared/theme-init.js`, and the manifest has no shell, runtime-surface, intrinsic-mask, or theme-ownership contract. Stable outer HTML exists for every Route, but iframe children, intrinsic renderers, and unhooked compiled roots are not implicitly themeable.
4. **The most important hard boundaries are explicit.** The NCase iframe estates are autonomous child documents; the shared watch model/runtime affects `mechanical-watch`, `interactive-mechanical-watch`, and `watch-mesh-explorer`; Ableton Synths has a proven root-scoped adapter seam at `#app[data-ableton-synth-lesson]` but no permission to rewrite its archived runtime.
5. **Smoke starts from a strong but incomplete base.** All 83 Routes receive the universal baseline; 82 have an explicit Route scenario. `crowds` is the only Route without one. Existing scenarios are uneven and none replaces the missing 83-Route manifest/theme/geometry/accessibility/visual/performance contract.
6. **The Suggested Next Route proposal is cardinality-valid but not yet canonical.** It has 83 unique sources, 83 existing non-self targets, and no missing targets. It conflicts with one published Music Guided Path edge: the published path requires `ableton-learning-synths-get-started` → `musicmap`, while the proposal uses `ableton-learning-synths-how-synths-make-sound`.
7. **The proposal contains four cycles, not the three documented in its research summary.** The additional loop is `curves-and-surfaces` → `image-kernels` → `alpha-compositing` → `color-spaces` → `lights-and-shadows` → `curves-and-surfaces`. Its editorial intent must be confirmed or changed.
8. **`primary-interactive-hub` has unresolved Guided Path semantics.** Its manifest intent is `guided-path` and its page names `trust` as “Start here,” but it has no numbered sequence or Progress metadata. This matrix does not infer either.
9. **The provisional waves are evidence-based, not execution order.** They contain 3 W1, 29 W2, 34 W3, and 17 W4 Routes. Risk totals are 3 low, 39 medium, and 41 high. The family sequencing decision may reorder or split these cohorts but should not erase their runtime boundaries.

## Decision inputs unlocked

- Shell isolation can now choose one default authored seam and name iframe-parent, compiled-root, shared-watch, and known-root adapter exceptions without guessing Route membership.
- Theme adaptation can assign `shell-only`, `runtime-hook`, `fixed-runtime`, or separately approved `iframe-child` ownership from explicit surfaces and exclusions.
- Navigation can confirm or revise one candidate mode per Route; every proposed `native` mode still needs a concrete native selector or runtime-control contract.
- Acceptance can add manifest fields and convert the current `B`/`R` fixtures into exact per-Route primary-control, interaction, geometry, accessibility, mask, and network declarations.
- Suggested Next Route must resolve the Music Path conflict, the undeclared engineering loop, and `primary-interactive-hub` semantics before the literal map becomes canonical.
- Sequencing can use the proposed W1–W4 cohorts as evidence while graduating atomic runtime-family implementation tickets only after the preceding decisions lock.

## Evidence

- `interactive-explanation/routes.manifest.json`
- `interactive-explanation/pages.json`
- `interactive-explanation/shared/route-families.js`
- `interactive-explanation/ENGINEERING_SANDBOX.md`
- `interactive-explanation/shared/engineering-sandbox.js`
- `interactive-explanation/shared/engineering-sandbox.css`
- `interactive-explanation/shared/public-footer.js`
- `interactive-explanation/shared/public-footer.css`
- `interactive-explanation/tools/smoke-bundle.mjs`, especially the universal baseline around lines 690–735 and Route dispatch around lines 7997–8260
- `interactive-explanation/tools/tests/route-baseline.test.mjs`
- `interactive-explanation/tools/check-public-surface.mjs`
- `research/01-shell-isolation-and-theming.md`
- `research/02-complete-experience-gates.md`
- `research/03-suggested-next-route-map.md`
