import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { chromium } from "playwright";
import * as smoke from "./smoke-bundle.mjs";
import { createSmokeServer } from "./smoke/server.mjs";
import { validateExperienceBaseline } from "./experience-baseline.mjs";
import { resourceUrl } from "./network-handoff.mjs";

const require = createRequire(import.meta.url);
const hash = (value) => createHash("sha256").update(value).digest("hex");

export function parseOptions(args) {
  const options = { routes: [] };
  for (let index = 0; index < args.length; index++) {
    const key = args[index];
    assert(["--root", "--output", "--route"].includes(key), `Unknown argument: ${key}`);
    const value = args[++index];
    assert(value && !value.startsWith("--"), `Missing value for ${key}`);
    if (key === "--route") {
      assert(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value), "Invalid route slug");
      assert(!options.routes.includes(value), `Duplicate route: ${value}`);
      options.routes.push(value);
    } else {
      assert(!options[key.slice(2)], `Duplicate option: ${key}`);
      options[key.slice(2)] = path.resolve(value);
    }
  }
  assert(options.root && options.output, "Required: --root <site> --output <new.jsonl>");
  return options;
}

export function statistics(values) {
  const valid = values.filter(Number.isFinite).sort((a, b) => a - b);
  const middle = Math.floor(valid.length / 2);
  return {
    count: valid.length,
    median: valid.length ? (valid[middle] + valid[Math.floor((valid.length - 1) / 2)]) / 2 : null,
    min: valid[0] ?? null,
    max: valid.at(-1) ?? null,
  };
}

export function geometryChanges(before, after, pointer = "") {
  if (JSON.stringify(before) === JSON.stringify(after)) return [];
  if (before && after && typeof before === "object" && typeof after === "object") {
    return [...new Set([...Object.keys(before), ...Object.keys(after)])].flatMap((key) =>
      geometryChanges(before[key], after[key], `${pointer}/${key.replaceAll("~", "~0").replaceAll("/", "~1")}`));
  }
  return [{ path: pointer, before: before ?? null, after: after ?? null, review: "unreviewed" }];
}

export function openJournal(output) {
  const fd = fs.openSync(output, "wx", 0o600);
  return {
    append(value) {
      fs.writeSync(fd, `${JSON.stringify(value)}\n`);
      fs.fsyncSync(fd);
    },
    close() { fs.closeSync(fd); },
  };
}

export function sourceIdentity(root) {
  const files = [];
  function walk(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      if ([".git", "node_modules"].includes(entry.name)) continue;
      const full = path.join(directory, entry.name);
      assert(!entry.isSymbolicLink(), `Unidentified source symlink: ${full}`);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile()) files.push([path.relative(root, full), hash(fs.readFileSync(full))]);
    }
  }
  walk(root);
  const git = (...args) => execFileSync("git", args, { cwd: root, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 }).trim();
  return { head: git("rev-parse", "HEAD"), status: git("status", "--porcelain=v1", "--untracked-files=all"), digest: hash(JSON.stringify(files)), files };
}

