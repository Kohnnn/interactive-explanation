import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { chromium } from "playwright";
import { capture, planCells, openJournal, statistics, geometryChanges, sourceIdentity, verifySourceFixture } from "./diagnose-baseline.mjs";
import { summarizePerformanceRuns, performanceRegressions, validatePerformanceEvidence, validateGeometryEvidence } from "./experience-baseline.mjs";
import { createSmokeServer, createSwitchableSmokeServer } from "./smoke/server.mjs";
import { host, port, mountPath, baseUrl } from "./smoke-bundle.mjs";
import { verifyRigidBrowser } from "./rigid-body-browser.mjs";
import { geometryReview, geometrySourceBinding, geometryFunctionHashes, dependencyFunctionHashes, functionSourceHashes, verifyCurrentRuntimeRequests, verifyGeometryReview, verifyRuntimeSourceContract, admitGeometryReview } from "./geometry-review.mjs";
import { resourceReview, verifyResourceReview, admitResourceReview } from "./resource-review.mjs";
import { resourceIdentityUrl } from "./network-handoff.mjs";

import { simReferenceSha, simCells, simSource, verifySimSources, verifySimNative } from "./sim-reference.mjs";
import { balancedSchedule, emitGeometry, environmentIdentity } from "./geometry-output.mjs";

const require = createRequire(import.meta.url);
const timings = ["domContentLoadedMs", "loadMs"];
export { balancedSchedule };

export async function withFreshBrowser(launch, action) {
  const browser = await launch();
  try { return await action(browser); }
  finally { await browser.close(); }
}

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

export function isGeometryQualified(result) {
  return ["passed", "passed-reviewed"].includes(result.status);
}

export function compareGeometry(control, before, after, review, cell) {
  try {
    for (const samples of [control, before, after]) {
      assert(Array.isArray(samples) && samples.length === 3, "Missing geometry samples");
      for (const sample of samples) {
        assert(["measured", "failed"].includes(sample?.status) && sample.ready === true && Array.isArray(sample.errors) && sample.errors.every(error => error.phase === "performance") && (sample.status === "measured" || sample.errors.length > 0), "Missing or failed geometry sample");
        validateGeometryEvidence(sample.geometry);
        assert.deepEqual(sample.geometry, samples[0].geometry, "Unstable geometry");
      }
    }
    assert.deepEqual(control[0].geometry, before[0].geometry, "Same-source A/A geometry changed");
  } catch (error) { return { status: "blocked", reason: error.message }; }
  const changes = geometryChanges(before[0].geometry, after[0].geometry);
  if (review) {
    try {
      for (const sample of [...control, ...before, ...after]) assert(sample.ready && Array.isArray(sample.errors) && sample.errors.every(error => error.phase === "performance"), "Missing or failed reviewed sample");
      return admitGeometryReview(review, cell, before[0].geometry, after[0].geometry, changes);
    } catch (error) { return { status: "blocked", changes, reason: error.message }; }
  }
  return { status: changes.length ? "blocked" : "passed", changes, reason: changes.length ? "Same-environment source changes require specific review; replacement routes need independent acceptance" : "Same-environment geometry unchanged; not approval of legacy baseline provenance" };
}

export function normalizedUrlMultiset(sample, identity = false) {
  const names = [...(sample.raw?.navigation || []), ...(sample.raw?.resources || [])].map(entry => entry.name);
  const values = identity ? names.map(name => resourceIdentityUrl(name, new URL(baseUrl).origin)) : names;
  return Object.fromEntries([...new Set(values)].sort().map(name => [name, values.filter(value => value === name).length]));
}

export function compareUrlContracts(groups) {
  const names = Object.keys(groups);
  assert.equal(names.length, 3, "Resource comparison requires three groups");
  const contracts = Object.fromEntries(Object.entries(groups).map(([group, samples]) => [group, samples.map(sample => normalizedUrlMultiset(sample, false))]));
  const identities = Object.fromEntries(Object.entries(groups).map(([group, samples]) => [group, samples.map(sample => normalizedUrlMultiset(sample, true))]));
  const unstable = Object.fromEntries(Object.entries(identities).filter(([, values]) => values.some(value => JSON.stringify(value) !== JSON.stringify(values[0]))));
  const exactBase = JSON.stringify(identities[names[0]][0]) === JSON.stringify(identities[names[1]][0]);
  const exactHead = JSON.stringify(identities[names[1]][0]) === JSON.stringify(identities[names[2]][0]);
  const before = identities[names[1]][0];
  const after = identities[names[2]][0];
  const additions = Object.fromEntries(Object.keys(after).filter(url => (after[url] || 0) > (before[url] || 0)).map(url => [url, after[url] - (before[url] || 0)]));
  const removals = Object.fromEntries(Object.keys(before).filter(url => (before[url] || 0) > (after[url] || 0)).map(url => [url, before[url] - (after[url] || 0)]));
  return { status: Object.keys(unstable).length || !exactBase || !exactHead ? "review-required" : "stable", groups: names, contracts, unstable, exactBase, exactHead, additions, removals };
}

