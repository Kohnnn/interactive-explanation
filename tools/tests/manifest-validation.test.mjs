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

function runSync(root, ...args) {
  return spawnSync(process.execPath, [syncTool, root, ...args], { encoding: "utf8" });
}

const validRoute = {
  slug: "demo-route",
  title: "Demo Route",
  summary: "A valid demo route.",
  referenceUrl: "https://example.com/demo",
  intent: "explainer",
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

test("docs scaffolding emits the release metadata and theme contract", () => {
  const root = makeRootWithManifest([validRoute]);
  const result = runSync(root, "--scaffold", validRoute.slug);
  assert.equal(result.status, 0, result.stderr);
  const source = fs.readFileSync(path.join(root, "docs", validRoute.slug, "index.html"), "utf8");
  const docsUrl = `https://kohnnn.github.io/interactive-explanation/docs/${validRoute.slug}/`;
  assert.match(source, /<meta name="robots" content="noindex,follow">/);
  assert.match(source, /<meta property="og:title" content="Demo Route Replica Docs">/);
  assert.match(source, /<meta property="og:description" content="Provenance, parity notes, and implementation references for the local demo-route route\.">/);
  assert.match(source, /<meta property="og:type" content="website">/);
  assert.match(source, new RegExp(`<meta property="og:url" content="${docsUrl}">`));
  assert.match(source, new RegExp(`<link rel="canonical" href="${docsUrl}">`));
  assert.ok(source.indexOf("../../shared/theme-init.js") < source.indexOf("../../shared/site.css"));
  assert.match(source, />Back to Atlas<\/a>/);
});

test("neutral route without referenceUrl is valid", () => {
  const root = makeRootWithManifest([
    { slug: "local-x", title: "Local X", summary: "Curated.", intent: "guided-path", referenceMode: "neutral", docsUrl: "./docs/local-x/" },
  ]);
  const result = runSync(root);
  assert.equal(result.status, 0, result.stderr);
});

test("intent is preserved in pages.json", () => {
  const root = makeRootWithManifest([{ ...validRoute, intent: "create" }]);
  const result = runSync(root);
  assert.equal(result.status, 0, result.stderr);
  const pages = JSON.parse(fs.readFileSync(path.join(root, "pages.json"), "utf8"));
  assert.equal(pages[0].intent, "create");
});

test("learning metadata is optional and preserved in pages.json", () => {
  const learning = {
    difficulty: "beginner",
    durationMinutes: 12,
    order: 2,
    prerequisites: ["intro-route"],
  };
  const root = makeRootWithManifest([
    {
      ...validRoute,
      slug: "intro-route",
      referenceUrl: "https://example.com/intro",
      docsUrl: "./docs/intro-route/",
    },
    { ...validRoute, learning },
  ]);
  const result = runSync(root);
  assert.equal(result.status, 0, result.stderr);
  const pages = JSON.parse(fs.readFileSync(path.join(root, "pages.json"), "utf8"));
  assert.deepEqual(pages[1].learning, learning);
});

test("invalid learning object fails validation", () => {
  const result = runSync(makeRootWithManifest([{ ...validRoute, learning: [] }]));
  assert.equal(result.status, 1);
  assert.match(result.stderr, /learning metadata must be an object/i);
});

test("invalid learning difficulty fails validation", () => {
  const result = runSync(makeRootWithManifest([{ ...validRoute, learning: { difficulty: "expert" } }]));
  assert.equal(result.status, 1);
  assert.match(result.stderr, /invalid learning difficulty/i);
});

test("invalid learning duration fails validation", () => {
  const result = runSync(makeRootWithManifest([{ ...validRoute, learning: { durationMinutes: 1.5 } }]));
  assert.equal(result.status, 1);
  assert.match(result.stderr, /durationMinutes must be a positive integer/i);
});

test("invalid learning order fails validation", () => {
  const result = runSync(makeRootWithManifest([{ ...validRoute, learning: { order: 0 } }]));
  assert.equal(result.status, 1);
  assert.match(result.stderr, /order must be a positive integer/i);
});

test("invalid learning prerequisites fail validation", () => {
  const result = runSync(makeRootWithManifest([{ ...validRoute, learning: { prerequisites: "intro-route" } }]));
  assert.equal(result.status, 1);
  assert.match(result.stderr, /prerequisites must be an array/i);
});

test("unknown learning prerequisite fails validation", () => {
  const result = runSync(makeRootWithManifest([{ ...validRoute, learning: { prerequisites: ["missing-route"] } }]));
  assert.equal(result.status, 1);
  assert.match(result.stderr, /unknown prerequisite/i);
});

test("self learning prerequisite fails validation", () => {
  const result = runSync(makeRootWithManifest([{ ...validRoute, learning: { prerequisites: [validRoute.slug] } }]));
  assert.equal(result.status, 1);
  assert.match(result.stderr, /cannot require itself/i);
});

test("duplicate learning prerequisite fails validation", () => {
  const prerequisite = {
    ...validRoute,
    slug: "intro-route",
    referenceUrl: "https://example.com/intro",
    docsUrl: "./docs/intro-route/",
  };
  const result = runSync(makeRootWithManifest([
    prerequisite,
    { ...validRoute, learning: { prerequisites: [prerequisite.slug, prerequisite.slug] } },
  ]));
  assert.equal(result.status, 1);
  assert.match(result.stderr, /duplicate prerequisite/i);
});

test("missing intent fails validation", () => {
  const route = { ...validRoute };
  delete route.intent;
  const result = runSync(makeRootWithManifest([route]));
  assert.equal(result.status, 1);
  assert.match(result.stderr, /missing intent/i);
});

test("invalid intent fails validation", () => {
  const result = runSync(makeRootWithManifest([{ ...validRoute, intent: "unknown" }]));
  assert.equal(result.status, 1);
  assert.match(result.stderr, /invalid intent/i);
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
    { slug: "x", title: "X", summary: "Bad.", intent: "guided-path", referenceMode: "neutral", referenceUrl: "https://example.com/x", docsUrl: "./docs/x/" },
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
