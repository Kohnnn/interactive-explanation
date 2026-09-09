import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import os from "node:os";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { contentTypes } from "../../../interactive-explanation/tools/smoke/server.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = fs.realpathSync(path.resolve(here, "../../../interactive-explanation"));
const require = createRequire(new URL("../../../interactive-explanation/package.json", import.meta.url));
const mount = "/interactive-explanation/";
const output = path.join(here, "32-browser-baseline.json");
const report = path.join(here, "32-browser-baseline.md");
const command = "node .scratch/complete-route-experience/research/32-browser-baseline.mjs";
const executionCommand = process.env.BASELINE_CHROMIUM_EXECUTABLE ? `BASELINE_CHROMIUM_EXECUTABLE=${JSON.stringify(process.env.BASELINE_CHROMIUM_EXECUTABLE)} ${command}` : command;

function contained(base, target) {
  const relative = path.relative(base, target);
  return relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative));
}

function resolveRequest(raw, base = root) {
  const pathname = decodeURIComponent(new URL(raw, "http://127.0.0.1").pathname);
  if (!pathname.startsWith(mount) || pathname.includes("\0")) throw new Error("outside-mount");
  const relative = pathname.slice(mount.length);
  const target = path.resolve(base, relative + (relative.endsWith("/") || !relative ? "index.html" : ""));
  if (!contained(base, target)) throw new Error("outside-root");
  return target;
}

function stats(values) {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length ? { count: sorted.length, median: sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2, min: sorted[0], max: sorted.at(-1) } : { count: 0, median: null, min: null, max: null };
}

function identity() {
  try {
    return {
      head: execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8", timeout: 5000 }).trim(),
      dirtyCount: execFileSync("git", ["status", "--porcelain=v1", "-z", "--untracked-files=all"], { cwd: root, encoding: "utf8", timeout: 5000 }).split("\0").filter((entry) => /^[ MADRCU?!]{2} /.test(entry)).length,
    };
  } catch { return { status: "blocked", reason: "git-identity-unavailable" }; }
}

function diagnostic(text) {
  const patterns = ["Timeout", "ReferenceError", "TypeError", "SyntaxError", "ERR_BLOCKED", "ERR_FAILED", "404", "WebGL", "AudioContext", "CORS", "Content Security Policy", "Target closed", "crash"];
  return { category: patterns.find((pattern) => text.toLowerCase().includes(pattern.toLowerCase())) || "other", fingerprint: createHash("sha256").update(text).digest("hex").slice(0, 16) };
}

function atomicJson(data) {
  const temporary = `${output}.tmp`;
  fs.writeFileSync(temporary, JSON.stringify(data, null, 2) + "\n", { mode: 0o600 });
  fs.renameSync(temporary, output);
}

function server() {
  return http.createServer((req, res) => {
    try {
      if (!["GET", "HEAD"].includes(req.method)) { res.writeHead(405); res.end(); return; }
      const target = fs.realpathSync(resolveRequest(req.url));
      if (!contained(root, target) || !fs.statSync(target).isFile()) { res.writeHead(403); res.end(); return; }
      res.writeHead(200, { "Content-Type": contentTypes[path.extname(target).toLowerCase()] || ({ ".wasm": "application/wasm", ".mp4": "video/mp4" }[path.extname(target)] || "application/octet-stream"), "Cache-Control": "no-store" });
      if (req.method === "HEAD") { res.end(); return; }
      const stream = fs.createReadStream(target);
      stream.on("error", () => res.destroy());
      res.on("close", () => stream.destroy());
      stream.pipe(res);
    } catch (error) { res.writeHead(error.code === "ENOENT" ? 404 : 403); res.end(); }
  });
}

