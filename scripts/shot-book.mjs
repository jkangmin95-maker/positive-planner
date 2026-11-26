import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import puppeteer from "puppeteer-core";

const port = Number(process.env.SHOT_PORT || 18772);
const origin = `http://127.0.0.1:${port}/positive-planner`;
const outDir = "/workspace/positive-planner/review-book";
await mkdir(outDir, { recursive: true });

const shots = [
  ["cover-390", `/?preview=1&cover=1&cue=0`, "#cover", 390, 844],
  ["cover-1280", `/?preview=1&cover=1&cue=0`, "#cover", 1280, 800],
  ["today-390", `/today?preview=1&opened=1`, "textarea#one-line", 390, 844],
  ["today-1280", `/today?preview=1&opened=1`, "textarea#one-line", 1280, 800],
  ["login-390", `/?preview=auth`, "h1", 390, 844],
];

const server = spawn("node", ["scripts/serve.mjs"], {
  stdio: ["ignore", "pipe", "pipe"],
  env: { ...process.env, PORT: String(port) },
});

await new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error("server timeout")), 8000);
  const look = () => {
    fetch(`${origin}/`)
      .then((res) => {
        if (!res.ok) throw new Error(String(res.status));
        clearTimeout(timer);
        resolve();
      })
      .catch(() => setTimeout(look, 150));
  };
  look();
});

const chrome = existsSync("/usr/local/bin/google-chrome")
  ? "/usr/local/bin/google-chrome"
  : "/usr/bin/google-chrome";
const browser = await puppeteer.launch({
  executablePath: chrome,
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});

try {
  const page = await browser.newPage();
  page.on("pageerror", (error) => {
    console.error("pageerror", error);
    throw error;
  });
  for (const [name, path, selector, width, height] of shots) {
    await page.setViewport({ width, height, deviceScaleFactor: 2 });
    await page.goto(`${origin}${path}`, { waitUntil: "networkidle0" });
    await page.waitForSelector(selector);
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.addStyleTag({ content: "html, body { overflow: hidden; }" });
    const file = `${outDir}/${name}.png`;
    await page.screenshot({ path: file, fullPage: false });
    console.log(file);
    if (name.startsWith("cover")) {
      const coverText = await page.evaluate(() => document.querySelector("#cover")?.innerText || "");
      console.log(name, "coverText=", JSON.stringify(coverText));
    }
    if (name.startsWith("today")) {
      const placeholder = await page.$eval("textarea#one-line", (n) => n.placeholder);
      console.log(name, "placeholder=", placeholder);
    }
    if (name.startsWith("login")) {
      const title = await page.$eval("h1", (n) => n.innerText);
      console.log(name, "h1=", title);
    }
  }
} finally {
  await browser.close();
  server.kill();
}
