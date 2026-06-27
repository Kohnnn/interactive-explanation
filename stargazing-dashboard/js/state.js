/*
 * StargazingState frozen public API.
 * getState() returns a shallow defensive clone to prevent external mutation of the singleton store.
 * setState(patch) shallow-merges object values per top-level key and notifies subscribers.
 * subscribe(fn) returns an unsubscribe function.
 * advanceTime(deltaMs) is pure: it returns time.utcMs + deltaMs * time.speed and does not mutate state.
 * tick(realDeltaMs) is the impure driver: when playing, it commits the advanced utcMs via setState().
 */
(function () {
  "use strict";

  const DEFAULT_TIME_MS = Date.UTC(2026, 0, 1, 0, 0, 0);
  const DEFAULT_STATE = {
    observer: {
      latDeg: 37.7749,
      lonDeg: -122.4194,
      elevM: 0,
    },
    time: {
      utcMs: DEFAULT_TIME_MS,
      playing: false,
      speed: 1,
    },
    toggles: {
      constellations: true,
      planets: true,
      labels: true,
    },
    weather: {
      cloud: 0,
      seeing: 0.5,
      lightPollution: 0.3,
    },
    selectedTargetId: null,
    look: {
      azDeg: 0,
      altDeg: 30,
    },
  };

  let currentState = cloneState(DEFAULT_STATE);
  const subscribers = new Set();

  function numberOrFallback(value, fallback) {
    const numberValue = Number(value);
    return Number.isFinite(numberValue) ? numberValue : fallback;
  }

  function clamp(value, min, max, fallback) {
    const numberValue = numberOrFallback(value, fallback);
    return Math.min(max, Math.max(min, numberValue));
  }

  function cloneValue(value) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return Object.assign({}, value);
    }

    return value;
  }

  function cloneState(state) {
    const cloned = {};
    Object.keys(state).forEach((key) => {
      cloned[key] = cloneValue(state[key]);
    });
    return cloned;
  }

  function sanitizeState(state) {
    const nextState = cloneState(state);

    if (nextState.observer && typeof nextState.observer === "object") {
      nextState.observer.latDeg = clamp(nextState.observer.latDeg, -90, 90, currentState.observer.latDeg);
      nextState.observer.lonDeg = clamp(nextState.observer.lonDeg, -180, 180, currentState.observer.lonDeg);
      nextState.observer.elevM = numberOrFallback(nextState.observer.elevM, currentState.observer.elevM);
    }

    if (nextState.time && typeof nextState.time === "object") {
      nextState.time.utcMs = numberOrFallback(nextState.time.utcMs, currentState.time.utcMs);
      nextState.time.playing = Boolean(nextState.time.playing);
      nextState.time.speed = numberOrFallback(nextState.time.speed, currentState.time.speed);
      if (nextState.time.speed <= 0) {
        nextState.time.speed = currentState.time.speed > 0 ? currentState.time.speed : DEFAULT_STATE.time.speed;
      }
    }

    if (nextState.weather && typeof nextState.weather === "object") {
      nextState.weather.cloud = clamp(nextState.weather.cloud, 0, 1, currentState.weather.cloud);
      nextState.weather.seeing = clamp(nextState.weather.seeing, 0, 1, currentState.weather.seeing);
      nextState.weather.lightPollution = clamp(
        nextState.weather.lightPollution,
        0,
        1,
        currentState.weather.lightPollution,
      );
    }

    return nextState;
  }

  function notifySubscribers() {
    const errors = [];
    subscribers.forEach((subscriber) => {
      try {
        subscriber(getState());
      } catch (error) {
        errors.push(error);
      }
    });

    errors.forEach((error) => {
      setTimeout(() => {
        throw error;
      }, 0);
    });
  }

  function getState() {
    return cloneState(currentState);
  }

  function setState(patch) {
    if (!patch || typeof patch !== "object" || Array.isArray(patch)) {
      return getState();
    }

    const nextState = cloneState(currentState);
    Object.keys(patch).forEach((key) => {
      const patchValue = patch[key];
      const currentValue = nextState[key];

      if (
        currentValue &&
        typeof currentValue === "object" &&
        !Array.isArray(currentValue) &&
        patchValue &&
        typeof patchValue === "object" &&
        !Array.isArray(patchValue)
      ) {
        nextState[key] = Object.assign({}, currentValue, patchValue);
        return;
      }

      nextState[key] = patchValue;
    });

    currentState = sanitizeState(nextState);
    notifySubscribers();
    return getState();
  }

  function subscribe(fn) {
    if (typeof fn !== "function") {
      throw new TypeError("StargazingState.subscribe expects a function.");
    }

    subscribers.add(fn);

    return function unsubscribe() {
      subscribers.delete(fn);
    };
  }

  function advanceTime(deltaMs) {
    const safeDeltaMs = numberOrFallback(deltaMs, 0);
    return currentState.time.utcMs + safeDeltaMs * currentState.time.speed;
  }

  function tick(realDeltaMs) {
    if (!currentState.time.playing) {
      return getState();
    }

    return setState({
      time: {
        utcMs: advanceTime(realDeltaMs),
      },
    });
  }

  const API = Object.freeze({
    getState,
    setState,
    subscribe,
    advanceTime,
    tick,
  });

  if (typeof module !== "undefined" && module.exports) {
    module.exports = API;
  }

  if (typeof window !== "undefined") {
    window.StargazingState = API;
  }
}());
