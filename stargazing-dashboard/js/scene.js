/*
 * StargazingScene renderer.
 * Public shape on window.StargazingScene:
 * createScene({ canvas, state, catalog, astro }) -> { start(), stop(), resize() }.
 */
(function () {
  "use strict";

  const SKY_RADIUS = 100;
  const DEG_TO_RAD = Math.PI / 180;
  const STAR_JD_EPSILON = 1 / 1440;
  const OBSERVER_EPSILON = 0.001;
  const LIGHT_POLLUTION_EPSILON = 0.01;
  const DEFAULT_TIME_MS = Date.UTC(2026, 0, 1, 0, 0, 0);
  const EMPTY_CONSTELLATIONS = { lines: [], names: {} };
  const PLANET_NAMES = ["mercury", "venus", "mars", "jupiter", "saturn"];
  const BODY_STYLES = {
    sun: { color: 0xffd36d, size: 13, opacity: 1 },
    moon: { color: 0xdfe8ff, size: 10, opacity: 0.9 },
    mercury: { color: 0xb8b1a7, size: 5, opacity: 0.88 },
    venus: { color: 0xf7e7b0, size: 7, opacity: 0.95 },
    mars: { color: 0xff8a5b, size: 6, opacity: 0.9 },
    jupiter: { color: 0xffd09a, size: 8, opacity: 0.95 },
    saturn: { color: 0xe8d5a4, size: 7, opacity: 0.92 },
  };

  function createNoopScene() {
    return {
      start() {},
      stop() {},
      resize() {},
    };
  }

  function isFiniteNumber(value) {
    return typeof value === "number" && Number.isFinite(value);
  }

  function clamp(value, min, max, fallback) {
    const numberValue = Number(value);
    const safeValue = Number.isFinite(numberValue) ? numberValue : fallback;
    return Math.min(max, Math.max(min, safeValue));
  }

  function hasRequiredThree(THREE) {
    return Boolean(
      THREE
        && THREE.WebGLRenderer
        && THREE.Scene
        && THREE.PerspectiveCamera
        && THREE.Vector3
        && THREE.BufferGeometry
        && THREE.BufferAttribute
        && THREE.PointCloud
        && THREE.PointCloudMaterial
        && THREE.Line
        && THREE.LineBasicMaterial
        && THREE.Object3D
        && THREE.LinePieces !== undefined
        && THREE.VertexColors !== undefined,
    );
  }

  function safeWarn(warned, key, message, error) {
    if (warned[key]) {
      return;
    }

    warned[key] = true;
    if (typeof console !== "undefined" && typeof console.warn === "function") {
      console.warn(message, error || "");
    }
  }

  function readSnapshot(state, warned) {
    let rawState = null;
    if (state && typeof state.getState === "function") {
      try {
        rawState = state.getState();
      } catch (error) {
        safeWarn(warned, "state-get", "StargazingScene: state.getState() failed.", error);
      }
    }

    const observer = rawState && rawState.observer ? rawState.observer : {};
    const time = rawState && rawState.time ? rawState.time : {};
    const toggles = rawState && rawState.toggles ? rawState.toggles : {};
    const weather = rawState && rawState.weather ? rawState.weather : {};
    const look = rawState && rawState.look ? rawState.look : {};

    return {
      observer: {
        latDeg: clamp(observer.latDeg, -90, 90, 37.7749),
        lonDeg: clamp(observer.lonDeg, -180, 180, -122.4194),
        elevM: Number.isFinite(Number(observer.elevM)) ? Number(observer.elevM) : 0,
      },
      time: {
        utcMs: Number.isFinite(Number(time.utcMs)) ? Number(time.utcMs) : DEFAULT_TIME_MS,
        playing: Boolean(time.playing),
        speed: Number.isFinite(Number(time.speed)) && Number(time.speed) > 0 ? Number(time.speed) : 1,
      },
      toggles: {
        constellations: toggles.constellations !== false,
        planets: toggles.planets !== false,
        labels: toggles.labels !== false,
      },
      weather: {
        cloud: clamp(weather.cloud, 0, 1, 0),
        seeing: clamp(weather.seeing, 0, 1, 0.5),
        lightPollution: clamp(weather.lightPollution, 0, 1, 0.3),
      },
      selectedTargetId: rawState ? rawState.selectedTargetId : null,
      look: {
        azDeg: Number.isFinite(Number(look.azDeg)) ? Number(look.azDeg) : 0,
        altDeg: clamp(look.altDeg, -90, 90, 30),
      },
    };
  }

  function weatherDimming(weather) {
    return clamp(1 - weather.cloud * 0.86, 0.08, 1, 1);
  }

  function createScene(options) {
    const config = options && typeof options === "object" ? options : {};
    const canvas = config.canvas || null;
    const state = config.state || null;
    const catalog = config.catalog || null;
    const astro = config.astro || null;
    const THREE = typeof window !== "undefined" ? window.THREE : null;
    const warned = {};

    if (typeof window === "undefined" || !hasRequiredThree(THREE)) {
      return createNoopScene();
    }

    let renderer = null;
    let scene = null;
    let camera = null;
    let starObject = null;
    let starMaterial = null;
    let starGeometry = null;
    let constellationObject = null;
    let constellationMaterial = null;
    let constellationGeometry = null;
    let horizonMaterial = null;
    let bodyGroup = null;
    let labelGroup = null;
    let markers = {};
    let initialized = false;
    let rendererFailed = false;
    let running = false;
    let frameHandle = null;
    let lastFrameMs = null;
    let dataLoadPromise = null;
    let catalogReady = false;
    let loadedStars = [];
    let loadedConstellations = EMPTY_CONSTELLATIONS;
    let visibleStars = [];
    let constellationSegments = [];
    let starSizeAverage = 2;
    let visibleStarLightPollution = null;
    let lastStarPositionKey = null;
    let lastConstellationPositionKey = null;

    function horizontalToVector(altDeg, azDeg, radius) {
      const altRad = altDeg * DEG_TO_RAD;
      const azRad = azDeg * DEG_TO_RAD;
      const cosAlt = Math.cos(altRad);
      return new THREE.Vector3(
        radius * cosAlt * Math.sin(azRad),
        radius * Math.sin(altRad),
        -radius * cosAlt * Math.cos(azRad),
      );
    }

    function computeJulianDate(snapshot) {
      if (!astro || typeof astro.julianDate !== "function") {
        return null;
      }

      try {
        return astro.julianDate(new Date(snapshot.time.utcMs));
      } catch (error) {
        safeWarn(warned, "astro-jd", "StargazingScene: astro.julianDate() failed.", error);
        return null;
      }
    }

    function equatorialToHorizontal(equatorial, observer, jd) {
      if (!astro || typeof astro.equatorialToHorizontal !== "function" || jd === null) {
        return null;
      }

      try {
        const horizontal = astro.equatorialToHorizontal(equatorial, observer, jd);
        if (
          !horizontal
          || !isFiniteNumber(horizontal.altDeg)
          || !isFiniteNumber(horizontal.azDeg)
        ) {
          return null;
        }
        return horizontal;
      } catch (error) {
        safeWarn(
          warned,
          "astro-horizontal",
          "StargazingScene: astro.equatorialToHorizontal() failed.",
          error,
        );
        return null;
      }
    }

    function skyPositionForEquatorial(equatorial, observer, jd, radius) {
      const horizontal = equatorialToHorizontal(equatorial, observer, jd);
      if (!horizontal) {
        return null;
      }

      return horizontalToVector(horizontal.altDeg, horizontal.azDeg, radius);
    }

    function createBufferGeometry(positions, colors, sizes) {
      const geometry = new THREE.BufferGeometry();
      geometry.addAttribute("position", new THREE.BufferAttribute(positions, 3));
      if (colors) {
        geometry.addAttribute("color", new THREE.BufferAttribute(colors, 3));
      }
      if (sizes) {
        geometry.addAttribute("size", new THREE.BufferAttribute(sizes, 1));
      }
      return geometry;
    }

    function disposeOldObject(oldObject) {
      if (!oldObject) {
        return;
      }
      scene.remove(oldObject);
      const oldGeometry = oldObject.geometry;
      if (oldGeometry && typeof oldGeometry.dispose === "function") {
        oldGeometry.dispose();
      }
    }

    function recreatePointObject(oldObject, nextGeometry, material) {
      const next = new THREE.PointCloud(nextGeometry, material);
      next.frustumCulled = false;
      disposeOldObject(oldObject);
      scene.add(next);
      return next;
    }

    function recreateLineObject(oldObject, nextGeometry, material) {
      const next = new THREE.Line(nextGeometry, material, THREE.LinePieces);
      next.frustumCulled = false;
      disposeOldObject(oldObject);
      scene.add(next);
      return next;
    }

    function createStarObject() {
      starGeometry = createBufferGeometry(new Float32Array(0), new Float32Array(0), new Float32Array(0));
      starMaterial = new THREE.PointCloudMaterial({
        color: 0xffffff,
        size: starSizeAverage,
        transparent: true,
        opacity: 1,
        vertexColors: THREE.VertexColors,
        sizeAttenuation: false,
      });
      starObject = new THREE.PointCloud(starGeometry, starMaterial);
      starObject.visible = false;
      starObject.frustumCulled = false;
      scene.add(starObject);
    }

    function createConstellationObject() {
      constellationGeometry = createBufferGeometry(new Float32Array(0));
      constellationMaterial = new THREE.LineBasicMaterial({
        color: 0x6d83ad,
        transparent: true,
        opacity: 0.18,
      });
      constellationObject = new THREE.Line(
        constellationGeometry,
        constellationMaterial,
        THREE.LinePieces,
      );
      constellationObject.visible = false;
      constellationObject.frustumCulled = false;
      scene.add(constellationObject);
    }

    function createHorizonLine() {
      const segmentCount = 96;
      const positions = new Float32Array((segmentCount + 1) * 3);
      for (let i = 0; i <= segmentCount; i += 1) {
        const angle = (i / segmentCount) * Math.PI * 2;
        positions[i * 3] = Math.sin(angle) * SKY_RADIUS;
        positions[i * 3 + 1] = 0;
        positions[i * 3 + 2] = -Math.cos(angle) * SKY_RADIUS;
      }

      const geometry = createBufferGeometry(positions);
      horizonMaterial = new THREE.LineBasicMaterial({
        color: 0x3e557d,
        transparent: true,
        opacity: 0.58,
      });
      const horizon = new THREE.Line(geometry, horizonMaterial);
      horizon.frustumCulled = false;
      scene.add(horizon);
    }

    function createMarker(style) {
      const geometry = createBufferGeometry(new Float32Array([0, 0, 0]));
      const material = new THREE.PointCloudMaterial({
        color: style.color,
        size: style.size,
        transparent: true,
        opacity: style.opacity,
        sizeAttenuation: false,
      });
      const marker = new THREE.PointCloud(geometry, material);
      marker.visible = false;
      marker.frustumCulled = false;
      return marker;
    }

    function createBodyMarkers() {
      bodyGroup = new THREE.Object3D();
      markers = {};
      Object.keys(BODY_STYLES).forEach((name) => {
        const marker = createMarker(BODY_STYLES[name]);
        markers[name] = marker;
        bodyGroup.add(marker);
      });
      scene.add(bodyGroup);

      labelGroup = new THREE.Object3D();
      labelGroup.visible = false;
      scene.add(labelGroup);
    }

    function resize() {
      try {
        if (!renderer || !camera || !canvas) {
          return;
        }

        const fallbackWidth = typeof window.innerWidth === "number" ? window.innerWidth : 1;
        const fallbackHeight = typeof window.innerHeight === "number" ? window.innerHeight : 1;
        const width = Math.max(1, Math.floor(canvas.clientWidth || canvas.width || fallbackWidth || 1));
        const height = Math.max(1, Math.floor(canvas.clientHeight || canvas.height || fallbackHeight || 1));

        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
      } catch (error) {
        safeWarn(warned, "resize", "StargazingScene: resize() failed.", error);
      }
    }

    function initialize() {
      if (initialized) {
        return true;
      }
      if (rendererFailed || !canvas) {
        return false;
      }

      try {
        renderer = new THREE.WebGLRenderer({
          canvas,
          antialias: true,
          alpha: false,
        });
        if (typeof renderer.setPixelRatio === "function") {
          renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        }
        renderer.setClearColor(0x05070f, 1);

        scene = new THREE.Scene();
        camera = new THREE.PerspectiveCamera(68, 1, 0.1, SKY_RADIUS * 3);
        camera.position.set(0, 0, 0);
        camera.up.set(0, 1, 0);
        scene.add(camera);

        createStarObject();
        createConstellationObject();
        createHorizonLine();
        createBodyMarkers();
        resize();

        initialized = true;
        return true;
      } catch (error) {
        rendererFailed = true;
        safeWarn(warned, "renderer", "StargazingScene: WebGL renderer setup failed.", error);
        return false;
      }
    }

    function safeCatalogVisibleMagnitudeLimit(lightPollution) {
      if (catalog && typeof catalog.visibleMagnitudeLimit === "function") {
        try {
          return catalog.visibleMagnitudeLimit(lightPollution);
        } catch (error) {
          safeWarn(
            warned,
            "catalog-mag-limit",
            "StargazingScene: catalog.visibleMagnitudeLimit() failed.",
            error,
          );
        }
      }
      return 6;
    }

    function safeCatalogFilterStars(stars, magLimit) {
      if (catalog && typeof catalog.filterVisibleStars === "function") {
        try {
          const filtered = catalog.filterVisibleStars(stars, magLimit);
          return Array.isArray(filtered) ? filtered : [];
        } catch (error) {
          safeWarn(
            warned,
            "catalog-filter-stars",
            "StargazingScene: catalog.filterVisibleStars() failed.",
            error,
          );
        }
      }
      return Array.isArray(stars) ? stars.filter((star) => star && star.mag <= magLimit) : [];
    }

    function safeCatalogColor(star) {
      if (catalog && typeof catalog.bvToRgb === "function") {
        try {
          const color = catalog.bvToRgb(star.bv);
          if (color && isFiniteNumber(color.r) && isFiniteNumber(color.g) && isFiniteNumber(color.b)) {
            return color;
          }
        } catch (error) {
          safeWarn(warned, "catalog-color", "StargazingScene: catalog.bvToRgb() failed.", error);
        }
      }
      return { r: 0.92, g: 0.94, b: 1 };
    }

    function safeCatalogSize(star, magLimit) {
      if (catalog && typeof catalog.magnitudeToSize === "function") {
        try {
          const size = catalog.magnitudeToSize(star.mag, { magLimit, minSize: 1.0, maxSize: 5.8 });
          if (isFiniteNumber(size) && size > 0) {
            return size;
          }
        } catch (error) {
          safeWarn(
            warned,
            "catalog-size",
            "StargazingScene: catalog.magnitudeToSize() failed.",
            error,
          );
        }
      }
      return 2;
    }

    function safeIndexStars(stars) {
      if (catalog && typeof catalog.indexStars === "function") {
        try {
          return catalog.indexStars(stars);
        } catch (error) {
          safeWarn(warned, "catalog-index", "StargazingScene: catalog.indexStars() failed.", error);
        }
      }
      return new Map();
    }

    function safeResolveConstellations(constellations, starIndex) {
      if (catalog && typeof catalog.resolveConstellationSegments === "function") {
        try {
          const resolved = catalog.resolveConstellationSegments(constellations, starIndex);
          return Array.isArray(resolved) ? resolved : [];
        } catch (error) {
          safeWarn(
            warned,
            "catalog-constellations",
            "StargazingScene: catalog.resolveConstellationSegments() failed.",
            error,
          );
        }
      }
      return [];
    }

    function loadArray(loaderName) {
      if (!catalog || typeof catalog[loaderName] !== "function") {
        return Promise.resolve([]);
      }

      try {
        return Promise.resolve(catalog[loaderName]()).then((data) => (Array.isArray(data) ? data : []));
      } catch (error) {
        safeWarn(warned, loaderName, "StargazingScene: catalog loader failed.", error);
        return Promise.resolve([]);
      }
    }

    function loadConstellations() {
      if (!catalog || typeof catalog.loadConstellations !== "function") {
        return Promise.resolve(EMPTY_CONSTELLATIONS);
      }

      try {
        return Promise.resolve(catalog.loadConstellations()).then((data) => {
          if (data && typeof data === "object") {
            return {
              lines: Array.isArray(data.lines) ? data.lines : [],
              names: data.names && typeof data.names === "object" ? data.names : {},
            };
          }
          return EMPTY_CONSTELLATIONS;
        });
      } catch (error) {
        safeWarn(warned, "catalog-load-constellations", "StargazingScene: constellation load failed.", error);
        return Promise.resolve(EMPTY_CONSTELLATIONS);
      }
    }

    function ensureCatalogLoad() {
      if (dataLoadPromise) {
        return;
      }

      dataLoadPromise = Promise.all([loadArray("loadStars"), loadConstellations()])
        .then((results) => {
          loadedStars = Array.isArray(results[0]) ? results[0] : [];
          loadedConstellations = results[1] || EMPTY_CONSTELLATIONS;
          constellationSegments = safeResolveConstellations(loadedConstellations, safeIndexStars(loadedStars));
          catalogReady = true;
          rebuildStarCloud(readSnapshot(state, warned));
          rebuildConstellationLines(readSnapshot(state, warned));
        })
        .catch((error) => {
          catalogReady = true;
          loadedStars = [];
          loadedConstellations = EMPTY_CONSTELLATIONS;
          constellationSegments = [];
          safeWarn(warned, "catalog-load", "StargazingScene: catalog load failed.", error);
        });
    }

    function rebuildStarCloud(snapshot) {
      if (!starObject) {
        return;
      }

      const magLimit = safeCatalogVisibleMagnitudeLimit(snapshot.weather.lightPollution);
      visibleStars = safeCatalogFilterStars(loadedStars, magLimit);
      visibleStarLightPollution = snapshot.weather.lightPollution;

      const positions = new Float32Array(visibleStars.length * 3);
      const colors = new Float32Array(visibleStars.length * 3);
      const sizes = new Float32Array(visibleStars.length);
      let totalSize = 0;

      for (let i = 0; i < visibleStars.length; i += 1) {
        const star = visibleStars[i];
        const color = safeCatalogColor(star);
        const size = safeCatalogSize(star, magLimit);
        colors[i * 3] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;
        sizes[i] = size;
        totalSize += size;
      }

      starSizeAverage = visibleStars.length > 0 ? totalSize / visibleStars.length : 2;
      const nextGeometry = createBufferGeometry(positions, colors, sizes);
      // r70 caches GL buffer bindings per-object; swapping geometry leaves them stale, so recreate.
      starObject = recreatePointObject(starObject, nextGeometry, starMaterial);
      starGeometry = nextGeometry;
      starMaterial.size = starSizeAverage;
      lastStarPositionKey = null;
      updateStarPositions(snapshot, true);
      starObject.visible = visibleStars.length > 0;
    }

    function rebuildConstellationLines(snapshot) {
      if (!constellationObject) {
        return;
      }

      const positions = new Float32Array(constellationSegments.length * 2 * 3);
      const nextGeometry = createBufferGeometry(positions);
      constellationObject = recreateLineObject(constellationObject, nextGeometry, constellationMaterial);
      constellationGeometry = nextGeometry;
      lastConstellationPositionKey = null;
      updateConstellationPositions(snapshot, true);
      constellationObject.visible = constellationSegments.length > 0;
    }

    function positionKey(snapshot, jd) {
      return {
        jd,
        latDeg: snapshot.observer.latDeg,
        lonDeg: snapshot.observer.lonDeg,
      };
    }

    function positionKeyChanged(previous, next, force) {
      return Boolean(
        force
          || !previous
          || Math.abs(previous.jd - next.jd) > STAR_JD_EPSILON
          || Math.abs(previous.latDeg - next.latDeg) > OBSERVER_EPSILON
          || Math.abs(previous.lonDeg - next.lonDeg) > OBSERVER_EPSILON,
      );
    }

    function updateStarPositions(snapshot, force) {
      if (!starGeometry || visibleStars.length === 0) {
        return;
      }

      const jd = computeJulianDate(snapshot);
      if (jd === null) {
        return;
      }

      const nextKey = positionKey(snapshot, jd);
      // Star RA/Dec are fixed. Only LST and observer change horizontal coords, so
      // the 2.8k-star transform is cached and refreshed on meaningful time/site deltas.
      if (!positionKeyChanged(lastStarPositionKey, nextKey, force)) {
        return;
      }

      const positionAttribute = starGeometry.attributes.position;
      const positions = positionAttribute.array;
      for (let i = 0; i < visibleStars.length; i += 1) {
        const star = visibleStars[i];
        const vector = skyPositionForEquatorial(
          { raHours: star.ra, decDeg: star.dec },
          snapshot.observer,
          jd,
          SKY_RADIUS,
        ) || horizontalToVector(-90, 0, SKY_RADIUS);
        positions[i * 3] = vector.x;
        positions[i * 3 + 1] = vector.y;
        positions[i * 3 + 2] = vector.z;
      }

      positionAttribute.needsUpdate = true;
      if (typeof starGeometry.computeBoundingSphere === "function") {
        starGeometry.computeBoundingSphere();
      }
      lastStarPositionKey = nextKey;
    }

    function updateConstellationPositions(snapshot, force) {
      if (!constellationGeometry || constellationSegments.length === 0) {
        return;
      }

      const jd = computeJulianDate(snapshot);
      if (jd === null) {
        return;
      }

      const nextKey = positionKey(snapshot, jd);
      if (!positionKeyChanged(lastConstellationPositionKey, nextKey, force)) {
        return;
      }

      const positionAttribute = constellationGeometry.attributes.position;
      const positions = positionAttribute.array;
      for (let i = 0; i < constellationSegments.length; i += 1) {
        const segment = constellationSegments[i];
        const a = skyPositionForEquatorial(
          { raHours: segment.a.ra, decDeg: segment.a.dec },
          snapshot.observer,
          jd,
          SKY_RADIUS * 0.997,
        ) || horizontalToVector(-90, 0, SKY_RADIUS);
        const b = skyPositionForEquatorial(
          { raHours: segment.b.ra, decDeg: segment.b.dec },
          snapshot.observer,
          jd,
          SKY_RADIUS * 0.997,
        ) || horizontalToVector(-90, 0, SKY_RADIUS);
        const offset = i * 6;
        positions[offset] = a.x;
        positions[offset + 1] = a.y;
        positions[offset + 2] = a.z;
        positions[offset + 3] = b.x;
        positions[offset + 4] = b.y;
        positions[offset + 5] = b.z;
      }

      positionAttribute.needsUpdate = true;
      if (typeof constellationGeometry.computeBoundingSphere === "function") {
        constellationGeometry.computeBoundingSphere();
      }
      lastConstellationPositionKey = nextKey;
    }

    function setMarkerPosition(name, equatorial, snapshot, jd, opacityMultiplier) {
      const marker = markers[name];
      if (!marker || !equatorial) {
        if (marker) {
          marker.visible = false;
        }
        return;
      }

      const horizontal = equatorialToHorizontal(equatorial, snapshot.observer, jd);
      if (!horizontal || horizontal.altDeg < -5) {
        marker.visible = false;
        return;
      }

      const vector = horizontalToVector(horizontal.altDeg, horizontal.azDeg, SKY_RADIUS * 0.985);
      marker.position.set(vector.x, vector.y, vector.z);
      marker.visible = true;
      marker.material.opacity = weatherDimming(snapshot.weather) * opacityMultiplier;
    }

    function safeBodyPosition(name, jd) {
      if (!astro) {
        return null;
      }

      try {
        if (name === "sun" && typeof astro.sunPosition === "function") {
          return astro.sunPosition(jd);
        }
        if (name === "moon" && typeof astro.moonPosition === "function") {
          return astro.moonPosition(jd);
        }
        if (typeof astro.planetPosition === "function") {
          return astro.planetPosition(name, jd);
        }
      } catch (error) {
        safeWarn(warned, "body-" + name, "StargazingScene: " + name + " position failed.", error);
      }
      return null;
    }

    function updateBodyMarkers(snapshot) {
      if (!bodyGroup) {
        return;
      }

      bodyGroup.visible = snapshot.toggles.planets;
      if (labelGroup) {
        labelGroup.visible = snapshot.toggles.labels;
      }
      if (!bodyGroup.visible) {
        return;
      }

      const jd = computeJulianDate(snapshot);
      if (jd === null) {
        Object.keys(markers).forEach((name) => {
          markers[name].visible = false;
        });
        return;
      }

      const sun = safeBodyPosition("sun", jd);
      setMarkerPosition("sun", sun, snapshot, jd, BODY_STYLES.sun.opacity);

      const moon = safeBodyPosition("moon", jd);
      const moonPhase = moon && isFiniteNumber(moon.phaseFraction) ? moon.phaseFraction : 0.5;
      setMarkerPosition("moon", moon, snapshot, jd, BODY_STYLES.moon.opacity * (0.45 + moonPhase * 0.55));

      PLANET_NAMES.forEach((name) => {
        setMarkerPosition(name, safeBodyPosition(name, jd), snapshot, jd, BODY_STYLES[name].opacity);
      });
    }

    function updateCamera(snapshot) {
      if (!camera) {
        return;
      }

      const target = horizontalToVector(snapshot.look.altDeg, snapshot.look.azDeg, SKY_RADIUS);
      camera.lookAt(target);
    }

    function updateWeather(snapshot, frameMs) {
      const dimming = weatherDimming(snapshot.weather);
      const seeingJitter = 1 + (1 - snapshot.weather.seeing) * 0.06 * Math.sin(frameMs * 0.004);

      if (starMaterial) {
        starMaterial.opacity = dimming;
        starMaterial.size = Math.max(0.7, starSizeAverage * seeingJitter);
      }
      if (constellationMaterial) {
        constellationMaterial.opacity = 0.2 * dimming;
      }
      if (horizonMaterial) {
        horizonMaterial.opacity = 0.42 + 0.16 * dimming;
      }
      if (constellationObject) {
        constellationObject.visible = snapshot.toggles.constellations && constellationSegments.length > 0;
      }
    }

    function maybeRefreshCatalogDerivedGeometry(snapshot) {
      if (!catalogReady) {
        return;
      }

      if (
        visibleStarLightPollution === null
        || Math.abs(visibleStarLightPollution - snapshot.weather.lightPollution) > LIGHT_POLLUTION_EPSILON
      ) {
        rebuildStarCloud(snapshot);
      }
    }

    function tickState(deltaMs) {
      if (state && typeof state.tick === "function") {
        try {
          state.tick(deltaMs);
        } catch (error) {
          safeWarn(warned, "state-tick", "StargazingScene: state.tick() failed.", error);
        }
      }
    }

    function renderFrame(frameMs) {
      frameHandle = null;
      if (!running || !renderer || !scene || !camera) {
        return;
      }

      try {
        if (lastFrameMs !== null) {
          tickState(frameMs - lastFrameMs);
        }
        lastFrameMs = frameMs;

        const snapshot = readSnapshot(state, warned);
        maybeRefreshCatalogDerivedGeometry(snapshot);
        updateCamera(snapshot);
        updateWeather(snapshot, frameMs);
        updateStarPositions(snapshot, false);
        updateConstellationPositions(snapshot, false);
        updateBodyMarkers(snapshot);
        renderer.render(scene, camera);
      } catch (error) {
        safeWarn(warned, "render", "StargazingScene: render frame failed.", error);
      }

      scheduleFrame();
    }

    function scheduleFrame() {
      if (!running || frameHandle !== null) {
        return;
      }

      if (typeof window.requestAnimationFrame === "function") {
        frameHandle = window.requestAnimationFrame(renderFrame);
        return;
      }

      frameHandle = window.setTimeout(() => {
        renderFrame(Date.now());
      }, 16);
    }

    function cancelFrame() {
      if (frameHandle === null) {
        return;
      }

      if (typeof window.cancelAnimationFrame === "function") {
        window.cancelAnimationFrame(frameHandle);
      } else {
        window.clearTimeout(frameHandle);
      }
      frameHandle = null;
    }

    function start() {
      try {
        if (running) {
          return;
        }
        if (!initialize()) {
          return;
        }

        running = true;
        lastFrameMs = null;
        ensureCatalogLoad();
        scheduleFrame();
      } catch (error) {
        safeWarn(warned, "start", "StargazingScene: start() failed.", error);
      }
    }

    function stop() {
      try {
        if (!running && frameHandle === null) {
          return;
        }
        running = false;
        lastFrameMs = null;
        cancelFrame();
      } catch (error) {
        safeWarn(warned, "stop", "StargazingScene: stop() failed.", error);
      }
    }

    return {
      start,
      stop,
      resize,
    };
  }

  const API = {
    createScene,
  };

  if (typeof window !== "undefined") {
    window.StargazingScene = API;
  }
}());
