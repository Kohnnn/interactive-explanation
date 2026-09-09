import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const root = path.resolve(process.argv[2] || "interactive-explanation");
const output = path.resolve(process.argv[3] || "/tmp/opencode/source-font-evidence");
const require = createRequire(path.join(root, "package.json"));
const { chromium } = require("playwright");
const { createSmokeServer } = await import(pathToFileURL(path.join(root, "tools/smoke/server.mjs")));
assert(!fs.existsSync(path.join(root, "wbwwb/css/Cairo-Regular.ttf")));
fs.mkdirSync(output, { recursive: true });
const server = await createSmokeServer({ rootDir: root, host: "127.0.0.1", port: 4218, mountPath: "/interactive-explanation/" }).start();
const browser = await chromium.launch({ headless: true });
const results = [];
try {
  for (const width of [320, 390, 1400]) {
    for (const theme of ["light", "dark"]) {
      const page = await browser.newPage({ viewport: { width, height: width === 1400 ? 1000 : 844 } });
      const errors = [];
      page.on("pageerror", error => errors.push(error.message));
      await page.addInitScript(value => localStorage.setItem("theme", value), theme);
      await page.goto("http://127.0.0.1:4218/interactive-explanation/wbwwb/");
      await page.waitForFunction(() => window.Game?.sounds?.squeak && window.Game?.sceneManager);
      await page.waitForTimeout(2000);
      for (const scene of ["Preloader", "Quote", "Credits", "Post_Post_Credits"]) {
        if (scene !== "Preloader") await page.evaluate(name => Game.sceneManager.gotoScene(name), scene);
        await page.waitForTimeout(200);
        const measured = await page.evaluate(() => {
          const texts = [];
          function walk(node) {
            if (node instanceof PIXI.Text) {
              const box = node.getBounds();
              texts.push({ text: node.text, x: box.x, y: box.y, width: box.width, height: box.height });
            }
            if (node.children) node.children.forEach(walk);
          }
          walk(Game.stage);
          return { texts, width: Game.renderer.width, height: Game.renderer.height, theme: document.documentElement.getAttribute("saved-theme") };
        });
        assert.equal(measured.width, 960);
        assert.equal(measured.height, 540);
        assert.equal(measured.theme, theme);
        for (const text of measured.texts) {
          assert(text.x >= -1 && text.x + text.width <= 961, `${scene}: horizontal text clipping ${JSON.stringify(text)}`);
          assert(text.y >= -1 && text.y + text.height <= 541, `${scene}: vertical text clipping ${JSON.stringify(text)}`);
        }
        await page.evaluate(() => {
          function reveal(node) { node.alpha = 1; node.visible = true; if (node.children) node.children.forEach(reveal); }
          reveal(Game.stage);
          if (Game.stage.children[1]?.children?.length === 3) {
            for (const group of Game.stage.children[1].children) {
              for (const child of group.children || []) if (!(child instanceof PIXI.Text)) child.visible = false;
            }
          }
        });
        await page.screenshot({ path: path.join(output, `${width}-${theme}-${scene}.png`) });
        results.push({ width, theme, scene, ...measured });
      }
      const credits = page.getByRole("link", { name: "Credits and licenses", exact: true });
      await credits.focus();
      assert(await credits.evaluate(el => {
        const box = el.getBoundingClientRect();
        return document.activeElement === el && box.height >= 44 && el.contains(document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2));
      }), "Credits link must be focused and unobscured");
      await credits.press("Enter");
      await page.waitForURL("**/docs/wbwwb/#credits");
      assert.equal(errors.length, 0, errors.join("\n"));
      await page.close();
    }
  }
  fs.writeFileSync(path.join(output, "measurements.json"), JSON.stringify({ browser: browser.version(), results }, null, 2));
  console.log(`PASS ${results.length} font scene/viewport/theme checks; screenshots: ${output}`);
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
