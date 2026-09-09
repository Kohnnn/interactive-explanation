import fs from "node:fs";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { sourceIdentity } from "../../../interactive-explanation/tools/diagnose-baseline.mjs";
const root = new URL("../../../", import.meta.url).pathname;
const source = sourceIdentity(`${root}interactive-explanation`);
const review = JSON.parse(fs.readFileSync(new URL("46-review-006.json", import.meta.url)));
assert.equal(source.digest, review.source.digest);
const baseline = "/tmp/opencode/46-geometry-successor-006.json";
assert.equal(createHash("sha256").update(fs.readFileSync(baseline)).digest("hex"), review.successorSha256);
const previous = JSON.parse(fs.readFileSync(new URL("43-final-results.json", import.meta.url)));
const jobs = previous.results.filter(row => row.name !== "ttv-geometry-rebind").map(row => ({name:row.name,args:row.args.map(arg => arg === "/tmp/opencode/42-geometry-successor-005.json" ? baseline : arg)}));
assert.equal(jobs.length,144);
const journal = "/tmp/opencode/46-final-gates.jsonl";
const retained = process.argv.includes("--resume") ? fs.readFileSync(journal,"utf8").trim().split("\n").map(JSON.parse) : [];
if (retained.length) assert.equal(retained[0].source.digest,source.digest);
const fd = fs.openSync(journal,retained.length ? "a" : "wx");
const append = row => {fs.writeSync(fd,JSON.stringify(row)+"\n");fs.fsyncSync(fd);};
if (!retained.length) append({type:"identity",source,baseline,baselineSha256:review.successorSha256,startedAt:new Date().toISOString(),concurrency:1});
else append({type:"resume",reason:"Launcher shell timeout interrupted combined strict before result; incomplete attempt not counted or passed",at:new Date().toISOString()});
for(const {name,args} of jobs.filter(job => !retained.some(row=>row.type==="result"&&row.name===job.name))) {
 const startedAt = new Date().toISOString();
 const r = spawnSync(process.execPath,args,{cwd:root,env:{...process.env,SMOKE_PORT:"4231",SMOKE_VERBOSE:"0"},encoding:"utf8",timeout:3600000,maxBuffer:32*1024*1024});
 append({type:"result",name,command:process.execPath,args,startedAt,finishedAt:new Date().toISOString(),exit:r.status,signal:r.signal,error:r.error?.message,stdout:r.stdout,stderr:r.stderr});
}
assert.equal(sourceIdentity(`${root}interactive-explanation`).digest,source.digest);
append({type:"complete",sourceUnchanged:true,finishedAt:new Date().toISOString()});
fs.closeSync(fd);
