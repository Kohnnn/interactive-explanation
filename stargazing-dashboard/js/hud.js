/*
 * StargazingHud telemetry overlay.
 * Public shape on window.StargazingHud:
 * createHud({ state, catalog, astro }) -> { update(), destroy() }.
 * Binds known DOM controls to shallow state keys and keeps all lookups guarded.
 */
(function () {
  "use strict";

  const COMPASS_POINTS = [
    "N",
    "NNE",
    "NE",
    "ENE",
    "E",
    "ESE",
    "SE",
    "SSE",
    "S",
    "SSW",
    "SW",
    "WSW",
    "W",
    "WNW",
    "NW",
    "NNW",
  ];

  function numberFromInput(input, fallback) {
    if (!input) {
      return fallback;
    }

    const value = Number(input.value);
    return Number.isFinite(value) ? value : fallback;
  }

  function numberOrFallback(value, fallback) {
    const numberValue = Number(value);
    return Number.isFinite(numberValue) ? numberValue : fallback;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function clamp01(value) {
    return clamp(numberOrFallback(value, 0), 0, 1);
  }

  function normalizeDegrees(value) {
    const degrees = numberOrFallback(value, 0) % 360;
    return degrees < 0 ? degrees + 360 : degrees;
  }

  function formatDegrees(value, digits) {
    return `${numberOrFallback(value, 0).toFixed(digits)}°`;
  }

  function formatLatitude(value) {
    const degrees = numberOrFallback(value, 0);
    const hemisphere = degrees < 0 ? "S" : "N";
    return `${Math.abs(degrees).toFixed(4)}° ${hemisphere}`;
  }

  function formatLongitude(value) {
    const degrees = numberOrFallback(value, 0);
    const hemisphere = degrees < 0 ? "W" : "E";
    return `${Math.abs(degrees).toFixed(4)}° ${hemisphere}`;
  }

  function formatPercent(value) {
    return `${Math.round(clamp01(value) * 100)}%`;
  }

  function formatSpeed(value) {
    const speed = numberOrFallback(value, 1);
    if (Number.isInteger(speed)) {
      return `${speed}x`;
    }

    return `${speed.toFixed(2)}x`;
  }

  function formatIsoSeconds(utcMs) {
    const date = new Date(numberOrFallback(utcMs, Date.now()));
    if (Number.isNaN(date.getTime())) {
      return "Invalid time";
    }

    return `${date.toISOString().split(".")[0]}Z`;
  }

  function formatLstHours(hours) {
    const safeHours = numberOrFallback(hours, 0);
    const normalized = ((safeHours % 24) + 24) % 24;
    const totalSeconds = Math.floor(normalized * 3600 + 0.5) % 86400;
    const hh = Math.floor(totalSeconds / 3600);
    const mm = Math.floor((totalSeconds % 3600) / 60);
    const ss = totalSeconds % 60;
    return [hh, mm, ss].map((part) => String(part).padStart(2, "0")).join(":");
  }

  function compassBearing(azDeg) {
    const normalized = normalizeDegrees(azDeg);
    const index = Math.round(normalized / 22.5) % COMPASS_POINTS.length;
    return COMPASS_POINTS[index];
  }

  function formatBearing(azDeg) {
    const normalized = normalizeDegrees(azDeg);
    return `${compassBearing(normalized)} (${normalized.toFixed(1)}°)`;
  }

  function cloudLabel(value) {
    const cloud = clamp01(value);
    if (cloud < 0.2) {
      return "clear";
    }
    if (cloud < 0.5) {
      return "scattered";
    }
    if (cloud < 0.8) {
      return "cloudy";
    }
    return "overcast";
  }

  function seeingLabel(value) {
    const seeing = clamp01(value);
    if (seeing >= 0.75) {
      return "steady";
    }
    if (seeing >= 0.4) {
      return "average";
    }
    return "turbulent";
  }

  function lightPollutionLabel(value) {
    const lightPollution = clamp01(value);
    if (lightPollution < 0.25) {
      return "dark sky";
    }
    if (lightPollution < 0.6) {
      return "suburban";
    }
    return "city glow";
  }

  function readinessLabel() {
    if (typeof document === "undefined" || !document.body || !document.body.dataset) {
      return "Initializing";
    }

    if (document.body.dataset.stargazingReady === "true") {
      return "Live dome";
    }

    if (document.body.dataset.stargazingReady === "fallback") {
      return "Fallback (no WebGL)";
    }

    return "Initializing";
  }

  function dayOfYearUtc(date) {
    const start = Date.UTC(date.getUTCFullYear(), 0, 1);
    const current = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
    return Math.floor((current - start) / 86400000) + 1;
  }

  function daysInUtcYear(year) {
    const start = Date.UTC(year, 0, 1);
    const end = Date.UTC(year + 1, 0, 1);
    return Math.floor((end - start) / 86400000);
  }

  function peakDayOfYear(year, month, day) {
    const peak = new Date(Date.UTC(year, month - 1, day));
    return dayOfYearUtc(peak);
  }

  function circularDayDistance(dayA, dayB, yearLength) {
    const distance = Math.abs(dayA - dayB);
    return Math.min(distance, yearLength - distance);
  }

  function normalizeMeteorShowers(showers) {
    if (Array.isArray(showers)) {
      return showers;
    }

    if (showers && Array.isArray(showers.showers)) {
      return showers.showers;
    }

    return [];
  }

  function activeMeteorShowers(showers, utcMs) {
    const date = new Date(numberOrFallback(utcMs, Date.now()));
    if (Number.isNaN(date.getTime())) {
      return [];
    }

    const year = date.getUTCFullYear();
    const today = dayOfYearUtc(date);
    const yearLength = daysInUtcYear(year);

    return normalizeMeteorShowers(showers).filter((shower) => {
      if (!shower || typeof shower !== "object") {
        return false;
      }

      const peakMonth = Number(shower.peakMonth);
      const peakDay = Number(shower.peakDay);
      if (!Number.isFinite(peakMonth) || !Number.isFinite(peakDay)) {
        return false;
      }

      const peak = peakDayOfYear(year, peakMonth, peakDay);
      return circularDayDistance(today, peak, yearLength) <= 5;
    });
  }

  function addListener(listeners, node, eventName, handler) {
    if (!node || typeof node.addEventListener !== "function") {
      return;
    }

    node.addEventListener(eventName, handler);
    listeners.push({ node, eventName, handler });
  }

  function bindInput(listeners, input, handler) {
    addListener(listeners, input, "input", handler);
    addListener(listeners, input, "change", handler);
  }

  function ensurePanelBody(panelId) {
    if (typeof document === "undefined") {
      return null;
    }

    const panel = document.getElementById(panelId);
    if (!panel) {
      return null;
    }

    const existing = panel.querySelector("[data-hud-body]");
    if (existing) {
      return existing;
    }

    const body = document.createElement("div");
    body.className = "stargazing-hud__body";
    body.setAttribute("data-hud-body", "");

    const currentBody = panel.querySelector("p");
    if (currentBody && currentBody.parentNode) {
      currentBody.parentNode.replaceChild(body, currentBody);
      return body;
    }

    panel.appendChild(body);
    return body;
  }

  function clearBody(body) {
    if (!body) {
      return;
    }

    body.textContent = "";
  }

  function appendLine(body, text) {
    if (!body || typeof document === "undefined") {
      return;
    }

    const line = document.createElement("p");
    line.textContent = text;
    body.appendChild(line);
  }

  function appendList(body, items) {
    if (!body || typeof document === "undefined") {
      return;
    }

    const list = document.createElement("ul");
    items.forEach((item) => {
      const listItem = document.createElement("li");
      listItem.textContent = item;
      list.appendChild(listItem);
    });
    body.appendChild(list);
  }

  function renderLines(panelId, lines) {
    const body = ensurePanelBody(panelId);
    clearBody(body);
    lines.forEach((line) => appendLine(body, line));
  }

  function renderLocation(snapshot, astro) {
    const observer = snapshot && snapshot.observer ? snapshot.observer : {};
    const time = snapshot && snapshot.time ? snapshot.time : {};
    const latDeg = numberOrFallback(observer.latDeg, 0);
    const lonDeg = numberOrFallback(observer.lonDeg, 0);
    const utcMs = numberOrFallback(time.utcMs, Date.now());
    let lst = "unavailable";

    if (
      astro &&
      typeof astro.julianDate === "function" &&
      typeof astro.lstHours === "function"
    ) {
      try {
        const jd = astro.julianDate(new Date(utcMs));
        lst = formatLstHours(astro.lstHours(jd, lonDeg));
      } catch (error) {
        if (typeof console !== "undefined" && typeof console.warn === "function") {
          console.warn("Stargazing HUD could not compute local sidereal time.", error);
        }
      }
    }

    renderLines("hud-location", [
      `Latitude: ${formatLatitude(latDeg)}`,
      `Longitude: ${formatLongitude(lonDeg)}`,
      `Local sidereal time: ${lst}`,
    ]);
  }

  function renderTime(snapshot) {
    const time = snapshot && snapshot.time ? snapshot.time : {};
    renderLines("hud-time", [
      `UTC: ${formatIsoSeconds(time.utcMs)}`,
      `Simulation speed: ${formatSpeed(time.speed)}`,
      `Clock: ${time.playing ? "playing" : "paused"}`,
    ]);
  }

  function limitingMagnitudeLine(catalog, lightPollution) {
    if (!catalog || typeof catalog.visibleMagnitudeLimit !== "function") {
      return "Naked-eye limit: unavailable";
    }

    try {
      const limit = Number(catalog.visibleMagnitudeLimit(lightPollution));
      if (Number.isFinite(limit)) {
        return `Naked-eye limit: ${limit.toFixed(1)} mag`;
      }
    } catch (error) {
      if (typeof console !== "undefined" && typeof console.warn === "function") {
        console.warn("Stargazing HUD could not compute limiting magnitude.", error);
      }
    }

    return "Naked-eye limit: unavailable";
  }

  function renderWeather(snapshot, catalog) {
    const weather = snapshot && snapshot.weather ? snapshot.weather : {};
    const cloud = clamp01(weather.cloud);
    const seeing = clamp01(weather.seeing);
    const lightPollution = clamp01(weather.lightPollution);

    renderLines("hud-weather", [
      `Cloud cover: ${formatPercent(cloud)} (${cloudLabel(cloud)})`,
      `Seeing: ${formatPercent(seeing)} (${seeingLabel(seeing)})`,
      `Light pollution: ${formatPercent(lightPollution)} (${lightPollutionLabel(lightPollution)})`,
      limitingMagnitudeLine(catalog, lightPollution),
    ]);
  }

  function renderMeteors(snapshot, meteorState) {
    const body = ensurePanelBody("hud-meteors");
    clearBody(body);

    if (!body) {
      return;
    }

    if (meteorState.failed) {
      appendLine(body, "Meteor shower catalog unavailable.");
      return;
    }

    if (!meteorState.loaded) {
      appendLine(body, "Loading meteor shower catalog...");
      return;
    }

    const time = snapshot && snapshot.time ? snapshot.time : {};
    const activeShowers = activeMeteorShowers(meteorState.showers, time.utcMs);
    if (!activeShowers.length) {
      appendLine(body, "No active showers near this date.");
      return;
    }

    appendList(body, activeShowers.map((shower) => {
      const name = shower.name || shower.id || "Meteor shower";
      const zhr = Number.isFinite(Number(shower.zhr)) ? Number(shower.zhr) : 0;
      return `${name}: ZHR ${zhr}`;
    }));
  }

  function renderTargets(snapshot) {
    const selectedTargetId = snapshot ? snapshot.selectedTargetId : null;
    if (!selectedTargetId) {
      renderLines("hud-targets", ["No target selected. Use guided navigation."]);
      return;
    }

    renderLines("hud-targets", [`${selectedTargetId}: tracking`]);
  }

  function renderTelemetry(snapshot) {
    const look = snapshot && snapshot.look ? snapshot.look : {};
    renderLines("hud-telemetry", [
      `Azimuth: ${formatBearing(look.azDeg)}`,
      `Altitude: ${formatDegrees(look.altDeg, 1)}`,
      `Render: ${readinessLabel()}`,
    ]);
  }

  function bindControls(stateApi, listeners) {
    if (typeof document === "undefined" || !stateApi) {
      return;
    }

    const latInput = document.getElementById("loc-lat");
    const lonInput = document.getElementById("loc-lon");
    const speedSelect = document.getElementById("time-speed");
    const playButton = document.getElementById("time-play");
    const nowButton = document.getElementById("time-now");

    bindInput(listeners, latInput, () => {
      stateApi.setState({ observer: { latDeg: numberFromInput(latInput, 0) } });
    });

    bindInput(listeners, lonInput, () => {
      stateApi.setState({ observer: { lonDeg: numberFromInput(lonInput, 0) } });
    });

    bindInput(listeners, speedSelect, () => {
      stateApi.setState({ time: { speed: numberFromInput(speedSelect, 1) } });
    });

    addListener(listeners, playButton, "click", () => {
      const current = typeof stateApi.getState === "function" ? stateApi.getState() : null;
      const playing = !(current && current.time && current.time.playing);
      stateApi.setState({ time: { playing } });
    });

    addListener(listeners, nowButton, "click", () => {
      stateApi.setState({ time: { utcMs: Date.now() } });
    });

    document.querySelectorAll("[data-weather]").forEach((input) => {
      bindInput(listeners, input, () => {
        const key = input.getAttribute("data-weather");
        const stateKey = key === "lightpollution" ? "lightPollution" : key;
        if (stateKey) {
          stateApi.setState({ weather: { [stateKey]: numberFromInput(input, 0) } });
        }
      });
    });

    document.querySelectorAll("[data-toggle]").forEach((input) => {
      bindInput(listeners, input, () => {
        const key = input.getAttribute("data-toggle");
        if (key) {
          stateApi.setState({ toggles: { [key]: Boolean(input.checked) } });
        }
      });
    });
  }

  function createHud(options) {
    const config = options && typeof options === "object" ? options : {};
    const state = config.state || null;
    const catalog = config.catalog || null;
    const astro = config.astro || null;
    const stateApi = state && typeof state.setState === "function" ? state : null;
    const readableStateApi = stateApi && typeof stateApi.getState === "function" ? stateApi : null;
    const listeners = [];
    const meteorState = {
      failed: false,
      loaded: false,
      showers: [],
    };
    let destroyed = false;
    let unsubscribeState = null;

    function getSnapshot() {
      if (!readableStateApi) {
        return {};
      }

      try {
        return readableStateApi.getState() || {};
      } catch (error) {
        if (typeof console !== "undefined" && typeof console.warn === "function") {
          console.warn("Stargazing HUD could not read state.", error);
        }
        return {};
      }
    }

    function update() {
      const snapshot = getSnapshot();
      renderTelemetry(snapshot);
      renderWeather(snapshot, catalog);
      renderMeteors(snapshot, meteorState);
      renderTargets(snapshot);
      renderTime(snapshot);
      renderLocation(snapshot, astro);
    }

    function destroy() {
      if (destroyed) {
        return;
      }

      destroyed = true;
      if (typeof unsubscribeState === "function") {
        unsubscribeState();
        unsubscribeState = null;
      }
      while (listeners.length) {
        const listener = listeners.pop();
        if (
          listener &&
          listener.node &&
          typeof listener.node.removeEventListener === "function"
        ) {
          listener.node.removeEventListener(listener.eventName, listener.handler);
        }
      }
    }

    bindControls(stateApi, listeners);

    if (readableStateApi && typeof readableStateApi.subscribe === "function") {
      unsubscribeState = readableStateApi.subscribe(function () {
        if (!destroyed) {
          update();
        }
      });
    }

    if (catalog && typeof catalog.loadMeteorShowers === "function") {
      try {
        const result = catalog.loadMeteorShowers();
        if (result && typeof result.then === "function") {
          result.then((showers) => {
            meteorState.showers = normalizeMeteorShowers(showers);
            meteorState.loaded = true;
            if (!destroyed) {
              update();
            }
          }).catch((error) => {
            meteorState.failed = true;
            meteorState.loaded = true;
            if (typeof console !== "undefined" && typeof console.warn === "function") {
              console.warn("Stargazing HUD could not load meteor showers.", error);
            }
            if (!destroyed) {
              update();
            }
          });
        } else {
          meteorState.showers = normalizeMeteorShowers(result);
          meteorState.loaded = true;
        }
      } catch (error) {
        meteorState.failed = true;
        meteorState.loaded = true;
        if (typeof console !== "undefined" && typeof console.warn === "function") {
          console.warn("Stargazing HUD could not load meteor showers.", error);
        }
      }
    } else {
      meteorState.failed = true;
      meteorState.loaded = true;
    }

    update();

    return {
      update,
      destroy,
    };
  }

  const API = {
    createHud,
  };

  if (typeof window !== "undefined") {
    window.StargazingHud = API;
  }
}());
