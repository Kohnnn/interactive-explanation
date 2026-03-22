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
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  validateManifest(manifest);
  return manifest;
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function assertManifest(condition, message) {
  if (!condition) {
    throw new Error(`Manifest validation failed: ${message}`);
  }
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/"/g, "&quot;");
}

function validateManifest(manifest) {
  assertManifest(Array.isArray(manifest), "routes.manifest.json must contain an array");

  const slugs = new Set();
  const referenceUrls = new Set();

  manifest.forEach((route, index) => {
    assertManifest(route && typeof route === "object" && !Array.isArray(route), `entry ${index} must be an object`);

    const { slug, title, summary, referenceUrl, referenceMode, docsUrl } = route;
    assertManifest(typeof slug === "string" && slug.trim().length > 0, `entry ${index} is missing slug`);
    assertManifest(!slugs.has(slug), `duplicate slug "${slug}"`);
    slugs.add(slug);

    assertManifest(typeof title === "string" && title.trim().length > 0, `route "${slug}" is missing title`);
    assertManifest(typeof summary === "string" && summary.trim().length > 0, `route "${slug}" is missing summary`);
    assertManifest(
      referenceMode === undefined || referenceMode === "neutral",
      `route "${slug}" uses unsupported referenceMode "${referenceMode}"`,
    );

    if (referenceMode === "neutral") {
      assertManifest(
        referenceUrl === undefined,
        `route "${slug}" cannot combine referenceMode "neutral" with referenceUrl`,
      );
    } else {
      assertManifest(
        typeof referenceUrl === "string" && /^https?:\/\//i.test(referenceUrl),
        `route "${slug}" must include an absolute referenceUrl or use referenceMode "neutral"`,
      );
      assertManifest(!referenceUrls.has(referenceUrl), `duplicate referenceUrl "${referenceUrl}"`);
      referenceUrls.add(referenceUrl);
    }

    assertManifest(
      docsUrl === `./docs/${slug}/`,
      `route "${slug}" must use docsUrl "./docs/${slug}/"`,
    );
  });
}

function docsTemplate(route) {
  const escapedTitle = escapeHtml(route.title);
  const escapedSlug = escapeHtml(route.slug);
  const escapedReferenceUrl = route.referenceUrl ? escapeAttribute(route.referenceUrl) : "";
  const actionLinks = route.referenceMode === "neutral"
    ? `        <a class="action-link" href="../../${escapedSlug}/">Open replica</a>\n`
    : `        <a class="action-link" href="../../${escapedSlug}/">Open replica</a>\n        <a class="action-link secondary" href="${escapedReferenceUrl}" target="_blank" rel="noreferrer">Open original</a>\n`;
  const snapshotLabel = route.referenceMode === "neutral"
    ? "local curated route verified in docs"
    : "fill in when the route is verified";
  const sourceFamilyLabel = route.referenceMode === "neutral"
    ? "curated multi-source route"
    : "fill in source family";

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapedTitle} Replica Docs</title>
  <meta name="description" content="Provenance, parity notes, and implementation references for the local ${escapedSlug} route.">
  <link rel="icon" type="image/png" href="../../favicon.png">
  <link rel="stylesheet" href="../../shared/site.css">
</head>
<body data-page-type="docs" data-parity-url="./parity.json">
  <main class="site-page docs-page">
    <a class="back-link" href="../../">Back to replicas</a>

    <header class="hero hero-compact">
      <p class="eyebrow">Replica documentation</p>
      <h1>${escapedTitle}</h1>
      <p class="lead">
        Local route <code>/interactive-explanation/${escapedSlug}/</code> is tracked through the
        standard docs, parity, and public-footer contract used by the rest of the replica site.
      </p>
      <div class="action-row">
${actionLinks.trimEnd()}
      </div>
      <p class="meta-line">
        Upstream snapshot: <code>${snapshotLabel}</code><br>
        Source family: <code>${sourceFamilyLabel}</code>
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
