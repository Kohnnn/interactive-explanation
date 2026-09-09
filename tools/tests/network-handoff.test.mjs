import assert from "node:assert/strict";
import test from "node:test";
import { classifyNetwork, resourceUrl } from "../network-handoff.mjs";

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
test("completed exact directory repeat is allowed, unfinished repeat is not", () => {
  const events = fixture();
  events.splice(1, 0, { type: "request", seq: 1.1, requestId: "repeat", frameId: "f2", url: directory, navigation: true, resourceType: "document" }, { type: "requestfinished", seq: 1.2, requestId: "repeat" });
  assert.equal(classifyNetwork(events, base)[0].classification, "validated-markov-child-handoff");
  events.splice(2, 1);
  assert.equal(classifyNetwork(events, base)[0].classification, "unknown-failure");
});
test("resource URLs exclude credentials, queries and fragments", () => {
  assert.equal(resourceUrl("https://user:secret@example.invalid/a?token=secret#secret"), "https://example.invalid/a");
  assert.equal(resourceUrl("data:text/plain,secret"), "data:[redacted]");
});