async function selfTest() {
  assert.equal(resolveRequest(mount), path.join(root, "index.html"));
  assert.throws(() => resolveRequest(`${mount}..%2fprivate`));
  assert.throws(() => resolveRequest(`${mount}%2fetc/passwd`));
  assert.throws(() => resolveRequest("/elsewhere/"));
  assert.throws(() => resolveRequest(`${mount}%zz`));
  assert.equal(contained(root, `${root}-sibling/index.html`), false);
  assert.deepEqual(stats([9, 1, 3]), { count: 3, median: 3, min: 1, max: 9 });
  assert.equal(stats([2, 4]).median, 3);
  assert.equal(stats([]).median, null);
  const instance = server();
  await new Promise((resolve) => instance.listen(0, "127.0.0.1", resolve));
  try {
    const origin = `http://127.0.0.1:${instance.address().port}`;
    assert.equal((await fetch(origin + mount)).status, 200);
    assert.equal((await fetch(origin + mount + "..%2fpackage.json")).status, 403);
    assert.equal((await fetch(origin + mount + "%zz")).status, 403);
    assert.equal((await fetch(origin + mount, { method: "POST" })).status, 405);
  } finally { instance.closeAllConnections(); await new Promise((resolve) => instance.close(resolve)); }
  console.log("self-test passed");
}

