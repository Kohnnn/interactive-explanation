import fs from "node:fs";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createThemeContext, createRuntimeMonitor, baseUrl, waitForManifestRouteReady, waitForDocumentLayout, assertDocumentTheme } from "./smoke-bundle.mjs";

export const simReferenceSha = "94bb7ebc9daaf651a59cbbc6a1e9a11220001df1";
export const simCells = ["sim/mobile/light", "sim/mobile/dark", "sim/narrow/light", "sim/narrow/dark"];
const inventorySha256 = "c07300985b64ca156abba61602a1c48eb29c69bcd8445d2831031ffe21c551c8";
const hash = bytes => createHash("sha256").update(bytes).digest("hex");

export function simSource(root) {
  const git = args => execFileSync("git", args, { cwd: root, encoding: "utf8" });
  return {
    revision: git(["rev-parse", "HEAD"]).trim(),
    inventory: git(["ls-tree", "-r", "HEAD", "--", "sim", "shared", "package-lock.json"]),
    entry: JSON.parse(fs.readFileSync(`${root}/routes.manifest.json`, "utf8")).find(route => route.slug === "sim"),
  };
}

export function verifySimSources(reference, head) {
  assert.equal(reference.revision, simReferenceSha, "Wrong fixed Sim reference revision");
  assert.equal(hash(reference.inventory), inventorySha256, "Fixed Sim dependency inventory differs");
  assert.equal(head.inventory, reference.inventory, "Sim route/shared/lock paths, modes or blobs differ");
  assert(reference.entry?.slug === "sim", "Missing Sim manifest entry");
  assert.equal(hash(JSON.stringify(reference.entry)), "f9e9cd0f06a722887d994c9bf1dd2c3688eb9e886ca3a9d0ed2b09e5e0d8f7df", "Fixed Sim manifest entry differs");
  assert.deepEqual(head.entry, reference.entry, "Sim manifest entry differs");
  return { referenceSha: simReferenceSha, inventorySha256, entry: reference.entry, cells: simCells };
}

export async function verifySimNative(browser, cell) {
  const context = await createThemeContext(browser, { theme: cell.theme, stored: true, viewport: cell.viewport });
  try {
    const page = await context.newPage();
    const clean = createRuntimeMonitor(page, { networkPolicy: cell.route.experience.networkPolicy });
    const response = await page.goto(`${baseUrl}sim/?paused=1`, { waitUntil: "load" });
    assert(response?.ok(), "Sim navigation failed");
    await waitForManifestRouteReady(page, cell.route);
    await assertDocumentTheme(page, cell.theme, "Sim fixed-reference acceptance");
    const grid = () => page.evaluate(() => ({
      count: Grid.array.flat().length,
      tiles: Grid.dom.querySelectorAll(":scope > div > div").length,
      valid: Grid.tileSize > 0 && Grid.array.every((row, y) => row.every((agent, x) => {
        const tile = Grid.dom.children[y].children[x];
        const rect = tile.getBoundingClientRect();
        const bounds = Grid.dom.getBoundingClientRect();
        return tile.textContent === Model.getStateByID(agent.stateID).icon && rect.width > 0 && rect.height > 0 && rect.left >= bounds.left && rect.right <= bounds.right && rect.top >= bounds.top && rect.bottom <= bounds.bottom;
      })),
      overflow: document.documentElement.scrollWidth > innerWidth,
    }));
    const check = async () => {
      const state = await grid();
      assert.equal(state.count, 1320, "Default Sim model changed");
      assert.equal(state.tiles, 1320, "Sim render count differs");
      assert(state.valid && !state.overflow, `Sim tiles or viewport invalid: ${JSON.stringify(state)}`);
      return state;
    };
    const initial = await check();
    const description = page.getByRole("textbox", { name: "Description of your simulation", exact: true });
    const original = await description.inputValue();
    await description.fill("Geometry qualification native edit");
    assert.equal(await page.evaluate(() => Model.data.meta.description), "Geometry qualification native edit");
    await description.fill(original);
    assert.equal(await page.evaluate(() => Model.data.meta.description), original);
    if (await page.evaluate(() => Grid.array[5][5].stateID === Model.data.meta.draw)) await page.locator("#play_draw").click();
    await page.evaluate(() => scrollTo(0, 0));
    const point = await page.evaluate(() => { const rect = Grid.dom.getBoundingClientRect(); return { x: rect.left + 5.5 * Grid.tileSize, y: rect.top + 5.5 * Grid.tileSize }; });
    await page.mouse.click(point.x, point.y);
    assert(await page.evaluate(() => Grid.array[5][5].stateID === Model.data.meta.draw), "Sim brush did not paint target");
    await check();
    const before = await page.evaluate(() => Grid.array.flat().map(agent => agent.stateID).join(","));
    await page.locator("#play_pause").click();
    await page.waitForFunction(previous => Grid.array.flat().map(agent => agent.stateID).join(",") !== previous, before, { timeout: 5000 });
    await page.locator("#play_pause").click();
    assert.equal(await page.evaluate(() => Model.isPlaying), false, "Sim did not pause");
    await check();
    await page.setViewportSize({ ...cell.viewport, width: cell.viewport.width + 10 });
    await waitForDocumentLayout(page);
    await check();
    await page.setViewportSize({ width: cell.viewport.width, height: cell.viewport.height });
    await waitForDocumentLayout(page);
    await check();
    await clean.ready();
    await clean("Sim native qualification");
    return { status: "passed", initial, draw: true, evolution: true, pause: true, editRestore: true, resize: true };
  } finally { await context.close(); }
}
