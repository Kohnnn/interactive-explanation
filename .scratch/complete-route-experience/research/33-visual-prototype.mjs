import assert from "node:assert/strict";
import fs from "node:fs/promises";
import http from "node:http";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const require = createRequire(new URL("../../../interactive-explanation/package.json", import.meta.url));
const { chromium } = require("playwright");
const html = await fs.readFile(new URL("./33-visual-prototype.html", import.meta.url), "utf8");
for (const [, script] of html.matchAll(/<script>([\s\S]*?)<\/script>/g)) new vm.Script(script);
assert(!/localStorage|sessionStorage|https?:\/\/|<iframe|<canvas/.test(html));
assert(html.includes("prefers-reduced-motion: reduce"));
const server = http.createServer((request, response) => {
  response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  response.end(html);
});
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
let browser;
const results = [];
function luminance(hex) {
  const rgb = hex.match(/[a-f\d]{2}/gi).map(value => parseInt(value, 16) / 255).map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
  return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722;
}
function contrast(a, b) {
  const values = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (values[0] + .05) / (values[1] + .05);
}
try {
  browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH || "/home/compute_01/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome" });
  console.log(JSON.stringify({ node: process.version, playwright: require("playwright/package.json").version, browser: browser.version(), platform: process.platform, date: new Date().toISOString() }));
  for (const variant of ["A", "B", "C"]) for (const theme of ["light", "dark"]) for (const width of [1400, 390, 320]) {
    const context = await browser.newContext({ viewport: { width, height: width === 1400 ? 1000 : 844 }, colorScheme: theme, reducedMotion: "reduce" });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("request", request => assert(request.url().startsWith("http://127.0.0.1:")));
    await page.goto(`http://127.0.0.1:${server.address().port}/?variant=${variant}`);
    assert.equal(await page.locator("html").getAttribute("saved-theme"), theme);
    assert.equal(await page.locator("body").getAttribute("data-variant"), variant);
    const geometry = await page.evaluate(() => {
      const overflow = document.documentElement.scrollWidth - innerWidth;
      const controls = [...document.querySelectorAll("button, input, select, summary, a")].map(element => {
        const rect = element.getBoundingClientRect();
        return { name: element.id || element.textContent, width: rect.width, height: rect.height, left: rect.left, right: rect.right };
      });
      const style = getComputedStyle(document.documentElement);
      const tokens = Object.fromEntries(["bg", "surface", "text", "muted", "rule", "action", "on-action", "data"].map(name => [name, style.getPropertyValue(`--vp-${name}`).trim()]));
      return { overflow, controls, tokens, primary: [...document.querySelector("#vp-primary").children].map(el => el.id), rail: [...document.querySelector("#vp-rail").children].map(el => el.id) };
    });
    assert(geometry.overflow <= 0, JSON.stringify({ variant, theme, width, geometry }));
    for (const control of geometry.controls) {
      assert(control.height >= 44 && control.width >= 44, JSON.stringify(control));
      assert(control.left >= 0 && control.right <= width, JSON.stringify(control));
    }
    const ratios = {};
    for (const fg of ["text", "muted", "action", "data", "rule"]) for (const bg of ["bg", "surface"]) {
      const ratio = contrast(geometry.tokens[fg], geometry.tokens[bg]);
      ratios[`${fg}/${bg}`] = Number(ratio.toFixed(2));
      assert(ratio >= (fg === "rule" ? 3 : 4.5), `${theme} ${fg}/${bg}: ${ratio}`);
    }
    ratios["on-action/action"] = Number(contrast(geometry.tokens["on-action"], geometry.tokens.action).toFixed(2));
    assert(ratios["on-action/action"] >= 4.5);
    await page.locator("#vp-start").click();
    assert(await page.locator("#vp-range").evaluate(el => el === document.activeElement));
    await page.keyboard.press("ArrowRight");
    assert.equal(await page.locator("#vp-range").inputValue(), "40");
    assert.equal(await page.locator("#vp-value").textContent(), "40 counters");
    assert.equal(await page.locator("body").getAttribute("data-variant"), variant);
    assert.equal(await page.locator("#vp-range").evaluate(el => getComputedStyle(el).outlineStyle), "solid");
    await page.locator("#vp-answer").focus();
    await page.keyboard.press("ArrowRight");
    assert.equal(await page.locator("body").getAttribute("data-variant"), variant);
    await page.locator("#vp-answer").selectOption("sample");
    assert.match(await page.locator("#vp-answer-feedback").textContent(), /^Yes:/);
    await page.locator("#vp-answer").selectOption("bag");
    assert.match(await page.locator("#vp-answer-feedback").textContent(), /^Not established:/);
    for (const tag of ["input", "textarea", "div"]) {
      await page.evaluate(tagName => {
        const el = document.createElement(tagName);
        el.id = "vp-check-input";
        if (tagName === "div") el.contentEditable = "true";
        document.querySelector(".vp-shell").append(el);
        el.focus();
      }, tag);
      await page.keyboard.press("ArrowRight");
      assert.equal(await page.locator("body").getAttribute("data-variant"), variant);
      await page.locator("#vp-check-input").evaluate(el => el.remove());
    }
    await page.locator("#vp-next").focus();
    await page.keyboard.press("ArrowRight");
    const next = { A: "B", B: "C", C: "A" }[variant];
    assert.equal(new URL(page.url()).searchParams.get("variant"), next);
    await page.keyboard.press("ArrowLeft");
    assert.equal(await page.locator("body").getAttribute("data-variant"), variant);
    await page.locator("#vp-next").click();
    await page.locator("#vp-prev").click();
    assert.equal(await page.locator("body").getAttribute("data-variant"), variant);
    assert.equal(await page.locator("#vp-range").inputValue(), "40");
    await page.locator("summary").click();
    assert(await page.locator("details").evaluate(el => el.open));
    await page.locator("summary").click();
    assert(await page.getByRole("button", { name: "Retry unavailable" }).isDisabled());
    for (const link of await page.locator("a").all()) assert.equal(await page.locator(await link.getAttribute("href")).count(), 1);
    await page.locator("#vp-theme").click();
    assert.equal(await page.locator("html").getAttribute("saved-theme"), theme === "light" ? "dark" : "light");
    await page.locator("#vp-theme").click();
    assert.equal(await page.locator("html").getAttribute("saved-theme"), theme);
    assert(await page.evaluate(() => [...document.querySelectorAll(".vp-body *")].every(el => getComputedStyle(el).animationName === "none" && getComputedStyle(el).transitionDuration === "0s")));
    assert.equal(await page.evaluate(() => localStorage.length + sessionStorage.length), 0);
    await page.reload();
    assert.equal(await page.locator("html").getAttribute("saved-theme"), theme);
    assert.match(await page.locator("#vp-state").textContent(), /system/);
    assert.equal(await page.locator("body").getAttribute("data-variant"), variant);
    if (variant === "A" && width !== 390) await page.screenshot({ path: fileURLToPath(new URL(`./33-visual-prototype-A-${theme}-${width}.png`, import.meta.url)), fullPage: true });
    await page.emulateMedia({ colorScheme: theme === "light" ? "dark" : "light" });
    await page.waitForFunction(expected => document.documentElement.getAttribute("saved-theme") === expected, theme === "light" ? "dark" : "light");
    assert.deepEqual(errors, []);
    results.push({ variant, theme, width, overflow: geometry.overflow, ratios, primary: geometry.primary, rail: geometry.rail });
    await context.close();
  }
  console.log(JSON.stringify({ passed: results.length, results }, null, 2));
} finally {
  if (browser) await browser.close();
  await new Promise(resolve => server.close(resolve));
}
