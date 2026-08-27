import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import "../shared/route-families.js";
import {
  EXPERIENCE_BASELINE_VERSION,
  contrastRatio,
  mergeExperienceBaseline,
  performanceRegressions,
  serializeExperienceBaseline,
  summarizePerformanceRuns,
  validateExperienceBaseline,
} from "./experience-baseline.mjs";
import { createSmokeServer } from "./smoke/server.mjs";

const RouteFamilies = globalThis.RouteFamilies;

const defaultRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const cliArgs = process.argv.slice(2);

function hasFlag(flag) {
  return cliArgs.includes(flag);
}

function getArgValues(flag) {
  const values = [];

  cliArgs.forEach((arg, index) => {
    if (arg.startsWith(`${flag}=`)) {
      values.push(arg.slice(flag.length + 1));
      return;
    }

    if (arg === flag) {
      const next = cliArgs[index + 1];
      if (next && !next.startsWith("--")) {
        values.push(next);
      }
    }
  });

  return values
    .flatMap((value) => value.split(","))
    .map((value) => value.trim())
    .filter(Boolean);
}

const explicitRootArg = cliArgs.find((arg, index) => {
  if (arg.startsWith("--")) {
    return false;
  }

  const previous = cliArgs[index - 1];
  return !previous || !previous.startsWith("--");
});

const rootDir = path.resolve(explicitRootArg || defaultRoot);
const port = Number(process.env.SMOKE_PORT || 4173);
const host = "127.0.0.1";
const mountPath = "/interactive-explanation/";
const baseUrl = `http://${host}:${port}${mountPath}`;
const baseOrigin = new URL(baseUrl).origin;
const verbose = hasFlag("--verbose") || process.env.SMOKE_VERBOSE === "1";
const experience = hasFlag("--experience");
const recordBaseline = hasFlag("--record-baseline");
const skipPerformance = hasFlag("--skip-performance");
const baselineArgs = getArgValues("--baseline");
const baselinePath = path.resolve(rootDir, baselineArgs[0] || "tools/experience-baselines.json");
const rawConsoleLog = console.log.bind(console);

console.log = (...args) => {
  if (verbose) {
    rawConsoleLog(...args);
  }
};

function phaseLog(message) {
  rawConsoleLog(message);
}

const rememberDownloadCardNames = [
  "intro_a",
  "intro_b",
  "intro_c",
  "sci_a",
  "sci_b",
  "sci_c",
  "leit_a",
  "leit_b",
  "leit_c",
  "leit_d",
  "you_what",
  "you_why",
  "you_how",
  "you_when",
];

const abletonLessonBatchSlugs = [
  "ableton-learning-music-play-with-beats",
  "ableton-learning-music-play-with-notes-and-scales",
  "ableton-learning-music-play-with-chords",
  "ableton-learning-music-play-with-basslines",
  "ableton-learning-music-play-with-melodies",
  "ableton-learning-music-play-with-song-structures",
];
const abletonMusicWidgetSlugs = new Set([
  "ableton-learning-music-playground",
  ...abletonLessonBatchSlugs.filter((slug) => slug !== "ableton-learning-music-play-with-song-structures"),
]);

const abletonSynthLessonSlugs = [
  "ableton-learning-synths-get-started",
  "ableton-learning-synths-how-synths-make-sound",
  "ableton-learning-synths-filter-resonance",
  "ableton-learning-synths-modulating-amplitude-with-envelopes",
  "ableton-learning-synths-matching-envelopes",
  "ableton-learning-synths-recipes",
];
const abletonSynthAccentBySlug = new Map([
  ["ableton-learning-synths-get-started", "#ff6577"],
  ["ableton-learning-synths-how-synths-make-sound", "#febc2d"],
  ["ableton-learning-synths-filter-resonance", "#dd0c75"],
  ["ableton-learning-synths-modulating-amplitude-with-envelopes", "#23b2fe"],
  ["ableton-learning-synths-matching-envelopes", "#23b2fe"],
  ["ableton-learning-synths-recipes", null],
]);

const themedEngineeringLongformSlugs = new Set([
  "alpha-compositing",
  "color-spaces",
  "sound",
  "cameras-and-lenses",
  "lights-and-shadows",
  "tesseract",
  "gears",
  "gps",
  "earth-and-sun",
  "curves-and-surfaces",
  "naval-architecture",
]);

const authoredThemeRootBySlug = new Map([
  ...Array.from(themedEngineeringLongformSlugs, (slug) => [slug, "#main_container"]),
  ["hysteresis-slack", "main.container"],
  ["rigid-body-collisions", ".story-hero__panel"],
]);

const samwhoRuntimeThemeSlugs = new Set([
  "memory-allocation",
  "load-balancing",
]);

const routeManifestPath = path.join(rootDir, "routes.manifest.json");
const routeManifest = fs.existsSync(routeManifestPath)
  ? JSON.parse(fs.readFileSync(routeManifestPath, "utf8"))
  : [];
const routeGroupsBySlug = new Map(routeManifest.map((route) => [route.slug, inferRouteGroups(route)]));
const routeManifestBySlug = new Map(routeManifest.map((route) => [route.slug, route]));
const selectedGroups = new Set(getArgValues("--group"));
const selectedRoutes = new Set(getArgValues("--route"));
const manifestSlugs = new Set(routeManifest.map((route) => route.slug));

function inferRouteFamily(route) {
  return RouteFamilies.classifySmokeFamily(route);
}

function inferRouteGroups(route) {
  return RouteFamilies.classifySmokeGroups(route);
}

function shouldRunSlug(slug) {
  if (!slug) {
    return true;
  }

  if (selectedRoutes.size > 0 && !selectedRoutes.has(slug)) {
    return false;
  }

  if (selectedGroups.size === 0) {
    return true;
  }

  const groups = routeGroupsBySlug.get(slug) || new Set(["custom"]);
  return selectedGroups.has("all") ||
    selectedGroups.has(slug) ||
    Array.from(groups).some((group) => selectedGroups.has(group));
}

function exists(relativePath) {
  const fullPath = path.join(rootDir, relativePath);
  if (!fs.existsSync(fullPath)) {
    return false;
  }

  const slug = relativePath.split(/[\\/]/)[0];
  return shouldRunSlug(slug);
}

function validateSelections() {
  const unknownRoutes = Array.from(selectedRoutes).filter((slug) => !manifestSlugs.has(slug));
  assert(unknownRoutes.length === 0, `Unknown --route slug(s): ${unknownRoutes.join(", ")}`);
  assert(routeManifest.length > 0, `Missing or empty routes.manifest.json at ${routeManifestPath}`);
  assert(baselineArgs.length <= 1, "Pass --baseline at most once");
  assert(
    routeManifest.some((route) => shouldRunSlug(route.slug)),
    `Route/group filters selected no manifest routes: routes=${Array.from(selectedRoutes).join(", ") || "(none)"}; groups=${Array.from(selectedGroups).join(", ") || "(none)"}`,
  );
  if (recordBaseline) {
    assert(selectedRoutes.size > 0 || selectedGroups.size > 0, "--record-baseline requires an explicit --route or --group filter");
    if (!fs.existsSync(baselinePath)) {
      assert(selectedManifestRoutes().length === routeManifest.length, "Initial experience baseline recording must select all manifest routes");
    }
  } else {
    assert(fs.existsSync(baselinePath), `Approved experience baseline missing at ${baselinePath}; record it explicitly with --record-baseline and a route/group filter`);
  }
}

function selectedManifestRoutes() {
  return routeManifest.filter((route) => shouldRunSlug(route.slug));
}

function loadExperienceBaseline() {
  if (!fs.existsSync(baselinePath)) {
    return null;
  }
  const baseline = JSON.parse(fs.readFileSync(baselinePath, "utf8"));
  if (baseline.version !== EXPERIENCE_BASELINE_VERSION) {
    assert(recordBaseline, `Experience baseline version ${baseline.version} is obsolete; record version ${EXPERIENCE_BASELINE_VERSION} explicitly`);
    assert(selectedManifestRoutes().length === routeManifest.length, `Experience baseline version ${EXPERIENCE_BASELINE_VERSION} must initially record all manifest routes`);
    return null;
  }
  validateExperienceBaseline(baseline, Array.from(manifestSlugs));
  const unknownSlugs = Object.keys(baseline.routes).filter((slug) => !manifestSlugs.has(slug));
  assert(unknownSlugs.length === 0, `Experience baseline has unknown route(s): ${unknownSlugs.join(", ")}`);
  return baseline;
}

function writeExperienceBaseline(baseline) {
  const directory = path.dirname(baselinePath);
  assert(fs.existsSync(directory), `Experience baseline directory missing at ${directory}`);
  const temporaryPath = `${baselinePath}.${process.pid}.tmp`;
  try {
    fs.writeFileSync(temporaryPath, serializeExperienceBaseline(baseline), "utf8");
    fs.renameSync(temporaryPath, baselinePath);
  } finally {
    if (fs.existsSync(temporaryPath)) {
      fs.rmSync(temporaryPath);
    }
  }
}

const { start: startServer } = createSmokeServer({ rootDir, host, port, mountPath });

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function assertElementContract(page, selector, contract, label) {
  const elements = page.locator(selector);
  assert(await elements.count() === 1, `${label} expected one ${selector}`);
  const matches = await elements.evaluate((element, expected) => {
    const text = (element.textContent || "").replace(/\s+/g, " ").trim();
    return (!expected.tagName || element.tagName === expected.tagName) &&
      Object.entries(expected.attributes || {}).every(([name, value]) => element.getAttribute(name) === value) &&
      (expected.textFragments || []).every((fragment) => text.includes(fragment));
  }, contract);
  assert(matches, `${label} content contract failed`);
}

async function assertLinkSequence(page, selector, expected, label) {
  const actual = await page.locator(selector).evaluateAll((links) => links.map((link) => ({
    text: (link.textContent || "").replace(/\s+/g, " ").trim(),
    href: link.getAttribute("href"),
    onclick: link.getAttribute("onclick"),
  })));
  assert(JSON.stringify(actual) === JSON.stringify(expected), `${label} link contract failed`);

  const dead = await page.locator(selector).evaluateAll((links) => links.reduce((problems, link) => {
    const href = link.getAttribute("href") || "";
    if (href.startsWith("#") && href.length > 1 && !document.getElementById(href.slice(1))) {
      problems.push(`missing fragment target ${href}`);
    }
    const onclick = link.getAttribute("onclick");
    if (onclick) {
      const handler = onclick.match(/^\s*([A-Za-z_$][\w$]*)\s*\(/);
      if (!handler) {
        problems.push(`unparsable onclick "${onclick}"`);
      } else if (typeof window[handler[1]] !== "function") {
        problems.push(`onclick handler ${handler[1]} is not a function`);
      }
    }
    return problems;
  }, []));
  assert(dead.length === 0, `${label} link targets unresolved: ${dead.join("; ")}`);
}

async function assertRoute(page, relativePath, selector) {
  const response = await page.goto(new URL(relativePath, baseUrl).href, {
    waitUntil: "domcontentloaded",
  });
  assert(response && response.ok(), `Route failed: ${relativePath}`);
  try {
    if (selector === "#reference-footer") {
      await page.waitForFunction(() => Boolean(document.querySelector("#reference-footer")), null, { timeout: 15000 });
    } else if (selector) {
      await page.waitForSelector(selector, { timeout: 15000 });
    }
  } catch (error) {
    throw new Error(`Selector ${selector} did not mount on ${relativePath}: ${error.message}`);
  }
  await assertReferenceFooterFocusContract(page, relativePath);
  console.log(`OK route ${relativePath}`);
}

async function clickWithoutNavigation(page, selector) {
  await page.locator(selector).evaluate((element) => {
    element.addEventListener("click", (event) => event.preventDefault(), { once: true });
    element.click();
  });
}

async function assertRouteContinuation(page, route, label) {
  const target = routeManifestBySlug.get(route.suggestedNextSlug);
  assert(target, `${label} referenced missing Suggested Next Route ${route.suggestedNextSlug}`);
  await page.waitForSelector("[data-route-continuation]", { timeout: 15000 });
  const state = await page.locator("[data-route-continuation]").evaluate((section, expected) => {
    const heading = section.querySelector("[data-route-continuation-heading]");
    const links = section.querySelectorAll("[data-route-continuation-link]");
    const link = links[0];
    const main = document.querySelector("main");
    const footer = document.querySelector("#reference-footer");
    const autoFocused = window.__routeContinuationAutoFocused === true;
    const urlBefore = window.location.href;
    const progressSnapshot = () => Object.keys(window.localStorage)
      .filter((key) => key.startsWith("ie-learning-progress:v1:"))
      .sort()
      .map((key) => [key, window.localStorage.getItem(key)]);
    const progressBefore = progressSnapshot();
    if (link) {
      link.focus();
      link.addEventListener("click", (event) => event.preventDefault(), { once: true });
      link.click();
    }
    const style = link ? getComputedStyle(link) : null;
    const rect = link?.getBoundingClientRect();
    const sectionRect = section.getBoundingClientRect();
    const footerRect = footer?.getBoundingClientRect();
    const labelledBy = section.getAttribute("aria-labelledby");
    const dataLearningAttributes = [section, link].filter(Boolean).flatMap((element) =>
      Array.from(element.attributes).map((attribute) => attribute.name).filter((name) => name.startsWith("data-learning-"))
    );
    return {
      sectionCount: document.querySelectorAll("[data-route-continuation]").length,
      bodyChild: section.parentElement === document.body,
      followsMain: Boolean(main && (main.compareDocumentPosition(section) & 4)),
      precedesFooter: Boolean(footer && (section.compareDocumentPosition(footer) & 4)),
      headingCount: section.querySelectorAll("h2").length,
      headingText: (heading?.textContent || "").replace(/\s+/g, " ").trim(),
      labelledBy,
      labelResolves: Boolean(labelledBy && heading?.id === labelledBy),
      linkCount: links.length,
      linkText: (link?.textContent || "").replace(/\s+/g, " ").trim(),
      linkOrigin: link ? new URL(link.href).origin : "",
      linkPathname: link ? new URL(link.href).pathname : "",
      target: link?.getAttribute("target"),
      rel: link?.getAttribute("rel"),
      onclick: link?.getAttribute("onclick"),
      dataLearningAttributes,
      autoFocused,
      focused: document.activeElement === link,
      visible: Boolean(rect && rect.width > 0 && rect.height > 0 && style?.display !== "none" && style?.visibility !== "hidden"),
      focusOutline: Boolean(style && style.outlineStyle !== "none" && parseFloat(style.outlineWidth) > 0),
      navigationPrevented: window.location.href === urlBefore,
      progressUnchanged: JSON.stringify(progressSnapshot()) === JSON.stringify(progressBefore),
      withinViewport: sectionRect.left >= -2 && sectionRect.right <= window.innerWidth + 2,
      centeredWithFooter: Boolean(footerRect && Math.abs((sectionRect.left + sectionRect.right) - (footerRect.left + footerRect.right)) <= 4),
      expected,
    };
  }, {
    title: target.title,
    origin: baseOrigin,
    pathname: `${mountPath}${target.slug}/`,
  });
  assert(state.sectionCount === 1, `${label} expected one Suggested Next Route block, found ${state.sectionCount}`);
  assert(state.bodyChild && state.followsMain && state.precedesFooter, `${label} Suggested Next Route was not between main and #reference-footer`);
  assert(state.headingCount === 1 && state.headingText === "Suggested Next Route", `${label} exposed an unexpected continuation heading: ${state.headingText}`);
  assert(state.labelResolves, `${label} Suggested Next Route aria-labelledby did not resolve to its heading`);
  assert(state.linkCount === 1 && state.linkText === target.title, `${label} exposed an unexpected continuation link: ${state.linkText}`);
  assert(state.linkOrigin === baseOrigin && state.linkPathname === `${mountPath}${target.slug}/`, `${label} continuation escaped its local target: ${state.linkOrigin}${state.linkPathname}`);
  assert(state.target === null && state.rel === null && state.onclick === null && state.navigationPrevented, `${label} continuation was not an ordinary local link`);
  assert(!state.autoFocused, `${label} continuation moved focus while mounting`);
  assert(state.dataLearningAttributes.length === 0 && state.progressUnchanged, `${label} continuation leaked into Guided Path Progress`);
  assert(state.visible && state.focused && state.focusOutline, `${label} continuation link was not visibly keyboard focusable`);
  assert(state.withinViewport && state.centeredWithFooter, `${label} continuation did not preserve shared footer geometry`);
}

async function assertLearningPathControls(context, relativePath, slug, stepCount, selectedStep) {
  const key = `ie-learning-progress:v1:${slug}`;
  const routeUrl = new URL(relativePath, baseUrl).href;
  const page = await context.newPage();
  await assertRoute(page, relativePath, "#reference-footer");
  await page.evaluate((storageKey) => window.localStorage.removeItem(storageKey), key);
  await page.reload({ waitUntil: "domcontentloaded" });

  const initial = await page.evaluate(() => ({
    startHidden: document.querySelector("[data-learning-start]")?.hidden,
    resumeHidden: document.querySelector("[data-learning-resume]")?.hidden,
  }));
  assert(initial.startHidden === false, `${slug} hid Start without saved progress`);
  assert(initial.resumeHidden === true, `${slug} exposed Resume without saved progress`);

  await clickWithoutNavigation(page, "[data-learning-start]");
  const started = await page.evaluate((storageKey) => JSON.parse(window.localStorage.getItem(storageKey)), key);
  assert(started.step === 1 && Number.isFinite(started.updatedAt), `${slug} did not save explicit Start progress`);

  await clickWithoutNavigation(page, `[data-learning-step="${selectedStep}"]`);
  const selected = await page.evaluate((storageKey) => JSON.parse(window.localStorage.getItem(storageKey)), key);
  assert(selected.step === selectedStep, `${slug} did not save numbered-step progress`);

  await page.reload({ waitUntil: "domcontentloaded" });
  const restored = await page.evaluate((storageKey) => ({
    startHidden: document.querySelector("[data-learning-start]")?.hidden,
    resumeHidden: document.querySelector("[data-learning-resume]")?.hidden,
    resumeHref: document.querySelector("[data-learning-resume]")?.href,
    stepHref: document.querySelector(`[data-learning-step="${JSON.parse(window.localStorage.getItem(storageKey))?.step}"]`)?.href,
    stored: JSON.parse(window.localStorage.getItem(storageKey)),
  }), key);
  assert(restored.startHidden === true, `${slug} did not hide Start after restoring progress`);
  assert(restored.resumeHidden === false, `${slug} did not expose Resume after restoring progress`);
  assert(restored.resumeHref === restored.stepHref, `${slug} Resume did not target the stored step`);
  assert(restored.stored.updatedAt === selected.updatedAt, `${slug} updated progress without an explicit action`);

  await page.waitForTimeout(10);
  await clickWithoutNavigation(page, "[data-learning-resume]");
  const resumed = await page.evaluate((storageKey) => JSON.parse(window.localStorage.getItem(storageKey)), key);
  assert(resumed.step === selectedStep && resumed.updatedAt > selected.updatedAt, `${slug} did not refresh progress on explicit Resume`);

  await page.evaluate(({ storageKey, count }) => {
    window.localStorage.setItem(storageKey, JSON.stringify({ step: count, updatedAt: Date.now() - 31 * 24 * 60 * 60 * 1000 }));
  }, { storageKey: key, count: stepCount });
  await page.reload({ waitUntil: "domcontentloaded" });
  const expired = await page.evaluate((storageKey) => ({
    stored: window.localStorage.getItem(storageKey),
    startHidden: document.querySelector("[data-learning-start]")?.hidden,
    resumeHidden: document.querySelector("[data-learning-resume]")?.hidden,
  }), key);
  assert(expired.stored === null, `${slug} retained progress older than 30 days`);
  assert(expired.startHidden === false && expired.resumeHidden === true, `${slug} restored expired progress`);
  await page.close();

  const sharePage = await context.newPage();
  await sharePage.addInitScript(() => {
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: async (payload) => {
        window.__learningSharePayload = payload;
      },
    });
  });
  await assertRoute(sharePage, relativePath, "#reference-footer");
  await sharePage.locator("[data-share-route]").click();
  await sharePage.waitForFunction(() => document.querySelector("[data-share-status]")?.textContent === "Path shared.");
  const sharePayload = await sharePage.evaluate(() => window.__learningSharePayload);
  assert(sharePayload?.url === routeUrl, `${slug} native share used an unexpected route URL`);
  assert(sharePayload?.title === await sharePage.title(), `${slug} native share omitted the route title`);
  await sharePage.close();

  const clipboardPage = await context.newPage();
  await clipboardPage.addInitScript(() => {
    Object.defineProperty(navigator, "share", { configurable: true, value: undefined });
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (value) => {
          window.__learningCopiedUrl = value;
        },
      },
    });
  });
  await assertRoute(clipboardPage, relativePath, "#reference-footer");
  await clipboardPage.locator("[data-share-route]").click();
  await clipboardPage.waitForFunction(() => document.querySelector("[data-share-status]")?.textContent === "Path link copied.");
  const copiedUrl = await clipboardPage.evaluate(() => window.__learningCopiedUrl);
  assert(copiedUrl === routeUrl, `${slug} clipboard fallback used an unexpected route URL`);
  await clipboardPage.close();
}

async function assertReferenceFooterFocusContract(page, relativePath) {
  const state = await page.evaluate(() => {
    const footer = document.querySelector("#reference-footer");
    if (!footer) {
      return { present: false };
    }
    const focusable = Array.from(
      footer.querySelectorAll("a[href], button, input, select, textarea, [tabindex]"),
    );
    return {
      present: true,
      hidden: footer.dataset.visibility === "hidden",
      inert: footer.inert === true || footer.hasAttribute("inert"),
      ariaHidden: footer.getAttribute("aria-hidden") === "true",
      focusableCount: focusable.length,
      focusableInTabOrder: focusable.filter((element) => element.tabIndex >= 0).length,
    };
  });

  if (!state.present) {
    return;
  }

  if (state.hidden) {
    assert(
      state.inert && state.ariaHidden,
      `Hidden reference footer on ${relativePath} was not removed from the accessibility tree (inert=${state.inert}, aria-hidden=${state.ariaHidden})`,
    );
    assert(
      state.focusableInTabOrder === 0,
      `Hidden reference footer on ${relativePath} left ${state.focusableInTabOrder} focusable element(s) in the tab order`,
    );
  } else {
    assert(
      !state.inert && !state.ariaHidden,
      `Visible reference footer on ${relativePath} was incorrectly hidden from the accessibility tree`,
    );
  }
}

async function assertEngineeringSandboxShell(page, label, options = {}) {
  const {
    minimumChapters = 4,
    navMode = "generated",
    nativeSelector = "#toc a[href^='#'], nav a[href^='#']",
    expectedFamily = null,
    expectedRoute = null,
    expectedVariant = "essay",
    minimumNativeLinks = minimumChapters,
    requireNativeAnchors = true,
    allowNativeLinksInNoNav = false,
  } = options;

  await page.waitForFunction(() => {
    return document.body?.dataset.storyShell === "engineering-sandbox" &&
      document.querySelector(".story-hero") &&
      document.querySelector(".story-hero [data-story-callout='play']");
  }, null, { timeout: 15000 });

  const shellState = await page.evaluate((selector) => {
    const railLinks = Array.from(document.querySelectorAll(".story-rail__nav a"));
    const mobileLinks = Array.from(document.querySelectorAll(".story-mobile-bar__nav a"));
    const nativeLinks = Array.from(document.querySelectorAll(selector));

    return {
      storyShell: document.body?.dataset.storyShell || "",
      storyVariant: document.body?.dataset.storyVariant || "essay",
      storyFamily: document.body?.dataset.storyFamily || "",
      storyNav: document.body?.dataset.storyNav || "generated",
      storyRoute: document.body?.dataset.storyRoute || "",
      heroTitle: document.querySelector(".story-hero__title")?.textContent?.trim() || "",
      playButtonHref: document.querySelector(".story-hero [data-story-callout='play'] .story-button")?.getAttribute("href") || "",
      chapterCount: document.querySelectorAll("[data-story-chapter]").length,
      railCount: railLinks.length,
      mobileCount: mobileLinks.length,
      nativeCount: nativeLinks.length,
      progressBarCount: document.querySelectorAll(".story-progress__bar").length,
      progressValueCount: Array.from(document.querySelectorAll(".story-progress__value")).filter((node) => {
        return (node.textContent || "").trim().length > 0;
      }).length,
      progressPositionCount: Array.from(document.querySelectorAll(".story-rail__position, .story-mobile-bar__position, .story-mobile-sheet__position")).filter((node) => {
        return (node.textContent || "").trim().length > 0;
      }).length,
      allAnchorLinks: railLinks.concat(mobileLinks).every((link) => {
        const href = link.getAttribute("href") || "";
        return href.startsWith("#");
      }),
      nativeAnchorLinks: nativeLinks.every((link) => {
        const href = link.getAttribute("href") || "";
        return href.startsWith("#");
      }),
    };
  }, nativeSelector);

  assert(shellState.storyShell === "engineering-sandbox", `${label} did not opt into the engineering sandbox shell`);
  assert(shellState.storyVariant === expectedVariant, `${label} did not expose the expected story variant`);
  if (expectedFamily) {
    assert(shellState.storyFamily === expectedFamily, `${label} did not expose the expected story family`);
  } else {
    assert(shellState.storyFamily.length > 0, `${label} did not expose a story family`);
  }
  assert(shellState.storyNav === navMode, `${label} did not expose the expected story nav mode`);
  if (expectedRoute) {
    assert(shellState.storyRoute === expectedRoute, `${label} did not expose the expected story route`);
  }
  assert(shellState.heroTitle.length > 0, `${label} did not render the engineering sandbox hero`);
  assert(shellState.playButtonHref.startsWith("#"), `${label} did not expose a local play-first action`);
  if (minimumChapters > 0) {
    assert(shellState.chapterCount >= minimumChapters, `${label} exposed only ${shellState.chapterCount} chapter markers`);
  }
  if (navMode === "generated") {
    assert(
      shellState.railCount >= minimumChapters || shellState.mobileCount >= minimumChapters,
      `${label} did not render generated chapter navigation`,
    );
    assert(shellState.progressBarCount > 0, `${label} did not render the story progress bar`);
    assert(shellState.progressValueCount > 0, `${label} did not render the story progress label`);
    assert(shellState.progressPositionCount > 0, `${label} did not render the chapter position label`);
    assert(shellState.allAnchorLinks, `${label} exposed a non-local generated chapter link`);
    return;
  }

  assert(shellState.railCount === 0, `${label} unexpectedly rendered the generated desktop rail`);
  assert(shellState.mobileCount === 0, `${label} unexpectedly rendered the generated mobile bar`);

  if (navMode === "native") {
    assert(shellState.nativeCount >= minimumNativeLinks, `${label} exposed only ${shellState.nativeCount} native navigation links`);
    if (requireNativeAnchors) {
      assert(shellState.nativeAnchorLinks, `${label} exposed a non-local native chapter link`);
    }
    return;
  }

  if (!allowNativeLinksInNoNav) {
    assert(shellState.nativeCount === 0, `${label} unexpectedly exposed native navigation links in no-nav mode`);
  }
}

async function assertEngineeringSandboxLayout(context, relativePath, label, options = {}) {
  const {
    navMode = "generated",
    readySelector = ".story-hero",
    controlSelector = null,
    containerSelector = null,
  } = options;

  const page = await context.newPage();
  await page.setViewportSize({ width: 1440, height: 1600 });
  await assertRoute(page, relativePath, "#reference-footer");
  await page.waitForSelector(readySelector, { timeout: 30000 });

  if (navMode === "generated") {
    await page.waitForSelector(".story-rail__nav a", { timeout: 15000 });
    const layoutState = await page.evaluate(() => {
      const hero = document.querySelector(".story-hero");
      const firstChapter = document.querySelector("[data-story-chapter]");
      const rail = document.querySelector(".story-rail");
      const progress = document.querySelector(".story-rail .story-progress");
      const heroRect = hero?.getBoundingClientRect();
      const chapterRect = firstChapter?.getBoundingClientRect();
      const railRect = rail?.getBoundingClientRect();
      return {
        heroAboveFirstChapter: Boolean(heroRect && chapterRect && heroRect.top <= chapterRect.top),
        railVisible: Boolean(railRect && railRect.width > 0),
        railProgressVisible: Boolean(progress && progress.getBoundingClientRect().width > 0),
        railRight: railRect?.right || 0,
        chapterLeft: chapterRect?.left || 0,
        progressValue: document.querySelector(".story-rail .story-progress__value")?.textContent?.trim() || "",
      };
    });
    assert(layoutState.heroAboveFirstChapter, `${label} did not render the hero before the first chapter`);
    assert(layoutState.railVisible, `${label} did not expose the desktop rail at 1440px`);
    assert(layoutState.railProgressVisible, `${label} did not expose the desktop story progress bar`);
    assert(layoutState.progressValue.length > 0, `${label} did not expose the desktop story progress label`);
    assert(
      layoutState.railRight <= layoutState.chapterLeft - 12,
      `${label} desktop rail overlapped the story column at 1440px`,
    );
    const initialDesktopProgress = Number.parseInt(layoutState.progressValue, 10) || 0;
    await page.evaluate(() => {
      window.scrollTo(0, Math.max(document.documentElement.scrollHeight - window.innerHeight - 200, 0));
    });
    await page.waitForFunction((previousProgress) => {
      const currentValue = document.querySelector(".story-rail .story-progress__value")?.textContent?.trim() || "";
      return (Number.parseInt(currentValue, 10) || 0) > previousProgress;
    }, initialDesktopProgress, { timeout: 5000 });
    const desktopScrolledState = await page.evaluate(() => {
      return {
        progressValue: document.querySelector(".story-rail .story-progress__value")?.textContent?.trim() || "",
      };
    });
    assert((Number.parseInt(desktopScrolledState.progressValue, 10) || 0) > initialDesktopProgress, `${label} desktop story progress did not respond to scrolling`);

    const mobilePage = await context.newPage();
    await mobilePage.setViewportSize({ width: 390, height: 844 });
    await assertRoute(mobilePage, relativePath, "#reference-footer");
    await mobilePage.waitForSelector(readySelector, { timeout: 30000 });
    await mobilePage.waitForSelector(".story-mobile-bar__nav a", { timeout: 15000 });

    const mobileState = await mobilePage.evaluate(() => {
      const mobileBar = document.querySelector(".story-mobile-bar");
      const activeLink = document.querySelector(".story-mobile-bar__link.is-active");
      const toggle = document.querySelector(".story-mobile-bar__toggle");
      const article = document.querySelector(".article");
      const barRect = mobileBar?.getBoundingClientRect();
      const linkRect = activeLink?.getBoundingClientRect();
      const articleRect = article?.getBoundingClientRect();
      return {
        mobileBarVisible: Boolean(barRect && barRect.height > 0),
        placementValid: document.body.dataset.storyMobileNavPlacement !== "after-hero" || Boolean(
          barRect &&
          articleRect &&
          barRect.top < articleRect.top &&
          (mobileBar.compareDocumentPosition(article) & Node.DOCUMENT_POSITION_FOLLOWING)
        ),
        currentLabel: document.querySelector(".story-mobile-bar__current")?.textContent?.trim() || "",
        progressValue: document.querySelector(".story-mobile-bar .story-progress__value")?.textContent?.trim() || "",
        progressVisible: Boolean(document.querySelector(".story-mobile-bar .story-progress")?.getBoundingClientRect().width > 0),
        positionLabel: document.querySelector(".story-mobile-bar__position")?.textContent?.trim() || "",
        toggleVisible: Boolean(toggle && toggle.getBoundingClientRect().width > 0),
        activeLinkVisible: Boolean(
          barRect &&
          linkRect &&
          linkRect.left >= barRect.left - 1 &&
          linkRect.right <= barRect.right + 1
        ),
      };
    });
    assert(mobileState.mobileBarVisible, `${label} did not expose the mobile chapter bar at 390px`);
    assert(mobileState.placementValid, `${label} placed the route-specific mobile chapter bar after the article`);
    assert(mobileState.currentLabel.length > 0, `${label} did not expose the active mobile chapter label`);
    assert(mobileState.progressVisible, `${label} did not expose the mobile story progress bar`);
    assert(mobileState.progressValue.length > 0, `${label} did not expose the mobile story progress label`);
    assert(mobileState.positionLabel.length > 0, `${label} did not expose the mobile chapter position label`);
    assert(mobileState.toggleVisible, `${label} did not expose the mobile chapter tray toggle`);
    assert(mobileState.activeLinkVisible, `${label} did not keep the active mobile chapter chip in view`);

    await mobilePage.locator(".story-mobile-bar__toggle").click();
    await mobilePage.waitForFunction(() => document.querySelector(".story-mobile-sheet")?.open, null, { timeout: 5000 });
    const sheetState = await mobilePage.evaluate(() => {
      const sheet = document.querySelector(".story-mobile-sheet");
      const panel = document.querySelector(".story-mobile-sheet__panel");
      return {
        isDialog: sheet?.tagName === "DIALOG",
        sheetVisible: Boolean(sheet?.open && panel && panel.getBoundingClientRect().height > 0),
        sheetLinkCount: document.querySelectorAll(".story-mobile-sheet__nav a").length,
        sheetCurrent: document.querySelector(".story-mobile-sheet__current")?.textContent?.trim() || "",
        sheetProgress: document.querySelector(".story-mobile-sheet .story-progress__value")?.textContent?.trim() || "",
        sheetPosition: document.querySelector(".story-mobile-sheet__position")?.textContent?.trim() || "",
      };
    });
    assert(sheetState.isDialog, `${label} mobile chapter tray is not a native dialog`);
    assert(sheetState.sheetVisible, `${label} did not open the mobile chapter tray`);
    assert(sheetState.sheetLinkCount > 0, `${label} did not populate the mobile chapter tray`);
    assert(sheetState.sheetCurrent.length > 0, `${label} did not mirror the current chapter into the mobile tray`);
    assert(sheetState.sheetProgress.length > 0, `${label} did not mirror story progress into the mobile tray`);
    assert(sheetState.sheetPosition.length > 0, `${label} did not mirror chapter position into the mobile tray`);

    await mobilePage.keyboard.press("Escape");
    await mobilePage.waitForFunction(() => !document.querySelector(".story-mobile-sheet")?.open, null, { timeout: 5000 });
    const focusRestored = await mobilePage.evaluate(() => document.activeElement?.classList.contains("story-mobile-bar__toggle"));
    assert(focusRestored, `${label} did not restore focus after closing the mobile chapter tray`);

    await mobilePage.locator(".story-mobile-bar__toggle").click();
    await mobilePage.waitForFunction(() => document.querySelector(".story-mobile-sheet")?.open, null, { timeout: 5000 });
    const chapterLink = mobilePage.locator(".story-mobile-sheet__link").nth(1);
    const chapterTarget = await chapterLink.getAttribute("data-story-target");
    assert(chapterTarget, `${label} mobile chapter link did not expose a target`);
    await chapterLink.click();
    await mobilePage.waitForFunction((targetId) => (
      !document.querySelector(".story-mobile-sheet")?.open &&
      window.location.hash === `#${targetId}`
    ), chapterTarget, { timeout: 15000 });
    if (await mobilePage.evaluate(() => document.body.dataset.storyMobileNavPlacement === "after-hero")) {
      await mobilePage.waitForFunction((targetId) => document.activeElement === document.getElementById(targetId), chapterTarget, { timeout: 15000 });
      await mobilePage.waitForFunction((targetId) => {
        const rect = document.getElementById(targetId)?.getBoundingClientRect();
        return Boolean(rect && rect.bottom > 0 && rect.top < window.innerHeight);
      }, chapterTarget, { timeout: 15000 });
    }

    await mobilePage.close();
  } else {
    const layoutState = await page.evaluate(() => {
      const hero = document.querySelector(".story-hero");
      const firstChapter = document.querySelector("[data-story-chapter]");
      const heroRect = hero?.getBoundingClientRect();
      const chapterRect = firstChapter?.getBoundingClientRect();
      return {
        heroAboveFirstChapter: Boolean(heroRect && chapterRect && heroRect.top <= chapterRect.top),
        generatedRailCount: document.querySelectorAll(".story-rail, .story-mobile-bar").length,
      };
    });
    assert(layoutState.generatedRailCount === 0, `${label} rendered generated navigation in native mode`);
  }

  if (navMode !== "generated" && controlSelector) {
    const controlState = await page.evaluate(({ controlSelector, containerSelector }) => {
      const hero = document.querySelector(".story-hero");
      const control = document.querySelector(controlSelector);
      const footer = document.querySelector("#reference-footer");
      const container = containerSelector ? document.querySelector(containerSelector) : null;
      const heroRect = hero?.getBoundingClientRect();
      const controlRect = control?.getBoundingClientRect();
      const footerRect = footer?.getBoundingClientRect();
      const containerRect = container?.getBoundingClientRect();

      return {
        heroBeforeControl: Boolean(heroRect && controlRect && heroRect.top <= controlRect.top),
        footerWithinContainer: !footerRect || !containerRect ||
          (footerRect.left >= containerRect.left - 2 && footerRect.right <= containerRect.right + 2),
      };
    }, { controlSelector, containerSelector });

    assert(controlState.heroBeforeControl, `${label} did not render the hero before the first primary control cluster`);
    assert(controlState.footerWithinContainer, `${label} footer exceeded the route content container`);
  }

  await assertViewportUsable(page, label);
  await page.close();
}

function createRuntimeMonitor(page, options = {}) {
  const { rejectOffOriginRequests = false, networkPolicy = null } = options;
  if (networkPolicy) {
    assert(networkPolicy.mode === "local-only" || networkPolicy.mode === "deferred-remote", `Invalid network policy mode ${networkPolicy.mode}`);
  }
  const rejectInitialOffOriginRequests = rejectOffOriginRequests || Boolean(networkPolicy);
  const issues = [];

  page.on("pageerror", (error) => {
    issues.push(`pageerror: ${error.message}`);
  });

  page.on("request", (request) => {
    const requestUrl = request.url();
    const isLocalBlob = requestUrl.startsWith(`blob:${baseOrigin}/`);
    if (rejectInitialOffOriginRequests && !requestUrl.startsWith(baseUrl) && !isLocalBlob) {
      issues.push(`off-origin request: ${requestUrl}`);
    }
  });

  page.on("requestfailed", (request) => {
    if (!request.url().startsWith(baseUrl)) {
      return;
    }

    const failure = request.failure();
    if (failure?.errorText === "net::ERR_ABORTED" && request.resourceType() === "document") {
      return;
    }
    issues.push(`requestfailed: ${request.url()} ${failure?.errorText || ""}`.trim());
  });

  page.on("response", (response) => {
    if (!response.url().startsWith(baseUrl) || response.status() < 400) {
      return;
    }

    issues.push(`response ${response.status()}: ${response.url()}`);
  });

  return function assertRuntimeClean(label) {
    assert(issues.length === 0, `${label} had runtime issues:\n${issues.join("\n")}`);
  };
}

async function assertManifestRouteCompatibility(context, route, options = {}) {
  const { enforceViewportFit = true } = options;
  const relativePath = `${route.slug}/`;
  const viewports = [
    { name: "desktop", width: 1400, height: 1000 },
    { name: "mobile", width: 390, height: 844 },
  ];

  for (const viewport of viewports) {
    const page = await context.newPage();
    const assertRuntimeClean = createRuntimeMonitor(page, { rejectOffOriginRequests: true });
    await page.addInitScript(() => {
      document.addEventListener("focusin", (event) => {
        if (event.target?.closest?.("[data-route-continuation]")) {
          window.__routeContinuationAutoFocused = true;
        }
      }, true);
    });
    try {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await assertRoute(page, relativePath, "#reference-footer");
      await page.waitForFunction(() => {
        const main = document.querySelector("main[data-runtime-main]");
        return !main || main.getAttribute("aria-busy") !== "true";
      }, null, { timeout: 30000 });
      await assertMainLandmark(page, route, `${route.slug} ${viewport.name} baseline`);
      await assertRouteContinuation(page, route, `${route.slug} ${viewport.name} baseline`);
      if (enforceViewportFit) {
        await assertViewportUsable(page, `${route.slug} ${viewport.name} baseline`);
      }
      assertRuntimeClean(`${route.slug} ${viewport.name} baseline`);
      console.log(`OK ${route.slug} ${viewport.name} baseline`);
    } finally {
      await page.close();
    }
  }
}

const experienceViewports = [
  { name: "desktop", width: 1400, height: 1000 },
  { name: "mobile", width: 390, height: 844 },
  { name: "narrow", width: 320, height: 844 },
];
const experienceThemes = ["light", "dark"];

async function createThemeContext(browser, options) {
  const { theme, stored, systemTheme = theme, viewport = experienceViewports[0] } = options;
  const context = await browser.newContext({
    acceptDownloads: true,
    colorScheme: systemTheme,
    viewport: { width: viewport.width, height: viewport.height },
  });
  await context.addInitScript(({ expectedTheme, useStoredTheme }) => {
    window.__smokeThemeAssignments = [];
    const originalSetAttribute = Element.prototype.setAttribute;
    Element.prototype.setAttribute = function smokeSetAttribute(name, value) {
      if (this === document.documentElement && name === "saved-theme") {
        window.__smokeThemeAssignments.push({
          theme: String(value),
          readyState: document.readyState,
        });
      }
      return originalSetAttribute.call(this, name, value);
    };
    if (useStoredTheme) {
      window.localStorage.setItem("theme", expectedTheme);
    } else {
      window.localStorage.removeItem("theme");
    }
    document.addEventListener("focusin", (event) => {
      if (event.target?.closest?.("[data-route-continuation]")) {
        window.__routeContinuationAutoFocused = true;
      }
    }, true);
  }, { expectedTheme: theme, useStoredTheme: stored });
  return context;
}

async function waitForDocumentLayout(page) {
  await page.evaluate(async () => {
    await document.fonts?.ready;
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
}

async function waitForManifestRouteReady(page, route) {
  await page.waitForFunction((runtimeSelector) => {
    const runtime = document.querySelector(runtimeSelector);
    return document.body?.dataset.storyManifest === "ready" &&
      runtime &&
      runtime.getAttribute("aria-busy") !== "true";
  }, route.experience.runtimeSurface, { timeout: 30000 });
  await waitForDocumentLayout(page);
}

async function assertDocumentTheme(page, expectedTheme, label) {
  const state = await page.evaluate(() => ({
    applied: document.documentElement.getAttribute("saved-theme") || "",
    stored: window.localStorage.getItem("theme"),
    assignments: window.__smokeThemeAssignments || [],
  }));
  assert(state.applied === expectedTheme, `${label} applied ${state.applied || "no theme"} instead of ${expectedTheme}`);
  assert(state.assignments.length > 0, `${label} did not synchronously assign html[saved-theme]`);
  assert(state.assignments[0].theme === expectedTheme, `${label} first assigned ${state.assignments[0].theme} instead of ${expectedTheme}`);
  assert(state.assignments[0].readyState === "loading", `${label} assigned the theme after parsing (${state.assignments[0].readyState})`);
  return state;
}

async function readThemeTokens(page, label, routeSlug = "", expectedRuntimeTheme = "") {
  const authoredRootSelector = routeManifestBySlug.get(routeSlug)?.experience.themeRoot || authoredThemeRootBySlug.get(routeSlug) || "";
  const tokens = await page.evaluate(({ inspectAbletonSynth, inspectCompanion, rootSelector }) => {
    const style = getComputedStyle(document.documentElement);
    const authoredRoot = rootSelector ? document.querySelector(rootSelector) : null;
    const companionCard = inspectCompanion ? document.querySelector(".story-companion-card") : null;
    const readColors = (element) => {
      if (!element) {
        return null;
      }
      const elementStyle = getComputedStyle(element);
      return {
        background: elementStyle.backgroundColor,
        foreground: elementStyle.color,
      };
    };
    return {
      background: style.getPropertyValue("--paper").trim(),
      foreground: style.getPropertyValue("--ink").trim(),
      interactive: style.getPropertyValue("--topbar-hover").trim(),
      runtimeTheme: document.documentElement.dataset.theme || "",
      authored: readColors(authoredRoot),
      authoredRuntimeTokens: inspectAbletonSynth && authoredRoot ? {
        background: getComputedStyle(authoredRoot).getPropertyValue("--color-background").trim(),
        foreground: getComputedStyle(authoredRoot).getPropertyValue("--color-foreground").trim(),
        shade: getComputedStyle(authoredRoot).getPropertyValue("--color-shade").trim(),
        caption: getComputedStyle(authoredRoot).getPropertyValue("--color-caption").trim(),
        accent: getComputedStyle(authoredRoot).getPropertyValue("--current-theme-color").trim(),
        accentShade: getComputedStyle(authoredRoot).getPropertyValue("--current-theme-color-shade").trim(),
      } : null,
      companion: readColors(companionCard),
    };
  }, {
    inspectAbletonSynth: abletonSynthLessonSlugs.includes(routeSlug),
    inspectCompanion: themedEngineeringLongformSlugs.has(routeSlug),
    rootSelector: authoredRootSelector,
  });
  assert(tokens.background && tokens.foreground && tokens.interactive, `${label} did not expose shared theme tokens`);
  assert(contrastRatio(tokens.foreground, tokens.background) >= 4.5, `${label} shared foreground contrast fell below 4.5:1`);
  assert(contrastRatio(tokens.interactive, tokens.background) >= 3, `${label} shared interactive contrast fell below 3:1`);
  if (authoredRootSelector) {
    assert(tokens.authored, `${label} did not expose the declared authored root`);
    assert(contrastRatio(tokens.authored.foreground, tokens.authored.background) >= 4.5, `${label} authored foreground contrast fell below 4.5:1`);
    if (tokens.companion) {
      assert(contrastRatio(tokens.companion.foreground, tokens.companion.background) >= 4.5, `${label} companion foreground contrast fell below 4.5:1`);
    }
  }
  if (samwhoRuntimeThemeSlugs.has(routeSlug)) {
    assert(tokens.runtimeTheme === expectedRuntimeTheme, `${label} did not map saved-theme into the SamWho runtime hook`);
  }
  return tokens;
}

function assertThemePair(light, dark, label) {
  assert(light.background !== dark.background, `${label} light and dark shell backgrounds were identical`);
  assert(light.foreground !== dark.foreground, `${label} light and dark shell foregrounds were identical`);
  assert(light.interactive !== dark.interactive, `${label} light and dark interactive chrome was identical`);
  if (light.authored || dark.authored) {
    assert(light.authored?.background !== dark.authored?.background, `${label} light and dark authored backgrounds were identical`);
    assert(light.authored?.foreground !== dark.authored?.foreground, `${label} light and dark authored foregrounds were identical`);
  }
  if (light.companion || dark.companion) {
    assert(light.companion?.background !== dark.companion?.background, `${label} light and dark companion backgrounds were identical`);
    assert(light.companion?.foreground !== dark.companion?.foreground, `${label} light and dark companion foregrounds were identical`);
  }
  if (light.authoredRuntimeTokens || dark.authoredRuntimeTokens) {
    const lightTokens = light.authoredRuntimeTokens;
    const darkTokens = dark.authoredRuntimeTokens;
    assert(lightTokens && darkTokens, `${label} did not expose both authored runtime token states`);
    assert(Object.values(lightTokens).every(Boolean), `${label} light authored runtime tokens were incomplete`);
    assert(Object.values(darkTokens).every(Boolean), `${label} dark authored runtime tokens were incomplete`);
    for (const key of ["background", "foreground", "shade", "caption", "accentShade"]) {
      assert(lightTokens[key] !== darkTokens[key], `${label} light and dark authored runtime ${key} tokens were identical`);
    }
    const stableAccent = lightTokens.accent === darkTokens.accent;
    const themedMonoAccent = lightTokens.accent === lightTokens.foreground && darkTokens.accent === darkTokens.foreground;
    assert(stableAccent || themedMonoAccent, `${label} authored runtime accent lost its route identity`);
  }
}

async function assertMainLandmark(page, route, label) {
  const state = await page.evaluate(() => {
    const mains = Array.from(document.querySelectorAll("main"));
    const main = mains[0];
    const style = main ? getComputedStyle(main) : null;
    return {
      count: mains.length,
      visible: Boolean(main && !main.hidden && main.getAttribute("aria-hidden") !== "true" && !main.hasAttribute("inert") && style?.display !== "none" && style?.visibility !== "hidden"),
      meaningful: Boolean(main && (
        (main.textContent || "").trim() ||
        main.getAttribute("aria-label") ||
        main.getAttribute("aria-labelledby") ||
        main.querySelector("iframe[title], canvas, svg, [role='application']")
      )),
      topBarAtlas: document.querySelector(".top-bar__back")?.href || "",
      topBarDocs: document.querySelector(".top-bar__docs")?.href || "",
    };
  });
  assert(state.count === 1, `${label} expected one main landmark, found ${state.count}`);
  assert(state.visible, `${label} main landmark was hidden`);
  assert(state.meaningful, `${label} main landmark was empty and unnamed`);
  assert(new URL(state.topBarAtlas).pathname === `${mountPath}index.html`, `${label} exposed an unexpected Atlas exit: ${state.topBarAtlas}`);
  assert(new URL(state.topBarDocs).pathname === `${mountPath}docs/${route.slug}/`, `${label} exposed an unexpected Docs exit: ${state.topBarDocs}`);
}

async function assertDocsBaseline(page, route, label) {
  await assertRoute(page, `docs/${route.slug}/`, "[data-parity-list]");
  const state = await page.evaluate((slug) => {
    const mains = Array.from(document.querySelectorAll("main"));
    const atlas = Array.from(document.querySelectorAll("a[href]")).find((link) => {
      const pathname = new URL(link.href).pathname;
      return pathname === "/interactive-explanation/" || pathname === "/interactive-explanation/index.html";
    });
    const routeLink = Array.from(document.querySelectorAll("a[href]")).find((link) => {
      return new URL(link.href).pathname === `/interactive-explanation/${slug}/`;
    });
    return {
      mainCount: mains.length,
      mainVisible: Boolean(mains[0] && getComputedStyle(mains[0]).display !== "none"),
      atlasHref: atlas?.href || "",
      routeHref: routeLink?.href || "",
    };
  }, route.slug);
  assert(state.mainCount === 1 && state.mainVisible, `${label} did not expose one visible main landmark`);
  assert(state.atlasHref && new URL(state.atlasHref).origin === baseOrigin, `${label} did not expose a local Atlas exit`);
  assert(state.routeHref && new URL(state.routeHref).origin === baseOrigin, `${label} did not expose a local Route exit`);
}

async function measureRuntimeSurface(page, route, label) {
  const state = await page.evaluate((runtimeSelector) => {
    const surfaces = Array.from(document.querySelectorAll(runtimeSelector));
    if (surfaces.length !== 1) {
      return { count: surfaces.length };
    }
    const surface = surfaces[0];
    const style = getComputedStyle(surface);
    const rect = surface.getBoundingClientRect();
    const intrinsicElements = [surface, ...surface.querySelectorAll("canvas, iframe, svg, img, video")]
      .filter((element, index, elements) => elements.indexOf(element) === index)
      .filter((element) => element.matches("canvas, iframe, svg, img, video"));
    return {
      count: 1,
      rect: {
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      },
      css: {
        width: style.width,
        height: style.height,
        transform: style.transform,
        touchAction: style.touchAction,
        pointerEvents: style.pointerEvents,
      },
      aspectRatio: rect.height > 0 ? rect.width / rect.height : null,
      intrinsic: intrinsicElements.map((element, index) => {
        const elementRect = element.getBoundingClientRect();
        const tag = element.tagName.toLowerCase();
        return {
          key: `${tag}:${element.id || index}`,
          tag,
          rect: {
            top: elementRect.top,
            right: elementRect.right,
            bottom: elementRect.bottom,
            left: elementRect.left,
            width: elementRect.width,
            height: elementRect.height,
          },
          width: tag === "canvas" ? element.width : (tag === "img" ? element.naturalWidth : (tag === "video" ? element.videoWidth : null)),
          height: tag === "canvas" ? element.height : (tag === "img" ? element.naturalHeight : (tag === "video" ? element.videoHeight : null)),
          viewBox: tag === "svg" ? element.getAttribute("viewBox") : null,
          title: tag === "iframe" ? element.getAttribute("title") : null,
        };
      }),
    };
  }, route.experience.runtimeSurface);
  assert(state.count === 1, `${label} expected one runtime surface for ${route.experience.runtimeSurface}, found ${state.count}`);
  assert(state.rect.width > 0 && state.rect.height > 0, `${label} runtime surface collapsed`);
  assert(state.aspectRatio > 0, `${label} runtime surface lost its aspect ratio`);
  const { count, ...geometry } = state;
  return geometry;
}

function assertRuntimeGeometry(actual, expected, label) {
  const rectKeys = ["top", "right", "bottom", "left", "width", "height"];
  for (const key of rectKeys) {
    assert(Math.abs(actual.rect[key] - expected.rect[key]) <= 1, `${label} runtime ${key} shifted by more than 1 CSS px`);
  }
  assert(actual.css.width === expected.css.width && actual.css.height === expected.css.height, `${label} runtime CSS dimensions changed`);
  assert(actual.css.transform === expected.css.transform, `${label} runtime transform changed`);
  assert(actual.css.touchAction === expected.css.touchAction, `${label} runtime touch ownership changed`);
  assert(actual.css.pointerEvents === expected.css.pointerEvents, `${label} runtime pointer ownership changed`);
  assert(Math.abs(actual.aspectRatio - expected.aspectRatio) <= 0.000001, `${label} runtime aspect ratio changed`);
  assert(actual.intrinsic.length === expected.intrinsic.length, `${label} intrinsic surface count changed`);
  actual.intrinsic.forEach((surface, index) => {
    const baseline = expected.intrinsic[index];
    assert(surface.key === baseline.key && surface.tag === baseline.tag, `${label} intrinsic surface order changed`);
    for (const key of rectKeys) {
      assert(Math.abs(surface.rect[key] - baseline.rect[key]) <= 1, `${label} ${surface.key} ${key} shifted by more than 1 CSS px`);
    }
    assert(surface.width === baseline.width && surface.height === baseline.height, `${label} ${surface.key} backing dimensions changed`);
    assert(surface.viewBox === baseline.viewBox, `${label} ${surface.key} viewBox changed`);
    assert(surface.title === baseline.title, `${label} ${surface.key} title changed`);
  });
}

async function measureRouteGeometry(browser, route, approvedGeometry, enforceGeometry) {
  const context = await createThemeContext(browser, { theme: "light", stored: true });
  const measured = {};
  try {
    for (const viewport of experienceViewports) {
      const label = `${route.slug} ${viewport.name} geometry baseline`;
      const page = await context.newPage();
      const assertRuntimeClean = createRuntimeMonitor(page, { networkPolicy: route.experience.networkPolicy });
      try {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await assertRoute(page, `${route.slug}/`, "#reference-footer");
        await waitForManifestRouteReady(page, route);
        await page.waitForLoadState("networkidle", { timeout: 30000 });
        await assertDocumentTheme(page, "light", label);
        await scrollPrimarySurfaceIntoView(page, label, route.experience.primarySurface);
        measured[viewport.name] = await measureRuntimeSurface(page, route, label);
        if (enforceGeometry) {
          assertRuntimeGeometry(measured[viewport.name], approvedGeometry[viewport.name], label);
        }
        assertRuntimeClean(label);
      } finally {
        await page.close();
      }
    }
  } finally {
    await context.close();
  }
  return measured;
}

async function assertFocusVisible(locator, label) {
  await locator.focus();
  const state = await locator.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      focused: document.activeElement === element,
      indicator: (style.outlineStyle !== "none" && parseFloat(style.outlineWidth) > 0) ||
        (style.boxShadow !== "none" && style.boxShadow !== "") ||
        (style.textDecorationLine || "").includes("underline"),
    };
  });
  assert(state.focused && state.indicator, `${label} did not expose visible keyboard focus`);
}

async function renderedControlCount(locator) {
  return locator.evaluateAll((elements) => elements.filter((element) => {
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return !element.hidden &&
      element.getAttribute("aria-hidden") !== "true" &&
      !element.hasAttribute("inert") &&
      style.display !== "none" &&
      style.visibility !== "hidden" &&
      Number(style.opacity) > 0 &&
      rect.width > 0 &&
      rect.height > 0;
  }).length);
}

async function assertPointerTargets(locator, label) {
  const failures = await locator.evaluateAll((elements) => elements.reduce((issues, element, index) => {
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    if (style.display === "none" || style.visibility === "hidden" || rect.width === 0 || rect.height === 0) {
      return issues;
    }
    if (rect.width >= 24 && rect.height >= 24) {
      return issues;
    }
    const center = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    const peerDistance = elements.reduce((minimum, peer) => {
      if (peer === element) {
        return minimum;
      }
      const peerRect = peer.getBoundingClientRect();
      if (peerRect.width === 0 || peerRect.height === 0) {
        return minimum;
      }
      const peerCenter = { x: peerRect.left + peerRect.width / 2, y: peerRect.top + peerRect.height / 2 };
      return Math.min(minimum, Math.hypot(center.x - peerCenter.x, center.y - peerCenter.y));
    }, Number.POSITIVE_INFINITY);
    if (peerDistance < 24) {
      issues.push(`${index} (${Math.round(rect.width)}x${Math.round(rect.height)}, ${Math.round(peerDistance)}px spacing)`);
    }
    return issues;
  }, []));
  assert(failures.length === 0, `${label} exposed pointer targets below 24 CSS px without spacing: ${failures.join(", ")}`);
}

async function assertFrameTitles(page, label) {
  const titles = await page.locator("iframe").evaluateAll((frames) => frames.map((frame) => (frame.getAttribute("title") || "").trim()));
  assert(titles.every(Boolean), `${label} exposed an iframe without a title`);
  assert(new Set(titles).size === titles.length, `${label} exposed duplicate iframe titles`);
}

function assertGeneratedChapterLinks(state, route, label) {
  assert(state.linksValid, `${label} chapter links did not resolve locally`);
  const expectedChapters = route.shell.chapters;
  if (!Array.isArray(expectedChapters)) {
    assert(state.linkCount >= 1, `${label} did not expose a chapter link`);
    return;
  }
  const expectedTitles = expectedChapters.map((chapter) => chapter.title);
  assert(state.linkCount === expectedTitles.length, `${label} exposed ${state.linkCount} chapter links instead of ${expectedTitles.length}`);
  assert(JSON.stringify(state.titles) === JSON.stringify(expectedTitles), `${label} chapter titles or order did not match the manifest`);
}

async function assertGeneratedNavigation(page, route, viewport, label) {
  if (viewport.name === "desktop") {
    await page.waitForSelector(".story-rail__nav a", { timeout: 15000 });
    const state = await page.evaluate(() => {
      const rail = document.querySelector(".story-rail");
      const mobile = document.querySelector(".story-mobile-bar");
      const firstChapter = document.querySelector("[data-story-chapter]");
      const railRect = rail?.getBoundingClientRect();
      const mobileRect = mobile?.getBoundingClientRect();
      const chapterRect = firstChapter?.getBoundingClientRect();
      const links = Array.from(document.querySelectorAll(".story-rail__nav a"));
      return {
        railVisible: Boolean(railRect && railRect.width > 0 && railRect.height > 0),
        mobileHidden: !mobileRect || mobileRect.width === 0 || mobileRect.height === 0,
        noOverlap: Boolean(railRect && chapterRect && railRect.right <= chapterRect.left - 12),
        linkCount: links.length,
        titles: links.map((link) => link.dataset.storyFullTitle || ""),
        linksValid: links.every((link) => {
          const url = new URL(link.href);
          return url.origin === window.location.origin && url.pathname === window.location.pathname && url.hash.length > 1 && document.getElementById(decodeURIComponent(url.hash.slice(1)));
        }),
      };
    });
    assert(state.railVisible && state.mobileHidden, `${label} did not fit generated desktop navigation`);
    assert(state.noOverlap, `${label} generated desktop rail overlapped the first chapter`);
    assertGeneratedChapterLinks(state, route, `${label} generated desktop`);
    await assertFocusVisible(page.locator(".story-rail__nav a").first(), `${label} first generated chapter link`);
    await assertPointerTargets(page.locator(".story-rail__nav a"), `${label} generated chapter links`);
    return;
  }

  await page.waitForSelector(".story-mobile-bar__toggle", { state: "visible", timeout: 15000 });
  const state = await page.evaluate(() => {
    const bar = document.querySelector(".story-mobile-bar");
    const rail = document.querySelector(".story-rail");
    const toggle = document.querySelector(".story-mobile-bar__toggle");
    const barRect = bar?.getBoundingClientRect();
    const railRect = rail?.getBoundingClientRect();
    const toggleRect = toggle?.getBoundingClientRect();
    const links = Array.from(document.querySelectorAll(".story-mobile-bar__nav a"));
    return {
      barVisible: Boolean(barRect && barRect.width > 0 && barRect.height > 0),
      railHidden: !railRect || railRect.width === 0 || railRect.height === 0,
      barFitted: Boolean(barRect && barRect.left >= -1 && barRect.right <= window.innerWidth + 1),
      toggleFitted: Boolean(toggleRect && toggleRect.left >= -1 && toggleRect.right <= window.innerWidth + 1),
      linkCount: links.length,
      titles: links.map((link) => link.dataset.storyFullTitle || ""),
      linksValid: links.every((link) => {
        const url = new URL(link.href);
        return url.origin === window.location.origin && url.pathname === window.location.pathname && url.hash.length > 1 && document.getElementById(decodeURIComponent(url.hash.slice(1)));
      }),
    };
  });
  assert(state.barVisible && state.railHidden && state.barFitted && state.toggleFitted, `${label} did not fit generated mobile navigation`);
  assertGeneratedChapterLinks(state, route, `${label} generated mobile`);
  const toggle = page.locator(".story-mobile-bar__toggle");
  await assertFocusVisible(toggle, `${label} mobile chapter tray toggle`);
  await assertPointerTargets(toggle, `${label} mobile chapter tray toggle`);
  await toggle.click();
  await page.waitForFunction(() => document.querySelector(".story-mobile-sheet")?.open, null, { timeout: 5000 });
  const dialogState = await page.evaluate(() => {
    const dialog = document.querySelector(".story-mobile-sheet");
    const links = Array.from(document.querySelectorAll(".story-mobile-sheet__nav a"));
    return {
      tagName: dialog?.tagName,
      labelled: Boolean(dialog?.getAttribute("aria-labelledby") && document.getElementById(dialog.getAttribute("aria-labelledby"))),
      linkCount: links.length,
      titles: links.map((link) => link.dataset.storyFullTitle || ""),
      linksValid: links.every((link) => {
        const url = new URL(link.href);
        return url.origin === window.location.origin && url.pathname === window.location.pathname && url.hash.length > 1 && document.getElementById(decodeURIComponent(url.hash.slice(1)));
      }),
    };
  });
  assert(dialogState.tagName === "DIALOG" && dialogState.labelled, `${label} mobile chapter tray was not a labelled dialog`);
  assertGeneratedChapterLinks(dialogState, route, `${label} mobile chapter tray`);
  await page.keyboard.press("Escape");
  await page.waitForFunction(() => !document.querySelector(".story-mobile-sheet")?.open, null, { timeout: 5000 });
  assert(await page.evaluate(() => document.activeElement?.classList.contains("story-mobile-bar__toggle")), `${label} did not restore focus after Escape`);
}

async function assertNativeNavigation(page, route, label) {
  const contract = route.shell.nativeControl;
  const controls = page.locator(contract.selector);
  await page.waitForFunction(({ selector, minimum }) => document.querySelectorAll(selector).length >= minimum, {
    selector: contract.selector,
    minimum: contract.minimum,
  }, { timeout: 15000 });
  const state = await controls.evaluateAll((elements, expected) => {
    function nameState(element) {
      const labelledBy = element.getAttribute("aria-labelledby");
      const labelledText = labelledBy
        ? labelledBy.split(/\s+/).map((id) => document.getElementById(id)?.textContent || "").join(" ").trim()
        : "";
      const accessibleName = (
        element.getAttribute("aria-label") ||
        labelledText ||
        element.getAttribute("alt") ||
        element.getAttribute("title") ||
        element.textContent ||
        ""
      ).replace(/\s+/g, " ").trim();
      const authoredName = accessibleName || element.getAttribute("data-balloon") || element.getAttribute("chapter") || "";
      const keyboardOperable = element.matches("a[href], button, input, select, textarea") || element.tabIndex >= 0 || ["button", "link", "checkbox", "radio", "tab"].includes(element.getAttribute("role"));
      return { accessibleName, authoredName, keyboardOperable };
    }
    return {
      count: elements.length,
      names: elements.map(nameState),
      owners: elements.map((element) => typeof element.onclick === "function" || element.matches("a[href], button, input, select, textarea, iframe") || Boolean(element.getAttribute("role"))),
      linksValid: expected.kind !== "link" || elements.every((element) => {
        const href = element.getAttribute("href") || "";
        const url = new URL(element.href);
        if (url.origin !== window.location.origin || !url.pathname.startsWith("/interactive-explanation/")) {
          return false;
        }
        if (!expected.fragmentOnly) {
          return true;
        }
        return href.startsWith("#") && href.length > 1 && Boolean(document.getElementById(href.slice(1)));
      }),
      generatedCount: document.querySelectorAll(".story-rail, .story-mobile-bar, .story-mobile-sheet").length,
    };
  }, contract);
  assert(state.count >= contract.minimum, `${label} exposed only ${state.count} native controls`);
  const visibleCount = await renderedControlCount(controls);
  assert(visibleCount >= contract.minimum, `${label} kept only ${visibleCount} native controls visible`);
  assert(state.generatedCount === 0, `${label} rendered generated navigation in native mode`);
  assert(state.linksValid, `${label} exposed a native link outside the local declared contract`);
  assert(state.owners.every(Boolean), `${label} exposed a native control without state or link ownership`);
  assert(state.names.every((name) => name.authoredName), `${label} exposed an unnamed native control`);
  assert(state.names.every((name) => !name.keyboardOperable || name.accessibleName), `${label} exposed an unnamed keyboard-operable native control`);
  await assertPointerTargets(controls, `${label} native controls`);
  if (contract.kind === "link") {
    await assertFocusVisible(controls.first(), `${label} first native link`);
  }
  if (contract.peerSelectors) {
    const peers = page.locator(contract.peerSelectors.join(", "));
    assert(await peers.count() >= contract.peerSelectors.length, `${label} did not expose declared peer controls`);
    assert(await renderedControlCount(peers) >= contract.peerSelectors.length, `${label} hid declared peer controls`);
    await assertPointerTargets(peers, `${label} native peer controls`);
  }
  if (contract.childSelector) {
    const frameHandle = await controls.first().elementHandle();
    const frame = await frameHandle?.contentFrame();
    assert(frame, `${label} native iframe did not expose its child document`);
    await frame.waitForSelector(contract.childSelector, { timeout: 15000 });
    const childControls = frame.locator(contract.childSelector);
    const childNames = await childControls.evaluateAll((elements) => elements.map((element) => (
      element.getAttribute("aria-label") || element.getAttribute("title") || element.textContent || ""
    ).replace(/\s+/g, " ").trim()));
    assert(childNames.length > 0 && childNames.every(Boolean), `${label} native iframe controls were unnamed`);
    assert(await renderedControlCount(childControls) === childNames.length, `${label} hid native iframe controls`);
  }
}

async function prepareNativeNavigation(page, route) {
  const contract = route.shell.nativeControl;
  if (!contract.activationSelector) {
    return;
  }
  const activation = page.locator(contract.activationSelector);
  await activation.waitFor({ state: "visible", timeout: 30000 });
  await activation.click();
  await page.waitForFunction((readySelector) => {
    const ready = document.querySelector(readySelector);
    if (!ready) {
      return false;
    }
    const style = getComputedStyle(ready);
    const rect = ready.getBoundingClientRect();
    return style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity) > 0 && rect.width > 0 && rect.height > 0;
  }, contract.readySelector, { timeout: 5000 });
}

async function assertManifestNavigation(page, route, viewport, label) {
  const bodyState = await page.evaluate(() => ({
    shell: document.body?.dataset.storyShell || "",
    route: document.body?.dataset.storyRoute || "",
    family: document.body?.dataset.storyFamily || "",
    variant: document.body?.dataset.storyVariant || "",
    navigation: document.body?.dataset.storyNav || "",
  }));
  assert(bodyState.shell === "engineering-sandbox", `${label} did not expose the Engineering Sandbox shell`);
  assert(bodyState.route === route.slug && bodyState.family === route.shell.family && bodyState.variant === route.shell.variant, `${label} shell metadata drifted from the manifest`);
  assert(bodyState.navigation === route.shell.navigation, `${label} navigation mode drifted from the manifest`);
  if (route.shell.navigation === "generated") {
    await assertGeneratedNavigation(page, route, viewport, label);
    return;
  }
  if (route.shell.navigation === "native") {
    await prepareNativeNavigation(page, route);
    await assertNativeNavigation(page, route, label);
    return;
  }
  const state = await page.evaluate(({ primarySelector, runtimeSelector }) => {
    function visibleArea(element) {
      if (!element) {
        return 0;
      }
      const rect = element.getBoundingClientRect();
      const width = Math.max(0, Math.min(rect.right, window.innerWidth) - Math.max(rect.left, 0));
      const height = Math.max(0, Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0));
      return width * height;
    }
    const shellChrome = [".top-bar", ".story-rail", ".story-mobile-bar", ".story-mobile-sheet", "#reference-footer"]
      .flatMap((selector) => Array.from(document.querySelectorAll(selector)))
      .reduce((total, element) => total + visibleArea(element), 0);
    return {
      generatedCount: document.querySelectorAll(".story-rail, .story-mobile-bar, .story-mobile-sheet").length,
      primaryArea: visibleArea(document.querySelector(primarySelector)),
      runtimeArea: visibleArea(document.querySelector(runtimeSelector)),
      shellChrome,
    };
  }, {
    primarySelector: route.experience.primarySurface,
    runtimeSelector: route.experience.runtimeSurface,
  });
  assert(state.generatedCount === 0, `${label} rendered generated navigation in none mode`);
  assert(state.runtimeArea > 0 && state.primaryArea > 0, `${label} did not keep its declared runtime and primary surfaces visible`);
  assert(
    state.primaryArea > state.shellChrome,
    `${label} did not keep its declared primary surface dominant over shared shell chrome`,
  );
}

async function assertReadOnlyProbe(page, route, label) {
  assert(route.experience.interactionProbe === "read-only", `${label} declared an unsupported interaction probe ${route.experience.interactionProbe}`);
  const state = await page.evaluate(({ primarySelector, runtimeSelector }) => {
    const primary = document.querySelector(primarySelector);
    const runtime = document.querySelector(runtimeSelector);
    return {
      primaryCount: document.querySelectorAll(primarySelector).length,
      runtimeCount: document.querySelectorAll(runtimeSelector).length,
      ready: Boolean(runtime && runtime.getAttribute("aria-busy") !== "true"),
      readable: Boolean(runtime && (
        (runtime.textContent || "").trim() ||
        runtime.getAttribute("aria-label") ||
        runtime.getAttribute("aria-labelledby") ||
        runtime.querySelector("canvas, iframe[title], svg, [role='application']")
      )),
      sameSurface: primary === runtime,
    };
  }, {
    primarySelector: route.experience.primarySurface,
    runtimeSelector: route.experience.runtimeSurface,
  });
  assert(state.primaryCount === 1 && state.runtimeCount === 1, `${label} read-only probe did not resolve unique primary/runtime surfaces`);
  assert(state.ready && state.readable, `${label} read-only probe did not expose a ready readable state`);
  return state;
}

async function assertRouteAccessibility(page, label) {
  await assertFrameTitles(page, label);
  const shellControls = page.locator(".top-bar a[href], .top-bar button, [data-route-continuation-link]");
  const names = await shellControls.evaluateAll((elements) => elements.map((element) => (
    element.getAttribute("aria-label") || element.getAttribute("title") || element.textContent || ""
  ).replace(/\s+/g, " ").trim()));
  assert(names.every(Boolean), `${label} exposed unnamed shell controls`);
  await assertPointerTargets(shellControls, `${label} shell controls`);
}

async function readAbletonGridPaint(page, route) {
  if (!abletonMusicWidgetSlugs.has(route.slug)) {
    return null;
  }
  await page.waitForFunction(() => document.querySelectorAll(".widget-pianoroll__grid").length > 0, null, { timeout: 30000 });
  return page.locator(".widget-pianoroll__grid").evaluateAll((grids) => grids.map((grid) => ({
    widget: grid.closest(".widget")?.id || "",
    paint: [grid, ...grid.querySelectorAll("*")].map((node) => {
      const style = getComputedStyle(node);
      return {
        tag: node.localName,
        className: node.getAttribute("class") || "",
        fill: style.fill,
        stroke: style.stroke,
      };
    }),
  })));
}

async function assertRouteExperienceState(page, route, viewport, label, approvedGeometry) {
  await assertMainLandmark(page, route, label);
  await assertPrimarySurfaceVisible(page, label, route.experience.primarySurface, route.experience.runtimeSurface, approvedGeometry);
  assertRuntimeGeometry(await measureRuntimeSurface(page, route, label), approvedGeometry, label);
  await assertReadOnlyProbe(page, route, label);
  await assertManifestNavigation(page, route, viewport, label);
  if (route.experience.themeOwnership === "runtime-hook") {
    assert(await page.locator(route.experience.themeRoot).count() === 1, `${label} did not expose its declared runtime theme root`);
  }
  await assertRouteContinuation(page, route, label);
  await assertRouteAccessibility(page, label);
  await assertViewportUsable(page, label);
}

async function runStoredThemeGate(browser, route, theme, approvedGeometry) {
  const context = await createThemeContext(browser, {
    theme,
    stored: true,
    systemTheme: abletonSynthLessonSlugs.includes(route.slug) ? (theme === "dark" ? "light" : "dark") : theme,
  });
  let routeTokens = null;
  let docsTokens = null;
  let intrinsicPaint = null;
  try {
    for (const viewport of experienceViewports) {
      const label = `${route.slug} ${viewport.name} stored ${theme}`;
      const page = await context.newPage();
      const assertRuntimeClean = createRuntimeMonitor(page, { networkPolicy: route.experience.networkPolicy });
      try {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await assertRoute(page, `${route.slug}/`, "#reference-footer");
        await waitForManifestRouteReady(page, route);
        await page.waitForLoadState("networkidle", { timeout: 30000 });
        await assertDocumentTheme(page, theme, label);
        await assertRouteExperienceState(page, route, viewport, label, approvedGeometry[viewport.name]);
        assertRuntimeClean(label);
        routeTokens ||= await readThemeTokens(page, label, route.slug, theme);
        intrinsicPaint ||= await readAbletonGridPaint(page, route);
        console.log(`OK ${label}`);
      } finally {
        await page.close();
      }

      const docsLabel = `docs/${route.slug} ${viewport.name} stored ${theme}`;
      const docsPage = await context.newPage();
      const assertDocsRuntimeClean = createRuntimeMonitor(docsPage, { rejectOffOriginRequests: true });
      try {
        await docsPage.setViewportSize({ width: viewport.width, height: viewport.height });
        await assertDocsBaseline(docsPage, route, docsLabel);
        await assertDocumentTheme(docsPage, theme, docsLabel);
        await assertFrameTitles(docsPage, docsLabel);
        await assertViewportUsable(docsPage, docsLabel);
        assertDocsRuntimeClean(docsLabel);
        docsTokens ||= await readThemeTokens(docsPage, docsLabel);
      } finally {
        await docsPage.close();
      }
    }
  } finally {
    await context.close();
  }
  return { routeTokens, docsTokens, intrinsicPaint };
}

async function runSystemThemeGate(browser, route, theme, approvedGeometry, expectedTokens) {
  const context = await createThemeContext(browser, { theme, stored: false });
  try {
    for (const viewport of experienceViewports) {
      const label = `${route.slug} ${viewport.name} system ${theme}`;
      const page = await context.newPage();
      const assertRuntimeClean = createRuntimeMonitor(page, { networkPolicy: route.experience.networkPolicy });
      try {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await assertRoute(page, `${route.slug}/`, "#reference-footer");
        await waitForManifestRouteReady(page, route);
        await page.waitForLoadState("networkidle", { timeout: 30000 });
        const themeState = await assertDocumentTheme(page, theme, label);
        assert(themeState.stored === null, `${label} unexpectedly retained a stored theme`);
        await assertRouteExperienceState(page, route, viewport, label, approvedGeometry[viewport.name]);
        const tokens = await readThemeTokens(page, label, route.slug, theme);
        assert(JSON.stringify(tokens) === JSON.stringify(expectedTokens.routeTokens), `${label} did not match the ${theme} stored shell state`);
        assertRuntimeClean(label);
      } finally {
        await page.close();
      }

      const docsLabel = `docs/${route.slug} ${viewport.name} system ${theme}`;
      const docsPage = await context.newPage();
      const assertDocsRuntimeClean = createRuntimeMonitor(docsPage, { rejectOffOriginRequests: true });
      try {
        await docsPage.setViewportSize({ width: viewport.width, height: viewport.height });
        await assertDocsBaseline(docsPage, route, docsLabel);
        const themeState = await assertDocumentTheme(docsPage, theme, docsLabel);
        assert(themeState.stored === null, `${docsLabel} unexpectedly retained a stored theme`);
        const tokens = await readThemeTokens(docsPage, docsLabel);
        assert(JSON.stringify(tokens) === JSON.stringify(expectedTokens.docsTokens), `${docsLabel} did not match the ${theme} stored shell state`);
        await assertViewportUsable(docsPage, docsLabel);
        assertDocsRuntimeClean(docsLabel);
      } finally {
        await docsPage.close();
      }
    }
  } finally {
    await context.close();
  }
}

async function collectPerformanceRun(browser, route, theme, runNumber) {
  const context = await createThemeContext(browser, {
    theme,
    stored: true,
    viewport: experienceViewports[0],
  });
  const page = await context.newPage();
  const label = `${route.slug} ${theme} performance run ${runNumber}`;
  const assertRuntimeClean = createRuntimeMonitor(page, { networkPolicy: route.experience.networkPolicy });
  try {
    await assertRoute(page, `${route.slug}/`, "#reference-footer");
    await page.waitForLoadState("load");
    await waitForManifestRouteReady(page, route);
    await page.waitForLoadState("networkidle", { timeout: 30000 });
    const evidence = await page.evaluate((expectedMountPath) => {
      const navigation = performance.getEntriesByType("navigation")[0];
      const resources = performance.getEntriesByType("resource");
      const localEntries = [navigation, ...resources].filter((entry) => {
        if (!entry?.name) {
          return false;
        }
        const url = new URL(entry.name);
        return url.origin === window.location.origin && url.pathname.startsWith(expectedMountPath);
      });
      const transferSupported = localEntries.length > 0 && localEntries.every((entry) => (
        "transferSize" in entry && Number.isFinite(entry.transferSize)
      ));
      const localResources = resources
        .filter((entry) => {
          const url = new URL(entry.name);
          return url.origin === window.location.origin && url.pathname.startsWith(expectedMountPath);
        })
        .sort((left, right) => right.duration - left.duration);
      const longest = localResources[0] || null;
      const longestUrl = longest ? new URL(longest.name) : null;
      return {
        domContentLoadedMs: navigation?.domContentLoadedEventEnd,
        loadMs: navigation?.loadEventEnd,
        resourceCount: resources.length,
        resourceCountDelta: 0,
        sameOriginTransfer: transferSupported
          ? {
              status: "supported",
              bytes: localEntries.reduce((total, entry) => total + entry.transferSize, 0),
            }
          : { status: "unsupported" },
        longestLocalResource: longest
          ? {
              path: `${longestUrl.pathname.slice(expectedMountPath.length)}${longestUrl.search}`,
              durationMs: longest.duration,
            }
          : null,
      };
    }, mountPath);
    assertRuntimeClean(label);
    return evidence;
  } finally {
    await page.close();
    await context.close();
  }
}

async function measureRoutePerformance(browser, route, approvedRouteBaseline, enforcePerformance) {
  const measured = {};
  for (const theme of experienceThemes) {
    const runs = [];
    for (let runNumber = 1; runNumber <= 3; runNumber += 1) {
      runs.push(await collectPerformanceRun(browser, route, theme, runNumber));
    }
    const approved = approvedRouteBaseline?.[theme] || null;
    measured[theme] = summarizePerformanceRuns(runs, approved?.resourceCountDelta || 0);
    if (enforcePerformance) {
      const regressions = performanceRegressions(measured[theme], approved);
      assert(regressions.length === 0, `${route.slug} ${theme} performance regressed:\n${regressions.join("\n")}`);
    }
    const transfer = measured[theme].sameOriginTransfer;
    console.log(`OK ${route.slug} ${theme} performance median (${measured[theme].domContentLoadedMs}ms DOMContentLoaded, ${measured[theme].loadMs}ms load, ${measured[theme].resourceCount} resources, ${transfer.status === "supported" ? `${transfer.bytes} bytes` : "transfer unsupported"})`);
  }
  return measured;
}

async function assertManifestRouteExperience(browser, route, approvedGeometry) {
  const tokensByTheme = new Map();
  for (const theme of experienceThemes) {
    tokensByTheme.set(theme, await runStoredThemeGate(browser, route, theme, approvedGeometry));
  }
  const lightRouteTokens = tokensByTheme.get("light").routeTokens;
  const darkRouteTokens = tokensByTheme.get("dark").routeTokens;
  assertThemePair(lightRouteTokens, darkRouteTokens, `${route.slug} Route shell`);
  assertThemePair(tokensByTheme.get("light").docsTokens, tokensByTheme.get("dark").docsTokens, `docs/${route.slug} shell`);
  if (abletonSynthAccentBySlug.has(route.slug)) {
    const expectedAccent = abletonSynthAccentBySlug.get(route.slug);
    if (expectedAccent) {
      assert(lightRouteTokens.authoredRuntimeTokens.accent === expectedAccent, `${route.slug} light authored runtime accent changed identity`);
      assert(darkRouteTokens.authoredRuntimeTokens.accent === expectedAccent, `${route.slug} dark authored runtime accent changed identity`);
    } else {
      assert(lightRouteTokens.authoredRuntimeTokens.accent === lightRouteTokens.authoredRuntimeTokens.foreground, `${route.slug} light authored runtime accent was not monochrome`);
      assert(darkRouteTokens.authoredRuntimeTokens.accent === darkRouteTokens.authoredRuntimeTokens.foreground, `${route.slug} dark authored runtime accent was not monochrome`);
    }
  }
  if (abletonMusicWidgetSlugs.has(route.slug)) {
    assert(
      JSON.stringify(tokensByTheme.get("light").intrinsicPaint) === JSON.stringify(tokensByTheme.get("dark").intrinsicPaint),
      `${route.slug} intrinsic SVG paint changed across stored themes`,
    );
  }
  for (const theme of experienceThemes) {
    await runSystemThemeGate(browser, route, theme, approvedGeometry, tokensByTheme.get(theme));
  }
}

async function smokeCrowdsReadOnly(context) {
  const page = await context.newPage();
  const assertRuntimeClean = createRuntimeMonitor(page, { rejectOffOriginRequests: true });
  try {
    await assertRoute(page, "crowds/", "#reference-footer");
    await page.waitForFunction(() => {
      const play = document.querySelector("#slideshow .next_button");
      return document.querySelector("main")?.getAttribute("aria-busy") === "false" &&
        window.slideshow?.currentSlide?.chapter === "Preloader" &&
        window.slideshow?.IS_TRANSITIONING === false &&
        window.PRELOAD_PROGRESS === 1 &&
        play &&
        !play.hasAttribute("disabled") &&
        /let's play/i.test(play.textContent || "");
    }, null, { timeout: 30000 });
    const readState = () => page.evaluate(() => {
      const navigation = document.querySelector("#navigation");
      return {
        busy: document.querySelector("main")?.getAttribute("aria-busy"),
        chapter: window.slideshow?.currentSlide?.chapter || "",
        slideIndex: window.slideshow?.slideIndex,
        transitioning: window.slideshow?.IS_TRANSITIONING,
        playDisabled: document.querySelector("#slideshow .next_button")?.hasAttribute("disabled"),
        playText: (document.querySelector("#slideshow .next_button")?.textContent || "").replace(/\s+/g, " ").trim(),
        navigationVisible: Boolean(navigation && getComputedStyle(navigation).display !== "none"),
        chapterControlCount: document.querySelectorAll("#navigation > div[chapter]").length,
        canvasCount: document.querySelectorAll("main canvas").length,
      };
    });
    const initial = await readState();
    await page.waitForTimeout(250);
    const settled = await readState();
    assert(initial.busy === "false" && initial.chapter === "Preloader" && initial.slideIndex === 0, "crowds read-only probe did not reach its initial slideshow state");
    assert(!initial.transitioning && !initial.playDisabled && /let's play/i.test(initial.playText), "crowds read-only probe did not expose its ready start control");
    assert(!initial.navigationVisible && initial.chapterControlCount === 9, "crowds read-only probe did not preserve its initial native navigation state");
    assert(initial.canvasCount >= 1, "crowds read-only probe did not expose its intrinsic canvas runtime");
    assert(JSON.stringify(settled) === JSON.stringify(initial), "crowds read-only probe changed semantic state without an action");
    assertRuntimeClean("crowds read-only probe");
    console.log("OK crowds explicit read-only probe");
  } finally {
    await page.close();
  }
}

async function setRangeValue(page, selector, value) {
  await page.locator(selector).evaluate((element, nextValue) => {
    element.value = String(nextValue);
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  }, value);
}

async function assertViewportUsable(page, label) {
  const metrics = await page.evaluate(() => {
    const doc = document.documentElement;
    const body = document.body;
    return {
      initialX: window.scrollX,
      initialY: window.scrollY,
      innerWidth: window.innerWidth,
      scrollWidth: Math.max(doc?.scrollWidth || 0, body?.scrollWidth || 0),
    };
  });
  if (metrics.scrollWidth <= metrics.innerWidth + 32) {
    return;
  }
  await page.mouse.move(1, 1);
  await page.mouse.wheel(metrics.scrollWidth, 0);
  await page.waitForTimeout(50);
  const maximumScrollX = await page.evaluate(() => window.scrollX);
  await page.evaluate(({ x, y }) => window.scrollTo(x, y), { x: metrics.initialX, y: metrics.initialY });
  assert(
    maximumScrollX <= 32,
    `${label} panned ${maximumScrollX}px at ${metrics.innerWidth}px (${metrics.scrollWidth}px content width)`,
  );
}

async function assertRouteViewportUsable(context, relativePath, selector, readySelector, label, width, height) {
  const page = await context.newPage();
  await page.setViewportSize({ width, height });
  await assertRoute(page, relativePath, selector);
  if (readySelector) {
    await page.waitForSelector(readySelector, { timeout: 30000 });
  }
  await page.waitForTimeout(1000);
  await assertViewportUsable(page, label);
  await page.close();
}

async function scrollPrimarySurfaceIntoView(page, label, selector) {
  const surface = page.locator(selector);
  assert(await surface.count() === 1, `${label} did not expose one primary surface for ${selector}`);
  await surface.scrollIntoViewIfNeeded();
  await page.waitForTimeout(150);
}

async function assertPrimarySurfaceVisible(page, label, selector = "[data-primary-control]", runtimeSelector = "", approvedGeometry = null) {
  await scrollPrimarySurfaceIntoView(page, label, selector);
  const state = await page.evaluate(({ controlSelector, runtimeSelector }) => {
    const control = document.querySelector(controlSelector);
    if (!control) {
      return null;
    }

    const rect = control.getBoundingClientRect();
    const visibleTop = Math.max(rect.top, 0);
    const visibleBottom = Math.min(rect.bottom, window.innerHeight);
    const visibleLeft = Math.max(rect.left, 0);
    const visibleRight = Math.min(rect.right, window.innerWidth);

    return {
      width: rect.width,
      height: rect.height,
      top: rect.top,
      left: rect.left,
      right: rect.right,
      bottom: rect.bottom,
      visibleHeight: Math.max(0, visibleBottom - visibleTop),
      visibleWidth: Math.max(0, visibleRight - visibleLeft),
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      sameSurface: runtimeSelector ? control === document.querySelector(runtimeSelector) : false,
    };
  }, { controlSelector: selector, runtimeSelector });

  assert(state, `${label} did not expose the primary control surface`);
  assert(state.width > 0 && state.height > 0, `${label} primary control surface collapsed`);
  assert(state.bottom >= 80, `${label} primary control surface was clipped above the viewport`);
  assert(state.left >= -4, `${label} primary control surface was clipped on the left edge`);
  const approvedRight = state.sameSurface ? approvedGeometry?.rect?.right : state.viewportWidth;
  assert(Number.isFinite(approvedRight), `${label} primary control surface lacked approved right-edge evidence`);
  assert(state.right <= Math.max(state.viewportWidth + 4, approvedRight + 1), `${label} primary control surface overflowed its approved right edge`);
  assert(
    state.top <= state.viewportHeight - 80,
    `${label} primary control surface landed below the viewport fold`,
  );
  assert(
    state.visibleHeight >= Math.min(160, Math.max(96, state.height * 0.2)),
    `${label} primary control surface did not keep enough visible area after scroll`,
  );
  assert(
    state.visibleWidth >= Math.min(240, Math.max(160, state.width * 0.6)),
    `${label} primary control surface did not keep enough visible width after scroll`,
  );
}

async function assertLocalScriptSources(page, expectedSources, label) {
  const scriptSources = await page.evaluate(() => {
    return Array.from(document.querySelectorAll("script[src]"))
      .map((node) => node.getAttribute("src") || "")
      .filter(Boolean);
  });

  for (const expectedSource of expectedSources) {
    assert(
      scriptSources.includes(expectedSource),
      `${label} did not load ${expectedSource} from local assets`,
    );
  }
}

async function assertNoRemotePlayableMediaRequests(page, label) {
  const baseOrigin = new URL(baseUrl).origin;
  const remoteMedia = await page.evaluate((origin) => {
    const mediaExtension = /\.(mp3|ogg|wav|m4a|opus|mp4|webm)(?:[?#].*)?$/i;
    return performance
      .getEntriesByType("resource")
      .map((entry) => ({ name: entry.name, initiatorType: entry.initiatorType || "" }))
      .filter((entry) => {
        try {
          const url = new URL(entry.name, window.location.href);
          return url.origin !== origin &&
            (mediaExtension.test(url.pathname) || ["audio", "video"].includes(entry.initiatorType));
        } catch {
          return false;
        }
      });
  }, baseOrigin);

  assert(
    remoteMedia.length === 0,
    `${label} loaded remote playable media:\n${remoteMedia.map((entry) => entry.name).join("\n")}`,
  );
}

function createRemoteRequestMonitor(page) {
  const requests = [];

  page.on("request", (request) => {
    requests.push(request.url());
  });

  return {
    snapshot() {
      return requests.slice();
    },
    diff(fromIndex = 0) {
      return requests.slice(fromIndex);
    },
  };
}

function assertOnlyAllowedRemoteRequests(requestUrls, allowedHosts, label) {
  const baseOrigin = new URL(baseUrl).origin;
  const disallowed = requestUrls.filter((requestUrl) => {
    try {
      const url = new URL(requestUrl);
      if (url.origin === baseOrigin) {
        return false;
      }

      return !allowedHosts.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`));
    } catch {
      return false;
    }
  });

  assert(
    disallowed.length === 0,
    `${label} made disallowed remote requests:\n${disallowed.join("\n")}`,
  );
}

function countFilesRecursive(relativePath) {
  const fullPath = path.join(rootDir, relativePath);
  let count = 0;

  for (const entry of fs.readdirSync(fullPath, { withFileTypes: true })) {
    const nextRelativePath = path.join(relativePath, entry.name);
    if (entry.isDirectory()) {
      count += countFilesRecursive(nextRelativePath);
    } else if (entry.isFile()) {
      count += 1;
    }
  }

  return count;
}

async function setRangeControlByLabel(page, scopeSelector, labelText, value) {
  await page.locator(scopeSelector).evaluate((scope, payload) => {
    const wrapper = Array.from(scope.querySelectorAll("div")).find((candidate) => {
      return candidate.querySelector("label")?.textContent?.trim() === payload.labelText;
    });
    const input = wrapper?.querySelector("input[type='range']");
    if (!input) {
      throw new Error(`Missing range control for ${payload.labelText}`);
    }
    input.value = String(payload.value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }, { labelText, value });
}

async function setSelectControlByLabel(page, scopeSelector, labelText, value) {
  await page.locator(scopeSelector).evaluate((scope, payload) => {
    const wrapper = Array.from(scope.querySelectorAll("div")).find((candidate) => {
      return candidate.querySelector("label")?.textContent?.trim() === payload.labelText;
    });
    const select = wrapper?.querySelector("select");
    if (!select) {
      throw new Error(`Missing select control for ${payload.labelText}`);
    }
    select.value = payload.value;
    select.dispatchEvent(new Event("input", { bubbles: true }));
    select.dispatchEvent(new Event("change", { bubbles: true }));
  }, { labelText, value });
}

async function assertLongformResponsiveShell(context, page, relativePath, readySelector, label, options = {}) {
  const {
    expectedFamily = "engineering-longform",
    expectedRoute = null,
    minimumChapters = 4,
    playHref = null,
  } = options;

  if (expectedRoute) {
    await assertEngineeringSandboxShell(page, label, {
      minimumChapters,
      navMode: "generated",
      expectedFamily,
      expectedRoute,
    });

    if (playHref) {
      const actualPlayHref = await page.locator(".story-hero [data-story-callout='play'] .story-button").first().getAttribute("href");
      assert(actualPlayHref === playHref, `${label} exposed unexpected play-first href ${actualPlayHref}`);
    }

    await assertEngineeringSandboxLayout(context, relativePath, label, {
      navMode: "generated",
      readySelector: ".story-hero",
    });
  }

  await assertViewportUsable(page, label);
  await assertRouteViewportUsable(
    context,
    relativePath,
    "#reference-footer",
    readySelector,
    label,
    390,
    844,
  );
}

async function dragKnob(page, knobSelector, deltaX, deltaY, label) {
  const knob = page.locator(knobSelector).first();
  await knob.scrollIntoViewIfNeeded();
  const knobBox = await knob.boundingBox();
  assert(knobBox, `${label} did not expose ${knobSelector}`);
  await page.mouse.move(knobBox.x + knobBox.width / 2, knobBox.y + knobBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    knobBox.x + knobBox.width / 2 + deltaX,
    knobBox.y + knobBox.height / 2 + deltaY,
    { steps: 12 },
  );
  await page.mouse.up();
}

async function dragCanvasUntilChanged(page, canvasSelector, drags, label) {
  const canvas = page.locator(canvasSelector);
  await canvas.scrollIntoViewIfNeeded();
  const box = await canvas.boundingBox();
  assert(box, `${label} did not expose ${canvasSelector}`);

  const idleFirst = await canvas.evaluate((element) => element.toDataURL());
  await page.waitForTimeout(150);
  const idleSecond = await canvas.evaluate((element) => element.toDataURL());
  const selfAnimating = idleFirst !== idleSecond;

  if (selfAnimating) {
    await page.evaluate(() => {
      window.__smokeDragAccepted = 0;
      document.addEventListener("mousedown", (event) => {
        if (event.defaultPrevented) {
          window.__smokeDragAccepted += 1;
        }
      }, false);
    });
  }

  for (const drag of drags) {
    const before = selfAnimating ? null : await canvas.evaluate((element) => element.toDataURL());
    await page.mouse.move(box.x + box.width * drag.from.x, box.y + box.height * drag.from.y);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * drag.to.x, box.y + box.height * drag.to.y, { steps: 12 });
    await page.mouse.up();
    await page.waitForTimeout(150);
    if (selfAnimating) {
      const accepted = await page.evaluate(() => window.__smokeDragAccepted);
      if (accepted > 0) {
        return;
      }
      continue;
    }
    const after = await canvas.evaluate((element) => element.toDataURL());
    if (after !== before) {
      return;
    }
  }

  throw new Error(
    selfAnimating
      ? `${label} never consumed a pointer grab on ${canvasSelector}`
      : `${label} did not update after drag attempts`,
  );
}

async function dragNativeTouch(page, selector, deltaX, deltaY, label) {
  const target = page.locator(selector).first();
  await page.evaluate(() => {
    document.documentElement.style.scrollBehavior = "auto";
  });
  await target.evaluate(async (element) => {
    for (let attempt = 0; attempt < 8; attempt += 1) {
      element.scrollIntoView({ block: "center", behavior: "instant" });
      await new Promise((resolve) => window.setTimeout(resolve, 100));
    }
  });
  const box = await target.boundingBox();
  assert(box, `${label} did not expose ${selector}`);
  const targetMatches = await target.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2) === element;
  });
  assert(targetMatches, `${label} coordinates did not resolve to ${selector}`);
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  const client = await page.context().newCDPSession(page);
  try {
    await client.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x, y, radiusX: 4, radiusY: 4, force: 1, id: 1 }],
    });
    for (let step = 1; step <= 8; step += 1) {
      await client.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{
          x: x + deltaX * step / 8,
          y: y + deltaY * step / 8,
          radiusX: 4,
          radiusY: 4,
          force: 1,
          id: 1,
        }],
      });
    }
    await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  } finally {
    await client.detach();
  }
}

async function clickChoice(page, text) {
  const choice = page.locator("#game_choices > button").filter({ hasText: text }).first();
  await choice.waitFor({ state: "visible", timeout: 20000 });
  await choice.click();
}

async function waitForIntroChoices(page) {
  await page.waitForFunction(() => {
    const choices = Array.from(document.querySelectorAll("#game_choices > button"));
    return choices.some((choice) => /PLAY|REPLAY|Chapter Select|content notes/i.test(choice.textContent || ""));
  }, null, { timeout: 20000 });
}

async function smokeRemember(context) {
  const page = await context.newPage();

  await assertRoute(page, "remember/", "iframe.splash");
  await page.waitForFunction(() => document.querySelectorAll("iframe.simulation").length > 0, null, { timeout: 15000 });
  const iframeNames = await page.locator("iframe").evaluateAll((iframes) => iframes.map((iframe) => iframe.title));
  assert(iframeNames.every(Boolean), "Remember generated iframe lacked a title");
  assert(new Set(iframeNames).size === iframeNames.length, "Remember generated iframe titles were not unique");
  const rememberDownloadLabels = await page.evaluate((cardNames) => {
    const labelIds = [
      "download_all",
      "download_all_downloading",
      "download_all_done",
      ...cardNames.flatMap((cardName) => [`flashcard_${cardName}_front`, `flashcard_${cardName}_back`]),
    ];

    return Object.fromEntries(labelIds.map((id) => [id, document.querySelector(`#${id}`)?.innerHTML || ""]));
  }, rememberDownloadCardNames);

  await page.goto(new URL("remember/sims/multicard/?cards=test_a,test_b,test_c", baseUrl).href, {
    waitUntil: "load",
  });
  await page.waitForSelector("#current_card", { timeout: 15000 });
  await page.waitForFunction(() => {
    return Array.isArray(window.CARDS) && window.CARDS.length === 3 && typeof document.querySelector("#current_card").onclick === "function";
  }, null, { timeout: 10000 });
  await page.evaluate(() => showInfoQuestion());
  for (let index = 0; index < 3; index += 1) {
    await page.evaluate(() => document.querySelector("#current_card").onclick());
    await page.waitForFunction(() => {
      return getComputedStyle(document.querySelector("#answer")).display !== "none";
    }, null, { timeout: 8000 });
    await page.click("#a_yes");
    await page.waitForTimeout(400);
  }
  await page.waitForFunction(() => {
    return getComputedStyle(document.querySelector("#done")).display !== "none";
  }, null, { timeout: 10000 });
  const doneText = await page.locator("#done").textContent();
  assert(/done for now! keep scrolling/i.test(doneText || ""), "Remember multicard did not reach the done state");
  console.log("OK remember multicard loop");

  await page.goto(new URL("remember/sims/leitner/?mode=2", baseUrl).href, {
    waitUntil: "load",
  });
  await page.waitForFunction(() => {
    return (document.querySelector("#label_day")?.textContent || "").trim().length > 0;
  }, null, { timeout: 15000 });
  const initialDay = (await page.locator("#label_day").textContent())?.trim();
  await setRangeValue(page, "#slider_new", 12);
  await setRangeValue(page, "#slider_wrong", 0.08);
  await page.click("#next_week");
  await page.waitForFunction((previousDay) => {
    return (document.querySelector("#label_day")?.textContent || "").trim() !== previousDay;
  }, initialDay, { timeout: 5000 });
  const sliderText = await page.locator("#slider_new_label").textContent();
  assert(/12/.test(sliderText || ""), "Remember Leitner slider label did not update");
  console.log("OK remember leitner controls");

  const downloadsPage = await context.newPage();
  await downloadsPage.addInitScript((labels) => {
    const originalQuerySelector = Document.prototype.querySelector;
    Document.prototype.querySelector = function smokeQuerySelector(selector) {
      const result = originalQuerySelector.call(this, selector);
      if (result || typeof selector !== "string" || !selector.startsWith("#")) {
        return result;
      }

      const id = selector.slice(1);
      if (!(id in labels)) {
        return result;
      }

      return {
        innerHTML: labels[id],
      };
    };
  }, rememberDownloadLabels);
  await downloadsPage.goto(new URL("remember/sims/downloads/all.html", baseUrl).href, {
    waitUntil: "load",
  });
  await downloadsPage.evaluate(() => {
    window.saveAs = function saveAsStub() {
      window.__savedBySmoke = true;
    };
  });
  await downloadsPage.locator("#download").click();
  await downloadsPage.waitForFunction(() => window.__savedBySmoke === true, null, { timeout: 20000 });
  await downloadsPage.waitForFunction(() => {
    const label = document.querySelector("#download")?.textContent || "";
    return /DONE!/i.test(label);
  }, null, { timeout: 20000 });
  console.log("OK remember download flow");

  await downloadsPage.close();
  await page.close();
}

function buildAnxietyReplayState() {
  const act4 = {
    CHAPTER: 4,
    attack_harm_ch1: 2,
    attack_alone_ch1: 2,
    attack_bad_ch1: 2,
    parasite: true,
    partyinvite: "no",
    badnews: true,
    factcheck: true,
    hookuphole: true,
    act1g: "go",
    act1_ending: "fight",
    INTERMISSION_STAGE: 2,
    attack_harm_ch2: 1,
    attack_alone_ch2: 0,
    attack_bad_ch2: 5,
    a2_first_danger: "meaning",
    a2_attack_1: "bad",
    a2_first_choice: "different",
    a2_second_danger: "hitler",
    a2_attack_2: "bad",
    a2_hoodie_callback: "Hitler",
    a2_attack_3: "bad",
    SPECIAL_ATTACK: "alone",
    a2_ending: "fight",
    act3_bb_body: 4,
    a3_ending: "jump",
    INJURED: true,
    attack_harm_total: 3,
    attack_alone_total: 2,
    attack_bad_total: 7,
    TOP_FEAR: "bad",
  };

  return {
    act2: JSON.stringify({
      CHAPTER: 2,
      attack_harm_ch1: 2,
      attack_alone_ch1: 2,
      attack_bad_ch1: 2,
      parasite: true,
      partyinvite: "no",
      badnews: true,
      factcheck: true,
      hookuphole: true,
      act1g: "go",
      act1_ending: "flight",
      INTERMISSION_STAGE: 1,
      attack_harm_ch2: 0,
      attack_alone_ch2: 0,
      attack_bad_ch2: 0,
    }),
    act3: JSON.stringify({
      CHAPTER: 3,
      attack_harm_ch1: 2,
      attack_alone_ch1: 2,
      attack_bad_ch1: 2,
      parasite: true,
      partyinvite: "no",
      badnews: true,
      factcheck: true,
      hookuphole: true,
      act1g: "go",
      act1_ending: "fight",
      INTERMISSION_STAGE: 2,
      attack_harm_ch2: 1,
      attack_alone_ch2: 0,
      attack_bad_ch2: 5,
      a2_first_danger: "meaning",
      a2_attack_1: "bad",
      a2_first_choice: "different",
      a2_second_danger: "hitler",
      a2_attack_2: "bad",
      a2_hoodie_callback: "Hitler",
      a2_attack_3: "bad",
      SPECIAL_ATTACK: "bad",
      a2_ending: "fight",
    }),
    act4: JSON.stringify(act4),
    continueChapter: "replay",
    credits: "YUP!",
  };
}

async function smokeAnxiety(context) {
  const introPage = await context.newPage();
  await assertRoute(introPage, "anxiety/", "#loading");
  await introPage.waitForSelector("#loading[loaded='yes']", { timeout: 20000 });
  await introPage.click("#loading");
  await waitForIntroChoices(introPage);
  await clickChoice(introPage, "PLAY!");
  await introPage.waitForFunction(() => {
    const words = document.querySelector("#game_words")?.textContent || "";
    return /Welcome! This is less of a "game," more of an interactive story/i.test(words);
  }, null, { timeout: 20000 });
  await introPage.mouse.click(10, 10);
  await introPage.mouse.click(10, 10);
  await introPage.waitForFunction(() => {
    const words = document.querySelector("#game_words")?.textContent || "";
    return /So before we start, how would you like to read/i.test(words);
  }, null, { timeout: 20000 });
  await introPage.mouse.click(10, 10);
  await introPage.mouse.click(10, 10);
  await introPage.waitForFunction(() => {
    const options = document.querySelector("#options");
    return options?.getAttribute("past_intro") === "no" && options.style.top === "447px";
  }, null, { timeout: 20000 });
  const anxietyControls = await introPage.evaluate(() => ({
    gearIsButton: document.querySelector("#gear")?.tagName === "BUTTON",
    aboutIsButton: document.querySelector("#huh")?.tagName === "BUTTON",
    choicesAreButtons: Array.from(document.querySelectorAll("#game_choices > *")).every((choice) => choice.tagName === "BUTTON"),
  }));
  assert(anxietyControls.gearIsButton && anxietyControls.aboutIsButton, "anxiety persistent controls are not native buttons");
  assert(anxietyControls.choicesAreButtons, "anxiety actionable choices are not native buttons");

  const initialOptions = await introPage.evaluate(() => ({
    textSpeed: Game.TEXT_SPEED,
    clickToAdvance: Game.CLICK_TO_ADVANCE,
  }));
  await setRangeValue(introPage, "#text_speed_slider", 0.8);
  await setRangeValue(introPage, "#volume_slider", 0.35);
  await introPage.locator("#text_automatic_toggle").click();
  const changedOptions = await introPage.evaluate(() => ({
    textSpeed: Game.TEXT_SPEED,
    volume: Howler.volume(),
    clickToAdvance: Game.CLICK_TO_ADVANCE,
  }));
  assert(changedOptions.textSpeed !== initialOptions.textSpeed, "anxiety text-speed control did not change authored pacing");
  assert(Math.abs(changedOptions.volume - 0.35) < 0.001, "anxiety volume control did not change runtime audio");
  assert(changedOptions.clickToAdvance !== initialOptions.clickToAdvance, "anxiety automatic-text control did not change pacing mode");
  await introPage.locator("#options_ok").click();
  await introPage.waitForFunction(() => {
    const words = document.querySelector("#game_words")?.textContent || "";
    return /THIS IS A HUMAN/i.test(words);
  }, null, { timeout: 30000 });
  const automaticAdvance = await introPage.evaluate(() => {
    const prompt = document.querySelector("#click_to_advance");
    return {
      clickToAdvance: Game.CLICK_TO_ADVANCE,
      promptVisible: Boolean(prompt && getComputedStyle(prompt).display !== "none"),
      completedText: Game.wordsDOM.textContent || "",
    };
  });
  assert(!automaticAdvance.clickToAdvance && !automaticAdvance.promptVisible, "anxiety automatic pacing did not advance without a click prompt");
  assert(/THIS IS A HUMAN/.test(automaticAdvance.completedText), "anxiety automatic pacing did not complete the authored intro steps");

  const aboutOpened = await introPage.evaluate(() => {
    const opener = document.querySelector("#huh");
    if (!opener) {
      return false;
    }
    opener.style.display = "block";
    opener.focus();
    opener.click();
    return true;
  });
  assert(aboutOpened, "anxiety about opener was missing");
  await introPage.waitForFunction(() => document.querySelector("#about")?.open, null, { timeout: 5000 });
  await introPage.keyboard.press("Escape");
  await introPage.waitForFunction(() => !document.querySelector("#about")?.open, null, { timeout: 5000 });
  const aboutFocusRestored = await introPage.evaluate(() => document.activeElement?.id === "huh");
  assert(aboutFocusRestored, "anxiety about dialog did not restore focus to its opener");

  const contentNotesOpened = await introPage.evaluate(() => {
    const opener = document.querySelector("#gear");
    if (!opener) {
      return false;
    }
    opener.style.display = "block";
    opener.focus();
    publish("show_cn");
    return true;
  });
  assert(contentNotesOpened, "anxiety content-notes opener was missing");
  await introPage.waitForFunction(() => document.querySelector("#content_notes")?.open, null, { timeout: 5000 });
  await introPage.keyboard.press("Escape");
  await introPage.waitForFunction(() => !document.querySelector("#content_notes")?.open, null, { timeout: 5000 });
  const contentNotesFocusRestored = await introPage.evaluate(() => document.activeElement?.id === "gear");
  assert(contentNotesFocusRestored, "anxiety content-notes dialog did not restore focus to its opener");
  const sharing = await introPage.evaluate(() => ({
    sharingLink: SHARING_LINK,
    sharingTitle: SHARING_TITLE,
    sharingDescription: SHARING_DESC,
    facebookHref: document.querySelector("#share_link_fb")?.href || "",
    twitterHref: document.querySelector("#share_link_tw")?.href || "",
    emailHref: document.querySelector("#share_link_em")?.href || "",
  }));
  const expectedSharingLink = new URL("anxiety/", baseUrl).href;
  const expectedSharingTitle = "Adventures With Anxiety!";
  const expectedSharingDescription = "I just played this story-game about a human and their anxiety! You play *as* the anxiety. 😱";
  assert(sharing.sharingLink === expectedSharingLink && sharing.sharingTitle === expectedSharingTitle && sharing.sharingDescription === expectedSharingDescription, "anxiety authored sharing payload changed");
  assert(sharing.facebookHref === `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(expectedSharingLink)}`, "anxiety Facebook share payload changed");
  assert(sharing.twitterHref === `https://twitter.com/intent/tweet?text=${encodeURIComponent(expectedSharingDescription)}%20${encodeURIComponent(expectedSharingLink)}`, "anxiety Twitter share payload changed");
  assert(sharing.emailHref === `mailto:?subject=${encodeURIComponent(expectedSharingTitle)}&body=${encodeURIComponent(expectedSharingDescription)}%20${encodeURIComponent(expectedSharingLink)}`, "anxiety email share payload changed");
  console.log("OK anxiety intro start, automatic pacing, sharing, and native dialogs");
  await introPage.close();

  const replayPage = await context.newPage();
  const replayState = buildAnxietyReplayState();
  await replayPage.addInitScript((state) => {
    for (const [key, value] of Object.entries(state)) {
      window.localStorage.setItem(key, value);
    }
  }, replayState);
  await assertRoute(replayPage, "anxiety/", "#loading");
  await replayPage.waitForSelector("#loading[loaded='yes']", { timeout: 20000 });
  await replayPage.click("#loading");
  await waitForIntroChoices(replayPage);
  await clickChoice(replayPage, "Chapter Select");
  await replayPage.waitForFunction(() => {
    return Array.from(document.querySelectorAll("#game_choices > button")).some((choice) => {
      return /IV\. The Other Sandwich/i.test(choice.textContent || "");
    });
  }, null, { timeout: 20000 });
  await clickChoice(replayPage, "IV. The Other Sandwich");
  await replayPage.waitForFunction((expectedState) => {
    return window.localStorage.getItem("continueChapter") === "act4" &&
      window.localStorage.getItem("act4") === expectedState &&
      JSON.stringify(window._) === expectedState;
  }, replayState.act4, { timeout: 10000 });
  await replayPage.evaluate(() => Game.clearAllTimeouts());
  await replayPage.waitForFunction(() => {
    const words = document.querySelector("#game_words")?.textContent || "";
    return /game auto-saved/i.test(words);
  }, null, { timeout: 10000 });
  await replayPage.goto(new URL("anxiety/sharing/", baseUrl).href, {
    waitUntil: "domcontentloaded",
  });
  await replayPage.waitForSelector("#reference-footer", { timeout: 15000 });
  console.log("OK anxiety replay and sharing routes");
  await replayPage.close();
}

async function smokeWbwwb(context) {
  const page = await context.newPage();
  await assertRoute(page, "wbwwb/", "#stage canvas");
  await page.waitForFunction(() => window.Game && Game.sceneManager && Game.stage, null, { timeout: 15000 });
  await page.waitForTimeout(7000);
  await page.evaluate(() => {
    const buttons = [];
    function walk(node) {
      if (!node) {
        return;
      }
      if (typeof node.mousedown === "function") {
        buttons.push(node);
      }
      if (node.children) {
        node.children.forEach(walk);
      }
    }
    walk(Game.stage);
    if (buttons[1]) {
      buttons[1].mousedown();
    }
  });
  await page.waitForFunction(() => Game.scene && Game.scene.constructor && Game.scene.constructor.name === "Scene_Quote", null, { timeout: 10000 });
  await page.evaluate(() => Game.sceneManager.gotoScene("Game"));
  await page.waitForTimeout(1000);
  const stageCanvas = page.locator("#stage canvas");
  const stageBox = await stageCanvas.boundingBox();
  assert(stageBox, "wbwwb stage canvas had no pointer geometry");
  const pointerRatio = { x: 0.64, y: 0.42 };
  await page.mouse.move(
    stageBox.x + stageBox.width * pointerRatio.x,
    stageBox.y + stageBox.height * pointerRatio.y,
  );
  await page.mouse.down();
  await page.mouse.up();
  const photoResult = await page.evaluate(() => ({
    cameraX: Game.scene.camera.x,
    cameraY: Game.scene.camera.y,
    gameWidth: Game.width,
    gameHeight: Game.height,
    chyron: Game.scene.director.chyron,
    audience: Game.scene.director.photoData && Game.scene.director.photoData.audience,
  }));
  assert(Math.abs(photoResult.cameraX - photoResult.gameWidth * pointerRatio.x) <= 2, "wbwwb pointer x-coordinate did not map to the camera");
  assert(Math.abs(photoResult.cameraY - photoResult.gameHeight * pointerRatio.y) <= 2, "wbwwb pointer y-coordinate did not map to the camera");
  assert(photoResult.chyron && photoResult.chyron !== "[NO CHYRON]", "wbwwb did not generate a chyron after a photo");
  console.log(`OK wbwwb pointer capture loop (${photoResult.chyron})`);

  await page.evaluate(() => Game.sceneManager.gotoScene("Post_Post_Credits"));
  await page.waitForTimeout(2500);
  const interactiveCount = await page.evaluate(() => {
    const buttons = [];
    function walk(node) {
      if (!node) {
        return;
      }
      if (typeof node.mousedown === "function") {
        buttons.push(node);
      }
      if (node.children) {
        node.children.forEach(walk);
      }
    }
    walk(Game.stage);
    buttons.forEach((button) => button.mousedown());
    return buttons.length;
  });
  await page.waitForFunction(() => Game.scene && Game.scene.constructor && Game.scene.constructor.name === "Scene_Quote", null, { timeout: 5000 });
  assert(interactiveCount >= 1, "wbwwb replay screen did not expose an interactive replay target");
  console.log("OK wbwwb replay flow");
  await page.close();
}

function buildComingOutOutroState() {
  return {
    main_menu_convo_1: 2,
    main_menu_convo_2: 3,
    inception_answer: "dream",
    hippies: true,
    coming_out_readiness: "no",
    what_you_called_out: "Hello, anybody?",
    waiting_action: "wait",
    studying_subject: "Computer Science",
    relationship: "friend",
    lying_about_hanging_out: true,
    studying_subject_2: "Computer Science",
    crying: "sympathy",
    what_are_you: "son",
    top_or_bottom: "versatile",
    promise_silence: "yes",
    grounded: 2,
    tried_talking_about_it: true,
    father_oblivious: false,
    punched: true,
    told_jack: "texts",
    blame: "parents",
    breaking_up_soon: true,
  };
}

async function advanceComingOutUntil(page, predicate, description, maxSteps = 80) {
  for (let index = 0; index < maxSteps; index += 1) {
    if (await page.evaluate(predicate)) {
      return;
    }
    await page.evaluate(() => skipStep());
    await page.waitForTimeout(150);
  }

  throw new Error(`coming-out-simulator-2014 did not reach ${description}`);
}

async function clickComingOutChoice(page, text) {
  const choice = page.locator("#choices > div").filter({ hasText: text }).first();
  await choice.waitFor({ state: "visible", timeout: 10000 });
  await choice.click();
}

async function smokeComingOut(context) {
  const queuePage = await context.newPage();
  await assertRoute(queuePage, "coming-out-simulator-2014/", "#game");
  await queuePage.waitForFunction(() => document.querySelector("#game")?.getAttribute("screen") === "game", null, { timeout: 15000 });
  const queueState = await queuePage.evaluate(() => {
    let soundEvent = null;
    const subscription = subscribe("play", (label, soundLabel) => {
      soundEvent = { label, soundLabel };
    });
    _queue = [];
    resetTimer();
    PlaySound("smoke-slot", "coffeehouse");
    skipStep();
    unsubscribe(subscription);
    return {
      duration: getDuration("one two"),
      soundEvent,
    };
  });
  const dialogueLeadMs = 800;
  const dialogueWordMs = 160;
  assert(queueState.duration === dialogueLeadMs + "one two".split(" ").length * dialogueWordMs, "coming-out authored dialogue timing changed");
  assert(queueState.soundEvent?.label === "smoke-slot" && queueState.soundEvent?.soundLabel === "coffeehouse", "coming-out authored audio queue did not dispatch");
  await queuePage.close();

  const introPage = await context.newPage();
  await assertRoute(introPage, "coming-out-simulator-2014/", "#game");
  await introPage.waitForFunction(() => document.querySelector("#game")?.getAttribute("screen") === "game", null, { timeout: 15000 });
  await advanceComingOutUntil(
    introPage,
    () => document.querySelectorAll("#choices > div").length === 3,
    "opening choices"
  );
  await clickComingOutChoice(introPage, "Let's play this thing!");
  await advanceComingOutUntil(
    introPage,
    () => Array.from(document.querySelectorAll("#choices > div")).some((node) => /redditing at Starbucks/i.test(node.textContent || "")),
    "the first branching choice set"
  );
  await clickComingOutChoice(introPage, "Apparently, with you redditing at Starbucks.");
  await advanceComingOutUntil(
    introPage,
    () => Array.from(document.querySelectorAll("#choices > div")).some((node) => /full of lies/i.test(node.textContent || "")),
    "the second branching choice set"
  );
  await clickComingOutChoice(introPage, "This 'true' game is full of lies?");
  await advanceComingOutUntil(
    introPage,
    () => {
      const dialogue = document.querySelector("#dialogue")?.textContent || "";
      return /coming-to-terms/i.test(dialogue) && /full of lies/i.test(dialogue);
    },
    "the combined consequence summary"
  );
  console.log("OK coming-out opening branches");
  await introPage.close();

  const outroPage = await context.newPage();
  await assertRoute(outroPage, "coming-out-simulator-2014/", "#game");
  await outroPage.waitForFunction(() => document.querySelector("#game")?.getAttribute("screen") === "game", null, { timeout: 15000 });
  await outroPage.evaluate((state) => {
    ClearScene();
    _queue = [];
    resetTimer();
    $ = state;
    Start_Outro();
  }, buildComingOutOutroState());
  await advanceComingOutUntil(
    outroPage,
    () => Array.from(document.querySelectorAll("#choices > div")).some((node) => /MY FEELS\./i.test(node.textContent || "")),
    "the first outro choice set"
  );
  await clickComingOutChoice(outroPage, "MY FEELS.");
  await advanceComingOutUntil(
    outroPage,
    () => Array.from(document.querySelectorAll("#choices > div")).some((node) => /freaking tell me/i.test(node.textContent || "")),
    "the closure prompt"
  );
  await clickComingOutChoice(outroPage, "Dude, I dunno, just freaking tell me.");
  await advanceComingOutUntil(
    outroPage,
    () => Array.from(document.querySelectorAll("#choices > div")).some((node) => /The Lie\./i.test(node.textContent || "")),
    "the outro story selection"
  );
  await outroPage.evaluate(() => Finale_4("REPLAY?"));
  await outroPage.waitForFunction(() => document.querySelector("#game")?.getAttribute("screen") === "credits", null, { timeout: 5000 });
  await outroPage.reload({ waitUntil: "load" });
  await outroPage.waitForFunction(() => document.querySelector("#game")?.getAttribute("screen") === "game", null, { timeout: 15000 });
  await advanceComingOutUntil(
    outroPage,
    () => document.querySelectorAll("#choices > div").length === 3,
    "the restarted opening menu"
  );
  console.log("OK coming-out outro and restart flow");
  await outroPage.close();
}

async function smokeCovid(context) {
  const articlePage = await context.newPage();
  await assertRoute(articlePage, "covid-19/", "#reference-footer");
  const embeddedStages = await articlePage.evaluate(() => {
    return Array.from(document.querySelectorAll("iframe[src*='sim/?stage=']")).map((frame) => ({
      src: frame.getAttribute("src") || "",
      title: frame.getAttribute("title")?.trim() || "",
      loading: frame.getAttribute("loading") || "",
    }));
  });
  assert(embeddedStages.some((frame) => frame.src.includes("stage=epi-7")), "covid-19 article is missing the SEIR-with-R stage");
  assert(embeddedStages.some((frame) => frame.src.includes("stage=int-4")), "covid-19 article is missing the lockdown stage");
  assert(embeddedStages.some((frame) => frame.src.includes("stage=yrs-5")), "covid-19 article is missing the ICU-capacity stage");
  assert(embeddedStages.some((frame) => frame.src.includes("stage=SB")), "covid-19 article is missing the sandbox stage");
  assert(embeddedStages.every((frame) => frame.title), "covid-19 article has an unnamed simulation iframe");
  assert(new Set(embeddedStages.map((frame) => frame.title)).size === embeddedStages.length, "covid-19 article reuses iframe titles");
  assert(embeddedStages.some((frame) => frame.loading === "lazy"), "covid-19 article does not lazy-load below-fold simulation iframes");
  console.log("OK covid article stage map");
  await articlePage.close();

  const seirPage = await context.newPage();
  await seirPage.goto(new URL("covid-19/sim/?stage=epi-7", baseUrl).href, {
    waitUntil: "load",
  });
  await seirPage.waitForSelector("#bb_start", { timeout: 15000 });
  await seirPage.waitForFunction(() => typeof daysCurrent === "number" && typeof restart === "function", null, { timeout: 10000 });
  const simAccessibility = await seirPage.evaluate(() => ({
    primaryIsButton: document.querySelector(".big_button")?.tagName === "BUTTON",
    resetIsButton: document.querySelector("#sb_reset")?.tagName === "BUTTON",
    replayIsButton: document.querySelector("#sb_replay")?.tagName === "BUTTON",
    namedInputs: Array.from(document.querySelectorAll("input")).every((input) => input.labels?.length > 0),
    graphDescription: document.querySelector("#graphCanvas")?.getAttribute("aria-describedby") === "graph_summary",
  }));
  assert(simAccessibility.primaryIsButton && simAccessibility.resetIsButton && simAccessibility.replayIsButton, "covid-19 simulation controls are not native buttons");
  assert(simAccessibility.namedInputs, "covid-19 simulation has an input without a native label");
  assert(simAccessibility.graphDescription, "covid-19 simulation graph is missing its text alternative");
  await seirPage.locator(".big_button").focus();
  await seirPage.keyboard.press("Enter");
  await seirPage.waitForFunction(() => daysCurrent > 5, null, { timeout: 10000 });
  await seirPage.waitForFunction(() => (document.querySelector("#graph_summary")?.textContent || "").trim().length > 0, null, { timeout: 5000 });
  await seirPage.locator(".big_button").click();
  await seirPage.locator("#sb_reset").click();
  await seirPage.waitForFunction(() => daysCurrent <= 1 && IS_PLAYING === false, null, { timeout: 5000 });
  console.log("OK covid SEIR run and reset");
  await seirPage.close();

  const calculatorPage = await context.newPage();
  await calculatorPage.goto(new URL("covid-19/sim/?stage=epi-6a&format=calc", baseUrl).href, {
    waitUntil: "load",
  });
  await calculatorPage.waitForFunction(() => {
    return (document.querySelector("#label_p_r0")?.textContent || "").trim().length > 0;
  }, null, { timeout: 10000 });
  const initialR0 = (await calculatorPage.locator("#label_p_r0").textContent())?.trim();
  await setRangeValue(calculatorPage, "#p_transmission", 8);
  await calculatorPage.waitForFunction((previousValue) => {
    return (document.querySelector("#label_p_r0")?.textContent || "").trim() !== previousValue;
  }, initialR0, { timeout: 5000 });
  const updatedR0 = parseFloat((await calculatorPage.locator("#label_p_r0").textContent()) || "0");
  assert(updatedR0 < parseFloat(initialR0 || "0"), "covid-19 R calculator did not respond to parameter changes");
  console.log("OK covid R calculator");
  await calculatorPage.close();

  const interventionPage = await context.newPage();
  await interventionPage.goto(new URL("covid-19/sim/?stage=int-4", baseUrl).href, {
    waitUntil: "load",
  });
  await interventionPage.waitForFunction(() => {
    return (document.querySelector("#label_p_re")?.textContent || "").trim().length > 0;
  }, null, { timeout: 10000 });
  const initialRe = parseFloat((await interventionPage.locator("#label_p_re").textContent()) || "0");
  await setRangeValue(interventionPage, "#p_distancing", 1);
  await setRangeValue(interventionPage, "#p_hygiene", 1);
  await interventionPage.waitForFunction((previousValue) => {
    const currentValue = parseFloat((document.querySelector("#label_p_re")?.textContent || "0").trim());
    return currentValue !== previousValue;
  }, initialRe, { timeout: 5000 });
  const updatedRe = parseFloat((await interventionPage.locator("#label_p_re").textContent()) || "0");
  assert(updatedRe < initialRe, "covid-19 intervention controls did not reduce the displayed R value");
  console.log("OK covid intervention controls");
  await interventionPage.close();

  const icuPage = await context.newPage();
  await icuPage.goto(new URL("covid-19/sim/?stage=yrs-5", baseUrl).href, {
    waitUntil: "load",
  });
  await icuPage.waitForFunction(() => {
    return (document.querySelector("#label_p_hospital")?.textContent || "").trim().length > 0;
  }, null, { timeout: 10000 });
  const initialHospital = (await icuPage.locator("#label_p_hospital").textContent())?.trim();
  await setRangeValue(icuPage, "#p_hospital", 800);
  await icuPage.waitForFunction((previousValue) => {
    return (document.querySelector("#label_p_hospital")?.textContent || "").trim() !== previousValue;
  }, initialHospital, { timeout: 5000 });
  await icuPage.evaluate(() => document.querySelector(".big_button").onclick());
  await icuPage.waitForFunction(() => daysCurrent > 5, null, { timeout: 10000 });
  console.log("OK covid ICU overlay stage");
  await icuPage.close();

  const sandboxPage = await context.newPage();
  await sandboxPage.goto(new URL("covid-19/sim/?stage=SB&format=sb", baseUrl).href, {
    waitUntil: "load",
  });
  await sandboxPage.waitForFunction(() => {
    return document.querySelector("#sandbox")?.getAttribute("data-simplebar") === "init";
  }, null, { timeout: 10000 });
  const initialYears = (await sandboxPage.locator("#label_p_years").textContent())?.trim();
  await setRangeValue(sandboxPage, "#p_years", 7.5);
  await setRangeValue(sandboxPage, "#p_masks", 0.3);
  await setRangeValue(sandboxPage, "#p_vaccines", 0.4);
  await sandboxPage.waitForFunction((previousValue) => {
    return (document.querySelector("#label_p_years")?.textContent || "").trim() !== previousValue;
  }, initialYears, { timeout: 5000 });
  const sandboxState = await sandboxPage.evaluate(() => {
    return {
      years: params.p_years,
      masks: params.p_masks,
      vaccines: params.p_vaccines,
    };
  });
  assert(
    Math.abs(sandboxState.years - 7.5) < 0.001 &&
    Math.abs(sandboxState.masks - 0.3) < 0.001 &&
    Math.abs(sandboxState.vaccines - 0.4) < 0.001,
    "covid-19 sandbox controls did not update"
  );
  console.log("OK covid sandbox controls");
  await sandboxPage.close();
}

async function smokeSimulating(context) {
  const launcherPage = await context.newPage();
  await assertRoute(launcherPage, "simulating/", "main");
  await launcherPage.waitForSelector("#reference-footer", { timeout: 15000 });
  const launcherLinks = await launcherPage.evaluate(() => {
    return Array.from(document.querySelectorAll("a")).map((link) => link.getAttribute("href") || "");
  });
  assert(launcherLinks.includes("../sim/"), "simulating launcher is missing the local sim link");
  assert(launcherLinks.includes("./original/"), "simulating launcher is missing the local original link");
  console.log("OK simulating launcher links");
  await launcherPage.close();

  const articlePage = await context.newPage();
  await assertRoute(articlePage, "simulating/original/", "#splash_iframe");
  await articlePage.waitForFunction(() => {
    return Boolean(document.querySelector("#reference-footer")) &&
      (document.querySelector("#zoo_iframe")?.getAttribute("src") || "").includes("../model/?local=zoo/sick");
  }, null, { timeout: 15000 });
  const initialZooSrc = await articlePage.locator("#zoo_iframe").getAttribute("src");
  await articlePage.click("#zoo_select > div:nth-child(2)");
  await articlePage.waitForFunction((previousSrc) => {
    const currentSrc = document.querySelector("#zoo_iframe")?.getAttribute("src") || "";
    return currentSrc !== previousSrc && currentSrc.includes("schelling");
  }, initialZooSrc, { timeout: 5000 });
  const exampleHref = await articlePage.locator("#zoo_example #example_link a").getAttribute("href");
  assert(
    (exampleHref || "").includes("/interactive-explanation/simulating/model/"),
    "simulating original example link did not localize to the nested model route",
  );
  console.log("OK simulating original article");
  await articlePage.close();

  const modelPage = await context.newPage();
  await modelPage.goto(new URL("simulating/model/?local=forest/1_fire&edit=2", baseUrl).href, {
    waitUntil: "load",
  });
  await modelPage.waitForFunction(() => {
    return typeof window.Save !== "undefined" &&
      typeof window.publish === "function" &&
      document.querySelectorAll(".editor_fancy_button").length >= 2;
  }, null, { timeout: 15000 });
  const initialPause = ((await modelPage.locator("#play_pause").textContent()) || "").trim();
  await modelPage.click("#play_pause");
  await modelPage.waitForFunction((previousLabel) => {
    return (document.querySelector("#play_pause")?.textContent || "").trim() !== previousLabel;
  }, initialPause, { timeout: 5000 });
  const initialBrush = await modelPage.locator("#play_draw > div").textContent();
  await modelPage.click("#play_draw");
  await modelPage.waitForFunction((previousBrush) => {
    return (document.querySelector("#play_draw > div")?.textContent || "") !== previousBrush;
  }, initialBrush || "", { timeout: 5000 });
  await modelPage.evaluate(() => {
    window.open = function smokeWindowOpen(url) {
      window.__simulatingExportUrl = url;
    };
    Save.uploadModel = function smokeSaveStub() {
      publish("/save/success", ["http://local.test/simulating-model"]);
    };
  });
  await modelPage.locator(".editor_fancy_button").filter({ hasText: "save your model" }).first().click();
  await modelPage.waitForFunction(() => {
    return Array.from(document.querySelectorAll(".editor_save_link")).some((input) => {
      return /simulating-model/.test(input.value || "");
    });
  }, null, { timeout: 5000 });
  await modelPage.locator(".editor_fancy_button").filter({ hasText: "export model" }).first().click();
  await modelPage.waitForFunction(() => {
    return typeof window.__simulatingExportUrl === "string" &&
      window.__simulatingExportUrl.startsWith("data:text/json");
  }, null, { timeout: 5000 });
  console.log("OK simulating model editor");
  await modelPage.close();
}

async function smokeNeurons(context) {
  const page = await context.newPage();
  await assertRoute(page, "neurons/", "iframe[title='Neurotic Neurons interactive']");
  const frame = page.frames().find((candidate) => /\/neurons\/interactive\.html$/.test(candidate.url()));
  assert(frame, "Neurons interactive frame did not load");
  await frame.waitForSelector("#canvas[loading='no']", { timeout: 30000 });
  const canvasName = await frame.locator("#canvas").getAttribute("aria-label");
  assert(Boolean(canvasName), "Neurons canvas lacked an accessible name");
  const controls = frame.locator("#control_play, #control_volume, #control_captions");
  assert(await controls.count() === 3, "Neurons native controls did not mount");
  assert(await controls.evaluateAll((elements) => elements.every((element) => element.tagName === "BUTTON" && Boolean(element.getAttribute("aria-label")))), "Neurons controls were not named native buttons");
  await frame.locator("#control_play").click();
  assert(await frame.locator("#control_play").getAttribute("aria-label") === "Resume", "Neurons play control did not expose paused state");
  await frame.locator("#control_volume").click();
  assert(await frame.locator("#control_volume").getAttribute("aria-label") === "Unmute", "Neurons volume control did not expose muted state");
  await frame.locator("#control_captions").click();
  assert(await frame.locator("#control_captions").getAttribute("aria-label") === "Show captions", "Neurons caption control did not expose hidden state");
  console.log("OK neurons accessible controls");
  await page.close();
}

async function readNormalizedLoopyTopology(page) {
  return page.evaluate(() => {
    const origin = loopy.model.nodes[0] || { x: 0, y: 0 };
    return {
      nodes: loopy.model.nodes.map(({ id, x, y, init, label, hue }) => ({ id, x: Math.round(x - origin.x), y: Math.round(y - origin.y), init, label, hue })),
      edges: loopy.model.edges.map(({ from, to, arc, strength }) => ({ from: from.id, to: to.id, arc: Math.round(arc), strength })),
      labels: loopy.model.labels.map(({ x, y, text }) => ({ x: Math.round(x - origin.x), y: Math.round(y - origin.y), text })),
    };
  });
}

async function smokeLoopy(context) {
  const page = await context.newPage();
  await assertRoute(page, "loopy/", "#sidebar");
  await page.waitForFunction(() => Boolean(window.loopy), null, { timeout: 15000 });
  await page.evaluate(() => publish("modal", ["examples"]));
  assert(await page.locator("iframe[title='LOOPY simulation examples']").count() === 1, "LOOPY examples frame lacked its deterministic title");
  await page.evaluate(() => publish("modal", ["embed"]));
  const preview = page.locator("iframe[title='LOOPY embed preview']");
  await preview.waitFor({ state: "visible", timeout: 5000 });
  const embedCode = await page.locator("#modal_page .component_output:visible").inputValue();
  assert(embedCode.includes('title="LOOPY simulation"'), "LOOPY generated embed code lacked a title");
  await page.evaluate(() => loopy.modal.hide());

  const editorSurface = page.locator("#canvasses");
  const editorSurfaceBox = await editorSurface.boundingBox();
  assert(editorSurfaceBox, "LOOPY editor had no pointer geometry");
  const drawCenter = {
    x: Math.min(800, editorSurfaceBox.width - 140),
    y: Math.min(700, editorSurfaceBox.height - 140),
  };
  const radius = 40;
  const initialNodeCount = await page.evaluate(() => loopy.model.nodes.length);
  const points = Array.from({ length: 13 }, (_, index) => {
    const angle = Math.PI * 2 * index / 12;
    return {
      x: editorSurfaceBox.x + drawCenter.x + Math.cos(angle) * radius,
      y: editorSurfaceBox.y + drawCenter.y + Math.sin(angle) * radius,
    };
  });
  await page.mouse.move(points[0].x, points[0].y);
  await page.mouse.down();
  for (const point of points.slice(1)) {
    await page.mouse.move(point.x, point.y, { steps: 2 });
  }
  await page.mouse.up();
  await page.waitForFunction((count) => loopy.model.nodes.length === count + 1, initialNodeCount, { timeout: 5000 });
  const drawnState = await page.evaluate(() => {
    const node = loopy.model.nodes.at(-1);
    return {
      nodeCount: loopy.model.nodes.length,
      node: { x: Math.round(node.x), y: Math.round(node.y) },
      serialized: loopy.model.serialize(),
      savedUrl: loopy.saveToURL(),
    };
  });
  drawnState.model = await readNormalizedLoopyTopology(page);
  assert(Math.abs(drawnState.node.x - drawCenter.x) <= 2 && Math.abs(drawnState.node.y - drawCenter.y) <= 2, "LOOPY pointer coordinates did not map to the drawn node");
  const savedNode = JSON.parse(new URL(drawnState.savedUrl).searchParams.get("data"))[0].at(-1);
  assert(savedNode[1] === drawnState.node.x && savedNode[2] === drawnState.node.y, "LOOPY shared URL did not preserve drawn node coordinates");
  await page.goto(drawnState.savedUrl, { waitUntil: "load" });
  await page.waitForFunction(() => Boolean(window.loopy), null, { timeout: 15000 });
  const restoredState = await page.evaluate(() => ({
    nodeCount: loopy.model.nodes.length,
    serialized: loopy.model.serialize(),
  }));
  restoredState.model = await readNormalizedLoopyTopology(page);
  assert(JSON.stringify(restoredState.model) === JSON.stringify(drawnState.model), "LOOPY shared URL did not restore the editor model");
  assert(restoredState.nodeCount === drawnState.nodeCount, "LOOPY shared URL did not restore every node");
  await page.locator("#playbar .component_button").filter({ hasText: "Play" }).click();
  assert(await page.evaluate(() => loopy.mode) === 1, "LOOPY play control did not enter simulation mode");
  await page.evaluate(() => {
    loopy.model.nodes[0].value = loopy.model.nodes[0].init + 0.25;
  });
  await page.locator("#playbar .component_button").filter({ hasText: "Reset" }).click();
  const resetState = await page.evaluate(() => ({
    value: loopy.model.nodes[0].value,
    initialValue: loopy.model.nodes[0].init,
  }));
  assert(resetState.value === resetState.initialValue, "LOOPY reset control did not restore node state");
  await page.locator("#playbar .component_button").filter({ hasText: "Stop" }).click();
  await page.evaluate(() => {
    window.__loopyExportLink = null;
    HTMLAnchorElement.prototype.click = function smokeAnchorClick() {
      window.__loopyExportLink = {
        href: this.getAttribute("href") || "",
        download: this.getAttribute("download") || "",
      };
    };
  });
  const exportedModel = await page.evaluate(() => loopy.model.serialize());
  await page.locator("#sidebar .mini_button").filter({ hasText: "save as file" }).click();
  const exportLink = await page.evaluate(() => window.__loopyExportLink);
  assert(exportLink?.download === "system_model.loopy" && exportLink.href.startsWith("data:text/plain"), "LOOPY export control did not emit a local model file");
  assert(exportLink.href.slice(exportLink.href.indexOf(",") + 1) === exportedModel, "LOOPY export control did not preserve exact model data");
  await page.evaluate(() => loopy.model.clear());
  assert(await page.evaluate(() => loopy.model.nodes.length) === 0, "LOOPY import precondition did not clear the editor model");
  const fileChooserPromise = page.waitForEvent("filechooser");
  await page.locator("#sidebar .mini_button").filter({ hasText: "load from file" }).click();
  const fileChooser = await fileChooserPromise;
  await fileChooser.setFiles({
    name: "system_model.loopy",
    mimeType: "text/plain",
    buffer: Buffer.from(decodeURIComponent(exportedModel)),
  });
  await page.waitForFunction((serialized) => loopy.model.serialize() === serialized, exportedModel, { timeout: 5000 });
  console.log("OK loopy pointer drawing, play/reset, import/export, share persistence, and iframe titles");
  await page.close();
}

async function smokeTrust(context) {
  const page = await context.newPage();
  await assertRoute(page, "trust/", "#main");
  await page.waitForFunction(() => {
    return document.querySelector("#main")?.getAttribute("aria-busy") === "false" &&
      window.slideshow?.slideIndex === 0 &&
      window.slideshow?.objects?.loading_button?.active;
  }, null, { timeout: 30000 });
  await page.locator("#slideshow .button #hitbox").click();
  await page.waitForFunction(() => window.slideshow?.slideIndex === 1 && window.slideshow?.currentSlide?.id === "intro", null, { timeout: 5000 });
  const slideState = await page.evaluate(() => {
    const select = document.querySelector("#select");
    return {
      slideIndex: slideshow.slideIndex,
      slideId: slideshow.currentSlide.id,
      nativeControlsVisible: Boolean(select && getComputedStyle(select).display !== "none"),
    };
  });
  assert(slideState.slideIndex === 1 && slideState.slideId === "intro" && slideState.nativeControlsVisible, "Trust start control did not advance the slideshow and reveal native navigation");
  await page.locator("#sound").click();
  const soundState = await page.evaluate(() => ({
    control: document.querySelector("#sound")?.getAttribute("sound"),
    muted: Howler._muted,
  }));
  assert(soundState.control === "off" && soundState.muted === true, "Trust sound control did not mute the runtime audio");
  console.log("OK trust slideshow and audio controls");
  await page.close();
}

async function smokeTrustFallback(context) {
  const page = await context.newPage();
  await page.route("**/trust/words.html*", (route) => route.fulfill({ status: 500, body: "failed" }));
  await page.goto(new URL("trust/", baseUrl).href, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.querySelector("main")?.getAttribute("aria-busy") === "false", null, { timeout: 15000 });
  const main = page.locator("main");
  assert(await main.isVisible(), "Trust failure fallback main remained hidden");
  assert(/could not load/i.test(await main.textContent()), "Trust failure fallback did not explain the failure");
  console.log("OK trust load failure fallback");
  await page.close();
}

async function smokeSim(context) {
  const simPage = await context.newPage();
  await assertRoute(simPage, "sim/", "#play_controls");
  await simPage.waitForFunction(() => {
    return Array.isArray(window.Model?.data?.states) &&
      window.Model.data.states.length > 0 &&
      document.querySelectorAll(".editor_fancy_button").length >= 2;
  }, null, { timeout: 15000 });
  const initialPause = ((await simPage.locator("#play_pause").textContent()) || "").trim();
  await simPage.click("#play_pause");
  await simPage.waitForFunction((previousLabel) => {
    return (document.querySelector("#play_pause")?.textContent || "").trim() !== previousLabel;
  }, initialPause, { timeout: 5000 });
  await setRangeValue(simPage, "#control_fps", 12);
  await simPage.waitForFunction(() => window.Model?.data?.meta?.fps === 12, null, { timeout: 5000 });
  const initialBrush = await simPage.locator("#play_draw > div").textContent();
  await simPage.click("#play_draw");
  await simPage.waitForFunction((previousBrush) => {
    return (document.querySelector("#play_draw > div")?.textContent || "") !== previousBrush;
  }, initialBrush || "", { timeout: 5000 });
  await simPage.setViewportSize({ width: 1399, height: 1000 });
  await simPage.setViewportSize({ width: 1400, height: 1000 });
  await simPage.waitForFunction(() => Grid.tileSize > 0, null, { timeout: 5000 });
  const drawTarget = await simPage.evaluate(() => {
    const brushState = Model.data.meta.draw;
    const rect = Grid.dom.getBoundingClientRect();
    for (let visualY = 0; visualY < Grid.array.length; visualY += 1) {
      for (let visualX = 0; visualX < Grid.array[visualY].length; visualX += 1) {
        const clientX = rect.left + (visualX + 0.5) * Grid.tileSize;
        const clientY = rect.top + (visualY + 0.5) * Grid.tileSize;
        const x = Math.floor((clientX - Grid.dom.offsetLeft) / Grid.tileSize);
        const y = Math.floor((clientY - Grid.dom.offsetTop) / Grid.tileSize);
        if (
          clientY > 70 &&
          x >= 0 && x < Grid.array[0].length &&
          y >= 0 && y < Grid.array.length &&
          Grid.array[y][x].stateID !== brushState
        ) {
          return { x, y, brushState, initialState: Grid.array[y][x].stateID, clientX, clientY };
        }
      }
    }
    return null;
  });
  assert(drawTarget, "sim did not expose a safe cell distinct from the active brush state");
  await simPage.mouse.click(drawTarget.clientX, drawTarget.clientY);
  const drawnCellState = await simPage.evaluate(({ x, y }) => Grid.array[y][x].stateID, drawTarget);
  assert(drawnCellState === drawTarget.brushState && drawnCellState !== drawTarget.initialState, "sim pointer drawing did not apply the active brush state");
  const expectedModel = await simPage.evaluate(() => JSON.stringify(Model.data));
  await simPage.locator(".editor_fancy_button").filter({ hasText: "save your model" }).first().click();
  await simPage.waitForFunction(() => {
    return Array.from(document.querySelectorAll(".editor_save_link")).some((input) => {
      return /\?lz=/.test(input.value || "");
    });
  }, null, { timeout: 10000 });
  const savedUrl = await simPage.locator(".editor_save_link").evaluateAll((inputs) => {
    return inputs.map((input) => input.value || "").find((value) => /\?lz=/.test(value)) || "";
  });
  const savedModel = await simPage.evaluate((url) => {
    const compressed = new URL(url).searchParams.get("lz");
    return LZString.decompressFromEncodedURIComponent(compressed);
  }, savedUrl);
  assert(savedModel === expectedModel, "sim save link did not preserve the edited model payload");
  await simPage.evaluate(() => {
    window.open = function smokeWindowOpen(url) {
      window.__simExportUrl = url;
    };
  });
  await simPage.locator(".editor_fancy_button").filter({ hasText: "export model" }).first().click();
  await simPage.waitForFunction(() => {
    return typeof window.__simExportUrl === "string" &&
      window.__simExportUrl.startsWith("data:text/json");
  }, null, { timeout: 5000 });
  const exportedModel = await simPage.evaluate(() => {
    return window.__simExportUrl.slice(window.__simExportUrl.indexOf(",") + 1);
  });
  assert(exportedModel === expectedModel, "sim export did not preserve the edited model payload");
  await simPage.close();

  const restoredPage = await context.newPage();
  await restoredPage.goto(savedUrl, { waitUntil: "load" });
  await restoredPage.waitForFunction(() => document.querySelector("main")?.getAttribute("aria-busy") === "false" && window.Model?.data?.meta?.fps === 12, null, { timeout: 15000 });
  const restoredModel = await restoredPage.evaluate(() => JSON.stringify(Model.data));
  assert(restoredModel === expectedModel, "sim save link did not restore the edited model state");
  console.log("OK sim controls and semantic save/export round trips");
  await restoredPage.close();

  const presetPage = await context.newPage();
  await presetPage.goto(new URL("sim/?s=schelling", baseUrl).href, {
    waitUntil: "load",
  });
  await presetPage.waitForFunction(() => /hamsters/i.test(window.Editor?.descriptionDOM?.value || ""), null, {
    timeout: 15000,
  });
  const description = await presetPage.evaluate(() => window.Editor.descriptionDOM.value);
  assert(description.includes("../polygons/"), "sim schelling preset did not localize the polygons reference");
  console.log("OK sim preset loading");
  await presetPage.close();

  for (const query of ["?lz=invalid", "?lz=%E0%A4%A"]) {
    const failurePage = await context.newPage();
    await failurePage.goto(new URL(`sim/${query}`, baseUrl).href, { waitUntil: "domcontentloaded" });
    await failurePage.waitForFunction(() => document.querySelector("main")?.getAttribute("aria-busy") === "false", null, { timeout: 15000 });
    const main = failurePage.locator("main");
    assert(await main.isVisible(), `sim ${query} failure fallback main remained hidden`);
    assert(/could not load/i.test(await main.textContent()), `sim ${query} failure fallback did not explain the failure`);
    await failurePage.close();
  }
  console.log("OK sim malformed URL fallbacks");
}

async function smokeDecisionTree(context) {
  const page = await context.newPage();
  await assertRoute(page, "decision-tree/", "#reference-footer");
  await assertEngineeringSandboxShell(page, "decision-tree route", { minimumChapters: 6, navMode: "generated", expectedFamily: "mlu-pilot" });
  await page.waitForFunction(() => {
    return document.querySelector("#chart svg") &&
      document.querySelector("#entropy-chart svg") &&
      document.querySelector("#entropy-chart-scatter svg");
  }, null, { timeout: 15000 });
  const localHandoff = await page.locator("#limitations a").getAttribute("href");
  assert(localHandoff === "../random-forest/", "decision-tree handoff did not localize to the random-forest route");
  console.log("OK decision-tree route shell");

  await page.locator("#moremoremoresplit").scrollIntoViewIfNeeded();
  await page.waitForFunction(() => {
    return (document.querySelector("#chart")?.textContent || "").includes("Height ≤ 7.14");
  }, null, { timeout: 10000 });
  console.log("OK decision-tree depth progression");

  await page.locator("#splits").scrollIntoViewIfNeeded();
  await page.click("#positive-add");
  await page.waitForFunction(() => {
    return /# Positive Class:\s*4/i.test(document.querySelector("#entropy-label-1")?.textContent || "");
  }, null, { timeout: 5000 });
  console.log("OK decision-tree entropy controls");

  await page.locator("#informationgain").scrollIntoViewIfNeeded();
  await page.waitForFunction(() => {
    return (document.querySelector("#ig-tooltip-ig")?.textContent || "").trim().length > 0;
  }, null, { timeout: 5000 });
  const initialIg = (await page.locator("#ig-tooltip-ig").textContent())?.trim();
  await page.evaluate(() => {
    const overlay = Array.from(document.querySelectorAll("#entropy-chart-scatter-svg rect, #entropy-chart-ig-svg rect")).find((node) => {
      return Array.isArray(node.__on) && node.__on.some((listener) => listener.type === "mousemove");
    });

    if (!overlay) {
      throw new Error("decision-tree information gain overlay did not render");
    }

    const box = overlay.getBoundingClientRect();
    const eventInit = {
      bubbles: true,
      clientX: box.left + box.width * 0.2,
      clientY: box.top + box.height * 0.45,
      view: window,
    };
    overlay.dispatchEvent(new MouseEvent("mouseover", eventInit));
    overlay.dispatchEvent(new MouseEvent("mousemove", eventInit));
  });
  await page.waitForFunction((previousValue) => {
    return (document.querySelector("#ig-tooltip-ig")?.textContent || "").trim() !== previousValue;
  }, initialIg, { timeout: 5000 });
  await assertViewportUsable(page, "decision-tree route");
  await assertEngineeringSandboxLayout(context, "decision-tree/", "decision-tree route", { navMode: "generated" });
  console.log("OK decision-tree information gain hover");
  await page.close();
}

async function smokeRandomForest(context) {
  const page = await context.newPage();
  await assertRoute(page, "random-forest/", "#reference-footer");
  await assertEngineeringSandboxShell(page, "random-forest route", { minimumChapters: 5, navMode: "generated", expectedFamily: "mlu-pilot" });
  await page.waitForFunction(() => {
    return document.querySelector("#gridOfTrees svg") &&
      document.querySelector("#chart-rf") &&
      document.querySelector("#barcode-chart svg");
  }, null, { timeout: 20000 });
  const localDecisionLinks = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('a[href="../decision-tree/"]')).length;
  });
  assert(localDecisionLinks >= 2, "random-forest did not localize the decision-tree cross-links");
  console.log("OK random-forest route shell");

  await setRangeValue(page, "#numSlider", 25);
  await page.waitForFunction(() => {
    return (document.querySelector("#numTrees-value")?.textContent || "").includes("25");
  }, null, { timeout: 5000 });
  await setRangeValue(page, "#probSlider", 0.82);
  await page.waitForFunction(() => {
    return (document.querySelector("#probability-value")?.textContent || "").includes("82%");
  }, null, { timeout: 5000 });
  console.log("OK random-forest slider controls");

  for (const step of ["8", "9", "10"]) {
    await page.locator(`section.rf-scrolly[data-index="${step}"]`).scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
  }
  await page.waitForFunction(() => {
    return Number.parseFloat(getComputedStyle(document.querySelector("#clickme-text")).opacity || "0") > 0;
  }, null, { timeout: 10000 });
  const targetId = await page.evaluate(() => {
    const nodes = Array.from(document.querySelectorAll('.testData g[id^="c"]'));
    const target = nodes.find((node) => {
      return typeof node.getBBox === "function" && node.getBBox().width > 0;
    });
    return target ? target.id : null;
  });
  assert(targetId, "random-forest did not expose a visible click-to-predict target");
  await page.evaluate((id) => {
    const target = document.querySelector(`.testData g#${id}`);
    if (!target) {
      throw new Error("random-forest click target disappeared");
    }
    target.dispatchEvent(new MouseEvent("click", { bubbles: true, view: window }));
  }, targetId);
  await page.waitForFunction(() => {
    return /Majority:/i.test(document.querySelector("#t3")?.textContent || "");
  }, null, { timeout: 8000 });
  console.log("OK random-forest click-to-predict flow");

  await page.locator("#barcode").scrollIntoViewIfNeeded();
  await page.waitForFunction(() => {
    return (document.querySelector("#barcode-chart")?.textContent || "").includes("RANDOM FOREST");
  }, null, { timeout: 10000 });
  await page.locator("#cantor-section").scrollIntoViewIfNeeded();
  await page.waitForFunction(() => {
    return (document.querySelector("#cantor-scatter")?.textContent || "").includes("Forest");
  }, null, { timeout: 10000 });
  await assertViewportUsable(page, "random-forest route");
  await assertEngineeringSandboxLayout(context, "random-forest/", "random-forest route", { navMode: "generated" });
  console.log("OK random-forest ensemble panels");
  await page.close();
}

async function smokeConditionalProbability(context) {
  const page = await context.newPage();
  await assertRoute(page, "conditional-probability/", "#reference-footer");
  await assertEngineeringSandboxShell(page, "conditional-probability route", {
    minimumChapters: 4,
    navMode: "generated",
    expectedFamily: "ev-essay",
    expectedRoute: "conditional-probability",
  });
  await page.waitForFunction(() => {
    return document.querySelector("waterfall svg") &&
      document.querySelectorAll("bar-chart svg").length === 2;
  }, null, { timeout: 15000 });

  await setRangeValue(page, 'input[ng-model="pOfA"]', 0.4);
  await setRangeValue(page, 'input[ng-model="pOfB"]', 0.6);
  await setRangeValue(page, 'input[ng-model="pOfAAndB"]', 0.2);
  await page.waitForFunction(() => {
    const scope = angular.element(document.body).scope();
    return Math.abs(scope.pOfBGivenA - 0.5) < 0.02 &&
      Math.abs(scope.pOfAGivenB - (1 / 3)) < 0.03 &&
      document.querySelectorAll("bar-chart svg rect").length >= 4;
  }, null, { timeout: 5000 });

  await page.locator("button").filter({ hasText: "P(A|B)" }).click();
  await page.waitForFunction(() => {
    const scope = angular.element(document.body).scope();
    return scope.perspective === "P(A|B)" &&
      (document.querySelector("button.active")?.textContent || "").includes("P(A|B)");
  }, null, { timeout: 5000 });

  await page.locator("button").filter({ hasText: "P(B|A)" }).click();
  await page.waitForFunction(() => {
    const scope = angular.element(document.body).scope();
    return scope.perspective === "P(B|A)" &&
      (document.querySelector("button.active")?.textContent || "").includes("P(B|A)");
  }, null, { timeout: 5000 });
  console.log("OK conditional-probability controls");
  await assertViewportUsable(page, "conditional-probability route");
  await assertEngineeringSandboxLayout(context, "conditional-probability/", "conditional-probability route", {
    navMode: "generated",
  });
  await page.close();
}

async function smokeMarkovChains(context) {
  const page = await context.newPage();
  const assertPageRuntimeClean = createRuntimeMonitor(page);
  await assertRoute(page, "markov-chains/", "#reference-footer");
  await assertEngineeringSandboxShell(page, "markov-chains route", {
    minimumChapters: 5,
    navMode: "generated",
    expectedFamily: "ev-essay",
    expectedRoute: "markov-chains",
  });
  await page.waitForFunction(() => {
    return document.querySelectorAll(".st-diagram svg").length >= 2 &&
      document.querySelector("iframe.playground");
  }, null, { timeout: 20000 });

  const initialSrc = await page.locator("iframe.playground").getAttribute("src");
  assert(
    (initialSrc || "").startsWith("./playground/"),
    "markov-chains iframe did not localize to the local playground",
  );

  await setRangeValue(page, 'div[ng-controller="TransitionMatrixCtrl"] input[ng-model="transitionMatrix[0][0]"]', 0.8);
  await page.waitForFunction(() => {
    const scope = angular.element(document.querySelector('[ng-controller="TransitionMatrixCtrl"]')).scope();
    return Math.abs(scope.transitionMatrix[0][0] - 0.8) < 0.02 &&
      Math.abs(scope.transitionMatrix[0][1] - 0.2) < 0.02;
  }, null, { timeout: 5000 });

  await page.locator("a").filter({ hasText: "ex1" }).click();
  await page.waitForFunction((previousSrc) => {
    const currentSrc = document.querySelector("iframe.playground")?.getAttribute("src") || "";
    return currentSrc !== previousSrc && currentSrc.includes("./playground/?");
  }, initialSrc, { timeout: 5000 });

  const fullscreenHref = await page.locator('a[href="./playground/"]').getAttribute("href");
  assert(fullscreenHref === "./playground/", "markov-chains fullscreen handoff did not localize");
  await page.waitForTimeout(250);
  assertPageRuntimeClean("markov-chains article");
  await assertViewportUsable(page, "markov-chains route");
  await assertEngineeringSandboxLayout(context, "markov-chains/", "markov-chains route", { navMode: "generated" });
  console.log("OK markov-chains article handoff");
  await page.close();

  const directoryPlaygroundPage = await context.newPage();
  const assertDirectoryRuntimeClean = createRuntimeMonitor(directoryPlaygroundPage);
  await assertRoute(directoryPlaygroundPage, "markov-chains/playground/", "#reference-footer");
  await directoryPlaygroundPage.waitForSelector(".matrixInput textarea", { timeout: 15000 });
  await directoryPlaygroundPage.locator(".matrixInput textarea").fill("[[0.3,0.3,0.4],[0.3,0.5,0.2],[0.4,0.4,0.2]]");
  await directoryPlaygroundPage.waitForFunction(() => {
    const scope = angular.element(document.body).scope();
    return scope.validTransitionMatrix === true && Array.isArray(scope.states) && scope.states.length === 3;
  }, null, { timeout: 5000 });
  await directoryPlaygroundPage.waitForTimeout(250);
  assertDirectoryRuntimeClean("markov-chains directory playground");
  console.log("OK markov-chains directory playground editor");
  await directoryPlaygroundPage.close();

  const playgroundPage = await context.newPage();
  const assertDirectRuntimeClean = createRuntimeMonitor(playgroundPage);
  await assertRoute(playgroundPage, "markov-chains/playground/playground.html", "#reference-footer");
  await playgroundPage.waitForSelector(".matrixInput textarea", { timeout: 15000 });
  await playgroundPage.waitForTimeout(250);
  assertDirectRuntimeClean("markov-chains direct playground");
  console.log("OK markov-chains direct playground route");
  await playgroundPage.close();
}

async function smokePrincipalComponentAnalysis(context) {
  const page = await context.newPage();
  const assertPageRuntimeClean = createRuntimeMonitor(page);
  await assertRoute(page, "principal-component-analysis/", "#reference-footer");
  await assertEngineeringSandboxShell(page, "principal-component-analysis route", {
    minimumChapters: 3,
    navMode: "generated",
    expectedFamily: "ev-essay",
    expectedRoute: "principal-component-analysis",
  });
  await page.waitForFunction(() => {
    return document.querySelector("pca-d2 svg") &&
      document.querySelector("pca-d1 svg") &&
      document.querySelector("defra-table svg") &&
      document.querySelector("defra-d1 svg") &&
      document.querySelector("defra-d2 svg") &&
      document.querySelectorAll("pca-three-plot canvas").length >= 3;
  }, null, { timeout: 30000 });

  const beforeDrag = await page.evaluate(() => {
    const scope = angular.element(document.body).scope();
    return {
      sample: scope.samples[0].c.slice(),
      pcaSample: scope.pcaSamples[0].slice(),
      pcaVector: scope.pcaVectors[0].slice(),
    };
  });
  await page.waitForSelector("pca-d2 .nob", { timeout: 15000 });
  await page.evaluate(() => {
    const scope = angular.element(document.body).scope();
    scope.$apply(() => {
      scope.updateSample(scope.samples[0], [4.8, 6.1]);
    });
  });
  await page.waitForFunction((before) => {
    const scope = angular.element(document.body).scope();
    return Math.abs(scope.samples[0].c[0] - before.sample[0]) > 0.05 &&
      Math.abs(scope.samples[0].c[1] - before.sample[1]) > 0.05 &&
      Math.abs(scope.pcaSamples[0][0] - before.pcaSample[0]) > 0.05 &&
      Math.abs(scope.pcaVectors[0][0] - before.pcaVector[0]) > 0.01;
  }, beforeDrag, { timeout: 5000 });
  console.log("OK principal-component-analysis 2D recompute");

  async function overlaySignature() {
    return page.evaluate(() => {
      const canvas = document.querySelectorAll("pca-three-plot canvas")[2];
      const context = canvas?.getContext("2d");
      if (!canvas || !context) {
        return null;
      }

      const data = context.getImageData(0, 0, canvas.width, canvas.height).data;
      let total = 0;
      for (let index = 0; index < data.length; index += 97) {
        total = (total + data[index] + data[index + 1] * 3 + data[index + 2] * 5 + data[index + 3] * 7) % 2147483647;
      }
      return total;
    });
  }

  const initialOverlay = await overlaySignature();
  assert(initialOverlay !== null, "principal-component-analysis 3D overlay canvas did not render");
  await page.locator("button").filter({ hasText: /^show PCA$/i }).click();
  await page.waitForTimeout(1200);
  const afterShowPca = await overlaySignature();
  assert(afterShowPca !== initialOverlay, "principal-component-analysis show PCA button did not change the projected overlay");

  const projectionCanvas = page.locator("pca-three-plot canvas").nth(1);
  const projectionCanvasBox = await projectionCanvas.boundingBox();
  assert(projectionCanvasBox, "principal-component-analysis 3D projection canvas did not render");
  await page.mouse.move(projectionCanvasBox.x + projectionCanvasBox.width / 2, projectionCanvasBox.y + projectionCanvasBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    projectionCanvasBox.x + projectionCanvasBox.width / 2 + 54,
    projectionCanvasBox.y + projectionCanvasBox.height / 2 - 30,
    { steps: 12 },
  );
  await page.mouse.up();
  await page.waitForTimeout(900);
  const afterCameraDrag = await overlaySignature();
  assert(afterCameraDrag !== afterShowPca, "principal-component-analysis 3D drag did not change the projected overlay");

  await page.locator("button").filter({ hasText: /^reset$/i }).click();
  await page.waitForTimeout(1200);
  const afterReset = await overlaySignature();
  assert(afterReset !== afterCameraDrag, "principal-component-analysis reset button did not change the projected overlay");
  console.log("OK principal-component-analysis 3D controls");

  const datasetState = await page.evaluate(() => {
    const text = Array.from(document.querySelectorAll("defra-table svg text, defra-d1 svg text, defra-d2 svg text"))
      .map((node) => (node.textContent || "").trim())
      .filter(Boolean);
    return {
      tableRects: document.querySelectorAll("defra-table svg rect").length,
      d1Points: document.querySelectorAll("defra-d1 svg circle").length,
      d2Points: document.querySelectorAll("defra-d2 svg circle").length,
      text,
    };
  });
  assert(datasetState.tableRects >= 60, "principal-component-analysis DEFRA table did not render its data cells");
  assert(datasetState.d1Points === 4, "principal-component-analysis 1D DEFRA plot did not render four country points");
  assert(datasetState.d2Points === 4, "principal-component-analysis 2D DEFRA plot did not render four country points");
  assert(datasetState.text.includes("England"), "principal-component-analysis DEFRA labels are missing England");
  assert(datasetState.text.includes("Wales"), "principal-component-analysis DEFRA labels are missing Wales");
  assert(datasetState.text.includes("Scotland"), "principal-component-analysis DEFRA labels are missing Scotland");
  assert(datasetState.text.includes("N Ireland"), "principal-component-analysis DEFRA labels are missing N Ireland");
  assert(datasetState.text.includes("pc1"), "principal-component-analysis DEFRA plots are missing the pc1 label");
  assert(datasetState.text.includes("pc2"), "principal-component-analysis DEFRA plots are missing the pc2 label");
  await page.waitForTimeout(250);
  assertPageRuntimeClean("principal-component-analysis route");
  await assertViewportUsable(page, "principal-component-analysis route");
  await assertEngineeringSandboxLayout(context, "principal-component-analysis/", "principal-component-analysis route", {
    navMode: "generated",
  });
  console.log("OK principal-component-analysis dataset views");
  await page.close();
}

async function smokeExponentiation(context) {
  const page = await context.newPage();
  const assertPageRuntimeClean = createRuntimeMonitor(page);
  await assertRoute(page, "exponentiation/", "#reference-footer");
  await assertEngineeringSandboxShell(page, "exponentiation route", {
    minimumChapters: 5,
    navMode: "generated",
    expectedFamily: "ev-essay",
    expectedRoute: "exponentiation",
  });
  await page.waitForFunction(() => {
    return document.querySelector("simple-growth svg") &&
      document.querySelectorAll("growth-demo svg").length === 2 &&
      document.querySelector("virus-demo canvas") &&
      document.querySelector("virus-demo svg");
  }, null, { timeout: 30000 });

  await page.waitForFunction(() => document.querySelectorAll("simple-growth .block").length >= 4, null, { timeout: 10000 });
  await page.locator('div[ng-controller="SimpleGrowthCtrl"] select').selectOption({ label: "x4" });
  await setRangeValue(page, 'div[ng-controller="SimpleGrowthCtrl"] input[ng-model="opts.steps"]', 3);
  await setRangeValue(page, 'div[ng-controller="SimpleGrowthCtrl"] input[ng-model="opts.speed"]', 10);
  await page.waitForFunction(() => {
    const scope = angular.element(document.querySelector('[ng-controller="SimpleGrowthCtrl"]')).scope();
    const text = document.querySelector('[ng-controller="SimpleGrowthCtrl"] p')?.textContent || "";
    return +scope.opts.rate === 4 &&
      +scope.opts.steps === 3 &&
      +scope.opts.speed === 10 &&
      /quadrupling/i.test(text);
  }, null, { timeout: 5000 });
  await page.locator('div[ng-controller="SimpleGrowthCtrl"] button').click();
  await page.waitForTimeout(300);
  await page.waitForFunction(() => document.querySelectorAll("simple-growth .block").length >= 4, null, { timeout: 5000 });
  console.log("OK exponentiation simple growth controls");

  await page.waitForFunction(() => {
    return document.querySelectorAll('[ng-controller="LinearGrowthDemoCtrl"] growth-demo rect.block').length >= 2;
  }, null, { timeout: 10000 });
  await page.locator('div[ng-controller="LinearGrowthDemoCtrl"] select').selectOption({ label: "+5" });
  await setRangeValue(page, 'div[ng-controller="LinearGrowthDemoCtrl"] input[ng-model="opts.steps"]', 12);
  await setRangeValue(page, 'div[ng-controller="LinearGrowthDemoCtrl"] input[ng-model="opts.speed"]', 20);
  await page.waitForFunction(() => {
    const scope = angular.element(document.querySelector('[ng-controller="LinearGrowthDemoCtrl"]')).scope();
    const labels = Array.from(document.querySelectorAll('[ng-controller="LinearGrowthDemoCtrl"] growth-demo text'))
      .map((node) => node.textContent || "");
    return +scope.opts.rate === 5 &&
      +scope.opts.steps === 12 &&
      +scope.opts.speed === 20 &&
      labels.some((label) => /\+5/.test(label));
  }, null, { timeout: 5000 });
  await page.locator('div[ng-controller="LinearGrowthDemoCtrl"] button').click();
  await page.waitForTimeout(300);
  await page.waitForFunction(() => {
    return document.querySelectorAll('[ng-controller="LinearGrowthDemoCtrl"] growth-demo rect.block').length >= 1;
  }, null, { timeout: 5000 });
  console.log("OK exponentiation linear growth controls");

  await page.waitForFunction(() => {
    return document.querySelectorAll('[ng-controller="ExponentialGrowthDemoCtrl"] growth-demo rect.block').length >= 2;
  }, null, { timeout: 10000 });
  await page.locator('div[ng-controller="ExponentialGrowthDemoCtrl"] select').selectOption({ label: "x4" });
  await setRangeValue(page, 'div[ng-controller="ExponentialGrowthDemoCtrl"] input[ng-model="opts.steps"]', 6);
  await setRangeValue(page, 'div[ng-controller="ExponentialGrowthDemoCtrl"] input[ng-model="opts.speed"]', 20);
  await page.waitForFunction(() => {
    const scope = angular.element(document.querySelector('[ng-controller="ExponentialGrowthDemoCtrl"]')).scope();
    const labels = Array.from(document.querySelectorAll('[ng-controller="ExponentialGrowthDemoCtrl"] growth-demo text'))
      .map((node) => node.textContent || "");
    return +scope.opts.rate === 4 &&
      +scope.opts.steps === 6 &&
      +scope.opts.speed === 20 &&
      labels.some((label) => /x4/.test(label));
  }, null, { timeout: 5000 });
  await page.locator('div[ng-controller="ExponentialGrowthDemoCtrl"] button').click();
  await page.waitForTimeout(300);
  await page.waitForFunction(() => {
    const labels = Array.from(document.querySelectorAll('[ng-controller="ExponentialGrowthDemoCtrl"] growth-demo text'))
      .map((node) => node.textContent || "");
    return labels.some((label) => /x4/.test(label));
  }, null, { timeout: 5000 });
  console.log("OK exponentiation exponential growth controls");

  await page.waitForFunction(() => {
    return Array.isArray(window.nodes) &&
      window.nodes.some((node) => node.generation === 0) &&
      document.querySelectorAll("virus-demo .values line").length >= 2;
  }, null, { timeout: 10000 });
  await setRangeValue(page, 'div[ng-controller="ViralDemoCtrl"] input[ng-model="opts.speed"]', 10);
  await page.waitForFunction(() => {
    const scope = angular.element(document.querySelector('[ng-controller="ViralDemoCtrl"]')).scope();
    return +scope.opts.speed === 10;
  }, null, { timeout: 5000 });
  await page.locator('div[ng-controller="ViralDemoCtrl"] button').click();
  await page.waitForFunction(() => {
    return Array.isArray(window.nodes) &&
      window.nodes.filter((node) => node.generation === 0).length === 1 &&
      window.nodes.filter((node) => node.infection > 0).length <= 1;
  }, null, { timeout: 5000 });
  await page.waitForFunction(() => {
    return Array.isArray(window.nodes) &&
      window.nodes.filter((node) => node.infection > 0).length > 1 &&
      document.querySelectorAll("virus-demo .values line").length >= 2;
  }, null, { timeout: 10000 });
  await page.waitForTimeout(250);
  assertPageRuntimeClean("exponentiation route");
  await assertViewportUsable(page, "exponentiation route");
  await assertEngineeringSandboxLayout(context, "exponentiation/", "exponentiation route", { navMode: "generated" });
  console.log("OK exponentiation virus demo");
  await page.close();
}

async function smokePi(context) {
  const page = await context.newPage();
  const assertPageRuntimeClean = createRuntimeMonitor(page);
  await assertRoute(page, "pi/", "#reference-footer");
  await assertEngineeringSandboxShell(page, "pi route", {
    minimumChapters: 4,
    navMode: "generated",
    expectedFamily: "ev-essay",
    expectedRoute: "pi",
  });
  await page.waitForFunction(() => {
    return document.querySelector("circle-demo svg circle.circle") &&
      document.querySelector("pi-demo svg path.circum") &&
      document.querySelectorAll('input[ng-model="opts.fold"], input[ng-model="opts.diameter"]').length === 2;
  }, null, { timeout: 15000 });

  const before = await page.evaluate(() => ({
    circumferencePath: document.querySelector("pi-demo .circum")?.getAttribute("d") || "",
    diameterLabel: document.querySelector("pi-demo .diameter-label-g text")?.textContent || "",
    circumferenceLabel: document.querySelector("pi-demo .circum-label-g text")?.textContent || "",
  }));

  await setRangeValue(page, 'input[ng-model="opts.fold"]', 0.78);
  await setRangeValue(page, 'input[ng-model="opts.diameter"]', 1.9);
  await page.waitForFunction((previous) => {
    const scope = angular.element(document.body).scope();
    const circumferencePath = document.querySelector("pi-demo .circum")?.getAttribute("d") || "";
    const diameterLabel = document.querySelector("pi-demo .diameter-label-g text")?.textContent || "";
    const circumferenceLabel = document.querySelector("pi-demo .circum-label-g text")?.textContent || "";
    return Math.abs(+scope.opts.fold - 0.78) < 0.001 &&
      Math.abs(+scope.opts.diameter - 1.9) < 0.001 &&
      circumferencePath !== previous.circumferencePath &&
      diameterLabel !== previous.diameterLabel &&
      circumferenceLabel !== previous.circumferenceLabel &&
      /D = 1\.9/.test(diameterLabel) &&
      /C = 5\.96/.test(circumferenceLabel);
  }, before, { timeout: 5000 });

  const circumDashOpacity = await page.locator("pi-demo .circum-dash").evaluate((element) => {
    return window.getComputedStyle(element).opacity;
  });
  assert(Number(circumDashOpacity) < 1, "pi wrap control did not reduce the circumference guide opacity");
  await page.waitForTimeout(250);
  assertPageRuntimeClean("pi route");
  await assertViewportUsable(page, "pi route");
  await assertEngineeringSandboxLayout(context, "pi/", "pi route", { navMode: "generated" });
  console.log("OK pi geometry and wrap controls");
  await page.close();
}

async function smokeSineAndCosine(context) {
  const page = await context.newPage();
  const assertPageRuntimeClean = createRuntimeMonitor(page);
  await assertRoute(page, "sine-and-cosine/", "#reference-footer");
  await assertEngineeringSandboxShell(page, "sine-and-cosine route", {
    minimumChapters: 6,
    navMode: "generated",
    expectedFamily: "ev-essay",
    expectedRoute: "sine-and-cosine",
  });
  await page.waitForFunction(() => {
    return document.querySelector("similar-triangles svg") &&
      document.querySelectorAll("trig-transform svg").length === 2 &&
      document.querySelector("linked-coordinates svg") &&
      window.MathJax;
  }, null, { timeout: 30000 });

  const mathJaxSrc = await page.locator('script[src*="MathJax.js"]').getAttribute("src");
  assert(
    mathJaxSrc && mathJaxSrc.startsWith("../ev/scripts/mathjax/"),
    "sine-and-cosine did not load MathJax from the local EV asset tree",
  );

  await page.waitForFunction(() => {
    return document.querySelector(".MathJax_Display") || document.querySelector(".MathJax");
  }, null, { timeout: 30000 });

  const before = await page.evaluate(() => ({
    labelA: document.querySelector("similar-triangles .label-a")?.textContent || "",
    labelB: document.querySelector("similar-triangles .label-b")?.textContent || "",
    polarNob: document.querySelector("linked-coordinates .polar-g .nob")?.getAttribute("transform") || "",
    sineNob: document.querySelector("linked-coordinates .sine-g .nob")?.getAttribute("transform") || "",
    cosineNob: document.querySelector("linked-coordinates .cosine-g .nob")?.getAttribute("transform") || "",
  }));

  await page.evaluate(() => {
    const scope = angular.element(document.body).scope();
    scope.$apply(() => {
      scope.opts.pos = [1.6, -0.7];
    });
  });
  await page.waitForFunction((previous) => {
    return (document.querySelector("similar-triangles .label-a")?.textContent || "") !== previous.labelA &&
      (document.querySelector("similar-triangles .label-b")?.textContent || "") !== previous.labelB &&
      (document.querySelector("linked-coordinates .polar-g .nob")?.getAttribute("transform") || "") !== previous.polarNob &&
      (document.querySelector("linked-coordinates .sine-g .nob")?.getAttribute("transform") || "") !== previous.sineNob &&
      (document.querySelector("linked-coordinates .cosine-g .nob")?.getAttribute("transform") || "") !== previous.cosineNob;
  }, before, { timeout: 5000 });
  console.log("OK sine-and-cosine linked coordinate sync");

  await page.locator('[ng-controller="SineAnimationCtrl"] > ev-play-button > div > svg').click();
  await page.waitForFunction(() => {
    const scope = angular.element(document.querySelector('[ng-controller="SineAnimationCtrl"]')).scope();
    return scope?.opts?.isPlaying === true;
  }, null, { timeout: 5000 });
  await page.waitForFunction(() => {
    const path = document.querySelector('[ng-controller="SineAnimationCtrl"] trig-transform .sin-path');
    return (path?.getAttribute("d") || "").length > 20;
  }, null, { timeout: 18000 });
  await page.waitForFunction(() => {
    const scope = angular.element(document.querySelector('[ng-controller="SineAnimationCtrl"]')).scope();
    return scope?.opts?.isPlaying === false;
  }, null, { timeout: 22000 });
  console.log("OK sine-and-cosine sine autoplay");

  await page.locator('[ng-controller="CosineAnimationCtrl"] ev-play-button > div > svg').click();
  await page.waitForFunction(() => {
    const scope = angular.element(document.querySelector('[ng-controller="CosineAnimationCtrl"]')).scope();
    return scope?.opts?.isPlaying === true;
  }, null, { timeout: 5000 });
  await page.waitForFunction(() => {
    const path = document.querySelector('[ng-controller="CosineAnimationCtrl"] trig-transform .cos-path');
    return (path?.getAttribute("d") || "").length > 20;
  }, null, { timeout: 18000 });
  await page.waitForTimeout(250);
  assertPageRuntimeClean("sine-and-cosine route");
  await assertViewportUsable(page, "sine-and-cosine route");
  await assertEngineeringSandboxLayout(context, "sine-and-cosine/", "sine-and-cosine route", {
    navMode: "generated",
  });
  console.log("OK sine-and-cosine cosine autoplay");
  await page.close();
}

async function smokeEigenvectorsAndEigenvalues(context) {
  const page = await context.newPage();
  const assertPageRuntimeClean = createRuntimeMonitor(page);
  await assertRoute(page, "eigenvectors-and-eigenvalues/", "#reference-footer");
  await assertEngineeringSandboxShell(page, "eigenvectors-and-eigenvalues route", {
    minimumChapters: 5,
    navMode: "generated",
    expectedFamily: "ev-essay",
    expectedRoute: "eigenvectors-and-eigenvalues",
  });
  await page.waitForFunction(() => {
    return document.querySelectorAll("simple-plot svg").length >= 3 &&
      document.querySelector("bacteria-simulation svg") &&
      document.querySelector("sf-to-ny-migration-map svg path.us-bg") &&
      document.querySelector("migration svg") &&
      document.querySelector("stochastic-matrix-multiplication svg") &&
      document.querySelector("four-quad-plot svg") &&
      window.MathJax;
  }, null, { timeout: 30000 });

  const mathJaxSrc = await page.locator('script[src*="MathJax.js"]').getAttribute("src");
  assert(
    mathJaxSrc && mathJaxSrc.startsWith("../ev/scripts/mathjax/"),
    "eigenvectors-and-eigenvalues did not load MathJax from the local EV asset tree",
  );

  await page.waitForFunction(() => {
    return document.querySelector(".MathJax_Display") || document.querySelector(".MathJax");
  }, null, { timeout: 30000 });
  await page.waitForFunction(() => {
    const pathData = document.querySelector("sf-to-ny-migration-map .us-bg")?.getAttribute("d") || "";
    return pathData.length > 100;
  }, null, { timeout: 30000 });

  const basisBefore = await page.evaluate(() => {
    const basisScope = angular.element(document.querySelector('[ng-controller="BasisCtrl"]')).scope();
    return {
      basis1: [...basisScope.opt.basis1],
      basis2: [...basisScope.opt.basis2],
      pos0: [...basisScope.opt.pos0],
      nobs: Array.from(document.querySelectorAll('[ng-controller="BasisCtrl"] .nobs > g'))
        .map((node) => node.getAttribute("transform") || ""),
      vectors: Array.from(document.querySelectorAll('[ng-controller="BasisCtrl"] .vectors line'))
        .map((node) => [node.getAttribute("x1"), node.getAttribute("y1"), node.getAttribute("x2"), node.getAttribute("y2")].join(",")),
    };
  });
  await page.evaluate(() => {
    const scope = angular.element(document.querySelector('[ng-controller="BasisCtrl"]')).scope();
    scope.$apply(() => {
      scope.opt.basis1 = [2.4, 1.1];
      scope.opt.basis2 = [0.8, 3.6];
      scope.opt.pos0 = [1.4, 2.7];
    });
  });
  await page.waitForFunction((previous) => {
    const scope = angular.element(document.querySelector('[ng-controller="BasisCtrl"]')).scope();
    const nobs = Array.from(document.querySelectorAll('[ng-controller="BasisCtrl"] .nobs > g'))
      .map((node) => node.getAttribute("transform") || "");
    const vectors = Array.from(document.querySelectorAll('[ng-controller="BasisCtrl"] .vectors line'))
      .map((node) => [node.getAttribute("x1"), node.getAttribute("y1"), node.getAttribute("x2"), node.getAttribute("y2")].join(","));
    return Math.abs(scope.opt.basis1[0] - previous.basis1[0]) > 0.2 &&
      Math.abs(scope.opt.basis2[1] - previous.basis2[1]) > 0.2 &&
      Math.abs(scope.opt.pos0[0] - previous.pos0[0]) > 0.2 &&
      nobs.join("|") !== previous.nobs.join("|") &&
      vectors.join("|") !== previous.vectors.join("|");
  }, basisBefore, { timeout: 5000 });
  console.log("OK eigenvectors-and-eigenvalues basis editor");

  const bacteriaBefore = await page.evaluate(() => {
    const scope = angular.element(document.querySelector('[ng-controller="BacteriaCtrl"]')).scope();
    const readouts = document.querySelectorAll('[ng-controller="BacteriaCtrl"] div[style*="text-align: center"]');
    return {
      curGen: scope.opt.curGen,
      readout: readouts[readouts.length - 1]?.textContent || "",
    };
  });
  await page.locator('[ng-controller="BacteriaCtrl"] button').filter({ hasText: /^forward$/i }).click();
  await page.waitForFunction((previous) => {
    const scope = angular.element(document.querySelector('[ng-controller="BacteriaCtrl"]')).scope();
    const readouts = document.querySelectorAll('[ng-controller="BacteriaCtrl"] div[style*="text-align: center"]');
    const readout = readouts[readouts.length - 1]?.textContent || "";
    return scope.opt.curGen > previous.curGen && readout !== previous.readout;
  }, bacteriaBefore, { timeout: 5000 });
  console.log("OK eigenvectors-and-eigenvalues Fibonacci controls");

  const migrationBefore = await page.evaluate(() => {
    const scope = angular.element(document.querySelector('[ng-controller="StochasticMatrixMultiplicationCtrl"]')).scope();
    return {
      samplesLength: scope.opts.samples.length,
      sampleCount: document.querySelectorAll("stochastic-matrix-multiplication .samples .sample").length,
    };
  });
  await page.locator("migration svg").hover();
  await page.waitForFunction((previous) => {
    const scope = angular.element(document.querySelector('[ng-controller="StochasticMatrixMultiplicationCtrl"]')).scope();
    return scope.opts.samples.length > previous.samplesLength &&
      document.querySelectorAll("stochastic-matrix-multiplication .samples .sample").length > previous.sampleCount;
  }, migrationBefore, { timeout: 15000 });
  console.log("OK eigenvectors-and-eigenvalues steady-state migration");

  const spiralBefore = await page.evaluate(() => ({
    stepCount: angular.element(document.querySelector('[ng-controller="FourQuadCtrl"]')).scope().opt.n,
    nobs: Array.from(document.querySelectorAll('[ng-controller="FourQuadCtrl"] .nobs > g'))
      .map((node) => node.getAttribute("transform") || ""),
    evPoints: Array.from(document.querySelectorAll("four-quad-plot .ev-point"))
      .map((node) => node.getAttribute("transform") || ""),
    trailCount: document.querySelectorAll("four-quad-plot .points g").length,
  }));
  await page.evaluate(() => {
    const scope = angular.element(document.querySelector('[ng-controller="FourQuadCtrl"]')).scope();
    scope.$apply(() => {
      scope.opt.basis1 = [1.1, -1.3];
      scope.opt.basis2 = [1.0, 0.8];
      scope.opt.pos0 = [1.8, 0.7];
      scope.opt.n = 18;
    });
  });
  await page.waitForFunction((previous) => {
    const scope = angular.element(document.querySelector('[ng-controller="FourQuadCtrl"]')).scope();
    const nobs = Array.from(document.querySelectorAll('[ng-controller="FourQuadCtrl"] .nobs > g'))
      .map((node) => node.getAttribute("transform") || "");
    const evPoints = Array.from(document.querySelectorAll("four-quad-plot .ev-point"))
      .map((node) => node.getAttribute("transform") || "");
    return scope.opt.n === 18 &&
      nobs.join("|") !== previous.nobs.join("|") &&
      evPoints.join("|") !== previous.evPoints.join("|") &&
      document.querySelectorAll("four-quad-plot .points g").length === 18;
  }, spiralBefore, { timeout: 5000 });
  await page.waitForTimeout(250);
  assertPageRuntimeClean("eigenvectors-and-eigenvalues route");
  await assertViewportUsable(page, "eigenvectors-and-eigenvalues route");
  await assertEngineeringSandboxLayout(context, "eigenvectors-and-eigenvalues/", "eigenvectors-and-eigenvalues route", {
    navMode: "generated",
  });
  console.log("OK eigenvectors-and-eigenvalues complex spiral");
  await page.close();
}

async function smokeImageKernels(context) {
  const page = await context.newPage();
  const assertPageRuntimeClean = createRuntimeMonitor(page);
  await assertRoute(page, "image-kernels/", "#reference-footer");
  await assertEngineeringSandboxShell(page, "image-kernels route", {
    minimumChapters: 4,
    navMode: "generated",
    expectedFamily: "ev-essay",
    expectedRoute: "image-kernels",
  });
  await page.waitForFunction(() => {
    return document.querySelector("image-as-matrix canvas") &&
      document.querySelector("kernel-matrix svg") &&
      document.querySelector("kernel-inspect canvas") &&
      document.querySelector("kernel-playground canvas") &&
      angular.element(document.body).scope()?.data1?.length > 0 &&
      typeof window.EXIF !== "undefined";
  }, null, { timeout: 30000 });

  const exifSrc = await page.locator('script[src*="exif.js"]').getAttribute("src");
  assert(exifSrc && exifSrc.startsWith("../ev/scripts/exif.js"), "image-kernels did not load exif.js from the local EV asset tree");

  await page.waitForFunction(() => {
    const canvas = document.querySelector("kernel-playground canvas");
    if (!canvas) {
      return false;
    }
    const ctx = canvas.getContext("2d");
    const sample = ctx.getImageData(760, 200, 2, 2).data;
    return Array.from(sample).some((value) => value !== 0);
  }, null, { timeout: 15000 });

  const playgroundSignature = async () => page.evaluate(() => {
    const canvas = document.querySelector("kernel-playground canvas");
    const ctx = canvas.getContext("2d");
    const samplePoints = [
      [650, 120],
      [760, 210],
      [900, 320],
    ];
    return samplePoints
      .map(([x, y]) => Array.from(ctx.getImageData(x, y, 1, 1).data).join(","))
      .join("|");
  });

  const presetBefore = await playgroundSignature();
  await page.locator('select[ng-model="selectedKernel"]').first().selectOption({ label: "blur" });
  await page.waitForFunction(() => {
    const scope = angular.element(document.body).scope();
    return scope.selectedKernel === "blur" &&
      Array.isArray(scope.kernel) &&
      scope.kernel.some((value) => Math.abs(+value - 0.25) < 0.001);
  }, null, { timeout: 5000 });
  const presetAfter = await playgroundSignature();
  assert(presetAfter !== presetBefore, "image-kernels blur preset did not change the rendered playground output");
  console.log("OK image-kernels preset switching");

  const customBefore = presetAfter;
  await page.locator('input[ng-model^="kernel["]').nth(0).evaluate((element) => {
    element.value = "2";
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await page.waitForFunction(() => {
    const scope = angular.element(document.body).scope();
    return scope.selectedKernel === "custom" && Math.abs(+scope.kernel[0] - 2) < 0.001;
  }, null, { timeout: 5000 });
  const customAfter = await playgroundSignature();
  assert(customAfter !== customBefore, "image-kernels custom kernel edit did not change the rendered playground output");
  console.log("OK image-kernels custom kernel editor");

  const inspector = page.locator("kernel-inspect svg");
  await inspector.scrollIntoViewIfNeeded();
  const inspectorBox = await inspector.boundingBox();
  assert(inspectorBox, "image-kernels inspector SVG did not render");
  await inspector.hover({ position: { x: 48, y: 48 } });
  await page.waitForFunction(() => {
    const scope = angular.element(document.body).scope();
    return Array.isArray(scope.d1SelPixel) && scope.d1SelPixel[0] <= 4 && scope.d1SelPixel[1] <= 4;
  }, null, { timeout: 5000 });
  console.log("OK image-kernels hover inspector");

  await inspector.hover({ position: { x: 4, y: 4 } });
  await page.waitForFunction(() => {
    const scope = angular.element(document.body).scope();
    return Array.isArray(scope.d1SelPixel) && scope.d1SelPixel[0] === 0 && scope.d1SelPixel[1] === 0;
  }, null, { timeout: 5000 });
  const hasBoundaryPlaceholder = await page.evaluate(() => {
    const texts = Array.from(document.querySelectorAll("kernel-inspect svg text"))
      .map((node) => (node.textContent || "").trim())
      .filter(Boolean);
    return texts.includes("?");
  });
  assert(hasBoundaryPlaceholder, "image-kernels edge handling did not expose missing-neighbor placeholders");
  await page.waitForTimeout(250);
  assertPageRuntimeClean("image-kernels route");
  await assertViewportUsable(page, "image-kernels route");
  await assertEngineeringSandboxLayout(context, "image-kernels/", "image-kernels route", { navMode: "generated" });
  console.log("OK image-kernels boundary handling");
  await page.close();
}

async function smokeOrdinaryLeastSquaresRegression(context) {
  const page = await context.newPage();
  const assertPageRuntimeClean = createRuntimeMonitor(page);
  await assertRoute(page, "ordinary-least-squares-regression/", "#reference-footer");
  await assertEngineeringSandboxShell(page, "ordinary-least-squares-regression route", {
    minimumChapters: 3,
    navMode: "generated",
    expectedFamily: "ev-essay",
    expectedRoute: "ordinary-least-squares-regression",
  });
  await page.waitForFunction(() => {
    return document.querySelector(".myApp") &&
      document.querySelectorAll("svg").length >= 3 &&
      document.querySelector(".line-ols") &&
      document.querySelectorAll(".point-nobs .nob").length >= 7 &&
      document.querySelectorAll(".error-squares rect").length >= 7;
  }, null, { timeout: 30000 });

  const sharedSrc = await page.evaluate(() => {
    return document.querySelector('script[src*="common-shared.js"]')?.getAttribute("src") || "";
  });
  assert(
    sharedSrc === "../ev/_build/js/common-shared.js",
    "ordinary-least-squares-regression did not load common-shared.js from the local EV asset tree",
  );

  const initialState = await page.evaluate(() => ({
    equation: Array.from(document.querySelectorAll("svg text"))
      .map((node) => (node.textContent || "").trim())
      .find((text) => /^-?\d+\.\d+ \+ -?\d+\.\d+ \* hand size = height$/.test(text)) || "",
    line: (() => {
      const node = document.querySelector(".line-ols");
      return node
        ? [node.getAttribute("x1"), node.getAttribute("y1"), node.getAttribute("x2"), node.getAttribute("y2")].join(",")
        : "";
    })(),
    errorSignature: Array.from(document.querySelectorAll(".error-squares rect"))
      .slice(0, 7)
      .map((node) => [node.getAttribute("transform"), node.getAttribute("width"), node.getAttribute("height")].join("|"))
      .join("||"),
    images: Array.from(document.querySelectorAll(".myApp img"))
      .map((node) => node.getAttribute("src") || ""),
  }));
  assert(initialState.line.length > 0, "ordinary-least-squares-regression did not render a fitted line on first load");
  assert(
    initialState.images.includes("./resources/dial-tutorial.gif") &&
      initialState.images.includes("./resources/point-tutorial.gif"),
    "ordinary-least-squares-regression did not localize tutorial media",
  );

  const pointNob = page.locator(".point-nobs .nob").first();
  await pointNob.evaluate((element) => element.scrollIntoView({ block: "center", inline: "center" }));
  const pointBox = await pointNob.boundingBox();
  assert(pointBox, "ordinary-least-squares-regression did not expose a draggable point control");
  await page.mouse.move(pointBox.x + pointBox.width / 2, pointBox.y + pointBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(pointBox.x + pointBox.width / 2 + 35, pointBox.y + pointBox.height / 2 - 25, { steps: 12 });
  await page.mouse.up();
  await page.waitForFunction((previous) => {
    const equation = Array.from(document.querySelectorAll("svg text"))
      .map((node) => (node.textContent || "").trim())
      .find((text) => /^-?\d+\.\d+ \+ -?\d+\.\d+ \* hand size = height$/.test(text)) || "";
    const node = document.querySelector(".line-ols");
    const line = node
      ? [node.getAttribute("x1"), node.getAttribute("y1"), node.getAttribute("x2"), node.getAttribute("y2")].join(",")
      : "";
    const errorSignature = Array.from(document.querySelectorAll(".error-squares rect"))
      .slice(0, 7)
      .map((rect) => [rect.getAttribute("transform"), rect.getAttribute("width"), rect.getAttribute("height")].join("|"))
      .join("||");
    return (line !== previous.line || errorSignature !== previous.errorSignature) &&
      (equation !== previous.equation || line !== previous.line);
  }, initialState, { timeout: 5000 });
  console.log("OK ordinary-least-squares-regression point drag");

  await assertViewportUsable(page, "ordinary-least-squares-regression route");
  await assertRouteViewportUsable(
    context,
    "ordinary-least-squares-regression/",
    "#reference-footer",
    ".line-ols",
    "ordinary-least-squares-regression route",
    390,
    844,
  );
  await page.waitForTimeout(250);
  assertPageRuntimeClean("ordinary-least-squares-regression route");
  await assertEngineeringSandboxLayout(context, "ordinary-least-squares-regression/", "ordinary-least-squares-regression route", {
    navMode: "generated",
  });
  console.log("OK ordinary-least-squares-regression responsive shell");
  await page.close();
}

async function assertAndersNativeToggle(context, relativePath, label, toggleSelector, collapseSelector, minimumLinks) {
  const page = await context.newPage();
  await page.setViewportSize({ width: 390, height: 844 });
  await assertRoute(page, relativePath, "#reference-footer");
  const toggle = page.locator(toggleSelector);
  const links = page.locator(`${collapseSelector} a[href]`);
  await page.waitForFunction(({ selector, minimum }) => {
    return document.querySelectorAll(`${selector} a[href]`).length >= minimum;
  }, { selector: collapseSelector, minimum: minimumLinks }, { timeout: 15000 });
  assert(await renderedControlCount(links) >= minimumLinks, `${label} did not start with its native links visible`);
  await assertFocusVisible(toggle, `${label} native toggle`);
  await assertPointerTargets(toggle, `${label} native toggle`);
  await page.keyboard.press("Enter");
  await page.waitForFunction(({ toggle, collapse }) => {
    const control = document.querySelector(toggle);
    const links = Array.from(document.querySelectorAll(`${collapse} a[href]`));
    return control?.getAttribute("aria-expanded") === "false" && links.every((link) => link.getClientRects().length === 0);
  }, { toggle: toggleSelector, collapse: collapseSelector }, { timeout: 5000 });
  await page.keyboard.press("Enter");
  await page.waitForFunction(({ toggle, collapse, minimum }) => {
    const control = document.querySelector(toggle);
    const links = Array.from(document.querySelectorAll(`${collapse} a[href]`));
    return control?.getAttribute("aria-expanded") === "true" && links.filter((link) => link.getClientRects().length > 0).length >= minimum;
  }, { toggle: toggleSelector, collapse: collapseSelector, minimum: minimumLinks }, { timeout: 5000 });
  await page.close();
}

async function smokeBlockchain(context) {
  const page = await context.newPage();
  const assertPageRuntimeClean = createRuntimeMonitor(page);
  await assertRoute(page, "blockchain/", "#reference-footer");
  await assertEngineeringSandboxShell(page, "blockchain route", {
    minimumChapters: 0,
    navMode: "native",
    nativeSelector: "nav a",
    minimumNativeLinks: 6,
    requireNativeAnchors: false,
    expectedFamily: "anders-lab",
    expectedRoute: "blockchain",
    expectedVariant: "lab",
  });
  await page.waitForFunction(() => {
    return document.querySelector("#block1chain1data") &&
      document.querySelector("#block1chain1hash") &&
      document.querySelector("#block2chain1previous") &&
      document.querySelector("#block1chain1mineButton");
  }, null, { timeout: 30000 });

  const initialState = await page.evaluate(() => ({
    block1Hash: document.querySelector("#block1chain1hash")?.value || "",
    block2Prev: document.querySelector("#block2chain1previous")?.value || "",
    block1Class: document.querySelector("#block1chain1well")?.className || "",
    block2Class: document.querySelector("#block2chain1well")?.className || "",
  }));
  assert(initialState.block1Hash.length > 0, "blockchain did not render the first block hash on load");

  await page.evaluate(() => {
    const textarea = document.querySelector("#block1chain1data");
    textarea.value = "local smoke tamper";
    textarea.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true, key: "e" }));
  });
  await page.waitForFunction((previous) => {
    const block1Hash = document.querySelector("#block1chain1hash")?.value || "";
    const block2Prev = document.querySelector("#block2chain1previous")?.value || "";
    const block1Class = document.querySelector("#block1chain1well")?.className || "";
    const block2Class = document.querySelector("#block2chain1well")?.className || "";
    return block1Hash !== previous.block1Hash &&
      block2Prev !== previous.block2Prev &&
      /well-error/.test(block1Class) &&
      /well-error/.test(block2Class);
  }, initialState, { timeout: 5000 });

  const tamperedState = await page.evaluate(() => ({
    block1Hash: document.querySelector("#block1chain1hash")?.value || "",
    block2Prev: document.querySelector("#block2chain1previous")?.value || "",
  }));
  await page.locator("#block1chain1mineButton").click();
  await page.waitForFunction((previous) => {
    const block1Hash = document.querySelector("#block1chain1hash")?.value || "";
    const block1Class = document.querySelector("#block1chain1well")?.className || "";
    const block2Class = document.querySelector("#block2chain1well")?.className || "";
    return block1Hash !== previous.block1Hash &&
      block1Hash.startsWith("0000") &&
      /well-success/.test(block1Class) &&
      /well-error/.test(block2Class);
  }, tamperedState, { timeout: 10000 });
  console.log("OK blockchain hash and mining flow");

  await assertRoute(page, "blockchain/distributed.html", "#reference-footer");
  await page.waitForFunction(() => {
    return document.querySelector("#block1chain1well") &&
      document.querySelector("#block1chain2well") &&
      document.querySelector("#block1chain3well");
  }, null, { timeout: 10000 });
  await assertEngineeringSandboxLayout(context, "blockchain/", "blockchain route", {
    navMode: "native",
    controlSelector: "#block1chain1data",
    containerSelector: ".story-lab-main",
  });
  await assertRouteViewportUsable(
    context,
    "blockchain/",
    "#reference-footer",
    "#block1chain1data",
    "blockchain route",
    390,
    844,
  );
  await page.waitForTimeout(250);
  assertPageRuntimeClean("blockchain route");
  console.log("OK blockchain distributed scene");
  await page.close();
  await assertAndersNativeToggle(context, "blockchain/", "blockchain route", ".navbar-toggle", "#navbar", 6);
  console.log("OK blockchain native mobile navigation");
}

async function smokePublicPrivateKeys(context) {
  const page = await context.newPage();
  const assertPageRuntimeClean = createRuntimeMonitor(page);
  await assertRoute(page, "public-private-keys/", "#reference-footer");
  await assertEngineeringSandboxShell(page, "public-private-keys route", {
    minimumChapters: 0,
    navMode: "native",
    nativeSelector: "nav a",
    minimumNativeLinks: 4,
    requireNativeAnchors: false,
    expectedFamily: "anders-lab",
    expectedRoute: "public-private-keys",
    expectedVariant: "lab",
  });
  await page.waitForFunction(() => {
    return document.querySelector("#privateKey") &&
      document.querySelector("#publicKey") &&
      document.querySelector("#randomButton");
  }, null, { timeout: 30000 });

  const initialKeys = await page.evaluate(() => ({
    privateKey: document.querySelector("#privateKey")?.value || "",
    publicKey: document.querySelector("#publicKey")?.value || "",
  }));
  assert(initialKeys.publicKey.length > 100, "public-private-keys did not derive an initial public key");
  await page.locator("#randomButton").click();
  await page.waitForFunction((previous) => {
    const privateKey = document.querySelector("#privateKey")?.value || "";
    const publicKey = document.querySelector("#publicKey")?.value || "";
    return privateKey !== previous.privateKey &&
      publicKey !== previous.publicKey &&
      publicKey.length > 100;
  }, initialKeys, { timeout: 5000 });
  console.log("OK public-private-keys key generation");

  await assertRoute(page, "public-private-keys/signatures/", "#reference-footer");
  await page.waitForFunction(() => {
    return document.querySelector("#sign-message") &&
      document.querySelector("#sign-button") &&
      document.querySelector("#verify-tab") &&
      document.querySelector("#sign-signature");
  }, null, { timeout: 10000 });
  const message = "local signature smoke";
  await page.locator("#sign-message").fill(message);
  await page.locator("#sign-button").click();
  await page.waitForFunction(() => {
    return (document.querySelector("#sign-signature")?.value || "").length > 100 &&
      (document.querySelector("#publicKey")?.value || "").length > 100;
  }, null, { timeout: 5000 });
  await page.locator("#verify-tab").click();
  await page.locator("#verify-message").fill(message);
  await page.locator("#verify-button").click();
  await page.waitForFunction(() => {
    return /alert-success/.test(document.querySelector("#card")?.className || "");
  }, null, { timeout: 5000 });
  await page.locator("#verify-message").fill(`${message} tampered`);
  await page.locator("#verify-button").click();
  await page.waitForFunction(() => {
    return /alert-danger/.test(document.querySelector("#card")?.className || "");
  }, null, { timeout: 5000 });
  console.log("OK public-private-keys signature workflow");

  await assertRoute(page, "public-private-keys/transaction/", "#reference-footer");
  await page.waitForFunction(() => {
    const signFrom = document.querySelector("#sign-from")?.value || "";
    const verifyFrom = document.querySelector("#verify-from")?.value || "";
    return signFrom.length > 100 &&
      verifyFrom.length > 100 &&
      document.querySelector("#sign-button") &&
      document.querySelector("#verify-button");
  }, null, { timeout: 10000 });
  console.log("OK public-private-keys transaction scene");

  await assertRoute(page, "public-private-keys/blockchain/", "#reference-footer");
  await page.waitForFunction(() => {
    return document.querySelector("#block1chain1coinbaseto") &&
      document.querySelector("#block2chain1tx0sig") &&
      document.querySelector("#block1chain1mineButton");
  }, null, { timeout: 10000 });
  await assertEngineeringSandboxLayout(context, "public-private-keys/", "public-private-keys route", {
    navMode: "native",
    controlSelector: "#privateKey",
    containerSelector: ".story-lab-main",
  });
  await assertRouteViewportUsable(
    context,
    "public-private-keys/",
    "#reference-footer",
    "#publicKey",
    "public-private-keys route",
    390,
    844,
  );
  await page.waitForTimeout(250);
  assertPageRuntimeClean("public-private-keys route");
  console.log("OK public-private-keys blockchain scene");
  await page.close();
  await assertAndersNativeToggle(context, "public-private-keys/", "public-private-keys route", ".navbar-toggler", "#collapsingNavbar", 4);
  console.log("OK public-private-keys native mobile navigation");
}

async function smokeZeroKnowledgeProofDemo(context) {
  const page = await context.newPage();
  const assertPageRuntimeClean = createRuntimeMonitor(page);
  await assertRoute(page, "zero-knowledge-proof-demo/", "#reference-footer");
  await assertEngineeringSandboxShell(page, "zero-knowledge-proof-demo route", {
    minimumChapters: 0,
    navMode: "none",
    minimumNativeLinks: 0,
    expectedFamily: "anders-lab",
    expectedRoute: "zero-knowledge-proof-demo",
    expectedVariant: "lab",
  });
  await page.waitForFunction(() => {
    return window.map &&
      document.querySelector("#map .jvectormap-container") &&
      document.querySelectorAll("#map path").length > 20 &&
      document.querySelector("#show-hide-colors-button") &&
      document.querySelector("#shuffle-colors-button");
  }, null, { timeout: 30000 });

  const initialState = await page.evaluate(() => ({
    label: document.querySelector("#show-hide-colors-button")?.textContent?.trim() || "",
    fills: Array.from(document.querySelectorAll("#map path"))
      .map((node) => node.getAttribute("fill"))
      .filter(Boolean),
  }));
  assert(initialState.label === "Show Colors", "zero-knowledge-proof-demo did not start with the Show Colors label");
  assert(
    initialState.fills.some((fill) => /^(?:white|#?fff(?:fff)?)$/i.test(fill)),
    "zero-knowledge-proof-demo did not start in the hidden-color state",
  );

  await page.locator("#show-hide-colors-button").click();
  await page.waitForFunction(() => {
    const label = document.querySelector("#show-hide-colors-button")?.textContent?.trim() || "";
    const fills = Array.from(document.querySelectorAll("#map path"))
      .map((node) => node.getAttribute("fill"))
      .filter(Boolean);
    return label === "Hide Colors" && fills.some((fill) => fill && !/^(?:white|#?fff(?:fff)?)$/i.test(fill));
  }, null, { timeout: 5000 });
  console.log("OK zero-knowledge-proof-demo color toggle");

  const fillsBeforeShuffle = await page.evaluate(() => {
    return Array.from(document.querySelectorAll("#map path"))
      .map((node) => node.getAttribute("fill"))
      .filter(Boolean);
  });
  await page.locator("#shuffle-colors-button").click();
  await page.waitForFunction((previousFills) => {
    const fills = Array.from(document.querySelectorAll("#map path"))
      .map((node) => node.getAttribute("fill"))
      .filter(Boolean);
    return fills.some((fill, index) => fill !== previousFills[index]);
  }, fillsBeforeShuffle, { timeout: 5000 });
  console.log("OK zero-knowledge-proof-demo palette shuffle");

  await page.locator("#map path:not(.jvectormap-background)").first().click();
  await page.waitForFunction(() => {
    const label = document.querySelector("#show-hide-colors-button")?.textContent?.trim() || "";
    const fills = Array.from(document.querySelectorAll("#map path"))
      .map((node) => node.getAttribute("fill"))
      .filter(Boolean);
    const visibleFills = fills.filter((fill) => fill && !/^(?:white|#?fff(?:fff)?)$/i.test(fill));
    return label === "Show Colors" && visibleFills.length >= 1;
  }, null, { timeout: 5000 });
  console.log("OK zero-knowledge-proof-demo region selection");

  await page.locator("#map svg").click({ position: { x: 10, y: 10 } });
  await page.waitForFunction(() => {
    const label = document.querySelector("#show-hide-colors-button")?.textContent?.trim() || "";
    const fills = Array.from(document.querySelectorAll("#map path"))
      .map((node) => node.getAttribute("fill"))
      .filter(Boolean);
    return label === "Show Colors" && fills.every((fill) => /^(?:white|#?fff(?:fff)?)$/i.test(fill) || fill === "none");
  }, null, { timeout: 5000 });
  console.log("OK zero-knowledge-proof-demo background reset");

  await assertEngineeringSandboxLayout(context, "zero-knowledge-proof-demo/", "zero-knowledge-proof-demo route", {
    navMode: "none",
    controlSelector: "#show-hide-colors-button",
    containerSelector: "main.story-lab-main",
  });
  await assertViewportUsable(page, "zero-knowledge-proof-demo route");
  await assertRouteViewportUsable(
    context,
    "zero-knowledge-proof-demo/",
    "#reference-footer",
    "#map .jvectormap-container",
    "zero-knowledge-proof-demo route",
    390,
    844,
  );
  await page.waitForTimeout(250);
  assertPageRuntimeClean("zero-knowledge-proof-demo route");
  console.log("OK zero-knowledge-proof-demo responsive shell");
  await page.close();
}

async function smokeAlphaCompositing(context) {
  const page = await context.newPage();
  const assertPageRuntimeClean = createRuntimeMonitor(page);
  await assertRoute(page, "alpha-compositing/", "#reference-footer");
  await page.waitForFunction(() => {
    return document.querySelector("#alpha_rose_glasses_container canvas") &&
      document.querySelector("#alpha_coverage_geometry_canvas_container canvas") &&
      document.querySelector("#alpha_lerper_container canvas") &&
      document.querySelector("#alpha_pd_over_canvas_container canvas") &&
      document.querySelector("#alpha_pd_example_container canvas") &&
      document.querySelector("#alpha_pd_example_step") &&
      document.querySelector("#alpha_lerper_slider_container .slider_knob");
  }, null, { timeout: 30000 });

  await assertLocalScriptSources(page, ["./js/base.js", "./js/alpha_compositing.js"], "alpha-compositing");
  await assertElementContract(page, ".alpha_observation", {
    attributes: { role: "note" },
    textFragments: ["Observation:", "fully covered scene still has no gaps", "uniform opacity"],
  }, "alpha-compositing observation note");

  await dragCanvasUntilChanged(page, "#alpha_rose_glasses_container canvas", [
    { from: { x: 0.45, y: 0.45 }, to: { x: 0.7, y: 0.3 } },
    { from: { x: 0.55, y: 0.55 }, to: { x: 0.3, y: 0.65 } },
  ], "alpha-compositing rose-tinted drag scene");
  console.log("OK alpha-compositing rose-tinted drag scene");

  await dragCanvasUntilChanged(page, "#alpha_coverage_geometry_canvas_container canvas", [
    { from: { x: 0.18, y: 0.32 }, to: { x: 0.32, y: 0.56 } },
    { from: { x: 0.3, y: 0.35 }, to: { x: 0.42, y: 0.58 } },
    { from: { x: 0.7, y: 0.35 }, to: { x: 0.78, y: 0.52 } },
    { from: { x: 0.82, y: 0.28 }, to: { x: 0.68, y: 0.44 } },
  ], "alpha-compositing coverage drag scene");
  console.log("OK alpha-compositing coverage drag scene");

  const lerperCanvas = page.locator("#alpha_lerper_container canvas");
  await lerperCanvas.scrollIntoViewIfNeeded();
  const lerperBefore = await lerperCanvas.evaluate((canvas) => canvas.toDataURL());
  const sliderKnob = page.locator("#alpha_lerper_slider_container .slider_knob");
  await sliderKnob.scrollIntoViewIfNeeded();
  const knobBox = await sliderKnob.boundingBox();
  assert(knobBox, "alpha-compositing did not expose the lerp slider control");
  await page.mouse.move(knobBox.x + knobBox.width / 2, knobBox.y + knobBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(knobBox.x + knobBox.width / 2 + 70, knobBox.y + knobBox.height / 2, { steps: 12 });
  await page.mouse.up();
  await page.waitForFunction((previous) => {
    const canvas = document.querySelector("#alpha_lerper_container canvas");
    return canvas && canvas.toDataURL() !== previous;
  }, lerperBefore, { timeout: 5000 });
  console.log("OK alpha-compositing alpha slider scene");

  await dragCanvasUntilChanged(page, "#alpha_pd_over_canvas_container canvas", [
    { from: { x: 0.45, y: 0.45 }, to: { x: 0.62, y: 0.32 } },
    { from: { x: 0.52, y: 0.52 }, to: { x: 0.3, y: 0.65 } },
  ], "alpha-compositing Porter-Duff drag scene");
  console.log("OK alpha-compositing Porter-Duff drag scene");

  const pdExampleBefore = (await page.locator("#alpha_pd_example_step").textContent())?.trim() || "";
  const pdExampleContainer = page.locator("#alpha_pd_example_container");
  await pdExampleContainer.scrollIntoViewIfNeeded();
  const pdExampleBox = await pdExampleContainer.boundingBox();
  assert(pdExampleBox, "alpha-compositing did not expose the step-driven Porter-Duff container");
  for (const xFactor of [0.75, 0.9]) {
    await pdExampleContainer.click({
      position: {
        x: Math.max(10, Math.min(pdExampleBox.width - 10, pdExampleBox.width * xFactor)),
        y: Math.max(10, Math.min(pdExampleBox.height - 10, pdExampleBox.height * 0.5)),
      },
    });
    await page.waitForTimeout(150);
    const pdExampleAfter = (await page.locator("#alpha_pd_example_step").textContent())?.trim() || "";
    if (pdExampleAfter && pdExampleAfter !== pdExampleBefore) {
      console.log("OK alpha-compositing step-driven Porter-Duff scene");
      await assertLongformResponsiveShell(
        context,
        page,
        "alpha-compositing/",
        "#alpha_rose_glasses_container canvas",
        "alpha-compositing route",
        {
          expectedRoute: "alpha-compositing",
          minimumChapters: 6,
          playHref: "#alpha_rose_glasses_container",
        },
      );
      await page.waitForTimeout(250);
      assertPageRuntimeClean("alpha-compositing route");
      console.log("OK alpha-compositing responsive shell");
      await page.close();
      return;
    }
  }
  throw new Error("alpha-compositing step-driven Porter-Duff scene did not advance");
}

async function smokeColorSpaces(context) {
  const page = await context.newPage();
  const assertPageRuntimeClean = createRuntimeMonitor(page);
  await assertRoute(page, "color-spaces/", "#reference-footer");
  await page.waitForFunction(() => {
    return document.querySelector("#color_plain_linear_quadratic_slider_container .color_slider_knob") &&
      document.querySelector("#color_plot_narrow_container canvas") &&
      document.querySelector("#color_plot_wide_container canvas") &&
      document.querySelector("#color_gamut_canvas") &&
      document.querySelector("#color_gamut_plot_canvas") &&
      document.querySelector("#color_gamut_canvas_slider_container .slider_knob");
  }, null, { timeout: 30000 });

  await assertLocalScriptSources(page, ["./js/base.js", "./js/color_spaces.js"], "color-spaces");
  await assertElementContract(page, ".color_experiment_prompt", {
    textFragments: ["Two-number test:", "Matching RGB numbers", "until the color space is known"],
  }, "color-spaces experiment prompt");

  const earlyKnob = page.locator("#color_plain_linear_quadratic_slider_container .color_slider_knob").first();
  await earlyKnob.scrollIntoViewIfNeeded();
  const earlyBefore = await page.evaluate(() => ({
    top: document.querySelector("#color_plain_linear_quadratic_slider_container .color_match0_halfs")?.style.background || "",
    bottom: document.querySelector("#color_plain_linear_quadratic_slider_container .color_match1_halfs")?.style.background || "",
  }));
  const earlyKnobBox = await earlyKnob.boundingBox();
  assert(earlyKnobBox, "color-spaces did not expose an early color-picker slider");
  await page.mouse.move(earlyKnobBox.x + earlyKnobBox.width / 2, earlyKnobBox.y + earlyKnobBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(earlyKnobBox.x + earlyKnobBox.width / 2 + 80, earlyKnobBox.y + earlyKnobBox.height / 2, { steps: 12 });
  await page.mouse.up();
  await page.waitForFunction((previous) => {
    const top = document.querySelector("#color_plain_linear_quadratic_slider_container .color_match0_halfs")?.style.background || "";
    const bottom = document.querySelector("#color_plain_linear_quadratic_slider_container .color_match1_halfs")?.style.background || "";
    return top !== previous.top && bottom !== previous.bottom;
  }, earlyBefore, { timeout: 5000 });
  console.log("OK color-spaces early picker scene");

  const narrowPlot = page.locator("#color_plot_narrow_container canvas");
  await narrowPlot.scrollIntoViewIfNeeded();
  const narrowBefore = await narrowPlot.evaluate((canvas) => canvas.toDataURL());
  const cubeKnob = page.locator("#color_rgb_cube_slider_container .color_slider_knob").first();
  await cubeKnob.scrollIntoViewIfNeeded();
  const cubeKnobBox = await cubeKnob.boundingBox();
  assert(cubeKnobBox, "color-spaces did not expose the synchronized cube slider");
  await page.mouse.move(cubeKnobBox.x + cubeKnobBox.width / 2, cubeKnobBox.y + cubeKnobBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(cubeKnobBox.x + cubeKnobBox.width / 2 + 70, cubeKnobBox.y + cubeKnobBox.height / 2, { steps: 12 });
  await page.mouse.up();
  await page.waitForFunction((previous) => {
    const canvas = document.querySelector("#color_plot_narrow_container canvas");
    return canvas && canvas.toDataURL() !== previous;
  }, narrowBefore, { timeout: 5000 });
  console.log("OK color-spaces synchronized plot scene");

  await dragCanvasUntilChanged(page, "#color_plot_wide_container canvas", [
    { from: { x: 0.5, y: 0.5 }, to: { x: 0.62, y: 0.38 } },
    { from: { x: 0.55, y: 0.45 }, to: { x: 0.35, y: 0.58 } },
  ], "color-spaces draggable 3D plot scene");
  console.log("OK color-spaces draggable 3D plot scene");

  const gamutPlot = page.locator("#color_gamut_plot_canvas");
  await gamutPlot.scrollIntoViewIfNeeded();
  const gamutBefore = await gamutPlot.evaluate((canvas) => canvas.toDataURL());
  const gamutKnob = page.locator("#color_gamut_canvas_slider_container .slider_knob");
  await gamutKnob.scrollIntoViewIfNeeded();
  const gamutKnobBox = await gamutKnob.boundingBox();
  assert(gamutKnobBox, "color-spaces did not expose the gamut slider control");
  await page.mouse.move(gamutKnobBox.x + gamutKnobBox.width / 2, gamutKnobBox.y + gamutKnobBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(gamutKnobBox.x + gamutKnobBox.width / 2 + 80, gamutKnobBox.y + gamutKnobBox.height / 2, { steps: 12 });
  await page.mouse.up();
  await page.waitForFunction((previous) => {
    const canvas = document.querySelector("#color_gamut_plot_canvas");
    return canvas && canvas.toDataURL() !== previous;
  }, gamutBefore, { timeout: 5000 });
  console.log("OK color-spaces gamut scene");

  await assertLongformResponsiveShell(
    context,
    page,
    "color-spaces/",
    "#color_plain_linear_quadratic_slider_container .color_slider_knob",
    "color-spaces route",
    {
      expectedRoute: "color-spaces",
      minimumChapters: 6,
      playHref: "#color_plain_srgb_slider_container",
    },
  );
  await page.waitForTimeout(250);
  assertPageRuntimeClean("color-spaces route");
  console.log("OK color-spaces responsive shell");
  await page.close();
}

async function smokeSound(context) {
  const page = await context.newPage();
  const assertPageRuntimeClean = createRuntimeMonitor(page);
  await assertRoute(page, "sound/", "#reference-footer");
  await page.waitForFunction(() => {
    return document.querySelector("#hero canvas") &&
      document.querySelector("#hero_keyboard .keyboard_button") &&
      document.querySelector("#waveform1 canvas") &&
      document.querySelector("#waveform1_keyboard .keyboard_button") &&
      document.querySelector("#particles1 canvas") &&
      document.querySelector("#particles4 canvas") &&
      document.querySelector("#particles4_sl0 .slider_knob") &&
      document.querySelector("#waveform_addition1 canvas") &&
      document.querySelector("#waveform_addition1_sl0 .slider_knob") &&
      document.querySelector(".play_pause_button");
  }, null, { timeout: 30000 });
  await page.waitForTimeout(2000);

  await assertLocalScriptSources(page, ["./js/base.js", "./js/sound.js"], "sound");
  await assertElementContract(page, "#hero_keyboard", {
    attributes: {
      role: "group",
      "aria-label": "Three-note sound keyboard",
      "aria-describedby": "hero_keyboard_cue",
    },
  }, "sound keyboard group");
  await assertElementContract(page, "#hero_keyboard_cue", {
    textFragments: ["Listening cue:", "W", "E", "R", "map left to right"],
  }, "sound keyboard listening cue");

  const waveformButton = page.locator("#waveform1_keyboard .keyboard_button").first();
  const waveformCanvas = page.locator("#waveform1 canvas");
  await waveformButton.scrollIntoViewIfNeeded();
  const waveformBefore = await waveformCanvas.evaluate((canvas) => canvas.toDataURL());
  const waveformButtonBox = await waveformButton.boundingBox();
  assert(waveformButtonBox, "sound did not expose the early waveform keyboard");
  await page.mouse.move(
    waveformButtonBox.x + waveformButtonBox.width / 2,
    waveformButtonBox.y + waveformButtonBox.height / 2,
  );
  await page.mouse.down();
  await page.waitForFunction(() => {
    const button = document.querySelector("#waveform1_keyboard .keyboard_button");
    const canvas = document.querySelector("#waveform1 canvas");
    return button?.classList.contains("pressed") && !!canvas;
  }, null, { timeout: 5000 });
  await page.waitForFunction((previous) => {
    const canvas = document.querySelector("#waveform1 canvas");
    return canvas && canvas.toDataURL() !== previous;
  }, waveformBefore, { timeout: 5000 });
  await page.mouse.up();
  console.log("OK sound waveform keyboard click");

  const heroButton = page.locator("#hero_keyboard .keyboard_button").first();
  await heroButton.scrollIntoViewIfNeeded();
  await page.keyboard.down("w");
  await page.waitForFunction(() => {
    return document.querySelector("#hero_keyboard .keyboard_button")?.classList.contains("pressed");
  }, null, { timeout: 5000 });
  await page.keyboard.up("w");
  await page.waitForFunction(() => {
    return !document.querySelector("#hero_keyboard .keyboard_button")?.classList.contains("pressed");
  }, null, { timeout: 5000 });
  console.log("OK sound W keyboard routing");

  await dragCanvasUntilChanged(page, "#particles1 canvas", [
    { from: { x: 0.5, y: 0.5 }, to: { x: 0.68, y: 0.38 } },
    { from: { x: 0.55, y: 0.45 }, to: { x: 0.32, y: 0.62 } },
  ], "sound particle drag scene");
  console.log("OK sound particle drag scene");

  const particles4Canvas = page.locator("#particles4 canvas");
  await particles4Canvas.scrollIntoViewIfNeeded();
  const particles4Before = await particles4Canvas.evaluate((canvas) => canvas.toDataURL());
  const particles4Knob = page.locator("#particles4_sl0 .slider_knob");
  await particles4Knob.scrollIntoViewIfNeeded();
  const particles4KnobBox = await particles4Knob.boundingBox();
  assert(particles4KnobBox, "sound did not expose the pressure-box slider");
  await page.mouse.move(
    particles4KnobBox.x + particles4KnobBox.width / 2,
    particles4KnobBox.y + particles4KnobBox.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    particles4KnobBox.x + particles4KnobBox.width / 2 + 90,
    particles4KnobBox.y + particles4KnobBox.height / 2,
    { steps: 12 },
  );
  await page.mouse.up();
  await page.waitForFunction((previous) => {
    const canvas = document.querySelector("#particles4 canvas");
    return canvas && canvas.toDataURL() !== previous;
  }, particles4Before, { timeout: 5000 });
  console.log("OK sound pressure slider scene");

  const additionCanvas = page.locator("#waveform_addition1 canvas");
  await additionCanvas.scrollIntoViewIfNeeded();
  const additionBefore = await additionCanvas.evaluate((canvas) => canvas.toDataURL());
  const additionKnob = page.locator("#waveform_addition1_sl0 .slider_knob");
  await additionKnob.scrollIntoViewIfNeeded();
  const additionKnobBox = await additionKnob.boundingBox();
  assert(additionKnobBox, "sound did not expose the waveform addition slider");
  await page.mouse.move(
    additionKnobBox.x + additionKnobBox.width / 2,
    additionKnobBox.y + additionKnobBox.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    additionKnobBox.x + additionKnobBox.width / 2 + 90,
    additionKnobBox.y + additionKnobBox.height / 2,
    { steps: 12 },
  );
  await page.mouse.up();
  await page.waitForFunction((previous) => {
    const canvas = document.querySelector("#waveform_addition1 canvas");
    return canvas && canvas.toDataURL() !== previous;
  }, additionBefore, { timeout: 5000 });
  console.log("OK sound waveform addition scene");

  const playButton = page.locator(".play_pause_button").first();
  await playButton.scrollIntoViewIfNeeded();
  const playBefore = await playButton.getAttribute("class");
  await playButton.click();
  await page.waitForFunction((previous) => {
    const classes = document.querySelector(".play_pause_button")?.className || "";
    return classes !== previous;
  }, playBefore || "", { timeout: 5000 });
  console.log("OK sound play-pause control");

  await assertLongformResponsiveShell(
    context,
    page,
    "sound/",
    "#hero_keyboard .keyboard_button",
    "sound route",
    {
      expectedRoute: "sound",
      minimumChapters: 6,
      playHref: "#hero_keyboard",
    },
  );
  await page.waitForTimeout(250);
  assertPageRuntimeClean("sound route");
  console.log("OK sound responsive shell");
  await page.close();
}

async function smokeCamerasAndLenses(context) {
  const page = await context.newPage();
  const assertPageRuntimeClean = createRuntimeMonitor(page);
  await assertRoute(page, "cameras-and-lenses/", "#reference-footer");
  await page.waitForFunction(() => {
    return document.querySelector("#lens_detector canvas") &&
      document.querySelector("#lens_detector_sl0 .slider_knob") &&
      document.querySelector("#lens_scene canvas") &&
      document.querySelector("#lens_film canvas") &&
      document.querySelector("#lens_film_sl0 .slider_knob") &&
      document.querySelector("#lens_film_sl1 .slider_knob") &&
      document.querySelector("#lens_glass_rays canvas") &&
      document.querySelector("#lens_glass_rays_sl0 .slider_knob") &&
      document.querySelector(".play_pause_button") &&
      document.querySelector("#lens_chromatic canvas") &&
      document.querySelector("#lens_chromatic_sl0 .slider_knob");
  }, null, { timeout: 30000 });
  await page.waitForTimeout(2500);

  await assertLocalScriptSources(page, ["./js/base.js", "./js/lenses.js"], "cameras-and-lenses");
  await assertElementContract(page, ".lens_hero_guide", {
    tagName: "OL",
    attributes: { "aria-label": "Opening camera experiment" },
    textFragments: ["Move one control at a time", "compare its sharpness with the background", "tradeoff"],
  }, "cameras-and-lenses opening guide");
  assert(await page.locator(".lens_hero_guide > li").count() === 3, "cameras-and-lenses opening guide did not keep three steps");

  const detectorCanvas = page.locator("#lens_detector canvas").first();
  await detectorCanvas.scrollIntoViewIfNeeded();
  const detectorBefore = await detectorCanvas.evaluate((canvas) => canvas.toDataURL());
  const detectorKnob = page.locator("#lens_detector_sl0 .slider_knob");
  await detectorKnob.scrollIntoViewIfNeeded();
  const detectorKnobBox = await detectorKnob.boundingBox();
  assert(detectorKnobBox, "cameras-and-lenses did not expose the detector exposure slider");
  await page.mouse.move(
    detectorKnobBox.x + detectorKnobBox.width / 2,
    detectorKnobBox.y + detectorKnobBox.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    detectorKnobBox.x + detectorKnobBox.width / 2 + 90,
    detectorKnobBox.y + detectorKnobBox.height / 2,
    { steps: 12 },
  );
  await page.mouse.up();
  await page.waitForFunction((previous) => {
    const canvas = document.querySelector("#lens_detector canvas");
    return canvas && canvas.toDataURL() !== previous;
  }, detectorBefore, { timeout: 5000 });
  console.log("OK cameras-and-lenses detector exposure scene");

  await dragCanvasUntilChanged(page, "#lens_scene canvas", [
    { from: { x: 0.5, y: 0.5 }, to: { x: 0.68, y: 0.38 } },
    { from: { x: 0.55, y: 0.45 }, to: { x: 0.32, y: 0.62 } },
  ], "cameras-and-lenses early drag scene");
  console.log("OK cameras-and-lenses early drag scene");

  const filmCanvas = page.locator("#lens_film canvas").first();
  await filmCanvas.scrollIntoViewIfNeeded();
  const filmBefore = await filmCanvas.evaluate((canvas) => canvas.toDataURL());
  const filmDiameterKnob = page.locator("#lens_film_sl0 .slider_knob");
  await filmDiameterKnob.scrollIntoViewIfNeeded();
  const filmDiameterKnobBox = await filmDiameterKnob.boundingBox();
  assert(filmDiameterKnobBox, "cameras-and-lenses did not expose the pinhole diameter slider");
  await page.mouse.move(
    filmDiameterKnobBox.x + filmDiameterKnobBox.width / 2,
    filmDiameterKnobBox.y + filmDiameterKnobBox.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    filmDiameterKnobBox.x + filmDiameterKnobBox.width / 2 + 80,
    filmDiameterKnobBox.y + filmDiameterKnobBox.height / 2,
    { steps: 12 },
  );
  await page.mouse.up();
  await page.waitForFunction((previous) => {
    const canvas = document.querySelector("#lens_film canvas");
    return canvas && canvas.toDataURL() !== previous;
  }, filmBefore, { timeout: 5000 });

  const filmMid = await filmCanvas.evaluate((canvas) => canvas.toDataURL());
  const filmDistanceKnob = page.locator("#lens_film_sl1 .slider_knob");
  await filmDistanceKnob.scrollIntoViewIfNeeded();
  const filmDistanceKnobBox = await filmDistanceKnob.boundingBox();
  assert(filmDistanceKnobBox, "cameras-and-lenses did not expose the pinhole distance slider");
  await page.mouse.move(
    filmDistanceKnobBox.x + filmDistanceKnobBox.width / 2,
    filmDistanceKnobBox.y + filmDistanceKnobBox.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    filmDistanceKnobBox.x + filmDistanceKnobBox.width / 2 + 80,
    filmDistanceKnobBox.y + filmDistanceKnobBox.height / 2,
    { steps: 12 },
  );
  await page.mouse.up();
  await page.waitForFunction((previous) => {
    const canvas = document.querySelector("#lens_film canvas");
    return canvas && canvas.toDataURL() !== previous;
  }, filmMid, { timeout: 5000 });
  console.log("OK cameras-and-lenses pinhole dual-slider scene");

  const glassCanvas = page.locator("#lens_glass_rays canvas").first();
  await glassCanvas.scrollIntoViewIfNeeded();
  const glassBefore = await glassCanvas.evaluate((canvas) => canvas.toDataURL());
  const glassKnob = page.locator("#lens_glass_rays_sl0 .slider_knob");
  await glassKnob.scrollIntoViewIfNeeded();
  const glassKnobBox = await glassKnob.boundingBox();
  assert(glassKnobBox, "cameras-and-lenses did not expose the glass-ray slider");
  await page.mouse.move(
    glassKnobBox.x + glassKnobBox.width / 2,
    glassKnobBox.y + glassKnobBox.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    glassKnobBox.x + glassKnobBox.width / 2 + 70,
    glassKnobBox.y + glassKnobBox.height / 2,
    { steps: 12 },
  );
  await page.mouse.up();
  await page.waitForFunction((previous) => {
    const canvas = document.querySelector("#lens_glass_rays canvas");
    return canvas && canvas.toDataURL() !== previous;
  }, glassBefore, { timeout: 5000 });
  await dragCanvasUntilChanged(page, "#lens_glass_rays canvas", [
    { from: { x: 0.5, y: 0.5 }, to: { x: 0.66, y: 0.4 } },
    { from: { x: 0.55, y: 0.45 }, to: { x: 0.36, y: 0.58 } },
  ], "cameras-and-lenses glass drag scene");
  console.log("OK cameras-and-lenses glass ray scene");

  const playButton = page.locator(".play_pause_button").first();
  await playButton.scrollIntoViewIfNeeded();
  const playBefore = await playButton.getAttribute("class");
  await playButton.click();
  await page.waitForFunction((previous) => {
    const classes = document.querySelector(".play_pause_button")?.className || "";
    return classes !== previous;
  }, playBefore || "", { timeout: 5000 });
  console.log("OK cameras-and-lenses play-pause control");

  const chromaticCanvas = page.locator("#lens_chromatic canvas").first();
  await chromaticCanvas.scrollIntoViewIfNeeded();
  const chromaticBefore = await chromaticCanvas.evaluate((canvas) => canvas.toDataURL());
  const chromaticKnob = page.locator("#lens_chromatic_sl0 .slider_knob");
  await chromaticKnob.scrollIntoViewIfNeeded();
  const chromaticKnobBox = await chromaticKnob.boundingBox();
  assert(chromaticKnobBox, "cameras-and-lenses did not expose the chromatic aberration slider");
  await page.mouse.move(
    chromaticKnobBox.x + chromaticKnobBox.width / 2,
    chromaticKnobBox.y + chromaticKnobBox.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    chromaticKnobBox.x + chromaticKnobBox.width / 2 + 90,
    chromaticKnobBox.y + chromaticKnobBox.height / 2,
    { steps: 12 },
  );
  await page.mouse.up();
  await page.waitForFunction((previous) => {
    const canvas = document.querySelector("#lens_chromatic canvas");
    return canvas && canvas.toDataURL() !== previous;
  }, chromaticBefore, { timeout: 5000 });
  console.log("OK cameras-and-lenses later lens scene");

  await assertLongformResponsiveShell(
    context,
    page,
    "cameras-and-lenses/",
    "#lens_detector_sl0 .slider_knob",
    "cameras-and-lenses route",
    {
      expectedRoute: "cameras-and-lenses",
      minimumChapters: 6,
      playHref: "#lens_hero",
    },
  );
  await page.waitForTimeout(250);
  assertPageRuntimeClean("cameras-and-lenses route");
  console.log("OK cameras-and-lenses responsive shell");
  await page.close();
}

async function smokeLightsAndShadows(context) {
  const page = await context.newPage();
  const assertPageRuntimeClean = createRuntimeMonitor(page);
  await assertRoute(page, "lights-and-shadows/", "#reference-footer");
  await page.waitForFunction(() => {
    return document.querySelector("#lns_shadow2 canvas") &&
      document.querySelector("#lns_shadow2_rot_y_slider_container .slider_knob") &&
      document.querySelector("#lns_power canvas") &&
      document.querySelector("#lns_power_slider_container .slider_knob") &&
      document.querySelector("#lns_hemisphere_proj canvas") &&
      document.querySelector("#lns_hemisphere_proj_1_slider_container .slider_knob") &&
      document.querySelector("#lns_bounce canvas") &&
      document.querySelector("#lns_bounce_slider_container .slider_knob");
  }, null, { timeout: 30000 });
  await page.waitForTimeout(2500);

  await assertLocalScriptSources(page, ["./js/base.js", "./js/light.js"], "lights-and-shadows");
  await assertElementContract(page, ".lns_prediction", {
    attributes: { role: "note" },
    textFragments: ["Prediction:", "shadow edge sharper or softer", "effect of size from direction"],
  }, "lights-and-shadows prediction note");

  const openingCanvas = page.locator("#lns_shadow2 canvas").first();
  await openingCanvas.scrollIntoViewIfNeeded();
  const openingBefore = await openingCanvas.evaluate((canvas) => canvas.toDataURL());
  const openingKnob = page.locator("#lns_shadow2_rot_y_slider_container .slider_knob");
  await openingKnob.scrollIntoViewIfNeeded();
  const openingKnobBox = await openingKnob.boundingBox();
  assert(openingKnobBox, "lights-and-shadows did not expose the opening light-size slider");
  await page.mouse.move(
    openingKnobBox.x + openingKnobBox.width / 2,
    openingKnobBox.y + openingKnobBox.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    openingKnobBox.x + openingKnobBox.width / 2 + 90,
    openingKnobBox.y + openingKnobBox.height / 2,
    { steps: 12 },
  );
  await page.mouse.up();
  await page.waitForFunction((previous) => {
    const canvas = document.querySelector("#lns_shadow2 canvas");
    return canvas && canvas.toDataURL() !== previous;
  }, openingBefore, { timeout: 5000 });
  await dragCanvasUntilChanged(page, "#lns_shadow2 canvas", [
    { from: { x: 0.55, y: 0.5 }, to: { x: 0.72, y: 0.36 } },
    { from: { x: 0.5, y: 0.45 }, to: { x: 0.32, y: 0.62 } },
  ], "lights-and-shadows opening drag scene");
  console.log("OK lights-and-shadows opening light scene");

  const powerCanvas = page.locator("#lns_power canvas").first();
  await powerCanvas.scrollIntoViewIfNeeded();
  const powerBefore = await powerCanvas.evaluate((canvas) => canvas.toDataURL());
  const powerKnob = page.locator("#lns_power_slider_container .slider_knob");
  await powerKnob.scrollIntoViewIfNeeded();
  const powerKnobBox = await powerKnob.boundingBox();
  assert(powerKnobBox, "lights-and-shadows did not expose the power slider");
  await page.mouse.move(
    powerKnobBox.x + powerKnobBox.width / 2,
    powerKnobBox.y + powerKnobBox.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    powerKnobBox.x + powerKnobBox.width / 2 + 90,
    powerKnobBox.y + powerKnobBox.height / 2,
    { steps: 12 },
  );
  await page.mouse.up();
  await page.waitForFunction((previous) => {
    const canvas = document.querySelector("#lns_power canvas");
    return canvas && canvas.toDataURL() !== previous;
  }, powerBefore, { timeout: 5000 });
  console.log("OK lights-and-shadows power scene");

  const projectedCanvas = page.locator("#lns_hemisphere_proj canvas").first();
  await projectedCanvas.scrollIntoViewIfNeeded();
  const projectedBefore = await projectedCanvas.evaluate((canvas) => canvas.toDataURL());
  const projectedKnob = page.locator("#lns_hemisphere_proj_1_slider_container .slider_knob");
  await projectedKnob.scrollIntoViewIfNeeded();
  const projectedKnobBox = await projectedKnob.boundingBox();
  assert(projectedKnobBox, "lights-and-shadows did not expose the projected-solid-angle slider");
  await page.mouse.move(
    projectedKnobBox.x + projectedKnobBox.width / 2,
    projectedKnobBox.y + projectedKnobBox.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    projectedKnobBox.x + projectedKnobBox.width / 2 + 75,
    projectedKnobBox.y + projectedKnobBox.height / 2,
    { steps: 12 },
  );
  await page.mouse.up();
  await page.waitForFunction((previous) => {
    const canvas = document.querySelector("#lns_hemisphere_proj canvas");
    return canvas && canvas.toDataURL() !== previous;
  }, projectedBefore, { timeout: 5000 });
  console.log("OK lights-and-shadows projected solid-angle scene");

  const bounceCanvas = page.locator("#lns_bounce canvas").first();
  await bounceCanvas.scrollIntoViewIfNeeded();
  const bounceBefore = await bounceCanvas.evaluate((canvas) => canvas.toDataURL());
  const bounceKnob = page.locator("#lns_bounce_slider_container .slider_knob");
  await bounceKnob.scrollIntoViewIfNeeded();
  const bounceKnobBox = await bounceKnob.boundingBox();
  assert(bounceKnobBox, "lights-and-shadows did not expose the bounce-light slider");
  await page.mouse.move(
    bounceKnobBox.x + bounceKnobBox.width / 2,
    bounceKnobBox.y + bounceKnobBox.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    bounceKnobBox.x + bounceKnobBox.width / 2 + 90,
    bounceKnobBox.y + bounceKnobBox.height / 2,
    { steps: 12 },
  );
  await page.mouse.up();
  await page.waitForFunction((previous) => {
    const canvas = document.querySelector("#lns_bounce canvas");
    return canvas && canvas.toDataURL() !== previous;
  }, bounceBefore, { timeout: 5000 });
  console.log("OK lights-and-shadows later bounce scene");

  await assertLongformResponsiveShell(
    context,
    page,
    "lights-and-shadows/",
    "#lns_shadow2_rot_y_slider_container .slider_knob",
    "lights-and-shadows route",
    {
      expectedRoute: "lights-and-shadows",
      minimumChapters: 7,
      playHref: "#lns_shadow2",
    },
  );
  await page.waitForTimeout(250);
  assertPageRuntimeClean("lights-and-shadows route");
  console.log("OK lights-and-shadows responsive shell");
  await page.close();
}

async function smokeTesseract(context) {
  const page = await context.newPage();
  const assertPageRuntimeClean = createRuntimeMonitor(page);
  await assertRoute(page, "tesseract/", "#reference-footer");
  await page.waitForFunction(() => {
    return document.querySelector("#ts_3D_demo_slice_container canvas") &&
      document.querySelector("#ts_3D_demo_slice_slider_container .slider_knob") &&
      document.querySelector("#ts_3D_cube_container canvas") &&
      document.querySelector("#ts_3D_cube_slider_container .slider_knob") &&
      document.querySelector("#ts_3D_proj_rot_container canvas") &&
      document.querySelector("#ts_3D_projxw_slider_container .slider_knob") &&
      document.querySelector("#ts_3D_slice_container canvas") &&
      document.querySelector("#ts_3D_slice_xw_rot_slider_container .slider_knob");
  }, null, { timeout: 30000 });
  await page.waitForTimeout(2500);

  await assertLocalScriptSources(page, ["./js/base.js", "./js/tesseract.js"], "tesseract");
  await assertElementContract(page, ".tesseract-slice-cue", {
    textFragments: ["Reading the slice:", "only the 3D viewpoint", "4D object intersects our world"],
  }, "tesseract slice-reading cue");

  const openingCanvas = page.locator("#ts_3D_demo_slice_container canvas").first();
  await openingCanvas.scrollIntoViewIfNeeded();
  const openingBefore = await openingCanvas.evaluate((canvas) => canvas.toDataURL());
  const openingKnob = page.locator("#ts_3D_demo_slice_slider_container .slider_knob");
  await openingKnob.scrollIntoViewIfNeeded();
  const openingKnobBox = await openingKnob.boundingBox();
  assert(openingKnobBox, "tesseract did not expose the opening slider scene");
  await page.mouse.move(
    openingKnobBox.x + openingKnobBox.width / 2,
    openingKnobBox.y + openingKnobBox.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    openingKnobBox.x + openingKnobBox.width / 2 + 90,
    openingKnobBox.y + openingKnobBox.height / 2,
    { steps: 12 },
  );
  await page.mouse.up();
  await page.waitForFunction((previous) => {
    const canvas = document.querySelector("#ts_3D_demo_slice_container canvas");
    return canvas && canvas.toDataURL() !== previous;
  }, openingBefore, { timeout: 5000 });
  console.log("OK tesseract opening slider scene");

  const constructionCanvas = page.locator("#ts_3D_cube_container canvas").first();
  await constructionCanvas.scrollIntoViewIfNeeded();
  const constructionBefore = await constructionCanvas.evaluate((canvas) => canvas.toDataURL());
  const constructionKnob = page.locator("#ts_3D_cube_slider_container .slider_knob");
  await constructionKnob.scrollIntoViewIfNeeded();
  const constructionKnobBox = await constructionKnob.boundingBox();
  assert(constructionKnobBox, "tesseract did not expose the early construction slider");
  await page.mouse.move(
    constructionKnobBox.x + constructionKnobBox.width / 2,
    constructionKnobBox.y + constructionKnobBox.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    constructionKnobBox.x + constructionKnobBox.width / 2 + 85,
    constructionKnobBox.y + constructionKnobBox.height / 2,
    { steps: 12 },
  );
  await page.mouse.up();
  await page.waitForFunction((previous) => {
    const canvas = document.querySelector("#ts_3D_cube_container canvas");
    return canvas && canvas.toDataURL() !== previous;
  }, constructionBefore, { timeout: 5000 });
  console.log("OK tesseract early construction scene");

  await dragCanvasUntilChanged(page, "#ts_3D_proj_rot_container canvas", [
    { from: { x: 0.55, y: 0.5 }, to: { x: 0.72, y: 0.35 } },
    { from: { x: 0.45, y: 0.5 }, to: { x: 0.28, y: 0.66 } },
  ], "tesseract perspective drag scene");
  console.log("OK tesseract perspective drag scene");

  const rotationCanvas = page.locator("#ts_3D_proj_rot_container canvas").first();
  await rotationCanvas.scrollIntoViewIfNeeded();
  const rotationBefore = await rotationCanvas.evaluate((canvas) => canvas.toDataURL());
  const rotationKnob = page.locator("#ts_3D_projxw_slider_container .slider_knob");
  await rotationKnob.scrollIntoViewIfNeeded();
  const rotationKnobBox = await rotationKnob.boundingBox();
  assert(rotationKnobBox, "tesseract did not expose the xw-plane rotation slider");
  await page.mouse.move(
    rotationKnobBox.x + rotationKnobBox.width / 2,
    rotationKnobBox.y + rotationKnobBox.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    rotationKnobBox.x + rotationKnobBox.width / 2 + 90,
    rotationKnobBox.y + rotationKnobBox.height / 2,
    { steps: 12 },
  );
  await page.mouse.up();
  await page.waitForFunction((previous) => {
    const canvas = document.querySelector("#ts_3D_proj_rot_container canvas");
    return canvas && canvas.toDataURL() !== previous;
  }, rotationBefore, { timeout: 5000 });
  console.log("OK tesseract plane-of-rotation scene");

  const sliceCanvas = page.locator("#ts_3D_slice_container canvas").first();
  await sliceCanvas.scrollIntoViewIfNeeded();
  const sliceBefore = await sliceCanvas.evaluate((canvas) => canvas.toDataURL());
  const sliceKnob = page.locator("#ts_3D_slice_xw_rot_slider_container .slider_knob");
  await sliceKnob.scrollIntoViewIfNeeded();
  const sliceKnobBox = await sliceKnob.boundingBox();
  assert(sliceKnobBox, "tesseract did not expose the later 3D slice rotation slider");
  await page.mouse.move(
    sliceKnobBox.x + sliceKnobBox.width / 2,
    sliceKnobBox.y + sliceKnobBox.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    sliceKnobBox.x + sliceKnobBox.width / 2 + 90,
    sliceKnobBox.y + sliceKnobBox.height / 2,
    { steps: 12 },
  );
  await page.mouse.up();
  await page.waitForFunction((previous) => {
    const canvas = document.querySelector("#ts_3D_slice_container canvas");
    return canvas && canvas.toDataURL() !== previous;
  }, sliceBefore, { timeout: 5000 });
  console.log("OK tesseract later slice scene");

  await assertLongformResponsiveShell(
    context,
    page,
    "tesseract/",
    "#ts_3D_demo_slice_slider_container .slider_knob",
    "tesseract route",
    {
      expectedRoute: "tesseract",
      minimumChapters: 6,
      playHref: "#ts_3D_demo_slice_container",
    },
  );
  await page.waitForTimeout(250);
  assertPageRuntimeClean("tesseract route");
  console.log("OK tesseract responsive shell");
  await page.close();
}

async function smokeGears(context) {
  const page = await context.newPage();
  const assertPageRuntimeClean = createRuntimeMonitor(page);
  await assertRoute(page, "gears/", "#reference-footer");
  await page.waitForFunction(() => {
    return document.querySelector("#gears_demo canvas") &&
      document.querySelector("#gears_demo .play_pause_button") &&
      document.querySelector("#gears_angular_velocity canvas") &&
      document.querySelector("#gears_angular_velocity_slider_container .slider_knob") &&
      document.querySelector("#gears_resize canvas") &&
      document.querySelector("#gears_resize_slider_container .slider_knob") &&
      document.querySelector("#gears_four canvas") &&
      document.querySelector("#gears_four_slider_container .slider_knob");
  }, null, { timeout: 30000 });
  await page.waitForTimeout(2500);

  await assertLocalScriptSources(page, ["./js/base.js", "./js/gears.js"], "gears");
  await assertElementContract(page, ".gear-ratio-check", {
    attributes: { role: "note" },
    textFragments: ["Ratio check:", "half as many turns", "direction still reverses"],
  }, "gears ratio note");

  const openingCanvas = page.locator("#gears_angular_velocity canvas").first();
  await openingCanvas.scrollIntoViewIfNeeded();
  const openingBefore = await openingCanvas.evaluate((canvas) => canvas.toDataURL());
  await dragKnob(page, "#gears_angular_velocity_slider_container .slider_knob", 90, 0, "gears opening slider");
  await page.waitForFunction((previous) => {
    const canvas = document.querySelector("#gears_angular_velocity canvas");
    return canvas && canvas.toDataURL() !== previous;
  }, openingBefore, { timeout: 5000 });
  console.log("OK gears opening angular-velocity scene");

  const playButton = page.locator("#gears_demo .play_pause_button").first();
  await playButton.scrollIntoViewIfNeeded();
  await playButton.click();
  await page.waitForFunction(() => {
    const button = document.querySelector("#gears_demo .play_pause_button");
    return button && !button.classList.contains("playing");
  }, null, { timeout: 5000 });
  await playButton.click();
  await page.waitForFunction(() => {
    const button = document.querySelector("#gears_demo .play_pause_button");
    return button && button.classList.contains("playing");
  }, null, { timeout: 5000 });
  console.log("OK gears play-pause control");

  const ratioCanvas = page.locator("#gears_resize canvas").first();
  await ratioCanvas.scrollIntoViewIfNeeded();
  const ratioBefore = await ratioCanvas.evaluate((canvas) => canvas.toDataURL());
  await dragKnob(page, "#gears_resize_slider_container .slider_knob", 90, 0, "gears ratio slider");
  await page.waitForFunction((previous) => {
    const canvas = document.querySelector("#gears_resize canvas");
    return canvas && canvas.toDataURL() !== previous;
  }, ratioBefore, { timeout: 5000 });
  console.log("OK gears ratio scene");

  const compoundCanvas = page.locator("#gears_four canvas").first();
  await compoundCanvas.scrollIntoViewIfNeeded();
  const compoundBefore = await compoundCanvas.evaluate((canvas) => canvas.toDataURL());
  await dragKnob(page, "#gears_four_slider_container .slider_knob", 90, 0, "gears compound slider");
  await page.waitForFunction((previous) => {
    const canvas = document.querySelector("#gears_four canvas");
    return canvas && canvas.toDataURL() !== previous;
  }, compoundBefore, { timeout: 5000 });
  console.log("OK gears compound-gear scene");

  await assertLongformResponsiveShell(
    context,
    page,
    "gears/",
    "#gears_angular_velocity_slider_container .slider_knob",
    "gears route",
    {
      expectedRoute: "gears",
      minimumChapters: 6,
      playHref: "#gears_demo",
    },
  );
  await page.waitForTimeout(250);
  assertPageRuntimeClean("gears route");
  console.log("OK gears responsive shell");
  await page.close();
}

async function smokeStargazingDashboard(context) {
  const page = await context.newPage();
  const assertPageRuntimeClean = createRuntimeMonitor(page);
  await assertRoute(page, "stargazing-dashboard/", "#reference-footer");

  await page.waitForFunction(() => {
    return document.body && typeof document.body.dataset.stargazingReady === "string";
  }, null, { timeout: 30000 });

  const readyState = await page.evaluate(() => document.body.dataset.stargazingReady);
  assert(
    readyState === "true",
    `stargazing-dashboard did not reach WebGL ready state (was "${readyState}")`,
  );

  await assertLocalScriptSources(
    page,
    [
      "./js/astro.js",
      "./js/state.js",
      "./js/controls.js",
      "./js/catalog.js",
      "./js/scene.js",
      "./js/hud.js",
      "./js/main.js",
    ],
    "stargazing-dashboard",
  );

  const canvasTabindex = await page.evaluate(() => {
    const canvas = document.querySelector("#sky-canvas");
    return canvas ? canvas.getAttribute("tabindex") : null;
  });
  assert(canvasTabindex === "0", `#sky-canvas missing tabindex="0" (was ${canvasTabindex})`);

  await page.locator("#sky-canvas").focus();
  const canvasFocused = await page.evaluate(() => {
    return document.activeElement === document.querySelector("#sky-canvas");
  });
  assert(canvasFocused, "#sky-canvas did not become the active element after focus()");

  const lookBefore = await page.evaluate(() => window.StargazingState.getState().look);
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowUp");
  await page.waitForFunction((previous) => {
    const look = window.StargazingState.getState().look;
    return look.azDeg !== previous.azDeg && look.altDeg !== previous.altDeg;
  }, lookBefore, { timeout: 5000 });
  console.log("OK stargazing-dashboard keyboard navigation");

  await page.waitForSelector("#tonight-button", { timeout: 15000 });
  await page.waitForSelector("#shortcut-toggle", { timeout: 15000 });
  await page.waitForSelector("#shortcut-help", { state: "attached", timeout: 15000 });
  await page.waitForSelector("#sky-tooltip", { state: "attached", timeout: 15000 });
  await page.waitForSelector("#object-details", { state: "attached", timeout: 15000 });
  await page.waitForSelector("#sky-legend", { timeout: 15000 });
  await page.waitForSelector('[data-display="zoom"]', { timeout: 15000 });
  await page.waitForSelector('[data-display="brightness"]', { timeout: 15000 });
  await page.waitForSelector('[data-display="starScale"]', { timeout: 15000 });
  await page.waitForSelector('[data-display="magLimit"]', { timeout: 15000 });

  const constellationToggleBefore = await page.evaluate(() => {
    return window.StargazingState.getState().toggles.constellations;
  });
  await page.locator('[data-toggle="constellations"]').click();
  await page.waitForFunction((previous) => {
    return window.StargazingState.getState().toggles.constellations !== previous;
  }, constellationToggleBefore, { timeout: 5000 });

  await page.locator('[data-display="magLimit"]').evaluate((input) => {
    input.value = "4.5";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await page.waitForFunction(() => {
    return Math.abs(window.StargazingState.getState().display.magLimit - 4.5) < 0.01;
  }, null, { timeout: 5000 });

  const playingBefore = await page.evaluate(() => window.StargazingState.getState().time.playing);
  await page.locator("#time-play").click();
  await page.waitForFunction((previous) => {
    return window.StargazingState.getState().time.playing !== previous;
  }, playingBefore, { timeout: 5000 });

  await page.locator("#shortcut-toggle").click();
  await page.waitForFunction(() => {
    const help = document.querySelector("#shortcut-help");
    return help && !help.hidden;
  }, null, { timeout: 5000 });
  await page.keyboard.press("Escape");
  await page.waitForFunction(() => {
    const help = document.querySelector("#shortcut-help");
    return help && help.hidden;
  }, null, { timeout: 5000 });

  await page.locator("#tonight-button").click();
  await page.waitForFunction(() => {
    const state = window.StargazingState.getState();
    const details = document.querySelector("#object-details");
    return Boolean(state.selectedTargetId) && details && details.dataset.open === "true";
  }, null, { timeout: 5000 });
  console.log("OK stargazing-dashboard selective map controls");

  await page.locator("#details-close").click();
  await page.waitForFunction(() => {
    const details = document.querySelector("#object-details");
    return details && details.hidden && details.dataset.open === "false";
  }, null, { timeout: 5000 });
  console.log("OK stargazing-dashboard details close state");

  // RED: #sky-tooltip shows a fallback instruction on mousemove over empty
  // sky ("Select a target or point at a star to see details"), and changes
  // to the selected object's data when an object is beneath the cursor.
  // Trigger a mousemove over the canvas to make the tooltip visible.
  const canvas = page.locator("#sky-canvas");
  await canvas.hover({ force: true });
  await page.waitForFunction(() => {
    const tooltip = document.getElementById("sky-tooltip");
    return tooltip && !tooltip.hidden && tooltip.textContent.length > 0;
  }, null, { timeout: 5000 });

  await page.waitForTimeout(250);
  assertPageRuntimeClean("stargazing-dashboard route");
  await page.close();
}

async function smokeGps(context) {
  const page = await context.newPage();
  const assertPageRuntimeClean = createRuntimeMonitor(page);
  await assertRoute(page, "gps/", "#reference-footer");
  await page.waitForFunction(() => {
    return document.querySelector("#gps_orbits_hero canvas") &&
      document.querySelector("#map0 canvas") &&
      document.querySelector("#map_drone0 canvas") &&
      document.querySelector("#map_drone0_sl0 .slider_knob") &&
      document.querySelector("#orbital_inclination canvas") &&
      document.querySelector("#orbital_inclination_sl1 .slider_knob");
  }, null, { timeout: 30000 });
  await page.waitForTimeout(3000);

  await assertLocalScriptSources(page, ["./js/base.js", "./js/gps.js"], "gps");
  await assertElementContract(page, ".gps-orbit-cue", {
    textFragments: ["Orientation check:", "not the satellite timing", "turns the constellation into ranges"],
  }, "gps orbit-orientation cue");

  await dragCanvasUntilChanged(
    page,
    "#map0 canvas",
    [
      { from: { x: 0.35, y: 0.45 }, to: { x: 0.7, y: 0.45 } },
      { from: { x: 0.65, y: 0.55 }, to: { x: 0.35, y: 0.4 } },
    ],
    "gps simple positioning drag scene",
  );
  console.log("OK gps drag scene");

  const timeCanvas = page.locator("#map_drone0 canvas").first();
  await timeCanvas.scrollIntoViewIfNeeded();
  const timeBefore = await timeCanvas.evaluate((canvas) => canvas.toDataURL());
  await dragKnob(page, "#map_drone0_sl0 .slider_knob", 120, 0, "gps time slider");
  await page.waitForFunction((previous) => {
    const canvas = document.querySelector("#map_drone0 canvas");
    return canvas && canvas.toDataURL() !== previous;
  }, timeBefore, { timeout: 5000 });
  console.log("OK gps time slider scene");

  const orbitCanvas = page.locator("#orbital_inclination canvas").first();
  await orbitCanvas.scrollIntoViewIfNeeded();
  const orbitBefore = await orbitCanvas.evaluate((canvas) => canvas.toDataURL());
  await dragKnob(page, "#orbital_inclination_sl1 .slider_knob", 120, 0, "gps inclination slider");
  await page.waitForFunction((previous) => {
    const canvas = document.querySelector("#orbital_inclination canvas");
    return canvas && canvas.toDataURL() !== previous;
  }, orbitBefore, { timeout: 5000 });
  console.log("OK gps orbital inclination scene");

  await assertLongformResponsiveShell(
    context,
    page,
    "gps/",
    "#map0 canvas",
    "gps route",
    {
      expectedRoute: "gps",
      minimumChapters: 7,
      playHref: "#gps_orbits_hero",
    },
  );
  await page.waitForTimeout(250);
  assertPageRuntimeClean("gps route");
  console.log("OK gps responsive shell");
  await page.close();
}

async function smokeEarthAndSun(context) {
  const page = await context.newPage();
  const assertPageRuntimeClean = createRuntimeMonitor(page);
  await assertRoute(page, "earth-and-sun/", "#reference-footer");
  await page.waitForFunction(() => {
    return document.querySelector("#es_earth_sunlight canvas") &&
      document.querySelector("#es_earth_sunlight_date_slider_container .slider_knob") &&
      document.querySelector("#es_earth_sunlight_time_slider_container .slider_knob") &&
      document.querySelector("#es_plane canvas") &&
      document.querySelector("#es_tropical_year canvas") &&
      document.querySelector("#es_tropical_year_slider_container .slider_knob");
  }, null, { timeout: 30000 });
  await page.waitForTimeout(3000);

  await assertLocalScriptSources(page, ["./js/base.js", "./js/earth_sun.js"], "earth-and-sun");
  await assertElementContract(page, ".earth-sun-comparison-cue", {
    textFragments: ["hold the date fixed while moving time", "reveals rotation", "seasonal shift in sunlight"],
  }, "earth-and-sun comparison cue");

  await dragCanvasUntilChanged(
    page,
    "#es_earth_sunlight canvas",
    [
      { from: { x: 0.35, y: 0.45 }, to: { x: 0.7, y: 0.55 } },
      { from: { x: 0.65, y: 0.55 }, to: { x: 0.35, y: 0.35 } },
    ],
    "earth-and-sun opening globe drag scene",
  );
  console.log("OK earth-and-sun opening globe drag scene");

  const sunlightCanvas = page.locator("#es_earth_sunlight canvas").first();
  await sunlightCanvas.scrollIntoViewIfNeeded();
  const timeBefore = await sunlightCanvas.evaluate((canvas) => canvas.toDataURL());
  await dragKnob(
    page,
    "#es_earth_sunlight_time_slider_container .slider_knob",
    120,
    0,
    "earth-and-sun opening time slider",
  );
  await page.waitForFunction((previous) => {
    const canvas = document.querySelector("#es_earth_sunlight canvas");
    return canvas && canvas.toDataURL() !== previous;
  }, timeBefore, { timeout: 5000 });
  console.log("OK earth-and-sun opening time slider");

  const tropicalCanvas = page.locator("#es_tropical_year canvas").first();
  await tropicalCanvas.scrollIntoViewIfNeeded();
  const tropicalBefore = await tropicalCanvas.evaluate((canvas) => canvas.toDataURL());
  await dragKnob(
    page,
    "#es_tropical_year_slider_container .slider_knob",
    120,
    0,
    "earth-and-sun tropical-year slider",
  );
  await page.waitForFunction((previous) => {
    const canvas = document.querySelector("#es_tropical_year canvas");
    return canvas && canvas.toDataURL() !== previous;
  }, tropicalBefore, { timeout: 5000 });
  console.log("OK earth-and-sun tropical-year scene");

  await assertLongformResponsiveShell(
    context,
    page,
    "earth-and-sun/",
    "#es_earth_sunlight canvas",
    "earth-and-sun route",
    {
      expectedRoute: "earth-and-sun",
      minimumChapters: 6,
      playHref: "#es_earth_sunlight",
    },
  );
  await page.waitForTimeout(250);
  assertPageRuntimeClean("earth-and-sun route");
  console.log("OK earth-and-sun responsive shell");
  await page.close();
}

async function smokeBicycle(context) {
  const page = await context.newPage();
  const assertPageRuntimeClean = createRuntimeMonitor(page);
  await assertRoute(page, "bicycle/", "#reference-footer");
  await page.waitForFunction(() => {
    return document.querySelector("#hero canvas") &&
      document.querySelector("#hero .play_pause_button") &&
      document.querySelector("#hero_sl0 .slider_knob") &&
      document.querySelector("#force1 canvas") &&
      document.querySelector("#force1_sl0 .slider_knob") &&
      document.querySelector("#slip_angle2 canvas") &&
      document.querySelector("#slip_angle2_sl0 .slider_knob") &&
      document.querySelector("#torsion1 canvas") &&
      document.querySelector("#torsion1_sl0 .slider_knob");
  }, null, { timeout: 30000 });
  await page.waitForTimeout(3000);

  await assertLocalScriptSources(page, ["./js/base.js", "./js/bicycle.js"], "bicycle");
  await assertElementContract(page, ".wheel-velocity-guide", {
    tagName: "NAV",
    attributes: { "aria-label": "Wheel motion presets" },
  }, "bicycle wheel-motion presets");
  await assertLinkSequence(page, ".wheel-velocity-guide a", [
    { text: "sliding", href: "#wheel_velocity1", onclick: "wheel_velocity1_f0();return false;" },
    { text: "spinning", href: "#wheel_velocity1", onclick: "wheel_velocity1_f1();return false;" },
    { text: "rolling", href: "#wheel_velocity1", onclick: "wheel_velocity1_f2();return false;" },
  ], "bicycle wheel-motion presets");

  const heroPlayButton = page.locator("#hero .play_pause_button").first();
  await heroPlayButton.scrollIntoViewIfNeeded();
  await heroPlayButton.click();
  await page.waitForFunction(() => {
    const button = document.querySelector("#hero .play_pause_button");
    return button && !button.classList.contains("playing");
  }, null, { timeout: 5000 });
  await dragCanvasUntilChanged(
    page,
    "#hero canvas",
    [
      { from: { x: 0.35, y: 0.45 }, to: { x: 0.7, y: 0.55 } },
      { from: { x: 0.65, y: 0.55 }, to: { x: 0.35, y: 0.35 } },
    ],
    "bicycle opening hero drag scene",
  );
  await heroPlayButton.click();
  await page.waitForFunction(() => {
    const button = document.querySelector("#hero .play_pause_button");
    return button && button.classList.contains("playing");
  }, null, { timeout: 5000 });
  console.log("OK bicycle opening hero scene");

  const forceCanvas = page.locator("#force1 canvas").first();
  await forceCanvas.scrollIntoViewIfNeeded();
  const forceBefore = await forceCanvas.evaluate((canvas) => canvas.toDataURL());
  await dragKnob(page, "#force1_sl0 .slider_knob", 90, 0, "bicycle force slider");
  await page.waitForFunction((previous) => {
    const canvas = document.querySelector("#force1 canvas");
    return canvas && canvas.toDataURL() !== previous;
  }, forceBefore, { timeout: 5000 });
  console.log("OK bicycle force scene");

  const slipCanvas = page.locator("#slip_angle2 canvas").first();
  await slipCanvas.scrollIntoViewIfNeeded();
  const slipBefore = await slipCanvas.evaluate((canvas) => canvas.toDataURL());
  await dragKnob(page, "#slip_angle2_sl0 .slider_knob", 90, 0, "bicycle slip-angle slider");
  await page.waitForFunction((previous) => {
    const canvas = document.querySelector("#slip_angle2 canvas");
    return canvas && canvas.toDataURL() !== previous;
  }, slipBefore, { timeout: 5000 });
  console.log("OK bicycle slip-angle scene");

  const torsionCanvas = page.locator("#torsion1 canvas").first();
  await torsionCanvas.scrollIntoViewIfNeeded();
  const torsionBefore = await torsionCanvas.evaluate((canvas) => canvas.toDataURL());
  await dragKnob(page, "#torsion1_sl0 .slider_knob", 90, 0, "bicycle torsion slider");
  await page.waitForFunction((previous) => {
    const canvas = document.querySelector("#torsion1 canvas");
    return canvas && canvas.toDataURL() !== previous;
  }, torsionBefore, { timeout: 5000 });
  console.log("OK bicycle torsion scene");

  await assertLongformResponsiveShell(
    context,
    page,
    "bicycle/",
    "#hero canvas",
    "bicycle route",
    {
      expectedRoute: "bicycle",
      minimumChapters: 12,
      playHref: "#hero",
    },
  );
  await page.waitForTimeout(250);
  assertPageRuntimeClean("bicycle route");
  console.log("OK bicycle responsive shell");
  await page.close();
}

async function smokeAirfoil(context) {
  const page = await context.newPage();
  const assertPageRuntimeClean = createRuntimeMonitor(page);
  await assertRoute(page, "airfoil/", "#reference-footer");
  await page.waitForFunction(() => {
    return document.querySelector("#hero_fvm canvas") &&
      document.querySelector("#hero_fvm_sl0 .slider_knob") &&
      document.querySelector("#fdm_hero canvas") &&
      document.querySelector("#fdm_hero_sl0 .slider_knob") &&
      document.querySelector("#particles1 canvas") &&
      document.querySelector("#airfoil_fvm2 canvas") &&
      document.querySelector("#airfoil_fvm2_sl0 .slider_knob");
  }, null, { timeout: 30000 });
  await page.waitForTimeout(3000);

  await assertLocalScriptSources(page, ["./js/base.js", "./js/airfoil.js"], "airfoil");
  await assertElementContract(page, ".airfoil_flow_prompt[open]", {
    tagName: "DETAILS",
    textFragments: ["What to watch in the opening flow", "leading edge", "trailing edge"],
  }, "airfoil opening-flow guide");

  const heroCanvas = page.locator("#hero_fvm canvas").first();
  await heroCanvas.scrollIntoViewIfNeeded();
  const heroBefore = await heroCanvas.evaluate((canvas) => canvas.toDataURL());
  await dragKnob(page, "#hero_fvm_sl0 .slider_knob", 90, 0, "airfoil opening slider");
  await page.waitForFunction((previous) => {
    const canvas = document.querySelector("#hero_fvm canvas");
    return canvas && canvas.toDataURL() !== previous;
  }, heroBefore, { timeout: 5000 });
  console.log("OK airfoil opening airfoil scene");

  await dragCanvasUntilChanged(
    page,
    "#particles1 canvas",
    [
      { from: { x: 0.35, y: 0.45 }, to: { x: 0.7, y: 0.55 } },
      { from: { x: 0.65, y: 0.55 }, to: { x: 0.35, y: 0.35 } },
    ],
    "airfoil particle drag scene",
  );
  console.log("OK airfoil particle drag scene");

  const viscosityKnob = page.locator("#fdm_hero_sl0 .slider_knob").first();
  await viscosityKnob.scrollIntoViewIfNeeded();
  const viscosityBeforeBox = await viscosityKnob.boundingBox();
  assert(viscosityBeforeBox, "airfoil did not expose the viscosity slider control");
  await dragKnob(page, "#fdm_hero_sl0 .slider_knob", 90, 0, "airfoil viscosity slider");
  await page.waitForTimeout(250);
  const viscosityAfterBox = await viscosityKnob.boundingBox();
  assert(viscosityAfterBox, "airfoil viscosity slider disappeared after drag");
  assert(
    Math.abs(viscosityAfterBox.x - viscosityBeforeBox.x) > 20,
    "airfoil viscosity slider did not move under drag input",
  );
  console.log("OK airfoil viscosity scene");

  const laterCanvas = page.locator("#airfoil_fvm2 canvas").first();
  await laterCanvas.scrollIntoViewIfNeeded();
  const laterBefore = await laterCanvas.evaluate((canvas) => canvas.toDataURL());
  await dragKnob(page, "#airfoil_fvm2_sl0 .slider_knob", 90, 0, "airfoil later airfoil slider");
  await page.waitForFunction((previous) => {
    const canvas = document.querySelector("#airfoil_fvm2 canvas");
    return canvas && canvas.toDataURL() !== previous;
  }, laterBefore, { timeout: 10000 });
  console.log("OK airfoil later airfoil scene");

  await assertLongformResponsiveShell(
    context,
    page,
    "airfoil/",
    "#hero_fvm canvas",
    "airfoil route",
    {
      expectedRoute: "airfoil",
      minimumChapters: 8,
      playHref: "#hero_fvm",
    },
  );
  await page.waitForTimeout(250);
  assertPageRuntimeClean("airfoil route");
  console.log("OK airfoil responsive shell");
  await page.close();
}

async function smokeCurvesAndSurfaces(context) {
  const page = await context.newPage();
  const assertPageRuntimeClean = createRuntimeMonitor(page);
  await assertRoute(page, "curves-and-surfaces/", "#reference-footer");
  await page.waitForFunction(() => {
    return document.querySelector("#cs_control_points canvas") &&
      document.querySelector("#cs_linear_segment canvas") &&
      document.querySelector("#cs_linear_segment_sl0 .slider_knob") &&
      document.querySelector("#cs_curve_subdiv_topo canvas") &&
      document.querySelector("#cs_curve_subdiv_topo_sl0 .slider_knob") &&
      document.querySelector("#cs_subdiv0 canvas") &&
      document.querySelector("#cs_subdiv0_sl0 .slider_knob");
  }, null, { timeout: 30000 });
  await page.waitForTimeout(2500);

  await assertLocalScriptSources(page, ["./js/base.js", "./js/curves.js"], "curves-and-surfaces");
  await assertElementContract(page, ".curves-handle-cue", {
    textFragments: ["white points are handles", "does not pass through them"],
  }, "curves-and-surfaces handle cue");

  const controlCanvas = page.locator("#cs_control_points canvas").first();
  await controlCanvas.scrollIntoViewIfNeeded();
  await page.waitForFunction(() => {
    return typeof control_points !== "undefined" && control_points?.[0]?.visible === true;
  }, null, { timeout: 5000 });
  const controlBox = await controlCanvas.boundingBox();
  assert(controlBox, "curves-and-surfaces control-point drag scene did not expose its canvas");
  let dragOrigin = null;
  for (let yi = 1; yi <= 15 && !dragOrigin; yi += 1) {
    for (let xi = 1; xi <= 19 && !dragOrigin; xi += 1) {
      const x = controlBox.x + (controlBox.width * xi / 20);
      const y = controlBox.y + (controlBox.height * yi / 16);
      await page.mouse.move(x, y);
      const cursor = await controlCanvas.evaluate((element) => element.style.cursor || getComputedStyle(element).cursor);
      if (cursor === "move" || cursor === "pointer") {
        dragOrigin = { x, y };
      }
    }
  }
  assert(dragOrigin, "curves-and-surfaces control-point drag scene did not expose a draggable hotspot");
  const controlBefore = await page.evaluate(() => JSON.stringify(control_points[0].points()));
  await page.mouse.move(dragOrigin.x, dragOrigin.y);
  await page.mouse.down();
  await page.mouse.move(dragOrigin.x + 40, dragOrigin.y - 30, { steps: 12 });
  await page.mouse.up();
  await page.waitForFunction((previous) => {
    return JSON.stringify(control_points[0].points()) !== previous;
  }, controlBefore, { timeout: 5000 });
  console.log("OK curves-and-surfaces control-point scene");

  const segmentCanvas = page.locator("#cs_linear_segment canvas").first();
  await segmentCanvas.scrollIntoViewIfNeeded();
  const segmentBefore = await segmentCanvas.evaluate((canvas) => canvas.toDataURL());
  await dragKnob(page, "#cs_linear_segment_sl0 .slider_knob", 100, 0, "curves-and-surfaces linear slider");
  await page.waitForFunction((previous) => {
    const canvas = document.querySelector("#cs_linear_segment canvas");
    return canvas && canvas.toDataURL() !== previous;
  }, segmentBefore, { timeout: 5000 });
  console.log("OK curves-and-surfaces linear interpolation scene");

  const splineCanvas = page.locator("#cs_curve_subdiv_topo canvas").first();
  await splineCanvas.scrollIntoViewIfNeeded();
  const splineBefore = await splineCanvas.evaluate((canvas) => canvas.toDataURL());
  await dragKnob(page, "#cs_curve_subdiv_topo_sl0 .slider_knob", 100, 0, "curves-and-surfaces subdivision curve slider");
  await page.waitForFunction((previous) => {
    const canvas = document.querySelector("#cs_curve_subdiv_topo canvas");
    return canvas && canvas.toDataURL() !== previous;
  }, splineBefore, { timeout: 5000 });
  console.log("OK curves-and-surfaces subdivision curve scene");

  const surfaceCanvas = page.locator("#cs_subdiv0 canvas").first();
  await surfaceCanvas.scrollIntoViewIfNeeded();
  const surfaceBefore = await surfaceCanvas.evaluate((canvas) => canvas.toDataURL());
  await dragKnob(page, "#cs_subdiv0_sl0 .slider_knob", 100, 0, "curves-and-surfaces surface subdivision slider");
  await page.waitForFunction((previous) => {
    const canvas = document.querySelector("#cs_subdiv0 canvas");
    return canvas && canvas.toDataURL() !== previous;
  }, surfaceBefore, { timeout: 5000 });
  console.log("OK curves-and-surfaces surface subdivision scene");

  await assertLongformResponsiveShell(
    context,
    page,
    "curves-and-surfaces/",
    "#cs_control_points canvas",
    "curves-and-surfaces route",
    {
      expectedRoute: "curves-and-surfaces",
      minimumChapters: 7,
      playHref: "#cs_subdiv_hero",
    },
  );
  await page.waitForTimeout(250);
  assertPageRuntimeClean("curves-and-surfaces route");
  console.log("OK curves-and-surfaces responsive shell");
  await page.close();
}

async function smokeInternalCombustionEngine(context) {
  const page = await context.newPage();
  const assertPageRuntimeClean = createRuntimeMonitor(page);
  await assertRoute(page, "internal-combustion-engine/", "#reference-footer");
  await page.waitForFunction(() => {
    return document.querySelector("#ice_hero canvas") &&
      document.querySelector("#ice_cannon canvas") &&
      document.querySelector("#ice_cannon_sl0 .slider_knob") &&
      document.querySelector("#ice_pressure canvas") &&
      document.querySelector("#ice_pressure_sl0 .slider_knob") &&
      document.querySelector("#ice_starter canvas") &&
      document.querySelector("#ice_starter_sl0 .slider_knob");
  }, null, { timeout: 30000 });
  await page.waitForTimeout(3000);

  await assertLocalScriptSources(page, ["./js/base.js", "./js/ice.js"], "internal-combustion-engine");
  await assertElementContract(page, ".ice-cycle-map", {
    tagName: "OL",
    attributes: { "aria-label": "Four-stroke cycle" },
  }, "internal-combustion-engine cycle map");
  await assertLinkSequence(page, ".ice-cycle-map a", [
    { text: "Intake", href: "#ice_cylinder_valve_stroke0", onclick: null },
    { text: "Compression", href: "#ice_cylinder_valve_stroke1", onclick: null },
    { text: "Power", href: "#ice_cylinder_valve_stroke2", onclick: null },
    { text: "Exhaust", href: "#ice_cylinder_valve_stroke3", onclick: null },
  ], "internal-combustion-engine cycle map");

  await dragCanvasUntilChanged(
    page,
    "#ice_hero canvas",
    [
      { from: { x: 0.35, y: 0.45 }, to: { x: 0.7, y: 0.55 } },
      { from: { x: 0.65, y: 0.55 }, to: { x: 0.35, y: 0.35 } },
    ],
    "internal-combustion-engine opening hero drag scene",
  );
  console.log("OK internal-combustion-engine opening hero scene");

  const cannonCanvas = page.locator("#ice_cannon canvas").first();
  await cannonCanvas.scrollIntoViewIfNeeded();
  const cannonBefore = await cannonCanvas.evaluate((canvas) => canvas.toDataURL());
  await dragKnob(page, "#ice_cannon_sl0 .slider_knob", 90, 0, "internal-combustion-engine cannon slider");
  await page.waitForFunction((previous) => {
    const canvas = document.querySelector("#ice_cannon canvas");
    return canvas && canvas.toDataURL() !== previous;
  }, cannonBefore, { timeout: 5000 });
  console.log("OK internal-combustion-engine cannon scene");

  const pressureCanvas = page.locator("#ice_pressure canvas").first();
  await pressureCanvas.scrollIntoViewIfNeeded();
  const pressureBefore = await pressureCanvas.evaluate((canvas) => canvas.toDataURL());
  await dragKnob(page, "#ice_pressure_sl0 .slider_knob", 90, 0, "internal-combustion-engine pressure slider");
  await page.waitForFunction((previous) => {
    const canvas = document.querySelector("#ice_pressure canvas");
    return canvas && canvas.toDataURL() !== previous;
  }, pressureBefore, { timeout: 5000 });
  console.log("OK internal-combustion-engine pressure scene");

  const starterCanvas = page.locator("#ice_starter canvas").first();
  await starterCanvas.scrollIntoViewIfNeeded();
  const starterBefore = await starterCanvas.evaluate((canvas) => canvas.toDataURL());
  await dragKnob(page, "#ice_starter_sl0 .slider_knob", 90, 0, "internal-combustion-engine starter slider");
  await page.waitForFunction((previous) => {
    const canvas = document.querySelector("#ice_starter canvas");
    return canvas && canvas.toDataURL() !== previous;
  }, starterBefore, { timeout: 5000 });
  console.log("OK internal-combustion-engine starter scene");

  await assertLongformResponsiveShell(
    context,
    page,
    "internal-combustion-engine/",
    "#ice_hero canvas",
    "internal-combustion-engine route",
    {
      expectedRoute: "internal-combustion-engine",
      minimumChapters: 8,
      playHref: "#ice_hero",
    },
  );
  await page.waitForTimeout(250);
  assertPageRuntimeClean("internal-combustion-engine route");
  console.log("OK internal-combustion-engine responsive shell");
  await page.close();
}

async function smokeMechanicalWatch(context) {
  const page = await context.newPage();
  const assertPageRuntimeClean = createRuntimeMonitor(page);
  await assertRoute(page, "mechanical-watch/", "#reference-footer");
  await page.waitForFunction(() => {
    return document.querySelector("#hero canvas") &&
      document.querySelector("#hero_sl0 .slider_knob") &&
      document.querySelector("#coil_spring canvas") &&
      document.querySelector("#coil_spring_sl0 .slider_knob") &&
      document.querySelector("#automatic_behavior canvas") &&
      document.querySelector("#automatic_behavior_sl0 .slider_knob") &&
      document.querySelector("#credit_card_size canvas") &&
      document.querySelector("#credit_card_size_sl0 .slider_knob");
  }, null, { timeout: 30000 });
  await page.waitForTimeout(3000);

  await assertLocalScriptSources(page, ["../shared/mechanical-watch/js/base.js", "../shared/mechanical-watch/js/watch.js"], "mechanical-watch");
  const escapementStatuses = await page.locator(".gear_train5_explainer").evaluateAll((elements) => elements.map((element) => ({
    id: element.id,
    role: element.getAttribute("role"),
    live: element.getAttribute("aria-live"),
    atomic: element.getAttribute("aria-atomic"),
    text: (element.textContent || "").replace(/\s+/g, " ").trim(),
  })));
  assert(escapementStatuses.length === 6, "mechanical-watch escapement did not expose six phase statuses");
  assert(
    escapementStatuses.every((status, index) =>
      status.id === `gear_train5_explainer${index + 1}` &&
      status.role === "status" &&
      status.live === "polite" &&
      status.atomic === "true"),
    "mechanical-watch escapement status semantics changed",
  );
  assert(escapementStatuses[0].text.includes("balance wheel is swinging back"), "mechanical-watch first escapement phase changed");
  assert(escapementStatuses[5].text.includes("balance wheel continues its swing"), "mechanical-watch final escapement phase changed");

  await dragCanvasUntilChanged(
    page,
    "#hero canvas",
    [
      { from: { x: 0.35, y: 0.45 }, to: { x: 0.7, y: 0.55 } },
      { from: { x: 0.65, y: 0.55 }, to: { x: 0.35, y: 0.35 } },
    ],
    "mechanical-watch opening movement drag scene",
  );
  console.log("OK mechanical-watch opening movement scene");

  const springCanvas = page.locator("#coil_spring canvas").first();
  await springCanvas.scrollIntoViewIfNeeded();
  const springBefore = await springCanvas.evaluate((canvas) => canvas.toDataURL());
  await dragKnob(page, "#coil_spring_sl0 .slider_knob", 90, 0, "mechanical-watch coil spring slider");
  await page.waitForFunction((previous) => {
    const canvas = document.querySelector("#coil_spring canvas");
    return canvas && canvas.toDataURL() !== previous;
  }, springBefore, { timeout: 5000 });
  console.log("OK mechanical-watch power scene");

  const automaticCanvas = page.locator("#automatic_behavior canvas").first();
  await automaticCanvas.scrollIntoViewIfNeeded();
  const automaticBefore = await automaticCanvas.evaluate((canvas) => canvas.toDataURL());
  await dragKnob(page, "#automatic_behavior_sl0 .slider_knob", 90, 0, "mechanical-watch automatic winding slider");
  await page.waitForFunction((previous) => {
    const canvas = document.querySelector("#automatic_behavior canvas");
    return canvas && canvas.toDataURL() !== previous;
  }, automaticBefore, { timeout: 5000 });
  console.log("OK mechanical-watch automatic winding scene");

  const sizeCanvas = page.locator("#credit_card_size canvas").first();
  await sizeCanvas.scrollIntoViewIfNeeded();
  const sizeBefore = await sizeCanvas.evaluate((canvas) => canvas.toDataURL());
  await dragKnob(page, "#credit_card_size_sl0 .slider_knob", 90, 0, "mechanical-watch size slider");
  await page.waitForFunction((previous) => {
    const canvas = document.querySelector("#credit_card_size canvas");
    return canvas && canvas.toDataURL() !== previous;
  }, sizeBefore, { timeout: 5000 });
  console.log("OK mechanical-watch final size scene");

  await assertLongformResponsiveShell(
    context,
    page,
    "mechanical-watch/",
    "#hero canvas",
    "mechanical-watch route",
    {
      expectedRoute: "mechanical-watch",
      minimumChapters: 10,
      playHref: "#hero",
    },
  );
  await page.waitForTimeout(250);
  assertPageRuntimeClean("mechanical-watch route");
  console.log("OK mechanical-watch responsive shell");
  await page.close();
}

async function smokeInteractiveMechanicalWatch(context) {
  const page = await context.newPage();
  const assertPageRuntimeClean = createRuntimeMonitor(page);
  const label = "interactive-mechanical-watch route";
  const canvasSelector = "[data-exploded-canvas] canvas.exploded-watch__webgl";

  await assertRoute(page, "interactive-mechanical-watch/", "#reference-footer");
  await assertLocalScriptSources(
    page,
    [
      "../shared/mechanical-watch/js/base.js",
      "../shared/mechanical-watch/js/watch.js",
      "./js/legacy-watch-accessibility.js",
      "./js/watch-parts.js",
      "./js/exploded-view.js",
      "./js/exploded-view-three.js",
    ],
    "interactive-mechanical-watch",
  );
  await assertLongformResponsiveShell(
    context,
    page,
    "interactive-mechanical-watch/",
    canvasSelector,
    label,
    {
      expectedFamily: "runtime",
      expectedRoute: "interactive-mechanical-watch",
      minimumChapters: 10,
      playHref: "#hero",
    },
  );
  await page.waitForSelector("#hero canvas", { timeout: 30000 });
  await page.waitForSelector(canvasSelector, { timeout: 30000 });
  await page.waitForFunction(() => document.body.dataset.watchAccessibility === "ready", null, { timeout: 5000 });

  const chapterState = await page.evaluate(() => {
    const ids = Array.from(document.querySelectorAll("[data-story-chapter]")).map((section) => section.id);
    const labels = Object.fromEntries(Array.from(document.querySelectorAll(".story-rail__link")).map((link) => [
      link.dataset.storyTarget,
      {
        text: link.textContent?.trim() || "",
        title: link.title,
        ariaLabel: link.getAttribute("aria-label"),
      },
    ]));
    return { ids, labels };
  });
  assert(
    chapterState.ids.indexOf("from-pixels-to-resin") < chapterState.ids.indexOf("further-watching-and-reading"),
    `${label} should place the resin synthesis before references`,
  );
  assert(chapterState.labels["from-pixels-to-resin"]?.text === "Resin prototype", `${label} did not expose the compact resin label`);
  assert(chapterState.labels["from-pixels-to-resin"]?.title === "From Pixels to Resin", `${label} compact resin label lost its full title`);
  assert(chapterState.labels["from-pixels-to-resin"]?.ariaLabel === "From Pixels to Resin", `${label} compact resin label lost its accessible name`);

  const legacyCanvas = page.locator("#hero canvas").first();
  await legacyCanvas.scrollIntoViewIfNeeded();
  await legacyCanvas.evaluate((canvas) => canvas.closest(".drawer_container")?.drawer?.set_paused(true));
  const legacyCanvasBefore = await legacyCanvas.evaluate((canvas) => canvas.toDataURL());
  await legacyCanvas.focus();
  await legacyCanvas.press("ArrowRight");
  await page.waitForFunction((previous) => document.querySelector("#hero canvas")?.toDataURL() !== previous, legacyCanvasBefore, { timeout: 5000 });
  assert(await legacyCanvas.getAttribute("tabindex") === "0", `${label} legacy canvas should be keyboard focusable`);

  const verticalCanvas = page.locator("#hero_movement canvas").first();
  await verticalCanvas.scrollIntoViewIfNeeded();
  await verticalCanvas.evaluate((canvas) => canvas.closest(".drawer_container")?.drawer?.set_paused(true));
  const verticalCanvasBefore = await verticalCanvas.evaluate((canvas) => canvas.toDataURL());
  await verticalCanvas.focus();
  await verticalCanvas.press("ArrowUp");
  await page.waitForFunction((previous) => document.querySelector("#hero_movement canvas")?.toDataURL() !== previous, verticalCanvasBefore, { timeout: 5000 });
  assert(await verticalCanvas.getAttribute("aria-keyshortcuts") === "ArrowUp ArrowDown Escape", `${label} y-only canvas advertised ineffective horizontal keys`);

  const multiSliderLabels = await page.locator("#torsion_spring3_sl0 .slider_knob, #torsion_spring3_sl1 .slider_knob, #torsion_spring3_sl2 .slider_knob").evaluateAll((knobs) => knobs.map((knob) => knob.getAttribute("aria-label")));
  assert(new Set(multiSliderLabels).size === 3 && multiSliderLabels.every(Boolean), `${label} multi-slider controls should expose unique accessible names`);

  const legacySlider = page.locator("#hero_sl0 .slider_knob").first();
  await legacySlider.scrollIntoViewIfNeeded();
  const legacySliderBefore = await legacySlider.getAttribute("aria-valuenow");
  await legacySlider.focus();
  await legacySlider.press("ArrowRight");
  assert(await legacySlider.getAttribute("role") === "slider", `${label} legacy slider should expose slider semantics`);
  assert(await legacySlider.getAttribute("aria-valuenow") !== legacySliderBefore, `${label} legacy slider keyboard action did not update its value`);

  const legacySegment = page.locator("#gear_train3_seg0 [role='radio']").first();
  await legacySegment.scrollIntoViewIfNeeded();
  await legacySegment.focus();
  await legacySegment.press("ArrowRight");
  assert(await legacySegment.getAttribute("aria-checked") === "false", `${label} legacy segmented control keyboard action did not update its state`);
  assert(await page.locator("#gear_train3_seg0 [role='radio']").nth(1).getAttribute("aria-checked") === "true", `${label} legacy segmented control did not select the next option`);

  const legacyPlay = page.locator("#hero .play_pause_button").first();
  const playStateBefore = await legacyPlay.getAttribute("aria-pressed");
  await legacyPlay.focus();
  await legacyPlay.press("Space");
  assert(await legacyPlay.getAttribute("role") === "button", `${label} legacy play control should expose button semantics`);
  assert(await legacyPlay.getAttribute("aria-pressed") !== playStateBefore, `${label} legacy play control keyboard action did not toggle state`);
  console.log("OK interactive-mechanical-watch legacy keyboard controls");

  const explodedState = await page.evaluate(() => {
    const root = document.querySelector("[data-exploded-watch]");
    const mount = root?.querySelector("[data-exploded-canvas]");
    const canvas = mount?.querySelector("canvas.exploded-watch__webgl");
    return {
      ready: root?.dataset.threeReady || "",
      renderMode: mount?.dataset.renderMode || "",
      componentCount: Number(canvas?.dataset.componentCount || 0),
      transformedSourceCount: Number(canvas?.dataset.transformedSourceCount || 0),
      sourceRotationOrder: canvas?.dataset.sourceRotationOrder || "",
      ariaHidden: canvas?.getAttribute("aria-hidden") || "",
      svgCount: mount?.querySelectorAll("svg").length || 0,
    };
  });
  assert(explodedState.ready === "true", `${label} did not report a ready Three.js renderer`);
  assert(explodedState.renderMode === "three", `${label} exposed render mode ${explodedState.renderMode || "none"}`);
  assert(explodedState.componentCount === 71, `${label} expected 71 Three.js components, got ${explodedState.componentCount}`);
  assert(explodedState.transformedSourceCount === 16, `${label} expected 16 authored source transforms, got ${explodedState.transformedSourceCount}`);
  assert(explodedState.sourceRotationOrder === "ZYX", `${label} source transforms should preserve archived ZYX rotation order`);
  assert(explodedState.ariaHidden === "true", `${label} pointer canvas should remain hidden from assistive technology`);
  assert(explodedState.svgCount === 0, `${label} should replace the SVG after Three.js initialization`);

  await assertElementContract(page, ".exploded-watch__firstrun", {
    tagName: "OL",
    attributes: { "aria-label": "Where to start with the exploded view" },
    textFragments: ["Explosion depth", "read which system it belongs to", "8×"],
  }, `${label} exploded-view first-run guide`);
  assert(
    await page.locator(".exploded-watch__firstrun > li").count() === 3,
    `${label} exploded-view first-run guide expected three steps`,
  );
  assert(
    await page.locator("[data-exploded-detail]").getAttribute("aria-atomic") === "true",
    `${label} exploded-view detail region should announce atomically`,
  );

  const webglCanvas = page.locator(canvasSelector);
  await webglCanvas.evaluate((canvas) => canvas.scrollIntoView({ block: "center" }));
  const mechanismState = await page.evaluate(() => {
    const root = document.querySelector("[data-exploded-watch]");
    const canvas = root?.querySelector("canvas.exploded-watch__webgl");
    return {
      objectCount: Number(root?.dataset.objectCount || 0),
      partCount: Number(root?.dataset.partCount || 0),
      playing: canvas?.dataset.playing || "",
      speed: canvas?.dataset.speed || "",
      time: Number(canvas?.dataset.simulationTime || 0),
      windingTravel: Number(canvas?.dataset.windingTravel || 0),
    };
  });
  assert(mechanismState.partCount === 71, `${label} expected the canonical 71-part inventory, got ${mechanismState.partCount}`);
  assert(mechanismState.objectCount > mechanismState.partCount, `${label} should render generated detail beyond one object per part`);
  assert(mechanismState.playing === "true", `${label} mechanism should start playing without reduced motion`);
  assert(mechanismState.speed === "8", `${label} mechanism should default to 8x, got ${mechanismState.speed || "none"}`);
  await page.waitForFunction(({ time, windingTravel }) => {
    const canvas = document.querySelector("[data-exploded-canvas] canvas");
    return Number(canvas?.dataset.simulationTime || 0) > time
      && Number(canvas?.dataset.windingTravel || 0) > windingTravel;
  }, { time: mechanismState.time, windingTravel: mechanismState.windingTravel }, { timeout: 5000 });
  await page.locator("[data-exploded-play]").click();
  await page.waitForFunction(() => document.querySelector("[data-exploded-canvas] canvas")?.dataset.playing === "false", null, { timeout: 5000 });
  assert(await page.locator("[data-exploded-play]").getAttribute("aria-pressed") === "false", `${label} play control did not expose paused state`);
  await page.locator("[data-exploded-speed] [data-speed='60']").click();
  await page.waitForFunction(() => document.querySelector("[data-exploded-canvas] canvas")?.dataset.speed === "60", null, { timeout: 5000 });
  const speed60 = page.locator("[data-exploded-speed] [data-speed='60']");
  assert(await speed60.getAttribute("aria-checked") === "true", `${label} speed control did not select 60x`);
  await speed60.focus();
  await speed60.press("Home");
  assert(await page.locator("[data-exploded-speed] [data-speed='1']").getAttribute("aria-checked") === "true", `${label} speed radiogroup Home key did not select 1x`);
  await page.keyboard.press("End");
  assert(await speed60.getAttribute("aria-checked") === "true", `${label} speed radiogroup End key did not select 60x`);
  await page.keyboard.press("ArrowLeft");
  const speed8 = page.locator("[data-exploded-speed] [data-speed='8']");
  assert(await speed8.getAttribute("aria-checked") === "true", `${label} speed radiogroup ArrowLeft key did not select 8x`);
  assert(await speed8.getAttribute("tabindex") === "0", `${label} selected speed did not receive the roving tab stop`);
  await page.locator("[data-exploded-play]").click();
  console.log("OK interactive-mechanical-watch mechanism playback");

  const partsRole = await page.locator("[data-exploded-parts]").getAttribute("role");
  assert(partsRole === "group", `${label} parts selector should use button-group semantics, got ${partsRole || "none"}`);

  const initialDepthValueText = await page.locator("[data-exploded-depth]").getAttribute("aria-valuetext");
  assert(initialDepthValueText === "74 percent exploded", `${label} expected initial depth aria-valuetext, got ${initialDepthValueText || "none"}`);

  const initialPartPressed = await page.locator("[data-exploded-parts] .is-selected").getAttribute("aria-pressed");
  assert(initialPartPressed === "true", `${label} selected part should expose aria-pressed=true`);

  const renderCountBeforeDepth = Number(await webglCanvas.getAttribute("data-render-count") || 0);
  await page.locator("[data-exploded-parts]").evaluate((parts) => {
    parts.scrollTop = 48;
    parts.firstElementChild.dataset.depthIdentity = "preserved";
  });
  await setRangeValue(page, "[data-exploded-depth]", 24);
  await page.waitForFunction((previousCount) => {
    return Number(document.querySelector("[data-exploded-canvas] canvas")?.dataset.renderCount || 0) > previousCount;
  }, renderCountBeforeDepth, { timeout: 5000 });
  const updatedDepthState = await page.evaluate(() => ({
    valueText: document.querySelector("[data-exploded-depth]")?.getAttribute("aria-valuetext") || "",
    identity: document.querySelector("[data-exploded-parts]")?.firstElementChild?.dataset.depthIdentity || "",
    scrollTop: document.querySelector("[data-exploded-parts]")?.scrollTop || 0,
  }));
  assert(updatedDepthState.valueText === "24 percent exploded", `${label} expected updated depth aria-valuetext, got ${updatedDepthState.valueText || "none"}`);
  assert(updatedDepthState.identity === "preserved", `${label} rebuilt the component list during a depth-only change`);
  assert(updatedDepthState.scrollTop > 0, `${label} reset component-list scroll during a depth-only change`);
  console.log("OK interactive-mechanical-watch explosion depth control");

  const detailBeforeClick = await page.locator("[data-exploded-detail] h3").textContent();
  await page.locator("[data-exploded-parts] [data-component-id]").first().click();
  await page.waitForFunction((previousText) => {
    return (document.querySelector("[data-exploded-detail] h3")?.textContent || "").trim() !== (previousText || "").trim();
  }, detailBeforeClick, { timeout: 5000 });
  const selectedPartPressed = await page.locator("[data-exploded-parts] .is-selected").getAttribute("aria-pressed");
  assert(selectedPartPressed === "true", `${label} clicked part should expose aria-pressed=true`);
  const caseLessonHref = await page.locator("[data-exploded-detail] .exploded-watch__lesson-link").getAttribute("href");
  assert(caseLessonHref === "#mainplate", `${label} case detail should link back to assembly, got ${caseLessonHref || "none"}`);
  await page.locator("[data-exploded-parts] [data-component-id='barrel-drum']").click();
  const barrelLessonHref = await page.locator("[data-exploded-detail] .exploded-watch__lesson-link").getAttribute("href");
  assert(barrelLessonHref === "#power", `${label} barrel detail should link back to power, got ${barrelLessonHref || "none"}`);
  console.log("OK interactive-mechanical-watch part button selection");

  const detailBeforeKeyboard = await page.locator("[data-exploded-detail] h3").textContent();
  await page.locator("[data-exploded-parts] [data-component-id='winding-stem']").focus();
  await page.keyboard.press("Enter");
  await page.waitForFunction((previousText) => {
    return (document.querySelector("[data-exploded-detail] h3")?.textContent || "").trim() !== (previousText || "").trim();
  }, detailBeforeKeyboard, { timeout: 5000 });
  const keyboardState = await page.evaluate(() => ({
    componentId: document.activeElement?.getAttribute("data-component-id") || "",
    pressed: document.activeElement?.getAttribute("aria-pressed") || "",
  }));
  assert(keyboardState.pressed === "true", `${label} keyboard-selected part should expose aria-pressed=true`);
  assert(keyboardState.componentId === "winding-stem", `${label} should restore focus to the selected part button, got ${keyboardState.componentId || "none"}`);
  console.log("OK interactive-mechanical-watch keyboard component selection");

  await page.locator("[data-exploded-play]").click();
  await page.waitForFunction(() => document.querySelector("[data-exploded-canvas] canvas")?.dataset.playing === "false", null, { timeout: 5000 });
  await webglCanvas.evaluate((canvas) => canvas.scrollIntoView({ block: "center" }));
  const canvasBox = await webglCanvas.boundingBox();
  assert(canvasBox, `${label} did not expose the Three.js canvas bounds`);
  const selectedBeforeRaycast = await page.locator("[data-exploded-parts] .is-selected").getAttribute("data-component-id");
  let selectedAfterRaycast = selectedBeforeRaycast;
  const raycastPoints = [[0.5, 0.5], [0.4, 0.45], [0.6, 0.45], [0.35, 0.6], [0.65, 0.6]];
  for (const [x, y] of raycastPoints) {
    const clickX = canvasBox.x + canvasBox.width * x;
    const clickY = canvasBox.y + canvasBox.height * y;
    const canvasReceivesClick = await page.evaluate(({ clickX, clickY }) => {
      return document.elementFromPoint(clickX, clickY)?.matches("canvas.exploded-watch__webgl") || false;
    }, { clickX, clickY });
    if (!canvasReceivesClick) continue;
    await page.mouse.click(clickX, clickY);
    selectedAfterRaycast = await page.locator("[data-exploded-parts] .is-selected").getAttribute("data-component-id");
    if (selectedAfterRaycast !== selectedBeforeRaycast) break;
  }
  assert(selectedAfterRaycast !== selectedBeforeRaycast, `${label} raycast selection did not update the active component`);
  console.log("OK interactive-mechanical-watch raycast selection");

  const cameraBeforeOrbit = await webglCanvas.getAttribute("data-camera-position");
  await page.mouse.move(canvasBox.x + canvasBox.width * 0.58, canvasBox.y + canvasBox.height * 0.5);
  await page.mouse.down();
  await page.mouse.move(canvasBox.x + canvasBox.width * 0.72, canvasBox.y + canvasBox.height * 0.58, { steps: 12 });
  await page.mouse.up();
  await page.waitForFunction((previousPosition) => {
    return document.querySelector("[data-exploded-canvas] canvas")?.dataset.cameraPosition !== previousPosition;
  }, cameraBeforeOrbit, { timeout: 5000 });
  const cameraBeforeZoom = await webglCanvas.getAttribute("data-camera-position");
  await page.mouse.move(canvasBox.x + canvasBox.width / 2, canvasBox.y + canvasBox.height / 2);
  await page.mouse.wheel(0, -360);
  await page.waitForFunction((previousPosition) => {
    return document.querySelector("[data-exploded-canvas] canvas")?.dataset.cameraPosition !== previousPosition;
  }, cameraBeforeZoom, { timeout: 5000 });
  console.log("OK interactive-mechanical-watch orbit and zoom controls");

  const fallbackPage = await context.newPage();
  await fallbackPage.route("**/models/watch_vertices.dat", (route) => route.fulfill({ status: 503, body: "" }));
  await fallbackPage.goto(new URL("interactive-mechanical-watch/?smoke-fallback=1", baseUrl).href, { waitUntil: "domcontentloaded" });
  await fallbackPage.waitForSelector("[data-exploded-canvas] svg", { timeout: 30000 });
  await fallbackPage.waitForFunction(() => document.querySelector("[data-exploded-watch]")?.dataset.threeError, null, { timeout: 30000 });
  const fallbackState = await fallbackPage.evaluate(() => {
    const root = document.querySelector("[data-exploded-watch]");
    const image = root?.querySelector("[data-exploded-canvas] svg image");
    const imageHref = image?.getAttribute("href") || image?.getAttribute("xlink:href") || "";
    return {
      canvasCount: root?.querySelectorAll("[data-exploded-canvas] canvas").length || 0,
      componentCount: root?.querySelectorAll("[data-exploded-canvas] [data-component-id]").length || 0,
      diagramRole: root?.querySelector("[data-exploded-canvas] svg")?.getAttribute("role") || "",
      imageHref,
      resolvedImageHref: image ? new URL(imageHref, document.location.href).href : "",
    };
  });
  assert(fallbackState.canvasCount === 0, `${label} fallback should retain the SVG without a canvas`);
  assert(fallbackState.componentCount === 71, `${label} fallback expected 71 SVG components, got ${fallbackState.componentCount}`);
  assert(fallbackState.diagramRole === "group", `${label} fallback SVG should use group semantics`);
  const expectedImageUrl = new URL("interactive-mechanical-watch/images/generated/components/exploded-sheet.png", baseUrl).href;
  assert(
    fallbackState.resolvedImageHref === expectedImageUrl,
    `${label} fallback resolved exploded sheet to ${fallbackState.resolvedImageHref || "none"}; expected ${expectedImageUrl} from href ${fallbackState.imageHref || "none"}`,
  );
  const imageResponse = await fallbackPage.request.get(fallbackState.resolvedImageHref);
  assert(imageResponse.status() === 200, `${label} fallback exploded sheet returned HTTP ${imageResponse.status()}`);
  const firstComponentMarkup = await fallbackPage.locator("[data-exploded-canvas] [data-component-id]").first().innerHTML();
  await setRangeValue(fallbackPage, "[data-exploded-depth]", 24);
  await fallbackPage.waitForFunction((previousMarkup) => {
    return document.querySelector("[data-exploded-canvas] [data-component-id]")?.innerHTML !== previousMarkup;
  }, firstComponentMarkup, { timeout: 5000 });
  await fallbackPage.locator("[data-exploded-canvas] [data-component-id='winding-stem']").focus();
  await fallbackPage.keyboard.press("Enter");
  const focusedFallbackId = await fallbackPage.evaluate(() => document.activeElement?.getAttribute("data-component-id") || "");
  assert(focusedFallbackId === "winding-stem", `${label} fallback should restore SVG focus, got ${focusedFallbackId || "none"}`);
  console.log("OK interactive-mechanical-watch SVG fallback");
  await fallbackPage.close();

  const browser = context.browser();
  assert(browser, `${label} could not create route-specific input contexts`);

  const reducedContext = await browser.newContext({
    reducedMotion: "reduce",
    viewport: { width: 1280, height: 900 },
  });
  const reducedPage = await reducedContext.newPage();
  await assertRoute(reducedPage, "interactive-mechanical-watch/", "#hero canvas");
  await reducedPage.waitForFunction(() => document.body.dataset.watchReducedMotion === "paused", null, { timeout: 30000 });
  const reducedState = await reducedPage.evaluate(() => ({
    playingCount: document.querySelectorAll(".play_pause_button.playing").length,
    runningDrawerCount: Array.from(document.querySelectorAll(".drawer_container")).filter((container) => container.drawer && !container.drawer.paused).length,
  }));
  assert(reducedState.playingCount === 0, `${label} reduced-motion startup left ${reducedState.playingCount} play controls running`);
  assert(reducedState.runningDrawerCount === 0, `${label} reduced-motion startup left ${reducedState.runningDrawerCount} drawers running`);
  await reducedPage.waitForSelector(canvasSelector, { timeout: 30000 });
  assert(await reducedPage.locator("[data-exploded-play]").getAttribute("aria-pressed") === "false", `${label} reduced motion should pause the exploded mechanism at startup`);
  await reducedPage.waitForFunction(() => document.querySelector("[data-exploded-canvas] canvas")?.dataset.playing === "false", null, { timeout: 5000 });
  await reducedPage.locator("[data-exploded-play]").click();
  await reducedPage.waitForFunction(() => document.querySelector("[data-exploded-canvas] canvas")?.dataset.playing === "true", null, { timeout: 5000 });
  const reducedPlay = reducedPage.locator("#hero .play_pause_button").first();
  await reducedPlay.focus();
  await reducedPlay.press("Space");
  assert(await reducedPlay.getAttribute("aria-pressed") === "true", `${label} reduced-motion policy should allow explicit playback`);
  await reducedContext.close();
  console.log("OK interactive-mechanical-watch reduced motion");

  const touchContext = await browser.newContext({
    hasTouch: true,
    isMobile: true,
    viewport: { width: 390, height: 844 },
  });
  const touchPage = await touchContext.newPage();
  await assertRoute(touchPage, "interactive-mechanical-watch/", "#hero_sl0 .slider_knob");
  await touchPage.waitForSelector(canvasSelector, { timeout: 30000 });
  const touchCutaway = touchPage.locator("#hero canvas").first();
  await touchCutaway.scrollIntoViewIfNeeded();
  await touchPage.waitForFunction(() => {
    const hero = document.querySelector("#hero");
    hero?.drawer?.set_visible(true);
    hero?.drawer?.request_repaint();
    return !hero?.querySelector(".loading_text");
  }, null, { timeout: 30000 });
  await touchCutaway.evaluate((canvas) => canvas.closest(".drawer_container")?.drawer?.set_paused(true));
  const touchCutawayBefore = await touchCutaway.evaluate((canvas) => canvas.toDataURL());
  const touchSliderBefore = await touchPage.locator("#hero_sl0 .slider_knob").getAttribute("aria-valuenow");
  await dragNativeTouch(touchPage, "#hero_sl0 .slider_knob", 70, 0, `${label} touch slider`);
  assert(await touchPage.locator("#hero_sl0 .slider_knob").getAttribute("aria-valuenow") !== touchSliderBefore, `${label} touch slider did not update its value`);
  await touchPage.waitForFunction((previous) => document.querySelector("#hero canvas")?.toDataURL() !== previous, touchCutawayBefore, { timeout: 5000 });
  const touchWebgl = touchPage.locator(canvasSelector);
  await touchPage.locator("[data-exploded-play]").click();
  await touchPage.waitForFunction(() => document.querySelector("[data-exploded-canvas] canvas")?.dataset.playing === "false", null, { timeout: 5000 });
  const touchCameraBefore = await touchWebgl.getAttribute("data-camera-position");
  await dragNativeTouch(touchPage, canvasSelector, 54, 28, `${label} touch orbit`);
  await touchPage.waitForFunction((previousPosition) => document.querySelector("[data-exploded-canvas] canvas")?.dataset.cameraPosition !== previousPosition, touchCameraBefore, { timeout: 5000 });
  await touchPage.locator("[data-exploded-parts] [data-component-id='rotor']").tap();
  assert(await touchPage.locator("[data-exploded-detail] .exploded-watch__lesson-link").getAttribute("href") === "#automatic-winding", `${label} touch selection did not expose the rotor lesson link`);
  await assertViewportUsable(touchPage, `${label} touch mobile`);
  await touchContext.close();
  console.log("OK interactive-mechanical-watch touch controls");

  const narrowPage = await context.newPage();
  await narrowPage.setViewportSize({ width: 320, height: 844 });
  await assertRoute(narrowPage, "interactive-mechanical-watch/", "[data-exploded-parts]");
  const narrowState = await narrowPage.locator("[data-exploded-parts]").evaluate((parts) => {
    const button = parts.querySelector("button");
    const style = getComputedStyle(parts);
    return {
      clientHeight: parts.clientHeight,
      scrollHeight: parts.scrollHeight,
      overflowY: style.overflowY,
      buttonHeight: button?.getBoundingClientRect().height || 0,
      detailTop: document.querySelector("[data-exploded-detail]")?.getBoundingClientRect().top || 0,
    };
  });
  assert(narrowState.scrollHeight > narrowState.clientHeight, `${label} 320px component list should remain capped and scrollable`);
  assert(["auto", "scroll"].includes(narrowState.overflowY), `${label} 320px component list exposed overflow-y ${narrowState.overflowY}`);
  assert(narrowState.buttonHeight >= 44, `${label} 320px part target measured ${narrowState.buttonHeight}px`);
  assert(narrowState.detailTop > 0, `${label} 320px detail panel was not reachable below the component list`);
  await assertViewportUsable(narrowPage, `${label} 320px`);
  await narrowPage.close();
  console.log("OK interactive-mechanical-watch narrow layout");

  await page.waitForTimeout(250);
  assertPageRuntimeClean(label);
  await assertViewportUsable(page, label);
  console.log("OK interactive-mechanical-watch exploded view");
  await page.close();
}

async function smokeNavalArchitecture(context) {
  const page = await context.newPage();
  const assertPageRuntimeClean = createRuntimeMonitor(page);
  await assertRoute(page, "naval-architecture/", "#reference-footer");
  await page.waitForFunction(() => {
    return document.querySelector("#na_syringe_pressure canvas") &&
      document.querySelector("#na_syringe_pressure_sl0 .slider_knob") &&
      document.querySelector("#na_3d_forces canvas") &&
      document.querySelector("#na_wind_tilt canvas") &&
      document.querySelector("#na_wind_tilt_sl0 .slider_knob") &&
      document.querySelector("#na_free_surface canvas") &&
      document.querySelector("#na_free_surface_sl1 .slider_knob") &&
      document.querySelector("#na_propeller_pitch canvas") &&
      document.querySelector("#na_propeller_pitch_sl0 .slider_knob");
  }, null, { timeout: 30000 });
  await page.waitForTimeout(3000);

  await assertLocalScriptSources(page, ["./js/base.js", "./js/navarch.js"], "naval-architecture");
  await assertElementContract(page, ".na-tank-states", {
    tagName: "UL",
    attributes: { "aria-label": "Free-surface comparison" },
  }, "naval-architecture tank-state comparison");
  await assertLinkSequence(page, ".na-tank-states a", [
    { text: "Empty", href: "#na_free_surface", onclick: "free_surface_3();return false;" },
    { text: "full", href: "#na_free_surface", onclick: "free_surface_4();return false;" },
    { text: "Partly filled", href: "#na_free_surface", onclick: "free_surface_0();return false;" },
  ], "naval-architecture tank-state comparison");

  const pressureCanvas = page.locator("#na_syringe_pressure canvas").first();
  await pressureCanvas.scrollIntoViewIfNeeded();
  const pressureBefore = await pressureCanvas.evaluate((canvas) => canvas.toDataURL());
  await dragKnob(page, "#na_syringe_pressure_sl0 .slider_knob", 90, 0, "naval-architecture pressure slider");
  await page.waitForFunction((previous) => {
    const canvas = document.querySelector("#na_syringe_pressure canvas");
    return canvas && canvas.toDataURL() !== previous;
  }, pressureBefore, { timeout: 5000 });
  console.log("OK naval-architecture pressure scene");

  await dragCanvasUntilChanged(
    page,
    "#na_3d_forces canvas",
    [
      { from: { x: 0.35, y: 0.45 }, to: { x: 0.7, y: 0.55 } },
      { from: { x: 0.65, y: 0.55 }, to: { x: 0.35, y: 0.35 } },
    ],
    "naval-architecture buoyancy drag scene",
  );
  console.log("OK naval-architecture buoyancy drag scene");

  const windCanvas = page.locator("#na_wind_tilt canvas").first();
  await windCanvas.scrollIntoViewIfNeeded();
  const windBefore = await windCanvas.evaluate((canvas) => canvas.toDataURL());
  await dragKnob(page, "#na_wind_tilt_sl0 .slider_knob", 90, 0, "naval-architecture wind slider");
  await page.waitForFunction((previous) => {
    const canvas = document.querySelector("#na_wind_tilt canvas");
    return canvas && canvas.toDataURL() !== previous;
  }, windBefore, { timeout: 5000 });
  console.log("OK naval-architecture stability scene");

  const freeSurfaceCanvas = page.locator("#na_free_surface canvas").first();
  await freeSurfaceCanvas.scrollIntoViewIfNeeded();
  const freeSurfaceBefore = await freeSurfaceCanvas.evaluate((canvas) => canvas.toDataURL());
  await dragKnob(page, "#na_free_surface_sl1 .slider_knob", 90, 0, "naval-architecture free-surface slider");
  await page.waitForFunction((previous) => {
    const canvas = document.querySelector("#na_free_surface canvas");
    return canvas && canvas.toDataURL() !== previous;
  }, freeSurfaceBefore, { timeout: 5000 });
  console.log("OK naval-architecture free-surface scene");

  const propellerCanvas = page.locator("#na_propeller_pitch canvas").first();
  await propellerCanvas.scrollIntoViewIfNeeded();
  const propellerBefore = await propellerCanvas.evaluate((canvas) => canvas.toDataURL());
  await dragKnob(page, "#na_propeller_pitch_sl0 .slider_knob", 90, 0, "naval-architecture propeller slider");
  await page.waitForFunction((previous) => {
    const canvas = document.querySelector("#na_propeller_pitch canvas");
    return canvas && canvas.toDataURL() !== previous;
  }, propellerBefore, { timeout: 5000 });
  console.log("OK naval-architecture propulsion scene");

  await assertLongformResponsiveShell(
    context,
    page,
    "naval-architecture/",
    "#na_syringe_pressure canvas",
    "naval-architecture route",
    {
      expectedRoute: "naval-architecture",
      minimumChapters: 7,
      playHref: "#na_hero",
    },
  );
  await page.waitForTimeout(250);
  assertPageRuntimeClean("naval-architecture route");
  console.log("OK naval-architecture responsive shell");
  await page.close();
}

async function smokeReadingQrCodesWithoutAComputer(context) {
  const page = await context.newPage();
  const assertPageRuntimeClean = createRuntimeMonitor(page);
  await assertRoute(page, "reading-qr-codes-without-a-computer/", "#reference-footer");
  await page.waitForFunction(() => {
    return document.querySelector("input[type='text']") &&
      Array.from(document.querySelectorAll("button")).some((node) => /Random code/i.test(node.textContent || "")) &&
      document.getElementById("anatomy") &&
      document.getElementById("mask") &&
      document.getElementById("length") &&
      document.getElementById("content") &&
      document.querySelectorAll("svg").length > 10;
  }, null, { timeout: 30000 });
  await page.waitForTimeout(2500);

  const assetState = await page.evaluate(() => ({
    scripts: Array.from(document.querySelectorAll("script[src]")).map((node) => node.getAttribute("src") || ""),
    styles: Array.from(document.querySelectorAll("link[rel='stylesheet']")).map((node) => node.getAttribute("href") || ""),
    bodyText: document.body.innerText,
  }));
  assert(
    assetState.scripts.includes("./assets/index-m4DBYcND.js") &&
      assetState.styles.includes("./assets/index-s1eyThQf.css"),
    "reading-qr-codes-without-a-computer did not load the published hashed bundle from local assets",
  );
  assert(
    !/Made in love by Piko and blinry for 37C3/i.test(assetState.bodyText) &&
      !/Found a bug\? Feature request\?/i.test(assetState.bodyText) &&
      !/Codeberg/i.test(assetState.bodyText),
    "reading-qr-codes-without-a-computer left body-level promo or source surfaces visible",
  );

  const before = await page.evaluate(() => ({
    anatomySvg: document.getElementById("anatomy")?.nextElementSibling?.nextElementSibling?.outerHTML || "",
    maskText: document.getElementById("mask")?.nextElementSibling?.nextElementSibling?.nextElementSibling?.nextElementSibling?.textContent?.replace(/\s+/g, " ").trim() || "",
    lengthText: document.getElementById("length")?.nextElementSibling?.nextElementSibling?.textContent?.replace(/\s+/g, " ").trim() || "",
    contentText: document.getElementById("content")?.nextElementSibling?.nextElementSibling?.nextElementSibling?.textContent?.replace(/\s+/g, " ").trim() || "",
  }));

  const targetContent = "OPENAI GPS PILOT 2026";
  await page.locator("input[type='text']").fill(targetContent);
  await page.waitForFunction(({ previous, targetContent }) => {
    const anatomySvg = document.getElementById("anatomy")?.nextElementSibling?.nextElementSibling?.outerHTML || "";
    const maskText = document.getElementById("mask")?.nextElementSibling?.nextElementSibling?.nextElementSibling?.nextElementSibling?.textContent?.replace(/\s+/g, " ").trim() || "";
    const lengthText = document.getElementById("length")?.nextElementSibling?.nextElementSibling?.textContent?.replace(/\s+/g, " ").trim() || "";
    const contentText = document.getElementById("content")?.nextElementSibling?.nextElementSibling?.nextElementSibling?.textContent?.replace(/\s+/g, " ").trim() || "";
    const inputValue = document.querySelector("input[type='text']")?.value || "";
    return inputValue === targetContent &&
      anatomySvg !== previous.anatomySvg &&
      lengthText !== previous.lengthText &&
      contentText !== previous.contentText &&
      maskText.length > 0;
  }, { previous: before, targetContent }, { timeout: 5000 });
  console.log("OK reading-qr-codes-without-a-computer deterministic input flow");

  await assertViewportUsable(page, "reading-qr-codes-without-a-computer route");
  await assertRouteViewportUsable(
    context,
    "reading-qr-codes-without-a-computer/",
    "#reference-footer",
    "#anatomy",
    "reading-qr-codes-without-a-computer route",
    390,
    844,
  );
  await page.waitForTimeout(250);
  assertPageRuntimeClean("reading-qr-codes-without-a-computer route");
  console.log("OK reading-qr-codes-without-a-computer responsive shell");
  await page.close();
}

const TEORIA_AUDIO_SAMPLE_COUNT = 63;

function teoriaExerciseScripts(exerciseScript, musikaScript = "musika_250207.js") {
  return [
    "./vendor/jquery.min.js",
    `./res/js/min_24/musika/${musikaScript}`,
    "./res/js/min_24/musika/musika_en_250207.js",
    "./res/js/min_24/exe_babel/exe_babel_en_250614.js",
    `./res/js/min_24/exe/${exerciseScript}`,
  ];
}

async function waitForTeoriaOptions(page, expectedSampleCount = TEORIA_AUDIO_SAMPLE_COUNT) {
  await page.waitForFunction((sampleCount) => {
    return window.exe?.teoExe?.webAudio?.p_soundsCount === sampleCount &&
      (
        document.querySelector("#opts")?.offsetParent !== null ||
        document.querySelector("#ov_continue")?.offsetParent !== null ||
        document.querySelector("#ov_save")?.offsetParent !== null
      );
  }, expectedSampleCount, { timeout: 45000 });
}

async function startTeoriaExercise(page, config) {
  const continueVisible = await page.locator("#ov_continue").isVisible().catch(() => false);
  if (continueVisible) {
    await page.click("#ov_continue");
    await page.waitForTimeout(250);
  }

  for (const selector of config.optionSelectors || []) {
    await page.click(selector);
  }

  await page.click("#ov_save");
  await page.waitForSelector("#exe", { state: "visible", timeout: 20000 });
  await page.waitForFunction((selector) => {
    return getComputedStyle(document.querySelector(selector)).display !== "none";
  }, config.exerciseSelector, { timeout: 10000 });
}

async function assertTeoriaCanvasInteraction(page, config) {
  const canvas = page.locator(config.canvasSelector);
  const before = await canvas.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return {
      pixels: element.toDataURL(),
      width: element.width,
      height: element.height,
      cssWidth: rect.width,
      cssHeight: rect.height,
    };
  });
  const selectors = config.interactionSelectors || [config.interactionSelector];

  for (const selector of selectors) {
    await page.click(selector);
    await page.waitForTimeout(300);
    const after = await canvas.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return {
        pixels: element.toDataURL(),
        width: element.width,
        height: element.height,
        cssWidth: rect.width,
        cssHeight: rect.height,
      };
    });
    assert(
      after.width === before.width &&
        after.height === before.height &&
        Math.abs(after.cssWidth - before.cssWidth) <= 1 &&
        Math.abs(after.cssHeight - before.cssHeight) <= 1,
      `${config.label} changed notation dimensions during interaction`,
    );
    if (after.pixels !== before.pixels) {
      return;
    }
  }

  throw new Error(`${config.label} did not redraw the expected notation surface`);
}

async function assertTeoriaMessageInteraction(page, config) {
  const beforeMessage = ((await page.locator("#tsp_mess").textContent()) || "").trim();
  await page.click(config.interactionSelector);
  await page.waitForFunction((previousMessage) => {
    return ((document.querySelector("#tsp_mess")?.textContent || "").trim()) !== previousMessage;
  }, beforeMessage, { timeout: 5000 });
}

async function assertTeoriaRevealFlow(page, label) {
  const readState = () => page.evaluate(() => ({
    message: (document.querySelector("#tsp_mess")?.textContent || "").trim(),
    score: (document.querySelector("#tsp_score")?.textContent || "").trim(),
    nextVisible: getComputedStyle(document.querySelector("#ev_next")).display,
  }));
  const reveal = page.locator("#pp_tellMe");
  const pointerBefore = await readState();
  await assertFocusVisible(reveal, `${label} reveal control`);
  await reveal.click();
  await page.waitForFunction((previousMessage) => {
    return getComputedStyle(document.querySelector("#ev_next")).display !== "none" ||
      ((document.querySelector("#tsp_mess")?.textContent || "").trim()) !== previousMessage;
  }, pointerBefore.message, { timeout: 5000 });
  const pointerAfter = await readState();
  assert(
    pointerAfter.message !== pointerBefore.message ||
      pointerAfter.score !== pointerBefore.score ||
      pointerAfter.nextVisible !== "none",
    `${label} pointer reveal did not advance correctness state`,
  );
  assert(pointerAfter.nextVisible !== "none", `${label} pointer reveal did not expose the next exercise`);

  await page.click("#ev_next");
  await page.waitForFunction(() => {
    const next = document.querySelector("#ev_next");
    const reveal = document.querySelector("#pp_tellMe");
    return getComputedStyle(next).display === "none" && getComputedStyle(reveal).display !== "none";
  }, null, { timeout: 5000 });
  const keyboardBefore = await readState();
  await assertFocusVisible(reveal, `${label} reveal control after advancing`);
  await page.keyboard.press("Enter");
  await page.waitForFunction((previousMessage) => {
    return getComputedStyle(document.querySelector("#ev_next")).display !== "none" ||
      ((document.querySelector("#tsp_mess")?.textContent || "").trim()) !== previousMessage;
  }, keyboardBefore.message, { timeout: 5000 });
  const keyboardAfter = await readState();
  assert(
    keyboardAfter.message !== keyboardBefore.message ||
      keyboardAfter.score !== keyboardBefore.score ||
      keyboardAfter.nextVisible !== "none",
    `${label} keyboard reveal did not advance correctness state`,
  );
  assert(
    keyboardAfter.nextVisible !== "none" && pointerAfter.nextVisible !== "none",
    `${label} pointer and keyboard reveal paths did not reach the same next-exercise state`,
  );
}

async function smokeTeoriaExercise(context, config) {
  const page = await context.newPage();
  const assertPageRuntimeClean = createRuntimeMonitor(page);
  await assertRoute(page, `${config.slug}/`, "#reference-footer");
  await assertEngineeringSandboxShell(page, config.label, {
    minimumChapters: 0,
    navMode: "none",
    expectedFamily: "teoria-practice",
    expectedRoute: config.slug,
    expectedVariant: "practice",
  });
  await assertLocalScriptSources(page, teoriaExerciseScripts(config.exerciseScript, config.musikaScript), config.label);
  await waitForTeoriaOptions(page);

  const preloadStats = await page.evaluate(() => ({
    soundsCount: window.exe?.teoExe?.webAudio?.p_soundsCount ?? 0,
    totalSounds: window.exe?.teoExe?.webAudio?.p_totalSounds ?? 0,
    audioPath: window.exe?.teoExe?.webAudio?.p_path ?? "",
  }));
  assert(preloadStats.soundsCount === TEORIA_AUDIO_SAMPLE_COUNT, `${config.label} did not preload the full local piano bank`);
  assert(preloadStats.totalSounds === TEORIA_AUDIO_SAMPLE_COUNT, `${config.label} expected ${TEORIA_AUDIO_SAMPLE_COUNT} local piano samples`);
  assert(preloadStats.audioPath === "./res/musika_2024/audio/", `${config.label} did not use the local audio tree`);
  await assertNoRemotePlayableMediaRequests(page, config.label);
  console.log(`OK ${config.slug} local assets`);

  await startTeoriaExercise(page, config);
  const mountState = await page.evaluate(() => ({
    ids: Array.from(document.querySelectorAll(".story-practice-surface > [id]")).map((element) => element.id),
    scoreCount: document.querySelectorAll("#tsp_score").length,
    messageCount: document.querySelectorAll("#tsp_mess").length,
  }));
  assert(
    JSON.stringify(mountState.ids) === JSON.stringify(["init", "opts", "xml_opts", "exe", "score"]),
    `${config.label} changed its five vendored exercise mounts`,
  );
  assert(mountState.scoreCount === 1 && mountState.messageCount === 1, `${config.label} did not expose generated score and message state`);
  for (const selector of config.requiredSelectors || []) {
    await page.waitForSelector(selector, { timeout: 5000 });
  }
  if (config.readyMessage) {
    await page.waitForFunction((expectedMessage) => {
      return ((document.querySelector("#tsp_mess")?.textContent || "").trim()) === expectedMessage;
    }, config.readyMessage, { timeout: 20000 });
  }

  if (config.interactionType === "canvas-change") {
    await assertTeoriaCanvasInteraction(page, config);
  } else if (config.interactionType === "message-change") {
    await assertTeoriaMessageInteraction(page, config);
  }
  console.log(`OK ${config.slug} interaction surface`);

  await assertTeoriaRevealFlow(page, config.label);
  console.log(`OK ${config.slug} answer flow`);

  await assertEngineeringSandboxLayout(context, `${config.slug}/`, config.label, {
    navMode: "none",
    controlSelector: "[data-primary-control]",
    containerSelector: ".teoria-route-shell.story-practice-main",
  });
  console.log(`OK ${config.slug} practice shell`);

  await assertViewportUsable(page, `${config.slug} route`);
  const mobilePage = await context.newPage();
  await mobilePage.setViewportSize({ width: 390, height: 844 });
  await assertRoute(mobilePage, `${config.slug}/`, "#reference-footer");
  await waitForTeoriaOptions(mobilePage);
  await assertViewportUsable(mobilePage, `${config.slug} route`);
  await mobilePage.close();
  await page.waitForTimeout(250);
  assertPageRuntimeClean(`${config.slug} route`);
  console.log(`OK ${config.slug} responsive shell`);
  await page.close();
}

async function smokeTeoriaIntervalEarTraining(context) {
  await smokeTeoriaExercise(context, {
    slug: "teoria-interval-ear-training",
    label: "teoria interval ear training route",
    exerciseScript: "ie.js",
    musikaScript: "musika_260103.js",
    optionSelectors: ["#ov_note"],
    exerciseSelector: "#ev_note",
    interactionType: "canvas-change",
    canvasSelector: "#staff_staff",
    interactionSelector: "#mknp_ev_noteC",
    interactionSelectors: ["#mknp_ev_noteC", "#mknp_ev_noteD"],
  });
}

async function smokeTeoriaNoteEarTraining(context) {
  await smokeTeoriaExercise(context, {
    slug: "teoria-note-ear-training",
    label: "teoria note ear training route",
    exerciseScript: "ne_250201.js",
    optionSelectors: ["#ov_note"],
    exerciseSelector: "#ev_note",
    interactionType: "canvas-change",
    canvasSelector: "#staff_staff",
    interactionSelector: "#mknp_ev_noteC",
    interactionSelectors: ["#mknp_ev_noteC", "#mknp_ev_noteD"],
  });
}

async function smokeTeoriaKeyAndNoteEarTraining(context) {
  await smokeTeoriaExercise(context, {
    slug: "teoria-key-and-note-ear-training",
    label: "teoria key and note ear training route",
    exerciseScript: "kne.js",
    optionSelectors: ["#ov_note", "#ov_playRef"],
    exerciseSelector: "#ev_note",
    interactionType: "canvas-change",
    canvasSelector: "#staff_staff",
    interactionSelector: "#mknp_ev_noteC",
    interactionSelectors: ["#mknp_ev_noteC", "#mknp_ev_noteD"],
    requiredSelectors: ["#pp_extra0"],
  });
}

async function smokeTeoriaRandomKeyAndNoteEarTraining(context) {
  await smokeTeoriaExercise(context, {
    slug: "teoria-random-key-and-note-ear-training",
    label: "teoria random key and note ear training route",
    exerciseScript: "kner.js",
    optionSelectors: ["#ov_note", "#ov_playRef"],
    exerciseSelector: "#ev_note",
    interactionType: "canvas-change",
    canvasSelector: "#staff_staff",
    interactionSelector: "#mknp_ev_noteC",
    interactionSelectors: ["#mknp_ev_noteC", "#mknp_ev_noteD"],
    requiredSelectors: ["#pp_extra0"],
  });
}

async function smokeTeoriaScaleConstruction(context) {
  await smokeTeoriaExercise(context, {
    slug: "teoria-scale-construction",
    label: "teoria scale construction route",
    exerciseScript: "sc_250101.js",
    exerciseSelector: "#ev_note",
    interactionType: "canvas-change",
    canvasSelector: "#staff_ev_staff",
    interactionSelector: "#mknp_ev_noteC",
    interactionSelectors: ["#mknp_ev_noteC", "#mknp_ev_noteD"],
  });
}

async function smokeTeoriaIntervalIdentificationAndInversion(context) {
  await smokeTeoriaExercise(context, {
    slug: "teoria-interval-identification-and-inversion",
    label: "teoria interval identification and inversion route",
    exerciseScript: "iv.js",
    exerciseSelector: "#ev_int",
    interactionType: "message-change",
    interactionSelector: "#mkip_M3",
  });
}

async function readAbletonSvgGeometry(page) {
  return page.locator("main .widget svg").evaluateAll((elements) => elements.map((element, index) => {
    const rect = element.getBoundingClientRect();
    const widget = element.closest(".widget");
    const paint = element.classList.contains("widget-pianoroll__grid")
      ? [element, ...element.querySelectorAll("*")].map((node) => {
          const style = getComputedStyle(node);
          return {
            tag: node.localName,
            className: node.getAttribute("class") || "",
            fill: style.fill,
            stroke: style.stroke,
          };
        })
      : null;
    return {
      key: `${widget?.id || "widget"}:${index}`,
      width: rect.width,
      height: rect.height,
      viewBox: element.getAttribute("viewBox"),
      paint,
    };
  }));
}

function assertAbletonSvgGeometry(actual, expected, label) {
  assert(actual.length === expected.length, `${label} changed intrinsic SVG count`);
  actual.forEach((surface, index) => {
    const baseline = expected[index];
    assert(surface.key === baseline.key, `${label} changed intrinsic SVG order`);
    assert(Math.abs(surface.width - baseline.width) <= 1, `${label} changed ${surface.key} width`);
    assert(Math.abs(surface.height - baseline.height) <= 1, `${label} changed ${surface.key} height`);
    assert(surface.viewBox === baseline.viewBox, `${label} changed ${surface.key} viewBox`);
    assert(JSON.stringify(surface.paint) === JSON.stringify(baseline.paint), `${label} changed ${surface.key} intrinsic paint`);
  });
}

async function assertAbletonGeneratedControls(page, config) {
  const state = await page.evaluate(({ controlRoot, widgetCount, transportCount, gridCount, generatedRootCount }) => {
    const root = document.querySelector(controlRoot);
    const controls = Array.from(root?.querySelectorAll("button, input") || []);
    const pianoRolls = Array.from(document.querySelectorAll(".widget-pianoroll"));
    const drumPads = Array.from(document.querySelectorAll(".widget-drumpad"));
    const roots = [...pianoRolls, ...drumPads];
    return {
      widgetCount: document.querySelectorAll(".widget").length,
      transportCount: document.querySelectorAll("button.widget__transport-btn").length,
      gridCount: document.querySelectorAll(".widget-pianoroll__grid").length,
      generatedRootCount: roots.length,
      hydrated: roots.every((generatedRoot) => generatedRoot.id && Boolean(window[generatedRoot.id])),
      joined: pianoRolls.every((pianoRoll) => pianoRoll.getAttribute("data-onplay") === "join"),
      recorderLinks: drumPads.every((drumPad) => {
        const recorder = drumPad.getAttribute("data-recorder") || "";
        return Boolean(window[recorder]) && pianoRolls.some((pianoRoll) => pianoRoll.getAttribute("data-recorder") === recorder);
      }),
      named: controls.every((control) => (
        control.getAttribute("aria-label") || control.getAttribute("title") || control.textContent || ""
      ).trim()),
      expected: { widgetCount, transportCount, gridCount, generatedRootCount },
    };
  }, config);
  assert(state.widgetCount === state.expected.widgetCount, `${config.label} changed widget count`);
  assert(state.transportCount === state.expected.transportCount, `${config.label} changed transport control count`);
  assert(state.gridCount === state.expected.gridCount, `${config.label} changed sequencer grid count`);
  assert(state.generatedRootCount === state.expected.generatedRootCount, `${config.label} changed generated runtime root count`);
  assert(state.hydrated, `${config.label} did not hydrate every generated widget root`);
  assert(state.joined, `${config.label} lost shared-transport join wiring`);
  assert(state.recorderLinks, `${config.label} lost sequencer and drumpad recorder synchronization`);
  assert(state.named, `${config.label} exposed an unnamed generated control`);
  await assertPointerTargets(
    page.locator(`${config.controlRoot} button, ${config.controlRoot} input`),
    `${config.label} generated controls`,
  );
}

async function assertAbletonLocalSampleBank(page, label) {
  const handle = await page.waitForFunction(() => {
    const declarations = Array.from(document.querySelectorAll("[data-instrument], [data-kit]"));
    const samplePaths = declarations.flatMap((declaration) => {
      const source = declaration.getAttribute("data-instrument") || declaration.getAttribute("data-kit") || "{}";
      return (JSON.parse(source).samples || []).map((sample) => sample.path);
    });
    const expected = Array.from(new Set(samplePaths)).map((samplePath) => (
      new URL(`./lessons/sounds/${samplePath}.ogg`, window.location.href).href
    ));
    const loaded = performance.getEntriesByType("resource").map((entry) => entry.name);
    if (expected.length === 0 || !expected.every((sampleUrl) => loaded.includes(sampleUrl))) {
      return false;
    }
    return { declaredCount: expected.length, local: expected.every((sampleUrl) => new URL(sampleUrl).origin === window.location.origin) };
  }, null, { timeout: 30000 });
  const state = await handle.jsonValue();
  await handle.dispose();
  assert(state.declaredCount > 0, `${label} did not declare an archived sample bank`);
  assert(state.local, `${label} did not load its declared samples locally`);
}

async function assertAbletonTransportParity(page, label) {
  const transport = page.locator("button.widget__transport-btn:not(.hidden)").first();
  const iconClass = () => transport.locator("i").getAttribute("class");
  assert((await iconClass()) === "icon-play", `${label} did not start with a stopped transport`);
  await assertFocusVisible(transport, `${label} transport`);
  await transport.click();
  await page.waitForFunction((button) => button.querySelector("i")?.classList.contains("icon-pause"), await transport.elementHandle());
  await page.waitForFunction(() => window.Tone?.Transport?.state === "started");
  const pointerState = await iconClass();
  await transport.click();
  await page.waitForFunction((button) => button.querySelector("i")?.classList.contains("icon-play"), await transport.elementHandle());
  await page.waitForFunction(() => window.Tone?.Transport?.state === "stopped");
  await transport.focus();
  await page.keyboard.press("Space");
  await page.waitForFunction((button) => button.querySelector("i")?.classList.contains("icon-pause"), await transport.elementHandle());
  await page.waitForFunction(() => window.Tone?.Transport?.state === "started");
  const keyboardState = await iconClass();
  assert(pointerState === keyboardState, `${label} pointer and keyboard transport paths diverged`);
  await page.keyboard.press("Space");
  await page.waitForFunction((button) => button.querySelector("i")?.classList.contains("icon-play"), await transport.elementHandle());
  await page.waitForFunction(() => window.Tone?.Transport?.state === "stopped");
}

async function assertAbletonJoinedTransport(page, label) {
  const roots = page.locator(".widget-pianoroll[data-onplay='join']");
  if ((await roots.count()) < 2) {
    return;
  }
  const firstTransport = roots.first().locator("button.widget__transport-btn:not(.hidden)").first();
  const secondTransport = roots.nth(1).locator("button.widget__transport-btn:not(.hidden)").first();
  await firstTransport.click();
  await page.waitForFunction(() => window.Tone?.Transport?.state === "started");
  await secondTransport.click();
  await page.waitForFunction((button) => button.querySelector("i")?.classList.contains("widget_transport-icon--queued"), await secondTransport.elementHandle());
  assert(await page.evaluate(() => window.Tone?.Transport?.state === "started"), `${label} did not preserve the shared transport while joining a widget`);
}

async function assertAbletonRootChoiceParity(page, rootSelector, label) {
  const choices = page.locator(`${rootSelector} .widget-pianoroll__root-chooser .widget__choice`);
  const selectedRoot = () => page.locator(`${rootSelector} .widget-pianoroll__root-chooser .widget__choice--selected`).textContent();
  assert((await choices.count()) >= 3, `${label} did not expose the root chooser`);
  await choices.nth(2).click();
  await page.waitForFunction((selector) => document.querySelector(`${selector} .widget-pianoroll__root-chooser .widget__choice--selected`)?.textContent?.trim() === "D", rootSelector);
  const pointerState = (await selectedRoot()).trim();
  await choices.first().click();
  await choices.first().focus();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  const focusState = await choices.nth(2).evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      focused: document.activeElement === element,
      outlined: style.outlineStyle !== "none" && parseFloat(style.outlineWidth) > 0,
    };
  });
  assert(focusState.focused && focusState.outlined, `${label} root choice did not expose visible keyboard focus`);
  await page.keyboard.press("Enter");
  await page.waitForFunction((selector) => document.querySelector(`${selector} .widget-pianoroll__root-chooser .widget__choice--selected`)?.textContent?.trim() === "D", rootSelector);
  const keyboardState = (await selectedRoot()).trim();
  assert(pointerState === "D" && keyboardState === pointerState, `${label} pointer and keyboard root-choice paths diverged`);
}

async function smokeAbletonLearningMusicPlayground(context) {
  assert(
    countFilesRecursive("ableton-learning-music-playground/lessons/sounds") === 31,
    "ableton-learning-music-playground route expected 31 local audio files",
  );
  assert(
    countFilesRecursive("ableton-learning-music-playground/fonts") === 9,
    "ableton-learning-music-playground route expected 9 local font files",
  );

  const page = await context.newPage();
  const assertPageRuntimeClean = createRuntimeMonitor(page);
  await assertRoute(page, "ableton-learning-music-playground/", "#reference-footer");
  await assertEngineeringSandboxShell(page, "ableton-learning-music-playground route", {
    minimumChapters: 0,
    navMode: "none",
    expectedFamily: "ableton-practice",
    expectedRoute: "ableton-learning-music-playground",
    expectedVariant: "practice",
  });
  await assertLocalScriptSources(
    page,
    [
      "./third-party/polyfills/polyfills.js",
      "../shared/tone.min.js",
      "./third-party/microevent/microevent.js",
      "./widgets/build/widgets.min.js",
      "./widgets/build/SimplePianoRoll.js",
      "../shared/public-footer.js",
    ],
    "ableton-learning-music-playground route",
  );
  await page.waitForFunction(() => {
    return document.querySelectorAll(".widget").length === 4 &&
      document.querySelectorAll("button.widget__transport-btn").length === 8 &&
      document.querySelectorAll(".widget-pianoroll__grid").length === 4 &&
      Boolean(document.querySelector("#_theplaygroundplaygroundbass .widget__choice"));
  }, null, { timeout: 30000 });
  await assertAbletonGeneratedControls(page, {
    label: "ableton-learning-music-playground route",
    controlRoot: ".playground-route-shell",
    widgetCount: 4,
    transportCount: 8,
    gridCount: 4,
    generatedRootCount: 5,
  });
  const svgGeometry = await readAbletonSvgGeometry(page);
  await assertAbletonLocalSampleBank(page, "ableton-learning-music-playground route");
  await assertNoRemotePlayableMediaRequests(page, "ableton-learning-music-playground route");
  console.log("OK ableton-learning-music-playground local assets");

  await assertAbletonTransportParity(page, "ableton-learning-music-playground route");
  await assertAbletonJoinedTransport(page, "ableton-learning-music-playground route");
  const playbackState = await page.evaluate(() => ({
    toneState: window.Tone?.getContext?.().state || "",
    widgetGlobals: [
      "_theplaygroundplaygrounddrumssequencer",
      "_theplaygroundplaygrounddrumsdrumpad",
      "_theplaygroundplaygroundbass",
      "_theplaygroundplaygroundpiano",
      "_theplaygroundplaygroundsynth",
    ].every((key) => Boolean(window[key])),
  }));
  assert(playbackState.toneState === "running", "ableton-learning-music-playground route did not initialize the local audio context");
  assert(playbackState.widgetGlobals, "ableton-learning-music-playground route did not hydrate all widget globals");
  console.log("OK ableton-learning-music-playground transport");

  await assertAbletonRootChoiceParity(page, "#_theplaygroundplaygroundbass", "ableton-learning-music-playground route");
  const editState = await page.evaluate(() => ({
    selectedRoot: document.querySelector("#_theplaygroundplaygroundbass .widget-pianoroll__root-chooser .widget__choice--selected")?.textContent?.trim() || "",
    selectedScale: document.querySelectorAll("#_theplaygroundplaygroundbass .widget__choice--selected").length,
  }));
  assert(editState.selectedRoot === "D", `ableton-learning-music-playground route expected D root after edit, got ${editState.selectedRoot || "none"}`);
  assert(editState.selectedScale >= 2, "ableton-learning-music-playground route lost synchronized chooser state after edit");
  assertAbletonSvgGeometry(await readAbletonSvgGeometry(page), svgGeometry, "ableton-learning-music-playground route");
  await assertNoRemotePlayableMediaRequests(page, "ableton-learning-music-playground route");
  console.log("OK ableton-learning-music-playground edit path");

  await assertEngineeringSandboxLayout(context, "ableton-learning-music-playground/", "ableton-learning-music-playground route", {
    navMode: "none",
    controlSelector: "[data-primary-control]",
    containerSelector: ".playground-route-shell.story-practice-main",
  });
  await assertPrimarySurfaceVisible(page, "ableton-learning-music-playground route");
  console.log("OK ableton-learning-music-playground practice shell");

  await assertViewportUsable(page, "ableton-learning-music-playground route");
  await assertRouteViewportUsable(
    context,
    "ableton-learning-music-playground/",
    "#reference-footer",
    "button.widget__transport-btn",
    "ableton-learning-music-playground route",
    390,
    844,
  );
  await page.waitForTimeout(250);
  assertPageRuntimeClean("ableton-learning-music-playground route");
  console.log("OK ableton-learning-music-playground responsive shell");
  await page.close();
}

async function smokeAbletonLearningMusicLesson(context, config) {
  const {
    slug,
    label,
    widgetCount,
    transportCount,
    editKind,
  } = config;

  assert(
    countFilesRecursive(`${slug}/lessons/sounds`) === 31,
    `${label} expected 31 local audio files`,
  );
  assert(
    countFilesRecursive(`${slug}/fonts`) === 9,
    `${label} expected 9 local font files`,
  );

  const page = await context.newPage();
  const assertPageRuntimeClean = createRuntimeMonitor(page);
  await assertRoute(page, `${slug}/`, "#reference-footer");
  await assertEngineeringSandboxShell(page, label, {
    minimumChapters: 0,
    navMode: "none",
    expectedFamily: "ableton-practice",
    expectedRoute: slug,
    expectedVariant: "practice",
  });
  await assertLocalScriptSources(
    page,
    [
      "./third-party/polyfills/polyfills.js",
      "../shared/tone.min.js",
      "./third-party/microevent/microevent.js",
      "./widgets/build/widgets.min.js",
      "./widgets/build/SimplePianoRoll.js",
      "../shared/public-footer.js",
    ],
    label,
  );
  await page.waitForFunction(({ widgetCount, transportCount }) => {
    return document.querySelectorAll(".widget").length === widgetCount &&
      document.querySelectorAll("button.widget__transport-btn").length === transportCount &&
      document.querySelectorAll(".widget-pianoroll__grid").length === widgetCount;
  }, { widgetCount, transportCount }, { timeout: 30000 });
  await assertAbletonGeneratedControls(page, {
    label,
    controlRoot: ".story-practice-surface",
    widgetCount,
    transportCount,
    gridCount: widgetCount,
    generatedRootCount: widgetCount + 1,
  });
  await waitForDocumentLayout(page);
  const svgGeometry = await readAbletonSvgGeometry(page);
  await assertAbletonLocalSampleBank(page, label);
  await assertNoRemotePlayableMediaRequests(page, label);
  console.log(`OK ${label} local assets`);

  await assertAbletonTransportParity(page, label);
  await assertAbletonJoinedTransport(page, label);
  const playbackState = await page.evaluate(() => ({
    toneState: window.Tone?.getContext?.().state || "",
    transportCount: document.querySelectorAll("button.widget__transport-btn").length,
  }));
  assert(playbackState.toneState === "running", `${label} did not initialize the local audio context`);
  assert(playbackState.transportCount === transportCount, `${label} lost transport controls after playback`);
  console.log(`OK ${label} transport`);

  if (editKind === "tempo") {
    const tempoState = await page.evaluate(() => {
      const slider = document.querySelector("input[type='range']");
      if (!slider) {
        return null;
      }

      const before = slider.value;
      slider.value = "96";
      slider.dispatchEvent(new Event("input", { bubbles: true }));
      slider.dispatchEvent(new Event("change", { bubbles: true }));
      return {
        before,
        after: slider.value,
      };
    });
    assert(tempoState, `${label} did not expose a tempo slider`);
    assert(tempoState.after === "96", `${label} did not accept the new tempo value`);
  } else if (editKind === "root-choice") {
    const tonalWidgetId = await page.locator(".widget.widget-pianoroll").first().getAttribute("id");
    const rootSelector = `#${tonalWidgetId}`;
    await assertAbletonRootChoiceParity(page, rootSelector, label);
    const editState = await page.evaluate((selector) => ({
      selectedRoot: document.querySelector(`${selector} .widget-pianoroll__root-chooser .widget__choice--selected`)?.textContent?.trim() || "",
      selectedCount: document.querySelectorAll(`${selector} .widget__choice--selected`).length,
    }), rootSelector);
    assert(editState.selectedRoot === "D", `${label} expected D root after edit, got ${editState.selectedRoot || "none"}`);
    assert(editState.selectedCount >= 2, `${label} lost synchronized chooser state after edit`);
  }
  assertAbletonSvgGeometry(await readAbletonSvgGeometry(page), svgGeometry, label);
  await assertNoRemotePlayableMediaRequests(page, label);
  console.log(`OK ${label} edit path`);

  await assertEngineeringSandboxLayout(context, `${slug}/`, label, {
    navMode: "none",
    controlSelector: "[data-primary-control]",
    containerSelector: ".ableton-lesson-shell.story-practice-main",
  });
  await assertPrimarySurfaceVisible(page, label);
  console.log(`OK ${label} practice shell`);

  await assertViewportUsable(page, label);
  await assertRouteViewportUsable(
    context,
    `${slug}/`,
    "#reference-footer",
    "button.widget__transport-btn",
    label,
    390,
    844,
  );
  await page.waitForTimeout(250);
  assertPageRuntimeClean(label);
  console.log(`OK ${label} responsive shell`);
  await page.close();
}

async function smokeAbletonLearningMusicPlayWithBeats(context) {
  await smokeAbletonLearningMusicLesson(context, {
    slug: "ableton-learning-music-play-with-beats",
    label: "ableton-learning-music-play-with-beats route",
    widgetCount: 1,
    transportCount: 2,
    editKind: "tempo",
  });
}

async function smokeAbletonLearningMusicPlayWithNotesAndScales(context) {
  await smokeAbletonLearningMusicLesson(context, {
    slug: "ableton-learning-music-play-with-notes-and-scales",
    label: "ableton-learning-music-play-with-notes-and-scales route",
    widgetCount: 2,
    transportCount: 4,
    editKind: "root-choice",
  });
}

async function smokeAbletonLearningMusicPlayWithChords(context) {
  await smokeAbletonLearningMusicLesson(context, {
    slug: "ableton-learning-music-play-with-chords",
    label: "ableton-learning-music-play-with-chords route",
    widgetCount: 2,
    transportCount: 4,
    editKind: "root-choice",
  });
}

async function smokeAbletonLearningMusicPlayWithBasslines(context) {
  await smokeAbletonLearningMusicLesson(context, {
    slug: "ableton-learning-music-play-with-basslines",
    label: "ableton-learning-music-play-with-basslines route",
    widgetCount: 2,
    transportCount: 4,
    editKind: "root-choice",
  });
}

async function smokeAbletonLearningMusicPlayWithMelodies(context) {
  await smokeAbletonLearningMusicLesson(context, {
    slug: "ableton-learning-music-play-with-melodies",
    label: "ableton-learning-music-play-with-melodies route",
    widgetCount: 2,
    transportCount: 4,
    editKind: "root-choice",
  });
}

async function smokeAbletonLearningMusicPlayWithSongStructures(context) {
  assert(
    countFilesRecursive("ableton-learning-music-play-with-song-structures/lessons/sounds") === 31,
    "ableton-learning-music-play-with-song-structures route expected 31 local audio files",
  );
  assert(
    countFilesRecursive("ableton-learning-music-play-with-song-structures/fonts") === 9,
    "ableton-learning-music-play-with-song-structures route expected 9 local font files",
  );

  const page = await context.newPage();
  const assertPageRuntimeClean = createRuntimeMonitor(page);
  await assertRoute(page, "ableton-learning-music-play-with-song-structures/", "#reference-footer");
  await assertEngineeringSandboxShell(page, "ableton-learning-music-play-with-song-structures route", {
    minimumChapters: 0,
    navMode: "none",
    expectedFamily: "ableton-practice",
    expectedRoute: "ableton-learning-music-play-with-song-structures",
    expectedVariant: "practice",
  });
  await assertLocalScriptSources(
    page,
    [
      "./third-party/polyfills/polyfills.js",
      "../shared/tone.min.js",
      "./third-party/microevent/microevent.js",
      "./widgets/build/widgets.min.js",
      "../shared/public-footer.js",
    ],
    "ableton-learning-music-play-with-song-structures route",
  );
  await page.waitForFunction(() => {
    return Boolean(document.querySelector("[data-ableton-lesson='ableton-learning-music-play-with-song-structures']")) &&
      /song forms/i.test(document.querySelector("main")?.textContent || "") &&
      document.querySelectorAll(".widget").length === 0;
  }, null, { timeout: 20000 });
  await assertNoRemotePlayableMediaRequests(page, "ableton-learning-music-play-with-song-structures route");
  console.log("OK ableton-learning-music-play-with-song-structures local shell");

  await assertEngineeringSandboxLayout(context, "ableton-learning-music-play-with-song-structures/", "ableton-learning-music-play-with-song-structures route", {
    navMode: "none",
    controlSelector: "[data-primary-control]",
    containerSelector: ".ableton-lesson-shell.story-practice-main",
  });
  await assertPrimarySurfaceVisible(page, "ableton-learning-music-play-with-song-structures route");
  console.log("OK ableton-learning-music-play-with-song-structures practice shell");

  await assertViewportUsable(page, "ableton-learning-music-play-with-song-structures route");
  await assertRouteViewportUsable(
    context,
    "ableton-learning-music-play-with-song-structures/",
    "#reference-footer",
    "[data-ableton-lesson='ableton-learning-music-play-with-song-structures']",
    "ableton-learning-music-play-with-song-structures route",
    390,
    844,
  );
  await page.waitForTimeout(250);
  assertPageRuntimeClean("ableton-learning-music-play-with-song-structures route");
  console.log("OK ableton-learning-music-play-with-song-structures responsive shell");
  await page.close();
}

async function smokeAbletonLearningSynthLesson(context, config) {
  const { slug, label, titleText, interactionKind } = config;

  assert(
    countFilesRecursive(`${slug}/fonts`) === 12,
    `${label} expected 12 local font files`,
  );
  assert(
    countFilesRecursive(`${slug}/content/assets/sounds`) === 4,
    `${label} expected 4 shared local sound assets`,
  );
  assert(
    countFilesRecursive(`${slug}/content/lessons/en/synthesis`) === 5,
    `${label} expected 5 lesson-local WAV files`,
  );
  assert(
    countFilesRecursive(`${slug}/content/assets/models`) === 4,
    `${label} expected 4 local GLB model assets`,
  );
  assert(
    countFilesRecursive(`${slug}/content/texts/en`) === 6,
    `${label} expected 6 local text payload files`,
  );
  assert(
    countFilesRecursive(`${slug}/presets`) === 2,
    `${label} expected 2 preset catalog files`,
  );
  assert(
    countFilesRecursive(`${slug}/rnbo/patches`) === 1,
    `${label} expected 1 local RNBO patch`,
  );

  const page = await context.newPage();
  const assertPageRuntimeClean = createRuntimeMonitor(page);
  await assertRoute(page, `${slug}/`, "#reference-footer");
  const familyTreatment = await page.evaluate(() => {
    const body = document.body;
    const app = document.querySelector("main[data-ableton-synth-lesson]");
    const topBar = document.querySelector(".top-bar");
    const bodyStyle = window.getComputedStyle(body);
    const appStyle = window.getComputedStyle(app);
    return {
      family: body.dataset.storyFamily,
      route: body.dataset.storyRoute,
      hasStylesheet: Array.from(document.querySelectorAll('link[rel="stylesheet"]')).some((link) => {
        return link.getAttribute("href") === "../shared/prototype-visual.css";
      }),
      bodyPaddingTop: Number.parseFloat(bodyStyle.paddingTop),
      appTop: app.getBoundingClientRect().top,
      appBorderTopWidth: Number.parseFloat(appStyle.borderTopWidth),
      appShadow: appStyle.boxShadow,
      topBarHeight: topBar.getBoundingClientRect().height,
    };
  });
  assert(familyTreatment.family === "ableton-synths", `${label} did not declare the synth family`);
  assert(familyTreatment.route === slug, `${label} did not declare its route slug`);
  assert(familyTreatment.hasStylesheet, `${label} did not load the shared synth treatment`);
  assert(
    Math.abs(familyTreatment.topBarHeight - familyTreatment.bodyPaddingTop) <= 1 &&
      Math.abs(familyTreatment.appTop - familyTreatment.bodyPaddingTop) <= 1,
    `${label} did not align the shared chrome with the archived lesson`,
  );
  assert(familyTreatment.appBorderTopWidth >= 2, `${label} did not expose the synth family marker`);
  assert(familyTreatment.appShadow !== "none", `${label} did not frame the archived lesson surface`);
  await assertLocalScriptSources(
    page,
    [
      "../shared/ableton-learning-synths-react.production.min.js",
      "../shared/ableton-learning-synths-react-dom.production.min.js",
      "../shared/ableton-learning-synths-musiclab.js",
      "../shared/ableton-learning-synths-archive.js",
      "../shared/public-footer.js",
    ],
    label,
  );
  await page.waitForFunction((expectedTitle) => {
    const heading = document.querySelector("main[data-ableton-synth-lesson] h1");
    return Boolean(heading) && heading.textContent?.trim() === expectedTitle;
  }, titleText, { timeout: 30000 });
  const archiveShellState = await page.evaluate(() => {
    const bodyLinks = Array.from(document.querySelectorAll("main[data-ableton-synth-lesson] a[href]"));
    return {
      localizedLinks: bodyLinks.filter((node) => {
        const href = node.getAttribute("href") || "";
        return href.startsWith("../ableton-learning-synths-");
      }).length,
      hasRemoteLessonLink: bodyLinks.some((node) => /learningsynths\.ableton\.com/i.test(node.getAttribute("href") || "")),
      hasFeedbackLink: bodyLinks.some((node) => /^mailto:learning@ableton\.com/i.test(node.getAttribute("href") || "")),
    };
  });
  assert(archiveShellState.localizedLinks >= 2, `${label} did not localize the synth lesson cross-links`);
  assert(!archiveShellState.hasRemoteLessonLink, `${label} left a remote Learning Synths body link in place`);
  assert(!archiveShellState.hasFeedbackLink, `${label} left the upstream feedback link in the public body`);
  const tocToggle = page.locator("#app[data-ableton-synth-lesson] .components_lesson-viewer__toc-toggle");
  await assertFocusVisible(tocToggle, `${label} native lesson menu toggle`);
  await page.keyboard.press("Enter");
  await page.waitForFunction(() => document.body.classList.contains("show-toc"), null, { timeout: 5000 });
  const localizedLinks = page.locator("#app[data-ableton-synth-lesson] a[data-archive-localized=\"true\"]");
  const tocState = await localizedLinks.evaluateAll((links) => ({
    count: links.length,
    local: links.every((link) => {
      const url = new URL(link.href);
      return url.origin === window.location.origin && url.pathname.startsWith("/interactive-explanation/ableton-learning-synths-");
    }),
  }));
  assert(tocState.count >= 2 && tocState.local, `${label} did not expose local synth lesson links inside the native menu`);
  assert(await renderedControlCount(localizedLinks) >= 1, `${label} did not reveal a localized lesson link inside the native menu`);
  await page.keyboard.press("Escape");
  await page.waitForFunction(() => !document.body.classList.contains("show-toc"), null, { timeout: 5000 });
  assert(await tocToggle.evaluate((toggle) => document.activeElement === toggle), `${label} did not restore focus to the native lesson menu toggle`);
  await assertNoRemotePlayableMediaRequests(page, label);
  console.log(`OK ${label} local archive shell`);

  if (interactionKind === "xy") {
    const xyState = await page.evaluate(async () => {
      const control = document.querySelector(".components_xy-pad__control-container");
      const key = Object.keys(control || {}).find((name) => name.startsWith("__reactInternalInstance$"));
      let xyFiber = control?.[key];
      for (let index = 0; xyFiber && index < 5; index += 1) {
        xyFiber = xyFiber.return;
      }
      let lessonFiber = control?.[key];
      for (let index = 0; lessonFiber && index < 7; index += 1) {
        lessonFiber = lessonFiber.return;
      }
      const xyPad = xyFiber?.stateNode;
      const lesson = lessonFiber?.stateNode;
      if (!xyPad || !lesson) {
        return null;
      }

      const beforeTransform = control.getAttribute("style") || "";
      lesson.onXYChange({ type: 0, xPctEased: 0.5, yPctEased: 0.5, xPctRaw: 0.5, yPctRaw: 0.5 });
      xyPad.setToPos(0.82, 0.18);
      xyPad.notifyStateChange(1);
      await new Promise((resolve) => window.setTimeout(resolve, 50));
      const afterTransform = control.getAttribute("style") || "";
      const duringState = { ...lesson.state };
      lesson.onXYChange({ type: 2, xPctEased: 0.82, yPctEased: 0.18, xPctRaw: 0.82, yPctRaw: 0.18 });
      return {
        beforeTransform,
        afterTransform,
        duringState,
        finalState: { ...lesson.state },
      };
    });
    assert(xyState, `${label} did not expose the XY synth control`);
    assert(xyState.beforeTransform !== xyState.afterTransform, `${label} did not update the XY position`);
    assert(xyState.duringState.active === true, `${label} did not activate during note trigger`);
    assert(xyState.finalState.active === false, `${label} did not release after note stop`);
  } else if (interactionKind === "filter-xy") {
    const filterState = await page.evaluate(async () => {
      const control = document.querySelector(".components_xy-pad__control-container");
      const curve = document.querySelector(".component_filter-curve__path");
      const key = Object.keys(control || {}).find((name) => name.startsWith("__reactInternalInstance$"));
      let fiber = control?.[key];
      for (let index = 0; fiber && index < 7; index += 1) {
        fiber = fiber.return;
      }
      const component = fiber?.stateNode;
      if (!component || !curve) {
        return null;
      }

      const beforeCurve = curve.getAttribute("d") || "";
      component.onXYChange({ type: 0, xPctEased: 0.5, yPctEased: 0.5, xPctRaw: 0.5, yPctRaw: 0.5 });
      component.onXYChange({ type: 1, xPctEased: 0.88, yPctEased: 0.22, xPctRaw: 0.88, yPctRaw: 0.22 });
      component.forceUpdate();
      await new Promise((resolve) => window.setTimeout(resolve, 50));
      const afterCurve = curve.getAttribute("d") || "";
      const duringState = { ...component.state };
      component.onXYChange({ type: 2, xPctEased: 0.88, yPctEased: 0.22, xPctRaw: 0.88, yPctRaw: 0.22 });
      return {
        beforeCurve,
        afterCurve,
        duringState,
        macroX: component.player.getMacroXValue(),
        macroY: component.player.getMacroYValue(),
      };
    });
    assert(filterState, `${label} did not expose the filter XY scene`);
    assert(filterState.beforeCurve !== filterState.afterCurve, `${label} did not update the filter curve`);
    assert(filterState.duringState.active === true, `${label} did not activate the filter scene during note trigger`);
    assert(filterState.macroX > 0.8 && filterState.macroY > 0.7, `${label} did not update the filter macro values`);
  } else if (interactionKind === "slider") {
    const sliderState = await page.evaluate(async () => {
      const control = document.querySelector(".components_control__slider_control");
      const fill = document.querySelector(".components_control__slider_fill");
      const key = Object.keys(control || {}).find((name) => name.startsWith("__reactInternalInstance$"));
      let fiber = control?.[key];
      for (let index = 0; fiber && index < 5; index += 1) {
        fiber = fiber.return;
      }
      const component = fiber?.stateNode;
      if (!component || !fill) {
        return null;
      }

      const beforeFill = fill.getAttribute("style") || "";
      component.onSliderChange({ type: 0, pctEased: 0, pctRaw: 0 });
      component.onSliderChange({ type: 1, pctEased: 0.72, pctRaw: 0.72 });
      await new Promise((resolve) => window.setTimeout(resolve, 60));
      const afterFill = fill.getAttribute("style") || "";
      const duringState = { ...component.state };
      component.onSliderChange({ type: 2, pctEased: 0.72, pctRaw: 0.72 });
      return {
        beforeFill,
        afterFill,
        duringState,
        finalState: { ...component.state },
        macroX: component.player.getMacroXValue(),
      };
    });
    assert(sliderState, `${label} did not expose the synth slider scene`);
    assert(sliderState.beforeFill !== sliderState.afterFill, `${label} did not update the slider fill`);
    assert(sliderState.duringState.active === true, `${label} did not enter the active note state`);
    assert(sliderState.finalState.active === false, `${label} did not release after slider note stop`);
    assert(sliderState.macroX > 0.4, `${label} did not update the synth macro value`);
  } else if (interactionKind === "adsr") {
    const adsrState = await page.evaluate(async () => {
      const button = document.querySelector(".synth-adsr__press-hold-button");
      const shape = document.querySelector(".adsr-envelope-shape");
      const key = Object.keys(button || {}).find((name) => name.startsWith("__reactInternalInstance$"));
      let fiber = button?.[key];
      for (let index = 0; fiber && index < 5; index += 1) {
        fiber = fiber.return;
      }
      const component = fiber?.stateNode;
      if (!component || !shape) {
        return null;
      }

      const beforeShape = shape.getAttribute("d") || "";
      const beforeAttack = component.props.player.getParameterControlValue(component.props.attackParameter);
      component.setADSRControlValues(0.8, 0.45, 0.25, 0.6);
      component.forceUpdate();
      await new Promise((resolve) => window.setTimeout(resolve, 60));
      const afterShape = shape.getAttribute("d") || "";
      const afterAttack = component.props.player.getParameterControlValue(component.props.attackParameter);
      component.startNote();
      await new Promise((resolve) => window.setTimeout(resolve, 40));
      const heldNotes = component.props.player.getHeldNotes().length;
      component.stopNote();
      return {
        beforeShape,
        afterShape,
        beforeAttack,
        afterAttack,
        heldNotes,
      };
    });
    assert(adsrState, `${label} did not expose the ADSR scene`);
    assert(adsrState.beforeShape !== adsrState.afterShape, `${label} did not redraw the ADSR envelope`);
    assert(adsrState.beforeAttack !== adsrState.afterAttack, `${label} did not update the envelope parameters`);
    assert(adsrState.heldNotes === 1, `${label} did not trigger a held synth note`);
  } else if (interactionKind === "recipe") {
    const slider = page.locator(".components_control__slider_control").first();
    const fill = page.locator(".components_control__slider_fill").first();
    const beforeFill = await fill.getAttribute("style");
    await slider.focus();
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(120);
    const afterFill = await fill.getAttribute("style");
    assert(beforeFill !== afterFill, `${label} did not update a recipe slider`);

    const playButton = page.locator(".synth-playback_play-stop-button").first();
    await playButton.click();
    await page.waitForTimeout(120);
    const buttonClass = await playButton.getAttribute("class");
    assert(/--playing/.test(buttonClass || ""), `${label} did not enter the playing state`);
  } else {
    throw new Error(`Unknown Ableton Learning Synths interaction kind: ${interactionKind}`);
  }
  await assertNoRemotePlayableMediaRequests(page, label);
  console.log(`OK ${label} interaction path`);

  await assertViewportUsable(page, label);
  await assertRouteViewportUsable(
    context,
    `${slug}/`,
    "#reference-footer",
    "main[data-ableton-synth-lesson] h1",
    label,
    390,
    844,
  );
  await page.waitForTimeout(250);
  assertPageRuntimeClean(label);
  console.log(`OK ${label} responsive shell`);
  await page.close();
}

async function smokeAbletonLearningSynthsGetStarted(context) {
  await smokeAbletonLearningSynthLesson(context, {
    slug: "ableton-learning-synths-get-started",
    label: "ableton-learning-synths-get-started route",
    titleText: "Get started making sounds",
    interactionKind: "xy",
  });
}

async function smokeAbletonLearningSynthsHowSynthsMakeSound(context) {
  await smokeAbletonLearningSynthLesson(context, {
    slug: "ableton-learning-synths-how-synths-make-sound",
    label: "ableton-learning-synths-how-synths-make-sound route",
    titleText: "How synths make sound",
    interactionKind: "slider",
  });
}

async function smokeAbletonLearningSynthsFilterResonance(context) {
  await smokeAbletonLearningSynthLesson(context, {
    slug: "ableton-learning-synths-filter-resonance",
    label: "ableton-learning-synths-filter-resonance route",
    titleText: "Filter resonance",
    interactionKind: "filter-xy",
  });
}

async function smokeAbletonLearningSynthsModulatingAmplitudeWithEnvelopes(context) {
  await smokeAbletonLearningSynthLesson(context, {
    slug: "ableton-learning-synths-modulating-amplitude-with-envelopes",
    label: "ableton-learning-synths-modulating-amplitude-with-envelopes route",
    titleText: "Modulating amplitude with envelopes",
    interactionKind: "adsr",
  });
}

async function smokeAbletonLearningSynthsMatchingEnvelopes(context) {
  await smokeAbletonLearningSynthLesson(context, {
    slug: "ableton-learning-synths-matching-envelopes",
    label: "ableton-learning-synths-matching-envelopes route",
    titleText: "Matching envelopes",
    interactionKind: "adsr",
  });
}

async function smokeAbletonLearningSynthsRecipes(context) {
  await smokeAbletonLearningSynthLesson(context, {
    slug: "ableton-learning-synths-recipes",
    label: "ableton-learning-synths-recipes route",
    titleText: "Get to know this synth",
    interactionKind: "recipe",
  });
}

async function smokeChromeMusicLabSongMaker(context) {
  assert(
    countFilesRecursive("chrome-music-lab-song-maker/client/audio") === 110,
    "chrome-music-lab-song-maker route expected 110 local audio files",
  );
  assert(
    countFilesRecursive("chrome-music-lab-song-maker/client/images") === 20,
    "chrome-music-lab-song-maker route expected 20 local image files",
  );
  assert(
    countFilesRecursive("chrome-music-lab-song-maker/client/fonts") === 2,
    "chrome-music-lab-song-maker route expected 2 local font files",
  );

  const page = await context.newPage();
  const assertPageRuntimeClean = createRuntimeMonitor(page);
  await assertRoute(page, "chrome-music-lab-song-maker/", "#reference-footer");
  await assertLocalScriptSources(
    page,
    ["build/Main.js", "../../shared/public-footer.js"],
    "chrome-music-lab-song-maker route",
  );
  await page.waitForFunction(() => {
    return Boolean(document.querySelector("#grid-container")) &&
      Boolean(document.querySelector("#instrument-canvas")) &&
      Boolean(document.querySelector("#play-button")) &&
      Boolean(document.querySelector("#save-button"));
  }, null, { timeout: 30000 });
  await page.waitForTimeout(5000);
  await assertNoRemotePlayableMediaRequests(page, "chrome-music-lab-song-maker route");
  console.log("OK chrome-music-lab-song-maker local assets");

  const instrumentCanvas = page.locator("#instrument-canvas");
  const canvasBefore = await instrumentCanvas.evaluate((node) => node.toDataURL());
  const canvasBox = await instrumentCanvas.boundingBox();
  assert(canvasBox, "chrome-music-lab-song-maker route did not expose the instrument canvas");
  await page.mouse.click(canvasBox.x + canvasBox.width * 0.2, canvasBox.y + canvasBox.height * 0.2);
  await page.waitForTimeout(300);
  const canvasAfter = await instrumentCanvas.evaluate((node) => node.toDataURL());
  assert(canvasAfter !== canvasBefore, "chrome-music-lab-song-maker route did not update the grid after painting a note");
  console.log("OK chrome-music-lab-song-maker note painting");

  await page.click("#play-button");
  await page.waitForTimeout(700);
  const playbackState = await page.evaluate(() => ({
    playText: document.querySelector("#play-button")?.textContent?.trim() || "",
    bottomPresent: Boolean(document.querySelector("#bottom")),
  }));
  assert(playbackState.playText === "Stop", "chrome-music-lab-song-maker route did not toggle into playback");
  assert(playbackState.bottomPresent, "chrome-music-lab-song-maker route lost the playback control shell");
  console.log("OK chrome-music-lab-song-maker playback");

  await page.click("#instrument-toggle-button");
  await page.waitForTimeout(250);
  await page.evaluate(() => document.querySelector("#meter-button")?.click());
  await page.waitForTimeout(250);
  const controlState = await page.evaluate(() => ({
    instrumentText: document.querySelector("#instrument-toggle-button")?.textContent?.trim() || "",
    tempoSliderClass: document.querySelector("#tempo-slider")?.className || "",
    meterClass: document.querySelector("#meter-button")?.className || "",
    saveText: document.querySelector("#save-button")?.textContent?.trim() || "",
    saveDisabled: Boolean(document.querySelector("#save-button")?.disabled),
  }));
  assert(controlState.instrumentText === "Piano", `chrome-music-lab-song-maker route expected Piano after instrument toggle, got ${controlState.instrumentText || "none"}`);
  assert(/show/.test(controlState.tempoSliderClass), "chrome-music-lab-song-maker route did not reveal the tempo slider");
  assert(/expand/.test(controlState.meterClass), "chrome-music-lab-song-maker route did not expand the tempo control");
  assert(controlState.saveText === "Save unavailable" && controlState.saveDisabled, "chrome-music-lab-song-maker route did not keep save disabled in the local archive build");
  await assertNoRemotePlayableMediaRequests(page, "chrome-music-lab-song-maker route");
  console.log("OK chrome-music-lab-song-maker controls");

  await assertViewportUsable(page, "chrome-music-lab-song-maker route");
  await assertRouteViewportUsable(
    context,
    "chrome-music-lab-song-maker/",
    "#reference-footer",
    "#play-button",
    "chrome-music-lab-song-maker route",
    390,
    844,
  );
  await page.waitForTimeout(250);
  assertPageRuntimeClean("chrome-music-lab-song-maker route");
  console.log("OK chrome-music-lab-song-maker responsive shell");
  await page.close();
}

async function openMusicmapGenreFromSearch(page, searchTerm, resultIndex) {
  await page.click("#search-toggle-button");
  await page.waitForSelector("#search-field", { state: "visible", timeout: 15000 });
  await page.locator("#search-field").fill("");
  await page.locator("#search-field").type(searchTerm, { delay: 40 });
  await page.waitForFunction(() => !document.querySelector("#search-button")?.disabled, null, { timeout: 10000 });
  await page.click("#search-button", { force: true });
  await page.waitForFunction(() => {
    return /matches found/i.test(document.querySelector("#search-results-title")?.textContent || "") &&
      document.querySelectorAll("#search-results-paragraphs a").length > 1;
  }, null, { timeout: 25000 });
  await page.waitForTimeout(2000);
  await page.locator("#search-results-paragraphs a").nth(resultIndex).click({ force: true });
  await page.waitForFunction(() => {
    return (document.querySelector("#right-side-pane-genre-name")?.textContent || "").trim().length > 0 &&
      document.querySelectorAll("#right-side-pane-songlist a").length > 0;
  }, null, { timeout: 20000 });
}

async function smokeMusicmap(context) {
  const route = routeManifestBySlug.get("musicmap");
  const policy = route?.experience.networkPolicy;
  assert(policy?.mode === "deferred-remote" && policy.actions.length === 2, "musicmap route requires its manifest deferred network policy");
  const [youtubeAction, spotifyAction] = policy.actions;
  assert(
    countFilesRecursive("musicmap/assets") === 5,
    "musicmap route expected 5 vendored static assets under musicmap/assets",
  );

  const page = await context.newPage();
  const assertPageRuntimeClean = createRuntimeMonitor(page);
  const remoteRequests = createRemoteRequestMonitor(page);

  await assertRoute(page, "musicmap/", "#reference-footer");
  await assertLocalScriptSources(
    page,
    ["./musicmap-embed-gate.js", "./main.bundle.js", "../shared/public-footer.js"],
    "musicmap route",
  );
  await page.waitForFunction(() => {
    return Boolean(document.querySelector("#musicmap")) &&
      document.querySelectorAll("#genres text").length > 200 &&
      Boolean(document.querySelector("#search-toggle-button")) &&
      Boolean(document.querySelector("#zoom-in")) &&
      Boolean(document.querySelector("#zoom-out"));
  }, null, { timeout: 30000 });
  assert(
    fs.existsSync(path.join(rootDir, "musicmap", "master-genrelist.json")),
    "musicmap route is missing the vendored master-genrelist.json payload",
  );
  await assertOnlyAllowedRemoteRequests(remoteRequests.snapshot(), [], "musicmap route before playback");
  console.log("OK musicmap local graph shell");

  await openMusicmapGenreFromSearch(page, "shoegaze", 1);
  const genreState = await page.evaluate(() => ({
    resultsTitle: (document.querySelector("#search-results-title")?.textContent || "").trim(),
    genreName: (document.querySelector("#right-side-pane-genre-name")?.textContent || "").trim(),
    songCount: document.querySelectorAll("#right-side-pane-songlist a").length,
    youtubeHref: document.querySelector("#youtube-playlist-link")?.getAttribute("href") || "",
    spotifyHref: document.querySelector("#spotify-playlist-link")?.getAttribute("href") || "",
  }));
  assert(/matches found/i.test(genreState.resultsTitle), "musicmap route did not expose search results");
  assert(genreState.genreName === "DREAM POP & SHOEGAZE", `musicmap route opened the wrong genre pane: ${genreState.genreName || "none"}`);
  assert(genreState.songCount > 0, "musicmap route did not populate the genre song list");
  assert(/^https:\/\/www\.youtube\.com\/playlist\?list=/.test(genreState.youtubeHref), "musicmap route did not wire the YouTube playlist link");
  assert(/^https:\/\/open\.spotify\.com\/playlist\//.test(genreState.spotifyHref), "musicmap route did not wire the Spotify playlist link");
  console.log("OK musicmap search and genre pane");

  const zoomBefore = await page.evaluate(() => {
    const zoom = document.querySelector("#musicmap")?.__zoom;
    return zoom ? { x: zoom.x, y: zoom.y, k: zoom.k } : null;
  });
  await page.click("#right-side-pane-go-to-link", { force: true });
  await page.waitForFunction((previousScale) => {
    const zoom = document.querySelector("#musicmap")?.__zoom;
    return Boolean(zoom) && zoom.k > previousScale;
  }, zoomBefore?.k || 1, { timeout: 10000 });
  const zoomAfter = await page.evaluate(() => {
    const zoom = document.querySelector("#musicmap")?.__zoom;
    return zoom ? { x: zoom.x, y: zoom.y, k: zoom.k } : null;
  });
  assert((zoomAfter?.k || 1) > (zoomBefore?.k || 1), "musicmap route did not zoom into the selected genre");
  console.log("OK musicmap zoom and pan path");

  const remoteBeforeYouTubeEmbed = remoteRequests.snapshot().length;
  await page.click(youtubeAction.selector, { force: true });
  await page.waitForFunction(() => {
    return /youtube-nocookie\.com\/embed\/videoseries/.test(
      document.querySelector("#youtube-player-iframe iframe")?.getAttribute("src") || "",
    );
  }, null, { timeout: 10000 });
  const embedState = await page.evaluate(() => ({
    iframeSrc: document.querySelector("#youtube-player-iframe iframe")?.getAttribute("src") || "",
    iframeCount: document.querySelectorAll("#youtube-player-iframe iframe").length,
  }));
  assert(embedState.iframeCount === 1, "musicmap route did not create a single deferred embed frame");
  assert(
    /^https:\/\/www\.youtube-nocookie\.com\/embed\/videoseries/.test(embedState.iframeSrc),
    `musicmap route created an unexpected embed: ${embedState.iframeSrc || "none"}`,
  );
  assertOnlyAllowedRemoteRequests(
    remoteRequests.diff(remoteBeforeYouTubeEmbed),
    youtubeAction.hosts,
    "musicmap route after deferred YouTube embed",
  );
  console.log("OK musicmap deferred YouTube playback surface");

  await page.evaluate(() => {
    const embedContainer = document.querySelector("#youtube-player-iframe");
    if (embedContainer) {
      embedContainer.innerHTML = "";
    }
  });
  await page.waitForTimeout(1000);
  const remoteBeforeSpotifyEmbed = remoteRequests.snapshot().length;
  await page.click(spotifyAction.selector, { force: true });
  await page.waitForFunction(() => {
    return /open\.spotify\.com\/embed\/playlist/.test(
      document.querySelector("#youtube-player-iframe iframe")?.getAttribute("src") || "",
    );
  }, null, { timeout: 10000 });
  const spotifyEmbedState = await page.evaluate(() => ({
    iframeSrc: document.querySelector("#youtube-player-iframe iframe")?.getAttribute("src") || "",
    iframeCount: document.querySelectorAll("#youtube-player-iframe iframe").length,
  }));
  assert(spotifyEmbedState.iframeCount === 1, "musicmap route did not replace the embed host with a single Spotify frame");
  assert(
    /^https:\/\/open\.spotify\.com\/embed\/playlist/.test(spotifyEmbedState.iframeSrc),
    `musicmap route created an unexpected Spotify embed: ${spotifyEmbedState.iframeSrc || "none"}`,
  );
  assertOnlyAllowedRemoteRequests(
    remoteRequests.diff(remoteBeforeSpotifyEmbed),
    spotifyAction.hosts,
    "musicmap route after deferred Spotify embed",
  );
  console.log("OK musicmap deferred Spotify playback surface");

  await assertViewportUsable(page, "musicmap route");
  await assertRouteViewportUsable(
    context,
    "musicmap/",
    "#reference-footer",
    "#search-toggle-button",
    "musicmap route",
    390,
    844,
  );
  await page.waitForTimeout(250);
  assertPageRuntimeClean("musicmap route");
  console.log("OK musicmap responsive shell");
  await page.close();
}

async function smokeWayfinding(context) {
  const page = await context.newPage();
  await assertRoute(page, "trust/", "#top-bar");
  const ordinaryLinks = await page.evaluate(() => ({
    atlas: document.querySelector(".top-bar__back")?.href || "",
    docs: document.querySelector(".top-bar__docs")?.href || "",
  }));
  assert(new URL(ordinaryLinks.atlas).pathname === `${mountPath}index.html`, `trust exposed an unexpected Atlas exit: ${ordinaryLinks.atlas}`);
  assert(new URL(ordinaryLinks.docs).pathname === `${mountPath}docs/trust/`, `trust exposed an unexpected Docs exit: ${ordinaryLinks.docs}`);
  await assertViewportUsable(page, "trust wayfinding");

  await assertRoute(page, "formula-1-racing/", "[data-story-wayfinding='docs']");
  const sandboxLinks = await page.evaluate(() => ({
    atlas: document.querySelector("[data-story-wayfinding='atlas']")?.href || "",
    docs: document.querySelector("[data-story-wayfinding='docs']")?.href || "",
    topBarAtlas: document.querySelector(".top-bar__back")?.href || "",
    topBarDocs: document.querySelector(".top-bar__docs")?.href || "",
  }));
  assert(new URL(sandboxLinks.topBarAtlas).pathname === `${mountPath}index.html`, `formula-1-racing top bar exposed an unexpected Atlas exit: ${sandboxLinks.topBarAtlas}`);
  assert(new URL(sandboxLinks.topBarDocs).pathname === `${mountPath}docs/formula-1-racing/`, `formula-1-racing top bar exposed an unexpected Docs exit: ${sandboxLinks.topBarDocs}`);
  assert(new URL(sandboxLinks.atlas).pathname === mountPath, `formula-1-racing exposed an unexpected Atlas exit: ${sandboxLinks.atlas}`);
  assert(new URL(sandboxLinks.docs).pathname === `${mountPath}docs/formula-1-racing/`, `formula-1-racing exposed an unexpected Docs exit: ${sandboxLinks.docs}`);
  await assertViewportUsable(page, "formula-1-racing wayfinding");

  await assertRoute(page, "anxiety/sharing/", "#top-bar");
  const nestedDocs = await page.locator(".top-bar__docs").getAttribute("href");
  assert(new URL(nestedDocs, page.url()).pathname === `${mountPath}docs/anxiety/`, `nested route exposed an unexpected Docs exit: ${nestedDocs}`);

  await page.addInitScript(() => localStorage.setItem("theme", "dark"));
  await assertRoute(page, "docs/trust/", ".back-link");
  const docsState = await page.evaluate(() => ({
    label: document.querySelector(".back-link")?.textContent?.trim() || "",
    atlas: document.querySelector(".back-link")?.href || "",
    route: document.querySelector(".action-link")?.href || "",
    theme: document.documentElement.getAttribute("saved-theme") || "",
    canonical: document.querySelector('link[rel="canonical"]')?.href || "",
    ogUrl: document.querySelector('meta[property="og:url"]')?.content || "",
    robots: document.querySelector('meta[name="robots"]')?.content || "",
    description: document.querySelector('meta[name="description"]')?.content || "",
    ogTitle: document.querySelector('meta[property="og:title"]')?.content || "",
    ogDescription: document.querySelector('meta[property="og:description"]')?.content || "",
    ogType: document.querySelector('meta[property="og:type"]')?.content || "",
    title: document.title,
  }));
  const docsUrl = "https://kohnnn.github.io/interactive-explanation/docs/trust/";
  assert(docsState.label === "Back to Atlas", `docs exposed an unexpected Atlas label: ${docsState.label}`);
  assert(new URL(docsState.atlas).pathname === mountPath, `docs exposed an unexpected Atlas exit: ${docsState.atlas}`);
  assert(new URL(docsState.route).pathname === `${mountPath}trust/`, `docs exposed an unexpected route exit: ${docsState.route}`);
  assert(docsState.theme === "dark", `docs did not apply the stored theme before rendering: ${docsState.theme}`);
  assert(docsState.canonical === docsUrl && docsState.ogUrl === docsUrl, "docs production URL metadata did not match");
  assert(docsState.robots === "noindex,follow", `docs exposed an unexpected robots policy: ${docsState.robots}`);
  assert(docsState.ogTitle === docsState.title, "docs social title did not match its page title");
  assert(docsState.ogDescription === docsState.description, "docs social description did not match its page description");
  assert(docsState.ogType === "website", `docs exposed an unexpected social type: ${docsState.ogType}`);
  await page.close();
}

async function assertAtlasContinuations(page, selector, label) {
  const expectedBySlug = Object.fromEntries(routeManifest.map((route) => {
    const target = routeManifestBySlug.get(route.suggestedNextSlug);
    return [route.slug, {
      title: target?.title || "",
      href: `./${target?.slug || ""}/`,
    }];
  }));
  const state = await page.locator(selector).evaluateAll((cards, expected) => cards.map((card) => {
    const slug = card.dataset.slug || "";
    const links = card.querySelectorAll("[data-page-card-continuation]");
    const link = links[0];
    return {
      slug,
      count: links.length,
      separate: Boolean(link && !link.closest("[data-page-card-actions]")),
      text: (link?.textContent || "").replace(/\s+/g, " ").trim(),
      href: link?.getAttribute("href") || "",
      target: link?.getAttribute("target"),
      rel: link?.getAttribute("rel"),
      onclick: link?.getAttribute("onclick"),
      expected: expected[slug],
    };
  }), expectedBySlug);
  assert(state.length > 0, `${label} did not render any Atlas cards`);
  state.forEach((card) => {
    assert(card.expected?.title, `${label} card ${card.slug} referenced a missing Suggested Next Route`);
    assert(card.count === 1 && card.separate, `${label} card ${card.slug} expected one separate continuation link`);
    assert(card.text === `Suggested next: ${card.expected.title}`, `${label} card ${card.slug} exposed unexpected continuation text: ${card.text}`);
    assert(card.href === card.expected.href, `${label} card ${card.slug} exposed unexpected continuation href: ${card.href}`);
    assert(card.target === null && card.rel === null && card.onclick === null, `${label} card ${card.slug} continuation was not an ordinary local link`);
  });

  const firstLink = page.locator(`${selector} [data-page-card-continuation]`).first();
  const focusState = await firstLink.evaluate((link) => {
    const progressBefore = Object.keys(window.localStorage)
      .filter((key) => key.startsWith("ie-learning-progress:v1:"))
      .sort()
      .map((key) => [key, window.localStorage.getItem(key)]);
    link.focus();
    link.addEventListener("click", (event) => event.preventDefault(), { once: true });
    link.click();
    const style = getComputedStyle(link);
    const progressAfter = Object.keys(window.localStorage)
      .filter((key) => key.startsWith("ie-learning-progress:v1:"))
      .sort()
      .map((key) => [key, window.localStorage.getItem(key)]);
    return {
      focused: document.activeElement === link,
      outlined: style.outlineStyle !== "none" && parseFloat(style.outlineWidth) > 0,
      progressUnchanged: JSON.stringify(progressAfter) === JSON.stringify(progressBefore),
    };
  });
  assert(focusState.focused && focusState.outlined, `${label} continuation did not retain visible keyboard focus`);
  assert(focusState.progressUnchanged, `${label} continuation wrote Guided Path Progress`);
}

async function smokeAtlas(context) {
  const page = await context.newPage();
  await assertRoute(page, "", "[data-page-list]");
  await page.waitForFunction(() => document.querySelectorAll("[data-page-list] [data-intent]").length > 0, null, { timeout: 15000 });
  const guidedPathCount = routeManifest.filter((route) => route.intent === "guided-path").length;
  const initialState = await page.evaluate(() => ({
    cards: document.querySelectorAll("[data-page-list] [data-intent]").length,
    controls: document.querySelectorAll("[data-atlas-intent]").length,
    guidedPaths: document.querySelectorAll("[data-guided-path-list] [data-intent='guided-path']").length,
    guidedPathsInInventory: document.querySelectorAll("[data-page-list] [data-intent='guided-path']").length,
    clearHidden: document.querySelector("[data-clear-filters]")?.hidden,
    topicOptions: document.querySelectorAll("[data-topic-select] option").length,
    routeHref: document.querySelector("[data-page-list] [data-slug='trust'] .action-link")?.getAttribute("href"),
    docsHref: document.querySelector("[data-page-list] [data-slug='trust'] .action-link.secondary")?.getAttribute("href"),
    url: window.location.search,
  }));
  assert(initialState.controls === 6, `atlas expected All plus five intent buttons, found ${initialState.controls}`);
  assert(initialState.cards === routeManifest.length, `atlas expected ${routeManifest.length} initial cards, found ${initialState.cards}`);
  assert(initialState.guidedPaths === guidedPathCount, `atlas expected ${guidedPathCount} promoted guided paths, found ${initialState.guidedPaths}`);
  assert(initialState.guidedPathsInInventory === guidedPathCount, "atlas promotion removed guided paths from the complete inventory");
  assert(initialState.topicOptions > 1, "atlas topic selector did not load manifest topics");
  assert(initialState.routeHref === "./trust/", `atlas exposed unexpected route href: ${initialState.routeHref}`);
  assert(initialState.docsHref === "./docs/trust/", `atlas exposed unexpected docs href: ${initialState.docsHref}`);
  assert(initialState.clearHidden, "atlas clear filters control was visible without active filters");
  assert(initialState.url === "", `atlas exposed default URL state: ${initialState.url}`);
  await assertAtlasContinuations(page, "[data-page-list] [data-slug]", "atlas inventory");
  await assertAtlasContinuations(page, "[data-guided-path-list] [data-slug]", "atlas Guided Paths");

  await page.locator("[data-atlas-intent='guided-path']").focus();
  await page.keyboard.press("Enter");
  await page.waitForFunction(() => {
    const cards = Array.from(document.querySelectorAll("[data-page-list] [data-intent]"));
    return cards.length > 0 && cards.every((card) => card.dataset.intent === "guided-path");
  }, null, { timeout: 5000 });
  assert(new URLSearchParams(await page.evaluate(() => window.location.search)).get("intent") === "guided-path", "atlas did not sync keyboard intent state to the URL");

  await page.selectOption("[data-topic-select]", "music");
  await page.waitForFunction(() => {
    const cards = Array.from(document.querySelectorAll("[data-page-list] [data-topics]"));
    return cards.length > 0 && cards.every((card) => card.dataset.topics.split(" ").includes("music"));
  }, null, { timeout: 5000 });
  const topicState = await page.evaluate(() => ({
    summary: document.querySelector("[data-page-results]")?.textContent || "",
    topic: new URLSearchParams(window.location.search).get("topic"),
    clearVisible: !document.querySelector("[data-clear-filters]")?.hidden,
  }));
  assert(topicState.topic === "music", "atlas did not sync topic state to the URL");
  assert(topicState.summary.includes("Topic: Music."), `atlas summary omitted the active topic: ${topicState.summary}`);
  assert(topicState.clearVisible, "atlas clear filters control did not become visible after filtering");
  await assertAtlasContinuations(page, "[data-page-list] [data-slug]", "filtered Atlas inventory");

  await page.goBack({ waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.querySelector("[data-topic-select]")?.value === "all");
  assert(await page.locator("[data-atlas-intent='guided-path']").getAttribute("aria-pressed") === "true", "atlas Back did not restore the prior intent state");
  await page.goForward({ waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.querySelector("[data-topic-select]")?.value === "music");
  assert(await page.locator("[data-atlas-intent='guided-path']").getAttribute("aria-pressed") === "true", "atlas Forward did not restore combined filters");
  await assertAtlasContinuations(page, "[data-page-list] [data-slug]", "history-restored Atlas inventory");

  await page.locator("[data-clear-filters]").click();
  await page.waitForFunction((total) => document.querySelectorAll("[data-page-list] [data-intent]").length === total, routeManifest.length, { timeout: 5000 });
  const resetState = await page.evaluate(() => ({
    clearHidden: document.querySelector("[data-clear-filters]")?.hidden,
    url: window.location.search,
  }));
  assert(resetState.clearHidden, "atlas clear filters control remained visible after reset");
  assert(resetState.url === "", `atlas retained URL state after reset: ${resetState.url}`);
  await assertAtlasContinuations(page, "[data-page-list] [data-slug]", "reset Atlas inventory");

  await page.goto(new URL("?intent=explainer&topic=machine-learning&sort=title", baseUrl).href, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => {
    const cards = Array.from(document.querySelectorAll("[data-page-list] [data-intent]"));
    return document.querySelector("[data-topic-select]")?.value === "machine-learning" && cards.length > 0 && cards.every((card) => card.dataset.intent === "explainer" && card.dataset.topics.split(" ").includes("machine-learning"));
  }, null, { timeout: 15000 });
  assert(await page.locator("[data-sort-select]").inputValue() === "title", "atlas did not restore sort state from the URL");
  await assertViewportUsable(page, "atlas desktop");
  await page.setViewportSize({ width: 390, height: 844 });
  assert(await page.locator("[data-guided-path-list]").isVisible(), "atlas guided paths were hidden on mobile");
  assert(await page.locator("[data-topic-select]").isVisible(), "atlas topic selector was hidden on mobile");
  await assertViewportUsable(page, "atlas mobile");
  await page.close();
}

async function smokeMusicInteractiveHub(context) {
  const page = await context.newPage();
  const assertPageRuntimeClean = createRuntimeMonitor(page);

  await assertRoute(page, "music-interactive-hub/", "#reference-footer");
  await page.waitForFunction(() => {
    return document.querySelectorAll("[data-music-card]").length === 21 &&
      document.querySelectorAll("[data-recommended-path] li").length === 5;
  }, null, { timeout: 15000 });

  const hubState = await page.evaluate(() => ({
    cardCount: document.querySelectorAll("[data-music-card]").length,
    docsLinks: document.querySelectorAll("[data-music-card] a[data-link-kind='docs']").length,
    routeLinks: document.querySelectorAll("[data-music-card] a[data-link-kind='route']").length,
    clusterCounts: Array.from(document.querySelectorAll("[data-cluster-count]")).map((node) => node.textContent?.trim() || ""),
    localOnlyLinks: Array.from(document.querySelectorAll("main[data-music-hub] a[href]")).every((node) => {
      const href = node.getAttribute("href") || "";
      return href.startsWith("../") || href.startsWith("./#") || href === "../";
    }),
    recommendedPathVisible: Boolean(document.querySelector("[data-recommended-path]")),
    recommendedPathCount: document.querySelectorAll("[data-recommended-path] li").length,
    recommendedPathBadge: document.querySelector("[data-path-count]")?.textContent?.trim() || "",
  }));
  assert(hubState.cardCount === 21, `music-interactive-hub route expected 21 route cards, found ${hubState.cardCount}`);
  assert(hubState.routeLinks === 21, "music-interactive-hub route did not expose one local route link per card");
  assert(hubState.docsLinks === 21, "music-interactive-hub route did not expose one local docs link per card");
  assert(
    hubState.clusterCounts.join("|") === "6 routes|8 routes|6 routes|1 route",
    `music-interactive-hub route exposed unexpected cluster counts: ${hubState.clusterCounts.join(", ")}`,
  );
  assert(hubState.localOnlyLinks, "music-interactive-hub route exposed a non-local body link");
  assert(hubState.recommendedPathVisible, "music-interactive-hub route did not render the recommended progression");
  assert(hubState.recommendedPathCount === 5, `music-interactive-hub route expected 5 starter stops, found ${hubState.recommendedPathCount}`);
  assert(hubState.recommendedPathBadge === "5 stops", `music-interactive-hub route exposed unexpected path badge: ${hubState.recommendedPathBadge}`);
  console.log("OK music-interactive-hub card clusters");

  await assertLearningPathControls(
    context,
    "music-interactive-hub/",
    "music-interactive-hub",
    5,
    3,
  );
  console.log("OK music-interactive-hub progress and sharing");

  await assertViewportUsable(page, "music-interactive-hub route");
  await assertRouteViewportUsable(
    context,
    "music-interactive-hub/",
    "#reference-footer",
    "[data-recommended-path]",
    "music-interactive-hub route",
    390,
    844,
  );
  await page.waitForTimeout(250);
  assertPageRuntimeClean("music-interactive-hub route");
  console.log("OK music-interactive-hub responsive shell");
  await page.close();
}

async function smokeMemoryAllocation(context) {
  const page = await context.newPage();
  const assertPageRuntimeClean = createRuntimeMonitor(page);
  await assertRoute(page, "memory-allocation/", "#reference-footer");
  await assertEngineeringSandboxShell(page, "memory-allocation route", {
    minimumChapters: 8,
    navMode: "generated",
    expectedFamily: "samwho-essay",
    expectedRoute: "memory-allocation",
  });
  await assertLocalScriptSources(
    page,
    ["./js/gsap/gsap.min.js", "./js/gsap/PixiPlugin.min.js", "./js/memory-allocation.js"],
    "memory-allocation route",
  );
  await page.waitForFunction(() => {
    return document.querySelectorAll(".memory canvas").length >= 10 &&
      Boolean(document.querySelector("#hexadecimal-slider")) &&
      Boolean(document.querySelector("#segmented-1 input[type='range']"));
  }, null, { timeout: 30000 });
  const hydrationState = await page.evaluate(() => ({
    canvases: document.querySelectorAll(".memory canvas").length,
    hasHexSlider: Boolean(document.querySelector("#hexadecimal-slider")),
    hasSegmentedSlider: Boolean(document.querySelector("#segmented-1 input[type='range']")),
  }));
  assert(hydrationState.canvases >= 10, "memory-allocation did not hydrate the expected canvas scenes");
  assert(hydrationState.hasHexSlider, "memory-allocation did not render the hexadecimal slider");
  assert(hydrationState.hasSegmentedSlider, "memory-allocation did not hydrate the segmented allocator scene");

  const assetState = await page.evaluate(() => {
    return performance.getEntriesByType("resource").map((entry) => entry.name);
  });
  for (const assetPath of [
    "/memory-allocation/js/allocators/stack.js",
    "/memory-allocation/js/allocators/freelist.js",
    "/memory-allocation/js/allocators/segmented-freelist.js",
    "/memory-allocation/js/allocators/inline.js",
  ]) {
    assert(
      assetState.some((entry) => entry.includes(assetPath)),
      `memory-allocation did not load ${assetPath} from local assets`,
    );
  }
  console.log("OK memory-allocation local assets");

  const allocatorBefore = await page.evaluate(() => {
    const canvas = document.querySelector("#segmented-1 canvas");
    return canvas ? canvas.toDataURL() : "";
  });
  assert(allocatorBefore, "memory-allocation did not expose the segmented allocator canvas");
  await setRangeValue(page, "#segmented-1 input[type='range']", 0.75);
  await page.waitForFunction((previous) => {
    const canvas = document.querySelector("#segmented-1 canvas");
    return canvas && canvas.toDataURL() !== previous;
  }, allocatorBefore, { timeout: 5000 });
  console.log("OK memory-allocation allocator timeline");

  const hexBefore = await page.evaluate(() => ({
    decimal: document.querySelector("#decimal")?.textContent || "",
    hexadecimal: document.querySelector("#hexadecimal")?.textContent || "",
  }));
  await setRangeValue(page, "#hexadecimal-slider", 26);
  await page.waitForFunction((previous) => {
    const decimal = document.querySelector("#decimal")?.textContent || "";
    const hexadecimal = document.querySelector("#hexadecimal")?.textContent || "";
    return decimal !== previous.decimal &&
      hexadecimal !== previous.hexadecimal &&
      decimal.trim() === "26" &&
      hexadecimal.trim() === "0x1a";
  }, hexBefore, { timeout: 5000 });
  console.log("OK memory-allocation hexadecimal slider");

  await assertViewportUsable(page, "memory-allocation route");
  await assertRouteViewportUsable(
    context,
    "memory-allocation/",
    "#reference-footer",
    ".memory canvas",
    "memory-allocation route",
    390,
    844,
  );
  await page.waitForTimeout(250);
  assertPageRuntimeClean("memory-allocation route");
  await assertEngineeringSandboxLayout(context, "memory-allocation/", "memory-allocation route", { navMode: "generated" });
  console.log("OK memory-allocation responsive shell");
  await page.close();
}

async function smokeLoadBalancing(context) {
  const page = await context.newPage();
  const assertPageRuntimeClean = createRuntimeMonitor(page);
  await assertRoute(page, "load-balancing/", "#reference-footer");
  await assertEngineeringSandboxShell(page, "load-balancing route", {
    minimumChapters: 7,
    navMode: "generated",
    expectedFamily: "samwho-essay",
    expectedRoute: "load-balancing",
  });
  await assertLocalScriptSources(page, ["./js/load-balancers.js"], "load-balancing route");
  await page.waitForFunction(() => {
    const playground = window.__loadBalancingSimulationById?.fin;
    const graph = document.querySelector("#graph-medians .js-plotly-plot, #graph-medians .plotly, #graph-medians svg");
    return Boolean(playground) &&
      document.querySelector('[id="1"] canvas') &&
      document.querySelector("#fin canvas") &&
      graph &&
      document.querySelector("#fin select") &&
      document.querySelectorAll("#fin input[type='range']").length >= 5;
  }, null, { timeout: 30000 });

  const assetState = await page.evaluate(() => {
    return performance.getEntriesByType("resource").map((entry) => entry.name);
  });
  for (const assetPath of [
    "/load-balancing/js/pixi.mjs",
    "/load-balancing/js/plotly.js",
  ]) {
    assert(
      assetState.some((entry) => entry.includes(assetPath)),
      `load-balancing did not load ${assetPath} from local assets`,
    );
  }
  console.log("OK load-balancing local assets");

  const initialState = await page.evaluate(() => {
    const playground = window.__loadBalancingSimulationById?.fin;
    return {
      algorithm: playground?.loadBalancer?.algorithm?.constructor?.name || "",
      servers: playground?.loadBalancer?.servers?.length || 0,
      rps: playground?.loadBalancer?.rps || 0,
    };
  });
  assert(initialState.servers >= 1, "load-balancing did not expose the final playground simulation");

  await setSelectControlByLabel(page, "#fin > div", "Algorithm", "random");
  await setRangeControlByLabel(page, "#fin > div", "Num Servers", 4);
  await setRangeControlByLabel(page, "#fin > div", "RPS", 7);
  await page.waitForFunction((previous) => {
    const playground = window.__loadBalancingSimulationById?.fin;
    return playground &&
      playground.loadBalancer.algorithm.constructor.name !== previous.algorithm &&
      playground.loadBalancer.algorithm.constructor.name === "RandomAlgorithm" &&
      playground.loadBalancer.servers.length === 4 &&
      playground.loadBalancer.rps === 7;
  }, initialState, { timeout: 5000 });
  console.log("OK load-balancing playground controls");

  await assertViewportUsable(page, "load-balancing route");
  await assertRouteViewportUsable(
    context,
    "load-balancing/",
    "#reference-footer",
    '[id="1"] canvas',
    "load-balancing route",
    390,
    844,
  );
  await page.waitForTimeout(250);
  assertPageRuntimeClean("load-balancing route");
  await assertEngineeringSandboxLayout(context, "load-balancing/", "load-balancing route", { navMode: "generated" });
  console.log("OK load-balancing responsive shell");
  await page.close();
}

async function smokeHysteresisSlack(context) {
  const page = await context.newPage();
  const assertPageRuntimeClean = createRuntimeMonitor(page);
  await assertRoute(page, "hysteresis-slack/", "#reference-footer");
  await assertEngineeringSandboxShell(page, "hysteresis-slack route", {
    minimumChapters: 3,
    navMode: "generated",
    expectedFamily: "systems-essay",
    expectedRoute: "hysteresis-slack",
  });
  await assertLocalScriptSources(page, ["./build/bundle.js"], "hysteresis-slack route");
  await page.waitForFunction(() => {
    return document.querySelectorAll("#slider2 circle").length >= 2 &&
      (document.querySelector("#chart2")?.innerHTML || "").length > 100 &&
      document.querySelectorAll("#timeline path").length >= 3;
  }, null, { timeout: 15000 });

  const assetState = await page.evaluate(() => {
    return performance.getEntriesByType("resource").map((entry) => entry.name);
  });
  for (const assetPath of [
    "/hysteresis-slack/bootstrap.css",
    "/hysteresis-slack/build/bundle.js",
    "/hysteresis-slack/images/hyloop.gif",
  ]) {
    assert(
      assetState.some((entry) => entry.includes(assetPath)),
      `hysteresis-slack did not load ${assetPath} from local assets`,
    );
  }
  console.log("OK hysteresis-slack local assets");

  const chartBefore = await page.locator("#chart2").evaluate((element) => element.innerHTML);
  await dragKnob(page, "#slider2 circle", 50, 0, "hysteresis-slack route");
  await page.waitForFunction((previous) => {
    return (document.querySelector("#chart2")?.innerHTML || "") !== previous;
  }, chartBefore, { timeout: 5000 });
  console.log("OK hysteresis-slack slack slider");

  await assertViewportUsable(page, "hysteresis-slack route");
  await assertRouteViewportUsable(
    context,
    "hysteresis-slack/",
    "#reference-footer",
    "#slider2 circle",
    "hysteresis-slack route",
    390,
    844,
  );
  await page.waitForTimeout(250);
  assertPageRuntimeClean("hysteresis-slack route");
  await assertEngineeringSandboxLayout(context, "hysteresis-slack/", "hysteresis-slack route", { navMode: "generated" });
  console.log("OK hysteresis-slack responsive shell");
  await page.close();
}

async function smokeRigidBodyCollisions(context) {
  const page = await context.newPage();
  const assertPageRuntimeClean = createRuntimeMonitor(page);
  await assertRoute(page, "rigid-body-collisions/", "#reference-footer");
  await assertEngineeringSandboxShell(page, "rigid-body-collisions route", {
    minimumChapters: 4,
    navMode: "generated",
    expectedFamily: "systems-essay",
    expectedRoute: "rigid-body-collisions",
  });
  await assertLocalScriptSources(page, ["./_nuxt/D4VqJVMa.js"], "rigid-body-collisions route");
  await page.waitForFunction(() => {
    return document.querySelector("canvas#c") &&
      document.querySelectorAll("input[type='range']").length >= 4 &&
      document.querySelectorAll("button").length >= 4 &&
      Array.from(document.querySelectorAll("h1")).every((node) => (node.textContent || "").trim() !== "404") &&
      !/404 - Page not found:/i.test(document.title);
  }, null, { timeout: 30000 });

  const assetState = await page.evaluate(() => {
    return performance.getEntriesByType("resource").map((entry) => entry.name);
  });
  assert(
    assetState.some((entry) => /\/rigid-body-collisions\/_nuxt\/[^/]+\.css(?:$|\?)/.test(entry)),
    "rigid-body-collisions did not load any local Nuxt CSS asset",
  );
  console.log("OK rigid-body-collisions local assets");

  const firstRange = page.locator("input[type='range']").first();
  const rangeBefore = await firstRange.inputValue();
  await firstRange.evaluate((element, value) => {
    element.value = String(value);
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  }, 10);
  await page.waitForFunction((previous) => {
    const firstRange = document.querySelector("input[type='range']");
    return firstRange &&
      firstRange.value !== previous &&
      document.querySelector("canvas#c") &&
      Array.from(document.querySelectorAll("h1")).every((node) => (node.textContent || "").trim() !== "404");
  }, rangeBefore, { timeout: 5000 });
  console.log("OK rigid-body-collisions control surface");

  await assertViewportUsable(page, "rigid-body-collisions route");
  await assertRouteViewportUsable(
    context,
    "rigid-body-collisions/",
    "#reference-footer",
    "canvas#c",
    "rigid-body-collisions route",
    390,
    844,
  );
  await page.waitForTimeout(250);
  assertPageRuntimeClean("rigid-body-collisions route");
  await assertEngineeringSandboxLayout(context, "rigid-body-collisions/", "rigid-body-collisions route", {
    navMode: "generated",
    readySelector: ".story-hero",
  });
  console.log("OK rigid-body-collisions responsive shell");
  await page.close();
}

async function smokeBlockchain101CombinedFlow(context) {
  const page = await context.newPage();
  const assertPageRuntimeClean = createRuntimeMonitor(page);
  await assertRoute(page, "blockchain-101-combined-flow/", "#reference-footer");
  await assertEngineeringSandboxShell(page, "blockchain-101-combined-flow route", {
    minimumChapters: 0,
    navMode: "none",
    minimumNativeLinks: 0,
    expectedFamily: "anders-lab",
    expectedRoute: "blockchain-101-combined-flow",
    expectedVariant: "lab",
  });
  await page.waitForFunction(() => {
    return document.querySelector("#chapter-hash") &&
      document.querySelector("#chapter-signatures") &&
      document.querySelector("#chapter-zkp") &&
      document.querySelectorAll(".chapter-card").length === 3;
  }, null, { timeout: 15000 });

  const hrefs = await page.evaluate(() => {
    return Array.from(document.querySelectorAll("a[href]")).map((node) => node.getAttribute("href") || "");
  });
  for (const expectedHref of [
    "../blockchain/",
    "../blockchain/distributed.html",
    "../public-private-keys/",
    "../public-private-keys/signatures/",
    "../public-private-keys/transaction/",
    "../zero-knowledge-proof-demo/",
  ]) {
    assert(
      hrefs.includes(expectedHref),
      `blockchain-101-combined-flow is missing local link ${expectedHref}`,
    );
  }
  console.log("OK blockchain-101-combined-flow local chapter links");

  await page.locator("[data-learning-start]").click();
  await page.waitForTimeout(250);
  const hashAnchorVisible = await page.locator("#chapter-hash").isVisible();
  assert(hashAnchorVisible, "blockchain-101-combined-flow chapter anchor navigation failed");
  console.log("OK blockchain-101-combined-flow chapter anchor");

  await assertLearningPathControls(
    context,
    "blockchain-101-combined-flow/",
    "blockchain-101-combined-flow",
    3,
    2,
  );
  console.log("OK blockchain-101-combined-flow progress and sharing");

  await assertEngineeringSandboxLayout(context, "blockchain-101-combined-flow/", "blockchain-101-combined-flow route", {
    navMode: "none",
    controlSelector: "#chapter-hash",
    containerSelector: ".site-page",
  });
  await assertViewportUsable(page, "blockchain-101-combined-flow route");
  await assertRouteViewportUsable(
    context,
    "blockchain-101-combined-flow/",
    "#reference-footer",
    "#chapter-hash",
    "blockchain-101-combined-flow route",
    390,
    844,
  );
  assertPageRuntimeClean("blockchain-101-combined-flow route");
  console.log("OK blockchain-101-combined-flow responsive shell");
  await page.close();
}

async function smokePrimaryInteractiveHub(context) {
  const page = await context.newPage();
  const assertPageRuntimeClean = createRuntimeMonitor(page);
  await page.addInitScript(() => {
    window.__primaryLearningProgressWrites = [];
    const setItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function primaryProgressSetItem(key, value) {
      if (String(key).startsWith("ie-learning-progress:")) {
        window.__primaryLearningProgressWrites.push(String(key));
      }
      return setItem.call(this, key, value);
    };
  });
  await assertRoute(page, "primary-interactive-hub/", "#reference-footer");
  await page.waitForFunction(() => {
    return document.querySelector("#systems-cluster") &&
      document.querySelector("#stories-cluster") &&
      document.querySelector("#playgrounds-cluster") &&
      document.querySelectorAll(".route-card").length >= 12;
  }, null, { timeout: 15000 });

  const hubState = await page.evaluate(() => {
    const hrefs = Array.from(document.querySelectorAll(".route-card a[href]"))
      .map((node) => node.getAttribute("href") || "");
    const progressChrome = document.querySelectorAll([
      ".story-rail__meta",
      ".story-mobile-bar__status",
      ".story-mobile-sheet__status",
      ".story-progress",
      ".story-progress__value",
    ].join(", "));
    return {
      hrefs,
      countText: document.querySelector("[data-hub-count]")?.textContent || "",
      hasProgressContract: Boolean(
        document.body.dataset.learningProgressSlug ||
        document.body.dataset.learningStepCount ||
        document.querySelector("[data-learning-start], [data-learning-resume], [data-learning-step], [data-learning-progress-status]"),
      ),
      progressChromeHidden: Array.from(progressChrome).every((node) => getComputedStyle(node).display === "none"),
      progressWrites: window.__primaryLearningProgressWrites || [],
    };
  });
  for (const expectedHref of [
    "../trust/",
    "../docs/trust/",
    "../anxiety/",
    "../coming-out-simulator-2014/",
    "../loopy/",
    "../simulating/",
    "../sim/",
  ]) {
    assert(
      hubState.hrefs.includes(expectedHref),
      `primary-interactive-hub is missing local link ${expectedHref}`,
    );
  }
  assert(/12 local routes/i.test(hubState.countText), "primary-interactive-hub count summary did not render");
  assert(!hubState.hasProgressContract, "primary-interactive-hub incorrectly exposed a strict Progress contract");
  assert(hubState.progressChromeHidden, "primary-interactive-hub exposed numbered or Progress chapter chrome");
  assert(hubState.progressWrites.length === 0, "primary-interactive-hub wrote Progress while mounting");
  console.log("OK primary-interactive-hub local route grid and unnumbered navigation");

  await page.locator("a[href='./#stories-cluster']").click();
  await page.waitForTimeout(250);
  const storiesState = await page.evaluate(() => ({
    visible: Boolean(document.querySelector("#stories-cluster")?.getClientRects().length),
    progressWrites: window.__primaryLearningProgressWrites || [],
  }));
  assert(storiesState.visible, "primary-interactive-hub cluster anchor navigation failed");
  assert(storiesState.progressWrites.length === 0, "primary-interactive-hub wrote Progress while navigating");
  console.log("OK primary-interactive-hub cluster anchor without Progress");

  await assertViewportUsable(page, "primary-interactive-hub route");
  await assertRouteViewportUsable(
    context,
    "primary-interactive-hub/",
    "#reference-footer",
    "#systems-cluster",
    "primary-interactive-hub route",
    390,
    844,
  );
  assertPageRuntimeClean("primary-interactive-hub route");
  console.log("OK primary-interactive-hub responsive shell");
  await page.close();
}

async function smokeLinearRegression(context) {
  const page = await context.newPage();
  const assertPageRuntimeClean = createRuntimeMonitor(page);
  await assertRoute(page, "linear-regression/", "#reference-footer");
  await assertEngineeringSandboxShell(page, "linear-regression route", {
    minimumChapters: 5,
    navMode: "generated",
    expectedFamily: "mlu-pilot",
    expectedRoute: "linear-regression",
  });
  await page.waitForFunction(() => {
    return document.querySelector("#scatter-chart svg") &&
      document.querySelector("#input-container input[type='range']") &&
      document.querySelector("#mse-container #bias-slider input[type='range']") &&
      document.querySelector("#mse-container #weight-slider input[type='range']") &&
      document.querySelector("#gd-container button");
  }, null, { timeout: 30000 });

  const probeBefore = await page.evaluate(() => {
    const chart = document.querySelector("#scatter-chart");
    const probeCircle = Array.from(chart?.querySelectorAll("circle") || [])
      .find((node) => Number(node.getAttribute("r") || 0) > 7);
    return {
      label: document.querySelector("#input-container")?.innerText || "",
      probeCx: probeCircle?.getAttribute("cx") || "",
    };
  });
  await setRangeValue(page, "#input-container input[type='range']", 700);
  await page.waitForFunction((previous) => {
    const chart = document.querySelector("#scatter-chart");
    const probeCircle = Array.from(chart?.querySelectorAll("circle") || [])
      .find((node) => Number(node.getAttribute("r") || 0) > 7);
    const label = document.querySelector("#input-container")?.innerText || "";
    return label !== previous.label &&
      /700/.test(label) &&
      (probeCircle?.getAttribute("cx") || "") !== previous.probeCx;
  }, probeBefore, { timeout: 5000 });
  console.log("OK linear-regression prediction probe");

  await page.locator("#mse-container").scrollIntoViewIfNeeded();
  const mseBefore = await page.evaluate(() => ({
    text: document.querySelector("#mse-container")?.innerText || "",
    path: document.querySelector("#mse-chart-regression path")?.getAttribute("d") || "",
  }));
  await setRangeValue(page, "#mse-container #bias-slider input[type='range']", 10);
  await setRangeValue(page, "#mse-container #weight-slider input[type='range']", 0.5);
  await page.waitForFunction((previous) => {
    const text = document.querySelector("#mse-container")?.innerText || "";
    const path = document.querySelector("#mse-chart-regression path")?.getAttribute("d") || "";
    return text !== previous.text &&
      path !== previous.path &&
      /10\.00/.test(text) &&
      /0\.50/.test(text) &&
      /41\.13/.test(text);
  }, mseBefore, { timeout: 5000 });
  console.log("OK linear-regression mse controls");

  await page.locator("#gd-container").scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  const gdBefore = await page.evaluate(() => ({
    text: document.querySelector("#gd-container")?.innerText || "",
  }));
  await page.locator("#gd-container button").filter({ hasText: /^25 Steps$/ }).click();
  await page.waitForTimeout(2500);
  const gdAfter = await page.evaluate(() => ({
    text: document.querySelector("#gd-container")?.innerText || "",
  }));
  assert(gdAfter.text !== gdBefore.text, "linear-regression gradient descent controls did not update the section text");
  assert(/Weight/i.test(gdAfter.text), "linear-regression gradient descent output is missing the weight readout");
  assert(/Bias/i.test(gdAfter.text), "linear-regression gradient descent output is missing the bias readout");
  assert(/0\.977/.test(gdAfter.text), "linear-regression 25-step run did not reach the expected weight readout");
  assert(/0\.234/.test(gdAfter.text), "linear-regression 25-step run did not reach the expected bias readout");
  assert(/0\.801/.test(gdAfter.text), "linear-regression 25-step run did not update the displayed error");
  await page.waitForTimeout(250);
  await assertEngineeringSandboxLayout(context, "linear-regression/", "linear-regression route", { navMode: "generated" });
  assertPageRuntimeClean("linear-regression route");
  console.log("OK linear-regression gradient descent");
  await page.close();
}

async function smokeLogisticRegression(context) {
  const page = await context.newPage();
  const assertPageRuntimeClean = createRuntimeMonitor(page);
  await assertRoute(page, "logistic-regression/", "#reference-footer");
  await assertEngineeringSandboxShell(page, "logistic-regression route", {
    minimumChapters: 5,
    navMode: "generated",
    expectedFamily: "mlu-pilot",
    expectedRoute: "logistic-regression",
  });
  await page.waitForFunction(() => {
    return document.querySelector("#tempSlider") &&
      document.querySelector("#boundarySlider") &&
      document.querySelector("#scatter-chart svg") &&
      document.querySelector("#ll-container select") &&
      document.querySelector("#ll-container #probability-slider input[type='range']") &&
      document.querySelector("#gd-container button");
  }, null, { timeout: 30000 });

  const predictionState = () => page.evaluate(() => {
    const predictionPanel = document.querySelector(".step[data-index='4']");
    const predictionMatch = predictionPanel?.innerText.match(/The prediction is a\s+([^\.\n]+)/);
    const exampleCircle = document.querySelector("#scatter-chart .example-circle");
    const boundaryGroup = document.querySelector("#scatter-chart .boundary-line")?.parentElement;
    return {
      temp: document.querySelector("#tempSlider")?.value || "",
      boundary: document.querySelector("#boundarySlider")?.value || "",
      prediction: predictionMatch?.[1]?.trim() || "",
      exampleCx: exampleCircle?.getAttribute("cx") || "",
      boundaryTransform: boundaryGroup?.getAttribute("transform") || "",
    };
  });

  const introBefore = await predictionState();
  await setRangeValue(page, "#tempSlider", 65);
  await page.waitForFunction((previous) => {
    const predictionPanel = document.querySelector(".step[data-index='4']");
    const predictionMatch = predictionPanel?.innerText.match(/The prediction is a\s+([^\.\n]+)/);
    const exampleCircle = document.querySelector("#scatter-chart .example-circle");
    return document.querySelector("#tempSlider")?.value === "65" &&
      (predictionMatch?.[1]?.trim() || "") === "Sunny Day" &&
      (exampleCircle?.getAttribute("cx") || "") !== previous.exampleCx;
  }, introBefore, { timeout: 5000 });

  const thresholdBefore = await predictionState();
  await setRangeValue(page, "#boundarySlider", 0.9);
  await page.waitForFunction((previous) => {
    const predictionPanel = document.querySelector(".step[data-index='4']");
    const predictionMatch = predictionPanel?.innerText.match(/The prediction is a\s+([^\.\n]+)/);
    const boundaryGroup = document.querySelector("#scatter-chart .boundary-line")?.parentElement;
    return document.querySelector("#boundarySlider")?.value === "0.9" &&
      (predictionMatch?.[1]?.trim() || "") === "Rainy Day" &&
      (boundaryGroup?.getAttribute("transform") || "") !== previous.boundaryTransform;
  }, thresholdBefore, { timeout: 5000 });
  console.log("OK logistic-regression threshold scene");

  await page.locator("#ll-container").scrollIntoViewIfNeeded();
  const llBefore = await page.evaluate(() => ({
    text: document.querySelector("#ll-container")?.innerText || "",
  }));
  await page.locator("#ll-container select").selectOption({ index: 1 });
  await setRangeValue(page, "#ll-container #probability-slider input[type='range']", 0.8);
  await page.waitForFunction((previous) => {
    const text = document.querySelector("#ll-container")?.innerText || "";
    return text !== previous.text &&
      /Probability:\s*0\.8/.test(text) &&
      /0\.22/.test(text);
  }, llBefore, { timeout: 5000 });
  console.log("OK logistic-regression log-loss controls");

  await page.locator("#gd-container").scrollIntoViewIfNeeded();
  const gdBefore = await page.evaluate(() => ({
    text: document.querySelector("#gd-container")?.innerText || "",
    path: document.querySelector("#gd-chart-error path")?.getAttribute("d") || "",
  }));
  await page.locator("#gd-container button").filter({ hasText: /^10 Steps$/ }).click();
  await page.waitForFunction((previous) => {
    const text = document.querySelector("#gd-container")?.innerText || "";
    const path = document.querySelector("#gd-chart-error path")?.getAttribute("d") || "";
    return text !== previous.text &&
      path !== previous.path &&
      /Weight:/i.test(text) &&
      /Bias:/i.test(text) &&
      /13\.64/.test(text);
  }, gdBefore, { timeout: 10000 });
  await page.waitForTimeout(250);
  await assertEngineeringSandboxLayout(context, "logistic-regression/", "logistic-regression route", { navMode: "generated" });
  assertPageRuntimeClean("logistic-regression route");
  console.log("OK logistic-regression gradient descent");
  await page.close();
}

async function smokePrecisionRecall(context) {
  const page = await context.newPage();
  const assertPageRuntimeClean = createRuntimeMonitor(page);
  await assertRoute(page, "precision-recall/", "#reference-footer");
  await assertEngineeringSandboxShell(page, "precision-recall route", {
    minimumChapters: 4,
    navMode: "generated",
    expectedFamily: "mlu-pilot",
    expectedRoute: "precision-recall",
  });
  await page.waitForFunction(() => {
    return document.querySelector("#heatmap-container") &&
      document.querySelector("#f1-container") &&
      document.querySelector("#error-chart") &&
      document.querySelector("#dragline") &&
      document.querySelector("#dragme") &&
      document.querySelectorAll("input[type='range']").length >= 2;
  }, null, { timeout: 30000 });

  const metricsBefore = await page.evaluate(() => ({
    heatmapText: document.querySelector("#heatmap-container")?.innerText || "",
    f1Text: document.querySelector("#f1-container")?.innerText || "",
  }));
  await page.locator("input[type='range']").nth(0).evaluate((element, nextValue) => {
    element.value = String(nextValue);
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  }, 0.8);
  await page.waitForFunction((previous) => {
    const heatmapText = document.querySelector("#heatmap-container")?.innerText || "";
    const f1Text = document.querySelector("#f1-container")?.innerText || "";
    return heatmapText !== previous.heatmapText &&
      f1Text !== previous.f1Text &&
      /F1-Score:\s*0\.62/.test(heatmapText) &&
      /Precision:\s*0\.80/.test(heatmapText) &&
      /Recall:\s*0\.50/.test(heatmapText);
  }, metricsBefore, { timeout: 5000 });
  console.log("OK precision-recall precision control");

  const recallBefore = await page.evaluate(() => ({
    heatmapText: document.querySelector("#heatmap-container")?.innerText || "",
    f1Text: document.querySelector("#f1-container")?.innerText || "",
  }));
  await page.locator("input[type='range']").nth(1).evaluate((element, nextValue) => {
    element.value = String(nextValue);
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  }, 0.2);
  await page.waitForFunction((previous) => {
    const heatmapText = document.querySelector("#heatmap-container")?.innerText || "";
    const f1Text = document.querySelector("#f1-container")?.innerText || "";
    return heatmapText !== previous.heatmapText &&
      f1Text !== previous.f1Text &&
      /F1-Score:\s*0\.32/.test(heatmapText) &&
      /Precision:\s*0\.80/.test(heatmapText) &&
      /Recall:\s*0\.20/.test(heatmapText);
  }, recallBefore, { timeout: 5000 });
  console.log("OK precision-recall recall control");

  await page.locator("#error-chart").scrollIntoViewIfNeeded();
  await page.waitForFunction(() => {
    const thresholdText = document.querySelector("#error-chart")?.innerText || "";
    return /DECISION BOUNDARY THRESHOLD/.test(thresholdText) &&
      /RECALL/.test(thresholdText) &&
      /PRECISION/.test(thresholdText) &&
      /F1-SCORE/.test(thresholdText) &&
      (document.querySelector("#dragme")?.textContent || "").includes("Drag The Line!");
  }, null, { timeout: 5000 });
  await page.waitForTimeout(250);
  await assertEngineeringSandboxLayout(context, "precision-recall/", "precision-recall route", { navMode: "generated" });
  assertPageRuntimeClean("precision-recall route");
  console.log("OK precision-recall threshold tradeoff");
  await page.close();
}

async function smokeRocAuc(context) {
  const page = await context.newPage();
  const assertPageRuntimeClean = createRuntimeMonitor(page);
  await assertRoute(page, "roc-auc/", "#reference-footer");
  await assertEngineeringSandboxShell(page, "roc-auc route", {
    minimumChapters: 5,
    navMode: "generated",
    expectedFamily: "mlu-pilot",
    expectedRoute: "roc-auc",
  });
  await page.waitForFunction(() => {
    return document.querySelector("#roc-scatter-chart svg") &&
      document.querySelector("#roc-chart") &&
      document.querySelector("#auc-chart") &&
      document.querySelector("#perfect-line") &&
      document.querySelector("#random-line") &&
      document.querySelector("#our-line");
  }, null, { timeout: 30000 });

  const topState = await page.evaluate(() => ({
    highlightText: (document.querySelector("#highlight-text")?.textContent || "").replace(/\s+/g, " ").trim(),
    scatterCircles: document.querySelectorAll("#roc-scatter-chart circle").length,
  }));

  await page.evaluate(() => window.scrollTo(0, 4200));
  await page.waitForFunction((previous) => {
    const highlightText = (document.querySelector("#highlight-text")?.textContent || "").replace(/\s+/g, " ").trim();
    const scatterCircles = document.querySelectorAll("#roc-scatter-chart circle").length;
    return highlightText !== previous.highlightText &&
      /TPR:\s*0\./.test(highlightText) &&
      /FPR:\s*0\./.test(highlightText) &&
      scatterCircles > previous.scatterCircles;
  }, topState, { timeout: 10000 });
  console.log("OK roc-auc threshold sweep");

  await page.locator("#auc-chart").scrollIntoViewIfNeeded();
  await page.waitForFunction(() => {
    const areaPath = document.querySelector("#auc-chart path.path-area");
    const conclusionText = document.querySelector("#conclusion")?.innerText || "";
    return Boolean(areaPath) &&
      /precision and recall explainer/i.test(conclusionText) &&
      document.querySelectorAll("#auc-chart path").length >= 3;
  }, null, { timeout: 10000 });
  await page.waitForTimeout(250);
  await assertEngineeringSandboxLayout(context, "roc-auc/", "roc-auc route", { navMode: "generated" });
  assertPageRuntimeClean("roc-auc route");
  console.log("OK roc-auc auc scene");
  await page.close();
}

async function smokeBiasVariance(context) {
  const page = await context.newPage();
  const assertPageRuntimeClean = createRuntimeMonitor(page);
  await assertRoute(page, "bias-variance/", "#reference-footer");
  await assertEngineeringSandboxShell(page, "bias-variance route", { minimumChapters: 6, navMode: "generated", expectedFamily: "mlu-pilot" });
  await page.waitForFunction(() => {
    return document.querySelector("#scroll-viz svg") &&
      document.querySelector("#errorBarSvg") &&
      document.querySelector("#loess-slider") &&
      document.querySelector("#slider-container input[type='range']") &&
      document.querySelector("#button-loess") &&
      document.querySelector("#button-knn") &&
      document.querySelector("#dd-container svg");
  }, null, { timeout: 30000 });

  for (const y of [1200, 2200, 3200, 4200, 5200, 6200]) {
    await page.evaluate((nextY) => window.scrollTo(0, nextY), y);
    await page.waitForTimeout(350);
  }
  await page.waitForFunction(() => {
    const text = Array.from(document.querySelectorAll("#errorBarSvg text"))
      .map((node) => node.textContent || "")
      .join(" ");
    return /Test Error Decomposition/.test(text) &&
      /Bias/i.test(text) &&
      /Variance/i.test(text) &&
      /Noise/i.test(text);
  }, null, { timeout: 10000 });
  console.log("OK bias-variance decomposition scene");

  await page.locator("[data-step='10']").evaluate((element) => element.scrollIntoView({ block: "center" }));
  await page.waitForFunction(() => {
    const text = Array.from(document.querySelectorAll("#errorBarSvg text"))
      .map((node) => node.textContent || "")
      .join(" ");
    return /Model Complexity/.test(text) && /Test Error/.test(text);
  }, null, { timeout: 10000 });
  console.log("OK bias-variance complexity trend");

  await page.locator("#button-loess").scrollIntoViewIfNeeded();
  const loessBefore = await page.evaluate(() => ({
    text: document.querySelector("#loess-text")?.textContent || "",
    path: document.querySelector("#loess-line")?.getAttribute("d") || "",
  }));
  await setRangeValue(page, "#loess-slider", 0.8);
  await page.waitForFunction((previous) => {
    const text = document.querySelector("#loess-text")?.textContent || "";
    const path = document.querySelector("#loess-line")?.getAttribute("d") || "";
    return text !== previous.text &&
      path !== previous.path &&
      /0\.80/.test(text);
  }, loessBefore, { timeout: 5000 });
  console.log("OK bias-variance loess control");

  await page.locator("#button-knn").scrollIntoViewIfNeeded();
  const knnBefore = await page.evaluate(() => ({
    text: document.querySelector("#k-text")?.textContent || "",
    signature: Array.from(document.querySelectorAll("#predict-container .hex-cell"))
      .slice(0, 120)
      .map((node) => node.getAttribute("fill") || "")
      .join("|"),
  }));
  await setRangeValue(page, "#slider-container input[type='range']", 25);
  await page.waitForFunction((previous) => {
    const text = document.querySelector("#k-text")?.textContent || "";
    const signature = Array.from(document.querySelectorAll("#predict-container .hex-cell"))
      .slice(0, 120)
      .map((node) => node.getAttribute("fill") || "")
      .join("|");
    return text !== previous.text &&
      signature !== previous.signature &&
      /K:\s*25/.test(text);
  }, knnBefore, { timeout: 5000 });
  console.log("OK bias-variance knn control");

  await page.locator("#dd-container").scrollIntoViewIfNeeded();
  await page.waitForFunction(() => {
    const text = Array.from(document.querySelectorAll("#dd-container text"))
      .map((node) => node.textContent || "")
      .join(" ");
    return /Expected Test Error/.test(text) &&
      /Model Complexity/.test(text) &&
      document.querySelectorAll("#dd-container path").length >= 5;
  }, null, { timeout: 5000 });
  await page.waitForTimeout(250);
  await assertViewportUsable(page, "bias-variance route");
  await assertEngineeringSandboxLayout(context, "bias-variance/", "bias-variance route", { navMode: "generated" });
  assertPageRuntimeClean("bias-variance route");
  console.log("OK bias-variance double descent scene");
  await page.close();
}

async function smokeTrainTestValidation(context) {
  const page = await context.newPage();
  const assertPageRuntimeClean = createRuntimeMonitor(page);
  await assertRoute(page, "train-test-validation/", "#reference-footer");
  await assertEngineeringSandboxShell(page, "train-test-validation route", {
    minimumChapters: 6,
    navMode: "native",
    nativeSelector: "#toc a[href^='#']",
    expectedFamily: "mlu-pilot",
  });
  await page.waitForFunction(() => {
    return document.querySelector("#chart svg") &&
      document.querySelector("#line-decision-boundary") &&
      document.querySelectorAll(".button").length >= 4 &&
      document.querySelector("#model") &&
      document.querySelector("#validation") &&
      document.querySelector("#test");
  }, null, { timeout: 30000 });

  await page.locator("#model").scrollIntoViewIfNeeded();
  await page.waitForTimeout(1000);
  const modelBefore = await page.evaluate(() => ({
    active: document.querySelector(".button.active")?.textContent?.trim() || "",
    trainTransform: document.querySelector("#chart .bubble-animal[group='train']")?.getAttribute("transform") || "",
  }));
  await page.locator("button").filter({ hasText: /^Both$/ }).click();
  await page.waitForFunction((previous) => {
    const active = document.querySelector(".button.active")?.textContent?.trim() || "";
    const trainTransform = document.querySelector("#chart .bubble-animal[group='train']")?.getAttribute("transform") || "";
    return active === "Both" && trainTransform !== previous.trainTransform;
  }, modelBefore, { timeout: 5000 });
  console.log("OK train-test-validation feature switch");

  const dragBefore = await page.evaluate(() => ({
    transform: document.querySelector("#chart .bubble-animal[group='train']")?.getAttribute("transform") || "",
  }));
  const trainBubble = page.locator("#chart .bubble-animal[group='train']").first();
  const box = await trainBubble.boundingBox();
  assert(box, "train-test-validation did not expose a draggable training example");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 50, box.y + box.height / 2 - 20, { steps: 12 });
  await page.mouse.up();
  await page.waitForFunction((previous) => {
    const transform = document.querySelector("#chart .bubble-animal[group='train']")?.getAttribute("transform") || "";
    return transform !== previous.transform;
  }, dragBefore, { timeout: 5000 });
  console.log("OK train-test-validation draggable training scene");

  await page.locator("#validation").scrollIntoViewIfNeeded();
  await page.waitForFunction(() => {
    const text = document.querySelector("#table")?.innerText || "";
    return /validation/.test(text) && /both/.test(text);
  }, null, { timeout: 5000 });
  console.log("OK train-test-validation validation table");

  await page.locator("#test").scrollIntoViewIfNeeded();
  await page.waitForFunction(() => {
    const text = document.querySelector("#table")?.innerText || "";
    return /test/.test(text) && /validation/.test(text) && /\d+\.\d%/.test(text);
  }, null, { timeout: 5000 });
  await page.waitForTimeout(250);
  await assertViewportUsable(page, "train-test-validation route");
  await assertEngineeringSandboxLayout(context, "train-test-validation/", "train-test-validation route", { navMode: "native" });
  assertPageRuntimeClean("train-test-validation route");
  console.log("OK train-test-validation test table");
  await page.close();
}

async function smokeDoubleDescent(context) {
  const page = await context.newPage();
  const assertPageRuntimeClean = createRuntimeMonitor(page);
  await assertRoute(page, "double-descent/", "#reference-footer");
  await assertEngineeringSandboxShell(page, "double-descent route", { minimumChapters: 5, navMode: "generated", expectedFamily: "mlu-pilot" });
  await page.waitForFunction(() => {
    return document.querySelector("#doubledescent-container svg") &&
      document.querySelector("#scatter-container svg") &&
      document.querySelector("#error-container svg") &&
      document.querySelector("#error-slider") &&
      document.querySelector("#error-text") &&
      document.querySelector("#gap-container img");
  }, null, { timeout: 30000 });

  await page.locator("#scrolly article .step").first().scrollIntoViewIfNeeded();
  await page.waitForTimeout(700);
  const introBefore = await page.evaluate(() => ({
    separatorY2: document.querySelector("#line-separator")?.getAttribute("y2") || "",
    interpolationOpacity: document.querySelector("#text-interpolation-threshold")?.getAttribute("opacity") || "",
    overlayOpacity: document.querySelector("#rect-interpolate")?.getAttribute("fill-opacity") || "",
    text: Array.from(document.querySelectorAll("#doubledescent-container text"))
      .map((node) => node.textContent || "")
      .join(" "),
  }));
  await page.locator("#scrolly article .step").nth(3).scrollIntoViewIfNeeded();
  await page.waitForFunction((previous) => {
    const separatorY2 = document.querySelector("#line-separator")?.getAttribute("y2") || "";
    const interpolationOpacity = document.querySelector("#text-interpolation-threshold")?.getAttribute("opacity") || "";
    const overlayOpacity = document.querySelector("#rect-interpolate")?.getAttribute("fill-opacity") || "";
    const text = Array.from(document.querySelectorAll("#doubledescent-container text"))
      .map((node) => node.textContent || "")
      .join(" ");
    return separatorY2 !== previous.separatorY2 &&
      interpolationOpacity !== previous.interpolationOpacity &&
      overlayOpacity !== previous.overlayOpacity &&
      /InterpolationThreshold/.test(text) &&
      /Measure of Model Complexity/.test(text) &&
      /Prediction Error/.test(text) &&
      /Train/.test(text) &&
      /Test/.test(text);
  }, introBefore, { timeout: 10000 });
  await page.locator("#scrolly article .step").nth(4).scrollIntoViewIfNeeded();
  await page.waitForFunction(() => {
    return document.querySelector("#line-separator")?.getAttribute("y2") === "0" &&
      document.querySelector("#text-interpolation-threshold")?.getAttribute("opacity") === "1" &&
      document.querySelector("#rect-interpolate")?.getAttribute("fill-opacity") === "0";
  }, null, { timeout: 10000 });
  console.log("OK double-descent intro scrolly");

  await page.locator("#scrolly-side article .step-side").first().scrollIntoViewIfNeeded();
  await page.waitForTimeout(700);
  const sideBefore = await page.evaluate(() => ({
    scatterLine: document.querySelector("#scatter-line")?.getAttribute("d") || "",
  }));
  await page.locator("#scrolly-side article .step-side").nth(4).scrollIntoViewIfNeeded();
  await page.waitForFunction((previous) => {
    const scatterLine = document.querySelector("#scatter-line")?.getAttribute("d") || "";
    return scatterLine !== previous.scatterLine;
  }, sideBefore, { timeout: 10000 });
  console.log("OK double-descent side narrative");

  await page.locator("#error-slider").scrollIntoViewIfNeeded();
  const sliderBefore = await page.evaluate(() => ({
    text: document.querySelector("#error-text")?.textContent || "",
    scatterLine: document.querySelector("#scatter-line")?.getAttribute("d") || "",
  }));
  await setRangeValue(page, "#error-slider", 64);
  await page.waitForFunction((previous) => {
    const text = document.querySelector("#error-text")?.textContent || "";
    const scatterLine = document.querySelector("#scatter-line")?.getAttribute("d") || "";
    return text !== previous.text && scatterLine !== previous.scatterLine && /K=64/.test(text);
  }, sliderBefore, { timeout: 5000 });
  console.log("OK double-descent complexity slider");

  await page.locator("#gap").scrollIntoViewIfNeeded();
  await page.waitForFunction((expectedSrcPrefix) => {
    const image = document.querySelector("#gap-container img");
    return Boolean(image) &&
      image.getAttribute("src") === "line.9ddf65b2.gif" &&
      image.currentSrc.startsWith(expectedSrcPrefix);
  }, new URL("double-descent/", baseUrl).href, { timeout: 5000 });
  console.log("OK double-descent gap media");

  await assertViewportUsable(page, "double-descent route");
  await assertEngineeringSandboxLayout(context, "double-descent/", "double-descent route", { navMode: "generated" });
  await assertRouteViewportUsable(
    context,
    "double-descent/",
    "#reference-footer",
    "#doubledescent-container svg",
    "double-descent route",
    390,
    844,
  );
  await page.waitForTimeout(250);
  assertPageRuntimeClean("double-descent route");
  console.log("OK double-descent responsive shell");
  await page.close();
}

async function smokeDoubleDescent2(context) {
  const page = await context.newPage();
  const assertPageRuntimeClean = createRuntimeMonitor(page);
  await assertRoute(page, "double-descent2/", "#reference-footer");
  await assertEngineeringSandboxShell(page, "double-descent2 route", { minimumChapters: 6, navMode: "generated", expectedFamily: "mlu-pilot" });
  await page.waitForFunction(() => {
    return document.querySelectorAll(".katex").length > 20 &&
      document.querySelector("#chart1 svg") &&
      document.querySelector("#chart4 svg") &&
      document.querySelector("#animation-chart svg") &&
      document.querySelector("#chart5 svg") &&
      document.querySelector("#delta-chart svg") &&
      document.querySelector("#chart6 svg");
  }, null, { timeout: 30000 });

  const initialStats = await page.evaluate(() => ({
    katexCount: document.querySelectorAll(".katex").length,
    chart1Paths: document.querySelectorAll("#chart1 path").length,
    chart4Paths: document.querySelectorAll("#chart4 path").length,
    animationPaths: document.querySelectorAll("#animation-chart path").length,
    chart5Paths: document.querySelectorAll("#chart5 path").length,
    deltaPaths: document.querySelectorAll("#delta-chart path").length,
    chart6Paths: document.querySelectorAll("#chart6 path").length,
  }));
  assert(initialStats.katexCount > 20, "double-descent2 did not hydrate KaTeX locally");
  assert(initialStats.chart1Paths >= 3, "double-descent2 chart1 did not mount");
  assert(initialStats.chart4Paths >= 3, "double-descent2 chart4 did not mount");
  assert(initialStats.animationPaths >= 3, "double-descent2 animation chart did not mount");
  assert(initialStats.chart5Paths >= 3, "double-descent2 chart5 did not mount");
  assert(initialStats.deltaPaths >= 2, "double-descent2 delta chart did not mount");
  assert(initialStats.chart6Paths >= 3, "double-descent2 chart6 did not mount");
  console.log("OK double-descent2 core charts");

  for (const selector of ["#chart4", "#animation-chart", "#chart5", "#delta-chart", "#chart6"]) {
    await page.locator(selector).scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
  }
  await page.waitForFunction(() => {
    const deltaText = Array.from(document.querySelectorAll("#delta-chart text"))
      .map((node) => node.textContent || "")
      .join(" ");
    return /t/.test(deltaText) &&
      /δ/.test(deltaText) &&
      /Δ/.test(deltaText) &&
      document.querySelectorAll("#chart6 circle").length >= 6;
  }, null, { timeout: 5000 });
  console.log("OK double-descent2 interpolation and spline scenes");

  await assertViewportUsable(page, "double-descent2 route");
  await assertEngineeringSandboxLayout(context, "double-descent2/", "double-descent2 route", { navMode: "generated" });
  await assertRouteViewportUsable(
    context,
    "double-descent2/",
    "#reference-footer",
    "#chart1 svg",
    "double-descent2 route",
    390,
    844,
  );
  await page.waitForTimeout(250);
  assertPageRuntimeClean("double-descent2 route");
  console.log("OK double-descent2 responsive shell");
  await page.close();
}

async function smokeBallot(context) {
  const page = await context.newPage();
  await page.goto(new URL("ballot/play/ballot1.html", baseUrl).href, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#model-object-select", { timeout: 15000 });
  const frameState = await page.evaluate(() => {
    const selected = Number(document.querySelector("#model-object-select")?.value || 0);
    return {
      canvasTabIndex: document.querySelector("canvas")?.tabIndex,
      x: model.draggables[selected].x,
      y: model.draggables[selected].y,
    };
  });
  assert(frameState.canvasTabIndex === -1, "Ballot canvas remained a tab stop");
  await page.getByRole("button", { name: "Move selected object Right" }).press("Enter");
  const movedState = await page.evaluate(() => {
    const selected = Number(document.querySelector("#model-object-select")?.value || 0);
    return {
      text: document.querySelector(".model-keyboard-state")?.textContent || "",
      x: model.draggables[selected].x,
      y: model.draggables[selected].y,
    };
  });
  assert(movedState.x > frameState.x && movedState.y === frameState.y, "Ballot keyboard control did not move the selected object right");
  assert(movedState.text.includes("at "), "Ballot keyboard movement did not expose updated state");
  await page.close();
}

async function smokePolygons(context) {
  const page = await context.newPage();
  await page.goto(new URL("polygons/play/manual/manual.html", baseUrl).href, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#polygon-select", { timeout: 15000 });
  const move = await page.evaluate(() => {
    const directions = [
      { name: "Up", dx: 0, dy: -1 },
      { name: "Left", dx: -1, dy: 0 },
      { name: "Right", dx: 1, dy: 0 },
      { name: "Down", dx: 0, dy: 1 },
    ];
    for (let attempt = 0; attempt < 20; attempt++) {
      for (let index = 0; index < draggables.length; index++) {
        const polygon = draggables[index];
        if (!polygon.shaking) continue;
        const fromX = Math.floor(polygon.gotoX / TILE_SIZE);
        const fromY = Math.floor(polygon.gotoY / TILE_SIZE);
        for (const direction of directions) {
          const x = fromX + direction.dx;
          const y = fromY + direction.dy;
          const occupied = draggables.some((other, otherIndex) => {
            return otherIndex !== index &&
              Math.floor(other.gotoX / TILE_SIZE) === x &&
              Math.floor(other.gotoY / TILE_SIZE) === y;
          });
          if (x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE && !occupied) {
            return { index, name: direction.name, fromX, fromY };
          }
        }
      }
      reset();
    }
    return null;
  });
  assert(move, "Polygons manual board had no unhappy polygon with an adjacent empty cell");
  await page.locator("#polygon-select").selectOption(String(move.index));
  await page.getByRole("button", { name: move.name, exact: true }).press("Enter");
  const moved = await page.evaluate(() => {
    const selected = Number(document.querySelector("#polygon-select")?.value);
    const polygon = draggables[selected];
    return {
      text: document.querySelector("#manual_controls output")?.textContent || "",
      x: Math.floor(polygon.gotoX / TILE_SIZE),
      y: Math.floor(polygon.gotoY / TILE_SIZE),
    };
  });
  assert(moved.x !== move.fromX || moved.y !== move.fromY, "Polygons keyboard control did not move the selected polygon");
  assert(moved.text.includes("at "), "Polygons keyboard movement did not expose updated state");
  await page.goto(new URL("polygons/play/automatic/automatic4.html", baseUrl).href, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#moving", { timeout: 15000 });
  assert(await page.locator("#moving").evaluate((element) => element.tagName === "BUTTON"), "Polygons start control is not a button");
  assert(await page.locator(".ds input[type='range']").count() === 2, "Polygons two-handle slider has no native range equivalent");
  await page.close();
  await assertRouteViewportUsable(context, "polygons/", "#reference-footer", ".playable", "polygons mobile", 320, 844);
}

async function smokeFormula1Racing(context) {
  const page = await context.newPage();
  const assertPageRuntimeClean = createRuntimeMonitor(page);
  await page.addInitScript(() => {
    const fillText = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (text, ...args) {
      if (/^(?:Floor|Tyre|Brake|Braking) \+[\d.]+ s$/.test(String(text))) {
        window.__formula1ContributionLabels = window.__formula1ContributionLabels || [];
        window.__formula1ContributionLabels.push(String(text));
      }
      return fillText.call(this, text, ...args);
    };
  });
  await assertRoute(page, "formula-1-racing/", "#reference-footer");
  await assertEngineeringSandboxShell(page, "formula-1-racing route", {
    expectedFamily: "runtime",
    expectedRoute: "formula-1-racing",
  });
  await page.waitForFunction(() => document.querySelectorAll(".drawer_container canvas").length >= 5, null, { timeout: 30000 });
  const namedControls = await page.locator(".padding_wrapper [data-control]").evaluateAll((mounts) => {
    return mounts.map((mount) => {
      const control = mount.querySelector("[role='slider'], [role='radiogroup']");
      return {
        name: mount.getAttribute("data-control") || "",
        ariaLabel: control?.getAttribute("aria-label") || "",
        visibleLabel: mount.classList.contains("f1_labeled_control")
          ? getComputedStyle(mount, "::before").content.replace(/^['\"]|['\"]$/g, "")
          : mount.parentElement?.querySelector(".f1_control_label span")?.textContent?.trim() || "",
      };
    });
  });
  assert(namedControls.length === 42, `Formula 1 expected 42 named controls, found ${namedControls.length}`);
  assert(namedControls.every((control) => control.name === control.ariaLabel), "Formula 1 control names did not match their aria labels");
  assert(namedControls.every((control) => control.name === control.visibleLabel || control.name === "Floor pitch" && control.visibleLabel === "Pitch"), "Formula 1 did not expose every control name visibly");

  const track = page.locator("#f1_track_seg0 [role='radio']").first();
  await track.focus();
  const trackBefore = await track.getAttribute("aria-checked");
  await track.press("ArrowRight");
  await page.waitForFunction(() => {
    return /Monaco/.test(document.querySelector("#f1_track_caption")?.textContent || "") &&
      /Monaco setup/.test(document.querySelector("#f1_setup_caption")?.textContent || "") &&
      /Monaco/.test(document.querySelector("#f1_lap_caption")?.textContent || "");
  }, null, { timeout: 5000 });
  assert(trackBefore === "true", "Formula 1 track control did not expose its initial selection");
  assert(await track.getAttribute("aria-checked") === "false", "Formula 1 track keyboard selection did not update aria state");

  const airflow = page.locator("#f1_airflow_sl0 [role='slider']");
  const airflowBefore = await airflow.getAttribute("aria-valuenow");
  await airflow.focus();
  await airflow.press("ArrowRight");
  assert(await airflow.getAttribute("aria-valuenow") !== airflowBefore, "Formula 1 slider keyboard action did not update aria value");
  assert((await page.locator("#f1_airflow_caption").textContent()).length > 0, "Formula 1 slider did not update its caption");

  const floorRide = page.getByRole("slider", { name: "Live ride height" });
  const floorCaptionBefore = await page.locator("#f1_floor_caption").textContent();
  const lapCaptionBefore = await page.locator("#f1_lap_caption").textContent();
  await floorRide.focus();
  await floorRide.press("End");
  await page.waitForFunction(({ floorCaption, lapCaption }) => {
    return document.querySelector("#f1_floor_caption")?.textContent !== floorCaption &&
      document.querySelector("#f1_lap_caption")?.textContent !== lapCaption;
  }, { floorCaption: floorCaptionBefore, lapCaption: lapCaptionBefore }, { timeout: 5000 });
  const floorLapCaption = await page.locator("#f1_lap_caption").textContent();
  const floorDelta = Number(floorLapCaption.match(/floor posture contributes \+([\d.]+) s/i)?.[1] || 0);
  assert(await floorRide.getAttribute("aria-valuenow") === "100", "Formula 1 ride-height control did not reach its keyboard maximum");
  assert(/platform risk (?:is )?high/i.test(floorLapCaption), "Formula 1 lap summary did not expose the floor-platform risk");
  assert(floorDelta > 0, "Formula 1 floor posture did not add measurable lap loss");

  const tyreTemperature = page.getByRole("slider", { name: "Tyre temperature" });
  const tyreCaptionBefore = await page.locator("#f1_tyre_caption").textContent();
  const tyreLapCaptionBefore = await page.locator("#f1_lap_caption").textContent();
  await tyreTemperature.focus();
  await tyreTemperature.press("End");
  await page.waitForFunction(({ tyreCaption, lapCaption }) => {
    return document.querySelector("#f1_tyre_caption")?.textContent !== tyreCaption &&
      document.querySelector("#f1_lap_caption")?.textContent !== lapCaption;
  }, { tyreCaption: tyreCaptionBefore, lapCaption: tyreLapCaptionBefore }, { timeout: 5000 });
  const tyreLapCaption = await page.locator("#f1_lap_caption").textContent();
  const tyreDelta = Number(tyreLapCaption.match(/tyre condition contributes \+([\d.]+) s/i)?.[1] || 0);
  assert(await tyreTemperature.getAttribute("aria-valuenow") === "100", "Formula 1 tyre-temperature control did not reach its keyboard maximum");
  assert(/overheated/i.test(await page.locator("#f1_tyre_caption").textContent()), "Formula 1 tyre summary did not expose overheating");
  assert(/tyre is overheated/i.test(tyreLapCaption), "Formula 1 lap summary did not expose tyre condition");
  assert(tyreDelta > 0, "Formula 1 tyre condition did not add measurable lap loss");

  const brakeRecovery = page.getByRole("slider", { name: "Energy recovery" });
  const brakeCaptionBefore = await page.locator("#f1_brake_caption").textContent();
  const brakeLapCaptionBefore = await page.locator("#f1_lap_caption").textContent();
  await brakeRecovery.focus();
  await brakeRecovery.press("End");
  await page.waitForFunction(({ brakeCaption, lapCaption }) => {
    return document.querySelector("#f1_brake_caption")?.textContent !== brakeCaption &&
      document.querySelector("#f1_lap_caption")?.textContent !== lapCaption;
  }, { brakeCaption: brakeCaptionBefore, lapCaption: brakeLapCaptionBefore }, { timeout: 5000 });
  const brakeLapCaption = await page.locator("#f1_lap_caption").textContent();
  const brakeDelta = Number(brakeLapCaption.match(/braking balance contributes \+([\d.]+) s/i)?.[1] || 0);
  assert(await brakeRecovery.getAttribute("aria-valuenow") === "100", "Formula 1 recovery control did not reach its keyboard maximum");
  assert(/braking now looks compromised/i.test(await page.locator("#f1_brake_caption").textContent()), "Formula 1 brake summary did not expose compromised braking");
  assert(/braking is compromised/i.test(brakeLapCaption), "Formula 1 lap summary did not expose braking condition");
  assert(brakeDelta > 0, "Formula 1 braking balance did not add measurable lap loss");

  await page.evaluate(() => {
    window.__formula1ContributionLabels = [];
  });
  await page.locator("#f1_lap").scrollIntoViewIfNeeded();
  await page.waitForFunction(() => window.__formula1ContributionLabels?.length >= 3, null, { timeout: 5000 });
  const contributionLabels = await page.evaluate(() => window.__formula1ContributionLabels.slice(-3));
  assert(contributionLabels.includes(`Floor +${floorDelta.toFixed(2)} s`), "Formula 1 lap canvas did not label its floor contribution");
  assert(contributionLabels.includes(`Tyre +${tyreDelta.toFixed(2)} s`), "Formula 1 lap canvas did not label its tyre contribution");
  assert(contributionLabels.includes(`Braking +${brakeDelta.toFixed(2)} s`), "Formula 1 lap canvas did not label its braking contribution");

  const weather = page.locator("#f1_weather_seg0 [role='radio']").first();
  await weather.focus();
  await weather.press("ArrowRight");
  await page.waitForFunction(() => /Mixed/.test(document.querySelector("#f1_weather_caption")?.textContent || ""), null, { timeout: 5000 });
  const lapPlan = page.locator("#f1_lap_seg0 [role='radio']").first();
  await lapPlan.focus();
  await lapPlan.press("ArrowRight");
  assert(await lapPlan.getAttribute("aria-checked") === "false", "Formula 1 lap-plan keyboard selection did not update aria state");

  await assertViewportUsable(page, "formula-1-racing desktop");
  assertPageRuntimeClean("formula-1-racing desktop");
  await page.close();

  const mobilePage = await context.newPage();
  const assertMobileRuntimeClean = createRuntimeMonitor(mobilePage);
  await mobilePage.setViewportSize({ width: 390, height: 844 });
  await assertRoute(mobilePage, "formula-1-racing/", "#reference-footer");
  await mobilePage.waitForSelector("#f1_lap_caption", { timeout: 30000 });
  await assertViewportUsable(mobilePage, "formula-1-racing mobile");
  assertMobileRuntimeClean("formula-1-racing mobile");
  await mobilePage.close();
}

async function smokeWatchMeshExplorer(context) {
  const page = await context.newPage();
  const assertRuntimeClean = createRuntimeMonitor(page, { rejectOffOriginRequests: true });
  await assertRoute(page, "watch-mesh-explorer/", "#reference-footer");
  await page.waitForFunction(() => document.querySelector("[data-watch-workbench]")?.dataset.threeReady === "true", null, { timeout: 30000 });

  const initial = await page.evaluate(() => {
    const canvas = document.querySelector("[data-viewport] canvas");
    return {
      busy: document.querySelector("[data-viewport]")?.getAttribute("aria-busy"),
      componentCount: Number(canvas?.dataset.componentCount || 0),
      hidden: canvas?.getAttribute("aria-hidden"),
      lessonPlacementError: Number(canvas?.dataset.lessonPlacementError || Infinity),
      transformedSourceCount: Number(canvas?.dataset.transformedSourceCount || 0),
      sourceRotationOrder: canvas?.dataset.sourceRotationOrder || "",
      touchAction: canvas?.style.touchAction,
    };
  });
  assert(initial.busy === "false", "Watch workbench did not clear its loading state");
  assert(initial.componentCount === 71, `Watch workbench expected 71 components, got ${initial.componentCount}`);
  assert(initial.hidden === "true", "Watch workbench pointer canvas should remain hidden from assistive technology");
  assert(initial.lessonPlacementError === 0, `Watch workbench lesson parts moved away from assembled positions by ${initial.lessonPlacementError}`);
  assert(initial.transformedSourceCount === 16, `Watch workbench expected 16 authored source transforms, got ${initial.transformedSourceCount}`);
  assert(initial.sourceRotationOrder === "ZYX", "Watch workbench source transforms should preserve archived ZYX rotation order");
  assert(initial.touchAction === "pan-y", "Watch workbench should preserve page scrolling while orbit is locked");
  assert(await page.locator("[data-lesson-list] button").count() === 10, "Watch workbench did not expose ten guided lessons");
  assert(await page.locator("[data-lesson-count]").textContent() === "01 / 10", "Watch workbench did not start at lesson one");
  assert(await page.locator("[data-viewport] canvas").getAttribute("data-mode") === "lesson", "Watch workbench did not start in guided mode");
  assert(await page.locator("[data-viewport] canvas").getAttribute("data-lesson-id") === "power", "Watch workbench did not start with the power lesson");
  assert(await page.locator("[data-part-list] button:not([hidden])").count() === 4, "Watch workbench power lesson did not isolate four register parts");

  const workbenchLiveRegions = await page.evaluate(() => ({
    lessonBrief: document.querySelector(".lesson-brief")?.getAttribute("aria-atomic") || "",
    partDetail: document.querySelector("[data-part-detail]")?.getAttribute("aria-atomic") || "",
    systemFilterRole: document.querySelector("div.system-filter[data-system-filter]")?.getAttribute("role") || "",
    systemFilterLabel: document.querySelector("div.system-filter[data-system-filter]")?.getAttribute("aria-label") || "",
  }));
  assert(workbenchLiveRegions.lessonBrief === "true", "Watch workbench lesson brief should announce atomically");
  assert(workbenchLiveRegions.partDetail === "true", "Watch workbench part detail should announce atomically");
  assert(workbenchLiveRegions.systemFilterRole === "group", "Watch workbench subsystem filter should expose a group role");
  assert(
    workbenchLiveRegions.systemFilterLabel === "Filter by subsystem",
    "Watch workbench subsystem filter lost its accessible name",
  );

  await page.locator("[data-next-lesson]").click();
  await page.waitForFunction(() => document.querySelector("[data-viewport] canvas")?.dataset.lessonId === "gears");
  assert(await page.locator("[data-lesson-count]").textContent() === "02 / 10", "Watch workbench next control did not advance the lesson");
  assert((await page.locator("[data-lesson-problem]").textContent()).includes("barrel's slow rotation"), "Watch workbench lesson did not update its causal explanation");
  assert(Number(await page.locator("[data-viewport] canvas").getAttribute("data-lesson-placement-error")) === 0, "Watch workbench moved gear lesson parts away from assembled positions");

  await page.locator(".explore-tools summary").click();
  await page.locator("[data-mode='atlas']").click();
  await page.getByRole("button", { name: "Power", exact: true }).click();
  await page.waitForFunction(() => {
    const canvas = document.querySelector("[data-viewport] canvas");
    return canvas?.dataset.mode === "atlas" && canvas?.dataset.systemFilter === "Power" && canvas?.dataset.selectedId === "barrel-drum";
  });
  const filtered = await page.evaluate(() => ({
    filteredCount: Number(document.querySelector("[data-viewport] canvas")?.dataset.filteredCount || 0),
    visibleRows: Array.from(document.querySelectorAll("[data-part-list] button")).filter((button) => getComputedStyle(button).display !== "none").length,
  }));
  assert(filtered.filteredCount === 5, `Watch workbench Power filter expected four parts plus mainplate, got ${filtered.filteredCount}`);
  assert(filtered.visibleRows === 4, `Watch workbench Power register expected four rows, got ${filtered.visibleRows}`);

  await page.locator("button[data-orbit]").click();
  assert(await page.locator("button[data-orbit]").getAttribute("aria-pressed") === "true", "Watch workbench did not enable free orbit");
  assert(await page.locator("[data-viewport] canvas").evaluate((canvas) => canvas.style.touchAction) === "none", "Watch workbench orbit did not claim touch gestures");
  await page.locator("[data-reset-view]").click();
  assert(await page.locator("button[data-orbit]").getAttribute("aria-pressed") === "false", "Watch workbench reset did not lock the camera");
  assert(await page.locator("[data-viewport] canvas").evaluate((canvas) => canvas.style.touchAction) === "pan-y", "Watch workbench reset did not restore page scrolling");

  await page.locator("[data-play]").click();
  await page.waitForFunction(() => document.querySelector("[data-viewport] canvas")?.dataset.playing === "false");
  await page.waitForTimeout(800);
  const pausedRenderCount = Number(await page.locator("[data-viewport] canvas").getAttribute("data-render-count"));
  await page.waitForTimeout(250);
  assert(Number(await page.locator("[data-viewport] canvas").getAttribute("data-render-count")) === pausedRenderCount, "Watch workbench kept rendering while paused and settled");

  await page.getByRole("button", { name: "All", exact: true }).click();
  await page.locator("[data-mode='energy']").click();
  await page.waitForFunction(() => document.querySelector("[data-viewport] canvas")?.dataset.mode === "energy");
  assert(await page.locator("[data-part-list] .is-flowing").count() === 14, "Watch workbench energy mode did not expose all torque branches");

  const speed1 = page.locator("button[data-speed='1']");
  const speed8 = page.locator("button[data-speed='8']");
  await speed1.focus();
  await speed1.press("ArrowRight");
  assert(await speed8.getAttribute("aria-checked") === "true", "Watch workbench speed keyboard control did not select 8x");
  assert(await speed8.getAttribute("tabindex") === "0", "Watch workbench selected speed did not receive the roving tab stop");

  await page.getByRole("button", { name: "Calendar", exact: true }).click();
  await page.locator("[data-component-id='date-ring']").click();
  assert((await page.locator("[data-part-detail]").textContent()).includes("Service stageCalendar"), "Watch workbench assigned the date ring to the wrong service stage");
  await page.locator("[data-install-stage]").click();
  assert(await page.locator("[data-stage-count]").textContent() === "04 / 06", "Watch workbench inspector action did not open the Calendar stage");
  await page.locator("[data-stage-list] button").nth(5).click();
  assert(await page.locator("[data-stage-count]").textContent() === "06 / 06", "Watch workbench did not reach the Hands stage");

  await assertViewportUsable(page, "watch-mesh-explorer desktop interactions");
  assertRuntimeClean("watch-mesh-explorer interactions");
  await page.close();
}

async function createSmokeContext(browser) {
  return browser.newContext({
    acceptDownloads: true,
    viewport: { width: 1400, height: 1000 },
  });
}

async function main() {
  validateSelections();
  const selectedRoutesForRun = selectedManifestRoutes();
  const approvedBaseline = loadExperienceBaseline();
  const recordedRoutes = {};
  phaseLog(`Starting smoke run${selectedGroups.size ? ` [groups: ${Array.from(selectedGroups).join(", ")}]` : ""}${selectedRoutes.size ? ` [routes: ${Array.from(selectedRoutes).join(", ")}]` : ""}${experience ? " [experience gates]" : ""}${recordBaseline ? " [recording baseline]" : ""}`);
  const server = await startServer();
  const browser = await chromium.launch({ headless: true });
  let context = await createSmokeContext(browser);

  try {
    for (const route of selectedRoutesForRun) {
      const approvedRoute = approvedBaseline?.routes[route.slug] || null;
      const geometry = await measureRouteGeometry(
        browser,
        route,
        approvedRoute?.geometry,
        !recordBaseline,
      );
      if (experience) {
        await assertManifestRouteExperience(browser, route, recordBaseline ? geometry : approvedRoute.geometry);
      } else {
        await assertManifestRouteCompatibility(context, route, {
          enforceViewportFit: !recordBaseline,
        });
      }
      recordedRoutes[route.slug] = {
        ...await measureRoutePerformance(
          browser,
          route,
          approvedRoute,
          !recordBaseline && !skipPerformance,
        ),
        geometry,
      };
    }

    const routePage = await context.newPage();
    const routeChecks = [
      ["", "[data-page-list]"],
      ...selectedRoutesForRun.flatMap((route) => [
        [`${route.slug}/`, "#reference-footer"],
        [`docs/${route.slug}/`, "[data-parity-list]"],
      ]),
    ];

    if (exists("anxiety/sharing")) {
      routeChecks.push(["anxiety/sharing/", "#reference-footer"]);
    }
    if (exists("simulating/original")) {
      routeChecks.push(["simulating/original/", "#splash_iframe"]);
    }
    if (exists("simulating/model")) {
      routeChecks.push(["simulating/model/", "#play_controls"]);
    }
    if (exists("markov-chains/playground")) {
      routeChecks.push(["markov-chains/playground/", "#reference-footer"]);
      routeChecks.push(["markov-chains/playground/playground.html", "#reference-footer"]);
    }
    for (const [relativePath, selector] of routeChecks) {
      await assertRoute(routePage, relativePath, selector);
    }
    await routePage.close();
    await smokeAtlas(context);
    await smokeWayfinding(context);
    phaseLog("Route checks completed");

    if (exists("ballot")) {
      await smokeBallot(context);
    }
    if (exists("polygons")) {
      await smokePolygons(context);
    }
    if (exists("formula-1-racing")) {
      await smokeFormula1Racing(context);
    }
    if (exists("watch-mesh-explorer")) {
      await smokeWatchMeshExplorer(context);
    }
    if (exists("crowds")) {
      await smokeCrowdsReadOnly(context);
    }
    if (exists("remember")) {
      await smokeRemember(context);
    }
    if (exists("neurons")) {
      await smokeNeurons(context);
    }
    if (exists("loopy")) {
      await smokeLoopy(context);
    }
    if (exists("trust")) {
      await smokeTrust(context);
      await smokeTrustFallback(context);
    }
    if (exists("anxiety")) {
      await smokeAnxiety(context);
    }
    if (exists("wbwwb")) {
      await smokeWbwwb(context);
    }
    if (exists("coming-out-simulator-2014")) {
      await smokeComingOut(context);
    }
    if (exists("covid-19")) {
      await smokeCovid(context);
    }
    if (exists("simulating")) {
      await smokeSimulating(context);
    }
    if (exists("sim")) {
      await smokeSim(context);
    }
    if (exists("decision-tree")) {
      await smokeDecisionTree(context);
    }
    if (exists("random-forest")) {
      await smokeRandomForest(context);
    }
    if (exists("conditional-probability")) {
      await smokeConditionalProbability(context);
    }
    if (exists("markov-chains")) {
      await smokeMarkovChains(context);
    }
    if (exists("principal-component-analysis")) {
      await smokePrincipalComponentAnalysis(context);
    }
    if (exists("exponentiation")) {
      await smokeExponentiation(context);
    }
    if (exists("pi")) {
      await smokePi(context);
    }
    if (exists("sine-and-cosine")) {
      await smokeSineAndCosine(context);
    }
    if (exists("eigenvectors-and-eigenvalues")) {
      await smokeEigenvectorsAndEigenvalues(context);
    }
    if (exists("image-kernels")) {
      await smokeImageKernels(context);
    }
    if (exists("ordinary-least-squares-regression")) {
      await smokeOrdinaryLeastSquaresRegression(context);
    }
    if (exists("blockchain")) {
      await smokeBlockchain(context);
    }
    if (exists("public-private-keys")) {
      await smokePublicPrivateKeys(context);
    }
    if (exists("zero-knowledge-proof-demo")) {
      await smokeZeroKnowledgeProofDemo(context);
    }
    if (exists("alpha-compositing")) {
      await smokeAlphaCompositing(context);
    }
    if (exists("color-spaces")) {
      await smokeColorSpaces(context);
    }
    if (exists("sound")) {
      await smokeSound(context);
    }
    if (exists("cameras-and-lenses")) {
      await smokeCamerasAndLenses(context);
    }
    if (exists("lights-and-shadows")) {
      await smokeLightsAndShadows(context);
    }
    if (exists("tesseract")) {
      await smokeTesseract(context);
    }
    if (exists("gears")) {
      await smokeGears(context);
    }
    if (exists("gps")) {
      await smokeGps(context);
    }
    if (exists("earth-and-sun")) {
      await smokeEarthAndSun(context);
    }
    if (exists("stargazing-dashboard")) {
      await smokeStargazingDashboard(context);
    }
    if (exists("bicycle")) {
      await smokeBicycle(context);
    }
    if (exists("airfoil")) {
      await smokeAirfoil(context);
    }
    if (exists("curves-and-surfaces")) {
      await smokeCurvesAndSurfaces(context);
    }
    if (exists("internal-combustion-engine")) {
      await smokeInternalCombustionEngine(context);
    }
    if (exists("mechanical-watch")) {
      await smokeMechanicalWatch(context);
    }
    if (exists("interactive-mechanical-watch")) {
      await smokeInteractiveMechanicalWatch(context);
    }
    if (exists("naval-architecture")) {
      await smokeNavalArchitecture(context);
    }
    if (exists("reading-qr-codes-without-a-computer")) {
      await smokeReadingQrCodesWithoutAComputer(context);
    }
    if (exists("teoria-interval-ear-training")) {
      await smokeTeoriaIntervalEarTraining(context);
    }
    if (exists("teoria-note-ear-training")) {
      await smokeTeoriaNoteEarTraining(context);
    }
    if (exists("teoria-key-and-note-ear-training")) {
      await smokeTeoriaKeyAndNoteEarTraining(context);
    }
    if (exists("teoria-random-key-and-note-ear-training")) {
      await smokeTeoriaRandomKeyAndNoteEarTraining(context);
    }
    if (exists("teoria-scale-construction")) {
      await smokeTeoriaScaleConstruction(context);
    }
    if (exists("teoria-interval-identification-and-inversion")) {
      await smokeTeoriaIntervalIdentificationAndInversion(context);
    }
    if (exists("ableton-learning-music-playground")) {
      await smokeAbletonLearningMusicPlayground(context);
    }
    if (exists("ableton-learning-music-play-with-beats")) {
      await smokeAbletonLearningMusicPlayWithBeats(context);
    }
    if (exists("ableton-learning-music-play-with-notes-and-scales")) {
      await smokeAbletonLearningMusicPlayWithNotesAndScales(context);
    }
    if (exists("ableton-learning-music-play-with-chords")) {
      await smokeAbletonLearningMusicPlayWithChords(context);
    }
    if (exists("ableton-learning-music-play-with-basslines")) {
      await smokeAbletonLearningMusicPlayWithBasslines(context);
    }
    if (exists("ableton-learning-music-play-with-melodies")) {
      await smokeAbletonLearningMusicPlayWithMelodies(context);
    }
    if (exists("ableton-learning-music-play-with-song-structures")) {
      await smokeAbletonLearningMusicPlayWithSongStructures(context);
    }
    if (exists("ableton-learning-synths-get-started")) {
      await smokeAbletonLearningSynthsGetStarted(context);
    }
    if (exists("ableton-learning-synths-how-synths-make-sound")) {
      await smokeAbletonLearningSynthsHowSynthsMakeSound(context);
    }
    if (exists("ableton-learning-synths-filter-resonance")) {
      await smokeAbletonLearningSynthsFilterResonance(context);
    }
    if (exists("ableton-learning-synths-modulating-amplitude-with-envelopes")) {
      await smokeAbletonLearningSynthsModulatingAmplitudeWithEnvelopes(context);
    }
    if (exists("ableton-learning-synths-matching-envelopes")) {
      await smokeAbletonLearningSynthsMatchingEnvelopes(context);
    }
    if (exists("ableton-learning-synths-recipes")) {
      await smokeAbletonLearningSynthsRecipes(context);
    }
    if (exists("chrome-music-lab-song-maker")) {
      await smokeChromeMusicLabSongMaker(context);
    }
    if (exists("musicmap")) {
      await smokeMusicmap(context);
    }
    if (exists("music-interactive-hub")) {
      await smokeMusicInteractiveHub(context);
    }
    if (
      exists("memory-allocation") ||
      exists("load-balancing") ||
      exists("hysteresis-slack") ||
      exists("rigid-body-collisions") ||
      exists("blockchain-101-combined-flow") ||
      exists("primary-interactive-hub") ||
      exists("linear-regression") ||
      exists("logistic-regression") ||
      exists("precision-recall") ||
      exists("roc-auc") ||
      exists("bias-variance") ||
      exists("train-test-validation") ||
      exists("double-descent") ||
      exists("double-descent2")
    ) {
      await context.close();
      context = await createSmokeContext(browser);
    }
    if (exists("memory-allocation")) {
      await smokeMemoryAllocation(context);
    }
    if (exists("load-balancing")) {
      await smokeLoadBalancing(context);
    }
    if (exists("hysteresis-slack")) {
      await smokeHysteresisSlack(context);
    }
    if (exists("rigid-body-collisions")) {
      await smokeRigidBodyCollisions(context);
    }
    if (exists("blockchain-101-combined-flow")) {
      await smokeBlockchain101CombinedFlow(context);
    }
    if (exists("primary-interactive-hub")) {
      await smokePrimaryInteractiveHub(context);
    }
    if (exists("linear-regression")) {
      await smokeLinearRegression(context);
    }
    if (exists("logistic-regression")) {
      await smokeLogisticRegression(context);
    }
    if (exists("precision-recall")) {
      await smokePrecisionRecall(context);
    }
    if (exists("roc-auc")) {
      await smokeRocAuc(context);
    }
    if (exists("bias-variance")) {
      await smokeBiasVariance(context);
    }
    if (exists("train-test-validation")) {
      await smokeTrainTestValidation(context);
    }
    if (exists("double-descent")) {
      await smokeDoubleDescent(context);
    }
    if (exists("double-descent2")) {
      await smokeDoubleDescent2(context);
    }
    if (recordBaseline) {
      writeExperienceBaseline(mergeExperienceBaseline(approvedBaseline, recordedRoutes));
      phaseLog(`Recorded experience baseline at ${baselinePath}`);
    }
    phaseLog("Smoke checks completed");
  } finally {
    await context.close();
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
}

main().catch((error) => {
  console.error(error.stack || error.message || String(error));
  process.exit(1);
});