export function reviewResourceUrls(urls, review, cell, samples) {
  if (urls.status === "stable") return urls;
  try { return admitResourceReview(review, cell, urls, samples); }
  catch (error) { return { ...urls, reason: error.message }; }
}

export async function collectComparison(options, cells, groups, collect, journal) {
  const cellKey = `${cells[groups[0]].route.slug}/${cells[groups[0]].viewport.name}/${cells[groups[0]].theme}`;
  const samples = Object.fromEntries(groups.map(group => [group, []]));
  for (const group of groups) await collect(options[group], cells[group], group, { warmup: true });
  const schedule = balancedSchedule(options["base-sha"], options["head-sha"], cellKey, groups);
  for (let round = 0; round < schedule.length; round++) {
    for (let ordinal = 0; ordinal < schedule[round].length; ordinal++) {
      const group = schedule[round][ordinal];
      const [result] = await collect(options[group], cells[group], group, { round: round + 1, ordinal: ordinal + 1 });
      samples[group].push(result);
    }
  }
  journal.append({ type: "schedule", cell: cellKey, schedule });
  return samples;
}

export async function collectCellPair(options, baseCell, headCell, collect, journal) {
  const groups = await collectComparison(
    { ...options, "base-control": options["base-control"], base: options.base, head: options.head },
    { "base-control": baseCell, base: baseCell, head: headCell },
    ["base-control", "base", "head"], collect, journal,
  );
  const calibration = compareCell(groups["base-control"], groups.base, groups.base);
  journal.append({ type: "calibration", cell: `${headCell.route.slug}/${headCell.viewport.name}/${headCell.theme}`, result: calibration });
  return { control: groups["base-control"], before: groups.base, after: groups.head };
}

export const rigidAdmission = JSON.parse(fs.readFileSync(new URL("./rigid-original-admission.json", import.meta.url), "utf8"));

function canonicalJson(value) {
  if (Array.isArray(value)) return value.map(canonicalJson);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonicalJson(value[key])]));
}

function routeProjection(source, slug) {
  const routes = JSON.parse(source);
  assert(Array.isArray(routes), "Original admission metadata must be an array");
  const matches = routes.filter(route => route.slug === slug);
  assert.equal(matches.length, 1, `Original admission metadata route count differs: ${slug}`);
  return createHash("sha256").update(JSON.stringify(canonicalJson(matches[0]))).digest("hex");
}

export function verifyRigidAdmission(contract, options, resolveSource, readSource = (root, file) => fs.readFileSync(path.join(root, file), "utf8")) {
  assert.deepEqual(contract, rigidAdmission, "Unknown or modified original admission contract");
  assert.equal(contract.version, 2, "Unknown admission version");
  assert.equal(contract.slug, "rigid-body-collisions", "Unauthorized original route");
  assert.equal(options["base-sha"], contract.baseSha, "Original admission base differs");
  assert(options.reference, "Original reference checkout required");
  for (const side of ["reference", "head"]) {
    for (const [file, hash] of Object.entries(contract.sources)) {
      assert.equal(resolveSource(options[side], file), hash, `Original admission source differs: ${side}/${file}`);
    }
    for (const [file, digest] of Object.entries(contract.projections)) {
      assert.equal(routeProjection(readSource(options[side], file), contract.slug), digest, `Original admission route projection differs: ${side}/${file}`);
    }
  }
  return contract;
}

