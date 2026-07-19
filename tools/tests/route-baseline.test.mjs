import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..", "..");
const pages = JSON.parse(fs.readFileSync(path.join(root, "pages.json"), "utf8"));
const manifest = JSON.parse(fs.readFileSync(path.join(root, "routes.manifest.json"), "utf8"));

const requirements = [
  {
    name: "shared public-footer script",
    test: (html) => /shared\/public-footer\.js/.test(html),
    hint: 'include <script src="../shared/public-footer.js"></script>',
  },
  {
    name: "charset declaration",
    test: (html) => /charset=/i.test(html),
    hint: 'add <meta charset="utf-8"> as the first element in <head>',
  },
  {
    name: "responsive viewport meta",
    test: (html) => /name=["']viewport["']/i.test(html),
    hint: 'add <meta name="viewport" content="width=device-width, initial-scale=1">',
  },
  {
    name: "html lang attribute",
    test: (html) => /<html[^>]*\slang=/i.test(html),
    hint: 'set a language on the root element, e.g. <html lang="en">',
  },
  {
    name: "document title",
    test: (html) => /<title>[^<]*\S[^<]*<\/title>/i.test(html),
    hint: "add a non-empty <title>",
  },
];

function assertNonEmptyStringArray(value, label) {
  assert.ok(Array.isArray(value) && value.length > 0, `${label} must be a non-empty array`);
  for (const entry of value) {
    assert.equal(typeof entry, "string", `${label} entries must be strings`);
    assert.ok(entry.trim(), `${label} entries must be non-empty`);
  }
}

test("pages metadata exactly matches the route manifest", () => {
  assert.deepEqual(pages, manifest);
});

for (const route of manifest) {
  const routeHtml = path.join(root, route.slug, "index.html");
  const docsDir = path.join(root, "docs", route.slug);
  const docsHtml = path.join(docsDir, "index.html");
  const parityPath = path.join(docsDir, "parity.json");

  test(`route "${route.slug}" has an index.html`, () => {
    assert.ok(fs.existsSync(routeHtml), `missing ${route.slug}/index.html`);
  });

  test(`route "${route.slug}" satisfies the UI/UX baseline`, () => {
    const html = fs.readFileSync(routeHtml, "utf8");
    for (const requirement of requirements) {
      assert.ok(
        requirement.test(html),
        `${route.slug}/index.html is missing the ${requirement.name}: ${requirement.hint}`,
      );
    }
  });

  test(`route "${route.slug}" has authoritative docs and parity metadata`, () => {
    assert.equal(route.docsUrl, `./docs/${route.slug}/`);
    assert.ok(fs.existsSync(docsHtml), `missing docs/${route.slug}/index.html`);
    assert.ok(fs.existsSync(parityPath), `missing docs/${route.slug}/parity.json`);

    const modules = JSON.parse(fs.readFileSync(parityPath, "utf8"));
    assert.ok(Array.isArray(modules) && modules.length > 0, `${route.slug} parity.json must be a non-empty array`);
    for (const [index, module] of modules.entries()) {
      assert.ok(module && typeof module === "object" && !Array.isArray(module), `${route.slug} module ${index} must be an object`);
      for (const field of ["moduleId", "originalBehavior", "localStatus"]) {
        assert.equal(typeof module[field], "string", `${route.slug} module ${index} ${field} must be a string`);
        assert.ok(module[field].trim(), `${route.slug} module ${index} ${field} must be non-empty`);
      }
      for (const field of ["sourceFiles", "notes", "evidence"]) {
        assertNonEmptyStringArray(module[field], `${route.slug} module ${index} ${field}`);
      }
    }
  });
}
