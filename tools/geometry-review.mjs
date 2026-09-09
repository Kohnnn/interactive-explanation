import fs from "node:fs";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";

export const geometryReview = JSON.parse(fs.readFileSync(new URL("./geometry-review.json", import.meta.url), "utf8"));
const verified = new WeakMap();
const hash = value => createHash("sha256").update(value).digest("hex");

export function geometrySourceBinding(identity) {
  const files = identity.files.map(([file, digest]) => [file.replaceAll("\\", "/"), digest]);
  assert.equal(new Set(files.map(([file]) => file)).size, files.length, "Duplicate source file");
  const product = files.filter(([file]) => !/^(?:tools|docs|\.scratch|\.github)\//.test(file) && !/^[^/]+\.md$/.test(file) && file !== ".gitignore").sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0);
  return { head: identity.head, status: identity.status, product: hash(JSON.stringify(product)), dependencies: Object.fromEntries(files.filter(([file]) => Object.hasOwn(geometryReview.dependencies, file))) };
}

export function verifyGeometryReview(contract, identities) {
  assert.deepEqual(contract, geometryReview, "Unknown geometry review contract");
  assert.equal(contract.version, 1);
  assert.equal(identities.base.head, contract.baseSha, "Geometry review base differs");
  for (const side of ["base", "head"]) {
    assert.equal(identities[side].status, "", "Geometry review source must be clean");
    assert.equal(identities[side].product, contract.sources[side], `Geometry review source differs: ${side}`);
    if (side === "head") assert.deepEqual(identities[side].dependencies, contract.dependencies, "Geometry review dependencies differ");
  }
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