export function verifySourceFixture(root, repository, revision, prefix = "interactive-explanation") {
  const git = (args, options = {}) => execFileSync("git", args, { cwd: repository, maxBuffer: 256 * 1024 * 1024, ...options });
  const head = git(["rev-parse", "--verify", `${revision}^{commit}`]).toString().trim();
  const excluded = [".git", "node_modules"];
  const entries = git(["ls-tree", "--full-tree", "-rz", head, ...(prefix ? ["--", prefix] : [])]).toString().split("\0").filter(Boolean).map(record => {
    const [header, name] = record.split("\t");
    const [mode, type, blob] = header.split(" ");
    assert(!prefix || name.startsWith(`${prefix}/`), `Unexpected Git path: ${name}`);
    return { path: prefix ? name.slice(prefix.length + 1) : name, mode, type, blob };
  }).filter(entry => !entry.path.split("/").some(part => excluded.includes(part)));
  assert(entries.length, "Empty source fixture");
  const actual = [];
  function walk(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (excluded.includes(entry.name)) continue;
      const full = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(full);
      else actual.push(path.relative(root, full));
    }
  }
  walk(root);
  assert.deepEqual(actual.sort(), entries.map(entry => entry.path).sort(), "Source fixture paths differ (missing or extra files)");
  let blobs;
  let offset = 0;
  const files = entries.map((entry, index) => {
    if (index % 32 === 0) {
      blobs = git(["cat-file", "--batch"], { input: entries.slice(index, index + 32).map(item => item.blob).join("\n") + "\n" });
      offset = 0;
    }
    assert.equal(entry.type, "blob", `Unsupported Git entry: ${entry.path}`);
    const end = blobs.indexOf(10, offset);
    const [id, type, size] = blobs.subarray(offset, end).toString().split(" ");
    assert.equal(id, entry.blob);
    assert.equal(type, "blob");
    const expected = blobs.subarray(end + 1, end + 1 + Number(size));
    offset = end + 2 + Number(size);
    const full = path.join(root, entry.path);
    const stat = fs.lstatSync(full);
    const mode = stat.isSymbolicLink() ? "120000" : stat.isFile() ? (stat.mode & 0o111 ? "100755" : "100644") : "unsupported";
    assert.equal(mode, entry.mode, `Source fixture mode differs: ${entry.path}`);
    const bytes = stat.isSymbolicLink() ? Buffer.from(fs.readlinkSync(full)) : fs.readFileSync(full);
    assert(bytes.equals(expected), `Source fixture Git blob bytes differ: ${entry.path}`);
    return [entry.path, hash(bytes)];
  });
  return { head, excluded, files, digest: hash(JSON.stringify(files)), verification: "full Git blob bytes, modes and exact filesystem paths" };
}

export function planCells(manifest, selected) {
  assert(Array.isArray(manifest) && manifest.length > 0, "Manifest must be a nonempty array");
  const slugs = new Set(["atlas"]);
  for (const route of manifest) {
    assert(typeof route.slug === "string" && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(route.slug), "Invalid manifest slug");
    assert(!slugs.has(route.slug), `Duplicate manifest slug: ${route.slug}`);
    slugs.add(route.slug);
    assert(typeof route.experience?.runtimeSurface === "string" && route.experience.runtimeSurface.trim(), `Missing runtime selector: ${route.slug}`);
    assert(typeof route.experience?.primarySurface === "string" && route.experience.primarySurface.trim(), `Missing primary selector: ${route.slug}`);
    assert(["local-only", "deferred-remote"].includes(route.experience.networkPolicy?.mode), `Invalid network policy: ${route.slug}`);
  }
  selected.forEach((slug) => assert(slugs.has(slug), `Unknown route: ${slug}`));
  const routes = [{ slug: "atlas", experience: { primarySurface: "main", runtimeSurface: "main", networkPolicy: { mode: "local-only" } } }, ...manifest];
  return routes.filter((route) => !selected.length || selected.includes(route.slug)).flatMap((route) =>
    smoke.experienceViewports.flatMap((viewport) => ["light", "dark"].map((theme) => ({ route, viewport, theme }))));
}

