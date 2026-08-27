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
  const completeManifest = manifest.some((route) => route.slug === nextRoute.slug)
    ? manifest
    : [...manifest, nextRoute];
  fs.writeFileSync(path.join(root, "routes.manifest.json"), JSON.stringify(completeManifest, null, 2));
  completeManifest.forEach((route) => {
    const routeDir = path.join(root, route.slug);
    fs.mkdirSync(routeDir, { recursive: true });
    fs.writeFileSync(
      path.join(routeDir, "index.html"),
      "<!doctype html><html><head><title>Fixture</title></head><body><main>Fixture</main></body></html>",
    );
  });
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
  shell: {
    family: "demo-family",
    variant: "essay",
    navigation: "none",
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
  ...validRoute,
  slug: "next-route",
  title: "Next Route",
  referenceUrl: "https://example.com/next",
  docsUrl: "./docs/next-route/",
  suggestedNextSlug: "demo-route",
};

test("valid manifest syncs and writes pages.json", () => {
  const root = makeRootWithManifest([validRoute, nextRoute]);
  const result = runSync(root);
  assert.equal(result.status, 0, result.stderr);
  const pages = JSON.parse(fs.readFileSync(path.join(root, "pages.json"), "utf8"));
  assert.equal(pages.length, 2);
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
    {
      ...validRoute,
      slug: "local-x",
      title: "Local X",
      summary: "Curated.",
      intent: "guided-path",
      referenceMode: "neutral",
      docsUrl: "./docs/local-x/",
      suggestedNextSlug: "next-route",
      referenceUrl: undefined,
    },
    {
      ...nextRoute,
      suggestedNextSlug: "local-x",
    },
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

test("route slugs cannot escape the synchronization root", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "manifest-test-"));
  const escapedSlug = `../${path.basename(root)}-outside`;
  const escapedPath = path.resolve(root, escapedSlug);
  const manifest = [
    {
      ...validRoute,
      slug: escapedSlug,
      docsUrl: `./docs/${escapedSlug}/`,
    },
    nextRoute,
  ];
  fs.writeFileSync(path.join(root, "routes.manifest.json"), JSON.stringify(manifest, null, 2));
  assert.equal(fs.existsSync(escapedPath), false);
  const result = runSync(root);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /kebab-case slug/i);
  assert.equal(fs.existsSync(escapedPath), false);
  assert.equal(fs.existsSync(path.join(root, "pages.json")), false);
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

test("experience contracts are preserved in pages.json", () => {
  const chapters = [{ selector: "#intro", title: "Introduction" }];
  const route = {
    ...validRoute,
    shell: { ...validRoute.shell, navigation: "generated", chapters },
  };
  const root = makeRootWithManifest([route]);
  const result = runSync(root);
  assert.equal(result.status, 0, result.stderr);
  const pages = JSON.parse(fs.readFileSync(path.join(root, "pages.json"), "utf8"));
  assert.deepEqual(pages[0].shell.chapters, chapters);
});

test("missing shell or experience contract fails validation", () => {
  const missingShell = { ...validRoute };
  delete missingShell.shell;
  const missingExperience = { ...validRoute };
  delete missingExperience.experience;
  assert.match(runSync(makeRootWithManifest([missingShell])).stderr, /shell.*object/i);
  assert.match(runSync(makeRootWithManifest([missingExperience])).stderr, /experience.*object/i);
});

test("navigation contracts enforce chapters and native controls", () => {
  const generatedWithoutChapters = {
    ...validRoute,
    slug: "rigid-body-collisions",
    referenceUrl: "https://example.com/rigid-body-collisions",
    docsUrl: "./docs/rigid-body-collisions/",
    shell: { ...validRoute.shell, navigation: "generated" },
  };
  const noneWithChapters = {
    ...validRoute,
    shell: { ...validRoute.shell, chapters: [{ selector: "#intro", title: "Intro" }] },
  };
  const nativeWithoutControl = { ...validRoute, shell: { ...validRoute.shell, navigation: "native" } };
  const generatedWithNativeControl = {
    ...validRoute,
    shell: {
      ...validRoute.shell,
      navigation: "generated",
      chapters: [{ selector: "#intro", title: "Intro" }],
      nativeControl: { selector: "nav a", minimum: 1, kind: "link", fragmentOnly: false },
    },
  };
  assert.match(runSync(makeRootWithManifest([generatedWithoutChapters])).stderr, /chapters/i);
  assert.match(runSync(makeRootWithManifest([noneWithChapters])).stderr, /generated/i);
  assert.match(runSync(makeRootWithManifest([nativeWithoutControl])).stderr, /nativeControl/i);
  assert.match(runSync(makeRootWithManifest([generatedWithNativeControl])).stderr, /nativeControl/i);
});

