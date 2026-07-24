import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const siteRoot = repoRoot;
const mountPrefix = "/interactive-explanation/";
const port = Number(process.env.PROBE_PORT || 4321);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".ttf": "font/ttf",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".ogg": "audio/ogg",
  ".mp4": "video/mp4",
  ".ico": "image/x-icon",
  ".wasm": "application/wasm",
};

function serve() {
  return http.createServer((req, res) => {
    try {
      let urlPath = decodeURIComponent(req.url.split("?")[0].split("#")[0]);
      if (urlPath.startsWith(mountPrefix)) {
        urlPath = urlPath.slice(mountPrefix.length);
      } else if (urlPath === "/interactive-explanation") {
        urlPath = "";
      } else {
        urlPath = urlPath.replace(/^\//, "");
      }
      let filePath = path.join(siteRoot, urlPath);
      if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
        filePath = path.join(filePath, "index.html");
      }
      if (!fs.existsSync(filePath)) {
        res.statusCode = 404;
        res.end("not found");
        return;
      }
      const ext = path.extname(filePath).toLowerCase();
      res.setHeader("Content-Type", MIME[ext] || "application/octet-stream");
      fs.createReadStream(filePath).pipe(res);
    } catch (error) {
      res.statusCode = 500;
      res.end(String(error));
    }
  });
}

async function main() {
  const slugs = JSON.parse(fs.readFileSync(path.join(siteRoot, "pages.json"), "utf8")).map((p) => p.slug);
  const server = serve();
  await new Promise((resolve) => server.listen(port, "127.0.0.1", resolve));

  const browser = await chromium.launch({ headless: true });
  const results = [];

  for (const slug of slugs) {
    const context = await browser.newContext();
    const page = await context.newPage();
    const consoleErrors = [];
    const pageErrors = [];
    const failedRequests = [];

    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text().slice(0, 300));
      }
    });
    page.on("pageerror", (err) => {
      pageErrors.push(String(err.message || err).slice(0, 300));
    });
    page.on("requestfailed", (req) => {
      const failure = req.failure();
      // Ignore benign aborts of media that browsers cancel deliberately.
      failedRequests.push({
        url: req.url().replace(`http://127.0.0.1:${port}`, ""),
        error: failure ? failure.errorText : "unknown",
      });
    });

    const url = `http://127.0.0.1:${port}${mountPrefix}${slug}/`;
    let navError = null;
    try {
      await page.goto(url, { waitUntil: "load", timeout: 30000 });
      await page.waitForTimeout(2500);
    } catch (error) {
      navError = String(error.message || error).slice(0, 200);
    }

    // Empty-visual signals: canvases painted nothing, svgs with no children, empty body.
    let visual = {};
    try {
      visual = await page.evaluate(() => {
        const out = { canvases: 0, blankCanvases: 0, svgs: 0, emptySvgs: 0, bodyTextLen: 0, hasMain: false };
        out.bodyTextLen = (document.body?.innerText || "").trim().length;
        out.hasMain = Boolean(document.querySelector("main, #main, [role='main']"));
        const canvases = Array.from(document.querySelectorAll("canvas"));
        out.canvases = canvases.length;
        for (const c of canvases) {
          if (c.width === 0 || c.height === 0) {
            out.blankCanvases += 1;
            continue;
          }
          try {
            const ctx = c.getContext("2d");
            if (ctx) {
              const { data } = ctx.getImageData(0, 0, Math.min(c.width, 64), Math.min(c.height, 64));
              let painted = false;
              for (let i = 3; i < data.length; i += 4) {
                if (data[i] !== 0) { painted = true; break; }
              }
              if (!painted) out.blankCanvases += 1;
            }
          } catch (e) {
            // webgl / tainted canvas — cannot introspect, skip
          }
        }
        const svgs = Array.from(document.querySelectorAll("svg"));
        out.svgs = svgs.length;
        for (const s of svgs) {
          if (s.children.length === 0) out.emptySvgs += 1;
        }
        return out;
      });
    } catch (error) {
      visual.error = String(error.message || error).slice(0, 150);
    }

    const filteredFailed = failedRequests.filter((r) => !/favicon\.ico$/.test(r.url));

    const record = {
      slug,
      navError,
      consoleErrors,
      pageErrors,
      failedRequests: filteredFailed,
      visual,
    };
    const severity =
      navError ||
      pageErrors.length ||
      filteredFailed.length ||
      (visual.canvases > 0 && visual.blankCanvases === visual.canvases) ||
      consoleErrors.length
        ? "SUSPECT"
        : "ok";
    record.severity = severity;
    results.push(record);
    console.log(
      `${severity === "ok" ? "  ok  " : "SUSPECT"} ${slug}` +
        (navError ? ` nav:${navError}` : "") +
        (pageErrors.length ? ` pageErr:${pageErrors.length}` : "") +
        (filteredFailed.length ? ` netFail:${filteredFailed.length}` : "") +
        (consoleErrors.length ? ` consoleErr:${consoleErrors.length}` : "") +
        (visual.canvases && visual.blankCanvases === visual.canvases ? ` allCanvasBlank(${visual.canvases})` : ""),
    );

    await context.close();
  }

  await browser.close();
  server.close();

  fs.writeFileSync(path.join(repoRoot, "tools", "probe-report.json"), JSON.stringify(results, null, 2));
  const suspects = results.filter((r) => r.severity === "SUSPECT");
  console.log(`\n=== ${suspects.length} SUSPECT / ${results.length} total ===`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
