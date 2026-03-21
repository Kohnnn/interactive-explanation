import fs from "node:fs";
import path from "node:path";

const cliArgs = process.argv.slice(2);

function getFlagValueIndices() {
  const indices = new Set();
  const flagsWithValues = new Set(["--scaffold"]);

  cliArgs.forEach((arg, index) => {
    if (!flagsWithValues.has(arg)) {
      return;
    }

    const next = cliArgs[index + 1];
    if (next && !next.startsWith("--")) {
      indices.add(index + 1);
    }
  });

  return indices;
}

const flagValueIndices = getFlagValueIndices();
const explicitRoot = cliArgs.find((arg, index) => !arg.startsWith("--") && !flagValueIndices.has(index));
const rootDir = path.resolve(explicitRoot || path.join(process.cwd(), "interactive-explanation"));
const manifestPath = path.join(rootDir, "routes.manifest.json");
const pagesPath = path.join(rootDir, "pages.json");

function hasFlag(flag) {
  return cliArgs.includes(flag);
}

function getArgValue(flag) {
  const direct = cliArgs.find((arg) => arg.startsWith(`${flag}=`));
  if (direct) {
    return direct.slice(flag.length + 1);
  }

  const index = cliArgs.indexOf(flag);
  if (index === -1) {
    return null;
  }

  return cliArgs[index + 1] && !cliArgs[index + 1].startsWith("--")
    ? cliArgs[index + 1]
    : null;
}

function readManifest() {
  return JSON.parse(fs.readFileSync(manifestPath, "utf8"));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function docsTemplate(route) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${route.title} Replica Docs</title>
  <meta name="description" content="Provenance, parity notes, and implementation references for the local ${route.slug} route.">
  <link rel="icon" type="image/png" href="../../favicon.png">
  <link rel="stylesheet" href="../../shared/site.css">
</head>
<body data-page-type="docs" data-parity-url="./parity.json">
  <main class="site-page docs-page">
    <a class="back-link" href="../../">Back to replicas</a>

    <header class="hero hero-compact">
      <p class="eyebrow">Replica documentation</p>
      <h1>${route.title}</h1>
      <p class="lead">
        Local route <code>/interactive-explanation/${route.slug}/</code> is tracked through the
        standard docs, parity, and public-footer contract used by the rest of the replica site.
      </p>
      <div class="action-row">
        <a class="action-link" href="../../${route.slug}/">Open replica</a>
        <a class="action-link secondary" href="${route.referenceUrl}" target="_blank" rel="noreferrer">Open original</a>
      </div>
      <p class="meta-line">
        Upstream snapshot: <code>fill in when the route is verified</code><br>
        Source family: <code>fill in source family</code>
      </p>
    </header>

    <section class="note-grid">
      <article class="note-section">
        <h2>Source snapshot</h2>
        <p>Document the published page or source family, what was vendored, and the scope of the local route.</p>
      </article>

      <article class="note-section">
        <h2>Asset handoff</h2>
        <p>List the local shell, runtime, and route-local assets that define the shipped replica.</p>
      </article>

      <article class="note-section">
        <h2>Known deviations</h2>
        <p>Record any deliberate local shell changes, provenance cleanup, or neutralized upstream surfaces.</p>
      </article>

      <article class="note-section">
        <h2>Validation guidance</h2>
        <p>List the route-specific smoke expectations and the shared commands required after edits.</p>
      </article>
    </section>

    <section class="note-section">
      <div class="section-heading">
        <h2>Parity checklist</h2>
        <span data-module-count class="meta-pill">Loading...</span>
      </div>
      <div class="parity-list" data-parity-list>
        <div class="empty-state">Loading parity contract...</div>
      </div>
    </section>
  </main>

  <script src="../../shared/site.js"></script>
</body>
</html>
`;
}

function parityTemplate(route) {
  return [
    {
      moduleId: "route-shell",
      originalBehavior: `Document the original shell behavior for ${route.title}.`,
      localStatus: `Document the local route status for ${route.title}.`,
      sourceFiles: [`../../${route.slug}/index.html`],
      notes: [
        "Replace this stub with route-specific notes before shipping.",
      ],
      evidence: [
        "Replace this stub with route-specific evidence before shipping.",
      ],
    },
  ];
}

function scaffoldRoute(route) {
  const docsDir = path.join(rootDir, "docs", route.slug);
  const docsIndexPath = path.join(docsDir, "index.html");
  const parityPath = path.join(docsDir, "parity.json");

  fs.mkdirSync(docsDir, { recursive: true });

  if (!fs.existsSync(docsIndexPath)) {
    fs.writeFileSync(docsIndexPath, docsTemplate(route), "utf8");
  }

  if (!fs.existsSync(parityPath)) {
    writeJson(parityPath, parityTemplate(route));
  }
}

const manifest = readManifest();
writeJson(pagesPath, manifest);

const scaffoldSlug = getArgValue("--scaffold");
if (scaffoldSlug) {
  const route = manifest.find((entry) => entry.slug === scaffoldSlug);
  if (!route) {
    throw new Error(`Could not find route metadata for ${scaffoldSlug}`);
  }
  scaffoldRoute(route);
}

if (hasFlag("--scaffold-all")) {
  manifest.forEach(scaffoldRoute);
}

console.log(`Synced ${manifest.length} routes from routes.manifest.json to pages.json`);
