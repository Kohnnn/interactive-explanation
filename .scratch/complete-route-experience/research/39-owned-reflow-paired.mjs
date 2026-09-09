import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { capture, planCells, summarizeCell, sourceIdentity, openJournal } from "../../../interactive-explanation/tools/diagnose-baseline.mjs";
import * as smoke from "../../../interactive-explanation/tools/smoke-bundle.mjs";
import { createSmokeServer } from "../../../interactive-explanation/tools/smoke/server.mjs";
const root = path.resolve("interactive-explanation");
const preimage = "/tmp/opencode/39-owned-preimage/interactive-explanation";
const require = createRequire(path.join(root,"package.json"));
const { chromium } = require("playwright");
const hash = bytes => createHash("sha256").update(bytes).digest("hex");
const originalIdentity = JSON.parse(fs.readFileSync("/tmp/opencode/39-owned-before.jsonl","utf8").split("\n")[0]);
for (const [file, digest] of originalIdentity.source.files) assert.equal(hash(fs.readFileSync(path.join(preimage,file))),digest,file);
const currentIdentity = sourceIdentity(root);
const slugs = ["exponentiation","public-private-keys","linear-regression","precision-recall","train-test-validation","memory-allocation","blockchain-101-combined-flow"];
const cells = planCells(JSON.parse(fs.readFileSync(path.join(root,"routes.manifest.json"))),slugs);
const journals = Object.fromEntries(["before","after"].map(side=>[side,openJournal(`${process.argv[2] || "/tmp/opencode/39-owned-repeat"}-${side}.jsonl`)]));
const browser = await chromium.launch();
for (const side of ["before","after"]) journals[side].append({type:"identity",side,source:side === "before" ? originalIdentity.source : currentIdentity,browser:browser.version(),method:"all 42 cells; alternating BEFORE/AFTER per sample; fresh context; original diagnostic fixture; identical port; immutable archive verified against every original source SHA256",concurrency:1});
try {
  for (const cell of cells) {
    const samples = {before:[],after:[]};
    for(let sample=1;sample<=3;sample++) for(const side of ["before","after"]) {
      const server = await createSmokeServer({rootDir:side === "before" ? preimage : root,host:smoke.host,port:smoke.port,mountPath:smoke.mountPath}).start();
      try {
        const result = {...await capture(browser,cell),sample};
        samples[side].push(result);
        journals[side].append({type:"sample",...result});
      } finally { server.closeAllConnections(); await new Promise(resolve=>server.close(resolve)); }
    }
    for(const side of ["before","after"]) journals[side].append({type:"cell",...summarizeCell(samples[side])});
  }
} finally {
  await browser.close();
  const after = sourceIdentity(root);
  assert.equal(after.digest,currentIdentity.digest);
  for (const [file,digest] of originalIdentity.source.files) assert.equal(hash(fs.readFileSync(path.join(preimage,file))),digest,file);
  for(const side of ["before","after"]) { journals[side].append({type:"source-end",unchanged:true}); journals[side].close(); }
}
