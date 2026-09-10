import assert from "node:assert/strict";
import test from "node:test";
import { EventEmitter } from "node:events";
import vm from "node:vm";
import { classifyNetwork, resourceUrl } from "../network-handoff.mjs";
import { assertOnlyAllowedRemoteRequests, createRemoteRequestMonitor, createRuntimeMonitor } from "../smoke-bundle.mjs";
import { capture } from "../diagnose-baseline.mjs";

const base = "http://127.0.0.1:4173/interactive-explanation/";
const directory = `${base}markov-chains/playground/`;
const final = `${directory}playground.html`;
const fixture = () => [
  { type: "requestfailed", seq: 1, requestId: "r1", frameId: "f2", childFrame: true, url: directory, error: "net::ERR_ABORTED", resourceType: "document", navigation: true },
  { type: "request", seq: 2, requestId: "r2", frameId: "f2", url: final, resourceType: "document", navigation: true },
  { type: "response", seq: 3, requestId: "r2", status: 200 },
  { type: "framenavigated", seq: 4, frameId: "f2", url: final },
  { type: "requestfinished", seq: 5, requestId: "r2" },
  { type: "nativeeditorready", seq: 6, requestId: "r2", frameId: "f2", url: final },
  { type: "nativeeditorvalidated", seq: 7, requestId: "r2", frameId: "f2", url: final, connected: true, nativeReady: true },
];
test("only the completed same-child native Markov handoff is classified; evidence stays intact", () => {
  const events = fixture();
  const before = JSON.stringify(events);
  assert.equal(classifyNetwork(events, base)[0].classification, "validated-markov-child-handoff");
  assert.equal(JSON.stringify(events), before);
});
for (const [name, mutate] of [
  ["wrong frame", (e) => { e[1].frameId = "f3"; }],
  ["wrong destination", (e) => { e[1].url += "other"; }],
  ["missing finished", (e) => e.splice(4, 1)],
  ["missing readiness", (e) => e.pop()],
  ["missing navigation", (e) => e.splice(3, 1)],
  ["native error", (e) => e.push({ type: "pageerror" })],
  ["console error", (e) => e.push({ type: "console-error" })],
  ["stylesheet abort", (e) => { e[0].resourceType = "stylesheet"; }],
  ["external", (e) => { e[0].url = "https://other.invalid/playground/"; }],
  ["other route", (e) => { e[0].url = `${base}trust/`; }],
  ["main frame", (e) => { e[0].childFrame = false; }],
  ["HTTP error", (e) => { e[2].status = 500; }],
  ["old journal", (e) => e.forEach((entry) => { delete entry.frameId; delete entry.seq; })],
]) test(name, () => {
  const events = fixture();
  mutate(events);
  assert.equal(classifyNetwork(events, base)[0].classification, "unknown-failure");
});
for (const event of [
  { type: "framenavigated", url: final },
  { type: "framenavigated", url: "about:[redacted]" },
  { type: "framedetached" },
  { type: "nativeeditorvalidated", requestId: "r2", url: final, connected: true, nativeReady: false },
  { type: "nativeeditorvalidated", requestId: "other", url: final, connected: true, nativeReady: true },
]) test(`later ${JSON.stringify(event)} invalidates cached acceptance`, () => {
  const events = fixture();
  events.push({ ...event, seq: 8, frameId: "f2" });
  assert.equal(classifyNetwork(events, base)[0].classification, "unknown-failure");
});

test("a later completed and currently validated native document preserves an already validated handoff", () => {
  const events = fixture();
  const later = fixture().slice(1).map(event => ({ ...event, seq: event.seq + 7, requestId: event.requestId ? "r3" : undefined }));
  events.push(...later);
  assert.equal(classifyNetwork(events, base)[0].classification, "validated-markov-child-handoff");
  events.pop();
  assert.equal(classifyNetwork(events, base)[0].classification, "unknown-failure");
});

