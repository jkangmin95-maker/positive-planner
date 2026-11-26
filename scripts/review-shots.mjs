import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import puppeteer from "puppeteer-core";
import { SAMPLE_SHEETS } from "../src/js/sample.js";

const port = 4173;
const origin = `http://127.0.0.1:${port}/positive-planner`;
const outDir = "/opt/cursor/artifacts";

const shots = [
  ["login", `/?preview=auth`, "h1"],
  ["home", `/?preview=1&sample=1`, "textarea[name=oneLine]"],
  ["today", `/today?preview=1&sample=1`, "#next-action"],
  ["week", `/week?preview=1&sample=1`, "#review"],
  ["worksheet-a", `/worksheet/a/${SAMPLE_SHEETS.A}?preview=1&sample=1`, "#sheet-fact"],
  ["worksheet-b", `/worksheet/b/${SAMPLE_SHEETS.B}?preview=1&sample=1`, "#sheet-fixedBelief"],
  ["worksheet-c", `/worksheet/c/${SAMPLE_SHEETS.C}?preview=1&sample=1`, "#sheet-nextAction"],
  ["practice", `/practice?preview=1&sample=1`, "h1"],
  ["install", `/install?preview=1&sample=1`, "h1"],
];

const server = spawn("node", ["scripts/serve.mjs"], {
  stdio: ["ignore", "pipe", "pipe"],
  env: { ...process.env, PORT: String(port) },
});

await waitForServer();
const browser = await puppeteer.launch({
  executablePath: "/usr/local/bin/google-chrome",
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});

try {
  await mkdir(outDir, { recursive: true });
  const page = await browser.newPage();
  page.on("pageerror", (error) => {
    throw error;
  });
  for (const width of [390, 1280]) {
    for (const [name, path, selector] of shots) {
      await page.setViewport({ width, height: width === 390 ? 844 : 900, deviceScaleFactor: 2 });
      await page.goto(`${origin}${path}`, { waitUntil: "domcontentloaded" });
      await page.waitForSelector(selector);
      await page.evaluate(() => document.fonts.ready);
      if (name === "home") {
        await page.waitForFunction(() => document.querySelector("textarea[name=oneLine]")?.value === "그럴 수 있지.");
      }
      const height = await page.evaluate(() => document.documentElement.scrollHeight);
      const minHeight = width === 390 ? 844 : 900;
      await page.setViewport({
        width,
        height: Math.max(height, minHeight),
        deviceScaleFactor: 2,
      });
      await page.evaluate(() => window.scrollTo(0, 0));
      const file = `${outDir}/${name}-${width}.png`;
      await page.screenshot({ path: file });
      console.log(file);
    }
  }
} finally {
  await browser.close();
  server.kill();
}

function waitForServer() {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("server timeout")), 8000);
    const look = () => {
      fetch(`${origin}/`)
        .then(() => {
          clearTimeout(timer);
          resolve();
        })
        .catch(() => setTimeout(look, 150));
    };
    look();
  });
}
