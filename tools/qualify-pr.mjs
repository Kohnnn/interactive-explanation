import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { chromium } from "playwright";
import { capture, planCells, openJournal, statistics, geometryChanges, sourceIdentity, verifySourceFixture } from "./diagnose-baseline.mjs";
import { summarizePerformanceRuns, performanceRegressions, validatePerformanceEvidence } from "./experience-baseline.mjs";
import { createSmokeServer } from "./smoke/server.mjs";
import { host, port, mountPath, baseUrl } from "./smoke-bundle.mjs";

const require = createRequire(import.meta.url);
const timings = ["domContentLoadedMs", "loadMs"];

export function assertIdentity(actual, expectedSha, previous) {
  assert(/^[a-f0-9]{40}$/.test(expectedSha), "Expected immutable 40-character SHA");
  assert.equal(actual.head, expectedSha, "Source revision differs");
  assert.equal(actual.status, "", "Source checkout must be clean");
  assert(/^[a-f0-9]{64}$/.test(actual.digest), "Missing source digest");
  if (previous) assert.deepEqual(actual, previous, "Source changed during qualification");
}

export function classifySamples(samples) {
  const result = { status: "inconclusive", reasons: [], metrics: {} };
  try {
    assert(Array.isArray(samples) && samples.length === 3, "Exactly three fresh samples required");
    for (const sample of samples) {
      assert(sample.status === "measured" && sample.ready && sample.errors.length === 0, "Missing or failed sample");
      validatePerformanceEvidence(sample.performance);
      assert(sample.performance.sameOriginTransfer.status === "supported", "Unsupported transfer");
      assert(sample.performance.loadMs > 0 && sample.performance.domContentLoadedMs > 0, "Missing timing");
    }
    for (const key of [...timings, "resourceCount", "transferBytes"]) {
      result.metrics[key] = statistics(samples.map(sample => key === "transferBytes" ? sample.performance.sameOriginTransfer.bytes : sample.performance[key]));
      const { min, max, median } = result.metrics[key];
      const limit = timings.includes(key) ? Math.max(median * 0.2, 250) / 2 : 0;
      assert(max - min <= limit, `Unstable ${key}: range ${max - min} exceeds ${limit}`);
    }
    result.evidence = summarizePerformanceRuns(samples.map(sample => sample.performance));
    result.status = "admissible";
  } catch (error) { result.reasons.push(error.message); }
  return result;
}

export function compareCell(control, before, after) {
  const groups = { control: classifySamples(control), before: classifySamples(before), after: classifySamples(after) };
  const result = { status: "inconclusive", groups, reasons: [] };
  if (Object.values(groups).some(group => group.status !== "admissible")) {
    result.reasons.push("Missing, failed, or unstable samples; no baseline accepted");
    return result;
  }
  for (const key of timings) {
    const left = groups.control.metrics[key].median;
    const right = groups.before.metrics[key].median;
    if (Math.abs(left - right) > Math.max(Math.min(left, right) * 0.2, 250) / 2) result.reasons.push(`A/A drift: ${key}`);
  }
  for (const key of ["resourceCount", "transferBytes"]) {
    if (groups.control.metrics[key].median !== groups.before.metrics[key].median) result.reasons.push(`A/A resource drift: ${key}`);
  }
  if (result.reasons.length) return result;
  result.calibration = "passed";
  result.reasons = performanceRegressions(groups.after.evidence, groups.before.evidence);
  result.status = result.reasons.length ? "regression" : "passed";
  return result;
}

export function compareGeometry(control, before, after) {
  for (const samples of [control, before, after]) {
    if (samples.length !== 3 || samples.some(sample => sample.status !== "measured" || !sample.geometry || JSON.stringify(sample.geometry) !== JSON.stringify(samples[0].geometry))) return { status: "blocked", reason: "Missing or unstable geometry" };
  }
  if (geometryChanges(control[0].geometry, before[0].geometry).length) return { status: "blocked", reason: "Same-source A/A geometry changed" };
  const changes = geometryChanges(before[0].geometry, after[0].geometry);
  return { status: changes.length ? "blocked" : "passed", changes, reason: changes.length ? "Same-environment source changes require specific review; replacement routes need independent acceptance" : "Same-environment geometry unchanged; not approval of legacy baseline provenance" };
}

export async function collectCellPair(options, baseCell, headCell, collect, journal) {
  const control = await collect(options.base, baseCell, "base-control");
  const before = await collect(options.base, baseCell, "base");
  const calibration = compareCell(control, before, before);
  journal.append({ type: "calibration", cell: `${headCell.route.slug}/${headCell.viewport.name}/${headCell.theme}`, result: calibration });
  const after = await collect(options.head, headCell, "head");
  return { control, before, after };
}