test("completed exact directory repeat is allowed, unfinished repeat is not", () => {
  const events = fixture();
  events.splice(1, 0, { type: "request", seq: 1.1, requestId: "repeat", frameId: "f2", url: directory, navigation: true, resourceType: "document" }, { type: "requestfinished", seq: 1.2, requestId: "repeat" });
  assert.equal(classifyNetwork(events, base)[0].classification, "validated-markov-child-handoff");
  events.splice(2, 1);
  assert.equal(classifyNetwork(events, base)[0].classification, "unknown-failure");
});
for (const mode of ["wrong-state", "wrong-navigation", "blank", "detach", "remove-pane", "pageerror", "console-error", "valid"]) {
  for (const abort of [false, true]) test(`monitor and capture validate current native final: ${mode}, abort=${abort}`, async () => {
    function mockPage() {
      const page = new EventEmitter();
      let url = final;
      let detached = false;
      let pane = true;
      let valid = mode !== "wrong-state";
      const evaluate = fn => vm.runInNewContext(`(${fn.toString()})()`, {
        window: { angular: { element: () => ({ scope: () => ({ validTransitionMatrix: valid, states: [1] }) }) } },
        document: { body: {}, readyState: "complete", querySelector: selector => selector === "svg" || pane ? {} : null },
      });
      const frame = { parentFrame: () => ({}), url: () => url, isDetached: () => detached, evaluate: async fn => evaluate(fn), waitForFunction: async fn => { if (!evaluate(fn)) throw new Error("not ready"); } };
      const request = target => ({ frame: () => frame, url: () => target, resourceType: () => "document", isNavigationRequest: () => true, method: () => "GET", failure: () => ({ errorText: "net::ERR_ABORTED" }) });
      page.start = async () => {
        if (abort) { const first = request(directory); page.emit("request", first); page.emit("requestfailed", first); }
        const last = request(final);
        page.emit("request", last);
        page.emit("response", { request: () => last, status: () => 200, url: () => final });
        page.emit("framenavigated", frame);
        page.emit("requestfinished", last);
        await Promise.resolve();
        if (mode === "wrong-navigation" || mode === "blank") { url = mode === "blank" ? "about:blank" : `${base}other/`; page.emit("framenavigated", frame); }
        if (mode === "detach") { detached = true; page.emit("framedetached", frame); }
        if (mode === "remove-pane") pane = false;
        if (mode === "pageerror") page.emit("pageerror", new Error("native error"));
        if (mode === "console-error") page.emit("console", { type: () => "error" });
      };
      return page;
    }
    const page = mockPage();
    const clean = createRuntimeMonitor(page);
    await page.start();
    if (mode === "valid") await clean("native");
    else await assert.rejects(clean("native"));
    const capturedPage = mockPage();
    Object.assign(capturedPage, {
      setDefaultTimeout() {}, setDefaultNavigationTimeout() {},
      goto: async () => { await capturedPage.start(); return { ok: () => true }; },
      waitForSelector: async () => {}, waitForLoadState: async () => {},
      evaluate: async () => { throw new Error("unrelated mock measurement"); },
    });
    const browser = { newContext: async () => ({ addInitScript: async () => {}, newPage: async () => capturedPage, close: async () => {} }) };
    const result = await capture(browser, { route: { slug: "markov-chains", experience: { networkPolicy: { mode: "local-only" }, primarySurface: "main" } }, viewport: { width: 100, height: 100 }, theme: "light" });
    assert.equal(result.errors.some(error => error.phase === "runtime"), mode !== "valid");
  });
}

test("resource URLs exclude credentials, queries and fragments", () => {
  assert.equal(resourceUrl("https://user:secret@example.invalid/a?token=secret#secret"), "https://example.invalid/a");
  assert.equal(resourceUrl("data:text/plain,secret"), "data:[redacted]");
});

