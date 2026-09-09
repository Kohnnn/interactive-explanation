import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const research = path.dirname(fileURLToPath(import.meta.url));
const root = path.dirname(research);
const workspace = path.resolve(root, "../..");
const failures = [];
let checks = 0;
function check(name, run) {
  checks += 1;
  try {
    run();
  } catch (error) {
    failures.push(`${name}: ${error.message}`);
  }
}
const read = (file) => fs.readFileSync(file, "utf8");
const json = (file) => JSON.parse(read(file));
const sorted = (values) => [...values].sort();
const field = (text, name) => text.match(new RegExp(`^${name}:[ \\t]*(.*)$`, "m"))?.[1].trim();
const section = (text, title) => text.match(new RegExp(`^## ${title}\\r?\\n([\\s\\S]*?)(?=^## |$(?![\\s\\S]))`, "m"))?.[1] || "";
function prose(text) {
  let fence;
  return text.split("\n").map((line) => {
    const marker = line.match(/^ {0,3}(`{3,}|~{3,})/);
    if (fence) {
      if (new RegExp(`^ {0,3}${fence[0]}{${fence.length},}\\s*$`).test(line)) fence = undefined;
      return "";
    }
    if (marker) {
      fence = marker[1];
      return "";
    }
    return line;
  }).join("\n").replace(/(`+)([\s\S]*?)\1(?!`)/g, "");
}
function links(text) {
  const clean = prose(text);
  return [
    ...clean.matchAll(/\[[^\]\n]*\]\(\s*(?:<([^>]+)>|([^\s)]+))(?:\s+["'][^\n]*?["'])?\s*\)/g),
    ...clean.matchAll(/^ {0,3}\[[^\]\n]+\]:\s*(?:<([^>]+)>|([^\s]+))/gm),
  ].map((match) => match[1] || match[2]);
}
function localTarget(file, href) {
  if (/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(href)) return null;
  const pathname = decodeURIComponent(href.split(/[?#]/)[0]);
  return pathname ? path.resolve(path.dirname(file), pathname) : file;
}
const issues = fs.readdirSync(path.join(root, "issues")).filter((name) => /^\d\d-.*\.md$/.test(name)).sort();
const packages = fs.readdirSync(path.join(root, "implementation")).filter((name) => /^\d\d-.*\.md$/.test(name)).sort();
const documents = new Map([...issues.map((name) => `issues/${name}`), ...packages.map((name) => `implementation/${name}`), "map.md", "spec.md", "research/33-visual-prototype.md", "research/34-storytelling-prototype.md"].map((name) => [path.join(root, name), read(path.join(root, name))]));
const mapFile = path.join(root, "map.md");
const map = documents.get(mapFile);
const plan = json(path.join(research, "35-route-rollout.json"));
const manifest = json(path.join(workspace, "interactive-explanation/routes.manifest.json"));
const evidence = json(path.join(research, "32-browser-baseline.json"));
const ids = Array.from({ length: 35 }, (_, index) => String(index + 1).padStart(2, "0"));
check("35 decision tickets", () => assert.deepEqual(issues.map((name) => name.slice(0, 2)), ids));
check("7 implementation packages", () => assert.deepEqual(packages.map((name) => name.slice(0, 2)), ids.slice(0, 7)));
check("map status", () => assert.ok(["active", "resolved"].includes(field(map, "Status"))));
check("no unresolved decision frontier", () => assert.match(section(map, "Not yet specified").trim(), /^None\b/));
const mapTargets = links(map).map((href) => localTarget(mapFile, href));
const graph = new Map();
for (const name of issues) {
  const file = path.join(root, "issues", name);
  const text = documents.get(file);
  const id = name.slice(0, 2);
  check(`${name} resolved`, () => assert.equal(field(text, "Status"), "resolved"));
  check(`${name} map decision link`, () => assert.ok(mapTargets.includes(file)));
  check(`${name} answer/disposition`, () => {
    if (+id >= 24 && +id <= 29) assert.equal(field(text, "Disposition"), "superseded, not implemented");
    else assert.ok(section(text, "Answer").trim(), "missing resolved Answer");
  });
  check(`${name} dependencies`, () => {
    const value = field(text, "Blocked by");
    assert.notEqual(value, undefined, "missing Blocked by field");
    const dependencies = value === "" || value === "none" ? [] : value.split(/,\s*/);
    for (const dependency of dependencies) assert.ok(ids.includes(dependency), `unknown dependency ${dependency}`);
    graph.set(id, dependencies);
  });
}
check("decision dependency graph including legacy is acyclic", () => {
  function visit(id, trail = []) {
    assert.ok(!trail.includes(id), `cycle ${[...trail, id].join(" -> ")}`);
    assert.ok(graph.has(id), `missing dependency node ${id}`);
    for (const dependency of graph.get(id)) visit(dependency, [...trail, id]);
  }
  for (const id of ids) visit(id);
});
for (const [index, name] of packages.entries()) {
  const text = documents.get(path.join(root, "implementation", name));
  check(`${name} ready, unstarted, exact linear dependency`, () => {
    assert.equal(field(text, "Status"), "ready-for-agent");
    assert.equal(field(text, "Execution"), "not started");
    const dependency = field(text, "Blocked by");
    if (index === 0) assert.equal(dependency, "none");
    else {
      assert.match(dependency, /^\[[^\]]+\]\([^)]+\)$/);
      assert.deepEqual(links(dependency), [packages[index - 1]]);
    }
  });
}
for (const [file, text] of documents) {
  for (const href of links(text)) {
    check(`${path.relative(root, file)} link ${href}`, () => {
      const target = localTarget(file, href);
      if (target) assert.ok(fs.existsSync(target), `missing ${path.relative(workspace, target)}`);
    });
  }
}
check("planning schema and authority", () => {
  assert.equal(plan.schemaVersion, 1);
  assert.equal(plan.sourceManifest, "interactive-explanation/routes.manifest.json");
  assert.deepEqual(plan.sourceFields, { manifestShellFamily: "shell.family", themeOwnership: "experience.themeOwnership" });
  assert.equal(plan.planningOnly, true);
  assert.equal(plan.implementationAuthorized, false);
  assert.equal(plan.execution, "not started");
  assert.equal(plan.routeCount, 83);
});
const canonical = new Map(manifest.map((route) => [route.slug, route]));
check("exact 83 unique manifest and planning slugs", () => {
  assert.equal(manifest.length, 83);
  assert.equal(canonical.size, 83);
  assert.equal(plan.routes.length, 83);
  assert.equal(new Set(plan.routes.map((route) => route.slug)).size, 83);
  assert.deepEqual(sorted(plan.routes.map((route) => route.slug)), sorted(canonical.keys()));
});
const pilots = ["bias-variance", "blockchain", "teoria-scale-construction"];
check("three named pilots", () => assert.deepEqual(sorted(plan.routes.filter((route) => route.pilot).map((route) => route.slug)), sorted(pilots)));
const counts = [3, 31, 22, 27];
const assigned = [];
for (let index = 0; index < 4; index += 1) {
  const waveId = `W${index + 1}`;
  check(`${waveId} count and package membership`, () => {
    const expected = plan.routes.filter((route) => route.waveId === waveId).map((route) => route.slug);
    assert.equal(expected.length, counts[index]);
    assert.equal(plan.waves.find((wave) => wave.id === waveId)?.routeCount, counts[index]);
    const text = documents.get(path.join(root, "implementation", packages[index + 2]));
    const membership = section(text, "Exact membership by canonical family");
    const actual = [...membership.matchAll(/`([^`]+)`/g)].map((match) => match[1]);
    assigned.push(...actual);
    assert.deepEqual(sorted(actual), sorted(expected));
    for (const row of membership.split("\n").filter((line) => line.startsWith("- "))) {
      const family = row.match(/^- ([\w-]+)/)[1];
      for (const [, slug] of row.matchAll(/`([^`]+)`/g)) assert.equal(canonical.get(slug)?.shell.family, family, slug);
    }
  });
}
check("packages partition exactly 83 unique canonical slugs", () => {
  assert.equal(assigned.length, 83);
  assert.equal(new Set(assigned).size, 83);
  assert.deepEqual(sorted(assigned), sorted(canonical.keys()));
});
for (const route of plan.routes) {
  check(`${route.slug} family, ownership, pilot and wave`, () => {
    assert.equal(route.manifestShellFamily, canonical.get(route.slug)?.shell.family);
    assert.equal(route.themeOwnership, canonical.get(route.slug)?.experience.themeOwnership);
    assert.equal(route.pilot, pilots.includes(route.slug));
    const wave = route.pilot ? "W1" : route.themeOwnership === "fixed-runtime" || route.manifestShellFamily === "runtime" || plan.highRiskOverrides.includes(route.slug) ? "W4" : route.themeOwnership === "runtime-hook" ? "W3" : "W2";
    assert.equal(route.waveId, wave);
  });
  check(`${route.slug} evidence signal membership`, () => {
    assert.equal(plan.evidenceBase, "32-browser-baseline.json");
    const expected = Object.entries(plan.signalDefinitions).filter(([, definition]) => {
      assert.match(definition.reference, /^32-browser-baseline\.json#\/summary\/[\w]+$/);
      const cells = evidence.summary[definition.reference.split("/").at(-1)];
      assert.ok(Array.isArray(cells), `missing evidence ${definition.reference}`);
      return cells.some((cell) => cell.split("/")[0] === route.slug);
    }).map(([signal]) => signal);
    assert.deepEqual(sorted(route.evidenceSignals), sorted(expected));
  });
}
for (const [fieldName, countName] of [["manifestShellFamily", "familyCounts"], ["themeOwnership", "themeOwnershipCounts"]]) {
  check(countName, () => {
    const actual = {};
    for (const route of plan.routes) actual[route[fieldName]] = (actual[route[fieldName]] || 0) + 1;
    assert.deepEqual(actual, plan[countName]);
  });
}
for (const name of ["33-visual-prototype", "34-storytelling-prototype"]) {
  for (const extension of ["html", "mjs", "md"]) {
    check(`${name}.${extension} present`, () => assert.ok(fs.statSync(path.join(research, `${name}.${extension}`)).size > 0));
  }
}
for (const theme of ["light", "dark"]) {
  for (const width of [1400, 320]) {
    const name = `33-visual-prototype-A-${theme}-${width}.png`;
    check(`${name} present`, () => assert.ok(fs.statSync(path.join(research, name)).size > 0));
  }
}
for (const failure of failures) console.error(`FAIL: ${failure}`);
console.log(`${failures.length ? "FAIL" : "PASS"}: ${checks} planning checks; ${failures.length} failures; no production execution or human review asserted.`);
process.exitCode = failures.length ? 1 : 0;
