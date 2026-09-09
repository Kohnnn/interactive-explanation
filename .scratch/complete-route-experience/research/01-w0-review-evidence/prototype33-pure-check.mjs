import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const html = fs.readFileSync(new URL("../33-visual-prototype.html", import.meta.url), "utf8");
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(match => match[1]);
for (const script of scripts) new vm.Script(script);
const ids = [...html.matchAll(/id="([^"]+)"/g)].map(match => match[1]);
for (const missing of [null, ...ids, "all"]) {
  const nodes = new Map(ids.filter(id => missing !== "all" && id !== missing).map(id => [id, {
    textContent: "", append() {}, addEventListener(type, handler) { this[type] = handler; },
    scrollIntoView() {}, focus() {},
  }]));
  const root = { getAttribute: () => "light", setAttribute() {} };
  const context = vm.createContext({
    URL, location: { href: "http://localhost/?variant=A" }, history: { replaceState() {} },
    matchMedia: () => ({ matches: false, addEventListener() {} }),
    document: { documentElement: root, body: { dataset: {} }, getElementById: id => nodes.get(id) || null, addEventListener() {} },
  });
  for (const script of scripts) vm.runInContext(script, context);
  nodes.get("vp-start")?.click?.();
  nodes.get("vp-range")?.input?.({ target: { value: "40" } });
  nodes.get("vp-answer")?.change?.({ target: { value: "sample" } });
  nodes.get("vp-theme")?.click?.();
  nodes.get("vp-next")?.click?.();
  nodes.get("vp-prev")?.click?.();
  if (missing === null) {
    assert.equal(nodes.get("vp-value").textContent, "40 counters");
    assert.match(nodes.get("vp-answer-feedback").textContent, /^Yes:/);
  }
}
console.log(`PASS: ${scripts.length} inline scripts compile; intact DOM, each of ${ids.length} missing IDs, and absent-ID DOM execute without exceptions; intact sample feedback preserved. No browser/layout certification.`);