export async function capture(browser, cell) {
  const { route, viewport, theme } = cell;
  const result = { slug: route.slug, viewport, theme, startedAt: new Date().toISOString(), errors: [], events: [], geometry: null, performance: null };
  let context;
  const attempt = async (phase, action) => {
    try { return await action(); }
    catch (error) { result.errors.push({ phase, message: error.message }); return null; }
  };
  try {
    context = await smoke.createThemeContext(browser, { theme, stored: true, viewport });
    const page = await context.newPage();
    page.setDefaultTimeout(30000);
    page.setDefaultNavigationTimeout(30000);
    const clean = smoke.createRuntimeMonitor(page, { networkPolicy: route.experience.networkPolicy, events: result.events });
    await attempt("navigation", async () => {
      const response = await page.goto(`${smoke.baseUrl}${route.slug === "atlas" ? "" : `${route.slug}/`}`, { waitUntil: "domcontentloaded" });
      assert(response?.ok(), `Navigation HTTP ${response?.status()}`);
      await page.waitForSelector(route.slug === "atlas" ? "[data-page-list] .page-card" : "#reference-footer");
    });
    await attempt("readiness", async () => {
      if (route.slug === "atlas") await smoke.waitForDocumentLayout(page);
      else await smoke.waitForManifestRouteReady(page, route);
      result.readyMs = await page.evaluate(() => performance.now());
      await page.waitForLoadState("load");
      await page.waitForLoadState("networkidle", { timeout: 30000 });
      result.ready = true;
    });
    await attempt("theme", () => smoke.assertDocumentTheme(page, theme, route.slug));
    await attempt("scroll", () => smoke.scrollPrimarySurfaceIntoView(page, route.slug, route.experience.primarySurface));
    result.geometry = await attempt("geometry", () => smoke.measureRuntimeSurface(page, route, route.slug));
    result.performance = await attempt("performance", () => smoke.readPerformanceEvidence(page));
    result.raw = await attempt("raw", () => page.evaluate(() => ({
      navigation: performance.getEntriesByType("navigation").map((entry) => entry.toJSON()),
      resources: performance.getEntriesByType("resource").map((entry) => entry.toJSON()),
      fonts: document.fonts.status, bodyFont: getComputedStyle(document.body).fontFamily,
      readyState: document.readyState, scrollX, scrollY,
      documentWidth: document.documentElement.scrollWidth, viewportWidth: innerWidth,
      frames: [...document.querySelectorAll("iframe")].map((frame) => ({ title: frame.title, src: frame.getAttribute("src") })),
    })));
    if (result.raw) {
      for (const entry of [...result.raw.navigation, ...result.raw.resources]) entry.name = resourceUrl(entry.name);
      for (const frame of result.raw.frames) frame.src = resourceUrl(new URL(frame.src, page.url()).href);
    }
    await clean.ready();
    result.networkClassifications = clean.classify();
    await attempt("runtime", () => clean(route.slug));
    if (result.events.some((entry) => entry.type === "console-error")) result.errors.push({ phase: "console", message: "Console errors retained in events" });
    if (result.networkClassifications.some((entry) => entry.classification === "unknown-failure")) result.errors.push({ phase: "network", message: "Unclassified failed requests; original events retained" });
    if (!result.performance?.loadMs || !result.performance?.domContentLoadedMs || result.performance?.sameOriginTransfer.status !== "supported") result.errors.push({ phase: "performance", message: "Incomplete timing or unsupported transfer" });
  } catch (error) { result.errors.push({ phase: "context", message: error.message }); }
  finally { if (context) await attempt("cleanup", () => context.close()); }
  result.finishedAt = new Date().toISOString();
  result.status = result.errors.length ? "failed" : "measured";
  return result;
}

export function summarizeCell(samples, baseline) {
  const first = samples[0];
  const usable = samples.filter((sample) => sample.status === "measured");
  const summary = { slug: first.slug, theme: first.theme, viewport: first.viewport, attempted: samples.length, measured: usable.length, metrics: {}, proposal: [], approval: "none" };
  for (const key of ["domContentLoadedMs", "loadMs", "resourceCount"]) summary.metrics[key] = statistics(samples.map((sample) => sample.performance?.[key]));
  summary.metrics.transferBytes = statistics(samples.map((sample) => sample.performance?.sameOriginTransfer?.bytes));
  summary.geometryRanges = Object.fromEntries(["top", "right", "bottom", "left", "width", "height"].map((key) => [key, statistics(samples.map((sample) => sample.geometry?.rect[key]))]));
  summary.stableGeometry = usable.length === 3 && usable.every((sample) => JSON.stringify(sample.geometry) === JSON.stringify(first.geometry));
  summary.comparable = usable.length === 3;
  if (baseline && first.theme === "light" && summary.stableGeometry) {
    summary.proposal = geometryChanges(baseline, first.geometry, `/routes/${first.slug}/geometry/${first.viewport.name}`);
  }
  return summary;
}

