import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import vm from "node:vm";

const here = path.dirname(fileURLToPath(import.meta.url));
const syncTool = path.resolve(here, "..", "sync-route-metadata.mjs");

test("TTV controls follow engine opacity through the existing observer", () => {
  const root = path.resolve(here, "../..", "train-test-validation");
  assert.match(fs.readFileSync(path.join(root, "index.html"), "utf8"), /class="button-container" inert/);
  const controls = { inert: true, style: { opacity: "" }, matches: selector => selector === ".button-container" };
  let callback;
  let options;
  let observers = 0;
  const context = {
    document: {
      readyState: "complete",
      documentElement: {},
      querySelector: () => controls,
      querySelectorAll: () => [],
    },
    getComputedStyle: () => ({ opacity: controls.style.opacity || "0" }),
    requestAnimationFrame: run => run(),
    MutationObserver: class {
      constructor(run) { callback = run; observers++; }
      observe(target, observed) { options = observed; }
    },
  };
  vm.runInNewContext(fs.readFileSync(path.join(root, "a11y-state.js"), "utf8"), context);
  assert.equal(controls.inert, true);
  assert.equal(observers, 1);
  assert(options.attributeFilter.includes("style"));
  for (const opacity of ["1", "1", "0", "1", "0"]) {
    controls.style.opacity = opacity;
    callback([{ type: "attributes", attributeName: "style", target: controls }]);
    assert.equal(controls.inert, opacity === "0");
  }
});

test("opaque orientation stays in continuation chrome with native disclosure and local key isolation", () => {
  const source = fs.readFileSync(path.resolve(here, "../../shared/public-footer.js"), "utf8");
  const css = fs.readFileSync(path.resolve(here, "../../shared/public-footer.css"), "utf8");
  const mount = source.slice(source.indexOf("  function mountRouteOrientation("), source.indexOf("  function mountRouteContinuation(pages)"));
  const questions = {
    trust: "When does cooperation pay?",
    loopy: "Can a feedback loop amplify a change?",
    sim: "What patterns can local rules create?",
    wbwwb: "How can a headline feed a cycle of fear?",
    "coming-out-simulator-2014": "What changes when you choose a different reply?",
  };
  let focused;
  function element(tag) {
    return {
      tag, children: [], listeners: {},
      appendChild(child) { this.children.push(child); child.parent = this; },
      addEventListener(type, listener) { this.listeners[type] = listener; },
      querySelector(tag) { return this.children.find(child => child.tag === tag); },
      contains(target) { return target === this || this.children.some(child => child.contains(target)); },
      focus() { focused = this; },
    };
  }
  function dispatch(target, type, properties = {}) {
    const event = {
      target, stopped: false, defaultPrevented: false, ...properties,
      stopPropagation() { this.stopped = true; },
      preventDefault() { this.defaultPrevented = true; },
    };
    for (let node = target; node; node = node.parent) {
      node.listeners[type]?.(event);
      if (event.stopped) break;
    }
    return event;
  }
  const synths = ["get-started", "how-synths-make-sound", "filter-resonance", "modulating-amplitude-with-envelopes", "matching-envelopes", "recipes"].map(name => `ableton-learning-synths-${name}`);
  for (const slug of [...Object.keys(questions), ...synths, "polygons", "toString", undefined]) {
    const section = element("section");
    const isStatic = synths.includes(slug);
    if (isStatic) {
      const html = fs.readFileSync(path.resolve(here, "../..", slug, "index.html"), "utf8");
      assert.match(html, /<details\b[^>]*data-route-orientation/);
      const details = element("details");
      const summary = element("summary");
      summary.textContent = "Explore this route";
      details.appendChild(summary);
      details.appendChild(element("p"));
      section.appendChild(details);
    }
    const document = {
      ...element("document"), body: { dataset: { storyRoute: slug } }, createElement: element,
      querySelectorAll(selector) {
        assert.equal(selector, "body > details[data-route-orientation]");
        return isStatic ? section.children : [];
      },
    };
    vm.runInNewContext(`${mount}\ninitRouteOrientations();\nmountRouteOrientation(section);`, { document, section });
    if (!Object.hasOwn(questions, slug) && !isStatic) {
      assert.equal(section.children.length, 0);
      continue;
    }
    assert.equal(section.children.length, 1);
    const details = section.children[0];
    assert.equal(details.tag, "details");
    assert.equal(details.open, undefined);
    assert.equal(details.children[0].tag, "summary");
    assert.equal(details.children[0].textContent, "Explore this route");
    if (!isStatic) {
      assert(details.children[1].textContent.startsWith(questions[slug]));
      assert.match(details.children[1].textContent, /not /);
    }
    const summary = details.children[0];
    const link = element("a");
    details.children[1].appendChild(link);
    let outerClicks = 0;
    section.addEventListener("click", () => outerClicks++);
    for (const target of [summary, details.children[1], link]) {
      for (const detail of [0, 1]) {
        const event = dispatch(target, "click", { detail });
        assert.equal(event.stopped, true);
        assert.equal(event.defaultPrevented, false);
      }
    }
    assert.equal(outerClicks, 0);
    for (const type of ["keydown", "keyup"]) {
      for (const key of ["Enter", " ", "Escape", "Tab", "ArrowDown", "a"]) {
        details.open = false;
        const event = dispatch(summary, type, { key });
        assert.equal(event.stopped, ["Enter", " ", "Escape"].includes(key));
        assert.equal(event.defaultPrevented, false);
      }
    }
    for (const release of ["pointerup", "pointercancel"]) {
      details.open = true;
      dispatch(details.children[1], "pointerdown");
      dispatch(summary, "focusout", { relatedTarget: null });
      assert.equal(details.open, true);
      document.listeners[release]();
      dispatch(summary, "focusout", { relatedTarget: null });
      assert.equal(details.open, false);
    }
    details.open = true;
    focused = link;
    dispatch(summary, "focusout", { relatedTarget: link });
    assert.equal(details.open, true);
    document.listeners.pointerdown({ target: link });
    assert.equal(details.open, true);
    const escape = dispatch(link, "keydown", { key: "Escape" });
    assert.equal(escape.defaultPrevented, true);
    assert.equal(details.open, false);
    assert.equal(focused, summary);
    focused = link;
    dispatch(link, "keyup", { key: "Escape" });
    dispatch(link, "keydown", { key: "Escape" });
    assert.equal(focused, link);
    for (const relatedTarget of [section, null]) {
      details.open = true;
      focused = relatedTarget;
      dispatch(link, "focusout", { relatedTarget });
      assert.equal(details.open, false);
      assert.equal(focused, relatedTarget);
    }
    details.open = true;
    focused = section;
    document.listeners.pointerdown({ target: section });
    assert.equal(details.open, false);
    assert.equal(focused, section);
    dispatch(section, "click");
    assert.equal(outerClicks, 1);
    assert.deepEqual(Object.keys(document.listeners), ["pointerup", "pointercancel", "pointerdown"]);
  }
  assert.match(source, /mountRouteOrientation\(section\);\s+footer.before\(section\)/);
  assert.match(css, /\.route-continuation > \.route-orientation[^{}]*\{[^}]*position: fixed;[^}]*max-height:[^;]+;[^}]*overflow: auto;/);
});

