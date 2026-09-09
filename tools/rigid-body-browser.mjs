import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { createSmokeServer } from "./smoke/server.mjs";

const rootDir = fileURLToPath(new URL("../", import.meta.url));
const server = await createSmokeServer({ rootDir: path.resolve(rootDir), host: "127.0.0.1", port: 0, mountPath: "/interactive-explanation/" }).start();
const url = `http://127.0.0.1:${server.address().port}/interactive-explanation/rigid-body-collisions/`;
const browser = await chromium.launch({ headless: true });
const samples = [];
try {
  for (const width of [1400, 390, 320]) for (const theme of ["light", "dark"]) for (let repeat = 0; repeat < 3; repeat++) {
    const context = await browser.newContext({ viewport: { width, height: width === 1400 ? 1000 : 844 }, colorScheme: theme, reducedMotion: "reduce", hasTouch: width < 800 });
    await context.addInitScript((value) => localStorage.setItem("theme", value), theme);
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
    page.on("requestfailed", (request) => errors.push(request.url()));
    page.on("response", (response) => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
    await page.goto(url, { waitUntil: "networkidle" });
    await page.waitForSelector("#collision-controls[data-ready='true']");
    assert.equal(await page.locator("#a-after").textContent(), "0.000");
    assert.equal(await page.locator("#b-after").textContent(), "2.000");
    const geometry = await page.evaluate(() => ({
      width: document.documentElement.scrollWidth,
      viewport: innerWidth,
      overflow: [...document.querySelectorAll("body *")].filter((node) => node.getBoundingClientRect().right > innerWidth).map((node) => ({ tag: node.tagName, id: node.id, className: node.className, right: node.getBoundingClientRect().right })),
      background: getComputedStyle(document.body).backgroundColor,
      theme: document.documentElement.getAttribute("saved-theme"),
      controls: [...document.querySelectorAll("#collision-controls input, #collision-controls button")].map((node) => ({ width: node.getBoundingClientRect().width, height: node.getBoundingClientRect().height, name: node.labels?.[0]?.textContent || node.textContent })),
    }));
    assert.ok(geometry.width <= geometry.viewport, JSON.stringify(geometry));
    assert.equal(geometry.theme, theme);
    assert.equal(geometry.background, theme === "light" ? "rgb(245, 247, 250)" : "rgb(11, 16, 24)");
    for (const control of geometry.controls) assert.ok(control.width >= 44 && control.height >= 44 && control.name.trim());
    await page.locator("#mB").fill("3");
    assert.equal(await page.locator("#a-after").textContent(), "-1.000");
    await page.locator("#e").focus();
    await page.keyboard.press("Home");
    assert.equal(await page.locator("#e").evaluate((node) => getComputedStyle(node).outlineWidth), "3px");
    assert.equal(await page.locator("#a-after").textContent(), "0.500");
    assert.equal(await page.locator("#energy-after").textContent(), "0.500");
    const toggle = page.locator(".top-bar__theme");
    assert.equal(await toggle.count(), 1);
    await toggle.click();
    assert.equal(await page.locator("html").getAttribute("saved-theme"), theme === "light" ? "dark" : "light");
    assert.equal(await page.locator("#a-after").textContent(), "0.500");
    await toggle.click();
    await page.locator("#uA").fill("-2");
    await page.locator("#uB").fill("2");
    await page.locator("#mA").fill("10");
    assert.equal(await page.locator("#momentum-after").textContent(), "-14.000");
    assert.match(await page.locator("#collision-status").textContent(), /No approach/);
    const reset = page.getByRole("button", { name: "Reset inputs", exact: true });
    if (width < 800) await reset.tap(); else await reset.click();
    assert.equal(await page.locator("#a-after").textContent(), "0.000");
    assert.equal(await page.locator("#e").inputValue(), "1");
    await page.locator("#mA").evaluate((input) => { input.type = "number"; input.value = "0"; input.dispatchEvent(new Event("input", { bubbles: true })); });
    assert.equal(await page.locator("#collision-results").isVisible(), false);
    assert.match(await page.locator("#collision-status").textContent(), /Reset inputs/);
    await reset.click();
    assert.equal(await page.locator("#collision-results").isVisible(), true);
    await page.locator("#mA").evaluate((input) => { input.type = "range"; });
    await page.reload();
    await page.waitForSelector("#collision-controls[data-ready='true']");
    assert.equal(await page.locator("html").getAttribute("saved-theme"), theme);
    for (const id of ["before-we-start", "what-are-we-trying-to-do", "what-is-a-collision", "conclusion"]) {
      await page.goto(`${url}#${id}`);
      assert.equal(await page.locator(`#${id}`).count(), 1);
    }
    const continuation = page.locator("[data-route-continuation] a[href*='/bicycle/']");
    assert.equal(await continuation.count(), 1);
    const metrics = await page.evaluate(() => {
      const n = performance.getEntriesByType("navigation")[0];
      const resources = performance.getEntriesByType("resource");
      return { dcl: n.domContentLoadedEventEnd, load: n.loadEventEnd, transfer: n.transferSize + resources.reduce((sum, r) => sum + r.transferSize, 0), requests: resources.length + 1, resources: resources.map((r) => r.name) };
    });
    assert.ok(metrics.load > 0 && metrics.transfer > 0);
    assert.ok(!metrics.resources.some((resource) => resource.includes("/_nuxt/")));
    assert.ok(metrics.resources.every((resource) => new URL(resource).origin === new URL(url).origin));
    assert.deepEqual(errors, []);
    if (process.env.RIGID_SCREENSHOTS && repeat === 0) {
      await page.goto(url);
      await page.screenshot({ path: path.join(process.env.RIGID_SCREENSHOTS, `rigid-${width}-${theme}.png`), fullPage: true });
    }
    samples.push({ width, theme, repeat, geometry, metrics });
    await context.close();
  }
  for (const theme of ["light", "dark"]) for (const denied of [false, true]) {
    const context = await browser.newContext({ colorScheme: theme });
    if (denied) await context.addInitScript(() => { Object.defineProperty(window, "localStorage", { get() { throw new Error("Storage denied fixture"); } }); });
    const page = await context.newPage();
    await page.goto(url);
    await page.waitForSelector("#collision-controls[data-ready='true']");
    assert.equal(await page.locator("html").getAttribute("saved-theme"), theme);
    assert.equal(await page.locator("#b-after").textContent(), "2.000");
    await context.close();
  }
  console.log(JSON.stringify({ browser: browser.version(), reference: "original replacement, not legacy geometry", cells: 6, freshContexts: 18, fallbackContexts: 4, samples }, null, 2));
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
