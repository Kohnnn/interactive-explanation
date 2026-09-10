# Research 54: Musicmap request handoff

Source base: `18f4c740e90a298a4259bcd24d89f2a1cd21a2b0`. CI run `34410777051` passed strict59 and 504/504 geometry cells, then full83 failed at `smokeMusicmap` with opaque `requestfailed: r23 f2 unknown-failure`. The retained CI journal did not include the failed request URL, type, navigation state, or browser error in its assertion.

The runtime monitor now reports request ID, frame ID, resource type, navigation/child-frame state, browser error, and credential-safe origin/path. `resourceUrl` strips URL userinfo, query, and fragment; non-HTTP URLs remain redacted. Unknown failures still fail.

The exact focused smoke against the CI-emitted `geometry.json` reproduced `r23 f2`: a child-document `net::ERR_ABORTED` for `https://www.youtube-nocookie.com/embed/videoseries`. The smoke created YouTube, then removed/replaced its still-navigating iframe to test Spotify. That test-authored replacement aborted the YouTube document or its in-flight subresources. It was not an authored Musicmap request failure.

The validated handoff uses independent pages for YouTube and Spotify. Each page performs the real search and genre interaction, clicks the authored deferred action, validates the exact iframe `src`, obtains the actual child frame, and waits for its document to reach `domcontentloaded`. No live embed is replaced. Completed embeds exposed their exact required child dependencies, now locked in the manifest: YouTube adds `fonts.gstatic.com` and `www.google.com`; Spotify adds `mosaic.scdn.co`, `encore.scdn.co`, and `o22381.ingest.us.sentry.io`. Blob requests qualify only when their creator origin is local or belongs to the action's exact approved hosts.

A live YouTube embed can independently abort only `https://www.youtube-nocookie.com/api/stats/qoe` as a child-frame non-navigation fetch with `net::ERR_ABORTED`. It qualifies only after a later same-frame validation proves the exact YouTube embed document remains connected. Wrong URL, error, resource type, navigation state, frame, ordering, or disconnected state remains `unknown-failure` and fails.

## Verification

- Focused negative tests cover safe diagnostics, query/userinfo/fragment omission, local and approved-origin blobs, foreign blobs, exact Musicmap host contracts, exact QoE cancellation, and eight malformed/stale QoE variants.
- Focused smoke command: `node tools/smoke-bundle.mjs . --skip-performance --baseline /tmp/opencode/w0-ci-latest-18f4/paired-qualification-34410777051-1/geometry.json --route musicmap`.
- Five sequential focused runs passed. Every run exercised all six Musicmap theme/viewport experience cells plus search, genre selection, zoom, YouTube navigation, Spotify navigation, responsive shell, and runtime/network assertions.
- Local Chromium/OS/Node differ from CI run `34410777051`; the CI-emitted geometry baseline made the focused run locally comparable at the checked geometry contract, but this is not same-runner CI qualification.
