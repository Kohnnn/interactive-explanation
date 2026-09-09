import fs from "node:fs";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { performanceRegressions } from "../../../interactive-explanation/tools/experience-baseline.mjs";
const read = p => fs.readFileSync(p,"utf8").trim().split("\n").map(JSON.parse);
const dir = new URL("./",import.meta.url);
const baseline=JSON.parse(fs.readFileSync("/tmp/opencode/42-geometry-successor-005.json"));
const evidence={baselineSha256:createHash("sha256").update(fs.readFileSync("/tmp/opencode/42-geometry-successor-005.json")).digest("hex"),baseline:baseline.routes.sim,sides:{},cells:[]};
const stats=values=>{const a=[...values].sort((a,b)=>a-b);assert.equal(a.length,3);return {min:a[0],median:a[1],max:a[2]};};
for(const side of ["before","after"]){
 const raw=read(`/tmp/opencode/44-sim-passive-${side === "after" ? "after-final5" : side}.jsonl`);
 const samples=raw.filter(r=>r.type==="sample");
 assert.equal(samples.length,18);
 assert(samples.every(r=>r.ready && r.status==="measured" && !r.errors.length));
 const operational=read(`/tmp/opencode/44-sim-${side==="after"?"after-final5":"before"}.jsonl`);
 assert.equal(operational.length,18);
 assert(operational.every(r=>side==="after"?r.status==="passed":r.failure==="Initialized grid has zero-size tiles"));
 evidence.sides[side]={identity:raw.find(r=>r.type==="identity"),browser:raw.find(r=>r.type==="browser"),samples:samples.map(({events,raw,...r})=>({...r,documentWidth:raw.documentWidth,viewportWidth:raw.viewportWidth,resources:raw.resources.map(r=>({name:r.name,transferSize:r.transferSize,status:r.responseStatus})),httpErrors:events.filter(e=>e.type==="response"&&e.status>=400)})),operational};
}
for(const width of ["desktop","mobile","narrow"])for(const theme of ["light","dark"]){
 const groups=Object.fromEntries(["before","after"].map(s=>[s,evidence.sides[s].samples.filter(r=>r.viewport.name===width && r.theme===theme)]));
 for(const rows of Object.values(groups))assert.deepEqual(rows.map(r=>r.sample).sort(),[1,2,3]);
 const cell={width,theme,metrics:{}};
 for(const metric of ["domContentLoadedMs","loadMs","resourceCount","bytes"]){
  const val=r=>metric==="bytes"?r.performance.sameOriginTransfer.bytes:r.performance[metric];
  cell.metrics[metric]=Object.fromEntries(Object.entries(groups).map(([s,rs])=>[s,stats(rs.map(val))]));
 }
 cell.referenceFailures=groups.after.map(r=>performanceRegressions(r.performance,baseline.routes.sim[theme]));
 cell.geometry=Object.fromEntries(Object.entries(groups).map(([s,rs])=>[s,rs.map(r=>r.geometry)]));
 cell.overflow=groups.after.map(r=>r.documentWidth-r.viewportWidth);
 assert(cell.overflow.every(n=>n===0));
 evidence.cells.push(cell);
}
fs.writeFileSync(new URL("44-sim-evidence.json",dir),JSON.stringify(evidence,null,2)+"\n");
console.log(evidence.cells.map(c=>({width:c.width,theme:c.theme,metrics:c.metrics,overflow:c.overflow,referenceFailures:c.referenceFailures})));
