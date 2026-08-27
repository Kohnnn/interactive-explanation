import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const here = path.dirname(fileURLToPath(import.meta.url));
const syncTool = path.resolve(here, "..", "sync-route-metadata.mjs");

const route = {
  slug: "demo-route",
  title: "Demo route",
  summary: "Demo route fixture.",
  referenceUrl: "https://example.com/demo-route",
  intent: "explainer",
  docsUrl: "./docs/demo-route/",
  shell: {
    family: "demo-family",
    variant: "essay",
    navigation: "generated",
  },
  suggestedNextSlug: "next-route",
  experience: {
    themeOwnership: "shell-only",
    primarySurface: "main",
    runtimeSurface: "main",
    interactionProbe: "read-only",
    networkPolicy: { mode: "local-only" },
  },
};

const nextRoute = {
  ...route,
  slug: "next-route",
  title: "Next route",
  referenceUrl: "https://example.com/next-route",
  docsUrl: "./docs/next-route/",
  suggestedNextSlug: "demo-route",
};

function makeRoot(htmlBySlug, parityBySlug = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "route-html-sync-test-"));
  fs.writeFileSync(path.join(root, "routes.manifest.json"), JSON.stringify([route, nextRoute], null, 2));
  for (const [slug, html] of Object.entries(htmlBySlug)) {
    const routeDir = path.join(root, slug);
    fs.mkdirSync(routeDir, { recursive: true });
    fs.writeFileSync(path.join(routeDir, "index.html"), html);
  }
  for (const [slug, parity] of Object.entries(parityBySlug)) {
    const docsDir = path.join(root, "docs", slug);
    fs.mkdirSync(docsDir, { recursive: true });
    fs.writeFileSync(
      path.join(docsDir, "parity.json"),
      typeof parity === "string" ? parity : JSON.stringify(parity, null, 2),
    );
  }
  return root;
}

function runSync(root) {
  return spawnSync(process.execPath, [syncTool, root], { encoding: "utf8" });
}

function normalDocument(head, body = "<main>Fixture</main>") {
  return `<!doctype html><html><head>${head}</head><body>${body}</body></html>`;
}

test("synchronizer canonicalizes one-line routes with base-aware shared seams", () => {
  const root = makeRoot({
    "demo-route": normalDocument('<base href="./client/"><link rel="stylesheet" href="route.css"><style>.route { color: red; }</style><script src="runtime.js"></script>'),
    "next-route": normalDocument("<style>.next { color: blue; }</style>"),
  });
  const result = runSync(root);
  assert.equal(result.status, 0, result.stderr);
  const source = fs.readFileSync(path.join(root, "demo-route", "index.html"), "utf8");
  assert.match(source, /<body data-story-shell="engineering-sandbox" data-story-route="demo-route" data-story-family="demo-family" data-story-variant="essay" data-story-nav="generated">/);
  assert.equal((source.match(/name="color-scheme"/g) || []).length, 1);
  assert.match(source, /<script src="\.\.\/\.\.\/shared\/theme-init\.js"><\/script><link rel="stylesheet" href="route\.css">/);
  assert.match(source, /<style>\.route \{ color: red; \}<\/style><link rel="stylesheet" href="\.\.\/\.\.\/shared\/engineering-sandbox\.css">/);
  assert.match(source, /<script src="runtime\.js"><\/script><script defer src="\.\.\/\.\.\/shared\/engineering-sandbox\.js"><\/script>/);
  const rerun = runSync(root);
  assert.equal(rerun.status, 0, rerun.stderr);
  assert.equal(fs.readFileSync(path.join(root, "demo-route", "index.html"), "utf8"), source);
});

test("synchronizer ignores tag text in comments and raw script or style bodies", () => {
  const root = makeRoot({
    "demo-route": normalDocument('<!-- <body data-story-shell="wrong"> <link rel="stylesheet" href="bad.css"> --><script>const text = "<style>ignored</style>";</script><style>.x::before { content: "<script>"; }</style><script defer src="../shared/engineering-sandbox.js"></script>', '<main data-example="quoted > value">Fixture</main><script defer src="../shared/engineering-sandbox.js"></script>'),
    "next-route": normalDocument("<title>Next</title>"),
  });
  const result = runSync(root);
  assert.equal(result.status, 0, result.stderr);
  const source = fs.readFileSync(path.join(root, "demo-route", "index.html"), "utf8");
  assert.match(source, /<!-- <body data-story-shell="wrong"> <link rel="stylesheet" href="bad\.css"> -->/);
  assert.match(source, /const text = "<style>ignored<\/style>";/);
  assert.match(source, /content: "<script>";/);
  assert.match(source, /data-example="quoted > value"/);
  assert.equal((source.match(/engineering-sandbox\.css/g) || []).length, 1);
  assert.equal((source.match(/engineering-sandbox\.js/g) || []).length, 1);
});

