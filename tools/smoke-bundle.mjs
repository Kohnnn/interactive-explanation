import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { chromium } from "playwright";

const rootDir = path.resolve(process.argv[2] || path.join(process.cwd(), "interactive-explanation"));
const port = Number(process.env.SMOKE_PORT || 4173);
const host = "127.0.0.1";
const mountPath = "/interactive-explanation/";
const baseUrl = `http://${host}:${port}${mountPath}`;

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".m4a": "audio/mp4",
  ".md": "text/markdown; charset=utf-8",
  ".mp3": "audio/mpeg",
  ".opus": "audio/ogg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
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

function exists(relativePath) {
  return fs.existsSync(path.join(rootDir, relativePath));
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

async function setRangeValue(page, selector, value) {
  await page.locator(selector).evaluate((element, nextValue) => {
    element.value = String(nextValue);
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  }, value);
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
  console.log("OK decision-tree information gain hover");
  await page.close();
}

async function smokeRandomForest(context) {
  const page = await context.newPage();
  await assertRoute(page, "random-forest/", "#reference-footer");
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
  await assertRoute(page, "markov-chains/", "#reference-footer");
  await page.waitForFunction(() => {
    return document.querySelectorAll(".st-diagram svg").length >= 2 &&
      document.querySelector("iframe.playground");
  }, null, { timeout: 20000 });

  const initialSrc = await page.locator("iframe.playground").getAttribute("src");
  assert(
    (initialSrc || "").startsWith("./playground/playground.html"),
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
    return currentSrc !== previousSrc && currentSrc.includes("./playground/playground.html?");
  }, initialSrc, { timeout: 5000 });

  const fullscreenHref = await page.locator('a[href="./playground/playground.html"]').getAttribute("href");
  assert(fullscreenHref === "./playground/playground.html", "markov-chains fullscreen handoff did not localize");
  console.log("OK markov-chains article handoff");
  await page.close();

  const playgroundPage = await context.newPage();
  await assertRoute(playgroundPage, "markov-chains/playground/playground.html", "#reference-footer");
  await playgroundPage.waitForSelector(".matrixInput textarea", { timeout: 15000 });
  await playgroundPage.locator(".matrixInput textarea").fill("[[0.3,0.3,0.4],[0.3,0.5,0.2],[0.4,0.4,0.2]]");
  await playgroundPage.waitForFunction(() => {
    const scope = angular.element(document.body).scope();
    return scope.validTransitionMatrix === true && Array.isArray(scope.states) && scope.states.length === 3;
  }, null, { timeout: 5000 });
  console.log("OK markov-chains playground editor");
  await playgroundPage.close();
}

async function main() {
  const server = await startServer();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    acceptDownloads: true,
    viewport: { width: 1400, height: 1000 },
  });

  try {
    const routePage = await context.newPage();
    const routeChecks = [
      ["", "[data-page-list]"],
      ["trust/", "#reference-footer"],
      ["polygons/", "#reference-footer"],
      ["ballot/", "#reference-footer"],
      ["crowds/", "#reference-footer"],
      ["loopy/", "#reference-footer"],
      ["neurons/", "#reference-footer"],
      ["remember/", "#reference-footer"],
      ["anxiety/", "#reference-footer"],
      ["anxiety/sharing/", "#reference-footer"],
      ["docs/trust/", "[data-parity-list]"],
      ["docs/polygons/", "[data-parity-list]"],
      ["docs/ballot/", "[data-parity-list]"],
      ["docs/crowds/", "[data-parity-list]"],
      ["docs/loopy/", "[data-parity-list]"],
      ["docs/neurons/", "[data-parity-list]"],
      ["docs/remember/", "[data-parity-list]"],
      ["docs/anxiety/", "[data-parity-list]"],
    ];

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
      routeChecks.push(["markov-chains/playground/playground.html", "#reference-footer"]);
      routeChecks.push(["docs/markov-chains/", "[data-parity-list]"]);
    }

    for (const [relativePath, selector] of routeChecks) {
      await assertRoute(routePage, relativePath, selector);
    }
    await routePage.close();

    await smokeRemember(context);
    await smokeAnxiety(context);
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
