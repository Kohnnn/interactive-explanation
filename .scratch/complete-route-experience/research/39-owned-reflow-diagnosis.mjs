import fs from "node:fs";
import { geometryChanges } from "../../../interactive-explanation/tools/diagnose-baseline.mjs";
for (const side of ["before", "after"]) {
  const records = fs.readFileSync(`/tmp/opencode/39-owned-interactions-${side}.jsonl`,"utf8").trim().split("\n").map(JSON.parse);
  const groups = {};
  for (const r of records.filter(r=>r.status !== "passed")) { const key = `${r.slug}: ${r.error}`; groups[key]=(groups[key] || 0)+1; }
  console.log(side,groups);
}
const rows = fs.readFileSync("/tmp/opencode/39-owned-after.jsonl","utf8").trim().split("\n").map(JSON.parse).filter(r=>r.type === "sample" && r.slug === "precision-recall");
const beforeRows = fs.readFileSync("/tmp/opencode/39-owned-before.jsonl","utf8").trim().split("\n").map(JSON.parse);
console.log("precision narrow before",beforeRows.find(r=>r.type === "sample" && r.slug === "precision-recall" && r.viewport.name === "narrow").geometry.intrinsic);
console.log("unit output",fs.readFileSync(".scratch/complete-route-experience/research/39-owned-reflow-gates-002.jsonl","utf8").trim().split("\n").map(JSON.parse).find(r=>r.name === "unit").stdout);
const gateRows = fs.readFileSync(".scratch/complete-route-experience/research/39-owned-reflow-gates.jsonl","utf8").trim().split("\n").map(JSON.parse);
console.log("unit failures", gateRows.find(r=>r.name === "unit").stdout.split("\n").filter((line,index,lines)=>/not ok|failureType:|error:|expected:|actual:/.test(line) || /not ok|error:/.test(lines[index-1] || "")));
for (const viewport of []) for (const theme of ["light","dark"]) {
 const a=rows.filter(r=>r.viewport.name === viewport && r.theme === theme);
 console.log(viewport,theme,geometryChanges(a[0].geometry,a[1].geometry),geometryChanges(a[0].geometry,a[2].geometry));
}
