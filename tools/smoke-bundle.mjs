import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { chromium } from "playwright";

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

const rootDir = path.resolve(explicitRootArg || path.join(process.cwd(), "interactive-explanation"));
const port = Number(process.env.SMOKE_PORT || 4173);
const host = "127.0.0.1";
const mountPath = "/interactive-explanation/";
const baseUrl = `http://${host}:${port}${mountPath}`;
const verbose = hasFlag("--verbose") || process.env.SMOKE_VERBOSE === "1";
const rawConsoleLog = console.log.bind(console);

console.log = (...args) => {
  if (verbose) {
    rawConsoleLog(...args);
  }
};

function phaseLog(message) {
  rawConsoleLog(message);
}

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".eot": "application/vnd.ms-fontobject",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".m4a": "audio/mp4",
  ".md": "text/markdown; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".mp3": "audio/mpeg",
  ".otf": "font/otf",
  ".opus": "audio/ogg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ttf": "font/ttf",
  ".txt": "text/plain; charset=utf-8",
  ".wav": "audio/wav",
  ".webm": "video/webm",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

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

const abletonSynthLessonSlugs = [
  "ableton-learning-synths-get-started",
  "ableton-learning-synths-how-synths-make-sound",
  "ableton-learning-synths-filter-resonance",
  "ableton-learning-synths-modulating-amplitude-with-envelopes",
  "ableton-learning-synths-matching-envelopes",
  "ableton-learning-synths-recipes",
];

const routeManifestPath = path.join(rootDir, "routes.manifest.json");
const routeManifest = fs.existsSync(routeManifestPath)
  ? JSON.parse(fs.readFileSync(routeManifestPath, "utf8"))
  : [];
const routeGroupsBySlug = new Map(routeManifest.map((route) => [route.slug, inferRouteGroups(route)]));
const selectedGroups = new Set(getArgValues("--group"));
const selectedRoutes = new Set(getArgValues("--route"));

function inferRouteFamily(route) {
  if (["blockchain-101-combined-flow", "primary-interactive-hub", "music-interactive-hub"].includes(route.slug)) {
    return "custom";
  }

  const referenceUrl = route.referenceUrl || "";

  if (/ncase\.me|ncase\.itch\.io|github\.com\/ncase/i.test(referenceUrl)) {
    return "ncase";
  }
  if (/mlu-explain\.github\.io/i.test(referenceUrl)) {
    return "mlu";
  }
  if (/setosa\.io/i.test(referenceUrl)) {
    return "setosa";
  }
  if (/andersbrownworth\.com/i.test(referenceUrl)) {
    return "anders";
  }
  if (/ciechanow\.ski/i.test(referenceUrl)) {
    return "ciechanowski";
  }
  if (/teoria\.com/i.test(referenceUrl)) {
    return "teoria";
  }
  if (/learningmusic\.ableton\.com|learningsynths\.ableton\.com/i.test(referenceUrl)) {
    return "ableton";
  }
  if (/musicmap\.info/i.test(referenceUrl)) {
    return "musicmap";
  }
  if (/samwho\.dev/i.test(referenceUrl)) {
    return "samwho";
  }
  if (/joshuahhh\.com/i.test(referenceUrl)) {
    return "horowitz";
  }
  if (/sassnow\.ski/i.test(referenceUrl)) {
    return "sassnowski";
  }

  return "custom";
}

