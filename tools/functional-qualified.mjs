import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { verifyGeneratedGeometry } from "./geometry-output.mjs";

export const strictRoutes = [
  "decision-tree", "random-forest", "conditional-probability", "markov-chains", "principal-component-analysis", "exponentiation", "pi", "sine-and-cosine", "eigenvectors-and-eigenvalues", "image-kernels", "ordinary-least-squares-regression", "blockchain", "public-private-keys", "zero-knowledge-proof-demo", "alpha-compositing", "color-spaces", "sound", "cameras-and-lenses", "lights-and-shadows", "tesseract", "gears", "gps", "earth-and-sun", "curves-and-surfaces", "naval-architecture", "teoria-interval-ear-training", "teoria-note-ear-training", "teoria-key-and-note-ear-training", "teoria-random-key-and-note-ear-training", "teoria-scale-construction", "teoria-interval-identification-and-inversion", "ableton-learning-music-playground", "ableton-learning-music-play-with-beats", "ableton-learning-music-play-with-notes-and-scales", "ableton-learning-music-play-with-chords", "ableton-learning-music-play-with-basslines", "ableton-learning-music-play-with-melodies", "ableton-learning-music-play-with-song-structures", "ableton-learning-synths-get-started", "ableton-learning-synths-how-synths-make-sound", "ableton-learning-synths-filter-resonance", "ableton-learning-synths-modulating-amplitude-with-envelopes", "ableton-learning-synths-matching-envelopes", "ableton-learning-synths-recipes", "music-interactive-hub", "linear-regression", "logistic-regression", "precision-recall", "roc-auc", "bias-variance", "train-test-validation", "double-descent", "double-descent2", "memory-allocation", "load-balancing", "hysteresis-slack", "rigid-body-collisions", "blockchain-101-combined-flow", "primary-interactive-hub",
];

export function runFunctional(root, baseline, output, verify = verifyGeneratedGeometry, run = spawnSync) {
  assert.equal(new Set(strictRoutes).size, 59);
  const fd = fs.openSync(output, "wx");
  const append = row => { fs.writeSync(fd, JSON.stringify(row) + "\n"); fs.fsyncSync(fd); };
  let failed = false;
  try {
    verify(baseline, root);
    for (const [name, selection] of [["full83", []], ["strict59", ["--experience", ...strictRoutes.flatMap(slug => ["--route", slug])]]]) {
      const args = ["tools/smoke-bundle.mjs", ".", "--skip-performance", "--baseline", baseline, ...selection];
      let result;
      try {
        result = run(process.execPath, args, { cwd: root, env: process.env, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
      } catch (error) { result = { status: null, error }; }
      append({ type: "functional", name, args, exit: result.status, signal: result.signal, error: result.error?.message, stdout: result.stdout, stderr: result.stderr });
      if (result.status !== 0) failed = true;
    }
    verify(baseline, root);
    append({ type: "complete", status: failed ? "failed" : "passed", performance: "separate mandatory qualification; not promoted" });
  } catch (error) {
    failed = true;
    append({ type: "blocked", message: error.stack || error.message });
  } finally { fs.closeSync(fd); }
  return failed ? 1 : 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [root, baseline, output, ...extra] = process.argv.slice(2);
  assert(root && baseline && output && !extra.length, "Expected root, generated geometry baseline, functional journal");
  process.exitCode = runFunctional(fs.realpathSync(root), path.resolve(baseline), path.resolve(output));
}