async function capture(browser, origin, cell) {
  const context = await browser.newContext({ viewport: cell.viewport, deviceScaleFactor: 1, colorScheme: "light", reducedMotion: "no-preference", serviceWorkers: "block", acceptDownloads: false });
  const events = { consoleErrors: [], consoleWarnings: [], pageErrors: [], localHttpFailures: [], unexpectedNetworkFailures: [], blockedExternal: {}, blockedWebSockets: 0, droppedDiagnostics: 0 };
  const blocked = new WeakSet();
  const add = (key, value) => { if (events[key].length < 40) events[key].push(value); else events.droppedDiagnostics++; };
  const started = Date.now();
  try {
    await context.addInitScript((theme) => { try { localStorage.setItem("theme", theme); } catch {} }, cell.theme);
    await context.route("**/*", async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      if (["data:", "blob:", "about:"].includes(url.protocol) || url.origin === origin) { await route.continue(); return; }
      blocked.add(request);
      events.blockedExternal[request.resourceType()] = (events.blockedExternal[request.resourceType()] || 0) + 1;
      await route.abort("blockedbyclient");
    });
    await context.routeWebSocket("**/*", (socket) => { events.blockedWebSockets++; socket.close(); });
    const page = await context.newPage();
    page.on("console", (message) => {
      if (message.type() === "error") add("consoleErrors", diagnostic(message.text()));
      if (message.type() === "warning") add("consoleWarnings", diagnostic(message.text()));
    });
    page.on("pageerror", (error) => add("pageErrors", diagnostic(error.message)));
    page.on("response", (response) => {
      const url = new URL(response.url());
      if (url.origin === origin && response.status() >= 400) add("localHttpFailures", { path: url.pathname, status: response.status() });
    });
    page.on("requestfailed", (request) => {
      if (blocked.has(request)) return;
      const url = new URL(request.url());
      add("unexpectedNetworkFailures", { local: url.origin === origin, path: url.origin === origin ? url.pathname : null, ...diagnostic(request.failure()?.errorText || "unknown") });
    });
    let navigationError = null;
    let response = null;
    try { response = await page.goto(origin + mount + (cell.slug === "atlas" ? "" : `${cell.slug}/`), { waitUntil: "domcontentloaded", timeout: 12000 }); }
    catch (error) { navigationError = diagnostic(error.message); }
    let loadWait = "reached";
    try { await page.waitForLoadState("load", { timeout: 700 }); } catch { loadWait = "bounded-wait-expired"; }
    await page.waitForTimeout(200);
    const snapshot = await Promise.race([
      page.evaluate((selectors) => {
        const visible = (node) => {
          const style = getComputedStyle(node);
          const rect = node.getBoundingClientRect();
          return style.display !== "none" && style.visibility !== "hidden" && style.visibility !== "collapse" && Number(style.opacity) !== 0 && rect.width > 0 && rect.height > 0;
        };
        const count = (selector) => {
          if (!selector) return null;
          try {
            const nodes = [...document.querySelectorAll(selector)];
            return { total: nodes.length, visible: nodes.filter(visible).length, inViewport: nodes.filter((node) => { const r = node.getBoundingClientRect(); return visible(node) && r.bottom > 0 && r.right > 0 && r.top < innerHeight && r.left < innerWidth; }).length };
          } catch { return { status: "unsupported", reason: "invalid-selector" }; }
        };
        const resources = performance.getEntriesByType("resource");
        const navigation = performance.getEntriesByType("navigation")[0];
        const timing = navigation ? Object.fromEntries(["startTime", "duration", "responseStart", "responseEnd", "domInteractive", "domContentLoadedEventEnd", "loadEventEnd", "transferSize", "encodedBodySize", "decodedBodySize"].map((key) => [key, typeof navigation[key] === "number" ? navigation[key] : null])) : null;
        const transferSupported = resources.length > 0 ? resources.every((resource) => typeof resource.transferSize === "number") : null;
        const primary = selectors.primary ? document.querySelector(selectors.primary) : document.querySelector("main");
        const r = primary?.getBoundingClientRect();
        return {
          capturedAtPerformanceMs: performance.now(), readyState: document.readyState, navigationEntryCount: performance.getEntriesByType("navigation").length, timing,
          resources: { completedEntryCount: resources.length, transferSupported, transferBytes: transferSupported ? resources.reduce((sum, resource) => sum + resource.transferSize, 0) : null, zeroTransferEntries: transferSupported ? resources.filter((resource) => resource.transferSize === 0).length : null, scope: "top-document completed resource timing entries; buffer may truncate; excludes child entries" },
          theme: { savedTheme: document.documentElement.getAttribute("saved-theme"), dataTheme: document.documentElement.getAttribute("data-theme"), stored: localStorage.getItem("theme") },
          geometry: { viewportWidth: innerWidth, documentWidth: document.documentElement.scrollWidth, overflowPx: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth), primary: r ? { x: r.x, y: r.y, width: r.width, height: r.height } : null },
          components: Object.fromEntries(Object.entries({ main: "main,[role=main]", footer: "footer,#reference-footer", continuation: "[data-route-continuation]", controls: "button,input,select,textarea,[role=button]", navigation: "nav,[role=navigation]", headings: "h1,h2,h3", lessonSections: "[data-story-chapter]", dialogs: "dialog,[role=dialog]", runtimeFrames: "iframe", discoveryCards: ".page-card", themeControl: "[data-home-theme-toggle],.darkmode", primary: selectors.primary, runtime: selectors.runtime, nativeControl: selectors.native }).map(([role, selector]) => [role, count(selector)])),
        };
      }, cell.selectors),
      new Promise((_, reject) => { const timer = setTimeout(() => reject(new Error("capture-timeout")), 2500); timer.unref(); }),
    ]);
    return { ...cell, status: "measured", reason: null, capturedAt: new Date().toISOString(), elapsedMs: Date.now() - started, httpStatus: response?.status() ?? null, navigationError, loadWait, ...snapshot, events, embeddedChildStates: "blocked: parent-only DOM snapshot; child runtime not inspected" };
  } catch (error) { return { ...cell, status: "blocked", reason: diagnostic(error.message), elapsedMs: Date.now() - started, events }; }
  finally { await context.close().catch(() => {}); }
}

