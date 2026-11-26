import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import puppeteer from "puppeteer-core";

const port = 4173;
const origin = `http://127.0.0.1:${port}/positive-planner/`;
const outDir = "/opt/cursor/artifacts";

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

const problems = [];
try {
  await mkdir(outDir, { recursive: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
  page.on("pageerror", (error) => problems.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") problems.push(`console: ${message.text()}`);
  });

  await shot(page, origin, "01-unconfigured.png", ".unconfigured h1");
  const unconfigured = await page.evaluate(() => document.body.innerText);
  if (!unconfigured.includes("아직 연결 정보가 없습니다")) problems.push("연결 전 문구가 없습니다");
  if (unconfigured.includes("오늘 한 줄이면")) problems.push("연결 전 화면에 기록이 열렸습니다");

  await shot(page, `${origin}?preview=auth`, "02-login.png", ".login h1");
  if (!(await page.$('input[name="email"]'))) problems.push("이메일 입력이 없습니다");
  if (!(await page.evaluate(() => document.body.innerText.includes("Google 계정으로 들어가기")))) {
    problems.push("Google 로그인이 없습니다");
  }

  await shot(page, `${origin}?preview=1`, "03-home.png", "textarea[name=oneLine]");
  await page.type("textarea[name=oneLine]", "그럴 수 있지.");
  await page.waitForFunction(() => document.querySelector("#save-status")?.textContent?.includes("저장"));
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForSelector("textarea[name=oneLine]");
  const kept = await page.$eval("textarea[name=oneLine]", (node) => node.value);
  if (kept !== "그럴 수 있지.") problems.push(`새로고침 뒤 한 줄이 사라졌습니다: ${kept}`);

  await open(page, "/today?preview=1");
  await page.waitForSelector("#one-line");
  if (!(await page.evaluate(() => document.body.innerText.includes("이 한 줄이면 충분합니다")))) {
    problems.push("오늘 화면에 충분 문구가 없습니다");
  }
  await page.type("#feeling", "조금 편안하다");
  await page.waitForFunction(() => !document.querySelector("#other-side")?.parentElement?.hidden);
  await shot(page, null, "04-today.png");

  await open(page, "/week?preview=1");
  await page.waitForSelector(".week-days");
  const weekText = await page.evaluate(() => document.body.innerText);
  if (!weekText.includes("그럴 수 있지.")) problems.push("주간 칸에 오늘 한 줄이 없습니다");
  if (/미작성|스트릭|0\s*\/\s*7/.test(weekText)) problems.push(`주간에 금지 문구: ${weekText}`);
  await shot(page, null, "05-week.png");

  await open(page, "/worksheet/a/new?preview=1");
  await page.waitForSelector("#sheet-fact");
  await page.type("#sheet-fact", "회의가 길어졌다");
  await page.waitForFunction(() => document.querySelector("#save-status")?.textContent?.includes("저장"));
  await open(page, "/worksheet/a?preview=1");
  await page.waitForFunction(() => document.body.innerText.includes("회의가 길어졌다"));
  await shot(page, null, "06-worksheet-a.png");

  await open(page, "/worksheet/c/new?preview=1");
  await page.waitForSelector("#sheet-nextAction");
  const cText = await page.evaluate(() => document.body.innerText);
  if (!cText.includes("왜 못했는가는 묻지 않습니다")) problems.push("책임 선택 안내가 없습니다");
  if (cText.includes("왜 못했") && !cText.includes("묻지 않습니다")) problems.push("책임 칸이 추궁처럼 보입니다");
  await shot(page, null, "07-worksheet-c.png");

  await shot(page, `${origin}practice?preview=1`, "08-practice.png", "h1");
  await shot(page, `${origin}guide?preview=1`, "09-guide.png", "#phrases");
  await shot(page, `${origin}install?preview=1`, "10-install.png", "h1");
  await shot(page, `${origin}review?preview=1`, "11-review.png", "h1");
  await shot(page, `${origin}more?preview=1`, "12-more.png", "h1");
  await shot(page, `${origin}month?preview=1`, "13-month.png", ".calendar");
  await shot(page, `${origin}settings?preview=1`, "14-settings.png", "#start");

  const sw = await page.evaluate(async () => {
    const regs = await navigator.serviceWorker.getRegistrations();
    return regs.map((reg) => reg.scope);
  });
  if (!sw.some((scope) => scope.includes("/positive-planner/"))) problems.push(`서비스 워커 없음: ${sw.join(",")}`);

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  );
  if (overflow) problems.push("설정 화면이 가로로 넘칩니다");

  await page.evaluate(() => {
    const button = [...document.querySelectorAll("button")].find((node) => node.textContent.includes("JSON으로 내보내기"));
    button.click();
  });
  await page.waitForFunction(() => document.querySelector("#save-status")?.textContent?.includes("JSON"));
} finally {
  await browser.close();
  server.kill();
}

if (problems.length) {
  console.error(problems.join("\n"));
  process.exit(1);
}
console.log("verified");

async function open(page, path) {
  await page.goto(`${origin.replace(/\/$/, "")}${path}`, { waitUntil: "domcontentloaded" });
}

async function shot(page, url, name, selector) {
  if (url) await page.goto(url, { waitUntil: "domcontentloaded" });
  if (selector) await page.waitForSelector(selector);
  await page.screenshot({ path: `${outDir}/${name}` });
}

function waitForServer() {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("server timeout")), 8000);
    const look = () => {
      fetch(origin)
        .then((response) => {
          if (!response.ok && response.status !== 200) throw new Error(String(response.status));
          clearTimeout(timer);
          resolve();
        })
        .catch(() => setTimeout(look, 150));
    };
    look();
  });
}