export function parseOptions(args) {
  const options = {};
  for (let index = 0; index < args.length; index += 2) {
    const key = args[index];
    assert(["--base", "--head", "--base-sha", "--head-sha", "--output"].includes(key), `Unknown option: ${key}`);
    assert(!Object.hasOwn(options, key.slice(2)), `Duplicate option: ${key}`);
    const value = args[index + 1];
    assert(value && !value.startsWith("--"), `Missing value: ${key}`);
    options[key.slice(2)] = value;
  }
  for (const key of ["base", "head", "base-sha", "head-sha", "output"]) assert(options[key], `Required: --${key}`);
  for (const key of ["base-sha", "head-sha"]) assert(/^[a-f0-9]{40}$/.test(options[key]), `Invalid SHA: ${key}`);
  for (const key of ["base", "head"]) options[key] = fs.realpathSync(options[key]);
  options.output = path.join(fs.realpathSync(path.dirname(path.resolve(options.output))), path.basename(options.output));
  for (const root of [options.base, options.head]) {
    const relative = path.relative(root, options.output);
    assert(relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative), "Evidence must be outside measured sources");
  }
  assert.notEqual(options.base, options.head, "Separate immutable checkouts required");
  return options;
}

export async function main(args = process.argv.slice(2)) {
  const options = parseOptions(args);
  const journal = openJournal(options.output);
  const identities = {};
  let browser;
  let failed = false;
  let completed = 0;
  const totals = { performance: {}, geometry: {} };
  const manifest = root => JSON.parse(fs.readFileSync(path.join(root, "routes.manifest.json"), "utf8"));
  try {
    for (const side of ["base", "head"]) {
      identities[side] = sourceIdentity(options[side]);
      assertIdentity(identities[side], options[`${side}-sha`]);
      const verified = verifySourceFixture(options[side], options[side], options[`${side}-sha`], "");
      journal.append({ type: "source", side, identity: identities[side], verified });
    }
    const cells = planCells(manifest(options.head), []);
    const baseCells = planCells(manifest(options.base), []);
    const key = cell => `${cell.route.slug}/${cell.viewport.name}/${cell.theme}`;
    assert.deepEqual(baseCells.map(key), cells.map(key), "Route matrix changed; requires qualification contract review");
    assert.equal(cells.length, 504, "Expected 83 routes plus Atlas, three viewports, two themes");
    journal.append({ type: "method", cells: cells.length, samplesPerGroup: 3, groups: ["base-control", "base", "head"], concurrency: 1, baseUrl, cache: "fresh context per sample; same no-store server; OS cache uncontrolled", variance: "Timing range and A/A median drift <= half unchanged timing allowance; resource count and bytes stable exactly. No retries or outlier removal.", budgets: "existing performanceRegressions; resourceCountDelta=0", node: process.version, os: { platform: os.platform(), release: os.release(), arch: os.arch(), cpus: os.cpus().length }, playwright: require("playwright/package.json").version, runner: process.env.RUNNER_NAME, image: process.env.ImageVersion });
    browser = await chromium.launch({ headless: true });
    journal.append({ type: "browser", version: browser.version(), executable: chromium.executablePath(), browsers: JSON.parse(fs.readFileSync(path.join(path.dirname(require.resolve("playwright-core/package.json")), "browsers.json"), "utf8")) });
    async function collect(root, cell, group) {
      const server = await createSmokeServer({ rootDir: root, host, port, mountPath }).start();
      const samples = [];
      try {
        for (let sample = 1; sample <= 3; sample++) {
          journal.append({ type: "attempt", cell: key(cell), group, sample });
          const result = await capture(browser, cell);
          samples.push(result);
          journal.append({ type: "sample", cell: key(cell), group, sample, ...result });
        }
      } finally {
        server.closeAllConnections();
        await new Promise(resolve => server.close(resolve));
      }
      return samples;
    }
    for (let index = 0; index < cells.length; index++) {
      const { control, before, after } = await collectCellPair(options, baseCells[index], cells[index], collect, journal);
      const performance = compareCell(control, before, after);
      const geometry = compareGeometry(control, before, after);
      journal.append({ type: "cell", cell: key(cells[index]), performance, geometry });
      for (const [gate, result] of Object.entries({ performance, geometry })) totals[gate][result.status] = (totals[gate][result.status] || 0) + 1;
      if (performance.status !== "passed" || geometry.status !== "passed") failed = true;
      completed++;
    }
  } catch (error) {
    failed = true;
    journal.append({ type: "fatal", message: error.stack || error.message });
  } finally {
    try { await browser?.close(); } catch (error) { failed = true; journal.append({ type: "cleanup-error", message: error.message }); }
    for (const side of ["base", "head"]) {
      try {
        const actual = sourceIdentity(options[side]);
        assertIdentity(actual, options[`${side}-sha`], identities[side]);
        journal.append({ type: "source-end", side, unchanged: true, identity: actual });
      } catch (error) { failed = true; journal.append({ type: "source-end", side, unchanged: false, message: error.message }); }
    }
    if (completed !== 504) failed = true;
    journal.append({ type: "complete", status: failed ? "failed-or-inconclusive" : "qualified", completed, totals, legacyGeometryApproval: "not granted", finishedAt: new Date().toISOString() });
    journal.close();
  }
  return failed ? 1 : 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().then(code => { process.exitCode = code; }).catch(error => { console.error(error); process.exitCode = 1; });
}
