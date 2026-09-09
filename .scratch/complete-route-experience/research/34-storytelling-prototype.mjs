import assert from "node:assert/strict";
import fs from "node:fs/promises";
import http from "node:http";
import { createRequire } from "node:module";
import vm from "node:vm";

const require = createRequire(new URL("../../../interactive-explanation/package.json", import.meta.url));
const { chromium } = require("playwright");
const html = await fs.readFile(new URL("./34-storytelling-prototype.html", import.meta.url), "utf8");
const scripts = [...html.matchAll(/<script(?: id="logic")?>([\s\S]*?)<\/script>/g)].map(match => match[1]);
assert.equal(scripts.length, 3);
for (const script of scripts) new vm.Script(script);
assert(!/localStorage|sessionStorage|https?:\/\/|<iframe|<canvas|<audio|<script[^>]*src=/.test(html));
const logic = vm.createContext({});
vm.runInContext(scripts[1], logic);
const plain = value => JSON.parse(JSON.stringify(value));
let purePassed = 0;
function check(name, run) { run(); purePassed++; }
check("shifted", () => assert.deepEqual(plain(logic.summarize([6, 6, 6, 6])), { mean: 6, squaredBias: 16, variance: 0, mse: 16 }));
check("variable", () => assert.deepEqual(plain(logic.summarize([6, 6, 14, 14])), { mean: 10, squaredBias: 0, variance: 16, mse: 16 }));
check("unequal alternative", () => assert.equal(logic.summarize([6, 8, 12, 14]).mse, 10));
check("transfer", () => assert.equal(logic.summarize([10, 10, 10, 10]).mse, 0));
check("sample identities", () => {
  for (const values of [[1, 2, 9], [-5, 0, 6, 12, 33], [3], [0.1, 0.7]]) {
    const result = logic.summarize(values);
    assert(Math.abs(result.mse - result.squaredBias - result.variance) < 1e-10);
  }
});
check("math guards", () => { for (const values of [[], [NaN], [Infinity], ["6"], null]) assert.throws(() => logic.summarize(values)); });
check("all invalidation positions and ordered recovery", () => {
  for (let index = 0; index < 3; index++) {
    const initial = logic.initialReceipts();
    let result = logic.receiptStep(initial, "change", index);
    assert.deepEqual(plain(result.state.map(item => item.valid)), [0, 1, 2].map(position => position < index));
    assert(initial.every(item => item.valid && item.revision === 1));
    assert.equal(result.state[index].revision, 2);
    if (index < 2) {
      const blocked = logic.receiptStep(result.state, "repair", 2);
      assert.match(blocked.message, /^Blocked:/);
      assert.deepEqual(plain(blocked.state), plain(result.state));
    }
    for (let repair = index; repair < 3; repair++) result = logic.receiptStep(result.state, "repair", repair);
    assert(result.state.every(item => item.valid));
  }
});
check("repeated mutation", () => {
  const state = logic.receiptStep(logic.receiptStep(logic.initialReceipts(), "change", 0).state, "change", 0).state;
  assert.equal(state[0].revision, 3);
  assert(state.every(item => !item.valid));
});
check("transition guards", () => { for (const [action, index] of [["mine", 0], ["change", -1], ["repair", 3], ["change", 0.5]]) assert.throws(() => logic.receiptStep(logic.initialReceipts(), action, index)); });
check("correct spelling", () => assert.match(logic.spellDegree("F#"), /Correct:.*D E F# G A B C# D/));
check("recoverable spelling", () => assert.match(logic.spellDegree("Gb"), /Try again:.*repeats G and omits F/));
check("spelling guard", () => assert.throws(() => logic.spellDegree("F")));

function luminance(hex) {
  const rgb = hex.match(/[a-f\d]{2}/gi).map(value => parseInt(value, 16) / 255).map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
  return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722;
}
function contrast(a, b) {
  const values = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (values[0] + .05) / (values[1] + .05);
}
const server = http.createServer((request, response) => {
  response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  response.end(html);
});
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
let browser;
const results = [];
const ratios = {};
try {
  browser = await chromium.launch({ headless: true, executablePath: "/home/compute_01/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome" });
  console.log(`Environment: Node ${process.version}; Playwright ${require("playwright/package.json").version}; Chromium ${browser.version()}; ${process.platform}`);
  console.log(`Inline syntax: ${scripts.length}/3 passed; pure check groups: ${purePassed}/12 passed`);
  for (const theme of ["light", "dark"]) for (const width of [1400, 390, 320]) {
    const context = await browser.newContext({ viewport: { width, height: width === 1400 ? 1000 : 844 }, colorScheme: theme, reducedMotion: "reduce", hasTouch: true });
    const page = await context.newPage();
    const errors = [];
    const remote = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("request", request => { if (!request.url().startsWith("http://127.0.0.1:")) remote.push(request.url()); });
    await page.goto(`http://127.0.0.1:${server.address().port}/`);
    const text = id => page.locator(`#${id}`).textContent();
    const activate = async (selector, method = "click") => {
      const control = page.locator(selector);
      if (method === "keyboard") { await control.focus(); await page.keyboard.press("Enter"); }
      else if (method === "space") { await control.focus(); await page.keyboard.press("Space"); }
      else if (method === "touch") await control.tap();
      else await control.click();
    };
    const geometry = async () => {
      const measured = await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth - innerWidth,
        controls: [...document.querySelectorAll("button, summary, a")].map(element => {
          const rect = element.getBoundingClientRect();
          return { name: element.textContent, width: rect.width, height: rect.height, left: rect.left, right: rect.right };
        }),
      }));
      assert(measured.overflow <= 0, JSON.stringify(measured));
      for (const control of measured.controls) assert(control.width >= 44 && control.height >= 44 && control.left >= 0 && control.right <= width, JSON.stringify(control));
      return measured;
    };
    const before = await geometry();
    assert.equal(await page.locator("html").getAttribute("saved-theme"), theme);
    const tokens = await page.evaluate(() => Object.fromEntries(["bg", "surface", "text", "muted", "rule", "action", "on-action", "data"].map(name => [name, getComputedStyle(document.documentElement).getPropertyValue(`--sp-${name}`).trim()])));
    const cellRatios = {};
    for (const fg of ["text", "muted", "action", "data", "rule"]) for (const bg of ["bg", "surface"]) {
      const ratio = contrast(tokens[fg], tokens[bg]);
      assert(ratio >= (fg === "rule" ? 3 : 4.5));
      cellRatios[`${fg}/${bg}`] = Number(ratio.toFixed(2));
    }
    const actionRatio = contrast(tokens["on-action"], tokens.action);
    assert(actionRatio >= 4.5);
    cellRatios["on-action/action"] = Number(actionRatio.toFixed(2));
    ratios[theme] = cellRatios;
    const initialEssay = await text("essay-values");
    const initialEssayFeedback = await text("essay-feedback");
    assert.match(initialEssay, /mean 6; squared bias 16; variance 0; MSE 16 = 16 \+ 0/);
    await activate("#variable", "touch");
    assert.match(await text("essay-values"), /mean 10; squared bias 0; variance 16; MSE 16 = 0 \+ 16/);
    await activate("#center", "keyboard");
    assert.match(await text("essay-feedback"), /^Try again:/);
    await activate("#equal", "space");
    assert.match(await text("essay-feedback"), /^Yes: both sets have MSE 16/);
    await activate("#stable", "keyboard");
    assert.equal(await text("essay-values"), initialEssay);
    const initialLab = await text("lab-feedback");
    const receiptTexts = async () => Promise.all([0, 1, 2].map(index => text(`receipt-${index}`)));
    const initialReceipts = await receiptTexts();
    for (let index = 0; index < 3; index++) {
      await activate(`[data-change="${index}"]`, "touch");
      for (let position = 0; position < 3; position++) assert.match((await receiptTexts())[position], position < index ? /· valid / : /· invalid /);
      const changed = await receiptTexts();
      if (index < 2) {
        await activate('[data-repair="2"]', "keyboard");
        assert.match(await text("lab-feedback"), /^Blocked:/);
        assert.deepEqual(await receiptTexts(), changed);
      }
      for (let repair = index; repair < 3; repair++) await activate(`[data-repair="${repair}"]`, "keyboard");
      assert((await receiptTexts()).every(value => value.includes("· valid ")));
      await activate("#lab-reset", "space");
      assert.deepEqual(await receiptTexts(), initialReceipts);
      assert.equal(await text("lab-feedback"), initialLab);
    }
    const initialPractice = await text("practice-feedback");
    for (const method of ["touch", "keyboard"]) {
      await activate("#flat", method);
      assert.match(await text("practice-feedback"), /^Try again:.*repeats G and omits F/);
      await activate("#sharp", method);
      assert.match(await text("practice-feedback"), /^Correct:.*D E F# G A B C# D/);
      assert.match(await text("practice-feedback"), /2–2–1–2–2–2–1/);
    }
    await geometry();
    for (const section of ["essay", "lab", "practice"]) await activate(`#${section} summary`, "keyboard");
    assert(await page.locator("details").evaluateAll(elements => elements.every(element => element.open)));
    await geometry();
    for (const section of ["essay", "lab", "practice"]) {
      await activate(`#${section}-reset`, "space");
      assert.equal(await page.locator(`#${section} details`).evaluate(element => element.open), false);
    }
    assert.equal(await text("essay-values"), initialEssay);
    assert.equal(await text("essay-feedback"), initialEssayFeedback);
    assert.equal(await text("practice-feedback"), initialPractice);
    assert.equal(await page.locator("#practice-reset").evaluate(element => getComputedStyle(element).outlineStyle), "solid");
    await page.keyboard.press("Tab");
    assert(await page.locator("#practice summary").evaluate(element => element === document.activeElement));
    for (const link of await page.locator("a").all()) assert.equal(await page.locator(await link.getAttribute("href")).count(), 1);
    assert.equal(await page.locator('output[aria-live="polite"][aria-atomic="true"]').count(), 4);
    const opposite = theme === "light" ? "dark" : "light";
    await activate("#variable");
    await activate('[data-change="0"]');
    await activate("#sharp");
    const stateBeforeTheme = await page.locator("output").allTextContents();
    await activate("#theme", "touch");
    assert.equal(await page.locator("html").getAttribute("saved-theme"), opposite);
    assert.deepEqual(await page.locator("output").allTextContents(), stateBeforeTheme);
    await geometry();
    await activate("#theme", "keyboard");
    assert.equal(await page.locator("html").getAttribute("saved-theme"), theme);
    await page.emulateMedia({ colorScheme: opposite });
    assert.equal(await page.locator("html").getAttribute("saved-theme"), theme);
    await page.reload();
    assert.equal(await page.locator("html").getAttribute("saved-theme"), opposite);
    assert.equal(await text("essay-values"), initialEssay);
    assert.equal(await text("practice-feedback"), initialPractice);
    assert.deepEqual(await receiptTexts(), initialReceipts);
    await page.emulateMedia({ colorScheme: theme });
    await page.waitForFunction(expected => document.documentElement.getAttribute("saved-theme") === expected, theme);
    assert.equal(await page.evaluate(() => localStorage.length + sessionStorage.length), 0);
    assert(await page.evaluate(() => [...document.querySelectorAll("body *")].every(element => getComputedStyle(element).animationName === "none" && getComputedStyle(element).transitionDuration === "0s")));
    assert.deepEqual(errors, []);
    assert.deepEqual(remote, []);
    results.push(`${width}x${width === 1400 ? 1000 : 844}/${theme}: PASS (overflow ${before.overflow}px; ${before.controls.length} controls >=44x44; interactions/reset/theme PASS)`);
    await context.close();
  }
  for (const result of results) console.log(result);
  console.log(`Token contrast: ${JSON.stringify(ratios)}`);
  console.log(`PASS: ${purePassed}/12 pure check groups; ${results.length}/6 viewport-theme cells; no page errors or external requests.`);
} finally {
  if (browser) await browser.close();
  await new Promise(resolve => server.close(resolve));
}
