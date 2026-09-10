import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";

export const geometryReview = JSON.parse(fs.readFileSync(new URL("./geometry-review.json", import.meta.url), "utf8"));
export const geometryRuntimeRequests = JSON.parse(fs.readFileSync(new URL("./geometry-runtime-requests.json", import.meta.url), "utf8"));
const verified = new WeakMap();
const hash = value => createHash("sha256").update(value).digest("hex");
const sortRows = rows => rows.sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0);

function atlasMetadata(pages) {
  return pages.map(({ slug, title, summary, intent, familyKey, topicTags, referenceUrl, addedDate, docsUrl, suggestedNextSlug }) => ({ slug, title, summary, intent, familyKey, topicTags, referenceUrl, addedDate, docsUrl, suggestedNextSlug }));
}

function routeMetadata(manifest, slug) {
  const route = manifest.find(entry => entry.slug === slug);
  assert(route, `Missing geometry route metadata: ${slug}`);
  const { networkPolicy, interactionProbe, ...experience } = route.experience;
  return {
    navigation: manifest.map(({ slug, title, suggestedNextSlug }) => ({ slug, title, suggestedNextSlug })),
    route: { slug: route.slug, learning: route.learning, experience },
  };
}

function localReferences(file, bytes) {
  if (bytes.includes(0)) return [];
  const source = bytes.toString("utf8");
  const references = [];
  const add = (kind, value) => references.push({ kind, value: value.trim() });
  if (/\.html?$/.test(file)) {
    for (const match of source.matchAll(/\bsrc\s*=\s*["']([^"']+)["']/gi)) add("html-src", match[1]);
    for (const tag of source.matchAll(/<link\b[^>]*>/gi)) {
      const match = tag[0].match(/\bhref\s*=\s*["']([^"']+)["']/i);
      if (match) add("html-link", match[1]);
    }
    for (const match of source.matchAll(/\bsrcset\s*=\s*["']([^"']+)["']/gi)) for (const candidate of match[1].split(",")) add("html-srcset", candidate.trim().split(/\s+/)[0]);
  }
  if (/\.(?:html?|css)$/.test(file)) {
    for (const match of source.matchAll(/@import\s+(?:url\(\s*)?["']?([^"'\s\)]+)["']?\s*\)?/gi)) add("css-import", match[1]);
    for (const match of source.matchAll(/url\(\s*["']?([^"'\)]+)["']?\s*\)/gi)) add("css-url", match[1]);
  }
  if (/\.(?:m?js)$/.test(file)) {
    for (const match of source.matchAll(/\b(?:import|export)\s+(?:[^"']*?\s+from\s+)?["']([^"']+)["']/g)) add("js-import", match[1]);
    for (const match of source.matchAll(/\bimport\s*\(\s*["']([^"']+)["']\s*\)/g)) add("js-dynamic-import", match[1]);
    for (const match of source.matchAll(/\bnew\s+(?:Shared)?Worker\s*\(\s*(?:new\s+URL\s*\(\s*)?["']([^"']+)["']/g)) add("js-worker", match[1]);
    for (const match of source.matchAll(/\bnew\s+URL\s*\(\s*["']([^"']+)["']\s*,\s*import\.meta\.url\s*\)/g)) add("js-url", match[1]);
  }
  return references;
}

function resolveLocalReference(file, reference) {
  const value = reference.value.split("#")[0].split("?")[0];
  if (!value || value.startsWith("#") || /^(?:data|blob|https?):/i.test(value) || value.startsWith("//")) return { ...reference, ignored: true };
  const decoded = decodeURIComponent(value.replaceAll("\\", "/"));
  let resolved = decoded.startsWith("/interactive-explanation/")
    ? decoded.slice("/interactive-explanation/".length)
    : decoded.startsWith("/") ? decoded.slice(1) : path.posix.normalize(path.posix.join(path.posix.dirname(file), decoded));
  assert(resolved && resolved !== ".." && !resolved.startsWith("../"), `Geometry dependency escapes repository: ${file} -> ${reference.value}`);
  if (decoded.endsWith("/") || resolved === ".") resolved = path.posix.join(resolved, "index.html");
  return { ...reference, path: resolved };
}

export function dependencyClosure(identity, seeds, runtimePaths = []) {
  const files = new Map(identity.files.map(([file, digest]) => [file.replaceAll("\\", "/"), digest]));
  const queue = [...new Set([...seeds, ...runtimePaths])].sort();
  const consumed = new Set();
  const ignored = [];
  while (queue.length) {
    const file = queue.shift();
    if (consumed.has(file)) continue;
    assert(files.has(file), `Missing geometry dependency: ${file}`);
    consumed.add(file);
    const bytes = identity.readFile(file);
    for (const reference of localReferences(file, bytes)) {
      const resolved = resolveLocalReference(file, reference);
      if (resolved.ignored) ignored.push({ file, kind: resolved.kind, value: resolved.value });
      else if (!consumed.has(resolved.path)) queue.push(resolved.path);
    }
    queue.sort();
  }
  for (const file of runtimePaths) assert(consumed.has(file), `Uncovered runtime geometry dependency: ${file}`);
  return { files: sortRows([...consumed].map(file => [file, files.get(file)])), ignored: ignored.sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right))) };
}

export function geometrySourceBinding(identity, pages, manifest, readFile = identity.readFile) {
  const files = identity.files.map(([file, digest]) => [file.replaceAll("\\", "/"), digest]);
  assert.equal(new Set(files.map(([file]) => file)).size, files.length, "Duplicate source file");
  assert.deepEqual(pages, manifest, "Geometry metadata copies differ");
  assert.equal(typeof readFile, "function", "Geometry dependency reader required");
  const source = { ...identity, readFile };
  const sources = {};
  const inventories = {};
  for (const slug of geometryReview.inventory.routes) {
    const route = files.filter(([file]) => file.startsWith(`${slug}/`));
    assert(route.length, `Empty geometry route dependency inventory: ${slug}`);
    const closure = dependencyClosure(source, [`${slug}/index.html`, "pages.json", "routes.manifest.json"], geometryRuntimeRequests.supplements[slug]);
    const dependencies = sortRows([...new Map([...route, ...closure.files]).entries()]);
    inventories[slug] = { files: dependencies.map(([file]) => file), ignored: closure.ignored };
    sources[slug] = hash(JSON.stringify([
      ...dependencies,
      ["routes.manifest.json#geometry", hash(JSON.stringify(routeMetadata(manifest, slug)))],
    ]));
  }
  const atlas = dependencyClosure(source, [...geometryReview.inventory.atlas, "pages.json", "routes.manifest.json"], geometryRuntimeRequests.supplements.atlas);
  inventories.atlas = { files: atlas.files.map(([file]) => file), ignored: atlas.ignored };
  sources.atlas = hash(JSON.stringify([
    ...atlas.files,
    ["pages.json#atlas-rendered", hash(JSON.stringify(atlasMetadata(pages)))],
  ]));
  return { head: identity.head, status: identity.status, sources, inventories };
}

export function functionSourceHashes(source, names) {
  const result = {};
  for (const name of names) {
    const start = source.indexOf(`function ${name}(`);
    assert(start >= 0, `Missing bound function: ${name}`);
    const brace = source.indexOf("{", start);
    let depth = 0;
    let quote = "";
    let escaped = false;
    let lineComment = false;
    let blockComment = false;
    for (let index = brace; index < source.length; index++) {
      const character = source[index];
      const next = source[index + 1];
      if (lineComment) {
        if (character === "\n") lineComment = false;
        continue;
      }
      if (blockComment) {
        if (character === "*" && next === "/") { blockComment = false; index++; }
        continue;
      }
      if (quote) {
        if (escaped) escaped = false;
        else if (character === "\\") escaped = true;
        else if (character === quote) quote = "";
        continue;
      }
      if (character === "/" && next === "/") { lineComment = true; index++; continue; }
      if (character === "/" && next === "*") { blockComment = true; index++; continue; }
      if (["\"", "'", "`"].includes(character)) { quote = character; continue; }
      if (character === "{") depth++;
      if (character === "}" && --depth === 0) {
        result[name] = hash(source.slice(start, index + 1));
        break;
      }
    }
    assert(result[name], `Unterminated bound function: ${name}`);
  }
  return result;
}

export function geometryFunctionHashes(source) {
  return functionSourceHashes(source, geometryReview.measurementFunctions.names);
}

export function dependencyFunctionHashes() {
  return Object.fromEntries([localReferences, resolveLocalReference, dependencyClosure, geometrySourceBinding, runtimeRequestsFromJournal, verifyRuntimeSourceContract, normalizedRuntimePaths, verifyCurrentRuntimeRequests, verifyRuntimeRequestCoverage].map(fn => [fn.name, hash(fn.toString())]));
}

export function runtimeRequestsFromJournal(source) {
  const paths = {};
  const schemes = {};
  for (const line of source.split("\n")) {
    if (!line.includes('"type":"sample"')) continue;
    const row = JSON.parse(line);
    if (!geometryReview.inventory.routes.includes(row.slug) && row.slug !== "atlas") continue;
    const requested = paths[row.slug] ??= new Set();
    const ignored = schemes[row.slug] ??= new Set();
    for (const event of row.events ?? []) {
      if (event.type !== "request") continue;
      if (event.url.startsWith("blob:")) { ignored.add("blob:"); continue; }
      const url = new URL(event.url);
      if (!url.pathname.startsWith("/interactive-explanation/")) continue;
      let file = decodeURIComponent(url.pathname.slice("/interactive-explanation/".length));
      if (!file || file.endsWith("/")) file += "index.html";
      requested.add(file);
    }
  }
  return {
    paths: Object.fromEntries(Object.entries(paths).sort().map(([slug, files]) => [slug, [...files].sort()])),
    ignoredSchemes: Object.fromEntries(Object.entries(schemes).filter(([, values]) => values.size).map(([slug, values]) => [slug, [...values].sort()])),
  };
}

export function verifyRuntimeSourceContract(root, identity, side, contract = geometryRuntimeRequests) {
  assert(["base", "head"].includes(side), `Unknown runtime source side: ${side}`);
  const identityFiles = new Map(identity.files);
  const tree = new Map(execFileSync("git", ["ls-tree", "-r", identity.head], { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }).trim().split("\n").map(row => {
    const [metadata, file] = row.split("\t");
    const [mode, type, blob] = metadata.split(" ");
    return [file, { mode, type, blob }];
  }));
  const expectedSurfaces = ["atlas", ...geometryReview.inventory.routes].sort();
  assert.deepEqual(Object.keys(contract.surfaces).sort(), expectedSurfaces, "Runtime request surfaces differ");
  for (const [slug, surface] of Object.entries(contract.surfaces)) {
    const expectedCells = Object.keys(geometryReview.cells).filter(cell => cell.startsWith(`${slug}/`)).sort();
    assert.deepEqual(surface.cells, expectedCells, `Runtime request cells differ: ${slug}`);
    assert.equal(surface.paths.length, surface.count, `Runtime path count differs: ${slug}`);
    assert.equal(hash(JSON.stringify(surface.paths)), surface.sha256, `Runtime path set differs: ${slug}`);
    assert.equal(new Set(surface.paths).size, surface.paths.length, `Duplicate runtime path: ${slug}`);
    for (const file of surface.paths) {
      assert(identityFiles.has(file), `Missing runtime source file: ${slug}/${file}`);
      const entry = tree.get(file);
      assert(entry, `Missing runtime Git blob: ${slug}/${file}`);
      assert.equal(entry.type, "blob", `Runtime source is not a blob: ${slug}/${file}`);
      assert.deepEqual({ mode: entry.mode, blob: entry.blob }, surface.sources[side][file], `Runtime source contract differs: ${side}/${slug}/${file}`);
    }
  }
  const paths = Object.fromEntries(Object.entries(contract.surfaces).map(([slug, surface]) => [slug, surface.paths]));
  assert.equal(hash(JSON.stringify(paths)), contract.inventorySha256, "Runtime request inventory differs");
  assert.equal(new Set(Object.values(paths).flat()).size, contract.uniqueLocalFiles, "Runtime local request count differs");
  return true;
}

export function normalizedRuntimePaths(events) {
  const paths = new Set();
  for (const event of events ?? []) {
    if (event.type !== "request" || event.url.startsWith("blob:")) continue;
    const url = new URL(event.url);
    if (!url.pathname.startsWith("/interactive-explanation/")) continue;
    let file = decodeURIComponent(url.pathname.slice("/interactive-explanation/".length));
    if (!file || file.endsWith("/")) file += "index.html";
    paths.add(file);
  }
  return [...paths].sort();
}

export function verifyCurrentRuntimeRequests(cell, events, inventories, contract = geometryRuntimeRequests) {
  const slug = cell.split("/")[0];
  const surface = contract.surfaces[slug];
  if (!surface) return true;
  assert(surface.cells.includes(cell), `Runtime request route/group mismatch: ${cell}`);
  const bound = new Set([...(inventories[slug]?.files ?? []), ...surface.paths]);
  for (const file of normalizedRuntimePaths(events)) assert(bound.has(file), `Unbound current runtime request: ${cell}/${file}`);
  return true;
}

export function verifyRuntimeRequestCoverage(paths, inventories, ignoredSchemes = {}, contract = geometryRuntimeRequests) {
  const surfaces = {};
  for (const [slug, requested] of Object.entries(paths)) {
    assert.equal(new Set(requested).size, requested.length, `Duplicate runtime request: ${slug}`);
    const covered = new Set(inventories[slug]?.files);
    assert(covered.size, `Missing runtime inventory: ${slug}`);
    for (const file of requested) assert(covered.has(file), `Uncovered runtime geometry dependency: ${slug}/${file}`);
    surfaces[slug] = { count: requested.length, sha256: hash(JSON.stringify(requested)) };
  }
  assert.deepEqual(surfaces, Object.fromEntries(Object.entries(contract.surfaces).map(([slug, surface]) => [slug, { count: surface.count, sha256: surface.sha256 }])), "Runtime geometry request sets differ");
  assert.deepEqual(ignoredSchemes, contract.ignoredSchemes, "Runtime ignored schemes differ");
  assert.equal(new Set(Object.values(paths).flat()).size, contract.uniqueLocalFiles, "Runtime local request count differs");
  assert.equal(hash(JSON.stringify(paths)), contract.inventorySha256, "Runtime request inventory differs");
  return true;
}

export function verifyGeometryReview(contract, identities, tools) {
  assert.deepEqual(contract, geometryReview, "Unknown geometry review contract");
  assert.equal(contract.version, 2);
  assert.equal(identities.base.head, contract.baseSha, "Geometry review base differs");
  assert.equal(tools.admittedHeadSha, contract.admittedHeadSha, "Geometry review admitted head differs");
  for (const side of ["base", "head"]) {
    assert.equal(identities[side].status, "", "Geometry review source must be clean");
    assert.deepEqual(identities[side].sources, contract.sources[side], `Geometry review sources differ: ${side}`);
  }
  assert.equal(tools.runtimeRequests, contract.inventory.runtimeRequestsSha256, "Geometry runtime request contract differs");
  assert.deepEqual(tools.capture, contract.captureTools, "Geometry capture tools differ");
  assert.deepEqual(tools.measurementFunctions, contract.measurementFunctions.hashes, "Geometry measurement functions differ");
  assert.deepEqual(tools.dependencyFunctions, contract.dependencyFunctions, "Geometry dependency functions differ");
  assert.deepEqual(tools.replay, contract.replayTools, "Geometry replay tools differ");
  assert.deepEqual(tools.replayFunctions, contract.replayFunctions.hashes, "Geometry replay functions differ");
  const token = {};
  verified.set(token, structuredClone(contract));
  return token;
}

export function admitGeometryReview(review, cell, before, after, changes) {
  assert(verified.has(review), "Unverified geometry review sources");
  const contract = verified.get(review);
  const expected = contract.cells[cell];
  assert(expected, `Unreviewed geometry cell: ${cell}`);
  const protectedFields = geometry => ({
    css: { transform: geometry.css.transform, touchAction: geometry.css.touchAction, pointerEvents: geometry.css.pointerEvents },
    intrinsic: geometry.intrinsic.map(({ rect, ...rest }) => rest),
  });
  assert.deepEqual(protectedFields(before), protectedFields(after), "Protected intrinsic geometry changed");
  const valueAt = (geometry, pointer) => pointer.slice(1).split("/").reduce((value, segment) => {
    const key = segment.replaceAll("~1", "/").replaceAll("~0", "~");
    assert(value !== null && typeof value === "object" && Object.hasOwn(value, key), `Missing geometry path: ${pointer}`);
    return value[key];
  }, geometry);
  assert.deepEqual(changes.map(({ path, before, after }) => [path, before, after]).sort(), [...expected].sort(), "Geometry review exact path/before/after mismatch");
  const reconstructed = structuredClone(before);
  for (const [pointer, left, right] of expected) {
    assert.deepEqual(valueAt(before, pointer), left, `Geometry review before differs: ${pointer}`);
    assert.deepEqual(valueAt(after, pointer), right, `Geometry review after differs: ${pointer}`);
    const split = pointer.lastIndexOf("/");
    const parent = split === 0 ? reconstructed : valueAt(reconstructed, pointer.slice(0, split));
    parent[pointer.slice(split + 1).replaceAll("~1", "/").replaceAll("~0", "~")] = right;
  }
  assert.deepEqual(after, reconstructed, "Unreviewed geometry structure changed");
  return { status: "passed-reviewed", changes, acceptedLeaves: expected.length, reviewSha256: contract.reviewSha256, reason: "Exact source-bound review only; no legacy baseline or performance approval" };
}
