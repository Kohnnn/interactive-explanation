import fs from "node:fs";
import assert from "node:assert/strict";
import { resourceUrl } from "./network-handoff.mjs";

export const resourceReview = JSON.parse(fs.readFileSync(new URL("./resource-review.json", import.meta.url), "utf8"));
const verified = new WeakMap();
const shaPattern = /^[a-f0-9]{40}$/;
const digestPattern = /^[a-f0-9]{64}$/;
const cellPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*\/(?:desktop|mobile|narrow)\/(?:light|dark)$/;

function validateCounts(value, label) {
  assert(value && typeof value === "object" && !Array.isArray(value), `${label} must be an object`);
  for (const [url, count] of Object.entries(value)) {
    assert(!/[?*{}[\]]/.test(new URL(url).pathname), `${label} contains a glob`);
    assert.equal(resourceUrl(url), url, `${label} URL must be normalized`);
    assert(Number.isInteger(count) && count > 0, `${label} count must be a positive integer`);
  }
}

function validateBindings(value, identities, label) {
  assert.deepEqual(Object.keys(value || {}).sort(), ["base", "head"], `${label} requires exact base/head bindings`);
  let count = 0;
  for (const side of ["base", "head"]) {
    assert(value[side] && typeof value[side] === "object" && !Array.isArray(value[side]) && Object.keys(value[side]).length > 0, `${label}.${side} must be a nonempty object`);
    const actual = Object.fromEntries(identities[side].files.map(([file, digest]) => [file.replaceAll("\\", "/"), digest]));
    for (const [file, digest] of Object.entries(value[side])) {
      count++;
      assert(!/[*?{}[\]]/.test(file), `${label} contains a glob`);
      assert(digestPattern.test(digest), `${label} has an invalid digest: ${file}`);
      assert.equal(actual[file], digest, `${label} differs: ${side}/${file}`);
    }
  }
  assert(count > 0, `Missing ${label}`);
  assert.deepEqual(Object.keys(value.base).sort(), Object.keys(value.head).sort(), `${label} base/head file sets differ`);
}

export function verifyResourceReview(contract, identities, manifest) {
  assert.equal(contract.version, 1, "Unknown resource review version");
  assert.deepEqual(Object.keys(contract).sort(), ["reviews", "version"], "Unknown resource review registry fields");
  assert(Array.isArray(contract.reviews), "Resource reviews must be an array");
  const routes = new Set(["atlas", ...manifest.map(route => route.slug)]);
  const seen = new Set();
  for (const entry of contract.reviews) {
    assert.deepEqual(Object.keys(entry).sort(), ["additions", "baseSha", "cell", "dependencies", "headSha", "removals", "sources"], `Unknown resource review fields: ${entry.cell}`);
    assert(cellPattern.test(entry.cell), `Invalid resource review cell: ${entry.cell}`);
    assert(routes.has(entry.cell.split("/")[0]), `Unknown resource review route: ${entry.cell}`);
    assert(!seen.has(entry.cell), `Duplicate resource review cell: ${entry.cell}`);
    seen.add(entry.cell);
    assert(shaPattern.test(entry.baseSha) && shaPattern.test(entry.headSha), `Invalid resource review SHA: ${entry.cell}`);
    assert.equal(entry.baseSha, identities.base.head, `Resource review base differs: ${entry.cell}`);
    validateCounts(entry.additions, `${entry.cell} additions`);
    validateCounts(entry.removals, `${entry.cell} removals`);
    assert(Object.keys(entry.additions).length + Object.keys(entry.removals).length > 0, `Empty resource review: ${entry.cell}`);
    validateBindings(entry.sources, identities, `${entry.cell} sources`);
    validateBindings(entry.dependencies, identities, `${entry.cell} dependencies`);
  }
  const token = {};
  verified.set(token, structuredClone(contract));
  return token;
}

export function admitResourceReview(review, cell, urls) {
  assert(verified.has(review), "Unverified resource review sources");
  assert.equal(Object.keys(urls.unstable).length, 0, "Unstable resource URL group");
  assert.equal(urls.exactBase, true, "Base-control/base resource URLs differ");
  const entry = verified.get(review).reviews.find(value => value.cell === cell);
  assert(entry, `Unreviewed resource cell: ${cell}`);
  assert.deepEqual(urls.additions, entry.additions, "Resource review additions mismatch");
  assert.deepEqual(urls.removals, entry.removals, "Resource review removals mismatch");
  return { ...urls, status: "passed-reviewed-resource", review: entry };
}
