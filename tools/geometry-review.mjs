import fs from "node:fs";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";

export const geometryReview = JSON.parse(fs.readFileSync(new URL("./geometry-review.json", import.meta.url), "utf8"));
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

export function geometrySourceBinding(identity, pages, manifest) {
  const files = identity.files.map(([file, digest]) => [file.replaceAll("\\", "/"), digest]);
  assert.equal(new Set(files.map(([file]) => file)).size, files.length, "Duplicate source file");
  assert.deepEqual(pages, manifest, "Geometry metadata copies differ");
  const byPath = new Map(files);
  const required = file => {
    assert(byPath.has(file), `Missing geometry dependency: ${file}`);
    return [file, byPath.get(file)];
  };
  const shared = geometryReview.inventory.shared.map(required);
  const sources = {};
  for (const slug of geometryReview.inventory.routes) {
    const route = files.filter(([file]) => file.startsWith(`${slug}/`));
    assert(route.length, `Empty geometry route dependency inventory: ${slug}`);
    sources[slug] = hash(JSON.stringify(sortRows([
      ...route,
      ...shared,
      ["routes.manifest.json#geometry", hash(JSON.stringify(routeMetadata(manifest, slug)))],
    ])));
  }
  sources.atlas = hash(JSON.stringify(sortRows([
    ...geometryReview.inventory.atlas.map(required),
    ...shared,
    ["pages.json#atlas-rendered", hash(JSON.stringify(atlasMetadata(pages)))],
  ])));
  return { head: identity.head, status: identity.status, sources };
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

export function verifyGeometryReview(contract, identities, tools) {
  assert.deepEqual(contract, geometryReview, "Unknown geometry review contract");
  assert.equal(contract.version, 2);
  assert.equal(identities.base.head, contract.baseSha, "Geometry review base differs");
  assert.equal(tools.admittedHeadSha, contract.admittedHeadSha, "Geometry review admitted head differs");
  for (const side of ["base", "head"]) {
    assert.equal(identities[side].status, "", "Geometry review source must be clean");
    assert.deepEqual(identities[side].sources, contract.sources[side], `Geometry review sources differ: ${side}`);
  }
  assert.deepEqual(tools.capture, contract.captureTools, "Geometry capture tools differ");
  assert.deepEqual(tools.measurementFunctions, contract.measurementFunctions.hashes, "Geometry measurement functions differ");
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
