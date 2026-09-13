import assert from "node:assert/strict";
import { chromium } from "playwright";
import { createSmokeServer } from "./smoke/server.mjs";
import { baseUrl, host, port, mountPath, createThemeContext, experienceViewports, createRuntimeMonitor } from "./smoke-bundle.mjs";

const server = await createSmokeServer({ rootDir: process.cwd(), host, port, mountPath }).start();
const browser = await chromium.launch({ headless: true });
try {
  for (const viewport of experienceViewports) for (const theme of ["light", "dark"]) for (let sample = 1; sample <= 3; sample++) {
    const context = await createThemeContext(browser, { theme, stored: true, viewport });
    try {
      const page = await context.newPage();
      const events = [];
      const clean = createRuntimeMonitor(page, { events, rejectOffOriginRequests: true });
      await page.goto(`${baseUrl}markov-chains/`);
      await page.waitForLoadState("networkidle");
      await clean.ready();
      assert.deepEqual(events.filter(event => event.type === "request" && event.childFrame && event.navigation && !new URL(event.url).search), [], "Playground loaded before its startup preset was assigned");
      const frame = await page.locator("iframe.playground").elementHandle().then((element) => element.contentFrame());
      assert(frame?.parentFrame() === page.mainFrame());
      assert(new URL(frame.url()).pathname.endsWith("/markov-chains/playground/playground.html"));
      const editor = frame.locator(".matrixInput textarea");
      assert.deepEqual(JSON.parse(await editor.inputValue()), [[0.3, 0.3, 0.4], [0.3, 0.5, 0.2], [0.4, 0.4, 0.2]]);
      assert.equal(events.filter(event => event.type === "request" && event.childFrame && event.navigation).length, 1, "Startup must load exactly one child document");
      await editor.fill("[[0.3,0.3,0.4],[0.3,0.5,0.2],[0.4,0.4,0.2]]");
      await frame.waitForFunction(() => angular.element(document.body).scope().validTransitionMatrix && angular.element(document.body).scope().states.length === 3);
      await editor.fill("[[0.5]]");
      await frame.waitForFunction(() => angular.element(document.body).scope().validTransitionMatrix === false);
      await editor.fill("[[0.7,0.3],[0.2,0.8]]");
      await frame.waitForFunction(() => angular.element(document.body).scope().validTransitionMatrix && angular.element(document.body).scope().states.length === 2);
      const speed = frame.locator("#playground-speed");
      const before = Number(await speed.inputValue());
      await speed.focus();
      await speed.press("ArrowRight");
      assert.equal(Number(await speed.inputValue()), before + 1);
      await frame.waitForFunction((value) => angular.element(document.body).scope().duration === 2000 / value, before + 1);
      await speed.press("Tab");
      assert(await frame.evaluate(() => document.activeElement !== document.querySelector("#playground-speed")));
      await clean("Markov child interactions");
      console.log(JSON.stringify({ viewport, theme, sample, frameUrl: new URL(frame.url()).pathname, checks: ["matrix-edit", "invalid", "recover", "speed-keyboard", "tab-exit"], classifications: clean.classify(), events }));
    } finally { await context.close(); }
  }
} finally {
  await browser.close();
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
}
