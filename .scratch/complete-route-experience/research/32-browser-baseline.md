# Browser baseline: issue 32

## Execution

- Started: 2026-09-08T14:45:24.933Z; finished: 2026-09-08T14:48:26.894Z. Collector exit: 0.
- 504/504 base cells measured; 0 blocked; 504 attempted. 514 total captures; 514 Navigation Timing entries.
- Blocker: none for base snapshot collection. A measured cell is a snapshot, not a correctness pass.
- Environment: Node v24.20.0, Playwright 1.60.0, Chromium 151.0.7922.34, Linux x64. Git HEAD remained `5f7c6ef337e9c8935a43708147d86bdf1d68f4df`; dirty count remained 759. Concurrent agents may change source during collection; no immutable checkout or cold OS-cache claim.
- Syntax check exit 0; collector self-test exit 0; initial collector and launch-only diagnostic exit 2 because Playwright expected missing `chromium_headless_shell-1223`. No installation attempted. Successful rerun used existing Chromium revision 1234 explicitly; package/browser revision mismatch limits reproducibility. Successful collection took approximately 182 seconds, including repeats.
- Collector exit 0 means complete measurement coverage, not defect-free application acceptance.

## Exact commands (parent directory)

```bash
node --check .scratch/complete-route-experience/research/32-browser-baseline.mjs
node .scratch/complete-route-experience/research/32-browser-baseline.mjs --self-test
BASELINE_CHROMIUM_EXECUTABLE="/home/compute_01/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome" node .scratch/complete-route-experience/research/32-browser-baseline.mjs
```

## Method and modality status

| Modality | Status and boundary |
| --- | --- |
| Route inventory | Source-reviewed: 83 manifest Routes plus Atlas; pages inventory parity true |
| Stored light/dark at 1400×1000, 390×844, 320×844 | Measured 504; blocked 0; per-cell JSON status |
| Runtime loading and local HTTP | Measured at capture, including bounded navigation/load errors |
| Component roles and layout | Measured parent DOM counts and primary rectangle, not all nodes or states; visible means CSS box visibility, not unobscured or necessarily in viewport |
| Repetition | Actual fresh-context desktop-light samples below; no production distribution |
| External network | Blocked intentionally, counted separately by resource type; all WebSockets blocked; service workers disabled |
| Embedded child states | Blocked: frame count only; no inherited parent pass |
| Keyboard, touch, reset/recovery, error-state interactions | Blocked: passive collector, no activation |
| System-theme fallback, reduced motion | Blocked: system light fixed, stored choices only, no reduced-motion run |
| Focus, contrast, semantic accessibility | Unsupported by snapshot; no axe, assistive technology or accessibility certification |
| Visual and learning-design judgment | Blocked: no screenshot/human/learner review; no learning outcome |
| Field CWV, LCP, INP, CLS, Lighthouse | Unsupported; navigation timings are not these metrics |
| Real device, cross-browser, production network | Blocked: desktop Chromium viewport emulation only, mouse/no touch |
| Smoke/unit/policy gates | Delegated to another agent; not executed by this collector |

Fresh context per cell, scale 1, no CPU/network throttling, local ephemeral loopback HTTP with no-store; browser routing also disables HTTP cache. Two workers maximum; 12s DOMContentLoaded navigation, 700ms load wait, 200ms settle, 2500ms capture bound. Collection admission stops at 450s; hard browser shutdown at 475s retains checkpointed evidence. Timing reflects capture, not stable final rendering. Resource transfer values are browser-reported completed top-document entries only, may be buffer-truncated, exclude child resources and unfinished requests, and zero is not proof of zero network bytes. Error text, external URLs and query strings are not persisted; categories and hashes preserve grouping without leaking runtime payloads. Diagnostic lists cap at 40 per kind per cell; dropped count recorded.

## Prioritized measured findings

Investigate navigation/local HTTP/page errors first (functional risk); then overflow and absent declared primary surface (learner access); then continuation/theme mismatches (shared experience). These are triage signals, not certified defects: runtime errors may result from deliberate outbound blocking; hidden footer or delayed runtime can be intentional. No approved thresholds or aggregate quality score. Exact per-cell values and event fingerprints are in JSON.

