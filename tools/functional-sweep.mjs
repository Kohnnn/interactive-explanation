import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { chromium } from "playwright";
import * as smoke from "./smoke-bundle.mjs";
import { planCells, installCaptureFixture, sourceIdentity } from "./diagnose-baseline.mjs";
import { createSmokeServer } from "./smoke/server.mjs";

const root = path.resolve(process.argv[2] || ".");
const output = process.argv[3];
assert(output, "Expected root and output JSONL path");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "routes.manifest.json")));
assert.equal(manifest.length, 83);
const cells = planCells(manifest, process.argv.slice(4));
const fd = fs.openSync(output, "wx");
const write = row => { fs.writeSync(fd, JSON.stringify(row) + "\n"); fs.fsyncSync(fd); };
let server;
let browser;
let passed = 0;
const failures = [];
try {
  const before = sourceIdentity(root);
  write({ type: "source-before", ...before });
  server = await createSmokeServer({ rootDir: root, host: smoke.host, port: smoke.port, mountPath: smoke.mountPath }).start();
  browser = await chromium.launch();
  write({ type: "scope", cells: cells.length, browser: browser.version(), geometry: "not compared", performance: "not qualified", root });
  for (const { route, viewport, theme } of cells) {
    const row = { type: "cell", slug: route.slug, viewport: viewport.name, theme, checks: [], failures: [], events: [] };
    const attempt = async (name, action) => {
      try { await action(); row.checks.push(name); return true; }
      catch (error) { row.failures.push({ phase: name, message: error.message }); return false; }
    };
    const context = await smoke.createThemeContext(browser, { theme, stored: true, viewport });
    const contextErrors = [];
    context.on("page", (opened) => {
      opened.on("pageerror", (error) => contextErrors.push(error.message));
      opened.on("console", (message) => { if (message.type() === "error") contextErrors.push(message.text()); });
    });
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    page.setDefaultNavigationTimeout(30000);
    const release = await installCaptureFixture(page, route);
    const clean = smoke.createRuntimeMonitor(page, { networkPolicy: route.experience.networkPolicy, events: row.events });
    try {
      const ready = await attempt("readiness", async () => {
        const response = await page.goto(`${smoke.baseUrl}${route.slug === "atlas" ? "" : route.slug + "/"}`, { waitUntil: "domcontentloaded" });
        assert(response?.ok(), `HTTP ${response?.status()}`);
        await page.waitForLoadState("load");
        await release();
        if (route.slug === "atlas") await page.waitForSelector("[data-page-list] .page-card");
        else await smoke.waitForManifestRouteReady(page, route);
        await page.waitForLoadState("networkidle");
      });
      if (ready) {
        await attempt("theme", () => smoke.assertDocumentTheme(page, theme, route.slug));
        await attempt("viewport", () => smoke.assertViewportUsable(page, route.slug));
        if (route.slug === "atlas") {
          await attempt("atlas-filters-history", () => smoke.smokeAtlas(context, page));
        } else {
          await attempt("runtime-surface", () => smoke.assertReadOnlyProbe(page, route, route.slug));
          await attempt("navigation-controls-child-contract", async () => {
            await smoke.scrollPrimarySurfaceIntoView(page, route.slug, route.experience.primarySurface);
            await smoke.assertManifestNavigation(page, route, viewport, route.slug);
          });
          await attempt("accessibility", () => smoke.assertRouteAccessibility(page, route.slug));
          await attempt("continuation", async () => {
            await smoke.assertRouteContinuation(page, route, route.slug);
            const link = page.locator("[data-route-continuation-link]");
            const response = await context.request.get(await link.getAttribute("href"));
            assert(response.ok(), `Continuation HTTP ${response.status()}`);
          });
          if (["trust", "loopy", "sim", "wbwwb", "coming-out-simulator-2014"].includes(route.slug) || route.slug.startsWith("ableton-learning-synths-")) {
            await attempt("orientation-keyboard-pointer-occlusion", async () => {
              const details = page.locator(".route-orientation, [data-route-orientation]");
              assert.equal(await details.count(), 1);
              const summary = details.locator("summary");
              const covered = await page.evaluate(() => [...document.querySelectorAll("main button, main input, main select, main a[href], main [role='button']")].filter(element => {
                const rect = element.getBoundingClientRect();
                if (!rect.width || !rect.height || rect.top < 0 || rect.bottom > innerHeight) return false;
                return document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2)?.closest(".route-orientation, [data-route-orientation]");
              }).map(element => element.id || element.textContent.trim()));
              assert.deepEqual(covered, [], "Orientation covers runtime controls");
              if (route.slug === "coming-out-simulator-2014") {
                await page.evaluate(() => {
                  window.__orientationNarrativeClicks = 0;
                  const original = window.onclick;
                  if (typeof original !== "function") throw new Error("Narrative window click handler unavailable");
                  window.onclick = function (event) {
                    window.__orientationNarrativeClicks++;
                    return original?.call(this, event);
                  };
                });
              }
              await summary.scrollIntoViewIfNeeded();
              await summary.click();
              assert.equal(await details.getAttribute("open"), "");
              assert(await details.locator("p").first().isVisible());
              await details.locator("p").first().click();
              await summary.click();
              assert.equal(await details.getAttribute("open"), null);
              await summary.focus();
              await page.keyboard.press("Enter");
              assert.equal(await details.getAttribute("open"), "");
              await page.keyboard.press("Escape");
              assert.equal(await details.getAttribute("open"), null);
              assert(await summary.evaluate(element => document.activeElement === element));
              await page.keyboard.press("Space");
              assert.equal(await details.getAttribute("open"), "");
              if (route.slug === "coming-out-simulator-2014") {
                assert.equal(await page.evaluate(() => window.__orientationNarrativeClicks), 0, "Orientation invoked narrative window click handler");
              }
              await page.locator("[data-route-continuation-link]").focus();
              assert.equal(await details.getAttribute("open"), null);
              await summary.click();
              assert.equal(await details.getAttribute("open"), "");
              const outside = await page.evaluate(() => {
                for (const [x, y] of [[2, 2], [innerWidth / 2, 2], [2, innerHeight / 2]]) {
                  if (!document.elementFromPoint(x, y)?.closest(".route-orientation, [data-route-orientation]")) return { x, y };
                }
                return null;
              });
              assert(outside, "No outside pointer location available");
              await page.mouse.move(outside.x, outside.y);
              await page.mouse.down();
              assert.equal(await details.getAttribute("open"), null);
              await page.mouse.up();
              await page.locator("[data-route-continuation-link]").click({ trial: true });
              await smoke.assertViewportUsable(page, route.slug);
            });
          }
        }
        const pilot = { "bias-variance": smoke.smokeBiasVariance, blockchain: smoke.smokeBlockchain, "teoria-scale-construction": smoke.smokeTeoriaScaleConstruction }[route.slug];
        if (pilot) await attempt("pilot-operation", () => pilot(context));
        await attempt("theme-toggle", async () => {
          const toggle = page.locator(".top-bar__theme, [data-home-theme-toggle]").first();
          await toggle.click();
          const other = theme === "light" ? "dark" : "light";
          assert.equal(await page.locator("html").getAttribute("saved-theme"), other);
          assert.equal(await page.evaluate(() => localStorage.getItem("theme")), other);
          if (route.slug === "atlas") {
            const persisted = await browser.newContext({ storageState: await context.storageState(), viewport: { width: viewport.width, height: viewport.height }, colorScheme: theme });
            try {
              const next = await persisted.newPage();
              await next.goto(smoke.baseUrl);
              assert.equal(await next.locator("html").getAttribute("saved-theme"), other);
            } finally { await persisted.close(); }
          }
          await toggle.click();
          assert.equal(await page.locator("html").getAttribute("saved-theme"), theme);
        });
      }
      await attempt("runtime-network-console", async () => {
        await clean(route.slug);
        assert.deepEqual(row.events.filter(event => event.type === "console-error"), []);
      });
    } finally {
      await attempt("fixture-release", release);
      await attempt("cleanup", () => context.close());
      await attempt("context-console", () => assert.deepEqual(contextErrors, []));
    }
    row.status = row.failures.length ? "failed" : "passed";
    if (row.failures.length) failures.push({ slug: row.slug, viewport: row.viewport, theme, failures: row.failures });
    else passed++;
    write(row);
    console.log(`${passed + failures.length}/${cells.length} ${row.slug}/${row.viewport}/${theme} ${row.status}`);
  }
  const after = sourceIdentity(root);
  write({ type: "source-after", ...after });
  assert.deepEqual(after, before, "Source changed during functional sweep");
  assert.equal(passed + failures.length, cells.length);
  write({ type: "complete", attempted: cells.length, passed, failed: failures.length, failures, sourceUnchanged: true, head: after.head, digest: after.digest });
} catch (error) {
  write({ type: "aborted", message: error.stack || error.message });
  throw error;
} finally {
  try { if (browser) await browser.close(); }
  finally {
    try { if (server) await new Promise(resolve => server.close(resolve)); }
    finally { fs.closeSync(fd); }
  }
}
process.exitCode = failures.length ? 1 : 0;
