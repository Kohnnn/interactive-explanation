import fs from "node:fs";
import assert from "node:assert/strict";
import { verifySourceFixture } from "../../../interactive-explanation/tools/diagnose-baseline.mjs";
import { chromium } from "../../../interactive-explanation/node_modules/playwright/index.mjs";
import { capture, planCells, sourceIdentity, openJournal } from "../../../interactive-explanation/tools/diagnose-baseline.mjs";
import * as smoke from "../../../interactive-explanation/tools/smoke-bundle.mjs";
import { createSmokeServer } from "../../../interactive-explanation/tools/smoke/server.mjs";
const root = new URL("../../../interactive-explanation", import.meta.url).pathname;
const beforeRoot = "/tmp/opencode/46-before/interactive-explanation";
const source = sourceIdentity(root);
const beforeSource = verifySourceFixture(beforeRoot, root, "2366c641");
const cells = planCells(JSON.parse(fs.readFileSync(`${root}/routes.manifest.json`)), ["sim", "train-test-validation", "interactive-mechanical-watch"]);
const journals = Object.fromEntries(["before", "after"].map(side => [side, openJournal(`/tmp/opencode/46-paired-${side}.jsonl`)]));
const browser = await chromium.launch();
for (const side of ["before", "after"]) journals[side].append({ type: "identity", side, source: side === "after" ? source : beforeSource, browser: browser.version(), fixtureSource: source.head, method: "alternating same-browser fresh contexts;18 theme cells;3 samples each; one server/browser; unchanged diagnostic fixture; no cache manipulation" });
try {
  for (const cell of cells) for (let sample = 1; sample <= 3; sample++) for (const side of ["before", "after"]) {
    const server = await createSmokeServer({ rootDir: side === "before" ? beforeRoot : root, host: smoke.host, port: smoke.port, mountPath: smoke.mountPath }).start();
    try { journals[side].append({ type: "sample", ...await capture(browser, cell), sample }); }
    finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
  }
} finally {
  await browser.close();
  assert.equal(sourceIdentity(root).digest, source.digest);
  assert.deepEqual(verifySourceFixture(beforeRoot, root, beforeSource.head), beforeSource);
  for (const journal of Object.values(journals)) { journal.append({ type: "source-end", unchanged: true }); journal.close(); }
}
