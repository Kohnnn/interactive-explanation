import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const here = path.dirname(fileURLToPath(import.meta.url));
const auditTool = path.resolve(here, "..", "check-public-surface.mjs");

// Build a minimal root the audit can scan: the two manifests plus a route dir.
function makeRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "policy-test-"));
  const manifest = [
    { slug: "demo", title: "Demo", summary: "Demo route.", referenceUrl: "https://example.com/demo", docsUrl: "./docs/demo/" },
  ];
  fs.writeFileSync(path.join(root, "routes.manifest.json"), JSON.stringify(manifest, null, 2));
  fs.writeFileSync(path.join(root, "pages.json"), JSON.stringify(manifest, null, 2));
  fs.mkdirSync(path.join(root, "demo"), { recursive: true });
  fs.writeFileSync(path.join(root, "demo", "index.html"), "<!doctype html><title>demo</title><p>clean replica</p>");
  return root;
}

function runAudit(root) {
  return spawnSync(process.execPath, [auditTool, root], { encoding: "utf8" });
}

function writeRootFile(root, name, content) {
  fs.writeFileSync(path.join(root, name), content);
}

test("clean root passes the audit", () => {
  const root = makeRoot();
  const result = runAudit(root);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /audit passed/i);
});

test("analytics tag in a root html file fails the audit", () => {
  const root = makeRoot();
  writeRootFile(root, "promo.html", '<script src="https://www.googletagmanager.com/gtag/js?id=G-XXX"></script>');
  const result = runAudit(root);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /promo\.html/);
  assert.match(result.stderr, /external promo widget/i);
});

test("ncase creator name in an ncase route fails the audit", () => {
  const root = makeRoot();
  const manifest = [
    { slug: "trust", title: "Trust", summary: "Game.", referenceUrl: "https://ncase.me/trust/", docsUrl: "./docs/trust/" },
  ];
  fs.writeFileSync(path.join(root, "routes.manifest.json"), JSON.stringify(manifest, null, 2));
  fs.writeFileSync(path.join(root, "pages.json"), JSON.stringify(manifest, null, 2));
  fs.mkdirSync(path.join(root, "trust"), { recursive: true });
  fs.writeFileSync(path.join(root, "trust", "index.html"), "<p>A game by Nicky Case</p>");
  const result = runAudit(root);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /creator name/i);
});

test("disqus widget fails the audit (general family)", () => {
  const root = makeRoot();
  fs.writeFileSync(path.join(root, "demo", "index.html"), '<div id="disqus_thread"></div><script src="https://demo.disqus.com/embed.js"></script>');
  const result = runAudit(root);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /external promo widget/i);
});

test("plain replica content does not false-positive", () => {
  const root = makeRoot();
  fs.writeFileSync(
    path.join(root, "demo", "index.html"),
    "<!doctype html><title>demo</title><p>An interactive explanation with charts and sliders.</p>",
  );
  const result = runAudit(root);
  assert.equal(result.status, 0, result.stderr);
});