function summarize(data) {
  const base = data.cells.filter((cell) => cell.sample === 1);
  const measured = base.filter((cell) => cell.status === "measured");
  const affected = (predicate) => measured.filter(predicate).map((cell) => `${cell.slug}/${cell.viewport.width}/${cell.requestedTheme}`);
  data.summary = {
    expectedCells: 504, plannedCells: base.length, measuredCells: measured.length, blockedCells: base.filter((cell) => cell.status === "blocked").length,
    attemptedCells: base.filter((cell) => cell.elapsedMs !== undefined).length,
    totalCapturedSamples: data.cells.filter((cell) => cell.status === "measured").length,
    navigationEntrySamples: data.cells.reduce((sum, cell) => sum + (cell.navigationEntryCount || 0), 0),
    overflow: affected((cell) => cell.geometry.overflowPx > 1),
    missingVisibleMain: affected((cell) => !cell.components.main.visible),
    missingVisiblePrimary: affected((cell) => !cell.components.primary?.visible),
    missingVisibleContinuation: affected((cell) => cell.slug !== "atlas" && !cell.components.continuation.visible),
    storedThemeMismatch: affected((cell) => cell.requestedTheme !== cell.theme.savedTheme),
    localHttpFailureCells: affected((cell) => cell.events.localHttpFailures.length > 0),
    pageErrorCells: affected((cell) => cell.events.pageErrors.length > 0),
    consoleErrorCells: affected((cell) => cell.events.consoleErrors.length > 0),
    unexpectedNetworkFailureCells: affected((cell) => cell.events.unexpectedNetworkFailures.length > 0),
    externalInterventionCells: affected((cell) => Object.keys(cell.events.blockedExternal).length > 0),
    navigationErrorCells: affected((cell) => cell.navigationError !== null),
  };
  data.summary.storedThemeMismatch = affected((cell) => cell.requestedTheme !== cell.theme.savedTheme);
  data.repeats = Object.fromEntries(["atlas", "bias-variance", "blockchain", "teoria-interval-ear-training", "formula-1-racing"].map((slug) => {
    const samples = data.cells.filter((cell) => cell.slug === slug && cell.viewport.width === 1400 && cell.requestedTheme === "light" && cell.status === "measured");
    return [slug, { capturedSamples: samples.length, domContentLoadedEventEndMs: stats(samples.map((cell) => cell.timing?.domContentLoadedEventEnd).filter((value) => value > 0)), captureTimeMs: stats(samples.map((cell) => cell.capturedAtPerformanceMs)) }];
  }));
}

