import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import puppeteer from "puppeteer-core";

const port = 18773;
const origin = `http://127.0.0.1:${port}/positive-planner`;
const chrome = existsSync("/usr/local/bin/google-chrome") ? "/usr/local/bin/google-chrome" : "/usr/bin/google-chrome";
const server = spawn("node", ["scripts/serve.mjs"], {
  stdio: ["ignore", "pipe", "pipe"],
  env: { ...process.env, PORT: String(port) },
  cwd: "/tmp/ppm",
});
await new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error("server timeout")), 8000);
  const look = () => {
    fetch(`${origin}/`).then((r) => { if (!r.ok) throw new Error(String(r.status)); clearTimeout(timer); resolve(); }).catch(() => setTimeout(look, 150));
  };
  look();
});

const browser = await puppeteer.launch({ executablePath: chrome, headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
const results = {};
try {
  for (const width of [390, 1280]) {
    const context = await browser.createBrowserContext();
    const page = await context.newPage();
    await page.setViewport({ width, height: width === 390 ? 844 : 800, deviceScaleFactor: 2 });

    // login unchanged
    await page.goto(`${origin}/?preview=auth`, { waitUntil: "networkidle0" });
    const login = await page.evaluate(() => ({
      h1: document.querySelector("h1")?.innerText || "",
      hasEmail: Boolean(document.querySelector("input[type=email], input#email, input[name=email]")),
      hasGoogle: /구글|Google/i.test(document.body.innerText),
      path: location.pathname + location.search,
    }));

    // cover tap -> today input
    await page.goto(`${origin}/?preview=1&cover=1&cue=0`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("#cover:not([hidden])");
    const before = await page.evaluate(() => ({
      coverShown: Boolean(document.querySelector("#cover:not([hidden])")),
      textareaDisabled: document.querySelector("textarea#one-line")?.disabled ?? null,
    }));
    await page.click("#cover");
    await page.waitForSelector("textarea#one-line:not([disabled])");
    await page.waitForFunction(() => document.querySelector("#book")?.classList.contains("is-flat"));
    const afterOpen = await page.evaluate(() => ({
      coverHidden: document.querySelector("#cover")?.hidden || getComputedStyle(document.querySelector("#cover")).display === "none" || document.querySelector("#book")?.classList.contains("is-flat"),
      usable: Boolean(document.querySelector("textarea#one-line") && !document.querySelector("textarea#one-line").disabled),
    }));

    const marker = `저장확인-${width}-${Date.now()}`;
    await page.focus("textarea#one-line");
    await page.evaluate((value) => {
      const field = document.querySelector("textarea#one-line");
      field.value = value;
      field.dispatchEvent(new Event("input", { bubbles: true }));
    }, marker);
    await page.waitForFunction(() => {
      const status = document.body.innerText;
      return /저장|저장됨|방금/.test(status);
    }, { timeout: 4000 }).catch(() => {});
    await new Promise((r) => setTimeout(r, 500));
    // Do not reuse cover=1: that query forces the cover even after pp.hasOpened.
    await page.goto(`${origin}/today?preview=1`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("textarea#one-line:not([disabled])", { timeout: 8000 });
    const persisted = await page.$eval("textarea#one-line", (n) => n.value);

    results[width] = { login, before, afterOpen, marker, persisted, persistOk: persisted.includes(marker) };
    await context.close();
  }
} finally {
  await browser.close();
  server.kill();
}
console.log(JSON.stringify(results, null, 2));
if (!results[390]?.afterOpen.usable || !results[1280]?.afterOpen.usable) process.exit(1);
if (!results[390]?.persistOk || !results[1280]?.persistOk) process.exit(2);
if (!results[390]?.login.h1 || !results[1280]?.login.h1) process.exit(3);
