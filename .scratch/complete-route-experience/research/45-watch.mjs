import assert from "node:assert/strict";
import fs from "node:fs";
import { chromium } from "../../../interactive-explanation/node_modules/playwright/index.mjs";
import { createSmokeServer } from "../../../interactive-explanation/tools/smoke/server.mjs";

const root = new URL("../../../interactive-explanation", import.meta.url).pathname;
const source = fs.readFileSync(`${root}/tools/smoke-bundle.mjs`, "utf8");
const start = source.indexOf("  const reducedContext = await browser.newContext(", source.indexOf("async function smokeInteractiveMechanicalWatch"));
const end = source.indexOf('  console.log("OK interactive-mechanical-watch reduced motion");', start);
assert(start > 0 && end > start);
const task = new Function("browser", "assert", "assertRoute", "canvasSelector", "label", `return (async () => {${source.slice(start, end)}})();`);
const server = await createSmokeServer({ rootDir: root, host: "127.0.0.1", port: 4245, mountPath: "/interactive-explanation/" }).start();
const browser = await chromium.launch();
const results = [];
try {
  for (let sample = 1; sample <= 3; sample++) {
    const errors = [];
    try {
      await task(browser, assert, async (page, route, selector) => {
        page.on("pageerror", error => errors.push(error.message));
        await page.goto(`http://127.0.0.1:4245/interactive-explanation/${route}`, { waitUntil: "load" });
        await page.waitForSelector(selector, { timeout: 30000 });
      }, "[data-exploded-canvas] canvas", "Watch reduced motion");
      assert.deepEqual(errors, []);
      results.push({ sample, status: "passed", errors });
    } catch (error) { results.push({ sample, status: "failed", failure: error.message, errors }); }
    console.log(JSON.stringify(results.at(-1)));
  }
} finally {
  await browser.close();
  server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
  fs.writeFileSync(process.argv[2], JSON.stringify(results, null, 2) + "\n", { flag: "wx" });
}
assert(results.every(result => result.status === "passed"));
