import fs from "node:fs";
import { spawnSync } from "node:child_process";
const slugs = ["exponentiation","public-private-keys","linear-regression","precision-recall","train-test-validation","memory-allocation","blockchain-101-combined-flow"];
const output = fs.openSync(process.argv[2],"wx");
const commands = [
  ["check", "npm", ["--prefix","interactive-explanation","run","check"]],
  ["unit", "npm", ["--prefix","interactive-explanation","run","unit"]],
  ["audit", "node", ["interactive-explanation/tools/check-public-surface.mjs","interactive-explanation"]],
  ...slugs.flatMap(slug=>[false,true].map(strict=>[`${slug}${strict ? "-strict" : ""}`,"node",["interactive-explanation/tools/smoke-bundle.mjs","interactive-explanation","--baseline","../.scratch/complete-route-experience/research/01-w0-geometry-successor-003.json","--route",slug,...(strict ? ["--experience"] : []),"--verbose"]])),
];
try {
 for(const [name,command,args] of commands) {
   const startedAt=new Date().toISOString();
   const result=spawnSync(command,args,{encoding:"utf8",env:{...process.env,SMOKE_PORT:"4223"},timeout:180000,maxBuffer:16*1024*1024});
   fs.writeSync(output,JSON.stringify({name,command,args,startedAt,finishedAt:new Date().toISOString(),exit:result.status,signal:result.signal,error:result.error?.message,stdout:result.stdout,stderr:result.stderr})+"\n");
   console.log(name,result.status,result.stderr?.split("\n")[0] || "");
 }
} finally {fs.closeSync(output);}