test("only a live Musicmap YouTube frame validates its exact QoE cancellation", () => {
  const failure = { type: "requestfailed", seq: 1, requestId: "r1", frameId: "f2", childFrame: true, url: "https://www.youtube-nocookie.com/api/stats/qoe", error: "net::ERR_ABORTED", resourceType: "fetch", navigation: false };
  const validated = { type: "musicmapembedvalidated", seq: 2, frameId: "f2", childFrame: true, url: "https://www.youtube-nocookie.com/embed/videoseries", connected: true, ready: true };
  assert.equal(classifyNetwork([failure, validated], base)[0].classification, "validated-youtube-qoe-cancellation");
  for (const mutate of [
    (events) => { events[0].url += "/other"; },
    (events) => { events[0].error = "net::ERR_FAILED"; },
    (events) => { events[0].resourceType = "xhr"; },
    (events) => { events[0].navigation = true; },
    (events) => { events[0].childFrame = false; },
    (events) => { events[1].frameId = "f3"; },
    (events) => { events[1].childFrame = false; },
    (events) => { events[1].connected = false; },
    (events) => { events[1].ready = false; },
    (events) => { events[1].seq = 0; },
    (events) => { events.push({ type: "framedetached", seq: 3, frameId: "f2" }); },
    (events) => { events.push({ type: "request", seq: 3, requestId: "r2", frameId: "f2", navigation: true, url: events[1].url }); },
    (events) => { events.push({ type: "framenavigated", seq: 3, frameId: "f2", url: events[1].url }); },
    (events) => { events.push({ type: "framenavigated", seq: 3, frameId: "f2", url: "about:[redacted]" }); },
  ]) {
    const events = structuredClone([failure, validated]);
    mutate(events);
    assert.equal(classifyNetwork(events, base)[0].classification, "unknown-failure");
  }
});

test("remote policy permits only verified local blobs and failures omit URL secrets", () => {
  assert.doesNotThrow(() => assertOnlyAllowedRemoteRequests([`blob:${new URL(base).origin}/local-id`], [], "probe", [new URL(base).origin]));
  assert.throws(() => assertOnlyAllowedRemoteRequests(["blob:https://open.spotify.com/id"], ["open.spotify.com"], "probe"), /blob:\[redacted\]/);
  assert.doesNotThrow(() => assertOnlyAllowedRemoteRequests(["blob:https://open.spotify.com/id"], ["open.spotify.com"], "probe", ["https://open.spotify.com"]));
  assert.throws(() => assertOnlyAllowedRemoteRequests(["blob:null/id"], [], "probe"), /blob:\[redacted\]/);
  assert.throws(() => assertOnlyAllowedRemoteRequests(["blob:not a URL"], [], "probe"), /blob:\[redacted\]/);
  assert.throws(() => assertOnlyAllowedRemoteRequests(["blob:https://foreign.invalid/id"], ["open.spotify.com"], "probe"), /blob:\[redacted\]/);
  assert.throws(
    () => assertOnlyAllowedRemoteRequests(["https://user:secret@example.invalid/embed?token=secret#secret"], ["allowed.invalid"], "probe"),
    (error) => {
      assert.match(error.message, /https:\/\/example\.invalid\/embed/);
      assert.doesNotMatch(error.message, /user|secret|token|\?/);
      return true;
    },
  );
});

test("remote collector retains late requests through page close", () => {
  const page = new EventEmitter();
  const monitor = createRemoteRequestMonitor(page);
  const checkpoint = monitor.checkpoint();
  page.emit("request", { url: () => "https://allowed.invalid/first" });
  assert.doesNotThrow(() => monitor.assertSince(checkpoint, ["allowed.invalid"], "initial"));
  page.emit("request", { url: () => "https://blocked.invalid/late" });
  page.emit("close");
  assert.throws(() => monitor.assertSince(checkpoint, ["allowed.invalid"], "final"), /https:\/\/blocked\.invalid\/late/);
});

test("unknown failures retain safe request diagnostics and remain fatal", async () => {
  const page = new EventEmitter();
  const frame = { parentFrame: () => ({}), url: () => "https://example.invalid/embed" };
  const request = {
    frame: () => frame,
    url: () => "https://user:secret@example.invalid/embed?token=secret#secret",
    resourceType: () => "document",
    isNavigationRequest: () => true,
    method: () => "GET",
    failure: () => ({ errorText: "net::ERR_ABORTED" }),
  };
  const clean = createRuntimeMonitor(page);
  page.emit("request", request);
  page.emit("requestfailed", request);
  await assert.rejects(clean("probe"), (error) => {
    assert.match(error.message, /r1 f1 document navigation=true childFrame=true net::ERR_ABORTED https:\/\/example\.invalid\/embed unknown-failure/);
    assert.doesNotMatch(error.message, /user|secret|token|\?/);
    return true;
  });
});