test("child continuation uses its manifest parent without changing deep links or duplicating chrome", () => {
  const source = fs.readFileSync(path.resolve(here, "../../shared/public-footer.js"), "utf8");
  const mount = source.slice(source.indexOf("  function mountRouteContinuation(pages)"), source.indexOf("  function mountRouteContinuationFallback("));
  const pages = JSON.parse(fs.readFileSync(path.resolve(here, "../../routes.manifest.json"), "utf8"));
  const parent = pages.find(page => page.slug === "blockchain");
  assert(parent);
  assert.equal(pages.some(page => page.slug === "blockchain-distributed"), false);
  const target = pages.find(page => page.slug === parent.suggestedNextSlug);
  for (const prefix of ["/", "/interactive-explanation/", "/nested/site/"]) {
    for (const child of ["distributed.html", "distributed.html?peer=B#block2", "nested/demo.html"]) {
      const href = `https://example.test${prefix}blockchain/${child}`;
      const sections = [];
      const body = { dataset: { storyRoute: "blockchain-distributed" } };
      const context = vm.createContext({
        URL, pages, window: { location: { href } },
        atlasHref: () => `https://example.test${prefix}index.html`,
        document: {
          body,
          querySelector: selector => selector === "main" ? {} : sections[0],
          createElement: () => ({ dataset: {} }),
        },
        createRouteContinuationSection: () => ({ children: [], appendChild(child) { this.children.push(child); } }),
        insertRouteContinuation: section => sections.push(section),
      });
      vm.runInContext(`${mount}\nmountRouteContinuation(pages);\nmountRouteContinuation(pages);`, context);
      assert.equal(sections.length, 1);
      assert.equal(sections[0].children.length, 1);
      assert.equal(sections[0].children[0].href, `https://example.test${prefix}${target.slug}/`);
      assert.equal(context.window.location.href, href);
      assert.equal(body.dataset.storyRoute, "blockchain-distributed");
      for (const invalid of ["blockchain-other/distributed.html", "unknown/distributed.html", "blockchain/", "blockchain/index.html"]) {
        sections.length = 0;
        context.window.location.href = `https://example.test${prefix}${invalid}`;
        assert.throws(() => vm.runInContext("mountRouteContinuation(pages);", context), /Suggested Next Route unavailable/);
        assert.equal(sections.length, 0);
      }
      sections.length = 0;
      context.window.location.href = href;
      body.dataset.storyRoute = parent.slug;
      vm.runInContext("mountRouteContinuation(pages);", context);
      assert.equal(sections[0].children[0].href, `https://example.test${prefix}${target.slug}/`);
    }
  }
});

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