- **navigationErrorCells: 0 cells.** 
- **localHttpFailureCells: 6 cells.** rigid-body-collisions/1400/light, rigid-body-collisions/1400/dark, rigid-body-collisions/390/light, rigid-body-collisions/390/dark, rigid-body-collisions/320/light, rigid-body-collisions/320/dark
- **pageErrorCells: 0 cells.** 
- **overflow: 42 cells.** covid-19/1400/light, covid-19/1400/dark, covid-19/390/light, train-test-validation/390/light, covid-19/390/dark, train-test-validation/390/dark, remember/320/light, coming-out-simulator-2014/320/light, covid-19/320/light, exponentiation/320/light, public-private-keys/320/light, zero-knowledge-proof-demo/320/light, reading-qr-codes-without-a-computer/320/light, ableton-learning-synths-get-started/320/light, ableton-learning-synths-how-synths-make-sound/320/light, ableton-learning-synths-filter-resonance/320/light, ableton-learning-synths-modulating-amplitude-with-envelopes/320/light, ableton-learning-synths-matching-envelopes/320/light; remaining exact cells in JSON
- **missingVisiblePrimary: 6 cells.** musicmap/1400/light, musicmap/1400/dark, musicmap/390/light, musicmap/390/dark, musicmap/320/light, musicmap/320/dark
- **missingVisibleContinuation: 9 cells.** anxiety/1400/light, anxiety/1400/dark, anxiety/390/light, ableton-learning-music-play-with-chords/390/light, anxiety/390/dark, ableton-learning-music-play-with-melodies/390/dark, anxiety/320/light, ableton-learning-music-play-with-chords/320/light, anxiety/320/dark
- **storedThemeMismatch: 0 cells.** 
- **unexpectedNetworkFailureCells: 6 cells.** markov-chains/1400/light, markov-chains/1400/dark, markov-chains/390/light, markov-chains/390/dark, markov-chains/320/light, markov-chains/320/dark
- **externalInterventionCells: 0 cells.** 
- **consoleErrorCells: 6 cells.** rigid-body-collisions/1400/light, rigid-body-collisions/1400/dark, rigid-body-collisions/390/light, rigid-body-collisions/390/dark, rigid-body-collisions/320/light, rigid-body-collisions/320/dark
- **missingVisibleMain: 14 cells.** loopy/1400/light, sim/1400/light, musicmap/1400/light, loopy/1400/dark, sim/1400/dark, musicmap/1400/dark, loopy/390/light, musicmap/390/light, loopy/390/dark, musicmap/390/dark, loopy/320/light, musicmap/320/light, loopy/320/dark, musicmap/320/dark

### Triage interpretation grounded in the captured values

1. **Narrow-layout risk, high measurement confidence:** overflow reaches 68px at 320px on six Ableton synths routes in both themes. Other clear cases include `coming-out-simulator-2014` (40px), `reading-qr-codes-without-a-computer` (34px), `exponentiation` (29px), and `remember` (28px). Investigate these before the 2px rounding-scale cases. The 42-cell count is not 42 unique Routes.
2. **Primary surface, medium functional confidence:** `musicmap` has no visible declared primary surface in all six cells. Loading/compiled-runtime state may explain this; passive capture cannot certify it unusable.
3. **Continuation, medium confidence:** `anxiety` lacks visible continuation in all six cells; three additional Ableton music cells lack it. Delayed mount is plausible for the inconsistent Ableton captures; verify after runtime readiness before treating as permanent absence.
4. **Low-severity subpath asset defect, high confidence:** all six `rigid-body-collisions` local HTTP failures are `/favicon.png`, rejected with 403 because it is outside the required mount. These are not six failed lesson assets or navigation failures.
5. **Embedded navigation signal, unresolved:** `markov-chains` records a failed local request to `/interactive-explanation/markov-chains/playground/` in all six cells. The redacted error category is `other`; cancellation versus genuine child failure is not established. Child interaction remains blocked coverage.

No navigation errors, page exceptions, stored-theme attribute mismatches, or external-request interventions were observed. This does not prove semantic theme parity, successful child states, or absence of requests after capture. Generic main absence is not automatically a defect when the manifest declares a different primary selector, as with `loopy`.

## Actual desktop-light repetitions

