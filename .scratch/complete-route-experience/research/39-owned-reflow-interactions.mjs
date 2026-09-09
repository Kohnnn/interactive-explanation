import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
const root = path.resolve(process.argv[2]);
const require = createRequire(path.join(root, "package.json"));
const { chromium } = require("playwright");
const smoke = await import(pathToFileURL(path.join(root, "tools/smoke-bundle.mjs")));
const { createSmokeServer } = await import(pathToFileURL(path.join(root, "tools/smoke/server.mjs")));
const slugs = ["exponentiation", "public-private-keys", "linear-regression", "precision-recall", "train-test-validation", "memory-allocation", "blockchain-101-combined-flow"];
const routes = JSON.parse(fs.readFileSync(path.join(root, "pages.json"))).filter(r => slugs.includes(r.slug));
const output = fs.openSync(process.argv[3], "wx");
const server = await createSmokeServer({ rootDir: root, host: "127.0.0.1", port: 4222, mountPath: "/interactive-explanation/" }).start();
const browser = await chromium.launch();
let failures = 0;
try {
  for (const route of routes) for (const viewport of smoke.experienceViewports) for (const theme of ["light", "dark"]) for (let sample = 1; sample <= 3; sample++) {
    const context = await smoke.createThemeContext(browser, { theme, stored: true, viewport });
    const page = await context.newPage();
    const result = { slug: route.slug, viewport, theme, sample, events: [] };
    page.on("pageerror", e => result.events.push(e.stack || e.message));
    page.on("requestfailed", r => result.events.push(r.failure()?.errorText));
    try {
      await page.goto(`http://127.0.0.1:4222/interactive-explanation/${route.slug}/`);
      await smoke.waitForManifestRouteReady(page, route);
      await page.waitForLoadState("networkidle");
      result.documentWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const start = performance.now();
      if (route.slug === "public-private-keys") {
        const before = await page.locator("#publicKey").inputValue();
        await page.locator("#randomButton").focus();
        await page.keyboard.press("Enter");
        await page.waitForFunction(before => document.querySelector("#publicKey").value !== before, before);
        result.action = "keyboard Random updates public key; generated private values not retained";
      } else if (route.slug === "blockchain-101-combined-flow") {
        const link = page.locator(".story-hero__actions a").first();
        const href = await link.getAttribute("href");
        await link.focus(); await page.keyboard.press("Enter");
        await page.waitForURL(url => url.pathname.endsWith(new URL(href, `http://127.0.0.1:4222/interactive-explanation/${route.slug}/`).pathname));
        result.action = "keyboard first walkthrough navigation";
      } else if (route.slug === "train-test-validation") {
        const button = page.getByRole("button", { name: "Fluffiness", exact: true });
        await button.focus(); await page.keyboard.press("Enter");
        await page.waitForFunction(() => document.querySelector('button[value="fluffiness"]').classList.contains("active"));
        result.action = "keyboard feature switch to Fluffiness";
      } else {
        const selector = route.slug === "linear-regression" ? "#mse-container #bias-slider input[type=range]" : route.slug === "exponentiation" ? 'input[aria-label="Number of steps"]' : "input[type=range]";
        const slider = page.locator(selector).first();
        await slider.scrollIntoViewIfNeeded(); await slider.focus();
        const before = await slider.inputValue();
        const surface = route.slug === "precision-recall" ? "#heatmap-container" : route.slug === "linear-regression" ? "#mse-container" : route.slug === "memory-allocation" ? "#content" : "#growth-intuition";
        const text = await page.locator(surface).innerText();
        await page.keyboard.press("ArrowRight");
        assert.notEqual(await slider.inputValue(), before, "Keyboard slider value unchanged");
        if (route.slug !== "memory-allocation") await page.waitForFunction(({surface,text}) => document.querySelector(surface).innerText !== text, {surface,text});
        result.action = "keyboard slider changes value and lesson readout";
        if (route.slug === "memory-allocation") {
          const button = page.getByRole("button", { name: "Next allocation step", exact: true }).first();
          await button.focus(); await page.keyboard.press("Enter");
          result.action = "keyboard slider and next allocation step";
        }
      }
      result.interactionMs = performance.now() - start;
      result.scroll = [];
      if (["linear-regression", "exponentiation", "precision-recall"].includes(route.slug)) {
        const selector = route.slug === "linear-regression" ? ".katex-display, .tab-text:has(.katex), #equation-math" : route.slug === "precision-recall" ? "#f1-container" : ".viz-scroll";
        for (const scroller of await page.locator(selector).all()) {
          const dimensions = await scroller.evaluate(e => ({ width:e.clientWidth, scrollWidth:e.scrollWidth, name:e.getAttribute("aria-label"),tabIndex:e.tabIndex }));
          if (dimensions.scrollWidth <= dimensions.width + 1) continue;
          assert(dimensions.name && dimensions.tabIndex === 0, "Overflow region lacks accessible name/tab stop");
          await scroller.scrollIntoViewIfNeeded(); await scroller.focus();
          await scroller.evaluate(e => { e.scrollLeft = 0; });
          await page.keyboard.press("ArrowRight");
          await page.waitForFunction(selector => document.activeElement?.scrollLeft > 0, selector, {timeout:3000});
          const left = await scroller.evaluate(e => e.scrollLeft);
          await scroller.evaluate(e => { e.scrollLeft = e.scrollWidth; });
          const end = await scroller.evaluate(e => ({left:e.scrollLeft, remaining:e.scrollWidth-e.clientWidth-e.scrollLeft}));
          assert(end.remaining <= 1, "Scroll end inaccessible");
          result.scroll.push({...dimensions, keyboardLeft:left,end});
        }
      }
      assert(result.documentWidth <= viewport.width + 1, `Overflow ${result.documentWidth-viewport.width}px`);
      assert.equal(result.events.length, 0, "Runtime/network events");
      result.status = "passed";
    } catch (error) { result.status = "failed"; result.error = error.message; failures++; }
    fs.writeSync(output, JSON.stringify(result)+"\n");
    await context.close();
  }
} finally { fs.closeSync(output); await browser.close(); await new Promise(resolve => server.close(resolve)); }
console.log(JSON.stringify({failures}));
process.exitCode = failures ? 1 : 0;
