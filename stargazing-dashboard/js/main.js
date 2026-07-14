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

  function attachResize(scene, canvas) {
    if (typeof window === "undefined") {
      return;
    }
    if (!scene || typeof scene.resize !== "function") {
      return;
    }

    var pending = false;
    function scheduleResize() {
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
    }

    window.addEventListener("resize", scheduleResize);

    // The stage can grow taller than the viewport after layout settles, which
    // fires no window resize event and leaves the WebGL buffer at a stale size.
    if (canvas && typeof window.ResizeObserver === "function") {
      new window.ResizeObserver(scheduleResize).observe(canvas);
    }
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

    return {
      altDeg: Number(horizontal.altDeg),
      azDeg: Number(horizontal.azDeg),
      raHours: Number(equatorial.raHours),
      decDeg: Number(equatorial.decDeg),
    };
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

  function displayNameForTarget(id) {
    for (var i = 0; i < GUIDED_TARGETS.length; i += 1) {
      if (GUIDED_TARGETS[i].id === id) {
        return GUIDED_TARGETS[i].label;
      }
    }
    return id || "Selected object";
  }

  function formatDetailNumber(value, digits) {
    var numberValue = Number(value);
    return isFinite(numberValue) ? numberValue.toFixed(digits) : "unavailable";
  }

  function pad2(value) {
    return value < 10 ? "0" + value : String(value);
  }

  function hasCoordinates(details) {
    return details
      && details.ra !== null
      && details.ra !== undefined
      && details.dec !== null
      && details.dec !== undefined
      && isFinite(Number(details.ra))
      && isFinite(Number(details.dec));
  }

  function formatRightAscension(value) {
    var wrapped = ((Number(value) % 24) + 24) % 24;
    var totalMinutes = Math.round(wrapped * 60) % (24 * 60);
    var hours = Math.floor(totalMinutes / 60);
    var minutes = totalMinutes % 60;
    return pad2(hours) + "h " + pad2(minutes) + "m";
  }

  function formatDeclination(value) {
    var dec = Number(value);
    var sign = dec < 0 ? "-" : "+";
    var totalMinutes = Math.round(Math.abs(dec) * 60);
    var degrees = Math.floor(totalMinutes / 60);
    var minutes = totalMinutes % 60;
    return sign + pad2(degrees) + "\u00B0 " + pad2(minutes) + "'";
  }

  function formatCoordinates(details) {
    if (!hasCoordinates(details)) {
      return "RA --h --m / Dec --\u00B0 --'";
    }
    return formatRightAscension(details.ra) + " / " + formatDeclination(details.dec);
  }

  function openDetails(details) {
    if (typeof document === "undefined") {
      return;
    }

    var panel = document.getElementById("object-details");
    if (!panel) {
      return;
    }

    var title = document.getElementById("object-details-title");
    var name = details && details.name ? details.name : "Selected object";
    if (title) {
      title.textContent = name;
    }

    var summary = document.getElementById("object-details-summary");
    if (summary) {
      var magnitude = details && details.magnitude !== null && details.magnitude !== undefined
        ? ", mag " + formatDetailNumber(details.magnitude, 1)
        : "";
      summary.textContent = name + magnitude
        + ": altitude " + formatDetailNumber(details && details.altitude, 1) + "\u00B0, azimuth "
        + formatDetailNumber(details && details.azimuth, 1) + "\u00B0."
        + ((details && Number(details.altitude) >= 0) ? " Above the local horizon." : " Below the local horizon.");
    }

    var coords = document.getElementById("object-details-coords");
    if (coords) {
      coords.textContent = formatCoordinates(details);
      coords.hidden = !hasCoordinates(details);
    }

    panel.dataset.open = "true";
    panel.hidden = false;
  }

  function closeDetails() {
    if (typeof document === "undefined") {
      return;
    }
    var panel = document.getElementById("object-details");
    if (panel) {
      panel.dataset.open = "false";
      panel.hidden = true;
    }
  }

  function targetDetails(state, astro, id) {
    var target = resolveLookTarget(state, astro, id);
    if (!target) {
      return null;
    }
    return {
      type: "guided-target",
      id: id,
      name: displayNameForTarget(id),
      magnitude: null,
      ra: target.raHours,
      dec: target.decDeg,
      altitude: target.altDeg,
      azimuth: target.azDeg,
    };
  }

  function selectTargetAndOpenDetails(state, astro, id) {
    selectTarget(state, astro, id);
    var details = targetDetails(state, astro, id);
    if (details) {
      openDetails(details);
    }
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
        selectTargetAndOpenDetails(state, astro, entry.id);
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

  function isTypingTarget(target) {
    if (!target || !target.tagName) {
      return false;
    }
    var tagName = String(target.tagName).toLowerCase();
    return tagName === "input" || tagName === "select" || tagName === "textarea" || Boolean(target.isContentEditable);
  }

  function attachShortcutHelp() {
    if (typeof document === "undefined") {
      return;
    }

    var toggle = document.getElementById("shortcut-toggle");
    var help = document.getElementById("shortcut-help");
    if (!toggle || !help) {
      return;
    }

    function setOpen(open) {
      help.hidden = !open;
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    }

    toggle.addEventListener("click", function () {
      setOpen(help.hidden);
    });
  }

  function highestVisibleGuidedTarget(state, astro) {
    var best = null;
    GUIDED_TARGETS.forEach(function (entry) {
      var target = resolveLookTarget(state, astro, entry.id);
      if (!target || target.altDeg < 0) {
        return;
      }
      if (!best || target.altDeg > best.altDeg) {
        best = { id: entry.id, altDeg: target.altDeg };
      }
    });
    return best ? best.id : null;
  }

  function attachTonightButton(state, astro) {
    if (typeof document === "undefined") {
      return;
    }
    var button = document.getElementById("tonight-button");
    if (!button) {
      return;
    }
    button.addEventListener("click", function () {
      if (state && typeof state.setState === "function") {
        try {
          state.setState({ time: { utcMs: Date.now(), playing: false } });
        } catch (error) {
          void error;
        }
      }
      var targetId = highestVisibleGuidedTarget(state, astro) || "moon";
      selectTargetAndOpenDetails(state, astro, targetId);
    });
  }

  function attachDetailsClose() {
    if (typeof document === "undefined") {
      return;
    }
    var button = document.getElementById("details-close");
    if (button) {
      button.addEventListener("click", closeDetails);
    }
  }

  function toggleStateKey(state, group, key) {
    if (!state || typeof state.getState !== "function" || typeof state.setState !== "function") {
      return;
    }
    try {
      var snapshot = state.getState();
      var groupState = snapshot && snapshot[group] ? snapshot[group] : {};
      var patch = {};
      patch[group] = {};
      patch[group][key] = !Boolean(groupState[key]);
      state.setState(patch);
    } catch (error) {
      void error;
    }
  }

  function resetLook(state) {
    if (state && typeof state.setState === "function") {
      try {
        state.setState({ look: { azDeg: 0, altDeg: 30 } });
      } catch (error) {
        void error;
      }
    }
  }

  function togglePlay(state) {
    if (!state || typeof state.getState !== "function" || typeof state.setState !== "function") {
      return;
    }
    try {
      var snapshot = state.getState();
      var playing = !(snapshot && snapshot.time && snapshot.time.playing);
      state.setState({ time: { playing: playing } });
    } catch (error) {
      void error;
    }
  }

  function attachGlobalShortcuts(state) {
    if (typeof document === "undefined") {
      return;
    }

    document.addEventListener("keydown", function (event) {
      if (isTypingTarget(event.target)) {
        return;
      }

      var key = event.key;
      if (key === "Escape") {
        closeDetails();
        var toggle = document.getElementById("shortcut-toggle");
        var help = document.getElementById("shortcut-help");
        if (help && !help.hidden) {
          help.hidden = true;
          if (toggle) {
            toggle.setAttribute("aria-expanded", "false");
          }
        }
        return;
      }

      if (key === "?") {
        var helpToggle = document.getElementById("shortcut-toggle");
        if (helpToggle && typeof helpToggle.click === "function") {
          event.preventDefault();
          helpToggle.click();
        }
        return;
      }

      var normalized = String(key || "").toLowerCase();
      if (normalized === "t") {
        event.preventDefault();
        togglePlay(state);
      } else if (normalized === "l") {
        event.preventDefault();
        toggleStateKey(state, "toggles", "labels");
      } else if (normalized === "c") {
        event.preventDefault();
        toggleStateKey(state, "toggles", "constellations");
      } else if (normalized === "r") {
        event.preventDefault();
        resetLook(state);
      }
    });
  }

  // #sky-tooltip canvas hover — shows hover target info on mousemove over the
  // sky canvas, hides on mouseleave. Uses the same pickObjectAt scene query as
  // the click handler, but only sets the tooltip text (does not open details).
  // The tooltip is positioned at the canvas hover point.
  function attachTooltipHover(canvas, tooltip, scene) {
    if (!canvas || !tooltip || typeof tooltip !== "object") {
      return;
    }
    if (!scene || typeof scene.pickObjectAt !== "function") {
      return;
    }

    function getTooltipText(details) {
      if (!details) {
        return "";
      }
      var name = details.name || details.id || "Object";
      var parts = [name];
      if (details.magnitude !== null && details.magnitude !== undefined) {
        parts.push("mag " + Number(details.magnitude).toFixed(1));
      }
      if (details.altitude !== null && details.altitude !== undefined) {
        var alt = Number(details.altitude);
        parts.push((alt >= 0 ? "+" : "") + alt.toFixed(1) + "°");
      }
      if (details.azimuth !== null && details.azimuth !== undefined) {
        parts.push("az " + Number(details.azimuth).toFixed(1) + "°");
      }
      return parts.join(" · ");
    }

    var hoverFrame = null;
    var hoverPoint = null;

    function renderHover() {
      hoverFrame = null;
      if (!hoverPoint) {
        return;
      }
      var clientX = hoverPoint.clientX;
      var clientY = hoverPoint.clientY;
      var details = scene.pickObjectAt(clientX, clientY);
      tooltip.textContent = details
        ? getTooltipText(details)
        : "Select a target or point at a star to see details";
      tooltip.hidden = false;
      tooltip.style.left = Math.max(8, Math.min(clientX + 12, window.innerWidth - 320)) + "px";
      tooltip.style.top = Math.max(8, Math.min(clientY + 8, window.innerHeight - 80)) + "px";
    }

    canvas.addEventListener("mousemove", function (event) {
      hoverPoint = { clientX: event.clientX, clientY: event.clientY };
      if (hoverFrame === null) {
        hoverFrame = window.requestAnimationFrame(renderHover);
      }
    });

    canvas.addEventListener("mouseleave", function () {
      hoverPoint = null;
      if (hoverFrame !== null) {
        window.cancelAnimationFrame(hoverFrame);
        hoverFrame = null;
      }
      tooltip.hidden = true;
      tooltip.textContent = "";
    });
  }

  function attachScenePicking(canvas, scene, state) {
    if (!canvas || !scene || typeof scene.pickObjectAt !== "function") {
      return;
    }
    canvas.addEventListener("click", function (event) {
      var details = scene.pickObjectAt(event.clientX, event.clientY);
      if (!details) {
        return;
      }
      if (state && typeof state.setState === "function") {
        try {
          state.setState({ selectedTargetId: details.id });
        } catch (error) {
          void error;
        }
      }
      openDetails(details);
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
    var sceneStarted = false;
    if (window.StargazingScene && typeof window.StargazingScene.createScene === "function") {
      scene = window.StargazingScene.createScene({ canvas: canvas, state: state, catalog: catalog, astro: astro });
      if (scene && typeof scene.start === "function") {
        sceneStarted = scene.start() === true;
      }
    }

    if (!sceneStarted) {
      revealFallback();
      return;
    }

    // Base epoch captured once; the scrub maps a 48h window around it.
    var baseUtcMs = Date.now();

    attachResize(scene, canvas);
    attachTimeScrub(state, baseUtcMs);
    attachTargetPicker(state, astro);
    attachManualLookGuard(canvas);
    attachTonightButton(state, astro);
    attachShortcutHelp();
    attachDetailsClose();
    attachGlobalShortcuts(state);
    attachScenePicking(canvas, scene, state);
    attachTooltipHover(canvas, document.getElementById("sky-tooltip"), scene);

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
