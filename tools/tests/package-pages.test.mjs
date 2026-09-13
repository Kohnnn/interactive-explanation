import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { packagePages } from "../package-pages.mjs";

function fixture(t) {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), "package-pages-"));
  t.after(() => fs.rmSync(base, { recursive: true, force: true }));
  const root = path.join(base, "source");
  fs.mkdirSync(root);
  const files = {
    "routes.manifest.json": JSON.stringify([{ slug: "ordinary-least-squares-regression" }]),
    "index.html": '<base href="./shared/"><script src="site.js"></script>',
    "pages.json": "[]",
    "favicon.png": "icon",
    "ordinary-least-squares-regression/index.html": '<script src="../ev/_build/js/common-shared.js"></script><script src="./_bundle.js"></script>',
    "ordinary-least-squares-regression/_bundle.js": "bundle",
    "ev/_build/js/common-shared.js": "runtime",
    "shared/site.js": "site",
    "shared/fonts/font.woff2": "font",
    "docs/ordinary-least-squares-regression/index.html": "docs",
    "docs/ordinary-least-squares-regression/parity.json": "{}",
    "docs/research/private.html": "internal",
    ".scratch/private.html": "internal",
    ".github/workflows/ci.yml": "internal",
    "tools/private.js": "internal",
    "node_modules/private.js": "internal",
    "AGENTS.md": "internal",
    "package.json": "{}",
  };
  for (const [file, value] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.writeFileSync(path.join(root, file), value);
  }
  execFileSync("git", ["init", "--quiet"], { cwd: root });
  execFileSync("git", ["add", "."], { cwd: root });
  return { root, output: path.join(base, "artifact"), files };
}

test("packages tracked public paths unchanged, including underscore runtimes, but excludes administration", (t) => {
  const { root, output, files } = fixture(t);
  fs.writeFileSync(path.join(root, "shared/untracked.js"), "untracked");
  const result = packagePages(root, output);
  assert.equal(result.routes, 1);
  for (const [file, value] of Object.entries(files)) {
    if (/^(?:docs\/research|\.scratch|\.github|tools|node_modules|AGENTS|package\.json)/.test(file)) {
      assert.equal(fs.existsSync(path.join(output, file)), false, file);
    } else {
      assert.equal(fs.readFileSync(path.join(output, file), "utf8"), value, file);
    }
  }
  assert.equal(fs.existsSync(path.join(output, "shared/untracked.js")), false);
  assert.throws(() => packagePages(root, output), /already exist/);
});

test("rejects missing local entry resources before creating the artifact", (t) => {
  const { root, output } = fixture(t);
  fs.writeFileSync(path.join(root, "index.html"), '<script src="./missing.js"></script>');
  assert.throws(() => packagePages(root, output), /Missing local entry resource/);
  assert.equal(fs.existsSync(output), false);
});

test("rejects traversal in route metadata", (t) => {
  const { root, output } = fixture(t);
  fs.writeFileSync(path.join(root, "routes.manifest.json"), '[{"slug":"../private"}]');
  assert.throws(() => packagePages(root, output), /Unsafe route slug/);
});

test("rejects symlink directories", (t) => {
  const { root, output } = fixture(t);
  fs.renameSync(path.join(root, "shared"), path.join(root, "outside"));
  fs.symlinkSync(path.join(root, "outside"), path.join(root, "shared"), "junction");
  assert.throws(() => packagePages(root, output), /Symlink forbidden/);
});

test("rejects artifacts reaching the 1 GB limit", (t) => {
  const { root, output } = fixture(t);
  fs.truncateSync(path.join(root, "shared/site.js"), 1_000_000_000);
  assert.throws(() => packagePages(root, output), /smaller than 1 GB/);
  assert.equal(fs.existsSync(output), false);
});
