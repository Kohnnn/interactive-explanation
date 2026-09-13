import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { sourceIdentity } from "../diagnose-baseline.mjs";

test("functional evidence identifies dirty bytes rather than timestamps and excludes installed dependencies", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "functional-identity-"));
  try {
    execFileSync("git", ["init", "-q", root]);
    const tree = execFileSync("git", ["mktree"], { cwd: root, input: "", encoding: "utf8" }).trim();
    const env = { ...process.env, GIT_AUTHOR_NAME: "Test", GIT_AUTHOR_EMAIL: "test@example.invalid", GIT_COMMITTER_NAME: "Test", GIT_COMMITTER_EMAIL: "test@example.invalid" };
    const head = execFileSync("git", ["commit-tree", tree, "-m", "fixture"], { cwd: root, env, encoding: "utf8" }).trim();
    execFileSync("git", ["update-ref", "HEAD", head], { cwd: root });
    const file = path.join(root, "index.html");
    fs.writeFileSync(file, "before");
    const before = sourceIdentity(root);
    assert.equal(before.head, head);
    fs.utimesSync(file, 1, 1);
    assert.deepEqual(sourceIdentity(root), before);
    fs.mkdirSync(path.join(root, "node_modules"));
    fs.writeFileSync(path.join(root, "node_modules", "ignored"), "dependency");
    assert.equal(sourceIdentity(root).digest, before.digest);
    fs.writeFileSync(file, "after");
    assert.notEqual(sourceIdentity(root).digest, before.digest);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

const source = fs.readFileSync(new URL("../../shared/engineering-sandbox.js", import.meta.url), "utf8");
const adapter = source.slice(source.indexOf('    if (navMode === "generated" && !document.querySelector("[data-story-chapter]"))'), source.indexOf('    const sections = Array.from(document.querySelectorAll("[data-story-chapter]"))'));

test("legacy visual chapter adapter preserves existing ownership and derives only declared route titles", () => {
  assert(adapter.length > 0);
  for (const slug of ["remember", "covid-19", "trust"]) for (const existing of [false, true]) {
    const sections = ["  First chapter  ", "Second chapter", ""].map(text => ({ dataset: {}, querySelector: () => ({ textContent: text }) }));
    vm.runInNewContext(adapter, {
      slug, navMode: "generated",
      sanitizeChapterTitle: text => text.trim(),
      document: { querySelector: () => existing, querySelectorAll: () => sections },
    });
    assert.equal(sections[0].dataset.storyChapter, !existing && slug !== "trust" ? "First chapter" : undefined);
    assert.equal(sections[1].dataset.storyChapter, !existing && slug !== "trust" ? "Second chapter" : undefined);
    assert.equal(sections[2].dataset.storyChapter, undefined);
  }
});
