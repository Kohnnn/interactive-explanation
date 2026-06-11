import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const here = path.dirname(fileURLToPath(import.meta.url));
const syncTool = path.resolve(here, "..", "sync-route-metadata.mjs");

function makeRootWithManifest(manifest) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "manifest-test-"));
  fs.writeFileSync(path.join(root, "routes.manifest.json"), JSON.stringify(manifest, null, 2));
  return root;
}

function runSync(root) {
  return spawnSync(process.execPath, [syncTool, root], { encoding: "utf8" });
}

const validRoute = {
  slug: "demo-route",
  title: "Demo Route",
  summary: "A valid demo route.",
  referenceUrl: "https://example.com/demo",
  docsUrl: "./docs/demo-route/",
};

test("valid manifest syncs and writes pages.json", () => {
  const root = makeRootWithManifest([validRoute]);
  const result = runSync(root);
  assert.equal(result.status, 0, result.stderr);
  const pages = JSON.parse(fs.readFileSync(path.join(root, "pages.json"), "utf8"));
  assert.equal(pages.length, 1);
  assert.equal(pages[0].slug, "demo-route");
});

test("neutral route without referenceUrl is valid", () => {
  const root = makeRootWithManifest([
    { slug: "local-x", title: "Local X", summary: "Curated.", referenceMode: "neutral", docsUrl: "./docs/local-x/" },
  ]);
  const result = runSync(root);
  assert.equal(result.status, 0, result.stderr);
});

test("duplicate slug fails validation", () => {
  const root = makeRootWithManifest([validRoute, validRoute]);
  const result = runSync(root);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /duplicate slug/i);
});

test("missing title fails validation", () => {
  const bad = { ...validRoute };
  delete bad.title;
  const root = makeRootWithManifest([bad]);
  const result = runSync(root);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /missing title/i);
});

test("wrong docsUrl shape fails validation", () => {
  const root = makeRootWithManifest([{ ...validRoute, docsUrl: "/docs/demo-route" }]);
  const result = runSync(root);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /docsUrl/i);
});

test("neutral route combined with referenceUrl fails validation", () => {
  const root = makeRootWithManifest([
    { slug: "x", title: "X", summary: "Bad.", referenceMode: "neutral", referenceUrl: "https://example.com/x", docsUrl: "./docs/x/" },
  ]);
  const result = runSync(root);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /neutral/i);
});

test("non-absolute referenceUrl fails validation", () => {
  const root = makeRootWithManifest([{ ...validRoute, referenceUrl: "example.com/demo" }]);
  const result = runSync(root);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /referenceUrl/i);
});