export async function collectRigidAdmission(options, referenceCell, headCell, collect, journal, legacy) {
  assert.equal(headCell.route.slug, rigidAdmission.slug, "Unauthorized original route");
  assert.equal(referenceCell.route.slug, rigidAdmission.slug, "Unauthorized original reference");
  const cell = `${headCell.route.slug}/${headCell.viewport.name}/${headCell.theme}`;
  journal.append({ type: "legacy-original-evidence", cell, performance: compareCell(legacy.control, legacy.before, legacy.after), geometry: compareGeometry(legacy.control, legacy.before, legacy.after), urls: compareUrlContracts({ "base-control": legacy.control, base: legacy.before, head: legacy.after }), equivalence: "not claimed; archived engine is not the original admission reference" });
  const groups = ["original-control", "original-reference", "original-head"];
  const samples = await collectComparison(
    { ...options, "original-control": options.reference, "original-reference": options.reference, "original-head": options.head },
    { "original-control": referenceCell, "original-reference": referenceCell, "original-head": headCell },
    groups, collect, journal,
  );
  journal.append({ type: "original-calibration", result: compareCell(samples[groups[0]], samples[groups[1]], samples[groups[1]]) });
  return { control: samples[groups[0]], before: samples[groups[1]], after: samples[groups[2]] };
}

export function parseOptions(args) {
  const options = {};
  for (let index = 0; index < args.length; index += 2) {
    const key = args[index];
    assert(["--base-control", "--base", "--head", "--base-sha", "--head-sha", "--output", "--reference", "--sim-reference", "--geometry-output"].includes(key), `Unknown option: ${key}`);
    assert(!Object.hasOwn(options, key.slice(2)), `Duplicate option: ${key}`);
    const value = args[index + 1];
    assert(value && !value.startsWith("--"), `Missing value: ${key}`);
    options[key.slice(2)] = value;
  }
  for (const key of ["base-control", "base", "head", "base-sha", "head-sha", "output"]) assert(options[key], `Required: --${key}`);
  for (const key of ["base-sha", "head-sha"]) assert(/^[a-f0-9]{40}$/.test(options[key]), `Invalid SHA: ${key}`);
  for (const key of ["base-control", "base", "head"]) options[key] = fs.realpathSync(options[key]);
  options["base-control-sha"] = options["base-sha"];
  if (options.reference) {
    options.reference = fs.realpathSync(options.reference);
    options["reference-sha"] = rigidAdmission.referenceSha;
    assert(![options["base-control"], options.base, options.head].includes(options.reference), "Separate original reference required");
  }
  if (options["sim-reference"]) {
    options.sim = fs.realpathSync(options["sim-reference"]);
    options["sim-sha"] = simReferenceSha;
    assert(![options["base-control"], options.base, options.head, options.reference].includes(options.sim), "Separate fixed Sim reference required");
  }
  for (const name of ["output", "geometry-output"].filter(name => options[name])) {
    options[name] = path.join(fs.realpathSync(path.dirname(path.resolve(options[name]))), path.basename(options[name]));
    for (const root of [options["base-control"], options.base, options.head, options.reference, options.sim].filter(Boolean)) {
      const relative = path.relative(root, options[name]);
      assert(relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative), "Evidence must be outside measured sources");
    }
    assert(!fs.existsSync(options[name]), "Evidence output already exists");
  }
  if (options["geometry-output"]) {
    assert(options.sim && options.reference, "Geometry output requires independent references");
    assert.notEqual(options["geometry-output"], options.output);
    assert.notEqual(`${options["geometry-output"]}.proof.json`, options.output);
    assert(!fs.existsSync(`${options["geometry-output"]}.proof.json`), "Geometry proof already exists");
  }
  assert.equal(new Set([options["base-control"], options.base, options.head]).size, 3, "Separate immutable base-control, base, and head checkouts required");
  return options;
}