```json
{
  "atlas": {
    "capturedSamples": 3,
    "domContentLoadedEventEndMs": {
      "count": 3,
      "median": 43.09999996423721,
      "min": 42.60000002384186,
      "max": 117.10000002384186
    },
    "captureTimeMs": {
      "count": 3,
      "median": 255,
      "min": 250.60000002384186,
      "max": 397.9000000357628
    }
  },
  "bias-variance": {
    "capturedSamples": 3,
    "domContentLoadedEventEndMs": {
      "count": 3,
      "median": 173.19999998807907,
      "min": 157.60000002384186,
      "max": 303.7000000476837
    },
    "captureTimeMs": {
      "count": 3,
      "median": 391.0999999642372,
      "min": 378.5,
      "max": 528.3000000119209
    }
  },
  "blockchain": {
    "capturedSamples": 3,
    "domContentLoadedEventEndMs": {
      "count": 3,
      "median": 76,
      "min": 46.80000001192093,
      "max": 104
    },
    "captureTimeMs": {
      "count": 3,
      "median": 302,
      "min": 282.9000000357628,
      "max": 355.9000000357628
    }
  },
  "teoria-interval-ear-training": {
    "capturedSamples": 3,
    "domContentLoadedEventEndMs": {
      "count": 3,
      "median": 84,
      "min": 74,
      "max": 159.0999999642372
    },
    "captureTimeMs": {
      "count": 3,
      "median": 540.8000000119209,
      "min": 531.9000000357628,
      "max": 781.5999999642372
    }
  },
  "formula-1-racing": {
    "capturedSamples": 3,
    "domContentLoadedEventEndMs": {
      "count": 3,
      "median": 87.40000003576279,
      "min": 54.40000003576279,
      "max": 175.30000001192093
    },
    "captureTimeMs": {
      "count": 3,
      "median": 311.4000000357628,
      "min": 275.60000002384186,
      "max": 423.9000000357628
    }
  }
}
```

## Route and declared component-role inventory

Atlas owns discovery/cards and shared navigation/theme. Routes declare family, shell variant, theme ownership, navigation, primary/runtime boundaries, interaction probe and continuation below. Shared measured roles additionally include main, footer, controls, headings, lesson sections, dialogs and runtime frames. Feedback/loading/recovery semantics are not inferred from counts. Opaque runtime ownership remains a separate boundary.

