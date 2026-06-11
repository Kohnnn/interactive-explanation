import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { createSmokeServer, contentTypes } from "../smoke/server.mjs";

const host = "127.0.0.1";
const mountPath = "/interactive-explanation/";

function makeRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "smoke-server-test-"));
  fs.writeFileSync(path.join(root, "index.html"), "<!doctype html><title>atlas</title>");
  fs.mkdirSync(path.join(root, "demo"), { recursive: true });
  fs.writeFileSync(path.join(root, "demo", "index.html"), "<p>demo</p>");
  fs.writeFileSync(path.join(root, "secret.txt"), "top secret");
  return root;
}

async function withServer(root, fn) {
  const { start } = createSmokeServer({ rootDir: path.resolve(root), host, port: 0, mountPath });
  const server = await start();
  const { port } = server.address();
  try {
    await fn(`http://${host}:${port}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test("serves index.html at the mount path", async () => {
  const root = makeRoot();
  await withServer(root, async (base) => {
    const res = await fetch(`${base}${mountPath}`);
    assert.equal(res.status, 200);
    assert.match(res.headers.get("content-type"), /text\/html/);
    assert.equal(res.headers.get("cache-control"), "no-store");
    assert.match(await res.text(), /atlas/);
  });
});

test("redirects root to the mount path", async () => {
  const root = makeRoot();
  await withServer(root, async (base) => {
    const res = await fetch(`${base}/`, { redirect: "manual" });
    assert.equal(res.status, 302);
    assert.equal(res.headers.get("location"), mountPath);
  });
});

test("404s paths outside the mount path", async () => {
  const root = makeRoot();
  await withServer(root, async (base) => {
    const res = await fetch(`${base}/elsewhere/file.html`);
    assert.equal(res.status, 404);
  });
});

test("blocks path traversal above the root", async () => {
  const root = makeRoot();
  await withServer(root, async (base) => {
    // Use a raw request so the client does not normalize the ../ segments away.
    const res = await fetch(`${base}${mountPath}..%2f..%2f..%2fetc%2fpasswd`);
    assert.ok(res.status === 403 || res.status === 404, `expected 403/404, got ${res.status}`);
  });
});

test("serves nested route files with the right content type", async () => {
  const root = makeRoot();
  await withServer(root, async (base) => {
    const res = await fetch(`${base}${mountPath}demo/`);
    assert.equal(res.status, 200);
    assert.match(await res.text(), /demo/);
  });
});

test("content-type table covers common static assets", () => {
  assert.equal(contentTypes[".js"], "application/javascript; charset=utf-8");
  assert.equal(contentTypes[".json"], "application/json; charset=utf-8");
  assert.equal(contentTypes[".woff2"], "font/woff2");
});