test("synchronizer accepts target-only bases and omitted closing document tags", () => {
  const root = makeRoot({
    "demo-route": '<!doctype html><html><head><base href="./client/index.html"><link rel="stylesheet" href="route.css"><body class="route"><main>Fixture</main>',
    "next-route": normalDocument('<link rel="stylesheet" href="next.css">'),
  });
  const result = runSync(root);
  assert.equal(result.status, 0, result.stderr);
  const source = fs.readFileSync(path.join(root, "demo-route", "index.html"), "utf8");
  assert.match(source, /src="\.\.\/\.\.\/shared\/theme-init\.js"/);
  assert.match(source, /href="\.\.\/\.\.\/shared\/engineering-sandbox\.css"/);
  assert.match(source, /class="route" data-story-shell="engineering-sandbox"/);
});

test("synchronizer preserves existing sandbox runtime positions in head and body", () => {
  const root = makeRoot({
    "demo-route": normalDocument('<script id="head-before"></script><script src="../shared/engineering-sandbox.js" data-location="head"></script><script id="head-after"></script>'),
    "next-route": normalDocument(
      "<title>Next</title>",
      '<main>Fixture</main><div id="body-before"></div><script data-location="body" src="../shared/engineering-sandbox.js"></script><script id="body-after"></script>',
    ),
  });
  const result = runSync(root);
  assert.equal(result.status, 0, result.stderr);
  const headSource = fs.readFileSync(path.join(root, "demo-route", "index.html"), "utf8");
  const bodySource = fs.readFileSync(path.join(root, "next-route", "index.html"), "utf8");
  assert.match(headSource, /<script id="head-before"><\/script><script src="\.\.\/shared\/engineering-sandbox\.js" data-location="head" defer><\/script><script id="head-after"><\/script>/);
  assert.match(bodySource, /<div id="body-before"><\/div><script data-location="body" src="\.\.\/shared\/engineering-sandbox\.js" defer><\/script><script id="body-after"><\/script>/);
  assert.equal((headSource.match(/engineering-sandbox\.js/g) || []).length, 1);
  assert.equal((bodySource.match(/engineering-sandbox\.js/g) || []).length, 1);
  const rerun = runSync(root);
  assert.equal(rerun.status, 0, rerun.stderr);
  assert.equal(fs.readFileSync(path.join(root, "demo-route", "index.html"), "utf8"), headSource);
  assert.equal(fs.readFileSync(path.join(root, "next-route", "index.html"), "utf8"), bodySource);
});

test("synchronizer adds dedicated parity evidence without changing existing modules", () => {
  const existingModule = {
    moduleId: "route-shell",
    originalBehavior: "The authored shell remains intact.",
    localStatus: "The local shell remains intact.",
    sourceFiles: ["../../demo-route/index.html"],
    notes: ["Existing note."],
    evidence: ["Existing evidence."],
  };
  const root = makeRoot(
    {
      "demo-route": normalDocument("<title>Demo</title>"),
      "next-route": normalDocument("<title>Next</title>"),
    },
    { "demo-route": [existingModule] },
  );
  const result = runSync(root);
  assert.equal(result.status, 0, result.stderr);
  const parityPath = path.join(root, "docs", "demo-route", "parity.json");
  const source = fs.readFileSync(parityPath, "utf8");
  const modules = JSON.parse(source);
  assert.deepEqual(modules[0], existingModule);
  assert.equal(modules[1].moduleId, "universal-route-html-seams");
  assert.match(modules[1].notes[0], /Ticket 12 synchronizes/);
  assert.match(modules[1].evidence[0], /existing position is preserved/);
  const rerun = runSync(root);
  assert.equal(rerun.status, 0, rerun.stderr);
  assert.equal(fs.readFileSync(parityPath, "utf8"), source);
});

test("synchronizer rejects malformed parity before writing routes or pages metadata", () => {
  const invalidParity = [
    ["malformed JSON", "{"],
    ["invalid module shape", [{ moduleId: "route-shell", notes: [], evidence: [] }]],
  ];
  for (const [label, parity] of invalidParity) {
    const root = makeRoot(
      {
        "demo-route": normalDocument("<title>Demo</title>"),
        "next-route": normalDocument("<title>Next</title>"),
      },
      { "demo-route": parity },
    );
    const routePath = path.join(root, "demo-route", "index.html");
    const original = fs.readFileSync(routePath, "utf8");
    const result = runSync(root);
    assert.notEqual(result.status, 0, label);
    assert.match(result.stderr, /parity/i, label);
    assert.equal(fs.readFileSync(routePath, "utf8"), original, label);
    assert.equal(fs.existsSync(path.join(root, "pages.json")), false, label);
  }
});

test("synchronizer rejects invalid seams before writing routes or pages metadata", () => {
  const cases = [
    ["external base", normalDocument('<base href="https://example.test/"><style></style>')],
    ["malformed base", normalDocument('<base href="http://[::1"><style></style>')],
    ["missing body", "<!doctype html><html><head><title>Missing body</title></head><main>Fixture</main>"],
    ["missing head", "<!doctype html><body><main>Fixture</main></body>"],
  ];
  for (const [label, html] of cases) {
    const root = makeRoot({ "demo-route": html, "next-route": normalDocument("<title>Next</title>") });
    const original = fs.readFileSync(path.join(root, "demo-route", "index.html"), "utf8");
    const result = runSync(root);
    assert.notEqual(result.status, 0, label);
    assert.equal(fs.readFileSync(path.join(root, "demo-route", "index.html"), "utf8"), original, label);
    assert.equal(fs.existsSync(path.join(root, "pages.json")), false, label);
  }
});