function inferRouteGroups(route) {
  const family = inferRouteFamily(route);
  const groups = new Set([family]);

  if (
    ["teoria", "musicmap"].includes(family) ||
    route.slug === "music-interactive-hub" ||
    /learningmusic\.ableton\.com|learningsynths\.ableton\.com|musiclab\.chromeexperiments\.com/i.test(route.referenceUrl || "")
  ) {
    groups.add("music");
  }

  return groups;
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

function serveFile(req, res) {
  const requestUrl = new URL(req.url, `http://${host}:${port}`);

  if (requestUrl.pathname === "/") {
    res.writeHead(302, { Location: mountPath });
    res.end();
    return;
  }

  if (!requestUrl.pathname.startsWith(mountPath)) {
    res.writeHead(404);
    res.end("Not found");
    return;
  }

  let relativePath = decodeURIComponent(requestUrl.pathname.slice(mountPath.length));
  if (!relativePath || relativePath.endsWith("/")) {
    relativePath = `${relativePath}index.html`;
  }

  const fullPath = path.resolve(rootDir, relativePath);
  if (!fullPath.startsWith(rootDir)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  if (!fs.existsSync(fullPath) || fs.statSync(fullPath).isDirectory()) {
    res.writeHead(404);
    res.end("Not found");
    return;
  }

  const ext = path.extname(fullPath).toLowerCase();
  res.writeHead(200, {
    "Cache-Control": "no-store",
    "Content-Type": contentTypes[ext] || "application/octet-stream",
  });
  fs.createReadStream(fullPath).pipe(res);
}

function startServer() {
  const server = http.createServer(serveFile);
  return new Promise((resolve) => {
    server.listen(port, host, () => resolve(server));
  });
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function assertRoute(page, relativePath, selector) {
  const response = await page.goto(new URL(relativePath, baseUrl).href, {
    waitUntil: "domcontentloaded",
  });
  assert(response && response.ok(), `Route failed: ${relativePath}`);
  if (selector) {
    await page.waitForSelector(selector, { timeout: 15000 });
  }
  console.log(`OK route ${relativePath}`);
}

async function assertEngineeringSandboxShell(page, label, minimumChapters = 4) {
  await page.waitForFunction(() => {
    return document.body?.dataset.storyShell === "engineering-sandbox" &&
      document.querySelector(".story-hero") &&
      document.querySelector(".story-hero [data-story-callout='play']") &&
      document.querySelector(".story-rail__nav a") &&
      document.querySelector(".story-mobile-bar__nav a");
  }, null, { timeout: 15000 });

  const shellState = await page.evaluate(() => {
    const railLinks = Array.from(document.querySelectorAll(".story-rail__nav a"));
    const mobileLinks = Array.from(document.querySelectorAll(".story-mobile-bar__nav a"));

    return {
      storyShell: document.body?.dataset.storyShell || "",
      storyFamily: document.body?.dataset.storyFamily || "",
      heroTitle: document.querySelector(".story-hero__title")?.textContent?.trim() || "",
      playButtonHref: document.querySelector(".story-hero [data-story-callout='play'] .story-button")?.getAttribute("href") || "",
      chapterCount: document.querySelectorAll("[data-story-chapter]").length,
      railCount: railLinks.length,
      mobileCount: mobileLinks.length,
      allAnchorLinks: railLinks.concat(mobileLinks).every((link) => {
        const href = link.getAttribute("href") || "";
        return href.startsWith("#");
      }),
    };
  });

  assert(shellState.storyShell === "engineering-sandbox", `${label} did not opt into the engineering sandbox shell`);
  assert(shellState.storyFamily === "mlu-pilot", `${label} did not expose the expected story family`);
  assert(shellState.heroTitle.length > 0, `${label} did not render the engineering sandbox hero`);
  assert(shellState.playButtonHref.startsWith("#"), `${label} did not expose a local play-first action`);
  assert(shellState.chapterCount >= minimumChapters, `${label} exposed only ${shellState.chapterCount} chapter markers`);
  assert(shellState.railCount >= minimumChapters, `${label} exposed only ${shellState.railCount} desktop chapter links`);
  assert(shellState.mobileCount >= minimumChapters, `${label} exposed only ${shellState.mobileCount} mobile chapter links`);
  assert(shellState.allAnchorLinks, `${label} exposed a non-local chapter link`);
}

function createRuntimeMonitor(page) {
  const issues = [];

  page.on("pageerror", (error) => {
    issues.push(`pageerror: ${error.message}`);
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
      innerWidth: window.innerWidth,
      scrollWidth: Math.max(doc?.scrollWidth || 0, body?.scrollWidth || 0),
    };
  });
  assert(
    metrics.scrollWidth <= metrics.innerWidth + 32,
    `${label} overflowed at ${metrics.innerWidth}px (${metrics.scrollWidth}px content width vs ${metrics.innerWidth}px viewport)`,
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

async function assertCiechanowskiResponsiveShell(context, page, relativePath, readySelector, label) {
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

  for (const drag of drags) {
    const before = await canvas.evaluate((element) => element.toDataURL());
    await page.mouse.move(box.x + box.width * drag.from.x, box.y + box.height * drag.from.y);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * drag.to.x, box.y + box.height * drag.to.y, { steps: 12 });
    await page.mouse.up();
    await page.waitForTimeout(150);
    const after = await canvas.evaluate((element) => element.toDataURL());
    if (after !== before) {
      return;
    }
  }

  throw new Error(`${label} did not update after drag attempts`);
}

async function clickChoice(page, text) {
  const choice = page.locator("#game_choices > div").filter({ hasText: text }).first();
  await choice.waitFor({ state: "visible", timeout: 20000 });
  await choice.click();
}

async function waitForIntroChoices(page) {
  await page.waitForFunction(() => {
    const choices = Array.from(document.querySelectorAll("#game_choices > div"));
    return choices.some((choice) => /PLAY|REPLAY|Chapter Select|content notes/i.test(choice.textContent || ""));
  }, null, { timeout: 20000 });
}

async function smokeRemember(context) {
  const page = await context.newPage();

  await assertRoute(page, "remember/", "iframe.splash");
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
  console.log("OK anxiety intro start");
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
    return Array.from(document.querySelectorAll("#game_choices > div")).some((choice) => {
      return /IV\. The Other Sandwich/i.test(choice.textContent || "");
    });
  }, null, { timeout: 20000 });
  await clickChoice(replayPage, "IV. The Other Sandwich");
  await replayPage.waitForFunction(() => window._ && window._.CHAPTER === 4, null, { timeout: 10000 });
  await replayPage.evaluate(() => Game.clearAllTimeouts());
  await replayPage.waitForFunction(() => {
    const words = document.querySelector("#game_words")?.textContent || "";
    return words.trim().length > 0;
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
  const photoResult = await page.evaluate(() => {
    Game.scene.camera.x = Game.width / 2;
    Game.scene.camera.y = Game.height / 2;
    Game.scene.camera.takePhoto();
    Game.scene.director.takePhoto(Game.scene.camera);
    return {
      chyron: Game.scene.director.chyron,
      audience: Game.scene.director.photoData && Game.scene.director.photoData.audience,
    };
  });
  assert(photoResult.chyron && photoResult.chyron !== "[NO CHYRON]", "wbwwb did not generate a chyron after a photo");
  console.log(`OK wbwwb capture loop (${photoResult.chyron})`);

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
    return Array.from(document.querySelectorAll("iframe[src*='sim/?stage=']")).map((frame) => frame.getAttribute("src") || "");
  });
  assert(embeddedStages.some((src) => src.includes("stage=epi-7")), "covid-19 article is missing the SEIR-with-R stage");
  assert(embeddedStages.some((src) => src.includes("stage=int-4")), "covid-19 article is missing the lockdown stage");
  assert(embeddedStages.some((src) => src.includes("stage=yrs-5")), "covid-19 article is missing the ICU-capacity stage");
  assert(embeddedStages.some((src) => src.includes("stage=SB")), "covid-19 article is missing the sandbox stage");
  console.log("OK covid article stage map");
  await articlePage.close();

  const seirPage = await context.newPage();
  await seirPage.goto(new URL("covid-19/sim/?stage=epi-7", baseUrl).href, {
    waitUntil: "load",
  });
  await seirPage.waitForSelector("#bb_start", { timeout: 15000 });
  await seirPage.waitForFunction(() => typeof daysCurrent === "number" && typeof restart === "function", null, { timeout: 10000 });
  await seirPage.evaluate(() => document.querySelector(".big_button").onclick());
  await seirPage.waitForFunction(() => daysCurrent > 5, null, { timeout: 10000 });
  await seirPage.evaluate(() => document.querySelector(".big_button").onclick());
  await seirPage.evaluate(() => document.querySelector("#sb_reset").onclick());
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
  await simPage.locator(".editor_fancy_button").filter({ hasText: "save your model" }).first().click();
  await simPage.waitForFunction(() => {
    return Array.from(document.querySelectorAll(".editor_save_link")).some((input) => {
      return /\?lz=/.test(input.value || "");
    });
  }, null, { timeout: 10000 });
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
  console.log("OK sim controls and save/export");
  await simPage.close();

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
}

async function smokeDecisionTree(context) {
  const page = await context.newPage();
  await assertRoute(page, "decision-tree/", "#reference-footer");
  await assertEngineeringSandboxShell(page, "decision-tree route", 6);
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
  console.log("OK decision-tree information gain hover");
  await page.close();
}

async function smokeRandomForest(context) {
  const page = await context.newPage();
  await assertRoute(page, "random-forest/", "#reference-footer");
  await assertEngineeringSandboxShell(page, "random-forest route", 5);
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
  console.log("OK random-forest ensemble panels");
  await page.close();
}

async function smokeConditionalProbability(context) {
  const page = await context.newPage();
  await assertRoute(page, "conditional-probability/", "#reference-footer");
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
  await page.close();
}

async function smokeMarkovChains(context) {
  const page = await context.newPage();
  const assertPageRuntimeClean = createRuntimeMonitor(page);
  await assertRoute(page, "markov-chains/", "#reference-footer");
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
  console.log("OK principal-component-analysis dataset views");
  await page.close();
}

async function smokeExponentiation(context) {
  const page = await context.newPage();
  const assertPageRuntimeClean = createRuntimeMonitor(page);
  await assertRoute(page, "exponentiation/", "#reference-footer");
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
  console.log("OK exponentiation virus demo");
  await page.close();
}

async function smokePi(context) {
  const page = await context.newPage();
  const assertPageRuntimeClean = createRuntimeMonitor(page);
  await assertRoute(page, "pi/", "#reference-footer");
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
  console.log("OK pi geometry and wrap controls");
  await page.close();
}

async function smokeSineAndCosine(context) {
  const page = await context.newPage();
  const assertPageRuntimeClean = createRuntimeMonitor(page);
  await assertRoute(page, "sine-and-cosine/", "#reference-footer");
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
  console.log("OK sine-and-cosine cosine autoplay");
  await page.close();
}

async function smokeEigenvectorsAndEigenvalues(context) {
  const page = await context.newPage();
  const assertPageRuntimeClean = createRuntimeMonitor(page);
  await assertRoute(page, "eigenvectors-and-eigenvalues/", "#reference-footer");
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
    return {
      curGen: scope.opt.curGen,
      readout: document.querySelector('[ng-controller="BacteriaCtrl"] div[style*="text-align: center"]')?.textContent || "",
    };
  });
  await page.locator('[ng-controller="BacteriaCtrl"] button').filter({ hasText: /^forward$/i }).click();
  await page.waitForFunction((previous) => {
    const scope = angular.element(document.querySelector('[ng-controller="BacteriaCtrl"]')).scope();
    const readout = document.querySelector('[ng-controller="BacteriaCtrl"] div[style*="text-align: center"]')?.textContent || "";
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
  console.log("OK eigenvectors-and-eigenvalues complex spiral");
  await page.close();
}

async function smokeImageKernels(context) {
  const page = await context.newPage();
  const assertPageRuntimeClean = createRuntimeMonitor(page);
  await assertRoute(page, "image-kernels/", "#reference-footer");
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
  console.log("OK image-kernels boundary handling");
  await page.close();
}

async function smokeOrdinaryLeastSquaresRegression(context) {
  const page = await context.newPage();
  const assertPageRuntimeClean = createRuntimeMonitor(page);
  await assertRoute(page, "ordinary-least-squares-regression/", "#reference-footer");
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
    return equation !== previous.equation &&
      line !== previous.line &&
      errorSignature !== previous.errorSignature;
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
  console.log("OK ordinary-least-squares-regression responsive shell");
  await page.close();
}

async function smokeBlockchain(context) {
  const page = await context.newPage();
  const assertPageRuntimeClean = createRuntimeMonitor(page);
  await assertRoute(page, "blockchain/", "#reference-footer");
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
  await page.waitForTimeout(250);
  assertPageRuntimeClean("blockchain route");
  console.log("OK blockchain distributed scene");
  await page.close();
}

async function smokePublicPrivateKeys(context) {
  const page = await context.newPage();
  const assertPageRuntimeClean = createRuntimeMonitor(page);
  await assertRoute(page, "public-private-keys/", "#reference-footer");
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
}

async function smokeZeroKnowledgeProofDemo(context) {
  const page = await context.newPage();
  const assertPageRuntimeClean = createRuntimeMonitor(page);
  await assertRoute(page, "zero-knowledge-proof-demo/", "#reference-footer");
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
      await assertCiechanowskiResponsiveShell(
        context,
        page,
        "alpha-compositing/",
        "#alpha_rose_glasses_container canvas",
        "alpha-compositing route",
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

  await assertCiechanowskiResponsiveShell(
    context,
    page,
    "color-spaces/",
    "#color_plain_linear_quadratic_slider_container .color_slider_knob",
    "color-spaces route",
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

  await assertCiechanowskiResponsiveShell(
    context,
    page,
    "sound/",
    "#hero_keyboard .keyboard_button",
    "sound route",
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

  await assertCiechanowskiResponsiveShell(
    context,
    page,
    "cameras-and-lenses/",
    "#lens_detector_sl0 .slider_knob",
    "cameras-and-lenses route",
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

  await assertCiechanowskiResponsiveShell(
    context,
    page,
    "lights-and-shadows/",
    "#lns_shadow2_rot_y_slider_container .slider_knob",
    "lights-and-shadows route",
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

  await assertCiechanowskiResponsiveShell(
    context,
    page,
    "tesseract/",
    "#ts_3D_demo_slice_slider_container .slider_knob",
    "tesseract route",
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

  await assertCiechanowskiResponsiveShell(
    context,
    page,
    "gears/",
    "#gears_angular_velocity_slider_container .slider_knob",
    "gears route",
  );
  await page.waitForTimeout(250);
  assertPageRuntimeClean("gears route");
  console.log("OK gears responsive shell");
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

  await assertCiechanowskiResponsiveShell(
    context,
    page,
    "gps/",
    "#map0 canvas",
    "gps route",
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

  await assertCiechanowskiResponsiveShell(
    context,
    page,
    "earth-and-sun/",
    "#es_earth_sunlight canvas",
    "earth-and-sun route",
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

  await assertCiechanowskiResponsiveShell(
    context,
    page,
    "bicycle/",
    "#hero canvas",
    "bicycle route",
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

  const viscosityCanvas = page.locator("#fdm_hero canvas").first();
  await viscosityCanvas.scrollIntoViewIfNeeded();
  const viscosityBefore = await viscosityCanvas.evaluate((canvas) => canvas.toDataURL());
  await dragKnob(page, "#fdm_hero_sl0 .slider_knob", 90, 0, "airfoil viscosity slider");
  await page.waitForFunction((previous) => {
    const canvas = document.querySelector("#fdm_hero canvas");
    return canvas && canvas.toDataURL() !== previous;
  }, viscosityBefore, { timeout: 5000 });
  console.log("OK airfoil viscosity scene");

  const laterCanvas = page.locator("#airfoil_fvm2 canvas").first();
  await laterCanvas.scrollIntoViewIfNeeded();
  const laterBefore = await laterCanvas.evaluate((canvas) => canvas.toDataURL());
  await dragKnob(page, "#airfoil_fvm2_sl0 .slider_knob", 90, 0, "airfoil later airfoil slider");
  await page.waitForFunction((previous) => {
    const canvas = document.querySelector("#airfoil_fvm2 canvas");
    return canvas && canvas.toDataURL() !== previous;
  }, laterBefore, { timeout: 5000 });
  console.log("OK airfoil later airfoil scene");

  await assertCiechanowskiResponsiveShell(
    context,
    page,
    "airfoil/",
    "#hero_fvm canvas",
    "airfoil route",
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

  await assertCiechanowskiResponsiveShell(
    context,
    page,
    "curves-and-surfaces/",
    "#cs_control_points canvas",
    "curves-and-surfaces route",
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

  await assertCiechanowskiResponsiveShell(
    context,
    page,
    "internal-combustion-engine/",
    "#ice_hero canvas",
    "internal-combustion-engine route",
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

  await assertLocalScriptSources(page, ["./js/base.js", "./js/watch.js"], "mechanical-watch");

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

  await assertCiechanowskiResponsiveShell(
    context,
    page,
    "mechanical-watch/",
    "#hero canvas",
    "mechanical-watch route",
  );
  await page.waitForTimeout(250);
  assertPageRuntimeClean("mechanical-watch route");
  console.log("OK mechanical-watch responsive shell");
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

  await assertCiechanowskiResponsiveShell(
    context,
    page,
    "naval-architecture/",
    "#na_syringe_pressure canvas",
    "naval-architecture route",
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
  const beforeCanvas = await page.locator(config.canvasSelector).evaluate((canvas) => canvas.toDataURL());
  const selectors = config.interactionSelectors || [config.interactionSelector];

  for (const selector of selectors) {
    await page.click(selector);
    await page.waitForTimeout(300);
    const afterCanvas = await page.locator(config.canvasSelector).evaluate((canvas) => canvas.toDataURL());
    if (afterCanvas !== beforeCanvas) {
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
  const scoreBeforeReveal = ((await page.locator("#tsp_score").textContent()) || "").trim();
  const messageBeforeReveal = ((await page.locator("#tsp_mess").textContent()) || "").trim();
  await page.click("#pp_tellMe");
  await page.waitForFunction((previousMessage) => {
    return getComputedStyle(document.querySelector("#ev_next")).display !== "none" ||
      ((document.querySelector("#tsp_mess")?.textContent || "").trim()) !== previousMessage;
  }, messageBeforeReveal, { timeout: 5000 });
  const revealState = await page.evaluate(() => ({
    message: (document.querySelector("#tsp_mess")?.textContent || "").trim(),
    score: (document.querySelector("#tsp_score")?.textContent || "").trim(),
    nextVisible: getComputedStyle(document.querySelector("#ev_next")).display,
  }));
  assert(
    revealState.message !== messageBeforeReveal ||
      revealState.score !== scoreBeforeReveal ||
      revealState.nextVisible !== "none",
    `${label} did not advance the correctness state after reveal`,
  );
  assert(revealState.nextVisible !== "none", `${label} did not advance to the next-exercise state`);
}

async function smokeTeoriaExercise(context, config) {
  const page = await context.newPage();
  const assertPageRuntimeClean = createRuntimeMonitor(page);
  await assertRoute(page, `${config.slug}/`, "#reference-footer");
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
  await assertLocalScriptSources(
    page,
    [
      "./third-party/polyfills/polyfills.js",
      "./third-party/tone/tone.min.js",
      "./third-party/microevent/microevent.js",
      "./widgets/build/widgets.min.js",
      "./widgets/build/SimplePianoRoll.js",
      "../shared/public-footer.js",
    ],
    "ableton-learning-music-playground route",
  );
  await page.waitForFunction(() => {
    return document.querySelectorAll(".widget").length === 4 &&
      document.querySelectorAll(".widget__transport-btn").length >= 4 &&
      Boolean(document.querySelector("#_theplaygroundplaygroundbass .widget__choice"));
  }, null, { timeout: 30000 });
  await assertNoRemotePlayableMediaRequests(page, "ableton-learning-music-playground route");
  console.log("OK ableton-learning-music-playground local assets");

  const transportBefore = await page.evaluate(() => ({
    widgetCount: document.querySelectorAll(".widget").length,
    transportCount: document.querySelectorAll(".widget__transport-btn").length,
    bassSelectedRoot: document.querySelector("#_theplaygroundplaygroundbass .widget__choice--selected")?.textContent?.trim() || "",
  }));
  assert(transportBefore.widgetCount === 4, "ableton-learning-music-playground route did not mount all four widgets");
  assert(transportBefore.transportCount >= 4, "ableton-learning-music-playground route did not expose transport controls");

  await page.locator("button.widget__transport-btn").first().click();
  await page.waitForTimeout(700);
  const playbackState = await page.evaluate(() => ({
    toneState: window.Tone?.getContext?.().state || "",
    widgetGlobals: [
      "_theplaygroundplaygrounddrumssequencer",
      "_theplaygroundplaygroundbass",
      "_theplaygroundplaygroundpiano",
      "_theplaygroundplaygroundsynth",
    ].every((key) => Boolean(window[key])),
  }));
  assert(playbackState.toneState === "running", "ableton-learning-music-playground route did not start the local transport");
  assert(playbackState.widgetGlobals, "ableton-learning-music-playground route did not hydrate all widget globals");
  console.log("OK ableton-learning-music-playground transport");

  const bassChoices = page.locator("#_theplaygroundplaygroundbass .widget__choice");
  await bassChoices.nth(2).click();
  await page.waitForTimeout(250);
  const editState = await page.evaluate(() => ({
    selectedRoot: document.querySelector("#_theplaygroundplaygroundbass .widget__choice--selected")?.textContent?.trim() || "",
    selectedScale: document.querySelectorAll("#_theplaygroundplaygroundbass .widget__choice--selected").length,
  }));
  assert(editState.selectedRoot === "D", `ableton-learning-music-playground route expected D root after edit, got ${editState.selectedRoot || "none"}`);
  assert(editState.selectedScale >= 2, "ableton-learning-music-playground route lost synchronized chooser state after edit");
  await assertNoRemotePlayableMediaRequests(page, "ableton-learning-music-playground route");
  console.log("OK ableton-learning-music-playground edit path");

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
  await assertLocalScriptSources(
    page,
    [
      "./third-party/polyfills/polyfills.js",
      "./third-party/tone/tone.min.js",
      "./third-party/microevent/microevent.js",
      "./widgets/build/widgets.min.js",
      "./widgets/build/SimplePianoRoll.js",
      "../shared/public-footer.js",
    ],
    label,
  );
  await page.waitForFunction(({ widgetCount, transportCount }) => {
    return document.querySelectorAll(".widget").length >= widgetCount &&
      document.querySelectorAll("button.widget__transport-btn").length >= transportCount;
  }, { widgetCount, transportCount }, { timeout: 30000 });
  await assertNoRemotePlayableMediaRequests(page, label);
  console.log(`OK ${label} local assets`);

  await page.locator("button.widget__transport-btn").first().click();
  await page.waitForTimeout(700);
  const playbackState = await page.evaluate(() => ({
    toneState: window.Tone?.getContext?.().state || "",
    transportCount: document.querySelectorAll("button.widget__transport-btn").length,
  }));
  assert(playbackState.toneState === "running", `${label} did not start the local transport`);
  assert(playbackState.transportCount >= 2, `${label} lost transport controls after playback start`);
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
    const choices = page.locator(".widget__choice");
    await choices.nth(2).click();
    await page.waitForTimeout(250);
    const editState = await page.evaluate(() => ({
      selectedRoot: document.querySelector(".widget__choice--selected")?.textContent?.trim() || "",
      selectedCount: document.querySelectorAll(".widget__choice--selected").length,
    }));
    assert(editState.selectedRoot === "D", `${label} expected D root after edit, got ${editState.selectedRoot || "none"}`);
    assert(editState.selectedCount >= 2, `${label} lost synchronized chooser state after edit`);
  }
  await assertNoRemotePlayableMediaRequests(page, label);
  console.log(`OK ${label} edit path`);

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
  await assertLocalScriptSources(
    page,
    [
      "./third-party/polyfills/polyfills.js",
      "./third-party/tone/tone.min.js",
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
  await assertLocalScriptSources(
    page,
    [
      "./js/externals/react.production.min.js",
      "./js/externals/react-dom.production.min.js",
      "./js/musiclab.js",
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
  await page.click("#youtube-playlist-link", { force: true });
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
    ["youtube.com", "youtube-nocookie.com", "ytimg.com", "googlevideo.com"],
    "musicmap route after deferred YouTube embed",
  );
  console.log("OK musicmap deferred YouTube playback surface");

  const remoteBeforeSpotifyEmbed = remoteRequests.snapshot().length;
  await page.click("#spotify-playlist-link", { force: true });
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
    ["open.spotify.com", "embed-cdn.spotifycdn.com"],
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

async function smokeMusicInteractiveHub(context) {
  const page = await context.newPage();
  const assertPageRuntimeClean = createRuntimeMonitor(page);

  await assertRoute(page, "music-interactive-hub/", "#reference-footer");
  await page.waitForFunction(() => {
    return document.querySelectorAll("[data-music-card]").length === 21 &&
      document.querySelectorAll("[data-recommended-path] li").length >= 9;
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
  console.log("OK music-interactive-hub card clusters");

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
  console.log("OK memory-allocation responsive shell");
  await page.close();
}

async function smokeLoadBalancing(context) {
  const page = await context.newPage();
  const assertPageRuntimeClean = createRuntimeMonitor(page);
  await assertRoute(page, "load-balancing/", "#reference-footer");
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
  console.log("OK load-balancing responsive shell");
  await page.close();
}

async function smokeHysteresisSlack(context) {
  const page = await context.newPage();
  const assertPageRuntimeClean = createRuntimeMonitor(page);
  await assertRoute(page, "hysteresis-slack/", "#reference-footer");
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
  console.log("OK hysteresis-slack responsive shell");
  await page.close();
}

async function smokeRigidBodyCollisions(context) {
  const page = await context.newPage();
  const assertPageRuntimeClean = createRuntimeMonitor(page);
  await assertRoute(page, "rigid-body-collisions/", "#reference-footer");
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
  for (const assetPath of [
    "/rigid-body-collisions/fonts/Essays1743.woff",
    "/rigid-body-collisions/fonts/Essays1743-Bold.woff",
  ]) {
    assert(
      assetState.some((entry) => entry.includes(assetPath)),
      `rigid-body-collisions did not load ${assetPath} from local assets`,
    );
  }
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
  console.log("OK rigid-body-collisions responsive shell");
  await page.close();
}

async function smokeBlockchain101CombinedFlow(context) {
  const page = await context.newPage();
  const assertPageRuntimeClean = createRuntimeMonitor(page);
  await assertRoute(page, "blockchain-101-combined-flow/", "#reference-footer");
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

  await page.locator("a[href='./#chapter-hash']").click();
  await page.waitForTimeout(250);
  const hashAnchorVisible = await page.locator("#chapter-hash").isVisible();
  assert(hashAnchorVisible, "blockchain-101-combined-flow chapter anchor navigation failed");
  console.log("OK blockchain-101-combined-flow chapter anchor");

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
    return {
      hrefs,
      countText: document.querySelector("[data-hub-count]")?.textContent || "",
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
  console.log("OK primary-interactive-hub local route grid");

  await page.locator("a[href='./#stories-cluster']").click();
  await page.waitForTimeout(250);
  const storiesVisible = await page.locator("#stories-cluster").isVisible();
  assert(storiesVisible, "primary-interactive-hub cluster anchor navigation failed");
  console.log("OK primary-interactive-hub cluster anchor");

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
  assertPageRuntimeClean("linear-regression route");
  console.log("OK linear-regression gradient descent");
  await page.close();
}

async function smokeLogisticRegression(context) {
  const page = await context.newPage();
  const assertPageRuntimeClean = createRuntimeMonitor(page);
  await assertRoute(page, "logistic-regression/", "#reference-footer");
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
  assertPageRuntimeClean("logistic-regression route");
  console.log("OK logistic-regression gradient descent");
  await page.close();
}

async function smokePrecisionRecall(context) {
  const page = await context.newPage();
  const assertPageRuntimeClean = createRuntimeMonitor(page);
  await assertRoute(page, "precision-recall/", "#reference-footer");
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
  assertPageRuntimeClean("precision-recall route");
  console.log("OK precision-recall threshold tradeoff");
  await page.close();
}

async function smokeRocAuc(context) {
  const page = await context.newPage();
  const assertPageRuntimeClean = createRuntimeMonitor(page);
  await assertRoute(page, "roc-auc/", "#reference-footer");
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

  await page.evaluate(() => window.scrollTo(0, 3200));
  await page.waitForFunction((previous) => {
    const highlightText = (document.querySelector("#highlight-text")?.textContent || "").replace(/\s+/g, " ").trim();
    const scatterCircles = document.querySelectorAll("#roc-scatter-chart circle").length;
    return highlightText !== previous.highlightText &&
      /TPR:\s*0\.85/.test(highlightText) &&
      /FPR:\s*0\.45/.test(highlightText) &&
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
  assertPageRuntimeClean("roc-auc route");
  console.log("OK roc-auc auc scene");
  await page.close();
}

async function smokeBiasVariance(context) {
  const page = await context.newPage();
  const assertPageRuntimeClean = createRuntimeMonitor(page);
  await assertRoute(page, "bias-variance/", "#reference-footer");
  await assertEngineeringSandboxShell(page, "bias-variance route", 6);
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

  for (const y of [7200, 8200, 9200, 10200]) {
    await page.evaluate((nextY) => window.scrollTo(0, nextY), y);
    await page.waitForTimeout(350);
  }
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
  assertPageRuntimeClean("bias-variance route");
  console.log("OK bias-variance double descent scene");
  await page.close();
}

async function smokeTrainTestValidation(context) {
  const page = await context.newPage();
  const assertPageRuntimeClean = createRuntimeMonitor(page);
  await assertRoute(page, "train-test-validation/", "#reference-footer");
  await assertEngineeringSandboxShell(page, "train-test-validation route", 6);
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
    boundary: document.querySelector("#line-decision-boundary")?.getAttribute("x1") || "",
  }));
  await page.locator("button").filter({ hasText: /^Both$/ }).click();
  await page.waitForFunction((previous) => {
    const active = document.querySelector(".button.active")?.textContent?.trim() || "";
    const boundary = document.querySelector("#line-decision-boundary")?.getAttribute("x1") || "";
    return active === "Both" && boundary !== previous.boundary;
  }, modelBefore, { timeout: 5000 });
  console.log("OK train-test-validation feature switch");

  const dragBefore = await page.evaluate(() => ({
    transform: document.querySelector("#chart .bubble-animal[group='train']")?.getAttribute("transform") || "",
    boundary: document.querySelector("#line-decision-boundary")?.getAttribute("x1") || "",
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
    const boundary = document.querySelector("#line-decision-boundary")?.getAttribute("x1") || "";
    return transform !== previous.transform && boundary !== previous.boundary;
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
  assertPageRuntimeClean("train-test-validation route");
  console.log("OK train-test-validation test table");
  await page.close();
}

async function smokeDoubleDescent(context) {
  const page = await context.newPage();
  const assertPageRuntimeClean = createRuntimeMonitor(page);
  await assertRoute(page, "double-descent/", "#reference-footer");
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

async function createSmokeContext(browser) {
  return browser.newContext({
    acceptDownloads: true,
    viewport: { width: 1400, height: 1000 },
  });
}

async function main() {
  phaseLog(`Starting smoke run${selectedGroups.size ? ` [groups: ${Array.from(selectedGroups).join(", ")}]` : ""}${selectedRoutes.size ? ` [routes: ${Array.from(selectedRoutes).join(", ")}]` : ""}`);
  const server = await startServer();
  const browser = await chromium.launch({ headless: true });
  let context = await createSmokeContext(browser);

  try {
    const routePage = await context.newPage();
    const routeChecks = [
      ["", "[data-page-list]"],
    ];

    if (exists("trust")) {
      routeChecks.push(["trust/", "#reference-footer"]);
      routeChecks.push(["docs/trust/", "[data-parity-list]"]);
    }
    if (exists("polygons")) {
      routeChecks.push(["polygons/", "#reference-footer"]);
      routeChecks.push(["docs/polygons/", "[data-parity-list]"]);
    }
    if (exists("ballot")) {
      routeChecks.push(["ballot/", "#reference-footer"]);
      routeChecks.push(["docs/ballot/", "[data-parity-list]"]);
    }
    if (exists("crowds")) {
      routeChecks.push(["crowds/", "#reference-footer"]);
      routeChecks.push(["docs/crowds/", "[data-parity-list]"]);
    }
    if (exists("loopy")) {
      routeChecks.push(["loopy/", "#reference-footer"]);
      routeChecks.push(["docs/loopy/", "[data-parity-list]"]);
    }
    if (exists("neurons")) {
      routeChecks.push(["neurons/", "#reference-footer"]);
      routeChecks.push(["docs/neurons/", "[data-parity-list]"]);
    }
    if (exists("remember")) {
      routeChecks.push(["remember/", "#reference-footer"]);
      routeChecks.push(["docs/remember/", "[data-parity-list]"]);
    }
    if (exists("anxiety")) {
      routeChecks.push(["anxiety/", "#reference-footer"]);
      routeChecks.push(["anxiety/sharing/", "#reference-footer"]);
      routeChecks.push(["docs/anxiety/", "[data-parity-list]"]);
    }

    if (exists("wbwwb")) {
      routeChecks.push(["wbwwb/", "#reference-footer"]);
      routeChecks.push(["docs/wbwwb/", "[data-parity-list]"]);
    }
    if (exists("coming-out-simulator-2014")) {
      routeChecks.push(["coming-out-simulator-2014/", "#reference-footer"]);
      routeChecks.push(["docs/coming-out-simulator-2014/", "[data-parity-list]"]);
    }
    if (exists("covid-19")) {
      routeChecks.push(["covid-19/", "#reference-footer"]);
      routeChecks.push(["docs/covid-19/", "[data-parity-list]"]);
    }
    if (exists("simulating")) {
      routeChecks.push(["simulating/", "main"]);
      routeChecks.push(["simulating/original/", "#splash_iframe"]);
      routeChecks.push(["simulating/model/", "#play_controls"]);
      routeChecks.push(["docs/simulating/", "[data-parity-list]"]);
    }
    if (exists("sim")) {
      routeChecks.push(["sim/", "#play_controls"]);
      routeChecks.push(["docs/sim/", "[data-parity-list]"]);
    }
    if (exists("decision-tree")) {
      routeChecks.push(["decision-tree/", "#reference-footer"]);
      routeChecks.push(["docs/decision-tree/", "[data-parity-list]"]);
    }
    if (exists("random-forest")) {
      routeChecks.push(["random-forest/", "#reference-footer"]);
      routeChecks.push(["docs/random-forest/", "[data-parity-list]"]);
    }
    if (exists("conditional-probability")) {
      routeChecks.push(["conditional-probability/", "#reference-footer"]);
      routeChecks.push(["docs/conditional-probability/", "[data-parity-list]"]);
    }
    if (exists("markov-chains")) {
      routeChecks.push(["markov-chains/", "#reference-footer"]);
      routeChecks.push(["markov-chains/playground/", "#reference-footer"]);
      routeChecks.push(["markov-chains/playground/playground.html", "#reference-footer"]);
      routeChecks.push(["docs/markov-chains/", "[data-parity-list]"]);
    }
    if (exists("principal-component-analysis")) {
      routeChecks.push(["principal-component-analysis/", "#reference-footer"]);
      routeChecks.push(["docs/principal-component-analysis/", "[data-parity-list]"]);
    }
    if (exists("exponentiation")) {
      routeChecks.push(["exponentiation/", "#reference-footer"]);
      routeChecks.push(["docs/exponentiation/", "[data-parity-list]"]);
    }
    if (exists("pi")) {
      routeChecks.push(["pi/", "#reference-footer"]);
      routeChecks.push(["docs/pi/", "[data-parity-list]"]);
    }
    if (exists("sine-and-cosine")) {
      routeChecks.push(["sine-and-cosine/", "#reference-footer"]);
      routeChecks.push(["docs/sine-and-cosine/", "[data-parity-list]"]);
    }
    if (exists("eigenvectors-and-eigenvalues")) {
      routeChecks.push(["eigenvectors-and-eigenvalues/", "#reference-footer"]);
      routeChecks.push(["docs/eigenvectors-and-eigenvalues/", "[data-parity-list]"]);
    }
    if (exists("image-kernels")) {
      routeChecks.push(["image-kernels/", "#reference-footer"]);
      routeChecks.push(["docs/image-kernels/", "[data-parity-list]"]);
    }
    if (exists("ordinary-least-squares-regression")) {
      routeChecks.push(["ordinary-least-squares-regression/", "#reference-footer"]);
      routeChecks.push(["docs/ordinary-least-squares-regression/", "[data-parity-list]"]);
    }
    if (exists("blockchain")) {
      routeChecks.push(["blockchain/", "#reference-footer"]);
      routeChecks.push(["docs/blockchain/", "[data-parity-list]"]);
    }
    if (exists("public-private-keys")) {
      routeChecks.push(["public-private-keys/", "#reference-footer"]);
      routeChecks.push(["docs/public-private-keys/", "[data-parity-list]"]);
    }
    if (exists("zero-knowledge-proof-demo")) {
      routeChecks.push(["zero-knowledge-proof-demo/", "#reference-footer"]);
      routeChecks.push(["docs/zero-knowledge-proof-demo/", "[data-parity-list]"]);
    }
    if (exists("alpha-compositing")) {
      routeChecks.push(["alpha-compositing/", "#reference-footer"]);
      routeChecks.push(["docs/alpha-compositing/", "[data-parity-list]"]);
    }
    if (exists("color-spaces")) {
      routeChecks.push(["color-spaces/", "#reference-footer"]);
      routeChecks.push(["docs/color-spaces/", "[data-parity-list]"]);
    }
    if (exists("sound")) {
      routeChecks.push(["sound/", "#reference-footer"]);
      routeChecks.push(["docs/sound/", "[data-parity-list]"]);
    }
    if (exists("cameras-and-lenses")) {
      routeChecks.push(["cameras-and-lenses/", "#reference-footer"]);
      routeChecks.push(["docs/cameras-and-lenses/", "[data-parity-list]"]);
    }
    if (exists("lights-and-shadows")) {
      routeChecks.push(["lights-and-shadows/", "#reference-footer"]);
      routeChecks.push(["docs/lights-and-shadows/", "[data-parity-list]"]);
    }
    if (exists("tesseract")) {
      routeChecks.push(["tesseract/", "#reference-footer"]);
      routeChecks.push(["docs/tesseract/", "[data-parity-list]"]);
    }
    if (exists("gears")) {
      routeChecks.push(["gears/", "#reference-footer"]);
      routeChecks.push(["docs/gears/", "[data-parity-list]"]);
    }
    if (exists("gps")) {
      routeChecks.push(["gps/", "#reference-footer"]);
      routeChecks.push(["docs/gps/", "[data-parity-list]"]);
    }
    if (exists("earth-and-sun")) {
      routeChecks.push(["earth-and-sun/", "#reference-footer"]);
      routeChecks.push(["docs/earth-and-sun/", "[data-parity-list]"]);
    }
    if (exists("bicycle")) {
      routeChecks.push(["bicycle/", "#reference-footer"]);
      routeChecks.push(["docs/bicycle/", "[data-parity-list]"]);
    }
    if (exists("airfoil")) {
      routeChecks.push(["airfoil/", "#reference-footer"]);
      routeChecks.push(["docs/airfoil/", "[data-parity-list]"]);
    }
    if (exists("curves-and-surfaces")) {
      routeChecks.push(["curves-and-surfaces/", "#reference-footer"]);
      routeChecks.push(["docs/curves-and-surfaces/", "[data-parity-list]"]);
    }
    if (exists("internal-combustion-engine")) {
      routeChecks.push(["internal-combustion-engine/", "#reference-footer"]);
      routeChecks.push(["docs/internal-combustion-engine/", "[data-parity-list]"]);
    }
    if (exists("mechanical-watch")) {
      routeChecks.push(["mechanical-watch/", "#reference-footer"]);
      routeChecks.push(["docs/mechanical-watch/", "[data-parity-list]"]);
    }
    if (exists("naval-architecture")) {
      routeChecks.push(["naval-architecture/", "#reference-footer"]);
      routeChecks.push(["docs/naval-architecture/", "[data-parity-list]"]);
    }
    if (exists("reading-qr-codes-without-a-computer")) {
      routeChecks.push(["reading-qr-codes-without-a-computer/", "#reference-footer"]);
      routeChecks.push(["docs/reading-qr-codes-without-a-computer/", "[data-parity-list]"]);
    }
    if (exists("teoria-interval-ear-training")) {
      routeChecks.push(["teoria-interval-ear-training/", "#reference-footer"]);
      routeChecks.push(["docs/teoria-interval-ear-training/", "[data-parity-list]"]);
    }
    if (exists("teoria-note-ear-training")) {
      routeChecks.push(["teoria-note-ear-training/", "#reference-footer"]);
      routeChecks.push(["docs/teoria-note-ear-training/", "[data-parity-list]"]);
    }
    if (exists("teoria-key-and-note-ear-training")) {
      routeChecks.push(["teoria-key-and-note-ear-training/", "#reference-footer"]);
      routeChecks.push(["docs/teoria-key-and-note-ear-training/", "[data-parity-list]"]);
    }
    if (exists("teoria-random-key-and-note-ear-training")) {
      routeChecks.push(["teoria-random-key-and-note-ear-training/", "#reference-footer"]);
      routeChecks.push(["docs/teoria-random-key-and-note-ear-training/", "[data-parity-list]"]);
    }
    if (exists("teoria-scale-construction")) {
      routeChecks.push(["teoria-scale-construction/", "#reference-footer"]);
      routeChecks.push(["docs/teoria-scale-construction/", "[data-parity-list]"]);
    }
    if (exists("teoria-interval-identification-and-inversion")) {
      routeChecks.push(["teoria-interval-identification-and-inversion/", "#reference-footer"]);
      routeChecks.push(["docs/teoria-interval-identification-and-inversion/", "[data-parity-list]"]);
    }
    if (exists("ableton-learning-music-playground")) {
      routeChecks.push(["ableton-learning-music-playground/", "#reference-footer"]);
      routeChecks.push(["docs/ableton-learning-music-playground/", "[data-parity-list]"]);
    }
    for (const slug of abletonLessonBatchSlugs) {
      if (!exists(slug)) {
        continue;
      }
      routeChecks.push([`${slug}/`, "#reference-footer"]);
      routeChecks.push([`docs/${slug}/`, "[data-parity-list]"]);
    }
    for (const slug of abletonSynthLessonSlugs) {
      if (!exists(slug)) {
        continue;
      }
      routeChecks.push([`${slug}/`, "#reference-footer"]);
      routeChecks.push([`docs/${slug}/`, "[data-parity-list]"]);
    }
    if (exists("chrome-music-lab-song-maker")) {
      routeChecks.push(["chrome-music-lab-song-maker/", "#reference-footer"]);
      routeChecks.push(["docs/chrome-music-lab-song-maker/", "[data-parity-list]"]);
    }
    if (exists("musicmap")) {
      routeChecks.push(["musicmap/", "#reference-footer"]);
      routeChecks.push(["docs/musicmap/", "[data-parity-list]"]);
    }
    if (exists("music-interactive-hub")) {
      routeChecks.push(["music-interactive-hub/", "#reference-footer"]);
      routeChecks.push(["docs/music-interactive-hub/", "[data-parity-list]"]);
    }
    if (exists("memory-allocation")) {
      routeChecks.push(["memory-allocation/", "#reference-footer"]);
      routeChecks.push(["docs/memory-allocation/", "[data-parity-list]"]);
    }
    if (exists("load-balancing")) {
      routeChecks.push(["load-balancing/", "#reference-footer"]);
      routeChecks.push(["docs/load-balancing/", "[data-parity-list]"]);
    }
    if (exists("hysteresis-slack")) {
      routeChecks.push(["hysteresis-slack/", "#reference-footer"]);
      routeChecks.push(["docs/hysteresis-slack/", "[data-parity-list]"]);
    }
    if (exists("rigid-body-collisions")) {
      routeChecks.push(["rigid-body-collisions/", "#reference-footer"]);
      routeChecks.push(["docs/rigid-body-collisions/", "[data-parity-list]"]);
    }
    if (exists("blockchain-101-combined-flow")) {
      routeChecks.push(["blockchain-101-combined-flow/", "#reference-footer"]);
      routeChecks.push(["docs/blockchain-101-combined-flow/", "[data-parity-list]"]);
    }
    if (exists("primary-interactive-hub")) {
      routeChecks.push(["primary-interactive-hub/", "#reference-footer"]);
      routeChecks.push(["docs/primary-interactive-hub/", "[data-parity-list]"]);
    }
    if (exists("linear-regression")) {
      routeChecks.push(["linear-regression/", "#reference-footer"]);
      routeChecks.push(["docs/linear-regression/", "[data-parity-list]"]);
    }
    if (exists("logistic-regression")) {
      routeChecks.push(["logistic-regression/", "#reference-footer"]);
      routeChecks.push(["docs/logistic-regression/", "[data-parity-list]"]);
    }
    if (exists("precision-recall")) {
      routeChecks.push(["precision-recall/", "#reference-footer"]);
      routeChecks.push(["docs/precision-recall/", "[data-parity-list]"]);
    }
    if (exists("roc-auc")) {
      routeChecks.push(["roc-auc/", "#reference-footer"]);
      routeChecks.push(["docs/roc-auc/", "[data-parity-list]"]);
    }
    if (exists("bias-variance")) {
      routeChecks.push(["bias-variance/", "#reference-footer"]);
      routeChecks.push(["docs/bias-variance/", "[data-parity-list]"]);
    }
    if (exists("train-test-validation")) {
      routeChecks.push(["train-test-validation/", "#reference-footer"]);
      routeChecks.push(["docs/train-test-validation/", "[data-parity-list]"]);
    }
    if (exists("double-descent")) {
      routeChecks.push(["double-descent/", "#reference-footer"]);
      routeChecks.push(["docs/double-descent/", "[data-parity-list]"]);
    }
    if (exists("double-descent2")) {
      routeChecks.push(["double-descent2/", "#reference-footer"]);
      routeChecks.push(["docs/double-descent2/", "[data-parity-list]"]);
    }

    for (const [relativePath, selector] of routeChecks) {
      await assertRoute(routePage, relativePath, selector);
    }
    await routePage.close();
    phaseLog("Route checks completed");

    if (exists("remember")) {
      await smokeRemember(context);
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