test("chapters, continuation, theme roots, and deferred actions are validated", () => {
  const duplicateChapters = {
    ...validRoute,
    shell: {
      ...validRoute.shell,
      navigation: "generated",
      chapters: [
        { selector: "#intro", title: "Intro", id: "intro" },
        { selector: "#intro", title: "Again", id: "intro" },
      ],
    },
  };
  const unknownNext = { ...validRoute, suggestedNextSlug: "missing-route" };
  const selfNext = { ...validRoute, suggestedNextSlug: validRoute.slug };
  const hookWithoutRoot = {
    ...validRoute,
    experience: { ...validRoute.experience, themeOwnership: "runtime-hook" },
  };
  const invalidDeferred = {
    ...validRoute,
    experience: { ...validRoute.experience, networkPolicy: { mode: "deferred-remote", actions: [] } },
  };
  assert.match(runSync(makeRootWithManifest([duplicateChapters])).stderr, /duplicate chapter/i);
  assert.match(runSync(makeRootWithManifest([unknownNext])).stderr, /unknown suggested/i);
  assert.match(runSync(makeRootWithManifest([selfNext])).stderr, /cannot suggest itself/i);
  assert.match(runSync(makeRootWithManifest([hookWithoutRoot])).stderr, /themeRoot/i);
  assert.match(runSync(makeRootWithManifest([invalidDeferred])).stderr, /actions/i);
});

test("unknown contract keys fail validation", () => {
  const cases = [
    { ...validRoute, typo: true },
    { ...validRoute, learning: { typo: true } },
    { ...validRoute, shell: { ...validRoute.shell, typo: true } },
    {
      ...validRoute,
      shell: {
        ...validRoute.shell,
        navigation: "generated",
        chapters: [{ selector: "#intro", title: "Intro", typo: true }],
      },
    },
    {
      ...validRoute,
      shell: {
        ...validRoute.shell,
        navigation: "native",
        nativeControl: { selector: "nav a", minimum: 1, kind: "link", typo: true },
      },
    },
    { ...validRoute, experience: { ...validRoute.experience, typo: true } },
    {
      ...validRoute,
      experience: {
        ...validRoute.experience,
        networkPolicy: { mode: "local-only", typo: true },
      },
    },
  ];
  cases.forEach((route) => {
    assert.match(runSync(makeRootWithManifest([route])).stderr, /unknown key/i);
  });
});

test("native control kind invariants fail validation", () => {
  const nativeRoute = (nativeControl) => ({
    ...validRoute,
    shell: { ...validRoute.shell, navigation: "native", nativeControl },
  });
  const cases = [
    nativeRoute({ selector: "nav a", minimum: 1, kind: "link", childSelector: "span" }),
    nativeRoute({ selector: "nav a", minimum: 1, kind: "link", peerSelectors: ["button"] }),
    nativeRoute({ selector: "button", minimum: 1, kind: "state", fragmentOnly: true }),
    nativeRoute({ selector: "button", minimum: 1, kind: "state", peerSelectors: ["button"] }),
    nativeRoute({ selector: "button", minimum: 1, kind: "state", peerSelectors: ["[data-next]", "[data-next]"] }),
    nativeRoute({ selector: "button", minimum: 1, kind: "state", activationSelector: "#start" }),
    nativeRoute({ selector: "button", minimum: 1, kind: "state", readySelector: "#ready" }),
  ];
  cases.forEach((route) => {
    assert.notEqual(runSync(makeRootWithManifest([route])).status, 0);
  });
});

test("trimmed selectors, known probes, URLs, and policy hosts are required", () => {
  const selectorWhitespace = {
    ...validRoute,
    experience: { ...validRoute.experience, primarySurface: " main" },
  };
  const unknownProbe = {
    ...validRoute,
    experience: { ...validRoute.experience, interactionProbe: "read-onyl" },
  };
  const malformedUrl = { ...validRoute, referenceUrl: "https://-bad.example/demo" };
  const malformedHost = {
    ...validRoute,
    slug: "musicmap",
    referenceUrl: "https://example.com/musicmap",
    docsUrl: "./docs/musicmap/",
    experience: {
      ...validRoute.experience,
      networkPolicy: {
        mode: "deferred-remote",
        actions: [
          { selector: "#youtube-playlist-link", hosts: ["youtube.com", "a..b"] },
        ],
      },
    },
  };
  assert.match(runSync(makeRootWithManifest([selectorWhitespace])).stderr, /trimmed/i);
  assert.match(runSync(makeRootWithManifest([unknownProbe])).stderr, /invalid interactionProbe/i);
  assert.match(runSync(makeRootWithManifest([malformedUrl])).stderr, /referenceUrl/i);
  assert.match(runSync(makeRootWithManifest([malformedHost])).stderr, /invalid host/i);
});

test("chapter declarations are manifest-owned and load failures are observable", () => {
  const source = fs.readFileSync(path.resolve(here, "..", "..", "shared", "engineering-sandbox.js"), "utf8");
  assert.doesNotMatch(source, /routeChapterConfigs/);
  assert.doesNotMatch(source, /\.catch\(\(\) => \[\]\)/);
  assert.match(source, /pages\.json/);
  assert.match(source, /cache:\s*["']no-store["']/);
  assert.match(source, /console\.error\("Engineering Sandbox route metadata unavailable"/);
  assert.match(source, /dataset\.storyManifest\s*=\s*error\s*\?\s*"error"\s*:\s*"ready"/);
});
