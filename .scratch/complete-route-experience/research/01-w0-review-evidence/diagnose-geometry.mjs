import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";
const root = path.resolve("interactive-explanation");
const require = createRequire(path.join(root, "package.json"));
let source = fs.readFileSync(path.join(root, "tools/smoke-bundle.mjs"), "utf8");
source = source.replace('from "playwright"', `from ${JSON.stringify(pathToFileURL(path.join(path.dirname(require.resolve("playwright")), "index.mjs")).href)}`);
source = source.replace(/(from |import )(["'])(\.\.?\/[^"']+)\2/g, (match, prefix, quote, relative) => `${prefix}${quote}${pathToFileURL(path.resolve(root, "tools", relative)).href}${quote}`);
source = source.replace('path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")', JSON.stringify(root));
source = source.replace('const rectKeys = ["top", "right", "bottom", "left", "width", "height"];', 'rawConsoleLog("DIAGNOSTIC=" + JSON.stringify({ label, actual: actual.rect, expected: expected.rect, actualCss: actual.css, expectedCss: expected.css })); const rectKeys = ["top", "right", "bottom", "left", "width", "height"];');
source = source.replace('console.error(error.stack || error.message || String(error));', 'console.error(error.message || String(error));');
if (process.env.DIAGNOSTIC_SETTLE === "1") {
  source = source.replace('measured[viewport.name] = await measureRuntimeSurface(page, route, label);', 'await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(3000); rawConsoleLog("READINESS=" + JSON.stringify(await page.evaluate(() => ({ readyState: document.readyState, fonts: document.fonts.status, bodyFont: getComputedStyle(document.body).fontFamily })))); measured[viewport.name] = await measureRuntimeSurface(page, route, label);');
}
try {
  await import("data:text/javascript;base64," + Buffer.from(source).toString("base64"));
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
