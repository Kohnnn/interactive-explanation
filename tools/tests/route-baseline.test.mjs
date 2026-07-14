import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Static per-route UI/UX baseline contract.
// Every shipped route index.html must inherit the shared chrome and the
// document fundamentals that keep the site accessible, encoded correctly,
// and responsive. New routes are picked up automatically from pages.json,
// so this test is the enforcement surface that makes new notes follow the
// established baseline.
//
// This is a static-HTML contract only. Runtime behavior (e.g. the hidden
// reference-footer focus order) is enforced separately in the Playwright
// smoke suite via assertReferenceFooterFocusContract.

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..", "..");
const pages = JSON.parse(fs.readFileSync(path.join(root, "pages.json"), "utf8"));

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

for (const page of pages) {
  const routeHtml = path.join(root, page.slug, "index.html");

  test(`route "${page.slug}" has an index.html`, () => {
    assert.ok(fs.existsSync(routeHtml), `missing ${page.slug}/index.html`);
  });

  test(`route "${page.slug}" satisfies the UI/UX baseline`, () => {
    const html = fs.readFileSync(routeHtml, "utf8");
    for (const requirement of requirements) {
      assert.ok(
        requirement.test(html),
        `${page.slug}/index.html is missing the ${requirement.name}: ${requirement.hint}`,
      );
    }
  });
}
