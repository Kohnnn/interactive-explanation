import fs from "node:fs";
import { spawnSync } from "node:child_process";
const cwd=new URL("../../../interactive-explanation/",import.meta.url);
const commands=[["check","npm",["run","check"]],["audit","npm",["run","audit"]],["unit","npm",["run","unit"]],["sim","node",["tools/smoke-bundle.mjs",".","--route","sim","--baseline","/tmp/opencode/42-geometry-successor-005.json"]]];
const results=commands.map(([name,cmd,args])=>{const r=spawnSync(cmd,args,{cwd,encoding:"utf8",env:{...process.env,SMOKE_PORT:"4221"},timeout:120000});console.log(name,r.status,r.stderr.trim());return {name,cmd,args,status:r.status,stdout:r.stdout,stderr:r.stderr};});
fs.writeFileSync(new URL("44-sim-gates.json",import.meta.url),JSON.stringify(results,null,2)+"\n");
if(results.slice(0,3).some(r=>r.status!==0))process.exitCode=1;
