import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { PP_CONFIG } from "../src/config.js";
import { configStatus, isSecretKey } from "../src/js/configCheck.js";
import {
  addDays,
  formatDateInTimeZone,
  fourWeekRange,
  seoulToday,
  weekDays,
  weekStart,
} from "../src/js/dates.js";
import { applyPhrase, showOtherSide } from "../src/js/rules.js";
import { matchPath, stripBase } from "../src/js/router.js";
import { seedSample, SAMPLE_SHEETS } from "../src/js/sample.js";
import { createStore } from "../src/js/store.js";
import { toDailyRow, toReviewRow, toWeeklyRow, toWorksheetRow } from "../src/js/rows.js";
import { installIsMobile } from "../src/js/screens/misc.js";
import { shouldShowCover, hasOpened, markOpened, clearOpened, OPENED_KEY } from "../src/js/cover.js";
import { hasDailyContent, journalToText } from "../src/js/textExport.js";

test("서울 날짜는 자정을 넘기면 다음 날이다", () => {
  assert.equal(formatDateInTimeZone(new Date("2026-11-25T15:30:00Z"), "Asia/Seoul"), "2026-11-26");
  assert.equal(formatDateInTimeZone(new Date("2026-11-25T14:30:00Z"), "Asia/Seoul"), "2026-11-25");
  assert.match(seoulToday(), /^\d{4}-\d{2}-\d{2}$/);
});

test("한 주는 월요일에 시작한다", () => {
  assert.equal(weekStart("2026-11-26"), "2026-11-23");
  assert.equal(weekStart("2026-11-23"), "2026-11-23");
  assert.equal(weekStart("2026-11-29"), "2026-11-23");
  assert.deepEqual(weekDays("2026-11-26")[0], "2026-11-23");
  assert.equal(weekDays("2026-11-26")[6], "2026-11-29");
  const range = fourWeekRange("2026-11-26");
  assert.equal(range.start, addDays("2026-11-23", -21));
  assert.equal(range.end, "2026-11-29");
});

test("한쪽만 적었을 때만 다른 쪽 칸을 연다", () => {
  assert.equal(showOtherSide("편하다", ""), true);
  assert.equal(showOtherSide("", "나아진다"), true);
  assert.equal(showOtherSide("", ""), false);
  assert.equal(showOtherSide("편하다", "나아진다"), false);
  assert.equal(showOtherSide("  ", "  "), false);
});

test("이미 적은 문장은 예시가 덮지 않는다", () => {
  assert.deepEqual(applyPhrase("", "그럴 수 있지."), { value: "그럴 수 있지.", kept: false });
  assert.deepEqual(applyPhrase("내 문장", "그럴 수 있지."), { value: "내 문장", kept: true });
});

test("경로는 베이스를 떼고 화면 이름으로 맞춘다", () => {
  assert.equal(stripBase("/positive-planner/today", "/positive-planner/"), "/today");
  assert.equal(stripBase("/positive-planner", "/positive-planner/"), "/");
  const today = matchPath(stripBase("/positive-planner/day/2026-11-26", "/positive-planner/"));
  assert.equal(today.name, "today");
  assert.equal(today.params.date, "2026-11-26");
  const sheet = matchPath("/worksheet/c/new?guide=7");
  assert.equal(sheet.name, "worksheetEdit");
  assert.equal(sheet.params.type, "c");
  assert.equal(sheet.params.id, "new");
  assert.equal(sheet.query.get("guide"), "7");
  assert.equal(matchPath("/nope").name, "missing");
});

test("공개 설정은 준비되어 있고 비밀 키는 거절한다", () => {
  assert.equal(PP_CONFIG.supabaseUrl, "https://awhnphwdifwnnfpbusqd.supabase.co");
  assert.ok(PP_CONFIG.supabaseAnonKey);
  assert.equal(isSecretKey(PP_CONFIG.supabaseAnonKey), false);
  assert.equal(configStatus(PP_CONFIG).reason, "ready");
  const header = Buffer.from(JSON.stringify({ alg: "none" })).toString("base64url");
  const secret = Buffer.from(JSON.stringify({ role: "service_role" })).toString("base64url");
  const anon = Buffer.from(JSON.stringify({ role: "anon" })).toString("base64url");
  assert.equal(isSecretKey(`${header}.${secret}.x`), true);
  assert.equal(isSecretKey("sb_secret_example"), true);
  assert.equal(configStatus({ supabaseUrl: "https://example.supabase.co", supabaseAnonKey: `${header}.${secret}.x` }).reason, "secret");
  assert.equal(
    configStatus({ supabaseUrl: "https://example.supabase.co", supabaseAnonKey: `${header}.${anon}.signature-long` }).ok,
    true,
  );
});

