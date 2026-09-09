import fs from "node:fs";
import { createHash } from "node:crypto";
import { statistics } from "../../../interactive-explanation/tools/diagnose-baseline.mjs";
const read = file => fs.readFileSync(file,"utf8").trim().split("\n").map(JSON.parse);
const before = read("/tmp/opencode/39-owned-interactions-before.jsonl");
const after = read("/tmp/opencode/39-owned-final-interactions-after.jsonl");
const evidence = JSON.parse(fs.readFileSync(".scratch/complete-route-experience/research/39-owned-reflow-final-evidence.json"));
const summary = evidence.cells.map(cell => {
 const [slug,viewport,theme]=cell.key.split("/");
 const select=rows=>rows.filter(r=>r.slug === slug && r.viewport.name === viewport && r.theme === theme);
 const b=select(before),a=select(after);
 return {key:cell.key,beforeCount:b.length,afterCount:a.length,beforeFailures:b.filter(r=>r.status !== "passed").map(r=>r.error),afterFailures:a.filter(r=>r.status !== "passed").map(r=>r.error),before:statistics(b.map(r=>r.interactionMs)),after:statistics(a.map(r=>r.interactionMs)),afterActions:a.map(r=>r.action),scroll:a.map(r=>r.scroll),events:a.map(r=>r.events)};
});
const files=["/tmp/opencode/39-owned-before.jsonl","/tmp/opencode/39-owned-after.jsonl","/tmp/opencode/39-owned-repeat-before.jsonl","/tmp/opencode/39-owned-repeat-after.jsonl","/tmp/opencode/39-owned-final-before.jsonl","/tmp/opencode/39-owned-final-after.jsonl","/tmp/opencode/39-owned-interactions-before.jsonl","/tmp/opencode/39-owned-interactions-after.jsonl","/tmp/opencode/39-owned-final-interactions-after.jsonl","/tmp/opencode/39-owned-final-repro.json"];
const artifacts=files.map(file=>{const bytes=fs.readFileSync(file);return {file,bytes:bytes.length,sha256:createHash("sha256").update(bytes).digest("hex")};});
fs.writeFileSync(process.argv[2],JSON.stringify({artifacts,summary},null,2)+"\n",{flag:"wx"});
console.log(JSON.stringify({pass:after.filter(r=>r.status === "passed").length,fail:after.filter(r=>r.status !== "passed").length,resourceDeltas:[...new Set(evidence.cells.map(c=>c.metrics.resourceCount.delta))],maxTransferDelta:Math.max(...evidence.cells.map(c=>c.metrics.transferBytes.delta)),widths:evidence.cells.filter(c=>c.key.endsWith("/narrow/light")).map(c=>({key:c.key,before:c.beforeWidth,after:c.afterWidth})),topResources:evidence.cells.filter(c=>c.key.endsWith("/desktop/light")).map(c=>({key:c.key,resources:c.topResources.slice(0,2)}))},null,2));
