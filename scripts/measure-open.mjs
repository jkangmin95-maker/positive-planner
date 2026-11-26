import { existsSync } from "node:fs";
import { spawn } from "node:child_process";
import puppeteer from "puppeteer-core";

const port = Number(process.env.PORT || 18771);
const origin = `http://127.0.0.1:${port}/positive-planner`;
const chrome = existsSync("/usr/local/bin/google-chrome")
  ? "/usr/local/bin/google-chrome"
  : "/usr/bin/google-chrome";
const runs = Number(process.env.RUNS || 5);
// Lighthouse / DevTools "Slow 4G": 1.6 Mbps down, 0.75 Mbps up, 150 ms RTT, 4x CPU.
const DOWNLOAD = (1.6 * 1024 * 1024) / 8;
const UPLOAD = (0.75 * 1024 * 1024) / 8;
const LATENCY = 150;
const CPU = 4;

const server = spawn("node", ["scripts/serve.mjs"], {
  stdio: ["ignore", "pipe", "pipe"],
  env: { ...process.env, PORT: String(port) },
});

await waitForServer();

const browser = await puppeteer.launch({
  executablePath: chrome,
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});

const results = [];
try {
  for (let i = 0; i < runs; i += 1) {
    const context = await browser.createBrowserContext();
    const page = await context.newPage();
    const client = await page.createCDPSession();
    await client.send("Network.enable");
    await client.send("Network.setCacheDisabled", { cacheDisabled: true });
    await client.send("Network.emulateNetworkConditions", {
      offline: false,
      latency: LATENCY,
      downloadThroughput: DOWNLOAD,
      uploadThroughput: UPLOAD,
      connectionType: "cellular4g",
    });
    await client.send("Emulation.setCPUThrottlingRate", { rate: CPU });
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });

    const started = Date.now();
    await page.goto(`${origin}/?preview=1&cover=1&cue=0`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("#cover:not([hidden])");
    const coverMs = Date.now() - started;
    const coverColor = await page.$eval("#cover", (node) => getComputedStyle(node).backgroundColor);
    await page.click("#cover");
    await page.waitForSelector("textarea#one-line:not([disabled])");
    await page.waitForFunction(() => {
      const field = document.querySelector("textarea#one-line");
      const book = document.querySelector("#book");
      return Boolean(field && !field.disabled && book?.classList.contains("is-flat"));
    });
    const usableMs = Date.now() - started;
    results.push({ run: i + 1, coverMs, usableMs, coverColor });
    console.log(`run ${i + 1}: cover ${coverMs}ms, usable ${usableMs}ms, fallback ${coverColor}`);
    await context.close();
  }
} finally {
  await browser.close();
  server.kill();
}

const usable = results.map((row) => row.usableMs).sort((a, b) => a - b);
const cover = results.map((row) => row.coverMs).sort((a, b) => a - b);
const median = (list) => {
  const mid = Math.floor(list.length / 2);
  return list.length % 2 ? list[mid] : Math.round((list[mid - 1] + list[mid]) / 2);
};
const summary = {
  profile: "Slow 4G 1.6Mbps / 150ms RTT / 4x CPU, cache disabled, 390px",
  runs,
  coverMs: { min: cover[0], median: median(cover), max: cover.at(-1) },
  usableMs: { min: usable[0], median: median(usable), max: usable.at(-1) },
  results,
};
console.log(JSON.stringify(summary, null, 2));
if (summary.usableMs.median > 3000) {
  console.error(`median usable ${summary.usableMs.median}ms exceeds 3s`);
  process.exit(1);
}

function waitForServer() {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("server timeout")), 8000);
    const look = () => {
      fetch(`${origin}/`)
        .then((response) => {
          if (!response.ok) throw new Error(String(response.status));
          clearTimeout(timer);
          resolve();
        })
        .catch(() => setTimeout(look, 150));
    };
    look();
  });
}