test("미리보기 저장소는 오늘 한 줄과 워크시트 C의 행동 하나를 남긴다", async () => {
  const store = await createStore({ mode: "preview", userId: `test-${Date.now()}` });
  await store.patchDaily("2026-11-26", { oneLine: "그럴 수 있지." });
  const daily = await store.loadDaily("2026-11-26");
  assert.equal(daily.oneLine, "그럴 수 있지.");
  const empty = await store.loadDaily("2026-11-25");
  assert.equal(hasDailyContent(empty), false);
  const sheet = await store.createWorksheet({ type: "C", entryDate: "2026-11-26" });
  await store.patchWorksheet(sheet.id, { body: { nextAction: "물 한 잔 마시기" } });
  const saved = await store.loadWorksheet(sheet.id);
  assert.equal(saved.body.nextAction, "물 한 잔 마시기");
  assert.equal(saved.body.reasons, undefined);
  const exported = await store.exportAll();
  assert.equal(exported.timezone, "Asia/Seoul");
  assert.equal(exported.daily.some((day) => day.oneLine === "그럴 수 있지."), true);
  const text = journalToText(exported);
  assert.match(text, /오늘 한 줄: 그럴 수 있지\./);
  assert.equal(text.includes("미작성"), false);
});

test("예시 데이터는 오늘 한 줄과 워크시트 셋을 채운다", async () => {
  const store = await createStore({ mode: "preview", userId: `sample-${Date.now()}` });
  await seedSample(store, "2026-11-26");
  const daily = await store.loadDaily("2026-11-26");
  assert.equal(daily.oneLine, "그럴 수 있지.");
  assert.equal(daily.nextAction, "물 한 잔 마시고 창을 연다.");
  const sheet = await store.loadWorksheet(SAMPLE_SHEETS.C);
  assert.equal(sheet.body.nextAction, "물 한 잔 마시고 창을 연다.");
  assert.equal(sheet.body.reasons, undefined);
});

test("SQL은 본인 행만 열고 anon에는 권한을 주지 않는다", async () => {
  const sql = await readFile("supabase/migrations/20261126120000_init_planner.sql", "utf8");
  const created = await readFile("supabase/migrations/20261126153000_created_at.sql", "utf8");
  assert.match(sql, /enable row level security/);
  assert.match(sql, /\(select auth\.uid\(\)\) = user_id/);
  assert.match(sql, /with check \(\(select auth\.uid\(\)\) = user_id\)/);
  assert.match(sql, /to authenticated/);
  assert.match(sql, /revoke all on table %I\.%I from public, anon/);
  assert.doesNotMatch(sql, /grant\s+.*service_role/i);
  assert.doesNotMatch(sql, /using \(true\)/);
  assert.doesNotMatch(created, /create policy/);
  assert.doesNotMatch(created, /enable row level security/);
  for (const table of ["daily_entries", "weekly_entries", "worksheets", "reviews"]) {
    assert.match(sql, new RegExp(`${table}[\\s\\S]*created_at timestamptz not null default now\\(\\)`));
    assert.match(created, new RegExp(`alter table public\\.${table}`));
    assert.match(sql, new RegExp(`keep_created_at on public\\.${table}`));
  }
  assert.match(sql, /new\.created_at = old\.created_at/);
  const monthly = sql.match(/create table if not exists public\.monthly_entries \([\s\S]*?\);/)[0];
  const startPoints = sql.match(/create table if not exists public\.start_points \([\s\S]*?\);/)[0];
  assert.doesNotMatch(monthly, /created_at/);
  assert.doesNotMatch(startPoints, /created_at/);
});

test("설치 안내는 좁은 화면에서 아이폰을 먼저 둔다", () => {
  assert.equal(installIsMobile({ userAgent: "Mozilla/5.0 (iPhone)", viewportWidth: 390 }), true);
  assert.equal(installIsMobile({ userAgent: "Mozilla/5.0 (Linux; Android 14)", viewportWidth: 800 }), true);
  assert.equal(installIsMobile({ userAgent: "Mozilla/5.0", coarse: true, viewportWidth: 1280 }), true);
  assert.equal(installIsMobile({ userAgent: "Mozilla/5.0", coarse: false, viewportWidth: 390 }), true);
  assert.equal(installIsMobile({ userAgent: "Mozilla/5.0", coarse: false, viewportWidth: 1280 }), false);
  assert.equal(installIsMobile({ userAgent: "Mozilla/5.0", coarse: false, viewportWidth: 767 }), true);
  assert.equal(installIsMobile({ userAgent: "Mozilla/5.0", coarse: false, viewportWidth: 768 }), false);
});

