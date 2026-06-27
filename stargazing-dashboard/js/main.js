/*
 * Stargazing Dashboard bootstrap and final wiring layer.
 *
 * Contract: on DOMContentLoaded, guard WebGL, then set
 * document.body.dataset.stargazingReady to "true" for the success path or
 * "fallback" when WebGL/canvas is unavailable.
 *
 * Division of labor (see sibling modules; do NOT duplicate their work):
 *   - scene.js owns the render loop, state.tick(), and the camera.
 *   - hud.js owns telemetry panels and the lat/lon/speed/play/now/weather/toggle
 *     controls, plus catalog self-loading.
 *   - controls.js owns pointer/keyboard look (writes state.look.azDeg/altDeg).
 *
 * Therefore this file owns only the four remaining wiring responsibilities:
 *   1. Window resize -> scene.resize() (rAF-coalesced).
 *   2. #time-scrub range input -> time offset (48h window, pauses playback).
 *   3. Guided-navigation target buttons injected into #hud-targets.
 *   4. Slerp animation of state.look toward a selected target.
 *
 * It never ticks time, touches the camera/renderer, re-binds hud-owned controls,
 * or loads the catalog. Every external access is guarded so the page degrades
 * rather than throwing.
 */
(function () {
  "use strict";

  var MS_PER_HOUR = 60 * 60 * 1000;
  var SCRUB_WINDOW_HOURS = 24; // value 0 -> -24h, value 100 -> +24h (48h window).
  var SCRUB_DEFAULT = 50;
  var SLERP_DURATION_MS = 800;

  // Guided-navigation targets. Planet ids are lowercase names matching
  // astro.planetPosition(name, jd). Sun/Moon resolve via dedicated helpers.
  var GUIDED_TARGETS = [
    { id: "sun", label: "Sun" },
    { id: "moon", label: "Moon" },
    { id: "mercury", label: "Mercury" },
    { id: "venus", label: "Venus" },
    { id: "mars", label: "Mars" },
    { id: "jupiter", label: "Jupiter" },
    { id: "saturn", label: "Saturn" },
  ];

  // Module-level slerp handle so a new selection or a manual drag cancels any
  // in-flight look animation.
  var activeSlerpHandle = null;

  // --- Pure helpers (exported for verification) -------------------------------

  // Map a 0..100 scrub value to a UTC epoch within a 48h window centered on base.
  function scrubValueToUtcMs(value, baseUtcMs) {
    var safeValue = Number(value);
    if (!isFinite(safeValue)) {
      safeValue = SCRUB_DEFAULT;
    }
    return baseUtcMs + ((safeValue - SCRUB_DEFAULT) / SCRUB_DEFAULT) * SCRUB_WINDOW_HOURS * MS_PER_HOUR;
  }

  // Shortest signed angular delta (degrees) from startAz to targetAz, in [-180, 180).
  function shortestAzDelta(startAz, targetAz) {
    return ((targetAz - startAz + 540) % 360) - 180;
  }

  // Wrap an azimuth into [0, 360).
  function wrapAz(deg) {
    var wrapped = deg % 360;
    return wrapped < 0 ? wrapped + 360 : wrapped;
  }

  function clampAlt(deg) {
    return Math.min(90, Math.max(-90, deg));
  }

  // Ease-in-out cubic.
  function easeInOut(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  // --- DOM / fallback ---------------------------------------------------------

  function revealFallback() {
    if (typeof document === "undefined") {
      return;
    }

    if (document.body) {
      document.body.dataset.stargazingReady = "fallback";
    }

    var fallback = document.getElementById("stargazing-fallback");
    if (fallback) {
      fallback.hidden = false;
    }
  }

  function hasWebGL(canvas) {
    if (!canvas || typeof canvas.getContext !== "function") {
      return false;
    }

    try {
      return Boolean(canvas.getContext("webgl") || canvas.getContext("experimental-webgl"));
    } catch (error) {
      void error;
      return false;
    }
  }

  // --- Resize wiring ----------------------------------------------------------

  function attachResize(scene) {
    if (typeof window === "undefined") {
      return;
    }
    if (!scene || typeof scene.resize !== "function") {
      return;
    }

    var pending = false;
    window.addEventListener("resize", function handleResize() {
      // Coalesce bursts of resize events into a single rAF-driven resize.
      if (pending) {
        return;
      }
      pending = true;
      window.requestAnimationFrame(function () {
        pending = false;
        try {
          scene.resize();
        } catch (error) {
          void error;
        }
      });
    });
  }

  // --- Time scrub wiring ------------------------------------------------------

  function attachTimeScrub(state, baseUtcMs) {
    if (typeof document === "undefined") {
      return;
    }
    if (!state || typeof state.setState !== "function") {
      return;
    }

    var scrub = document.getElementById("time-scrub");
    if (!scrub || typeof scrub.addEventListener !== "function") {
      return;
    }

    scrub.addEventListener("input", function handleScrub() {
      var utcMs = scrubValueToUtcMs(scrub.value, baseUtcMs);
      // Pause playback so the scrubbed instant stays stable while dragging.
      try {
        state.setState({ time: { utcMs: utcMs, playing: false } });
      } catch (error) {
        void error;
      }
    });
  }

  // --- Guided-navigation target picker + slerp --------------------------------

  // Resolve a target id to equatorial coordinates for the given Julian date.
  // Returns { raHours, decDeg } or null when the target cannot be resolved.
  function resolveEquatorial(astro, id, jd) {
    try {
      if (id === "sun") {
        if (typeof astro.sunPosition !== "function") {
          return null;
        }
        return astro.sunPosition(jd);
      }
      if (id === "moon") {
        if (typeof astro.moonPosition !== "function") {
          return null;
        }
        return astro.moonPosition(jd);
      }
      if (typeof astro.planetPosition !== "function") {
        return null;
      }
      return astro.planetPosition(id, jd);
    } catch (error) {
      void error;
      return null;
    }
  }

  // Compute the horizontal {altDeg, azDeg} target for a guided id, or null.
  function resolveLookTarget(state, astro, id) {
    if (!state || typeof state.getState !== "function" || !astro) {
      return null;
    }
    if (typeof astro.julianDate !== "function" || typeof astro.equatorialToHorizontal !== "function") {
      return null;
    }

    var snapshot;
    try {
      snapshot = state.getState();
    } catch (error) {
      void error;
      return null;
    }
    if (!snapshot || !snapshot.time || !snapshot.observer) {
      return null;
    }

    var utcMs = Number(snapshot.time.utcMs);
    var latDeg = Number(snapshot.observer.latDeg);
    var lonDeg = Number(snapshot.observer.lonDeg);
    if (!isFinite(utcMs) || !isFinite(latDeg) || !isFinite(lonDeg)) {
      return null;
    }

    var jd;
    try {
      jd = astro.julianDate(new Date(utcMs));
    } catch (error) {
      void error;
      return null;
    }

    var equatorial = resolveEquatorial(astro, id, jd);
    if (!equatorial || !isFinite(Number(equatorial.raHours)) || !isFinite(Number(equatorial.decDeg))) {
      return null;
    }

    var horizontal;
    try {
      horizontal = astro.equatorialToHorizontal(
        { raHours: equatorial.raHours, decDeg: equatorial.decDeg },
        { latDeg: latDeg, lonDeg: lonDeg },
        jd
      );
    } catch (error) {
      void error;
      return null;
    }

    if (!horizontal || !isFinite(Number(horizontal.altDeg)) || !isFinite(Number(horizontal.azDeg))) {
      return null;
    }

    return { altDeg: Number(horizontal.altDeg), azDeg: Number(horizontal.azDeg) };
  }

  function cancelSlerp() {
    if (activeSlerpHandle !== null && typeof window !== "undefined" && typeof window.cancelAnimationFrame === "function") {
      window.cancelAnimationFrame(activeSlerpHandle);
    }
    activeSlerpHandle = null;
  }

  // Animate state.look from its current value to {altDeg, azDeg} over ~800ms.
  function startSlerp(state, target) {
    if (typeof window === "undefined" || typeof window.requestAnimationFrame !== "function") {
      return;
    }
    if (!state || typeof state.setState !== "function" || typeof state.getState !== "function") {
      return;
    }

    cancelSlerp();

    var startSnapshot;
    try {
      startSnapshot = state.getState();
    } catch (error) {
      void error;
      return;
    }
    if (!startSnapshot || !startSnapshot.look) {
      return;
    }

    // Snapshot the start look once; do not re-read mid-animation.
    var startAz = Number(startSnapshot.look.azDeg);
    var startAlt = Number(startSnapshot.look.altDeg);
    if (!isFinite(startAz)) {
      startAz = 0;
    }
    if (!isFinite(startAlt)) {
      startAlt = 0;
    }

    var azDelta = shortestAzDelta(startAz, target.azDeg);
    var altDelta = target.altDeg - startAlt;
    var startTime = null;

    function step(timestamp) {
      if (startTime === null) {
        startTime = timestamp;
      }
      var elapsed = timestamp - startTime;
      var t = elapsed / SLERP_DURATION_MS;
      if (t > 1) {
        t = 1;
      }
      var eased = easeInOut(t);
      var az = wrapAz(startAz + azDelta * eased);
      var alt = clampAlt(startAlt + altDelta * eased);

      try {
        state.setState({ look: { azDeg: az, altDeg: alt } });
      } catch (error) {
        void error;
        activeSlerpHandle = null;
        return;
      }

      if (t < 1) {
        activeSlerpHandle = window.requestAnimationFrame(step);
      } else {
        activeSlerpHandle = null;
      }
    }

    activeSlerpHandle = window.requestAnimationFrame(step);
  }

  function selectTarget(state, astro, id) {
    if (state && typeof state.setState === "function") {
      try {
        state.setState({ selectedTargetId: id });
      } catch (error) {
        void error;
      }
    }

    var target = resolveLookTarget(state, astro, id);
    if (!target) {
      // Abort the slerp silently when the target cannot be resolved.
      return;
    }
    startSlerp(state, target);
  }

  // Inject the guided-navigation target buttons into #hud-targets.
  //
  // hud.js renders target text via renderLines("hud-targets", ...) which routes
  // through ensurePanelBody -> the single [data-hud-body] child, and clearBody
  // only resets that body element's textContent. Appending the picker as a
  // SEPARATE direct child of the #hud-targets section therefore survives every
  // hud re-render (hud never touches sibling nodes of [data-hud-body]).
  function attachTargetPicker(state, astro) {
    if (typeof document === "undefined") {
      return;
    }
    if (!state || typeof state.setState !== "function") {
      return;
    }

    var section = document.getElementById("hud-targets");
    if (!section) {
      return;
    }

    var picker = document.createElement("div");
    picker.setAttribute("data-stargazing-target-picker", "");

    GUIDED_TARGETS.forEach(function (entry) {
      var button = document.createElement("button");
      button.type = "button";
      button.setAttribute("data-target-id", entry.id);
      button.textContent = entry.label;
      button.addEventListener("click", function () {
        selectTarget(state, astro, entry.id);
      });
      picker.appendChild(button);
    });

    // Appended as the last child of the section, alongside (not inside) the
    // hud body, so renderLines/clearBody never wipe it.
    section.appendChild(picker);
  }

  // Cancel an in-flight slerp when the user starts dragging so manual look wins.
  function attachManualLookGuard(canvas) {
    if (!canvas || typeof canvas.addEventListener !== "function") {
      return;
    }
    canvas.addEventListener("pointerdown", function () {
      cancelSlerp();
    });
  }

  // --- Bootstrap --------------------------------------------------------------

  function bootstrap() {
    var canvas = document.getElementById("sky-canvas");

    if (!hasWebGL(canvas)) {
      revealFallback();
      return;
    }

    var state = window.StargazingState || null;
    var catalog = window.StargazingCatalog || null;
    var astro = window.StargazingAstro || null;

    if (window.StargazingControls && typeof window.StargazingControls.createLookControls === "function") {
      window.StargazingControls.createLookControls(canvas, state);
    }

    if (window.StargazingHud && typeof window.StargazingHud.createHud === "function") {
      window.StargazingHud.createHud({ state: state, catalog: catalog, astro: astro });
    }

    var scene = null;
    if (window.StargazingScene && typeof window.StargazingScene.createScene === "function") {
      scene = window.StargazingScene.createScene({ canvas: canvas, state: state, catalog: catalog, astro: astro });
      if (scene && typeof scene.start === "function") {
        scene.start();
      }
    }

    // Base epoch captured once; the scrub maps a 48h window around it.
    var baseUtcMs = Date.now();

    attachResize(scene);
    attachTimeScrub(state, baseUtcMs);
    attachTargetPicker(state, astro);
    attachManualLookGuard(canvas);

    document.body.dataset.stargazingReady = "true";
  }

  if (typeof document !== "undefined") {
    document.addEventListener("DOMContentLoaded", bootstrap);
  }

  // Dual-export shim for pure-helper verification in Node. DOM/bootstrap side
  // effects stay behind the DOMContentLoaded listener, so requiring this file
  // never runs the bootstrap.
  var API = {
    scrubValueToUtcMs: scrubValueToUtcMs,
    shortestAzDelta: shortestAzDelta,
    wrapAz: wrapAz,
    clampAlt: clampAlt,
    easeInOut: easeInOut,
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = API;
  }

  if (typeof window !== "undefined") {
    window.StargazingMain = API;
  }
}());