| Route | Family | Variant | Theme ownership | Navigation | Primary | Runtime | Interaction declaration | Continuation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| atlas | atlas | discovery | authored | discovery | main | undeclared | undeclared | not applicable |
| trust | ncase | essay | fixed-runtime | native | main | [data-runtime-main], main | read-only | polygons |
| polygons | ncase | essay | fixed-runtime | none | main | [data-runtime-main], main | read-only | ballot |
| ballot | ncase | essay | fixed-runtime | none | main | [data-runtime-main], main | read-only | crowds |
| crowds | ncase | essay | fixed-runtime | native | main | [data-runtime-main], main | read-only | loopy |
| loopy | ncase | essay | fixed-runtime | none | #sidebar | #canvasses | read-only | simulating |
| neurons | ncase | essay | fixed-runtime | native | main | [data-runtime-main], main | read-only | anxiety |
| remember | ncase | essay | fixed-runtime | generated | main | [data-runtime-main], main | read-only | primary-interactive-hub |
| anxiety | ncase | essay | fixed-runtime | none | #loading | [data-runtime-main], main | read-only | remember |
| wbwwb | ncase | essay | fixed-runtime | none | main | [data-runtime-main], main | read-only | crowds |
| coming-out-simulator-2014 | ncase | essay | fixed-runtime | none | main | [data-runtime-main], main | read-only | anxiety |
| covid-19 | ncase | essay | fixed-runtime | generated | main | [data-runtime-main], main | read-only | crowds |
| simulating | ncase | essay | fixed-runtime | native | main | [data-runtime-main], main | read-only | sim |
| sim | ncase | essay | fixed-runtime | none | main[data-runtime-main][aria-busy="false"] #editor_container | main[data-runtime-main][aria-busy="false"] #editor_container | read-only | primary-interactive-hub |
| decision-tree | mlu-pilot | essay | shell-only | generated | main | [data-runtime-main], main | read-only | random-forest |
| random-forest | mlu-pilot | essay | shell-only | generated | main | [data-runtime-main], main | read-only | linear-regression |
| conditional-probability | ev-essay | essay | shell-only | generated | main | [data-runtime-main], main | read-only | logistic-regression |
| markov-chains | ev-essay | essay | shell-only | generated | main | [data-runtime-main], main | read-only | eigenvectors-and-eigenvalues |
| principal-component-analysis | ev-essay | essay | shell-only | generated | main | [data-runtime-main], main | read-only | eigenvectors-and-eigenvalues |
| exponentiation | ev-essay | essay | shell-only | generated | main | [data-runtime-main], main | read-only | conditional-probability |
| pi | ev-essay | essay | shell-only | generated | main | [data-runtime-main], main | read-only | sine-and-cosine |
| sine-and-cosine | ev-essay | essay | shell-only | generated | main | [data-runtime-main], main | read-only | eigenvectors-and-eigenvalues |
| eigenvectors-and-eigenvalues | ev-essay | essay | shell-only | generated | main | [data-runtime-main], main | read-only | tesseract |
| image-kernels | ev-essay | essay | shell-only | generated | main | [data-runtime-main], main | read-only | alpha-compositing |
| ordinary-least-squares-regression | ev-essay | essay | shell-only | generated | main | [data-runtime-main], main | read-only | linear-regression |
| blockchain | anders-lab | lab | runtime-hook | native | main | [data-runtime-main], main | read-only | public-private-keys |
| public-private-keys | anders-lab | lab | runtime-hook | native | main | [data-runtime-main], main | read-only | zero-knowledge-proof-demo |
| zero-knowledge-proof-demo | anders-lab | lab | runtime-hook | none | main | [data-runtime-main], main | read-only | blockchain-101-combined-flow |
| alpha-compositing | engineering-longform | essay | shell-only | generated | main | [data-runtime-main], main | read-only | color-spaces |
| color-spaces | engineering-longform | essay | shell-only | generated | main | [data-runtime-main], main | read-only | lights-and-shadows |
| sound | engineering-longform | essay | shell-only | generated | main | [data-runtime-main], main | read-only | ableton-learning-synths-get-started |
| cameras-and-lenses | engineering-longform | essay | shell-only | generated | main | [data-runtime-main], main | read-only | lights-and-shadows |
| lights-and-shadows | engineering-longform | essay | shell-only | generated | main | [data-runtime-main], main | read-only | primary-interactive-hub |
| tesseract | engineering-longform | essay | shell-only | generated | main | [data-runtime-main], main | read-only | curves-and-surfaces |
| gears | engineering-longform | essay | shell-only | generated | main | [data-runtime-main], main | read-only | bicycle |
| gps | engineering-longform | essay | shell-only | generated | main | [data-runtime-main], main | read-only | stargazing-dashboard |
| earth-and-sun | engineering-longform | essay | shell-only | generated | main | [data-runtime-main], main | read-only | stargazing-dashboard |
| bicycle | engineering-longform | essay | shell-only | generated | main | [data-runtime-main], main | read-only | airfoil |
| airfoil | engineering-longform | essay | shell-only | generated | main | [data-runtime-main], main | read-only | formula-1-racing |
| curves-and-surfaces | engineering-longform | essay | shell-only | generated | main | [data-runtime-main], main | read-only | image-kernels |
| internal-combustion-engine | engineering-longform | essay | shell-only | generated | main | [data-runtime-main], main | read-only | gears |
| mechanical-watch | engineering-longform | essay | shell-only | generated | main | [data-runtime-main], main | read-only | interactive-mechanical-watch |
| naval-architecture | engineering-longform | essay | shell-only | generated | main | [data-runtime-main], main | read-only | airfoil |
| formula-1-racing | runtime | essay | shell-only | generated | main | [data-runtime-main], main | read-only | stargazing-dashboard |
| interactive-mechanical-watch | runtime | essay | shell-only | generated | main | [data-runtime-main], main | read-only | watch-mesh-explorer |
| reading-qr-codes-without-a-computer | runtime | essay | fixed-runtime | none | main | [data-runtime-main], main | read-only | blockchain |
| teoria-interval-ear-training | teoria-practice | practice | runtime-hook | none | main | [data-runtime-main], main | read-only | ableton-learning-music-play-with-beats |
| teoria-note-ear-training | teoria-practice | practice | runtime-hook | none | main | [data-runtime-main], main | read-only | teoria-key-and-note-ear-training |
| teoria-key-and-note-ear-training | teoria-practice | practice | runtime-hook | none | main | [data-runtime-main], main | read-only | teoria-random-key-and-note-ear-training |
| teoria-random-key-and-note-ear-training | teoria-practice | practice | runtime-hook | none | main | [data-runtime-main], main | read-only | teoria-scale-construction |
| teoria-scale-construction | teoria-practice | practice | runtime-hook | none | main | [data-runtime-main], main | read-only | teoria-interval-identification-and-inversion |
| teoria-interval-identification-and-inversion | teoria-practice | practice | runtime-hook | none | main | [data-runtime-main], main | read-only | ableton-learning-music-play-with-beats |
| ableton-learning-music-playground | ableton-practice | practice | runtime-hook | none | main | [data-runtime-main], main | read-only | ableton-learning-synths-get-started |
| ableton-learning-music-play-with-beats | ableton-practice | practice | runtime-hook | none | main | [data-runtime-main], main | read-only | ableton-learning-music-playground |
| ableton-learning-music-play-with-notes-and-scales | ableton-practice | practice | runtime-hook | none | main | [data-runtime-main], main | read-only | ableton-learning-music-play-with-chords |
| ableton-learning-music-play-with-chords | ableton-practice | practice | runtime-hook | none | main | [data-runtime-main], main | read-only | ableton-learning-music-play-with-basslines |
| ableton-learning-music-play-with-basslines | ableton-practice | practice | runtime-hook | none | main | [data-runtime-main], main | read-only | ableton-learning-music-play-with-melodies |
| ableton-learning-music-play-with-melodies | ableton-practice | practice | runtime-hook | none | main | [data-runtime-main], main | read-only | ableton-learning-music-play-with-song-structures |
| ableton-learning-music-play-with-song-structures | ableton-practice | practice | runtime-hook | none | main | [data-runtime-main], main | read-only | chrome-music-lab-song-maker |
| ableton-learning-synths-get-started | ableton-synths | lab | runtime-hook | native | main | [data-runtime-main], main | read-only | musicmap |
| ableton-learning-synths-how-synths-make-sound | ableton-synths | lab | runtime-hook | native | main | [data-runtime-main], main | read-only | ableton-learning-synths-filter-resonance |
| ableton-learning-synths-filter-resonance | ableton-synths | lab | runtime-hook | native | main | [data-runtime-main], main | read-only | ableton-learning-synths-modulating-amplitude-with-envelopes |
| ableton-learning-synths-modulating-amplitude-with-envelopes | ableton-synths | lab | runtime-hook | native | main | [data-runtime-main], main | read-only | ableton-learning-synths-matching-envelopes |
| ableton-learning-synths-matching-envelopes | ableton-synths | lab | runtime-hook | native | main | [data-runtime-main], main | read-only | ableton-learning-synths-recipes |
| ableton-learning-synths-recipes | ableton-synths | lab | runtime-hook | native | main | [data-runtime-main], main | read-only | musicmap |
| chrome-music-lab-song-maker | runtime | essay | fixed-runtime | none | main | [data-runtime-main], main | read-only | music-interactive-hub |
| musicmap | runtime | essay | fixed-runtime | none | #genres | #genres | read-only | music-interactive-hub |
| music-interactive-hub | local-hub | essay | shell-only | generated | main | [data-runtime-main], main | read-only | teoria-interval-ear-training |
| linear-regression | mlu-pilot | essay | shell-only | generated | main | [data-runtime-main], main | read-only | logistic-regression |
| logistic-regression | mlu-pilot | essay | shell-only | generated | main | [data-runtime-main], main | read-only | train-test-validation |
| precision-recall | mlu-pilot | essay | shell-only | generated | main | [data-runtime-main], main | read-only | roc-auc |
| roc-auc | mlu-pilot | essay | shell-only | generated | main | [data-runtime-main], main | read-only | bias-variance |
| bias-variance | mlu-pilot | essay | shell-only | generated | main | [data-runtime-main], main | read-only | double-descent |
| train-test-validation | mlu-pilot | essay | shell-only | native | main | [data-runtime-main], main | read-only | precision-recall |
| double-descent | mlu-pilot | essay | shell-only | generated | main | [data-runtime-main], main | read-only | double-descent2 |
| double-descent2 | mlu-pilot | essay | shell-only | generated | main | [data-runtime-main], main | read-only | decision-tree |
| memory-allocation | samwho-essay | essay | runtime-hook | generated | main | [data-runtime-main], main | read-only | load-balancing |
| load-balancing | samwho-essay | essay | runtime-hook | generated | main | [data-runtime-main], main | read-only | primary-interactive-hub |
| hysteresis-slack | systems-essay | essay | shell-only | generated | main | [data-runtime-main], main | read-only | rigid-body-collisions |
| rigid-body-collisions | systems-essay | essay | shell-only | generated | main | [data-runtime-main], main | read-only | bicycle |
| blockchain-101-combined-flow | anders-lab | lab | shell-only | none | main | [data-runtime-main], main | read-only | primary-interactive-hub |
| primary-interactive-hub | local-hub | essay | shell-only | generated | main | [data-runtime-main], main | read-only | trust |
| stargazing-dashboard | runtime | lab | fixed-runtime | none | main | [data-runtime-main], main | read-only | primary-interactive-hub |
| watch-mesh-explorer | runtime | lab | fixed-runtime | native | main | [data-runtime-main], main | read-only | primary-interactive-hub |
