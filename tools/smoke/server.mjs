import fs from "node:fs";
import path from "node:path";
import http from "node:http";

// Static file server for the smoke suite. Mounts the repo at `mountPath` to match
// production subpath hosting and enforces a path-traversal guard. Extracted verbatim
// from smoke-bundle.mjs as a factory so it can be unit-tested in isolation.
export const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".eot": "application/vnd.ms-fontobject",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".m4a": "audio/mp4",
  ".md": "text/markdown; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".mp3": "audio/mpeg",
  ".otf": "font/otf",
  ".opus": "audio/ogg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ttf": "font/ttf",
  ".txt": "text/plain; charset=utf-8",
  ".wav": "audio/wav",
  ".webm": "video/webm",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

export function createSmokeServer({ rootDir, host, port, mountPath }) {
  function serveFile(req, res) {
    const requestUrl = new URL(req.url, `http://${host}:${port}`);

    if (requestUrl.pathname === "/") {
      res.writeHead(302, { Location: mountPath });
      res.end();
      return;
    }

    if (!requestUrl.pathname.startsWith(mountPath)) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }

    let relativePath = decodeURIComponent(requestUrl.pathname.slice(mountPath.length));
    if (!relativePath || relativePath.endsWith("/")) {
      relativePath = `${relativePath}index.html`;
    }

    const fullPath = path.resolve(rootDir, relativePath);
    if (!fullPath.startsWith(rootDir)) {
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }

    if (!fs.existsSync(fullPath) || fs.statSync(fullPath).isDirectory()) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }

    const ext = path.extname(fullPath).toLowerCase();
    res.writeHead(200, {
      "Cache-Control": "no-store",
      "Content-Type": contentTypes[ext] || "application/octet-stream",
    });
    fs.createReadStream(fullPath).pipe(res);
  }

  function start() {
    const server = http.createServer(serveFile);
    return new Promise((resolve) => {
      server.listen(port, host, () => resolve(server));
    });
  }

  return { serveFile, start };
}