export async function main(args = process.argv.slice(2)) {
  const options = parseOptions(args);
  options.root = fs.realpathSync(options.root);
  options.output = path.join(fs.realpathSync(path.dirname(options.output)), path.basename(options.output));
  const relativeOutput = path.relative(options.root, options.output);
  assert(relativeOutput === ".." || relativeOutput.startsWith(`..${path.sep}`) || path.isAbsolute(relativeOutput), "Output must be outside measured source");
  assert(Number.isInteger(smoke.port) && smoke.port > 0 && smoke.port <= 65535, "Invalid SMOKE_PORT");
  const manifest = JSON.parse(fs.readFileSync(path.join(options.root, "routes.manifest.json"), "utf8"));
  const cells = planCells(manifest, options.routes);
  const baselineBytes = fs.readFileSync(path.join(options.root, "tools/experience-baselines.json"));
  const baseline = validateExperienceBaseline(JSON.parse(baselineBytes), manifest.map((route) => route.slug));
  const before = sourceIdentity(options.root);
  const journal = openJournal(options.output);
  let server;
  let browser;
  let failed = false;
  try {
    journal.append({ type: "identity", root: options.root, source: before, baselineSha256: hash(baselineBytes), command: process.argv, toolSha256: hash(fs.readFileSync(fileURLToPath(import.meta.url))), smokeSha256: hash(fs.readFileSync(new URL("./smoke-bundle.mjs", import.meta.url))), node: process.version, os: { platform: os.platform(), release: os.release(), arch: os.arch() }, playwright: require("playwright/package.json").version, baseUrl: smoke.baseUrl, concurrency: 1, samplesPerCell: 3, cells: cells.length, cache: "fresh contexts; no-store server; OS cache uncontrolled", network: "existing smoke monitor; no interception", limitations: "diagnostic only; parent intrinsic surfaces, not child interiors or interaction acceptance; URLs in evidence may contain public query strings; no credentials supplied" });
    server = await createSmokeServer({ rootDir: options.root, host: smoke.host, port: smoke.port, mountPath: smoke.mountPath }).start();
    browser = await chromium.launch({ headless: true });
    journal.append({ type: "browser", version: browser.version(), selection: "Playwright default headless shell", browsers: JSON.parse(fs.readFileSync(path.join(path.dirname(require.resolve("playwright-core/package.json")), "browsers.json"), "utf8")) });
    for (const cell of cells) {
      const samples = [];
      for (let sample = 1; sample <= 3; sample++) {
        journal.append({ type: "attempt", slug: cell.route.slug, theme: cell.theme, viewport: cell.viewport, sample });
        const result = { ...await capture(browser, cell), sample };
        const inherited = baseline.routes[cell.route.slug]?.geometry[cell.viewport.name];
        result.inheritedComparison = { status: "not-applicable", reason: "Atlas has no inherited geometry reference" };
        if (inherited) {
          try {
            assert(result.geometry, "Geometry unavailable");
            smoke.assertRuntimeGeometry(result.geometry, inherited, `${result.slug} ${result.theme} ${result.viewport.name}`);
            result.inheritedComparison = { status: "passed", comparableEnvironment: false };
          } catch (error) {
            result.inheritedComparison = { status: "failed", comparableEnvironment: false, message: error.message };
            failed = true;
          }
        }
        if (result.status !== "measured") failed = true;
        samples.push(result);
        journal.append({ type: "sample", ...result });
      }
      const summary = summarizeCell(samples, baseline.routes[cell.route.slug]?.geometry[cell.viewport.name]);
      if (!summary.stableGeometry) failed = true;
      journal.append({ type: "cell", ...summary });
    }
  } catch (error) {
    failed = true;
    journal.append({ type: "fatal", message: error.stack || error.message });
  } finally {
    try { await browser?.close(); } catch (error) { failed = true; journal.append({ type: "cleanup-error", message: error.message }); }
    if (server) { server.closeAllConnections(); await new Promise((resolve) => server.close(resolve)); }
    try {
      const after = sourceIdentity(options.root);
      const unchanged = before.digest === after.digest && before.head === after.head && before.status === after.status;
      if (!unchanged) failed = true;
      journal.append({ type: "source-end", unchanged, source: after });
    } catch (error) { failed = true; journal.append({ type: "identity-error", message: error.message }); }
    journal.append({ type: "complete", status: failed ? "failed-or-inconclusive" : "captured-not-approved", finishedAt: new Date().toISOString() });
    journal.close();
  }
  return failed ? 1 : 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().then((code) => { process.exitCode = code; }).catch((error) => { console.error(error); process.exitCode = 1; });
}
