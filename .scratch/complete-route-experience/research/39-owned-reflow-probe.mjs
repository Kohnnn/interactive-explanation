import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
const root = path.resolve(process.argv[2] || "interactive-explanation");
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
  for (const route of routes) {
    const context = await smoke.createThemeContext(browser, { theme: "light", stored: true, viewport: { width: 320, height: 844 } });
    const page = await context.newPage();
    const result = { slug: route.slug };
    try {
      await page.goto(`http://127.0.0.1:4222/interactive-explanation/${route.slug}/`);
      await smoke.waitForManifestRouteReady(page, route);
      await page.waitForLoadState("networkidle");
      result.inspect = await page.evaluate(() => {
        const describe = e => {
          const r = e.getBoundingClientRect(), s = getComputedStyle(e);
          return { tag: e.tagName, id: e.id, class: e.getAttribute("class"), text: e.textContent.trim().slice(0, 90), left: r.left, right: r.right, width: r.width, scrollWidth: e.scrollWidth, clientWidth: e.clientWidth, display: s.display, minWidth: s.minWidth, overflow: s.overflow, whiteSpace: s.whiteSpace, padding: s.padding, font: s.font, parent: e.parentElement?.outerHTML.slice(0, 350) };
        };
        return { details: [...document.querySelectorAll("#f1-container, #f1-chart, #f1-legend, #scrolly > article > section > p")].map(e => ({html:e.outerHTML.slice(0,200),width:getComputedStyle(e).width,height:getComputedStyle(e).height,grid:getComputedStyle(e).gridTemplateColumns,rows:getComputedStyle(e).gridTemplateRows,align:getComputedStyle(e).alignSelf,margin:getComputedStyle(e).margin,box:getComputedStyle(e).boxSizing})), width: document.documentElement.scrollWidth, offenders: [...document.querySelectorAll("body *")].filter(e => { const r = e.getBoundingClientRect(); return r.width && (r.right > innerWidth + 1 || r.left < -1) && !e.closest("math, .story-mobile-bar, .viz-scroll"); }).map(describe), textOverflow: [...document.querySelectorAll("p, h1, h2, h3, span, div")].filter(e => e.scrollWidth > e.clientWidth + 1 && e.clientWidth && getComputedStyle(e).overflow === "visible" && !e.closest("svg, math, .katex, .story-mobile-bar, .viz-scroll")).map(describe) };
      });
      assert(result.inspect.width <= 321, `Overflow ${result.inspect.width - 320}px`);
      result.status = "passed";
    } catch (error) { result.status = "failed"; result.error = error.message; failures++; }
    fs.writeSync(output, JSON.stringify(result, null, 2) + "\n");
    console.log(result.slug, result.status, result.error || "");
    await context.close();
  }
} finally { fs.closeSync(output); await browser.close(); await new Promise(resolve => server.close(resolve)); }
process.exitCode = failures ? 1 : 0;
