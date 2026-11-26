import * as esbuild from "esbuild";
import { existsSync } from "node:fs";
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";

const base = process.env.BASE_PATH || "/positive-planner/";
const baseNorm = base.endsWith("/") ? base : `${base}/`;
const buildId = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);

await rm("dist", { recursive: true, force: true });
await mkdir("dist", { recursive: true });

await esbuild.build({
  entryPoints: ["src/main.js"],
  bundle: true,
  format: "iife",
  platform: "browser",
  target: ["es2022"],
  outfile: "dist/app.js",
  minify: true,
  legalComments: "none",
  define: {
    "process.env.NODE_ENV": '"production"',
  },
});

const css = (await readFile("src/css/app.css", "utf8")).replaceAll("__BASE__", baseNorm);
await writeFile("dist/app.css", css);

const html = (await readFile("src/index.html", "utf8"))
  .replaceAll("__BASE__", baseNorm)
  .replaceAll("__BUILD_ID__", buildId);
await writeFile("dist/index.html", html);
await writeFile("dist/404.html", html);

const manifest = (await readFile("src/manifest.webmanifest", "utf8")).replaceAll("__BASE__", baseNorm);
await writeFile("dist/manifest.webmanifest", manifest);

const sw = (await readFile("src/sw.js", "utf8")).replaceAll("__BUILD_ID__", buildId);
await writeFile("dist/sw.js", sw);

await mkdir("dist/fonts", { recursive: true });
await cp("src/fonts/PositiveSerif-Title.woff", "dist/fonts/PositiveSerif-Title.woff");
await cp("src/fonts/OFL-PositiveSerif-Title.txt", "dist/fonts/OFL-PositiveSerif-Title.txt");
await mkdir("dist/textures", { recursive: true });
await cp("src/textures/cover.webp", "dist/textures/cover.webp");
await cp("src/textures/cover.jpg", "dist/textures/cover.jpg");
await cp("src/textures/paper-faint.jpg", "dist/textures/paper-faint.jpg");
await cp("src/icons", "dist/icons", { recursive: true });
await writeFile("dist/.nojekyll", "");

if (!html.includes(`<base href="${baseNorm}"`)) {
  throw new Error("base href가 없습니다.");
}
for (const file of [
  "dist/sw.js",
  "dist/manifest.webmanifest",
  "dist/404.html",
  "dist/icons/icon-192.png",
  "dist/icons/icon-512.png",
  "dist/icons/icon-maskable-512.png",
  "dist/fonts/PositiveSerif-Title.woff",
  "dist/textures/cover.webp",
  "dist/textures/cover.jpg",
  "dist/textures/paper-faint.jpg",
]) {
  if (!existsSync(file)) throw new Error(`없는 파일: ${file}`);
}

console.log(`built ${baseNorm} (${buildId})`);
