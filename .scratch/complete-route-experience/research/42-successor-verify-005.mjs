import assert from "node:assert/strict";
import fs from "node:fs";
import readline from "node:readline";
import { createHash } from "node:crypto";
import { geometryChanges as rawGeometryChanges } from "../../../interactive-explanation/tools/diagnose-baseline.mjs";
const geometryChanges = (...args) => rawGeometryChanges(...args).map(change => ({ ...change, review: "exact geometry reviewed; historical reconstruction and authored change kept separate; not route acceptance" }));
import { validateExperienceBaseline } from "../../../interactive-explanation/tools/experience-baseline.mjs";

const read = name => JSON.parse(fs.readFileSync(new URL(name, import.meta.url)));
const hash = bytes => createHash("sha256").update(bytes).digest("hex");
const bytes = value => JSON.stringify(value, null, 2) + "\n";
const routes39 = ["exponentiation", "public-private-keys", "linear-regression", "precision-recall", "train-test-validation", "memory-allocation", "blockchain-101-combined-flow"];
const routes41 = ["remember", "covid-19", "sim", "reading-qr-codes-without-a-computer"];
const viewports = { desktop: [1400, 1000], mobile: [390, 844], narrow: [320, 844] };
const review004 = read("40-reviewed-cells-review-004.json");
const predecessor = read("01-w0-geometry-successor-003.json");
assert.equal(hash(fs.readFileSync(new URL("01-w0-geometry-successor-003.json", import.meta.url))), review004.predecessorSha256);
function apply(target, changes) {
  for (const { path, before, after } of changes) {
    const fields = path.slice(1).split("/");
    assert(fields.every(field => !["__proto__", "prototype", "constructor"].includes(field)));
    const last = fields.pop();
    const owner = fields.reduce((value, field) => value[field], target);
    assert.deepEqual(owner[last], before, path);
    owner[last] = after;
  }
}
apply(predecessor, review004.approved.flatMap(cell => cell.changes));
assert.equal(hash(bytes(predecessor)), review004.successorSha256);
const successor = structuredClone(predecessor);
const artifacts = [];
async function load(file, digest, length) {
  const buffer = fs.readFileSync(file);
  assert.equal(hash(buffer), digest, file);
  if (length !== undefined) assert.equal(buffer.length, length, file);
  artifacts.push({ file, bytes: buffer.length, sha256: digest });
  const rows = [];
  for await (const line of readline.createInterface({ input: fs.createReadStream(file), crlfDelay: Infinity })) rows.push(JSON.parse(line));
  return rows;
}
const evidence39 = read("39-owned-reflow-final-evidence.json");
const captures39 = [];
for (const item of evidence39.artifacts) captures39.push(await load(item.file, item.sha256, item.bytes));
const captures41 = [];
for (const side of ["before", "after"]) {
  const saved = read(`41-native-${side}.json`);
  captures41.push(await load(saved.rawPath, saved.rawSha256));
}
const fullInventory = read("01-w0-raw-artifacts-09505db.json");
const historyInventory = read("01-w0-geometry-artifacts-002.json");
const history = [];
for (const [inventory, name] of [[fullInventory, "full-001.jsonl"], [historyInventory, "historical-all-001.jsonl"], [historyInventory, "historical-mlu-001.jsonl"]]) {
  const item = (inventory.inventory || inventory.artifacts).find(item => item.name === name);
  history.push(await load(`${inventory.root}/${name}`, item.sha256, item.bytes));
}
const identities = [...captures39, ...captures41, ...history].map(rows => {
  const identity = rows.find(row => row.type === "identity");
  const end = rows.find(row => row.type === "source-end");
  assert.equal(end.unchanged, true);
  if (end.source) assert.deepEqual(end.source, identity.source);
  assert.equal(identity.browser || rows.find(row => row.type === "browser").version, "148.0.7778.96");
  return { ...identity, source: { ...identity.source, fileCount: identity.source.files.length, files: undefined }, completion: rows.find(row => row.type === "complete") || { type: end.type, unchanged: end.unchanged } };
});
const sourceChanges = [];
for (const [pair, expected] of [[captures39, ["blockchain-101-combined-flow/index.html", "exponentiation/index.html", "exponentiation/style.css", "linear-regression/index.html", "memory-allocation/index.html", "precision-recall/index.html", "public-private-keys/index.html", "train-test-validation/index.html"]], [captures41, ["covid-19/css/index.css", "reading-qr-codes-without-a-computer/a11y-labels.js", "reading-qr-codes-without-a-computer/index.html", "remember/css/comic.css", "sim/index.html"]]]) {
  const [before, after] = pair.map(rows => rows[0].source.files);
  assert.deepEqual(before.map(([name]) => name), after.map(([name]) => name));
  const changes = after.filter((entry, index) => entry[1] !== before[index][1]);
  assert.deepEqual(changes.map(([name]) => name), expected);
  for (const [name, digest] of changes) assert.equal(hash(fs.readFileSync(new URL(`../../../interactive-explanation/${name}`, import.meta.url))), digest, name);
  sourceChanges.push(...changes);
}
function select(rows, slug, viewport) {
  return rows.filter(row => row.type === "sample" && row.slug === slug && row.viewport.name === viewport);
}
function six(samples) {
  assert.equal(samples.length, 6);
  for (const theme of ["light", "dark"]) assert.deepEqual(samples.filter(row => row.theme === theme).map(row => row.sample).sort(), [1, 2, 3]);
}
function protectedGeometry(before, after) {
  const fields = value => Object.fromEntries(Object.entries(value).filter(([key]) => !["rect", "css", "aspectRatio", "intrinsic"].includes(key)));
  assert.deepEqual(fields(before), fields(after));
  assert.deepEqual(before.intrinsic.map(fields), after.intrinsic.map(fields));
  const css = value => Object.fromEntries(Object.entries(value.css).filter(([key]) => !["width", "height"].includes(key)));
  assert.deepEqual(css(before), css(after));
}
function classify(sample, after = false) {
  assert.deepEqual([sample.viewport.width, sample.viewport.height], viewports[sample.viewport.name]);
  assert.equal(sample.raw.viewportWidth, sample.viewport.width);
  assert.equal(sample.ready, true);
  assert.equal(sample.status, "measured");
  assert.deepEqual(sample.errors, []);
  const failures = sample.events.filter(event => event.type === "requestfailed" || event.type === "pageerror" || event.type === "console-error" || event.type === "console" && event.level === "error" || event.type === "response" && event.status >= 400);
  assert.deepEqual(failures, []);
  const requests = sample.events.filter(event => event.type === "request");
  assert(requests.length > 0);
  for (const request of requests) assert.equal(new URL(request.url).origin, "http://127.0.0.1:" + new URL(requests[0].url).port);
  const overflow = sample.raw.documentWidth - sample.raw.viewportWidth;
  if (after) assert.equal(overflow, sample.slug === "precision-recall" && sample.viewport.name === "narrow" ? 1 : 0);
  return { theme: sample.theme, sample: sample.sample, status: sample.status, errors: sample.errors, requests: requests.length, network: "same-origin; no failed requests, HTTP errors or runtime errors", documentWidth: sample.raw.documentWidth, viewportWidth: sample.raw.viewportWidth, overflow, viewportClassification: overflow > 1 ? "existing BEFORE overflow; not accepted" : overflow === 1 ? "retained 1px precision-recall residual within unchanged gate tolerance; not rounded to zero" : "no document overflow" };
}
function authored(before, after, slug, viewport) {
  protectedGeometry(before, after);
  const expected = structuredClone(before);
  const height = {
    exponentiation: { mobile: 86.1875, narrow: 81.59375 },
    "public-private-keys": { mobile: -815.828125, narrow: -635.609375 },
    "linear-regression": { desktop: 163.1875, narrow: 84.296875 },
    "blockchain-101-combined-flow": { mobile: -435.421875, narrow: -191.75 },
    "covid-19": { desktop: -36, mobile: -36, narrow: -36 },
    "reading-qr-codes-without-a-computer": { narrow: 779.265625 },
  }[slug]?.[viewport] || 0;
  if (slug === "sim") {
    assert.deepEqual(before.intrinsic, after.intrinsic);
    assert(geometryChanges(before, after).every(change => /^\/(rect\/(top|bottom|height)|css\/height|aspectRatio)$/.test(change.path)));
    return;
  }
  if (height) {
    expected.rect.bottom += height;
    expected.rect.height += height;
    assert(Math.abs(Number.parseFloat(after.css.height) - expected.rect.height) <= 0.05, "serialized CSS height rounds to at most one decimal place; exact rect retained");
    assert.equal(after.aspectRatio, expected.rect.width / expected.rect.height);
    expected.css.height = after.css.height;
    expected.aspectRatio = after.aspectRatio;
  }
  let decorated = 0;
  const qrOffsets = [79.6875, 367.609375, 412.71875, 668, 729.4375, 758.234375, 787.03125, 815.828125];
  for (const [index, surface] of expected.intrinsic.entries()) {
    const rect = surface.rect;
    if (slug === "exponentiation" || slug === "linear-regression" && index > 0) {
      rect.top += height;
      rect.bottom += height;
    }
    if (slug === "train-test-validation" && viewport === "desktop" && [9, 10].includes(index)) {
      rect.left -= 4;
      rect.right -= 4;
    }
    if (slug === "covid-19") {
      rect.top -= decorated * 2;
      rect.bottom -= decorated * 2;
      if ([2, 4, 5, 8, 10, 11, 13, 14, 18, 19, 24, 27, 28, 29, 30, 34, 40, 47].includes(index)) {
        assert.equal(surface.tag, "img");
        for (const field of ["right", "bottom", "width", "height"]) rect[field] -= 2;
        decorated++;
      }
    }
    if (slug === "reading-qr-codes-without-a-computer" && viewport === "narrow" && index >= 8) {
      const delta = index < 16 ? qrOffsets[index - 8] : height;
      rect.top += delta;
      rect.bottom += delta;
      if (index < 16) {
        assert.equal(rect.width, 192);
        assert.equal(rect.height, 192);
        rect.left -= 111;
        rect.right -= 111;
      }
    }
  }
  if (slug === "covid-19") assert.equal(decorated, 18);
  assert.deepEqual(after, expected, `${slug}/${viewport}: unexplained authored delta`);
}
const cells = [];
for (const [pair, slugs] of [[captures39, routes39], [captures41, routes41]]) {
  for (const rows of pair) assert.equal(rows.filter(row => row.type === "sample").length, slugs.length * 18);
  for (const slug of slugs) for (const viewport of Object.keys(viewports)) {
    const [before, after] = pair.map(rows => select(rows, slug, viewport));
    six(before);
    six(after);
    for (const sample of after) assert.deepEqual(sample.geometry, after[0].geometry);
    if (slug !== "sim") for (const sample of before) assert.deepEqual(sample.geometry, before[0].geometry);
    const classifications = { before: before.map(sample => classify(sample)), after: after.map(sample => classify(sample, true)) };
    for (const b of before) for (const a of after) authored(b.geometry, a.geometry, slug, viewport);
    const pointer = `/routes/${slug}/geometry/${viewport}`;
    const inherited = predecessor.routes[slug].geometry[viewport];
    const historical = history.map(rows => select(rows, slug, viewport));
    const witnesses = historical.map((samples, index) => {
      if (!samples.length) return { artifact: artifacts[index + 4].file, samples: [] };
      six(samples);
      if (slug === "covid-19" && index === 1) return { artifact: artifacts[index + 4].file, excluded: "historical route absent: HTTP404/readiness/theme/scroll/geometry/runtime/console failures; no reconstruction authority", samples: samples.map(sample => ({ theme: sample.theme, sample: sample.sample, status: sample.status, errors: sample.errors, failures: sample.events.filter(event => event.type === "requestfailed" || event.type === "response" && event.status >= 400) })) };
      return { artifact: artifacts[index + 4].file, samples: samples.map(sample => ({ ...classify(sample), equalsBefore: JSON.stringify(sample.geometry) === JSON.stringify(before[0].geometry), geometrySha256: hash(bytes(sample.geometry)) })) };
    });
    if (slug !== "sim") {
      const authority = [historical[0], historical[["linear-regression", "precision-recall"].includes(slug) ? 2 : 1]];
      for (const samples of slug === "covid-19" ? authority.slice(0, 1) : authority) {
        six(samples);
        for (const sample of samples) assert.deepEqual(sample.geometry, before[0].geometry, `${slug}/${viewport}: historical reconstruction mismatch`);
      }
    }
    for (const sample of before) protectedGeometry(inherited, sample.geometry);
    const variants = [...new Set(before.map(sample => JSON.stringify(sample.geometry)))].map(value => ({ geometry: JSON.parse(value), samples: before.filter(sample => JSON.stringify(sample.geometry) === value).map(({ theme, sample }) => ({ theme, sample })) }));
    const reconstruction = variants.map(({ geometry, samples }) => ({ samples, changes: geometryChanges(inherited, geometry, pointer) }));
    const authoredDelta = variants.map(({ geometry, samples }) => ({ samples, changes: geometryChanges(geometry, after[0].geometry, pointer) }));
    const changes = geometryChanges(inherited, after[0].geometry, pointer);
    successor.routes[slug].geometry[viewport] = after[0].geometry;
    cells.push({ slug, viewport, samplesPerSide: 6, classifications, historical: witnesses, reconstruction, authoredDelta, changes, geometryOnly: true, limitation: slug === "sim" ? "AFTER typography geometry only; variable BEFORE is not reconstructed as a single stable state; current 0x0 grid remains a hard rendering failure" : slug === "train-test-validation" ? "Passive geometry only; all18 authored interaction samples retain the BEFORE includes exception; TTV merge and browser rerun required" : slug === "covid-19" ? "Full09505db equals six paired BEFORE samples; historical7c71c99 route absent and explicitly excluded, not claimed equal" : "Historical reconstruction separate from exact authored reflow; bounded native scrolling allowed; no complete interaction or route acceptance" });
  }
}
assert.equal(cells.length, 33);
const interactionEvidence = read("39-owned-reflow-interaction-evidence.json");
const interactions = [];
for (const name of ["39-owned-interactions-before.jsonl", "39-owned-final-interactions-after.jsonl"]) {
  const item = interactionEvidence.artifacts.find(item => item.file.endsWith(`/${name}`));
  const rows = await load(item.file, item.sha256, item.bytes);
  assert.equal(rows.length, 126);
  interactions.push({ artifact: item.file, rows });
}
for (const side of ["before", "after"]) {
  const saved = read(`41-native-${side}.json`);
  const file = `/tmp/opencode/41-interactions-${side}-v2.jsonl`;
  const rows = fs.readFileSync(file, "utf8").trim().split("\n").map(JSON.parse);
  assert.deepEqual(rows, saved.interactions);
  artifacts.push({ file, bytes: fs.statSync(file).size, sha256: hash(fs.readFileSync(file)) });
  assert.equal(rows.filter(row => row.type === "interaction").length, 72);
  for (const row of rows.filter(row => row.type === "interaction" && row.slug === "sim")) {
    assert.equal(row.before.grid.width, 0);
    assert.equal(row.before.grid.height, 0);
    assert.equal(row.before.tileSize, 0);
  }
  interactions.push({ artifact: file, rows: rows.filter(row => row.type === "interaction") });
}
const interactionReview = interactions.map(({ artifact, rows }) => ({ artifact, cells: Object.entries(Object.groupBy(rows, row => `${row.slug}/${row.viewport.name}`)).map(([cell, samples]) => {
  six(samples);
  return { cell, samples: samples.map(({ theme, sample, status, error, events }) => ({ theme, sample, status, error, events })), passed: samples.filter(row => row.status === "passed").length, failed: samples.filter(row => row.status !== "passed").length };
}) }));
assert.equal(interactionReview[1].cells.reduce((sum, cell) => sum + cell.passed, 0), 108);
assert(interactionReview[1].cells.filter(cell => cell.failed).every(cell => cell.cell.startsWith("train-test-validation/")));
assert.equal(interactionReview[3].cells.reduce((sum, cell) => sum + cell.passed, 0), 72);
validateExperienceBaseline(successor, Object.keys(predecessor.routes));
for (const slug of Object.keys(predecessor.routes)) for (const theme of ["light", "dark"]) assert.deepEqual(successor.routes[slug][theme], predecessor.routes[slug][theme]);
const order = changes => changes.toSorted((a, b) => a.path.localeCompare(b.path));
assert.deepEqual(order(geometryChanges(predecessor, successor)), order(cells.flatMap(cell => cell.changes)));
assert.deepEqual(predecessor.routes["rigid-body-collisions"], successor.routes["rigid-body-collisions"]);
const review = { source: "4c4c352", scope: "CPU-only exact successor005 geometry review over004; 42+24 theme cells, 198 samples each side; no browser or full/59strict pass claim", predecessorSha256: hash(bytes(predecessor)), successorSha256: hash(bytes(successor)), performance: "All inherited performance values unchanged; paired timing evidence not promoted", tolerance: "Exact sample geometry equality; exact path/value deltas. CSS serialization may round <=0.05px against exact rect; precision narrow retains measured1px overflow under unchanged1px gate, never zeroed", artifacts, identities, sourceChanges, cells, interactionReview, blockers: ["rigid-body-collisions: initialization still known broken; all predecessor fields retained", "sim: 0x0 grid in all36 BEFORE/AFTER initial interaction samples, despite stable typography and narrow helper passes", "train-test-validation: existing includes action exception; wait for parent TTV merge and exclusive browser release"], next: "After parent notification only: original full and59strict gates, then each remaining normal route individually; retain exact errors/network/viewport evidence; no shared-tool/source changes without parent approval" };
const reviewUrl = new URL("42-successor-review-005.json", import.meta.url);
if (process.argv.includes("--refresh-review")) {
  assert.equal(read("42-successor-review-005.json").successorSha256, review.successorSha256);
  fs.writeFileSync(reviewUrl, bytes(review));
} else if (process.argv.includes("--create-review")) fs.writeFileSync(reviewUrl, bytes(review), { flag: "wx" });
else assert.deepEqual(read("42-successor-review-005.json"), JSON.parse(JSON.stringify(review)));
if (process.argv.includes("--negative-check")) {
  const sample = captures39[1].find(row => row.type === "sample" && row.slug === "exponentiation");
  for (const mutation of [row => row.errors.push({ phase: "runtime", message: "unexpected" }), row => row.events.push({ type: "response", status: 404 }), row => row.events.push({ type: "requestfailed" }), row => row.raw.documentWidth += 2, row => row.events.push({ type: "request", url: "https://example.invalid/" })]) {
    const invalid = structuredClone(sample);
    mutation(invalid);
    assert.throws(() => classify(invalid, true));
  }
  const changed = structuredClone(sample.geometry);
  changed.intrinsic[0].width = 1;
  assert.throws(() => protectedGeometry(sample.geometry, changed));
  assert.throws(() => six([sample, sample, sample, sample, sample, sample]));
  const invalid = structuredClone(sample.geometry);
  invalid.rect.height += 2;
  assert.throws(() => authored(sample.geometry, invalid, "exponentiation", "desktop"));
  console.log("8 negative controls passed: runtime, HTTP, request failure, viewport, external request, backing, duplicate samples, unexplained geometry.");
}
const output = process.argv.indexOf("--output");
if (output !== -1) {
  assert(process.argv[output + 1], "--output requires a new external baseline path");
  assert(process.argv[output + 1].startsWith("/tmp/opencode/"));
  fs.writeFileSync(process.argv[output + 1], bytes(successor), { flag: "wx" });
}
console.log(`Successor005: ${cells.filter(cell => cell.changes.length).length}/33 changed geometry cells; ${cells.flatMap(cell => cell.changes).length} exact paths; SHA256 ${review.successorSha256}; no release acceptance.`);
