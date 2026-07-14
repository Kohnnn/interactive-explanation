import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { beforeEach, test } from "node:test";

const moduleUrl = new URL("../../stargazing-dashboard/js/state.js", import.meta.url);
const source = fs.readFileSync(moduleUrl, "utf8");

function loadFreshState(overrides = {}) {
  const context = {
    module: { exports: {} },
    setTimeout,
    window: {},
    ...overrides,
  };

  vm.runInNewContext(source, context, { filename: moduleUrl.pathname });
  assert.equal(context.module.exports, context.window.StargazingState);
  return context.module.exports;
}

beforeEach(() => {
  delete global.window;
});

test("getState returns a defensive clone when callers mutate the snapshot", async () => {
  // Given: a fresh singleton store.
  const state = await loadFreshState();

  // When: a caller mutates the returned snapshot.
  const snapshot = state.getState();
  snapshot.weather.cloud = 1;
  snapshot.selectedTargetId = "vega";

  // Then: the internal store remains unchanged.
  assert.equal(state.getState().weather.cloud, 0.18);
  assert.equal(state.getState().selectedTargetId, null);
});

test("setState shallow-merges object top-level keys and replaces primitives", async () => {
  // Given: a fresh singleton store.
  const state = await loadFreshState();

  // When: partial nested objects and primitive keys are patched.
  state.setState({
    weather: { cloud: 0.5 },
    selectedTargetId: "mars",
  });

  // Then: omitted nested fields are preserved and primitive keys are replaced.
  const weather = state.getState().weather;
  assert.equal(weather.cloud, 0.5);
  assert.equal(weather.seeing, 0.74);
  assert.equal(weather.lightPollution, 0.32);
  assert.equal(state.getState().selectedTargetId, "mars");
});

test("setState clamps constrained numeric fields", async () => {
  // Given: a fresh singleton store.
  const state = await loadFreshState();

  // When: constrained fields receive out-of-range values.
  state.setState({
    observer: { latDeg: 120, lonDeg: -250 },
    time: { speed: -4 },
    weather: { cloud: -1, seeing: 2, lightPollution: Number.NaN },
  });

  // Then: fields are clamped or defaulted to valid ranges.
  const snapshot = state.getState();
  assert.equal(snapshot.observer.latDeg, 90);
  assert.equal(snapshot.observer.lonDeg, -180);
  assert.equal(snapshot.time.speed, 1);
  assert.equal(snapshot.weather.cloud, 0);
  assert.equal(snapshot.weather.seeing, 1);
  assert.equal(snapshot.weather.lightPollution, 0.32);
});

test("subscribe notifies once per commit and unsubscribe removes cleanly", async () => {
  // Given: a subscribed listener.
  const state = await loadFreshState();
  const seen = [];
  const unsubscribe = state.subscribe((snapshot) => {
    seen.push(snapshot.time.utcMs);
  });

  // When: one setState commit happens, then the listener unsubscribes.
  state.setState({ time: { utcMs: 1000 } });
  unsubscribe();
  state.setState({ time: { utcMs: 2000 } });

  // Then: the listener saw exactly one notification.
  assert.deepEqual(seen, [1000]);
});

test("one subscriber exception does not block later subscribers and is reported", async () => {
  // Given: one throwing subscriber and one healthy subscriber.
  const reported = [];
  const state = await loadFreshState({
    setTimeout: (fn) => {
      try {
        fn();
      } catch (error) {
        reported.push(error);
      }
      return 0;
    },
  });
  let healthyCalls = 0;

  state.subscribe(() => {
    throw new Error("subscriber failed");
  });
  state.subscribe(() => {
    healthyCalls += 1;
  });

  // When: state commits.
  state.setState({ selectedTargetId: "saturn" });

  // Then: the healthy subscriber still runs and the error is not hidden.
  assert.equal(healthyCalls, 1);
  assert.equal(reported.length, 1);
  assert.equal(reported[0].message, "subscriber failed");
});

test("advanceTime is pure and tick commits only while playing", async () => {
  // Given: a fresh store with a known clock and speed.
  const state = await loadFreshState();
  state.setState({ time: { utcMs: 1000, speed: 10, playing: false } });

  // When: pure advance and paused tick run.
  const advanced = state.advanceTime(50);
  state.tick(50);

  // Then: advanceTime returns a number without mutating, and paused tick is inert.
  assert.equal(advanced, 1500);
  assert.equal(state.getState().time.utcMs, 1000);

  // When: playing tick runs.
  state.setState({ time: { playing: true } });
  state.tick(50);

  // Then: time is committed using speed.
  assert.equal(state.getState().time.utcMs, 1500);
});
