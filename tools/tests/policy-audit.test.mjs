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

function trackAll(root) {
  const init = spawnSync("git", ["init", "--quiet"], { cwd: root, encoding: "utf8" });
  assert.equal(init.status, 0, init.stderr);
  const add = spawnSync("git", ["add", "--all"], { cwd: root, encoding: "utf8" });
  assert.equal(add.status, 0, add.stderr);
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

for (const [label, relativePath] of [
  ["output file", path.join("output", "playwright", "screen.png")],
  ["XCF file", path.join("demo", "source.xcf")],
  ["source map", path.join("demo", "bundle.js.map")],
]) {
  test(`tracked ${label} fails the audit`, () => {
    const root = makeRoot();
    const fullPath = path.join(root, relativePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, "artifact");
    trackAll(root);
    const result = runAudit(root);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /tracked deploy artifact/i);
  });
}

for (const extension of ["js", "css"]) {
  test(`source map directive in ${extension.toUpperCase()} fails the audit`, () => {
    const root = makeRoot();
    const comment = extension === "js" ? "//# sourceMappingURL=bundle.js.map" : "/*# sourceMappingURL=styles.css.map */";
    fs.writeFileSync(path.join(root, "demo", `asset.${extension}`), comment);
    const result = runAudit(root);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /source map directive/i);
  });
}

test("source map text inside a JavaScript string passes the audit", () => {
  const root = makeRoot();
  fs.writeFileSync(path.join(root, "demo", "asset.js"), 'const generated = "//# sourceMappingURL=bundle.js.map";');
  const result = runAudit(root);
  assert.equal(result.status, 0, result.stderr);
});

test("source map directive after a control-header regex fails the audit", () => {
  const root = makeRoot();
  fs.writeFileSync(path.join(root, "demo", "asset.js"), "if (enabled) /'/;\n//# sourceMappingURL=asset.js.map");
  const result = runAudit(root);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /source map directive/i);
});

test("source map directive inside a template expression fails the audit", () => {
  const root = makeRoot();
  fs.writeFileSync(path.join(root, "demo", "asset.js"), "const value = `${/*# sourceMappingURL=asset.js.map */ 1}`;");
  const result = runAudit(root);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /source map directive/i);
});

test("source map directive in shared assets fails the audit", () => {
  const root = makeRoot();
  fs.mkdirSync(path.join(root, "shared"));
  fs.writeFileSync(path.join(root, "shared", "asset.js"), "//@ sourceMappingURL=asset.js.map");
  const result = runAudit(root);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /source map directive/i);
});

test("route-local copies of consolidated assets fail the audit", () => {
  const root = makeRoot();
  const copies = [
    path.join("ableton-learning-music-demo", "third-party", "tone", "tone.min.js"),
    path.join("ableton-learning-synths-demo", "js", "externals", "react.production.min.js"),
    path.join("ableton-learning-synths-demo", "js", "externals", "react-dom.production.min.js"),
    path.join("ableton-learning-synths-demo", "js", "musiclab.js"),
    path.join("mechanical-watch", "models", "watch_vertices.dat"),
    path.join("interactive-mechanical-watch", "images", "sqrt.svg"),
  ];
  for (const relativePath of copies) {
    const fullPath = path.join(root, relativePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, "duplicate");
  }
  const result = runAudit(root);
  assert.equal(result.status, 1);
  assert.equal(result.stderr.match(/route-local duplicate of shared asset/gi)?.length, copies.length);
});

test("nested route iframe missing a title fails the audit", () => {
  const root = makeRoot();
  const nested = path.join(root, "demo", "nested", "frame.html");
  fs.mkdirSync(path.dirname(nested), { recursive: true });
  fs.writeFileSync(nested, "<iframe src=\"local.html\"></iframe>");
  const result = runAudit(root);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /iframe missing title/i);
});

test("duplicate iframe titles within a nested route document fail the audit", () => {
  const root = makeRoot();
  const nested = path.join(root, "demo", "nested", "frame.html");
  fs.mkdirSync(path.dirname(nested), { recursive: true });
  fs.writeFileSync(nested, '<iframe title="Demo frame"></iframe><iframe title="Demo frame"></iframe>');
  const result = runAudit(root);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /iframe duplicate title/i);
});
