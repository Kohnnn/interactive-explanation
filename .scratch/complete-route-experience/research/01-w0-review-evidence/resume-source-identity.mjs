import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
const original = "/media/compute_01/New Volume/PersonalWebsite/interactive-note/interactive-explanation";
const root = path.resolve("interactive-explanation");
function inventory(dir, prefix = "") {
  return fs.readdirSync(dir, { withFileTypes: true }).sort((a,b) => a.name.localeCompare(b.name)).flatMap(entry => {
    const name = path.join(prefix, entry.name);
    if (entry.name === ".git") return [];
    if (entry.isDirectory()) return inventory(path.join(dir, entry.name), name);
    return [[name, crypto.createHash("sha256").update(fs.readFileSync(path.join(dir, entry.name))).digest("hex")]];
  });
}
for (const folder of ["polygons", "decision-tree", "shared"]) {
  const a = inventory(path.join(original, folder));
  const b = inventory(path.join(root, folder));
  const ma = new Map(a), mb = new Map(b);
  console.log(JSON.stringify({ folder, originalHash: crypto.createHash("sha256").update(JSON.stringify(a)).digest("hex"), worktreeHash: crypto.createHash("sha256").update(JSON.stringify(b)).digest("hex"), differences: [...new Set([...ma.keys(), ...mb.keys()])].filter(k => ma.get(k) !== mb.get(k)) }));
}
for (const ref of ["7c71c99", "34c9883", "7fd4f8d", "HEAD"]) {
  const baseline = JSON.parse(execFileSync("git", ["show", `${ref}:interactive-explanation/tools/experience-baselines.json`], { maxBuffer: 30 * 1024 * 1024 }));
  console.log(JSON.stringify({ ref, metadataKeys: Object.keys(baseline), polygons: baseline.routes.polygons.geometry.mobile.rect, decisionTree: baseline.routes["decision-tree"].geometry.desktop.rect }));
}
const baseline = JSON.parse(fs.readFileSync(path.join(original, "tools/experience-baselines.json")));
console.log(JSON.stringify({ originalBaselineKeys: Object.keys(baseline), polygons: baseline.routes.polygons.geometry.mobile.rect, decisionTree: baseline.routes["decision-tree"].geometry.desktop.rect }));
