import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const source = process.argv[2];
assert(source, "Pass the read-only historical nested repository path");
const pin = "5f7c6ef337e9c8935a43708147d86bdf1d68f4df";
const routes = ["wbwwb", "coming-out-simulator-2014", "covid-19"];
const omissions = new Map([
  ["wbwwb/css/Cairo-Regular.ttf", "unlicensed font"],
  ["wbwwb/sprites/Thumbs.db", "nonruntime Windows thumbnail cache"],
  ["wbwwb/sprites/misc/Thumbs.db", "nonruntime Windows thumbnail cache"],
  ["wbwwb/sprites/peeps/Thumbs.db", "nonruntime Windows thumbnail cache"],
]);
const expectedCounts = { wbwwb: [205, 194], "coming-out-simulator-2014": [114, 113], "covid-19": [84, 83] };
const fontFiles = new Set(["css/game.css", "js/game/TV.js", ...["Preloader", "Quote", "Credits", "Post_Post_Credits"].map(name => `js/scenes/Scene_${name}.js`)]);
for (const route of routes) {
  const entries = execFileSync("git", ["-C", source, "ls-tree", "-r", pin, route], { encoding: "utf8" }).trim().split("\n");
  let unchanged = 0;
  for (const entry of entries) {
    const [metadata, filename] = entry.split("\t");
    const blob = metadata.split(" ")[2];
    const local = path.join("interactive-explanation", filename);
    if (omissions.has(filename)) {
      assert(!fs.existsSync(local), `Intentional omission must remain absent: ${filename} (${omissions.get(filename)})`);
      continue;
    }
    const bytes = fs.readFileSync(local);
    const original = execFileSync("git", ["-C", source, "cat-file", "blob", blob]);
    if (bytes.equals(original)) { unchanged++; continue; }
    const relative = filename.slice(route.length + 1);
    if (relative === "index.html") continue;
    assert(route === "wbwwb" && fontFiles.has(relative), `Unexpected changed historical file: ${filename}`);
    let expected = original.toString().replaceAll("px Cairo", "px sans-serif");
    if (relative === "css/game.css") expected = expected.replace(/@font-face \{[\s\S]*?\}\r?\n\r?\n/, "").replace("font-family: 'Cairo';", "font-family: sans-serif;");
    assert.equal(bytes.toString().replaceAll("\r\n", "\n"), expected.replaceAll("\r\n", "\n"), filename);
  }
  assert.deepEqual([entries.length, unchanged], expectedCounts[route], route);
  console.log(`${route}: ${entries.length} historical entries, ${unchanged} byte-identical; only entrypoint/font substitutions and declared absent font/cache exceptions`);
}
