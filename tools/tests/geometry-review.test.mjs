import fs from "node:fs";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { geometryReview, geometryRuntimeRequests, dependencyClosure, dependencyFunctionHashes, geometrySourceBinding, normalizedRuntimePaths, runtimeRequestsFromJournal, verifyCurrentRuntimeRequests, verifyRuntimeRequestCoverage, verifyRuntimeSourceContract, verifyGeometryReview } from "../geometry-review.mjs";
import { compareGeometry, compareCell } from "../qualify-pr.mjs";

const identities = Object.fromEntries(["base", "head"].map(side => [side, { head: side === "base" ? geometryReview.baseSha : geometryReview.admittedHeadSha, status: "", sources: geometryReview.sources[side] }]));
const tools = { runtimeRequests: geometryReview.inventory.runtimeRequestsSha256, visualReview: geometryReview.visualReview.sha256, capture: geometryReview.captureTools, measurementFunctions: geometryReview.measurementFunctions.hashes, dependencyFunctions: geometryReview.dependencyFunctions, replay: geometryReview.replayTools, replayFunctions: geometryReview.replayFunctions.hashes };
function parseTreeRow(row) {
  const separator = row.indexOf("\t");
  assert.notEqual(separator, -1, "Invalid Git tree row");
  const [mode, type, blob] = row.slice(0, separator).split(" ");
  return { file: row.slice(separator + 1), mode, type, blob };
}
function committedIdentity(root) {
  const git = (args, options = {}) => execFileSync("git", args, { cwd: root, ...options });
  const head = git(["rev-parse", "HEAD"], { encoding: "utf8" }).trim();

  const rows = git(["ls-tree", "-rz", "HEAD"], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }).split("\0").filter(Boolean).map(row => {
    const { file, blob } = parseTreeRow(row);
    return [file, blob];
  });
  const files = [];
  for (let index = 0; index < rows.length; index += 512) {
    const slice = rows.slice(index, index + 512);
    const batch = git(["cat-file", "--batch"], { input: `${slice.map(([, blob]) => blob).join("\n")}\n`, maxBuffer: 1024 * 1024 * 1024 });
    let offset = 0;
    for (const [file] of slice) {
      const end = batch.indexOf(10, offset);
      const [, , sizeText] = batch.subarray(offset, end).toString().split(" ");
      const size = Number(sizeText);
      files.push([file, createHash("sha256").update(batch.subarray(end + 1, end + 1 + size)).digest("hex")]);
      offset = end + size + 2;
    }
  }
  return {
    head,
    status: git(["status", "--porcelain=v1", "--untracked-files=all"], { encoding: "utf8" }).trim(),
    digest: createHash("sha256").update(JSON.stringify(files)).digest("hex"),
    files,
  };
}
const review = verifyGeometryReview(geometryReview, identities, tools, () => true);
const cell = "atlas/desktop/light";
function hash(value) {
  return createHash("sha256").update(value).digest("hex");
}
function runtimeContractFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "runtime-source-contract-"));
  const git = (args, options = {}) => execFileSync("git", args, { cwd: root, ...options });
  git(["init", "--quiet"]);
  git(["config", "core.autocrlf", "false"]);
  git(["config", "core.hooksPath", path.join(root, ".git", "no-hooks")]);
  git(["config", "commit.gpgsign", "false"]);
  git(["config", "user.email", "fixture@example.invalid"]);
  git(["config", "user.name", "Runtime Contract Fixture"]);
  const paths = [...new Set(Object.values(geometryRuntimeRequests.surfaces).flatMap(surface => surface.paths))].sort();
  for (const file of paths) {
    const full = path.join(root, file);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, `base:${file}`);
  }
  git(["add", "."]);
  git(["commit", "--quiet", "-m", "base"]);
  const base = git(["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  fs.writeFileSync(path.join(root, paths[0]), `head:${paths[0]}`);
  git(["add", paths[0]]);
  git(["commit", "--quiet", "-m", "head"]);
  const head = git(["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  const tree = revision => new Map(git(["ls-tree", "-rz", revision], { encoding: "utf8" }).split("\0").filter(Boolean).map(row => {
    const { file, mode, blob } = parseTreeRow(row);
    return [file, { mode, blob }];
  }));
  const trees = { base: tree(base), head: tree(head) };
  const contract = structuredClone(geometryRuntimeRequests);
  for (const surface of Object.values(contract.surfaces)) {
    surface.sources = Object.fromEntries(["base", "head"].map(side => [side, Object.fromEntries(surface.paths.map(file => [file, trees[side].get(file)]))]));
  }
  const identity = revision => ({ head: revision, files: paths.map(file => [file, "unused"]) });
  return { root, contract, identities: { base: identity(base), head: identity(head) }, paths, remove: () => fs.rmSync(root, { recursive: true, force: true }) };
}
function fixture() {
  const before = { rect: { top: 0, right: 100, bottom: 100, left: 0, width: 100, height: 100 }, css: { width: "100px", height: "100px", transform: "none", touchAction: "auto", pointerEvents: "auto" }, aspectRatio: 1, intrinsic: [] };
  const after = structuredClone(before);
  for (const [pointer, left, right] of geometryReview.cells[cell]) {
    for (const [geometry, value] of [[before, left], [after, right]]) {
      const parts = pointer.slice(1).split("/");
      const key = parts.pop();
      const parent = parts.reduce((object, part) => object[part] ??= {}, geometry);
      parent[key] = value;
    }
  }
  const samples = geometry => Array.from({ length: 3 }, () => ({ status: "measured", ready: true, errors: [], geometry: structuredClone(geometry) }));
  return [samples(before), samples(before), samples(after)];
}
test("Git tree parsing preserves legal special-character paths", () => {
  assert.deepEqual(parseTreeRow("100644 blob 0123456789abcdef\tdir/name\twith-tab.txt"), {
    file: "dir/name\twith-tab.txt",
    mode: "100644",
    type: "blob",
    blob: "0123456789abcdef",
  });
});
test("committed review has exactly 62 cells and 1590 leaves, no rigid, Sim, or Markov admissions", () => {
  assert.equal(geometryReview.status, "active");
  assert.equal(Object.keys(geometryReview.cells).length, 62);
  assert.equal(Object.values(geometryReview.cells).flat().length, 1590);
  assert(!Object.keys(geometryReview.cells).some(value => /^(rigid-body-collisions|sim|markov-chains)\//.test(value)));
  for (const leaves of Object.values(geometryReview.cells)) assert.equal(new Set(leaves.map(([pointer]) => pointer)).size, leaves.length);
  assert.equal(compareGeometry(...fixture(), review, cell).status, "passed-reviewed");
  assert.equal(compareGeometry(...fixture()).status, "blocked");
});
test("unknown cell or unverified review cannot admit geometry", () => {
  assert.equal(compareGeometry(...fixture(), review, "atlas/desktop/unknown").status, "blocked");
  assert.equal(compareGeometry(...fixture(), {}, cell).status, "blocked");
});
for (const mode of ["unknown-path", "empty-object", "before", "extra", "missing", "protected", "missing-control", "extra-control", "aa", "unstable-control", "unstable-before", "unstable-after", "failed", "not-ready"]) {
  test(`review rejects ${mode}`, () => {
    const groups = fixture();
    if (mode === "empty-object") for (const sample of groups[2]) sample.geometry.rect = { ...sample.geometry.rect, unknown: {} };
    if (mode === "unknown-path") for (const sample of groups[2]) sample.geometry.unknown = 1;
    if (mode === "before") for (const group of groups.slice(0, 2)) for (const sample of group) sample.geometry.rect.height++;
    if (mode === "extra") for (const sample of groups[2]) sample.geometry.rect.width = 7;
    if (mode === "missing") for (const sample of groups[2]) sample.geometry.rect.height = groups[1][0].geometry.rect.height;
    if (mode === "protected") for (const sample of groups[2]) sample.geometry.intrinsic.push({ naturalWidth: 100 });
    if (mode === "missing-control") groups[0].pop();
    if (mode === "extra-control") groups[0].push(structuredClone(groups[0][0]));
    if (mode === "aa") for (const sample of groups[0]) sample.geometry.rect.height++;
    if (mode.startsWith("unstable-")) groups[{ "unstable-control": 0, "unstable-before": 1, "unstable-after": 2 }[mode]][1].geometry.rect.height++;
    if (mode === "failed") groups[2][1].errors.push("capture failed");
    if (mode === "not-ready") groups[1][1].ready = false;
    assert.equal(compareGeometry(...groups, review, cell).status, "blocked");
  });
}
for (const mode of ["base", "head", "visual-review", "capture-tool", "measurement", "replay-tool", "replay-function", "revision", "captured-ancestry", "admitted-ancestry", "dirty", "status", "admission-count"]) {
  test(`source verification rejects ${mode} drift`, () => {
    const actual = structuredClone(identities);
    const actualTools = structuredClone(tools);
    const contract = structuredClone(geometryReview);
    if (mode === "base" || mode === "head") actual[mode].sources.atlas = "0".repeat(64);
    if (mode === "visual-review") actualTools.visualReview = "0".repeat(64);
    if (mode === "capture-tool") actualTools.capture["tools/diagnose-baseline.mjs"] = "0".repeat(64);
    if (mode === "measurement") actualTools.measurementFunctions.measureRuntimeSurface = "0".repeat(64);
    if (mode === "replay-tool") actualTools.replay["tools/qualify-pr.mjs"] = "0".repeat(64);
    if (mode === "replay-function") actualTools.replayFunctions.compareGeometry = "0".repeat(64);
    if (mode === "revision") actual.base.head = "0".repeat(40);
    if (mode === "dirty") actual.head.status = "M pages.json";
    if (mode === "status") contract.status = "withdrawn";
    if (mode === "admission-count") contract.admissions.cells++;
    const isAncestor = (ancestor, descendant) => mode === "captured-ancestry"
      ? ancestor !== contract.capturedHeadSha
      : mode === "admitted-ancestry" ? ancestor !== contract.admittedHeadSha : true;
    assert.throws(() => verifyGeometryReview(contract, actual, actualTools, isAncestor));
  });
}
test("registry binds exact reviewed route, shared, Atlas and geometry metadata dependencies", () => {
  const root = fileURLToPath(new URL("../../", import.meta.url));
  const identity = committedIdentity(root);
  const pages = JSON.parse(execFileSync("git", ["show", "HEAD:pages.json"], { cwd: root }));
  const manifest = JSON.parse(execFileSync("git", ["show", "HEAD:routes.manifest.json"], { cwd: root }));
  const bind = (source = identity, left = pages, right = manifest) => geometrySourceBinding(source, left, right, file => execFileSync("git", ["show", `HEAD:${file}`], { cwd: root, maxBuffer: 64 * 1024 * 1024 }));
  const bound = bind();
  assert.deepEqual(bound.sources, geometryReview.sources.head);
  assert(bound.inventories.atlas.files.includes("shared/tokens.css"));
  assert.deepEqual(bound.inventories.exponentiation.files.filter(file => file.startsWith("ev/")), ["ev/img/setosa.png", "ev/resources/fonts/stix/STIX-Regular.otf", "ev/scripts/angular.js", "ev/scripts/common.js", "ev/scripts/d3.js", "ev/styles/style.css"]);
  for (const file of ["covid-19/index.html", "shared/site.css", "index.html"]) {
    const changed = structuredClone(identity);
    changed.files.find(([path]) => path === file)[1] = "0".repeat(64);
    assert.notDeepEqual(bind(changed).sources, geometryReview.sources.head);
  }
  for (const field of ["title", "summary"]) {
    const changed = structuredClone(pages);
    changed.find(page => page.slug === "musicmap")[field] += " changed";
    assert.notEqual(bind({ ...identity, files: identity.files.map(row => [...row]) }, changed, changed).sources.atlas, geometryReview.sources.head.atlas);
  }
  const selector = structuredClone(manifest);
  selector.find(route => route.slug === "covid-19").experience.runtimeSurface += " changed";
  assert.notEqual(bind({ ...identity, files: identity.files.map(row => [...row]) }, selector, selector).sources["covid-19"], geometryReview.sources.head["covid-19"]);
  const sim = structuredClone(identity);
  sim.files.find(([path]) => path === "sim/index.html")[1] = "0".repeat(64);
  assert.deepEqual(bind(sim).sources, geometryReview.sources.head);
  assert.throws(() => bind({ ...identity, files: [...identity.files, identity.files[0]] }));
});
test("dependency closure follows nested local rendering and module assets", () => {
  const source = {
    "route/index.html": '<link href="../shared/a.css"><script type="module" src="./main.js"></script><img src="image.png" srcset="small.png 1x, /interactive-explanation/large.png 2x"><img src="data:image/png,x">',
    "shared/a.css": '@import url("./b.css");',
    "shared/b.css": '@font-face{src:url("./font.woff2")} .x{background:url(https://example.com/a.png)}',
    "shared/font.woff2": "font",
    "route/main.js": 'import "../module.js"; import("../lazy.js"); new Worker(new URL("../worker.js", import.meta.url)); new URL("../asset.bin", import.meta.url);',
    "module.js": "export const x = 1;",
    "lazy.js": "export default 1;",
    "worker.js": "self.close();",
    "asset.bin": "asset",
    "route/image.png": "image",
    "route/small.png": "small",
    "large.png": "large",
  };
  const identity = { files: Object.entries(source).map(([file, value]) => [file, value]), readFile: file => Buffer.from(source[file]) };
  assert.deepEqual(dependencyClosure(identity, ["route/index.html"]).files.map(([file]) => file), Object.keys(source).sort());
  assert.deepEqual(dependencyClosure(identity, ["route/index.html"]).ignored.map(({ value }) => value), ["data:image/png,x", "https://example.com/a.png"]);
});
test("dependency closure rejects traversal, missing files and dependency changes", () => {
  const fixture = reference => ({ files: [["route/index.html", "entry"], ["route/asset.css", "asset"]], readFile: file => Buffer.from(file === "route/index.html" ? `<link href="${reference}">` : "body{}") });
  assert.throws(() => dependencyClosure(fixture("../../secret.css"), ["route/index.html"]), /escapes repository/);
  assert.throws(() => dependencyClosure(fixture("missing.css"), ["route/index.html"]), /Missing geometry dependency/);
  const before = dependencyClosure(fixture("asset.css"), ["route/index.html"]).files;
  const changed = fixture("asset.css");
  changed.files[1][1] = "changed";
  assert.notDeepEqual(dependencyClosure(changed, ["route/index.html"]).files, before);
});
test("runtime request extraction normalizes local paths and records transient schemes", () => {
  const row = { type: "sample", slug: "atlas", events: [
    { type: "request", url: "http://127.0.0.1:4173/interactive-explanation/" },
    { type: "request", url: "http://127.0.0.1:4173/interactive-explanation/shared/site.css?v=1" },
    { type: "request", url: "https://example.com/external.js" },
    { type: "request", url: "blob:http://127.0.0.1/id" },
  ] };
  assert.deepEqual(runtimeRequestsFromJournal(`${JSON.stringify(row)}\n`), {
    paths: { atlas: ["index.html", "shared/site.css"] },
    ignoredSchemes: { atlas: ["blob:"] },
  });
});
test("current runtime requests normalize queries and reject extras or route/group mismatch", () => {
  const cell = geometryRuntimeRequests.surfaces.atlas.cells[0];
  const inventories = { atlas: { files: ["index.html", "shared/site.css"] } };
  const events = [
    { type: "request", url: "http://local/interactive-explanation/?ignored=1" },
    { type: "request", url: "http://local/interactive-explanation/shared/site.css?v=1#x" },
  ];
  assert.deepEqual(normalizedRuntimePaths(events), ["index.html", "shared/site.css"]);
  assert(verifyCurrentRuntimeRequests(cell, events, inventories));
  assert.throws(() => verifyCurrentRuntimeRequests(cell, [...events, { type: "request", url: "http://local/interactive-explanation/new.js" }], inventories), /Unbound current runtime request/);
  assert.throws(() => verifyCurrentRuntimeRequests("atlas/unknown/light", events, inventories), /route\/group mismatch/);
});
test("runtime source contract rejects changed blobs, modes and missing files", () => {
  const fixture = runtimeContractFixture();
  try {
    const { root, contract, identities: fixtureIdentities } = fixture;
    assert(verifyRuntimeSourceContract(root, fixtureIdentities.head, "head", contract));
    assert(verifyRuntimeSourceContract(root, { ...fixtureIdentities.head, files: fixtureIdentities.head.files.map(([file, digest]) => [file.replaceAll("/", "\\"), digest]) }, "head", contract));
    assert(verifyRuntimeSourceContract(root, fixtureIdentities.base, "base", contract));
    const slug = "atlas";
    const file = contract.surfaces[slug].paths[0];
    const changed = structuredClone(contract);
    delete changed.surfaces["covid-19"];
    assert.throws(() => verifyRuntimeSourceContract(root, fixtureIdentities.head, "head", changed), /surfaces differ/);
    changed.surfaces["covid-19"] = structuredClone(contract.surfaces["covid-19"]);
    changed.surfaces[slug].paths.shift();
    changed.surfaces[slug].count = changed.surfaces[slug].paths.length;
    changed.surfaces[slug].sha256 = hash(JSON.stringify(changed.surfaces[slug].paths));
    assert.throws(() => verifyRuntimeSourceContract(root, fixtureIdentities.head, "head", changed), /inventory differs/);
    changed.surfaces[slug] = structuredClone(contract.surfaces[slug]);
    changed.surfaces[slug].sources.head[file].blob = "0".repeat(40);
    assert.throws(() => verifyRuntimeSourceContract(root, fixtureIdentities.head, "head", changed), /source contract differs/);
    changed.surfaces[slug].sources.head[file] = structuredClone(contract.surfaces[slug].sources.head[file]);
    changed.surfaces[slug].sources.head[file].mode = "100755";
    assert.throws(() => verifyRuntimeSourceContract(root, fixtureIdentities.head, "head", changed), /source contract differs/);
    const missing = structuredClone(fixtureIdentities.head);
    missing.files = missing.files.filter(([path]) => path !== file);
    assert.throws(() => verifyRuntimeSourceContract(root, missing, "head", contract), /Missing runtime source file/);
  } finally {
    fixture.remove();
  }
});
test("runtime request coverage rejects unbound or omitted artifact paths", () => {
  const paths = { route: ["route/index.html", "route/runtime.bin"] };
  const inventories = { route: { files: [...paths.route] } };
  const contract = structuredClone(geometryRuntimeRequests);
  contract.surfaces = { route: { count: 2, sha256: "" } };
  contract.ignoredSchemes = {};
  contract.surfaces.route.sha256 = createHash("sha256").update(JSON.stringify(paths.route)).digest("hex");
  contract.uniqueLocalFiles = 2;
  contract.inventorySha256 = createHash("sha256").update(JSON.stringify(paths)).digest("hex");
  assert(verifyRuntimeRequestCoverage(paths, inventories, {}, contract));
  inventories.route.files.pop();
  assert.throws(() => verifyRuntimeRequestCoverage(paths, inventories, {}, contract), /Uncovered runtime geometry dependency/);
  inventories.route.files.push("route/runtime.bin");
  assert.throws(() => verifyRuntimeRequestCoverage({ route: ["route/index.html"] }, inventories, {}, contract), /request sets differ/);
});
test("geometry review cannot override independent performance failure or functional geometry gate", () => {
  assert.equal(compareGeometry(...fixture(), review, cell).status, "passed-reviewed");
  assert.equal(compareCell(...fixture()).status, "inconclusive");
  const workflow = fs.readFileSync(new URL("../../.github/workflows/ci.yml", import.meta.url), "utf8");
  assert(!workflow.includes("--skip-geometry"));
  assert(workflow.includes("functional-qualified.mjs"));
  assert(workflow.includes("--geometry-output"));
  assert(!workflow.includes("continue-on-error"));
});