export async function main(args = process.argv.slice(2)) {
  const options = parseOptions(args);
  const journal = openJournal(options.output);
  const identities = {};
  let browser;
  let failed = false;
  let completed = 0;
  let sourcesVerified = true;
  let nativeSim = "blocked";
  let environment;
  const geometryRows = [];
  const totals = { performance: {}, geometry: {} };
  const manifest = root => JSON.parse(fs.readFileSync(path.join(root, "routes.manifest.json"), "utf8"));
  try {
    for (const side of ["base-control", "base", "head", ...(options.reference ? ["reference"] : []), ...(options.sim ? ["sim"] : [])]) {
      identities[side] = sourceIdentity(options[side]);
      assertIdentity(identities[side], options[`${side}-sha`]);
      const verified = verifySourceFixture(options[side], options[side], options[`${side}-sha`], "");
      journal.append({ type: "source", side, identity: identities[side], verified });
    }
    const metadata = Object.fromEntries(["base", "head"].map(side => [side, {
      pages: JSON.parse(fs.readFileSync(path.join(options[side], "pages.json"), "utf8")),
      manifest: manifest(options[side]),
    }]));
    const gitBytes = (root, revision, file) => execFileSync("git", ["show", `${revision}:${file}`], { cwd: root, maxBuffer: 64 * 1024 * 1024 });
    const isAncestor = (ancestor, descendant) => {
      try {
        execFileSync("git", ["merge-base", "--is-ancestor", ancestor, descendant], { cwd: options.head, stdio: "ignore" });
        return true;
      } catch { return false; }
    };
    const geometryBindings = Object.fromEntries(["base", "head"].map(side => [side, geometrySourceBinding(identities[side], metadata[side].pages, metadata[side].manifest, file => fs.readFileSync(path.join(options[side], file)))]));
    for (const side of ["base", "head"]) verifyRuntimeSourceContract(options[side], identities[side], side);
    const reviewedGeometry = verifyGeometryReview(
      geometryReview,
      geometryBindings,
      {
        runtimeRequests: createHash("sha256").update(fs.readFileSync(path.join(options.head, "tools/geometry-runtime-requests.json"))).digest("hex"),
        visualReview: createHash("sha256").update(fs.readFileSync(path.join(options.head, geometryReview.visualReview.path))).digest("hex"),
        capture: Object.fromEntries(Object.keys(geometryReview.captureTools).map(file => [file, createHash("sha256").update(gitBytes(options.head, geometryReview.capturedHeadSha, file)).digest("hex")])),
        measurementFunctions: geometryFunctionHashes(fs.readFileSync(path.join(options.head, "tools/smoke-bundle.mjs"), "utf8")),
        dependencyFunctions: dependencyFunctionHashes(),
        replay: Object.fromEntries(Object.keys(geometryReview.replayTools).map(file => [file, createHash("sha256").update(gitBytes(options.head, geometryReview.admittedHeadSha, file)).digest("hex")])),
        replayFunctions: {
          ...functionSourceHashes(fs.readFileSync(path.join(options.head, "tools/diagnose-baseline.mjs"), "utf8"), geometryReview.replayFunctions.files["tools/diagnose-baseline.mjs"]),
          ...functionSourceHashes(fs.readFileSync(path.join(options.head, "tools/qualify-pr.mjs"), "utf8"), geometryReview.replayFunctions.files["tools/qualify-pr.mjs"]),
          ...functionSourceHashes(fs.readFileSync(path.join(options.head, "tools/geometry-review.mjs"), "utf8"), geometryReview.replayFunctions.files["tools/geometry-review.mjs"]),
          ...functionSourceHashes(fs.readFileSync(path.join(options.head, "tools/geometry-output.mjs"), "utf8"), geometryReview.replayFunctions.files["tools/geometry-output.mjs"]),
          ...functionSourceHashes(fs.readFileSync(path.join(options.head, "tools/experience-baseline.mjs"), "utf8"), geometryReview.replayFunctions.files["tools/experience-baseline.mjs"]),
        },
      },
      isAncestor,
    );
    const reviewedResources = verifyResourceReview(resourceReview, { base: identities.base, head: identities.head }, metadata.head.manifest, isAncestor);
    journal.append({ type: "geometry-review-contract", status: geometryReview.status, reviewSha256: geometryReview.reviewSha256, rawSha256: geometryReview.rawSha256, activeAdmissions: Object.keys(geometryReview.cells).length, legacyGeometryApproval: "not granted" });
    journal.append({ type: "resource-review-contract", version: resourceReview.version, cells: resourceReview.reviews.flatMap(review => review.cells), state: resourceReview.reviews.length ? "reviewed entries present" : "empty; no resource differences admitted" });
    if (options.reference) {
      verifyRigidAdmission(rigidAdmission, options, (root, file) => execFileSync("git", ["rev-parse", `HEAD:${file}`], { cwd: root, encoding: "utf8" }).trim());
      journal.append({ type: "original-admission-contract", contract: rigidAdmission, equivalence: "not claimed", budgets: "unchanged; compared only with pinned original reference" });
      const science = execFileSync(process.execPath, ["--test", "tools/tests/rigid-body-collisions.test.mjs"], { cwd: options.head, encoding: "utf8" });
      journal.append({ type: "original-science", status: "passed", output: science });
    }
    if (options.sim) journal.append({ type: "sim-reference-contract", contract: verifySimSources(simSource(options.sim), simSource(options.head)), performance: "original base remains mandatory" });
    const simReferenceCells = options.sim ? planCells(manifest(options.sim), ["sim"]) : [];
    const referenceCells = options.reference ? planCells(manifest(options.reference), [rigidAdmission.slug]) : [];
    const cells = planCells(manifest(options.head), []);
    const baseCells = planCells(manifest(options.base), []);
    const key = cell => `${cell.route.slug}/${cell.viewport.name}/${cell.theme}`;
    assert.deepEqual(baseCells.map(key), cells.map(key), "Route matrix changed; requires qualification contract review");
    assert.equal(cells.length, 504, "Expected 83 routes plus Atlas, three viewports, two themes");
    journal.append({ type: "method", cells: cells.length, warmupsPerGroup: 1, samplesPerGroup: 3, groups: ["base-control", "base", "head"], concurrency: 1, order: "SHA-seeded cyclic triplets; every group occupies every ordinal once", baseUrl, server: "one origin and one race-safe switchable server per cell; connections closed before root switch", cache: "unscored warm-up per source/group URL contract; fresh context per observation; fresh browser process per cell; no-cache revalidation permits same-document request coalescing without cross-observation browser cache reuse; OS cache uncontrolled", fixture: "all Teoria sources queue only exact local piano MP3 requests until window load, then release every request before readiness and resource collection", urls: "fragments stripped; HTTP query keys sorted and retained in raw contracts; numeric local cache-buster-only queries compare by origin/path identity; exact stable base-control/base multisets required; head changes require exact cell-, SHA-, and blob-bound resource-review registry admission; transfer/count budgets remain independent", readiness: "readyMs captured immediately after manifest readiness and retained only in journal; no budget or pass effect", variance: "Timing range and A/A median drift <= half unchanged timing allowance; resource count and bytes stable exactly. No retries or outlier removal.", budgets: "existing performanceRegressions; resourceCountDelta=0", node: process.version, os: { platform: os.platform(), release: os.release(), arch: os.arch(), cpus: os.cpus().length }, playwright: require("playwright/package.json").version, runner: process.env.RUNNER_NAME, image: process.env.ImageVersion });
    environment = environmentIdentity();
    journal.append({ type: "environment", identity: environment });
    browser = await chromium.launch({ headless: true });
    journal.append({ type: "browser", version: browser.version(), executable: chromium.executablePath(), browsers: JSON.parse(fs.readFileSync(path.join(path.dirname(require.resolve("playwright-core/package.json")), "browsers.json"), "utf8")) });
    let cellServer;
    async function collect(root, cell, group, position = {}) {
      assert(cellServer, "Cell server unavailable");
      await cellServer.switchRoot(root);
      const kind = position.warmup ? "warmup" : "attempt";
      journal.append({ type: kind, cell: key(cell), group, ...position });
      const result = await capture(browser, cell);
      if (Object.hasOwn(geometryReview.cells, key(cell))) verifyCurrentRuntimeRequests(key(cell), result.events, geometryBindings[group === "head" ? "head" : "base"].inventories);
      journal.append({ type: position.warmup ? "warmup-sample" : "sample", cell: key(cell), group, ...position, ...result });
      return position.warmup ? [] : [result];
    }
    if (options.reference) journal.append({ type: "original-functional", status: "passed", evidence: await verifyRigidBrowser(options.head, browser) });
    if (options.sim) {
      const server = await createSmokeServer({ rootDir: options.head, host, port, mountPath }).start();
      try {
        for (const cell of cells.filter(cell => simCells.includes(key(cell)))) journal.append({ type: "sim-native", cell: key(cell), evidence: await verifySimNative(browser, cell) });
        nativeSim = "passed";
      } catch (error) {
        failed = true;
        journal.append({ type: "sim-native", status: "blocked", message: error.stack || error.message });
      } finally {
        server.closeAllConnections();
        await new Promise(resolve => server.close(resolve));
      }
    }
    await browser.close();
    browser = undefined;
    for (let index = 0; index < cells.length; index++) {
      try {
        await withFreshBrowser(
          () => chromium.launch({ headless: true }),
          async freshBrowser => {
            browser = freshBrowser;
            cellServer = await createSwitchableSmokeServer({ rootDir: options.base, host, port, mountPath });
            try {
              let pair = await collectCellPair(options, baseCells[index], cells[index], collect, journal);
              const rigid = options.reference && cells[index].route.slug === rigidAdmission.slug;
              if (rigid) pair = await collectRigidAdmission(options, referenceCells.find(cell => key(cell) === key(cells[index])), cells[index], collect, journal, pair);
              const { control, before, after } = pair;
              const rawUrls = compareUrlContracts(rigid
                ? { "original-control": control, "original-reference": before, "original-head": after }
                : { "base-control": control, base: before, head: after });
              const urls = rigid ? rawUrls : reviewResourceUrls(rawUrls, reviewedResources, key(cells[index]), { base: before, head: after });
              journal.append({ type: "resource-urls", cell: key(cells[index]), status: urls.status, urls });
              const performance = compareCell(control, before, after);
              if (!["stable", "passed-reviewed-resource"].includes(urls.status)) {
                performance.status = "inconclusive";
                performance.reasons.push("Requested URL multiset changed or was unstable; exact source-bound review required");
              }
              let geometry = compareGeometry(control, before, after, Object.hasOwn(geometryReview.cells, key(cells[index])) ? reviewedGeometry : undefined, key(cells[index]));
              let headGeometry = after[0]?.geometry;
              if (options.sim && simCells.includes(key(cells[index]))) {
                journal.append({ type: "legacy-sim-geometry", cell: key(cells[index]), geometry, performance });
                const fixedCell = simReferenceCells.find(cell => key(cell) === key(cells[index]));
                const groups = ["sim-fixed-control", "sim-fixed-reference", "sim-fixed-head"];
                const fixed = await collectComparison(
                  { ...options, [groups[0]]: options.sim, [groups[1]]: options.sim, [groups[2]]: options.head },
                  { [groups[0]]: fixedCell, [groups[1]]: fixedCell, [groups[2]]: cells[index] }, groups, collect, journal,
                );
                const fixedUrls = compareUrlContracts({ "base-control": fixed[groups[0]], base: fixed[groups[1]], head: fixed[groups[2]] });
                journal.append({ type: "sim-fixed-urls", cell: key(cells[index]), urls: fixedUrls });
                geometry = compareGeometry(fixed[groups[0]], fixed[groups[1]], fixed[groups[2]]);
                if (fixedUrls.status !== "stable") geometry = { status: "blocked", reason: "Fixed Sim requested URL multiset changed or was unstable; declared source review required", urls: fixedUrls };
                headGeometry = fixed[groups[2]][0]?.geometry;
              }
              geometryRows.push({ cell: key(cells[index]), geometry, headGeometry });
              journal.append({ type: "cell", cell: key(cells[index]), performance, geometry, urls });
              for (const [gate, result] of Object.entries({ performance, geometry })) totals[gate][result.status] = (totals[gate][result.status] || 0) + 1;
              if (performance.status !== "passed" || !isGeometryQualified(geometry)) failed = true;
              completed++;
            } finally {
              await cellServer.close();
              cellServer = undefined;
            }
          },
        );
      } finally {
        browser = undefined;
      }
    }
  } catch (error) {
    failed = true;
    journal.append({ type: "fatal", message: error.stack || error.message });
  } finally {
    try { await browser?.close(); } catch (error) { failed = true; journal.append({ type: "cleanup-error", message: error.message }); }
    for (const side of ["base-control", "base", "head", ...(options.reference ? ["reference"] : []), ...(options.sim ? ["sim"] : [])]) {
      try {
        const actual = sourceIdentity(options[side]);
        assertIdentity(actual, options[`${side}-sha`], identities[side]);
        journal.append({ type: "source-end", side, unchanged: true, identity: actual });
      } catch (error) { failed = true; sourcesVerified = false; journal.append({ type: "source-end", side, unchanged: false, message: error.message }); }
    }
    if (completed !== 504) failed = true;
    const geometryQualified = completed === 504 && sourcesVerified && nativeSim === "passed" && geometryRows.every(row => isGeometryQualified(row.geometry));
    journal.append({ type: "complete", status: failed ? "failed-or-inconclusive" : "qualified", completed, totals, geometryQualified, legacyGeometryApproval: "not granted", finishedAt: new Date().toISOString() });
    journal.close();
    if (options["geometry-output"] && geometryQualified) {
      try {
        emitGeometry(options["geometry-output"], manifest(options.head), JSON.parse(fs.readFileSync(path.join(options.head, "tools/experience-baselines.json"))), geometryRows, { sourcesVerified, nativeSim, environment, head: identities.head, sources: identities, journal: options.output });
      } catch (error) { failed = true; console.error(error); }
    }
  }
  return failed ? 1 : 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().then(code => { process.exitCode = code; }).catch(error => { console.error(error); process.exitCode = 1; });
}
