import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";

const evidence = JSON.parse(fs.readFileSync(new URL("./37-prerequisite-evidence.json", import.meta.url)));
const slugs = ["decision-tree", "markov-chains", "rigid-body-collisions", ...["get-started", "how-synths-make-sound", "filter-resonance", "modulating-amplitude-with-envelopes", "matching-envelopes", "recipes"].map(name => `ableton-learning-synths-${name}`)];
const viewports = [{ name: "desktop", width: 1400, height: 1000 }, { name: "mobile", width: 390, height: 844 }, { name: "narrow", width: 320, height: 844 }];
const key = row => `${row.slug}/${row.theme}/${row.viewport.width}x${row.viewport.height}`;
const expected = slugs.flatMap(slug => ["light", "dark"].flatMap(theme => viewports.map(viewport => key({ slug, theme, viewport }))));

function coverage(rows, samples) {
  assert(Array.isArray(rows));
  const wanted = samples ? expected.flatMap(cell => [1, 2, 3].map(sample => `${cell}/${sample}`)) : expected;
  assert.equal(rows.length, wanted.length, "Exact matrix length");
  const actual = rows.map(row => {
    assert(row && row.viewport);
    const viewport = viewports.find(value => value.width === row.viewport.width && value.height === row.viewport.height);
    assert(viewport, "Unexpected viewport");
    if (!samples) assert.equal(row.viewport.name, viewport.name);
    if (samples) assert([1, 2, 3].includes(row.sample), "Unexpected sample ID");
    return samples ? `${key(row)}/${row.sample}` : key(row);
  });
  assert.equal(new Set(actual).size, wanted.length, "Duplicate matrix entries");
  assert.deepEqual(actual.sort(), [...wanted].sort(), "Exact matrix coverage");
}

function statistics(value, n) {
  assert.equal(value.n, n, "Expected sample count");
  if (!n) {
    assert.deepEqual(value, { n: 0 });
    return;
  }
  for (const field of ["min", "median", "max"]) assert(Number.isFinite(value[field]) && value[field] >= 0, field);
  assert(value.min <= value.median && value.median <= value.max);
}

function verify(input) {
  coverage(input.cells, false);
  coverage(input.interactionBefore, true);
  coverage(input.interactionAfter, true);
  for (const cell of input.cells) {
    assert.deepEqual(Object.keys(cell.metrics).sort(), ["domContentLoadedMs", "loadMs", "transfer"]);
    for (const [name, metric] of Object.entries(cell.metrics)) {
      for (const side of ["before", "after"]) statistics(metric[side], 3);
      assert.equal(metric.withinBudget, true);
      assert(metric.after.median - metric.before.median <= Math.max(metric.before.median * 0.2, name === "transfer" ? 250 * 1024 : 250));
    }
    assert.equal(cell.metrics.transfer.supported, true);
    for (const side of ["Before", "After"]) {
      assert.equal(cell[`width${side}`].length, 3);
      assert(cell[`width${side}`].every(width => Number.isFinite(width) && width > 0));
      const geometry = cell[`geometry${side}`];
      assert.equal(geometry.length, 3);
      assert.equal(cell.geometryStable[side.toLowerCase()], true);
      for (const sample of geometry) {
        assert(Array.isArray(sample.intrinsic) && sample.intrinsic.length > 0);
        assert.deepEqual(sample, geometry[0]);
      }
      const interactions = input[`interaction${side}`].filter(sample => key(sample) === key(cell));
      const blockedBefore = side === "Before" && ((cell.slug === "decision-tree" && cell.viewport.name !== "desktop") || (cell.slug.startsWith("ableton-learning-synths-") && cell.viewport.name === "narrow"));
      for (const sample of interactions) assert.equal(sample.status, blockedBefore ? "failed" : "passed");
      const passed = interactions.filter(sample => sample.status === "passed");
      statistics(cell.interaction[side.toLowerCase()], passed.length);
      if (side === "After") assert.equal(passed.length, 3);
      if (passed.length) {
        const times = passed.map(sample => sample.interactionMs).sort((a, b) => a - b);
        assert(times.every(value => Number.isFinite(value) && value > 0));
        assert.equal(cell.interaction[side.toLowerCase()].min, times[0]);
        assert.equal(cell.interaction[side.toLowerCase()].max, times.at(-1));
        assert.equal(cell.interaction[side.toLowerCase()].median, times[Math.floor(times.length / 2)]);
      }
    }
    assert.equal(cell.errorsAfter.length, 3);
    const before = cell.geometryBefore[0].intrinsic, after = cell.geometryAfter[0].intrinsic;
    const protectedFields = surface => Object.fromEntries(Object.entries(surface).filter(([field]) => !["rect", "css", "aspectRatio"].includes(field)));
    assert.deepEqual(after.map(protectedFields), before.map(protectedFields), cell.slug);
    if (cell.slug.startsWith("ableton-learning-synths-")) {
      assert.deepEqual(before, after);
      assert(cell.widthAfter.every(width => width === cell.viewport.width));
    }
  }
  for (const sample of input.interactionAfter) {
    assert.equal(sample.status, "passed");
    assert(Array.isArray(sample.events));
    if (sample.slug === "markov-chains") {
      assert.equal(sample.child.nodes, 2);
      for (const event of sample.events) {
        assert.equal(event.type, "requestfailed");
        assert.equal(new URL(event.url).pathname, "/interactive-explanation/markov-chains/playground/");
        assert.equal(event.error, "net::ERR_ABORTED");
      }
    } else if (sample.slug !== "rigid-body-collisions") assert.deepEqual(sample.events, []);
  }
  assert.equal(input.artifacts.length, 5);
  assert.equal(new Set(input.artifacts.map(artifact => artifact.path)).size, 5);
  for (const artifact of input.artifacts) {
    const bytes = fs.readFileSync(artifact.path);
    assert.equal(bytes.length, artifact.bytes);
    assert.equal(createHash("sha256").update(bytes).digest("hex"), artifact.sha256);
  }
}

verify(evidence);
if (process.argv.includes("--negative-check")) {
  let checks = 0;
  for (const field of ["cells", "interactionBefore", "interactionAfter"]) {
    for (const rows of [[], evidence[field].slice(1), [evidence[field][1], ...evidence[field].slice(1)]]) {
      assert.throws(() => verify({ ...evidence, [field]: rows }), assert.AssertionError);
      checks++;
    }
  }
  const invalid = structuredClone(evidence);
  invalid.cells[0].metrics.loadMs.after.n = 0;
  assert.throws(() => verify(invalid), assert.AssertionError);
  console.log(`${checks + 1} negative checks passed: empty, truncated, duplicate matrices and zero metric samples rejected.`);
}
console.log(`${evidence.cells.length} exact paired cells; protected intrinsic fields and synth geometry preserved; ${evidence.interactionAfter.length} exact AFTER interaction records verified; raw hashes match. Rigid-body initialization remains blocked.`);