test("저장 요청은 created_at을 덮어쓰지 않는다", () => {
  const record = {
    date: "2026-11-26",
    weekStart: "2026-11-23",
    month: "2026-11",
    id: "11111111-1111-4111-8111-111111111111",
    type: "A",
    kind: "4week",
    periodStart: "2026-11-02",
    periodEnd: "2026-11-29",
    createdAt: "2020-01-01T00:00:00.000Z",
    updatedAt: "2026-11-26T00:00:00.000Z",
    body: {},
  };
  for (const row of [
    toDailyRow(record, "user"),
    toWeeklyRow(record, "user"),
    toWorksheetRow(record, "user"),
    toReviewRow(record, "user"),
  ]) {
    assert.equal(Object.hasOwn(row, "created_at"), false);
    assert.equal(row.updated_at, record.updatedAt);
  }
});

test("화면 문구는 빈칸을 실패로 세지 않는다", async () => {
  const files = await walk("src");
  const banned = [/스트릭/, /미작성/, /미완성/, /낙제/, /벌점/, /랭킹/, /0\s*\/\s*7/, /채움\s*%/, /연속\s*일수/, /돌아왔/, /축하합니다/];
  const required = [
    "오늘 한 줄",
    "이 한 줄이면 충분합니다",
    "며칠을 비워도 오늘부터 다시 오면 됩니다",
    "다음에 고칠 한 가지",
    "통제권을 되찾는 일",
    "홈 화면에 추가",
    "그럴 수 있지",
    "고정관념 전환",
    "책임 선택",
    "7일 연습",
    "자동으로 이어지지 않습니다",
    "하나 배운 거지",
    "빈칸은 실패가 아닙니다",
    "왜 못했는가는 묻지 않습니다",
  ];
  const corpus = [];
  for (const file of files) {
    const text = await readFile(file, "utf8");
    corpus.push(text);
    const lines = text.split("\n");
    lines.forEach((line, index) => {
      for (const pattern of banned) {
        assert.equal(pattern.test(line), false, `${file}:${index + 1} ${pattern} ${line.trim()}`);
      }
      if (line.includes("실패") && !/아닙니다|두지|않습니다|없습니다/.test(line)) {
        assert.fail(`${file}:${index + 1} 실패가 부정 없이 쓰였습니다: ${line.trim()}`);
      }
      if (/왜 못했/.test(line) && !/묻지 않/.test(line)) {
        assert.fail(`${file}:${index + 1} 추궁 문구: ${line.trim()}`);
      }
    });
  }
  const all = corpus.join("\n");
  for (const phrase of required) assert.equal(all.includes(phrase), true, phrase);
});

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(full)));
    else if (/\.(js|css|html|md)$/.test(entry.name)) files.push(full);
  }
  return files;
}

test("첫 방문만 표지를 보여주고 재방문은 바로 펼친다", () => {
  const memory = new Map();
  globalThis.localStorage = {
    getItem: (key) => (memory.has(key) ? memory.get(key) : null),
    setItem: (key, value) => memory.set(key, String(value)),
    removeItem: (key) => memory.delete(key),
  };
  clearOpened();
  assert.equal(hasOpened(), false);
  assert.equal(shouldShowCover(new URLSearchParams()), true);
  markOpened();
  assert.equal(hasOpened(), true);
  assert.equal(shouldShowCover(new URLSearchParams()), false);
  assert.equal(shouldShowCover(new URLSearchParams("cover=1")), true);
  assert.equal(shouldShowCover(new URLSearchParams("visit=first")), true);
  assert.equal(shouldShowCover(new URLSearchParams("opened=1")), false);
  assert.equal(shouldShowCover(new URLSearchParams("visit=return")), false);
  clearOpened();
  assert.equal(hasOpened(), false);
  assert.equal(shouldShowCover(new URLSearchParams()), true);
  assert.equal(OPENED_KEY, "pp.hasOpened");
});


function relLum(hex) {
  const h = hex.replace("#", "");
  const rgb = [0, 2, 4].map((i) => {
    const c = Number.parseInt(h.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
}

function contrast(a, b) {
  const l1 = relLum(a);
  const l2 = relLum(b);
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

test("본문과 칸 이름은 카드 위에서 최소 7:1이다", async () => {
  const css = await readFile(new URL("../src/css/app.css", import.meta.url), "utf8");
  const grab = (name) => css.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`))[1];
  const ink = grab("ink");
  const muted = grab("muted");
  const gold = grab("gold");
  const card = grab("card");
  assert.equal(ink, "#2c241c");
  assert.ok(contrast(ink, card) >= 7, `ink ${contrast(ink, card).toFixed(2)}`);
  assert.ok(contrast(muted, card) >= 7, `muted ${contrast(muted, card).toFixed(2)}`);
  assert.ok(contrast(gold, card) >= 7, `gold ${contrast(gold, card).toFixed(2)}`);
  const paper = css.match(/--paper:\s*(#[0-9a-fA-F]{6})/)?.[1] || card;
  assert.ok(contrast(ink, paper) >= 7, `ink on paper ${contrast(ink, paper).toFixed(2)}`);
});
