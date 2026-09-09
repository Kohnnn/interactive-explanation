import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { createSmokeServer } from "./smoke/server.mjs";
import { baseUrl, host, port, mountPath, createThemeContext, waitForManifestRouteReady, waitForDocumentLayout, createRuntimeMonitor } from "./smoke-bundle.mjs";
import { verifySimNative } from "./sim-reference.mjs";

const [output, ...extra] = process.argv.slice(2);
assert(output && !extra.length, "Usage: node tools/reproduce-sim-resize.mjs <outside-source.json>");
const destination = path.resolve(output);
const relative = path.relative(process.cwd(), fs.realpathSync(path.dirname(destination)));
assert(relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative), "Evidence must be outside source");
const fd = fs.openSync(destination, "wx");
const route = JSON.parse(fs.readFileSync("routes.manifest.json", "utf8")).find(row => row.slug === "sim");
const cell = { route, viewport: { name: "mobile", width: 390, height: 844 }, theme: "light" };
const evidence = { cell: "sim/mobile/light", performance: "not measured", referenceEmitted: false };
let browser;
let server;
try {
  server = await createSmokeServer({ rootDir: process.cwd(), host, port, mountPath }).start();
  browser = await chromium.launch({ headless: true });
  evidence.browser = browser.version();
  try { evidence.native = await verifySimNative(browser, cell); }
  catch (error) { evidence.native = { status: "failed", message: error.message }; }
  const context = await createThemeContext(browser, { theme: "light", stored: true, viewport: cell.viewport });
  try {
    const page = await context.newPage();
    const clean = createRuntimeMonitor(page, { networkPolicy: route.experience.networkPolicy });
    await page.goto(`${baseUrl}sim/?paused=1`, { waitUntil: "load" });
    await waitForManifestRouteReady(page, route);
    const snapshot = () => page.evaluate(() => ({
      model: JSON.stringify(Model.data), states: Grid.array.flat().map(agent => agent.stateID), playing: Model.isPlaying,
      tiles: Grid.dom.querySelectorAll(":scope > div > div").length,
      emptyTiles: [...Grid.dom.querySelectorAll(":scope > div > div")].filter(tile => tile.textContent === "").length,
      rendered: Grid.array.every((row, y) => row.every((agent, x) => Grid.dom.children[y].children[x].textContent === Model.getStateByID(agent.stateID).icon)),
      tileSize: Grid.tileSize, events: window.__resizeEvidence || [],
    }));
    await page.evaluate(() => {
      window.__resizeEvidence = [];
      subscribe("ui/resize", () => window.__resizeEvidence.push("ui/resize"));
      subscribe("/grid/updateAgents", () => window.__resizeEvidence.push("/grid/updateAgents"));
    });
    const initialStates = await page.evaluate(() => Grid.array.flat().map(agent => agent.stateID).join(","));
    await page.locator("#play_pause").click();
    await page.waitForFunction(previous => Grid.array.flat().map(agent => agent.stateID).join(",") !== previous, initialStates, { timeout: 5000 });
    await page.locator("#play_pause").click();
    evidence.before = await snapshot();
    assert.equal(evidence.before.rendered, true);
    assert(evidence.before.emptyTiles < 1320, "Need visible evolved icons to detect render loss");
    await page.setViewportSize({ width: 400, height: 844 });
    await waitForDocumentLayout(page);
    evidence.afterResize = await snapshot();
    assert.equal(evidence.afterResize.model, evidence.before.model);
    assert.deepEqual(evidence.afterResize.states, evidence.before.states);
    assert.equal(evidence.afterResize.playing, false);
    await page.evaluate(() => publish("/grid/updateAgents"));
    evidence.afterDiagnosticRender = await snapshot();
    assert.equal(evidence.afterDiagnosticRender.model, evidence.before.model);
    assert.deepEqual(evidence.afterDiagnosticRender.states, evidence.before.states);
    assert.equal(evidence.afterDiagnosticRender.rendered, true);
    await clean.ready();
    await clean("Sim resize reproduction");
    evidence.status = evidence.native.status === "passed" && evidence.afterResize.rendered ? "passed" : "failed-native-acceptance";
    process.exitCode = evidence.status === "passed" ? 0 : 1;
  } finally { await context.close(); }
} catch (error) {
  evidence.status = "diagnostic-error";
  evidence.error = error.stack || error.message;
  process.exitCode = 1;
} finally {
  await browser?.close();
  if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
  fs.writeFileSync(fd, JSON.stringify(evidence, null, 2) + "\n");
  fs.closeSync(fd);
  console.log(JSON.stringify({ status: evidence.status, native: evidence.native, afterResize: evidence.afterResize && { tiles: evidence.afterResize.tiles, emptyTiles: evidence.afterResize.emptyTiles, rendered: evidence.afterResize.rendered, events: evidence.afterResize.events }, renderHookRestores: evidence.afterDiagnosticRender?.rendered, output: destination }));
}
