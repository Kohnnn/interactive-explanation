import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const here = path.dirname(fileURLToPath(import.meta.url));
const auditTool = path.resolve(here, "..", "check-public-surface.mjs");
const publicBaseUrl = "https://kohnnn.github.io/interactive-explanation/";

function metadata(url) {
  return `<link rel="canonical" href="${url}"><meta property="og:url" content="${url}">`;
}

function makeRoot(routeMetadata = metadata(`${publicBaseUrl}demo/`), rootMetadata = metadata(publicBaseUrl)) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "policy-test-"));
  const manifest = [
    { slug: "demo", title: "Demo", summary: "Demo route.", referenceUrl: "https://example.com/demo", docsUrl: "./docs/demo/" },
  ];
  fs.writeFileSync(path.join(root, "routes.manifest.json"), JSON.stringify(manifest, null, 2));
  fs.writeFileSync(path.join(root, "pages.json"), JSON.stringify(manifest, null, 2));
  fs.writeFileSync(path.join(root, "index.html"), `<!doctype html><head>${rootMetadata}</head><p>atlas</p>`);
  fs.mkdirSync(path.join(root, "demo"), { recursive: true });
  fs.writeFileSync(path.join(root, "demo", "index.html"), `<!doctype html><head>${routeMetadata}</head><p>clean replica</p>`);
  return root;
}

function runAudit(root) {
  return spawnSync(process.execPath, [auditTool, root], { encoding: "utf8" });
}

test("exact production metadata passes the audit", () => {
  const result = runAudit(makeRoot());
  assert.equal(result.status, 0, result.stderr);
});

test("missing entry metadata fails the audit", () => {
  const result = runAudit(makeRoot(""));
  assert.equal(result.status, 1);
  assert.match(result.stderr, /canonical metadata count/i);
  assert.match(result.stderr, /og:url metadata count/i);
});

test("loopback metadata fails the audit", () => {
  const result = runAudit(makeRoot(metadata("http://localhost:4173/interactive-explanation/demo/")));
  assert.equal(result.status, 1);
  assert.match(result.stderr, /loopback canonical or og:url/i);
});

test("relative metadata fails the audit", () => {
  const result = runAudit(makeRoot(metadata("./")));
  assert.equal(result.status, 1);
  assert.match(result.stderr, /metadata URL/i);
});

test("wrong production metadata fails the audit", () => {
  const result = runAudit(makeRoot(metadata(`${publicBaseUrl}wrong/`)));
  assert.equal(result.status, 1);
  assert.match(result.stderr, /metadata URL/i);
});

test("analytics tag in public HTML fails the audit", () => {
  const root = makeRoot();
  fs.writeFileSync(path.join(root, "promo.html"), '<script src="https://www.googletagmanager.com/gtag/js?id=G-XXX"></script>');
  const result = runAudit(root);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /external promo widget/i);
});
