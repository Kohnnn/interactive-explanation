import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { chromium } from "../../../interactive-explanation/node_modules/playwright/index.mjs";
import { createSmokeServer } from "../../../interactive-explanation/tools/smoke/server.mjs";

const root = new URL("../../../interactive-explanation", import.meta.url).pathname;
const output = path.resolve(process.argv[2]);
assert(!fs.existsSync(output), "Evidence output already exists");
const quick = process.argv.includes("--quick");
const server = await createSmokeServer({ rootDir: root, host: "127.0.0.1", port: 4245, mountPath: "/interactive-explanation/" }).start();
const browser = await chromium.launch();
const results = [];
const source = Object.fromEntries(["train-test-validation/index.html", "train-test-validation/a11y-state.js", "train-test-validation/js.6c47f979.js", "train-test-validation/main.67dee0d6.css", "tools/smoke-bundle.mjs"].map(file => [file, createHash("sha256").update(fs.readFileSync(path.join(root, file))).digest("hex")]));
try {
  for (const viewport of quick ? [{ width: 390, height: 844 }] : [{ width: 1400, height: 1000 }, { width: 390, height: 844 }, { width: 320, height: 844 }]) {
    for (const theme of quick ? ["light"] : ["light", "dark"]) for (let sample = 1; sample <= (quick ? 1 : 3); sample++) {
      const context = await browser.newContext({ viewport, colorScheme: theme });
      const page = await context.newPage();
      page.setDefaultTimeout(5000);
      const result = { route: "train-test-validation", viewport, theme, sample, errors: [], stages: [], failures: [] };
      page.on("pageerror", error => result.errors.push(error.message));
      try {
        await page.goto("http://127.0.0.1:4245/interactive-explanation/train-test-validation/", { waitUntil: "load" });
        await page.evaluate(() => document.fonts.ready);
        await page.waitForSelector("#chart svg");
        await page.waitForFunction(() => document.querySelector(".button-container").inert);
        result.performance = await page.evaluate(() => ({ navigation: performance.getEntriesByType("navigation")[0].toJSON(), resources: performance.getEntriesByType("resource").map(({ name, transferSize, duration }) => ({ name, transferSize, duration })) }));
        for (const stage of ["startup", "model", "validation", "test", "summary", "train", "model", "train", "split", "intro", "model"]) {
          if (stage !== "startup") {
            const id = viewport.width < 950 && ["intro", "summary"].includes(stage) ? `${stage}-mobile` : stage;
            await page.locator(`#${id}`).evaluate(element => element.scrollIntoView({ block: "center", behavior: "instant" }));
          }
          await page.waitForFunction(() => {
            const control = document.querySelector(".button-container");
            const rect = control.getBoundingClientRect();
            const state = JSON.stringify([scrollY, rect.x, rect.y, rect.width, rect.height, control.style.opacity, control.inert]);
            const previous = window.__visibleControlsStable;
            window.__visibleControlsStable = { state, since: previous?.state === state ? previous.since : performance.now() };
            return performance.now() - window.__visibleControlsStable.since >= 150 && ["0", "1"].includes(getComputedStyle(control).opacity) && control.inert === (control.style.opacity !== "1");
          }, null, { timeout: 5000 });
          const record = await page.evaluate(stage => {
            const rect = element => { const r = element.getBoundingClientRect(); const c = getComputedStyle(element); return { tag: element.tagName, id: element.id, className: String(element.className), x: r.x, y: r.y, width: r.width, height: r.height, top: c.top, position: c.position, zIndex: c.zIndex, transform: c.transform, pointerEvents: c.pointerEvents }; };
            const controls = document.querySelector(".button-container");
            return { stage, scrollY, opacity: controls.style.opacity, inert: controls.inert, documentWidth: document.documentElement.scrollWidth, layers: ["#top-bar", "header", "figure", ".button-container"].map(selector => ({ selector, ...rect(document.querySelector(selector)) })), protected: [...document.querySelectorAll("#chart svg, #chart canvas, #chart image, #chart img")].map(element => ({ ...rect(element), widthAttribute: element.getAttribute("width"), heightAttribute: element.getAttribute("height"), viewBox: element.getAttribute("viewBox") })), buttons: [...controls.querySelectorAll("button")].map(element => { const r = element.getBoundingClientRect(); const x = r.x + r.width / 2; const y = r.y + r.height / 2; return { value: element.value, ...rect(element), xCenter: x, yCenter: y, receives: element.contains(document.elementFromPoint(x, y)), stack: document.elementsFromPoint(x, y).map(node => `${node.tagName}#${node.id}.${String(node.className)}`) }; }) };
          }, stage);
          record.actualSections = await page.evaluate(() => [...document.querySelectorAll("section[data-index]")].filter(element => { const rect = element.getBoundingClientRect(); return rect.top < innerHeight && rect.bottom > 0; }).map(element => ({ id: element.id, index: element.dataset.index })));
          if (stage === "model") assert.equal(record.opacity, "1", "Model controls not ready");
          if (stage === "train") assert.equal(record.opacity, "0", "Train controls not hidden");
          if (stage === "model" && sample === 1 && !result.stages.some(record => record.stage === "model")) {
            record.screenshot = `${output}.${viewport.width}-${theme}-model.png`;
            await page.screenshot({ path: record.screenshot });
          }
          record.paint = await page.evaluate(() => {
            const article = document.querySelector("#scrolly > article");
            const figure = document.querySelector("#scrolly > figure");
            const workspace = document.querySelector("#main-wrapper");
            const bounds = workspace.getBoundingClientRect();
            const overlap = [...article.querySelectorAll("p, h2")].some(element => {
              const rect = element.getBoundingClientRect();
              return rect.width > 0 && rect.height > 0 && rect.left < bounds.right && rect.right > bounds.left && rect.top < bounds.bottom && rect.bottom > bounds.top;
            });
            return { overlap, isolation: getComputedStyle(figure.parentElement).isolation, articleZ: getComputedStyle(article).zIndex, figureZ: getComputedStyle(figure).zIndex, background: getComputedStyle(workspace).backgroundColor, articleOverflow: getComputedStyle(article).overflow, workspaceBottom: bounds.bottom };
          });
          if (viewport.width <= 750 && record.paint.overlap) {
            const paint = record.paint;
            if (paint.isolation !== "isolate" || Number(paint.figureZ) <= Number(paint.articleZ) || !(/^(rgb\(|color\(srgb )/.test(paint.background) && !paint.background.includes("/"))) result.failures.push(`${stage}: prose paints over non-opaque workspace`);
            assert.equal(paint.articleOverflow, "visible", "Prose must remain unclipped");
          }
          result.stages.push(record);
          if (record.inert) {
            const active = await page.locator("button.active").getAttribute("value");
            for (const button of record.buttons) {
              const target = page.locator(`button[value="${button.value}"]`);
              await target.focus();
              assert(!await target.evaluate(element => element === document.activeElement), "Hidden control accepted focus");
              if (button.yCenter >= 0 && button.yCenter < viewport.height) await page.mouse.click(button.xCenter, button.yCenter);
            }
            await page.keyboard.press("Tab");
            assert(!await page.evaluate(() => document.activeElement.closest(".button-container")), "Hidden control accepted Tab");
            assert.equal(await page.locator("button.active").getAttribute("value"), active);
          } else if (record.buttons.every(button => button.y + button.height <= 0 || button.y >= viewport.height)) {
            record.pointerApplicability = "Controls outside viewport at this actual stage; no pointer acceptance claimed";
          } else {
            for (const button of record.buttons) {
              if (!button.receives) result.failures.push(`${stage}/${button.value}: ${button.stack[0] || "outside viewport"}`);
            }
            if (record.buttons.some(button => !button.receives)) {
              const screenshot = `${output}.${viewport.width}-${theme}-${sample}-${result.stages.length}.png`;
              await page.screenshot({ path: screenshot });
              record.screenshot = screenshot;
            } else {
              for (const value of ["fluffiness", "weight"]) {
                await page.locator(`button[value="${value}"]`).click();
                await page.waitForFunction(value => document.querySelector(`button[value="${value}"]`).getAttribute("aria-pressed") === "true" && document.querySelector("#line-decision-boundary")?.hasAttribute("x1"), value);
              }
            }
            await page.locator('button[value="fluffiness"]').focus();
            await page.keyboard.press("Enter");
            await page.waitForFunction(() => document.querySelector('button[value="fluffiness"]').getAttribute("aria-pressed") === "true");
          }
        }
        assert.deepEqual(result.errors, []);
      } catch (error) { result.failures.push(error.message); }
      results.push(result);
      console.log(JSON.stringify({ viewport, theme, sample, failures: result.failures }));
      await context.close();
    }
  }
} finally {
  await browser.close();
  server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
  fs.writeFileSync(output, JSON.stringify({ source, results }, null, 2) + "\n", { flag: "wx" });
}
assert(results.every(result => !result.failures.length), "Visible controls failed; all failures retained");