function writeReport(data) {
  const s = data.summary;
  const rows = data.inventory.map((route) => `| ${route.slug} | ${route.family} | ${route.variant} | ${route.ownership} | ${route.navigation} | ${route.primarySurface || "undeclared"} | ${route.runtimeSurface || "undeclared"} | ${route.interactionProbe || "undeclared"} | ${route.continuation || "not applicable"} |`).join("\n");
  const defects = ["navigationErrorCells", "localHttpFailureCells", "pageErrorCells", "overflow", "missingVisiblePrimary", "missingVisibleContinuation", "storedThemeMismatch", "unexpectedNetworkFailureCells", "externalInterventionCells", "consoleErrorCells", "missingVisibleMain"].map((key) => `- **${key}: ${s[key].length} cells.** ${s[key].slice(0, 18).join(", ")}${s[key].length > 18 ? "; remaining exact cells in JSON" : ""}`).join("\n");
  fs.writeFileSync(report, `# Browser baseline: issue 32\n\n## Execution\n\n- Started: ${data.startedAt}; finished: ${data.finishedAt}. Collector exit: ${data.exitStatus}.\n- ${s.measuredCells}/${s.plannedCells} base cells measured; ${s.blockedCells} blocked; ${s.attemptedCells} attempted. ${s.totalCapturedSamples} total captures; ${s.navigationEntrySamples} Navigation Timing entries.\n- Blocker: ${data.blocker || "none for base snapshot collection"}. A measured cell is a snapshot, not a correctness pass.\n- Environment and Git start/end identities: see JSON metadata. Concurrent agents may change source during collection; no immutable checkout or cold OS-cache claim.\n\n## Exact commands (parent directory)\n\n\`\`\`bash\nnode --check .scratch/complete-route-experience/research/32-browser-baseline.mjs\n${command} --self-test\n${executionCommand}\n\`\`\`\n\n## Method and modality status\n\n| Modality | Status and boundary |\n| --- | --- |\n| Route inventory | Source-reviewed: ${data.inventory.length - 1} manifest Routes plus Atlas; pages inventory parity ${data.pagesParity} |\n| Stored light/dark at 1400×1000, 390×844, 320×844 | Measured ${s.measuredCells}; blocked ${s.blockedCells}; per-cell JSON status |\n| Runtime loading and local HTTP | Measured at capture, including bounded navigation/load errors |\n| Component roles and layout | Measured parent DOM counts and primary rectangle, not all nodes or states; visible means CSS box visibility, not unobscured or necessarily in viewport |\n| Repetition | Actual fresh-context desktop-light samples below; no production distribution |\n| External network | Blocked intentionally, counted separately by resource type; all WebSockets blocked; service workers disabled |\n| Embedded child states | Blocked: frame count only; no inherited parent pass |\n| Keyboard, touch, reset/recovery, error-state interactions | Blocked: passive collector, no activation |\n| System-theme fallback, reduced motion | Blocked: system light fixed, stored choices only, no reduced-motion run |\n| Focus, contrast, semantic accessibility | Unsupported by snapshot; no axe, assistive technology or accessibility certification |\n| Visual and learning-design judgment | Blocked: no screenshot/human/learner review; no learning outcome |\n| Field CWV, LCP, INP, CLS, Lighthouse | Unsupported; navigation timings are not these metrics |\n| Real device, cross-browser, production network | Blocked: desktop Chromium viewport emulation only, mouse/no touch |\n| Smoke/unit/policy gates | Delegated to another agent; not executed by this collector |\n\nFresh context per cell, scale 1, no CPU/network throttling, local ephemeral loopback HTTP with no-store; browser routing also disables HTTP cache. Two workers maximum; 12s DOMContentLoaded navigation, 700ms load wait, 200ms settle, 2500ms capture bound. Collection admission stops at 450s; hard browser shutdown at 475s retains checkpointed evidence. Timing reflects capture, not stable final rendering. Resource transfer values are browser-reported completed top-document entries only, may be buffer-truncated, exclude child resources and unfinished requests, and zero is not proof of zero network bytes. Error text, external URLs and query strings are not persisted; categories and hashes preserve grouping without leaking runtime payloads. Diagnostic lists cap at 40 per kind per cell; dropped count recorded.\n\n## Prioritized measured findings\n\nInvestigate navigation/local HTTP/page errors first (functional risk); then overflow and absent declared primary surface (learner access); then continuation/theme mismatches (shared experience). These are triage signals, not certified defects: runtime errors may result from deliberate outbound blocking; hidden footer or delayed runtime can be intentional. No approved thresholds or aggregate quality score. Exact per-cell values and event fingerprints are in JSON.\n\n${defects}\n\n## Actual desktop-light repetitions\n\n\`\`\`json\n${JSON.stringify(data.repeats, null, 2)}\n\`\`\`\n\n## Route and declared component-role inventory\n\nAtlas owns discovery/cards and shared navigation/theme. Routes declare family, shell variant, theme ownership, navigation, primary/runtime boundaries, interaction probe and continuation below. Shared measured roles additionally include main, footer, controls, headings, lesson sections, dialogs and runtime frames. Feedback/loading/recovery semantics are not inferred from counts. Opaque runtime ownership remains a separate boundary.\n\n| Route | Family | Variant | Theme ownership | Navigation | Primary | Runtime | Interaction declaration | Continuation |\n| --- | --- | --- | --- | --- | --- | --- | --- | --- |\n${rows}\n`, { mode: 0o600 });
}

