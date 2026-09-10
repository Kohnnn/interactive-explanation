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

function validateImplications(value, label) {
  assert.deepEqual(Object.keys(value || {}).sort(), ["childRuntime", "requestCount", "sameOriginTransferBytes", "scope"], `${label} requires complete implications`);
  assert.equal(typeof value.scope, "string");
  assert(value.scope.length > 0, `${label} scope required`);
  assert.equal(typeof value.childRuntime, "string");
  assert(value.childRuntime.length > 0, `${label} child/runtime assessment required`);
  for (const metric of ["requestCount", "sameOriginTransferBytes"]) {
    assert.deepEqual(Object.keys(value[metric] || {}).sort(), ["base", "delta", "head"], `${label}.${metric} requires base/head/delta`);
    for (const field of ["base", "head", "delta"]) assert(Number.isInteger(value[metric][field]), `${label}.${metric}.${field} must be an integer`);
    assert.equal(value[metric].head - value[metric].base, value[metric].delta, `${label}.${metric} delta differs`);
  }
}

function verifyImplications(implications, samples, cell) {
  assert.deepEqual(Object.keys(samples || {}).sort(), ["base", "head"], `Missing resource implication samples: ${cell}`);
  for (const [side, rows] of Object.entries(samples)) {
    assert.equal(rows.length, 3, `Resource implications require three ${side} samples: ${cell}`);
    const counts = rows.map(row => row.performance?.resourceCount);
    const transfers = rows.map(row => row.performance?.sameOriginTransfer?.status === "supported" ? row.performance.sameOriginTransfer.bytes : null);
    assert(counts.every(value => Number.isInteger(value) && value === counts[0]), `Unstable resource count implications: ${cell}/${side}`);
    assert(transfers.every(value => Number.isInteger(value) && value === transfers[0]), `Unstable transfer implications: ${cell}/${side}`);
    assert.equal(counts[0], implications.requestCount[side], `Resource count implication differs: ${cell}/${side}`);
    assert.equal(transfers[0], implications.sameOriginTransferBytes[side], `Transfer implication differs: ${cell}/${side}`);
  }
}

export function verifyResourceReview(contract, identities, manifest, isAncestor) {
  assert.equal(typeof isAncestor, "function", "Resource review ancestry verifier required");
  assert.equal(contract.version, 2, "Unknown resource review version");
  assert.deepEqual(Object.keys(contract).sort(), ["reviews", "version"], "Unknown resource review registry fields");
  assert(Array.isArray(contract.reviews), "Resource reviews must be an array");
  const routes = new Set(["atlas", ...manifest.map(route => route.slug)]);
  const seen = new Set();
  for (const entry of contract.reviews) {
    assert.deepEqual(Object.keys(entry).sort(), ["additions", "baseSha", "cells", "dependencies", "headSha", "implications", "purpose", "removals", "sources"], "Unknown resource review fields");
    assert(Array.isArray(entry.cells) && entry.cells.length > 0, "Resource review cells must be a nonempty array");
    const entryRoutes = new Set();
    for (const cell of entry.cells) {
      assert(cellPattern.test(cell), `Invalid resource review cell: ${cell}`);
      const route = cell.split("/")[0];
      assert(routes.has(route), `Unknown resource review route: ${cell}`);
      entryRoutes.add(route);
      assert(!seen.has(cell), `Duplicate resource review cell: ${cell}`);
      seen.add(cell);
    }
    assert.equal(entryRoutes.size, 1, "Grouped resource review cells must belong to one route");
    const [route] = entryRoutes;
    const label = entry.cells.join(", ");
    assert.equal(typeof entry.purpose, "string");
    assert(entry.purpose.length > 0, `Resource review purpose required: ${label}`);
    assert(shaPattern.test(entry.baseSha) && shaPattern.test(entry.headSha), `Invalid resource review SHA: ${label}`);
    assert.equal(entry.baseSha, identities.base.head, `Resource review base differs: ${label}`);
    assert.equal(isAncestor(entry.headSha, identities.head.head), true, `Resource review head is not an ancestor: ${label}`);
    validateCounts(entry.additions, `${label} additions`);
    validateCounts(entry.removals, `${label} removals`);
    assert(Object.keys(entry.additions).length + Object.keys(entry.removals).length > 0, `Empty resource review: ${label}`);
    validateImplications(entry.implications, `${label} implications`);
    validateBindings(entry.sources, identities, `${label} sources`);
    validateBindings(entry.dependencies, identities, `${label} dependencies`);
    const bound = [...Object.keys(entry.sources.base), ...Object.keys(entry.dependencies.base)];
    assert(bound.every(file => file === route || file.startsWith(`${route}/`)), `Resource review bindings cross route boundary: ${label}`);
  }
  const token = {};
  verified.set(token, structuredClone(contract));
  return token;
}

export function admitResourceReview(review, cell, urls, samples) {
  assert(verified.has(review), "Unverified resource review sources");
  assert.equal(Object.keys(urls.unstable).length, 0, "Unstable resource URL group");
  assert.equal(urls.exactBase, true, "Base-control/base resource URLs differ");
  const entry = verified.get(review).reviews.find(value => value.cells.includes(cell));
  assert(entry, `Unreviewed resource cell: ${cell}`);
  assert.deepEqual(urls.additions, entry.additions, "Resource review additions mismatch");
  assert.deepEqual(urls.removals, entry.removals, "Resource review removals mismatch");
  verifyImplications(entry.implications, samples, cell);
  return { ...urls, status: "passed-reviewed-resource", review: entry };
}
