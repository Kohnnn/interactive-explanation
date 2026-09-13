import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export function packagePages(root, output) {
  root = fs.realpathSync(root);
  output = path.resolve(output);
  const parent = fs.realpathSync(path.dirname(output));
  output = path.join(parent, path.basename(output));
  assert(output !== root && !root.startsWith(`${output}${path.sep}`), "Output must not contain source");
  assert(!fs.existsSync(output), "Output must not already exist");
  const tracked = execFileSync("git", ["ls-files", "-z"], { cwd: root, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 }).split("\0").filter(Boolean);
  const manifestPath = path.join(root, "routes.manifest.json");
  assert(fs.lstatSync(manifestPath).isFile(), "Manifest must be a regular file");
  const routes = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  assert(Array.isArray(routes) && routes.length > 0, "Empty route manifest");
  const slugs = routes.map(({ slug }) => {
    assert(typeof slug === "string" && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug), "Unsafe route slug");
    assert(!["tools", "node_modules", "docs", "shared"].includes(slug), "Administrative route slug");
    return slug;
  });
  assert(new Set(slugs).size === slugs.length, "Duplicate route slug");
  const directories = new Set([...slugs, "ev", "shared"]);
  const rootFiles = new Set(["index.html", "pages.json", "routes.manifest.json", "favicon.png", "CNAME", "404.html", "robots.txt", "sitemap.xml"]);
  const files = tracked.filter((file) => {
    const parts = file.split("/");
    assert(!path.posix.isAbsolute(file) && !file.includes("\\") && !parts.some((part) => !part || part === "." || part === ".."), `Unsafe path: ${file}`);
    return rootFiles.has(file) || directories.has(parts[0]) || (parts[0] === "docs" && slugs.includes(parts[1]));
  });
  const selected = new Set(files);
  const entries = ["index.html", ...slugs.flatMap((slug) => [`${slug}/index.html`, `docs/${slug}/index.html`])];
  for (const file of [...entries, "pages.json", "routes.manifest.json", "favicon.png", "ev/_build/js/common-shared.js", "ordinary-least-squares-regression/_bundle.js", ...slugs.map((slug) => `docs/${slug}/parity.json`)]) {
    assert(selected.has(file), `Missing required tracked file: ${file}`);
  }
  let bytes = 0;
  const checked = new Set();
  for (const file of files) {
    const parts = file.split("/");
    for (let length = 1; length <= parts.length; length++) {
      const relative = parts.slice(0, length).join("/");
      if (checked.has(relative)) continue;
      const stat = fs.lstatSync(path.join(root, relative));
      assert(!stat.isSymbolicLink(), `Symlink forbidden: ${relative}`);
      assert(length === parts.length ? stat.isFile() : stat.isDirectory(), `Not a regular path: ${relative}`);
      checked.add(relative);
    }
    bytes += fs.statSync(path.join(root, file)).size;
    assert(bytes < 1_000_000_000, "Pages artifact must be smaller than 1 GB");
  }
  for (const file of entries) {
    const html = fs.readFileSync(path.join(root, file), "utf8").replace(/<!--[\s\S]*?-->/g, "");
    const documentUrl = new URL(`https://pages.invalid/${file}`);
    const baseHref = html.match(/<base\b[^>]*\bhref\s*=\s*["']([^"']*)["']/i)?.[1];
    const baseUrl = new URL(baseHref ?? "", documentUrl);
    for (const [tag] of html.matchAll(/<(?:script|link)\b[^>]*>/gi)) {
      if (/^<link/i.test(tag) && !/\brel\s*=\s*["'](?:stylesheet|icon)["']/i.test(tag)) continue;
      const reference = tag.match(/\b(?:src|href)\s*=\s*["']([^"']+)["']/i)?.[1];
      if (!reference || /^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(reference)) continue;
      const resolved = new URL(reference.replaceAll("&amp;", "&"), baseUrl);
      if (resolved.origin !== documentUrl.origin) continue;
      const resource = decodeURIComponent(resolved.pathname).slice(1);
      assert(selected.has(resource), `Missing local entry resource: ${file}: ${reference}`);
    }
  }
  fs.mkdirSync(output);
  try {
    for (const file of files) {
      const target = path.join(output, file);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.copyFileSync(path.join(root, file), target, fs.constants.COPYFILE_EXCL);
    }
  } catch (error) {
    fs.rmSync(output, { recursive: true, force: true });
    throw error;
  }
  return { files: files.length, routes: slugs.length, bytes, output };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  assert(process.argv.length === 4, "Usage: node tools/package-pages.mjs <source> <new-output-directory>");
  console.log(JSON.stringify(packagePages(process.argv[2], process.argv[3])));
}