async function main() {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, "routes.manifest.json"), "utf8"));
  const pages = JSON.parse(fs.readFileSync(path.join(root, "pages.json"), "utf8"));
  assert.equal(manifest.length, 83);
  assert.equal(new Set(manifest.map((route) => route.slug)).size, 83);
  assert.ok(manifest.every((route) => /^[a-z0-9-]+$/.test(route.slug)));
  const inventory = [{ slug: "atlas", family: "atlas", variant: "discovery", ownership: "authored", navigation: "discovery", primarySurface: "main", runtimeSurface: null }, ...manifest.map((route) => ({ slug: route.slug, family: route.shell?.family || "undeclared", variant: route.shell?.variant || "undeclared", ownership: route.experience?.themeOwnership || "undeclared", navigation: route.shell?.navigation || "undeclared", primarySurface: route.experience?.primarySurface, runtimeSurface: route.experience?.runtimeSurface, interactionProbe: route.experience?.interactionProbe, continuation: route.suggestedNextSlug, nativeControl: route.shell?.nativeControl || null }))];
  const cells = [];
  for (const viewport of [{ width: 1400, height: 1000 }, { width: 390, height: 844 }, { width: 320, height: 844 }]) {
    for (const theme of ["light", "dark"]) for (const route of inventory) cells.push({ slug: route.slug, viewport, theme, requestedTheme: theme, sample: 1, selectors: { primary: route.primarySurface, runtime: route.runtimeSurface, native: route.nativeControl?.selector }, status: "blocked", reason: "unattempted-budget-or-startup" });
  }
  const data = { startedAt: new Date().toISOString(), collector: command, metadata: { root, node: process.version, os: { platform: os.platform(), release: os.release(), arch: os.arch() }, gitStart: identity(), concurrency: 2, budgetMs: 480000, deviceScaleFactor: 1, systemColorScheme: "light", isMobile: false, hasTouch: false }, pagesParity: JSON.stringify(pages) === JSON.stringify(manifest), inventory, cells };
  atomicJson(data);
  let browser;
  let instance;
  let hardStop;
  const deadline = Date.now() + 450000;
  try {
    const { chromium } = require("playwright");
    data.metadata.playwright = require("playwright/package.json").version;
    instance = server();
    await new Promise((resolve, reject) => { instance.once("error", reject); instance.listen(0, "127.0.0.1", resolve); });
    const origin = `http://127.0.0.1:${instance.address().port}`;
    const executablePath = process.env.BASELINE_CHROMIUM_EXECUTABLE || undefined;
    data.metadata.browserSelection = executablePath ? "explicit existing executable via BASELINE_CHROMIUM_EXECUTABLE; package-default revision unavailable" : "Playwright default";
    browser = await chromium.launch({ executablePath, headless: true, timeout: 15000, args: ["--disable-background-networking", "--disable-component-update", "--disable-domain-reliability", "--disable-sync", "--no-pings", "--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1"] });
    data.metadata.browser = browser.version();
    hardStop = setTimeout(() => { data.blocker = "475-second hard browser stop"; browser.close().catch(() => {}); }, 475000);
    let next = 0;
    async function worker() {
      while (next < cells.length && Date.now() < deadline) {
        const index = next++;
        const result = await capture(browser, origin, cells[index]);
        cells[index] = result;
        atomicJson(data);
      }
    }
    await Promise.all([worker(), worker()]);
    if (next < 504) data.blocker = "450-second admission budget exhausted; remaining cells explicitly blocked";
    if (next === 504 && Date.now() < deadline) {
      for (let sample = 2; sample <= 3; sample++) for (const slug of ["atlas", "bias-variance", "blockchain", "teoria-interval-ear-training", "formula-1-racing"]) {
        if (Date.now() >= deadline) break;
        const base = cells.find((cell) => cell.slug === slug && cell.viewport.width === 1400 && cell.requestedTheme === "light");
        cells.push(await capture(browser, origin, { slug, viewport: base.viewport, theme: "light", requestedTheme: "light", selectors: base.selectors, sample }));
        atomicJson(data);
      }
    }
  } catch (error) { data.blocker = diagnostic(error.message); }
  finally {
    clearTimeout(hardStop);
    await browser?.close().catch(() => {});
    if (instance) { instance.closeAllConnections(); await new Promise((resolve) => instance.close(resolve)); }
    data.finishedAt = new Date().toISOString();
    data.metadata.gitEnd = identity();
    summarize(data);
    data.exitStatus = data.summary.measuredCells === 504 ? 0 : 2;
    atomicJson(data);
    writeReport(data);
    console.log(JSON.stringify({ exitStatus: data.exitStatus, measuredCells: data.summary.measuredCells, blockedCells: data.summary.blockedCells, totalCapturedSamples: data.summary.totalCapturedSamples, blocker: data.blocker || null }));
    process.exitCode = data.exitStatus;
  }
}

if (process.argv.includes("--self-test")) await selfTest();
else await main();
