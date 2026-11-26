import { createReadStream, existsSync } from "node:fs";
import { stat } from "node:fs/promises";
import { createGzip } from "node:zlib";
import http from "node:http";
import path from "node:path";

const compressible = new Set([".html", ".js", ".css", ".webmanifest", ".txt", ".svg", ".json"]);

const port = Number(process.env.PORT || 4173);
const base = "/positive-planner";
const root = path.resolve("dist");
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".webmanifest": "application/manifest+json",
  ".png": "image/png",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".txt": "text/plain; charset=utf-8",
};

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://127.0.0.1:${port}`);
    let pathname = decodeURIComponent(url.pathname);
    if (pathname === "/") {
      res.writeHead(302, { Location: `${base}/` });
      res.end();
      return;
    }
    if (pathname !== base && !pathname.startsWith(`${base}/`)) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("not found");
      return;
    }
    let rel = pathname.slice(base.length) || "/";
    if (rel === "/") rel = "/index.html";
    let file = path.normalize(path.join(root, rel));
    if (!file.startsWith(root)) {
      res.writeHead(400);
      res.end();
      return;
    }
    const info = existsSync(file) ? await stat(file) : null;
    if (!info || info.isDirectory()) {
      if (!path.extname(rel)) file = path.join(root, "index.html");
    }
    if (!existsSync(file)) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("not found");
      return;
    }
    const ext = path.extname(file);
    const accept = String(req.headers["accept-encoding"] || "");
    const headers = {
      "Content-Type": types[ext] || "application/octet-stream",
      "Cache-Control": "no-cache",
    };
    const stream = createReadStream(file);
    if (compressible.has(ext) && accept.includes("gzip")) {
      headers["Content-Encoding"] = "gzip";
      headers["Vary"] = "Accept-Encoding";
      res.writeHead(200, headers);
      stream.pipe(createGzip()).pipe(res);
      return;
    }
    res.writeHead(200, headers);
    stream.pipe(res);
  } catch {
    res.writeHead(500);
    res.end("error");
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`http://127.0.0.1:${port}${base}/`);
});
