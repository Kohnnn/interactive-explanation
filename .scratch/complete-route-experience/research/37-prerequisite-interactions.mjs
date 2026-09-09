import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
const root = path.resolve(process.argv[2] || "interactive-explanation");
const require = createRequire(path.join(root, "package.json"));
const { chromium } = require("playwright");
const smoke = await import(pathToFileURL(path.join(root, "tools/smoke-bundle.mjs")));
const { createSmokeServer } = await import(pathToFileURL(path.join(root, "tools/smoke/server.mjs")));
const routes = JSON.parse(fs.readFileSync(path.join(root, "pages.json"))).filter(r => r.shell.family === "ableton-synths" || ["decision-tree", "markov-chains", "rigid-body-collisions"].includes(r.slug));
const output = fs.openSync(process.argv[3], "wx");
const server = await createSmokeServer({ rootDir:root, host:"127.0.0.1", port:4211, mountPath:"/interactive-explanation/" }).start();
const browser = await chromium.launch();
let failures = 0;
try {
for (const route of routes) for (const viewport of [{width:1400,height:1000},{width:390,height:844},{width:320,height:844}]) for (const theme of ["light","dark"]) for(let sample=1;sample<=3;sample++) {
 const context = await smoke.createThemeContext(browser,{theme,stored:true,viewport});
 const page = await context.newPage();
 const result = {slug:route.slug,viewport,theme,sample,browser:browser.version(),startedAt:new Date().toISOString(),events:[]};
 page.on("requestfailed",r=>result.events.push({type:"requestfailed",url:r.url(),error:r.failure()?.errorText}));
 page.on("console",m=>{if(m.type()==="error")result.events.push({type:"console",message:m.text()});});
 page.on("pageerror",e=>result.events.push({type:"pageerror",message:e.message}));
 try {
 await page.goto(`http://127.0.0.1:4211/interactive-explanation/${route.slug}/`);
 await smoke.waitForManifestRouteReady(page,route);
 await page.waitForLoadState("networkidle");
 result.width = await page.evaluate(()=>document.documentElement.scrollWidth);
 const start = performance.now();
 if(route.shell.family === "ableton-synths") {
  assert(result.width<=viewport.width,`Overflow ${result.width-viewport.width}`);
  const button = page.locator('.components_lesson-viewer__toc-toggle');
  await button.focus(); await page.keyboard.press("Enter");
  await page.waitForFunction(()=>document.body.classList.contains('show-toc'), null, {timeout:5000});
  await page.waitForTimeout(400);
  result.open = await page.locator('.components_lesson-viewer__toc-menu').boundingBox();
  await page.keyboard.press("Escape");
  await page.waitForFunction(()=>!document.body.classList.contains('show-toc'), null, {timeout:5000});
  result.interaction = "keyboard open and Escape close chapters";
 } else if(route.slug === "decision-tree") {
  const link = page.locator('a[aria-label="Back to replicas"]');
  await link.scrollIntoViewIfNeeded();
  const image = await link.locator('img').boundingBox(); result.image=image;
  assert(image.x>=0 && image.x+image.width<=viewport.width,"Home image offscreen");
  await link.focus(); await page.keyboard.press("Enter");
  await page.waitForURL('**/interactive-explanation/');
  result.interaction = "visible home image, keyboard navigation to atlas";
 } else if(route.slug === "markov-chains") {
  const frame = page.frames().find(f=>f.url().includes('/playground/playground.html'));
  assert(frame,"Missing child");
  const editor = frame.getByRole('textbox',{name:"Transition matrix as JSON"});
  await editor.fill('[[1,0],[0,1]]');
  await frame.waitForFunction(()=>document.querySelector('textarea').classList.contains('valid') && document.querySelectorAll('.nodes .node').length===2);
  result.child = {url:frame.url(),nodes:await frame.locator('.nodes .node').count(),matrix:await editor.inputValue()};
  const speed=frame.locator('#playground-speed'); await speed.focus(); const before=await speed.inputValue(); await speed.press('ArrowRight'); assert.notEqual(await speed.inputValue(),before);
  await editor.fill('invalid'); await frame.waitForFunction(()=>!document.querySelector('textarea').classList.contains('valid'));
  await editor.fill('[[0.5,0.5],[0.5,0.5]]'); await frame.waitForFunction(()=>document.querySelector('textarea').classList.contains('valid'));
  result.interaction="separate child matrix edit, node update, keyboard speed, invalid and recovery";
 } else {
  result.controls=await page.locator('input[type=range]').count();
  assert(result.controls>0,"Lesson controls absent");
  const slider=page.locator('input[type=range]').first(); await slider.focus(); const before=await slider.inputValue(); await slider.press('ArrowRight'); await slider.press('ArrowLeft');
  result.interaction="retained lesson slider keyboard input; initialization remains blocked";
 }
 result.interactionMs=performance.now()-start;
 result.status="passed";
 } catch(e) {result.status="failed";result.error=e.message;failures++;}
 fs.writeSync(output,JSON.stringify(result)+"\n");
 await context.close();
}
} finally {fs.closeSync(output);await browser.close();await new Promise(r=>server.close(r));}
console.log(JSON.stringify({failures}));
process.exitCode=failures?1:0;
