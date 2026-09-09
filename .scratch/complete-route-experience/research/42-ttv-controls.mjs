import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const root = path.resolve(process.argv[2] || "interactive-explanation");
const before = process.argv.includes("--before");
const require = createRequire(path.join(root, "package.json"));
const { chromium } = require("playwright");
const { createSmokeServer } = await import(pathToFileURL(path.join(root, "tools/smoke/server.mjs")));
const server = await createSmokeServer({ rootDir: root, host: "127.0.0.1", port: 4242, mountPath: "/interactive-explanation/" }).start();
const browser = await chromium.launch();
const results = [];
try {
  for (const viewport of [{ width: 1400, height: 1000 }, { width: 390, height: 844 }, { width: 320, height: 844 }]) {
    for (const theme of ["light", "dark"]) for (let sample = 1; sample <= 3; sample++) {
      const context = await browser.newContext({ viewport, colorScheme: theme });
      const page = await context.newPage();
      const errors = [];
      const result = { viewport, theme, sample, stages: [], pointerBlocks: [], errors };
      page.setDefaultTimeout(2000);
      page.on("pageerror", error => errors.push(error.stack));
      try {
        await page.goto("http://127.0.0.1:4242/interactive-explanation/train-test-validation/");
        await page.waitForLoadState("networkidle");
        const controls = page.locator(".button-container");
        const button = page.locator('button[value="fluffiness"]');
        if (before) {
          await button.focus();
          await page.keyboard.press("Enter");
          await page.waitForTimeout(150);
          assert(errors.some(error => error.includes("reading 'includes'")), "Expected pre-existing exception");
          result.status = "reproduced";
        } else {
          assert(await controls.evaluate(element => element.inert), "Startup controls must be inert");
          for (const stage of ["startup", "model", "validation", "test", "summary", "train", "model", "train", "split", "intro", "model"]) {
            if (stage !== "startup") {
              const id = viewport.width < 950 && ["intro", "summary"].includes(stage) ? `${stage}-mobile` : stage;
              await page.locator(`#${id}`).scrollIntoViewIfNeeded();
              await page.waitForTimeout(600);
            }
            const state = await controls.evaluate(element => ({ opacity: getComputedStyle(element).opacity, inert: element.inert }));
            assert.equal(state.inert, state.opacity === "0", `${stage}: engine opacity contract`);
            const activeBefore = await page.locator("button.active").getAttribute("value");
            if (state.inert) {
              await button.focus();
              assert(!await button.evaluate(element => element === document.activeElement), `${stage}: hidden focus`);
              await page.keyboard.press("Tab");
              assert(!await page.evaluate(() => document.activeElement.closest(".button-container")), `${stage}: hidden Tab`);
              const box = await button.boundingBox();
              if (box && box.y >= 0 && box.y < viewport.height) await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
              assert.equal(await page.locator("button.active").getAttribute("value"), activeBefore, `${stage}: hidden pointer`);
            } else {
              await button.focus();
              await page.waitForTimeout(400);
              await page.keyboard.press("Enter");
              await page.waitForTimeout(150);
              assert.equal(await button.getAttribute("aria-pressed"), "true", `${stage}: Enter`);
              assert(await page.locator("#line-decision-boundary").getAttribute("x1"), `${stage}: boundary`);
              await page.locator('button[value="weight"]').evaluate(element => element.scrollIntoView({ block: "center", behavior: "instant" }));
              await page.waitForTimeout(600);
              const weight = page.locator('button[value="weight"]');
              const point = await weight.evaluate(element => {
                const box = element.getBoundingClientRect();
                const x = box.x + box.width / 2;
                for (let y = box.y + 1; y < box.bottom; y++) {
                  if (document.elementFromPoint(x, y) === element) return { x, y };
                }
                return null;
              });
              if (point) {
                await page.mouse.click(point.x, point.y);
                await page.waitForTimeout(150);
                assert.equal(await weight.getAttribute("aria-pressed"), "true", `${stage}: pointer`);
              } else {
                result.pointerBlocks.push(stage);
              }
            }
            result.stages.push({ stage, ...state });
            assert.equal(errors.length, 0, errors[0]);
          }
          result.status = "passed";
        }
      } catch (error) {
        result.status = "failed";
        result.failure = error.message;
      }
      results.push(result);
      console.log(JSON.stringify(result));
      await context.close();
    }
  }
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
if (process.argv[3] && !process.argv[3].startsWith("--")) fs.writeFileSync(process.argv[3], JSON.stringify(results, null, 2) + "\n", { flag: "wx" });
assert(results.every(result => result.status !== "failed"), "Affected route controls failed");
