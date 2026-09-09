import assert from "node:assert/strict";
import fs from "node:fs";
import readline from "node:readline";
import { createHash } from "node:crypto";
import { geometryChanges as rawGeometryChanges } from "../../../interactive-explanation/tools/diagnose-baseline.mjs";
import { validateExperienceBaseline } from "../../../interactive-explanation/tools/experience-baseline.mjs";
import "./01-w0-geometry-verify-003.mjs";

const geometryChanges = (...args) => rawGeometryChanges(...args).map(change => ({ ...change, review: "agent-reviewed exact geometry only; not route acceptance" }));
const read = name => JSON.parse(fs.readFileSync(new URL(name, import.meta.url)));
const hash = bytes => createHash("sha256").update(bytes).digest("hex");
const evidence = read("./37-prerequisite-evidence.json");
const fullInventory = read("./01-w0-raw-artifacts-09505db.json");
const historicalInventory = read("./01-w0-geometry-artifacts-002.json");
const artifacts = [
  ...fullInventory.inventory.filter(item => item.name === "full-001.jsonl").map(item => ({ ...item, path: `${fullInventory.root}/${item.name}` })),
  ...historicalInventory.artifacts.filter(item => ["historical-all-001.jsonl", "historical-mlu-001.jsonl"].includes(item.name)).map(item => ({ ...item, path: `${historicalInventory.root}/${item.name}` })),
  ...evidence.artifacts,
];
async function load(artifact) {
  const bytes = fs.readFileSync(artifact.path);
  assert.equal(bytes.length, artifact.bytes);
  assert.equal(hash(bytes), artifact.sha256);
  const rows = [];
  for await (const line of readline.createInterface({ input: fs.createReadStream(artifact.path), crlfDelay: Infinity })) rows.push(JSON.parse(line));
  return rows;
}
const captures = [];
for (const artifact of artifacts) captures.push(await load(artifact));
const before = read("./01-w0-geometry-successor-003.json");
const targets = [...read("./01-w0-geometry-review-003.json").deferred, ...["desktop", "mobile", "narrow"].map(viewport => ({ slug: "markov-chains", viewport }))];
const after = structuredClone(before);
const approved = [];
const unchanged = [];
const identities = captures.slice(0, 5).map((rows, index) => {
  const identity = rows.find(row => row.type === "identity");
  const end = rows.find(row => row.type === "source-end");
  assert.equal(end.unchanged, true);
  assert.deepEqual(identity.source, end.source);
  assert.equal(rows.filter(row => row.type === "sample").length, identity.cells * 3);
  assert.equal(rows.find(row => row.type === "browser").version, "148.0.7778.96");
  return { artifact: artifacts[index].path, ...identity, source: { ...identity.source, fileCount: identity.source.files.length, files: undefined }, completion: rows.find(row => row.type === "complete") };
});
assert.equal(identities[0].source.head, "09505db333598ac50553973b638872f039c4e7d4");
assert.equal(identities[1].source.head, "7c71c992be944895438ec2467d20f18a7ccd4a63");
assert.equal(identities[2].source.head, "34c9883349913aaa604a52c506a7192bdd54799e");
assert.equal(identities[0].source.digest, identities[3].source.digest);
const sourceBefore = captures[3].find(row => row.type === "identity").source.files;
const sourceAfter = captures[4].find(row => row.type === "identity").source.files;
assert.deepEqual(sourceBefore.map(([name]) => name), sourceAfter.map(([name]) => name));
const sourceChanges = sourceAfter.filter(([name, digest], index) => digest !== sourceBefore[index][1]);
assert.deepEqual(sourceChanges.map(([name]) => name), ["decision-tree/index.html", "shared/prototype-visual.css"]);
for (const [name, digest] of sourceChanges) assert.equal(hash(fs.readFileSync(new URL(`../../../interactive-explanation/${name}`, import.meta.url))), digest);
function protectedGeometry(a, b) {
  assert.equal(a.intrinsic.length, b.intrinsic.length);
  const protectedFields = surface => Object.fromEntries(Object.entries(surface).filter(([field]) => !["rect", "css", "aspectRatio"].includes(field)));
  assert.deepEqual(a.intrinsic.map(protectedFields), b.intrinsic.map(protectedFields));
  for (const change of geometryChanges(a, b)) assert(/^\/(rect\/(top|bottom|left|right|width|height)|css\/(width|height)|aspectRatio|intrinsic\/\d+\/rect\/(top|bottom|left|right|width|height))$/.test(change.path), change.path);
}
function network(sample, identity, markov) {
  const failures = sample.events.filter(event => event.type === "requestfailed");
  assert(sample.events.filter(event => event.type === "response").every(event => event.status < 400));
  for (const event of sample.events.filter(event => event.type === "request")) assert.equal(new URL(event.url).origin, new URL(identity.baseUrl).origin);
  if (markov) {
    assert.equal(sample.status, "failed");
    assert.deepEqual(sample.errors, [{ phase: "network", message: "Failed requests require classification; cancellation evidence retained" }]);
    assert.equal(failures.length, 1);
    assert.equal(failures[0].url, `${identity.baseUrl}markov-chains/playground/`);
    assert.equal(failures[0].error, "net::ERR_ABORTED");
    assert(sample.events.some(event => event.type === "response" && event.status === 200 && new URL(event.url).pathname === "/interactive-explanation/markov-chains/playground/playground.html"));
  } else {
    assert.equal(sample.status, "measured");
    assert.deepEqual(sample.errors, []);
    assert.deepEqual(failures, []);
  }
}
if (process.argv.includes("--negative-check")) {
  const sample = captures[4].find(row => row.type === "sample" && row.slug === "markov-chains");
  for (const mutation of [
    value => value.events.find(event => event.type === "requestfailed").url += "other",
    value => value.events.find(event => event.type === "requestfailed").error = "net::ERR_FAILED",
    value => value.events.push({ type: "response", status: 404 }),
    value => value.errors.push({ phase: "console", message: "unexpected" }),
  ]) {
    const invalid = structuredClone(sample);
    mutation(invalid);
    assert.throws(() => network(invalid, identities[4], true), assert.AssertionError);
  }
  const geometry = sample.geometry;
  const invalid = structuredClone(geometry);
  invalid.intrinsic[0].width = 1;
  assert.throws(() => protectedGeometry(geometry, invalid), assert.AssertionError);
  console.log("5 successor negative checks passed: wrong cancellation URL/error, HTTP failure, console error and backing dimension rejected.");
}
for (const target of targets) {
  const { slug, viewport } = target;
  const markov = slug === "markov-chains";
  const stages = [0, 1, 3, 4].map(index => {
    const samples = captures[index].filter(row => row.type === "sample" && row.slug === slug && row.viewport.name === viewport);
    assert.equal(samples.length, 6);
    for (const theme of ["light", "dark"]) assert.equal(samples.filter(row => row.theme === theme).length, 3);
    for (const sample of samples) {
      assert.deepEqual(sample.geometry, samples[0].geometry);
      network(sample, identities[index], markov);
    }
    return samples;
  });
  const reconstructed = stages[0][0].geometry;
  assert.deepEqual(reconstructed, stages[1][0].geometry);
  assert.deepEqual(reconstructed, stages[2][0].geometry);
  const authored = stages[3][0].geometry;
  for (const theme of ["light", "dark"]) {
    const cell = evidence.cells.find(cell => cell.slug === slug && cell.viewport.name === viewport && cell.theme === theme);
    for (const side of ["Before", "After"]) assert.deepEqual(cell[`geometry${side}`], stages[side === "Before" ? 2 : 3].filter(row => row.theme === theme).map(row => row.geometry));
  }
  const inherited = before.routes[slug].geometry[viewport];
  protectedGeometry(inherited, reconstructed);
  protectedGeometry(reconstructed, authored);
  const pointer = `/routes/${slug}/geometry/${viewport}`;
  const reconstruction = geometryChanges(inherited, reconstructed, pointer);
  const authoredDelta = geometryChanges(reconstructed, authored, pointer);
  if (markov) assert.deepEqual(authoredDelta, []);
  else if (slug.startsWith("ableton-")) {
    assert.deepEqual(reconstructed.intrinsic, authored.intrinsic);
    assert.deepEqual(authoredDelta.map(change => change.path.slice(pointer.length)).sort(), ["/aspectRatio", "/css/height", "/rect/bottom", "/rect/height"]);
    assert.equal(authored.rect.height - reconstructed.rect.height, -22.09375);
    assert(stages[2].every(sample => sample.raw.documentWidth - sample.raw.viewportWidth === 64));
  } else {
    assert(authoredDelta.every(change => /^\/(rect\/(bottom|height)|css\/height|aspectRatio|intrinsic\/0\/rect\/(top|bottom|left|right)|intrinsic\/\d+\/rect\/(top|bottom))$/.test(change.path.slice(pointer.length))), JSON.stringify(authoredDelta));
    const flowDelta = authored.rect.height - reconstructed.rect.height;
    assert.equal(authored.rect.bottom - reconstructed.rect.bottom, flowDelta);
    for (let index = 1; index < authored.intrinsic.length; index++) {
      for (const field of ["width", "height", "left", "right"]) assert.equal(authored.intrinsic[index].rect[field], reconstructed.intrinsic[index].rect[field]);
      for (const field of ["top", "bottom"]) assert.equal(authored.intrinsic[index].rect[field] - reconstructed.intrinsic[index].rect[field], flowDelta);
    }
    const image = authored.intrinsic[0];
    assert.equal(image.rect.width, 50);
    assert.equal(image.rect.height, 46);
    assert(image.rect.left >= 0 && image.rect.right <= stages[3][0].viewport.width);
    assert(stages[2].every(sample => sample.geometry.intrinsic[0].rect.right < 0));
  }
  assert(stages[3].every(sample => sample.raw.documentWidth === sample.raw.viewportWidth));
  const interactions = captures[6].filter(row => row.slug === slug && row.viewport.width === stages[3][0].viewport.width);
  assert.equal(interactions.length, 6);
  for (const sample of interactions) {
    assert.equal(sample.status, "passed");
    assert(evidence.interactionAfter.some(value => JSON.stringify(value) === JSON.stringify(sample)));
    if (markov) assert.equal(sample.child.nodes, 2);
  }
  const changes = geometryChanges(inherited, authored, pointer);
  const record = { slug, viewport, samplesPerStage: 6, classification: markov ? "Exact initial child-document cancellation classified; historical/full/paired geometry equal; 18 successful child tasks across three viewports; no network policy change" : "Two-stage original reference reconstruction then independently reviewed authored access fix", reconstruction, authoredDelta, changes };
  if (changes.length) {
    after.routes[slug].geometry[viewport] = authored;
    approved.push(record);
  } else unchanged.push(record);
}
assert.equal(approved.length, 6);
assert.equal(unchanged.length, 1);
validateExperienceBaseline(after, Object.keys(before.routes));
for (const slug of Object.keys(before.routes)) for (const theme of ["light", "dark"]) assert.deepEqual(before.routes[slug][theme], after.routes[slug][theme]);
const ordered = changes => changes.toSorted((a, b) => a.path.localeCompare(b.path));
assert.deepEqual(ordered(geometryChanges(before, after)), ordered(approved.flatMap(cell => cell.changes)));
const deferred = read("./01-w0-geometry-review-002.json").deferred.filter(cell => !approved.some(value => value.slug === cell.slug && value.viewport === cell.viewport)).map(cell => ({ ...cell, reason: cell.slug === "rigid-body-collisions" ? "Retained Page not found/hydration initialization errors; no successful source rebuild" : [cell.overflow > 1 ? `${cell.overflow}px captured overflow without paired fix` : null, !cell.stable ? "Capture not qualified stable" : null, !cell.historicalEqual ? "Historical/current equality not established" : null, cell.protectedChanges ? "Protected geometry changes" : null].filter(Boolean).join("; ") }));
for (const cell of deferred) assert.deepEqual(before.routes[cell.slug].geometry[cell.viewport], after.routes[cell.slug].geometry[cell.viewport]);
const successorBytes = JSON.stringify(after, null, 2) + "\n";
const review = {
  source: "a5aa4a9fb13fd2bc2f6fbde6e766ab2384f77af6",
  sourceFix: "83ae687",
  scope: "Evidence-only agent-authorized geometry review, not route or release acceptance; no browser run; inherited performance unchanged",
  predecessorSha256: hash(fs.readFileSync(new URL("./01-w0-geometry-successor-003.json", import.meta.url))),
  successorSha256: hash(successorBytes),
  pairedEvidenceSha256: hash(fs.readFileSync(new URL("./37-prerequisite-evidence.json", import.meta.url))),
  artifacts, identities, sourceChanges, approved, unchanged, deferred,
  limitations: "Raw failed/inconclusive statuses and failed interaction run002 retained, not pooled into success. Historical timing unqualified; no performance updates. 34c9883 MLU capture retained and hashed, not evidence for these seven cells. External raw paths required to rerun; no wildcard cancellation allowance. Existing gate reports remain historical failures; fresh smoke deferred under exclusive browser restriction.",
};
const reviewName = "./40-reviewed-cells-review-004.json";
if (process.argv.includes("--write-review")) fs.writeFileSync(new URL(reviewName, import.meta.url), JSON.stringify(review, null, 2) + "\n", { flag: "wx" });
else assert.deepEqual(read(reviewName), JSON.parse(JSON.stringify(review)));
const outputIndex = process.argv.indexOf("--output");
if (outputIndex !== -1) {
  assert(process.argv[outputIndex + 1], "--output requires a new full baseline path");
  fs.writeFileSync(process.argv[outputIndex + 1], successorBytes, { flag: "wx" });
}
console.log(`Successor004: ${approved.length} new reviewed cells, ${geometryChanges(before, after).length} exact paths; Markov desktop unchanged; ${deferred.length} inherited deferred cells retained. Full baseline generated only with --output.`);
