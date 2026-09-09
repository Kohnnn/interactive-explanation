import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { chromium } from "../../../interactive-explanation/node_modules/playwright/index.mjs";
import { createSmokeServer } from "../../../interactive-explanation/tools/smoke/server.mjs";
const root = new URL("../../../interactive-explanation", import.meta.url).pathname;
const server = await createSmokeServer({ rootDir: root, host: "127.0.0.1", port: 4231, mountPath: "/interactive-explanation/" }).start();
const browser = await chromium.launch();
const results = [];
try {
  for (const slug of ["sim", "interactive-mechanical-watch"]) for (let sample = 1; sample <= 3; sample++) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: "reduce" });
    const page = await context.newPage();
    const events = [];
    page.on("pageerror", error => events.push({ type: "pageerror", message: error.message }));
    page.on("console", message => { if (message.type() === "error") events.push({ type: "console-error", message: message.text() }); });
    page.on("requestfailed", request => events.push({ type: "requestfailed", url: request.url(), error: request.failure() }));
    page.on("response", response => { if (response.status() >= 400) events.push({ type: "response", url: response.url(), status: response.status() }); });
    await page.goto(`http://127.0.0.1:4231/interactive-explanation/${slug}/`, { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);
    if (slug === "interactive-mechanical-watch") await page.waitForSelector("[data-exploded-canvas] canvas");
    await page.waitForTimeout(1000);
    const measure = () => page.evaluate(slug => {
      const rect = selector => { const element = document.querySelector(selector); if (!element) return null; const box = element.getBoundingClientRect(); return { tag: element.tagName, id: element.id, className: String(element.className), width: box.width, height: box.height, top: box.top, left: box.left, display: getComputedStyle(element).display, position: getComputedStyle(element).position, dataset: { ...element.dataset } }; };
      if (slug === "sim") return { grid: rect("#grid"), canvas: [...document.querySelectorAll("canvas")].map(element => ({ width: element.width, height: element.height, rect: { width: element.getBoundingClientRect().width, height: element.getBoundingClientRect().height }, parent: { id: element.parentElement.id, rect: { width: element.parentElement.getBoundingClientRect().width, height: element.parentElement.getBoundingClientRect().height } } })), tileSize: Grid.tileSize, gridParent: rect("#grid_container"), documentWidth: document.documentElement.scrollWidth, viewportWidth: innerWidth, resources: performance.getEntriesByType("resource").map(({ name, transferSize, duration }) => ({ name, transferSize, duration })) };
      const canvas = document.querySelector("[data-exploded-canvas] canvas");
      return { reduced: document.body.dataset.watchReducedMotion, play: document.querySelector("[data-exploded-play]")?.getAttribute("aria-pressed"), canvas: rect("[data-exploded-canvas] canvas"), image: canvas.toDataURL(), visible: canvas.getBoundingClientRect().top < innerHeight, documentWidth: document.documentElement.scrollWidth, viewportWidth: innerWidth };
    }, slug);
    const initial = await measure();
    await page.waitForTimeout(5500);
    const later = await measure();
    let afterScroll;
    if (slug === "interactive-mechanical-watch") {
      await page.locator("[data-exploded-canvas] canvas").scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);
      afterScroll = await measure();
    }
    const compact = value => {
      if (!value?.image) return value;
      const { image, ...rest } = value;
      return { ...rest, imageSha256: createHash("sha256").update(image).digest("hex") };
    };
    results.push({ slug, sample, initial: compact(initial), later: compact(later), afterScroll: compact(afterScroll), events, failure: slug === "sim" ? later.tileSize === 0 : later.canvas.dataset.playing !== "false" });
    await context.close();
  }
} finally {
  await browser.close();
  server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
}
fs.writeFileSync(process.argv[2], JSON.stringify({ browser: "Playwright default Chromium", results }, null, 2) + "\n", { flag: "wx" });
console.log(JSON.stringify(results.map(({ slug, sample, failure, events, initial, later, afterScroll }) => ({ slug, sample, failure, events, tileSize: later.tileSize, playing: later.canvas?.dataset?.playing, afterScrollPlaying: afterScroll?.canvas?.dataset?.playing, imageStable: initial.imageSha256 === later.imageSha256 })), null, 2));
assert(results.every(result => !result.failure), "Current Sim grid/watch reduced-motion failures reproduced; raw task evidence retained");
