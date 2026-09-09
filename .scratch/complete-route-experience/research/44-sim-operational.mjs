import fs from "node:fs";
import assert from "node:assert/strict";
import path from "node:path";
import { chromium } from "../../../interactive-explanation/node_modules/playwright/index.mjs";
import { createSmokeServer } from "../../../interactive-explanation/tools/smoke/server.mjs";
const [root, output] = process.argv.slice(2);
const server = await createSmokeServer({rootDir:path.resolve(root),host:"127.0.0.1",port:4221,mountPath:"/interactive-explanation/"}).start();
const browser = await chromium.launch();
const fd=fs.openSync(output,"wx");
try {
 for(const width of [1400,390,320]) for(const theme of ["light","dark"]) for(let sample=1;sample<=3;sample++) {
  const context=await browser.newContext({viewport:{width,height:width===1400?1000:844},colorScheme:theme});
  const page=await context.newPage();
  const row={root,width,theme,sample,errors:[]};
  page.on("pageerror",e=>row.errors.push(e.message));
  try {
   await page.goto("http://127.0.0.1:4221/interactive-explanation/sim/?paused=1");
   await page.waitForFunction(()=>window.Grid?.array?.length && document.fonts.status==="loaded" && document.querySelector("main").getAttribute("aria-busy")!=="true");
   await page.waitForTimeout(100);
   row.initial=await page.evaluate(()=>({tile:Grid.tileSize,rows:Grid.array.length,columns:Grid.array[0].length,rect:Grid.dom.getBoundingClientRect().toJSON(),cells:Grid.dom.querySelectorAll(":scope > div > div").length,canvasCount:document.querySelectorAll("canvas").length,overflow:document.documentElement.scrollWidth-innerWidth,resources:performance.getEntriesByType("resource").map(r=>({name:r.name,bytes:r.transferSize,status:r.responseStatus})),navigation:performance.getEntriesByType("navigation")[0].toJSON()}));
   assert(row.initial.tile>0,"Initialized grid has zero-size tiles");
   assert.equal(row.initial.cells,row.initial.rows*row.initial.columns);
   assert.equal(row.initial.overflow,0);
    row.typography = await page.evaluate(async () => {
     const before = JSON.stringify(Model.data);
     const states = Grid.array.flat().map(agent => agent.stateID).join(",");
     await settleEditorTypography();
     await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
     return { modelUnchanged: before === JSON.stringify(Model.data), statesUnchanged: states === Grid.array.flat().map(agent => agent.stateID).join(","), rendered: Grid.array.every((r,y)=>r.every((a,x)=>Grid.dom.children[y].children[x].textContent===Model.getStateByID(a.stateID).icon)) };
    });
    assert(row.typography.modelUnchanged && row.typography.statesUnchanged && row.typography.rendered, "Typography resize changed model or lost rendered cells");
    const description = page.getByRole("textbox", { name: "Description of your simulation", exact: true });
    const original = await description.inputValue();
    await description.fill("Review correction: real editor input");
    assert.equal(await page.evaluate(() => Model.data.meta.description), "Review correction: real editor input");
    await description.fill(original);
    assert.equal(await page.evaluate(() => Model.data.meta.description), original);
    row.edit = "native input updates and restores model description";
    const target=await page.evaluate(()=>{
    const agent=Grid.array[5][5];
    return {state:agent.stateID,brush:Model.data.meta.draw};
   });
   if(target.state===target.brush) await page.locator("#play_draw").click();
   await page.evaluate(()=>scrollTo(0,0));
   const point=await page.evaluate(()=>{const r=Grid.dom.getBoundingClientRect();return {x:r.left+5.5*Grid.tileSize,y:r.top+5.5*Grid.tileSize};});
   await page.mouse.click(point.x,point.y);
   row.draw=await page.evaluate(()=>({state:Grid.array[5][5].stateID,brush:Model.data.meta.draw,text:Grid.dom.children[5].children[5].textContent,icon:Model.getStateByID(Model.data.meta.draw).icon}));
   assert.equal(row.draw.state,row.draw.brush,"Pointer did not paint intended model cell");
   assert.equal(row.draw.text,row.draw.icon,"Painted cell not rendered");
   const before=await page.evaluate(()=>Grid.array.flat().map(a=>a.stateID).join(","));
   await page.locator("#play_pause").click();
   await page.evaluate(()=>scrollTo(0,0));
   await page.waitForFunction(old=>Grid.array.flat().map(a=>a.stateID).join(",")!==old,before,{timeout:5000});
   await page.locator("#play_pause").click();
   row.play=await page.evaluate(()=>({playing:Model.isPlaying,matches:Grid.array.every((r,y)=>r.every((a,x)=>Grid.dom.children[y].children[x].textContent===Model.getStateByID(a.stateID).icon))}));
   assert(!row.play.playing && row.play.matches,"Play did not render model state");
   await page.setViewportSize({width:width===1400?1200:width+10,height:width===1400?900:800});
   await page.waitForTimeout(100);
   assert(await page.evaluate(()=>Grid.tileSize>0 && Grid.dom.getBoundingClientRect().width<=innerWidth),"Resize broke grid");
   assert.equal(row.errors.length,0);
   row.status="passed";
  } catch(e){row.status="failed";row.failure=e.message;}
  finally {fs.writeSync(fd,JSON.stringify(row)+"\n");await context.close();}
 }
} finally {fs.closeSync(fd);await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
const results = fs.readFileSync(output, "utf8").trim().split("\n").map(JSON.parse);
assert.equal(results.length, 18);
assert.equal(results.filter(row => row.status === "passed").length, 18, "Actual Sim tasks failed; all rows retained");
