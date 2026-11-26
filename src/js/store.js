import { openUserDb } from "./idb.js";
import { cleanTasks, clip, isNewer, worksheetHasContent } from "./rules.js";
import { seoulToday } from "./dates.js";
import {
  emptyDaily,
  emptyMonthly,
  emptyReview,
  emptyStartPoint,
  emptyWeekly,
  emptyWorksheet,
  fromDailyRow,
  fromMonthlyRow,
  fromReviewRow,
  fromStartRow,
  fromWeeklyRow,
  fromWorksheetRow,
  publicRecord,
  reviewKey,
  toDailyRow,
  toMonthlyRow,
  toReviewRow,
  toStartRow,
  toWeeklyRow,
  toWorksheetRow,
} from "./rows.js";

const TABLES = {
  daily: {
    remote: "daily_entries",
    conflict: "user_id,entry_date",
    keyOf: (record) => record.date,
    toRow: toDailyRow,
    fromRow: fromDailyRow,
    filter: (query, key) => query.eq("entry_date", key),
  },
  weekly: {
    remote: "weekly_entries",
    conflict: "user_id,week_start",
    keyOf: (record) => record.weekStart,
    toRow: toWeeklyRow,
    fromRow: fromWeeklyRow,
    filter: (query, key) => query.eq("week_start", key),
  },
  monthly: {
    remote: "monthly_entries",
    conflict: "user_id,month",
    keyOf: (record) => record.month,
    toRow: toMonthlyRow,
    fromRow: fromMonthlyRow,
    filter: (query, key) => query.eq("month", key),
  },
  worksheets: {
    remote: "worksheets",
    conflict: "id",
    keyOf: (record) => record.id,
    toRow: toWorksheetRow,
    fromRow: fromWorksheetRow,
    filter: (query, key) => query.eq("id", key),
  },
  reviews: {
    remote: "reviews",
    conflict: "user_id,kind,period_start",
    keyOf: (record) => reviewKey(record.kind, record.periodStart),
    toRow: toReviewRow,
    fromRow: fromReviewRow,
    filter: (query, key) => {
      const [kind, periodStart] = String(key).split("|");
      return query.eq("kind", kind).eq("period_start", periodStart);
    },
  },
  startPoint: {
    remote: "start_points",
    conflict: "user_id",
    keyOf: () => "me",
    toRow: toStartRow,
    fromRow: fromStartRow,
    filter: (query) => query,
  },
};

export async function createStore({ mode, userId, supabase = null }) {
  const db = await openUserDb(userId);
  let queue = Promise.resolve();

  function serial(fn) {
    const run = queue.then(fn, fn);
    queue = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  async function enqueue(item) {
    const all = await db.all("outbox");
    if (all.some((row) => row.op === item.op && row.table === item.table && row.key === item.key)) return;
    await db.add("outbox", { ...item, at: Date.now() });
  }

  async function clearOutbox(table, key, op) {
    const all = await db.all("outbox");
    for (const item of all) {
      if (item.table === table && item.key === key && (!op || item.op === op)) {
        await db.delete("outbox", item.id);
      }
    }
  }

  async function writeRemote(tableName, record) {
    const table = TABLES[tableName];
    const { data, error } = await supabase
      .from(table.remote)
      .upsert(table.toRow(record, userId), { onConflict: table.conflict })
      .select()
      .single();
    if (error) throw error;
    return table.fromRow(data);
  }

  async function deleteRemote(tableName, key) {
    const table = TABLES[tableName];
    const { error } = await table.filter(supabase.from(table.remote).delete().eq("user_id", userId), key);
    if (error) throw error;
  }

  async function pushLatest(tableName, key, depth = 0) {
    if (mode !== "cloud" || !supabase) return { ok: true, preview: mode === "preview" };
    if (depth > 5) return { ok: false, local: true };
    const before = await db.get(tableName, key);
    if (!before) return { ok: true };
    const sentStamp = before.updatedAt;
    try {
      const remote = await writeRemote(tableName, before);
      const current = await db.get(tableName, key);
      if (current && current.updatedAt !== sentStamp) return pushLatest(tableName, key, depth + 1);
      if (current) {
        current.dirty = false;
        current.updatedAt = remote.updatedAt || sentStamp;
        await db.put(tableName, key, current);
      }
      await clearOutbox(tableName, key, "upsert");
      return { ok: true };
    } catch {
      await enqueue({ op: "upsert", table: tableName, key });
      return { ok: false, local: true };
    }
  }

  async function flushInner() {
    const items = await db.all("outbox");
    for (const item of items) {
      if (item.op === "delete") {
        try {
          await deleteRemote(item.table, item.key);
          await db.delete("outbox", item.id);
        } catch {
          break;
        }
        continue;
      }
      const result = await pushLatest(item.table, item.key);
      if (!result?.ok) break;
      await db.delete("outbox", item.id);
    }
  }

  async function pullInner() {
    if (mode !== "cloud" || !supabase) return;
    for (const name of Object.keys(TABLES)) {
      const table = TABLES[name];
      const { data, error } = await supabase.from(table.remote).select("*").eq("user_id", userId);
      if (error) throw error;
      const seen = new Set();
      for (const row of data || []) {
        const remote = table.fromRow(row);
        const key = table.keyOf(remote);
        seen.add(key);
        const local = await db.get(name, key);
        if (local?.dirty) {
          await pushLatest(name, key);
          continue;
        }
        if (!local || isNewer(remote.updatedAt, local.updatedAt)) await db.put(name, key, remote);
        else if (local && isNewer(local.updatedAt, remote.updatedAt)) await pushLatest(name, key);
      }
      for (const local of await db.all(name)) {
        const key = table.keyOf(local);
        if (seen.has(key)) continue;
        if (local.dirty) await pushLatest(name, key);
        else await db.delete(name, key);
      }
    }
    await flushInner();
  }

  function stamp(record, partial) {
    return { ...record, ...partial, dirty: true, updatedAt: new Date().toISOString() };
  }

  async function patchDailyInner(date, partial) {
    const current = (await db.get("daily", date)) || emptyDaily(date);
    const next = stamp(current, { ...partial, date });
    next.tasks = Object.prototype.hasOwnProperty.call(partial, "tasks")
      ? cleanTasks(partial.tasks)
      : current.tasks || [];
    for (const key of [
      "oneLine",
      "emotionFelt",
      "thoughtHeld",
      "choices",
      "feelingNote",
      "resultNote",
      "otherSideOneThing",
      "beliefToAccept",
      "nextAction",
    ]) {
      next[key] = clip(next[key], key === "oneLine" ? 4000 : 4000);
    }
    await db.put("daily", date, next);
    const result = await pushLatest("daily", date);
    return { record: await db.get("daily", date), ...result };
  }

  async function patchWeeklyInner(weekStart, partial) {
    const current = (await db.get("weekly", weekStart)) || emptyWeekly(weekStart);
    const next = stamp(current, { ...partial, weekStart });
    next.tasks = Object.prototype.hasOwnProperty.call(partial, "tasks")
      ? cleanTasks(partial.tasks, { withNextFix: false })
      : current.tasks || [];
    for (const key of ["choice1", "choice2", "choice3", "feelingNote", "resultNote", "nextFix", "review"]) {
      next[key] = clip(next[key]);
    }
    await db.put("weekly", weekStart, next);
    const result = await pushLatest("weekly", weekStart);
    return { record: await db.get("weekly", weekStart), ...result };
  }

  async function patchMonthlyInner(month, partial) {
    const current = (await db.get("monthly", month)) || emptyMonthly(month);
    const next = stamp(current, { ...partial, month });
    next.principle = clip(next.principle);
    next.structureCheck = clip(next.structureCheck);
    await db.put("monthly", month, next);
    const result = await pushLatest("monthly", month);
    return { record: await db.get("monthly", month), ...result };
  }

  async function patchReviewInner(kind, periodStart, periodEnd, partialBody) {
    const key = reviewKey(kind, periodStart);
    const current = (await db.get("reviews", key)) || emptyReview(kind, periodStart, periodEnd);
    const next = stamp(current, {
      kind,
      periodStart,
      periodEnd,
      body: { ...current.body, ...partialBody },
    });
    await db.put("reviews", key, next);
    const result = await pushLatest("reviews", key);
    return { record: await db.get("reviews", key), ...result };
  }

  async function patchStartInner(partial) {
    const current = (await db.get("startPoint", "me")) || emptyStartPoint();
    const next = stamp(current, partial);
    next.worries = [...(partial.worries || current.worries || [])].slice(0, 3).map((item) => clip(item));
    next.beliefs = [...(partial.beliefs || current.beliefs || [])].slice(0, 3).map((item) => clip(item));
    while (next.worries.length < 3) next.worries.push("");
    while (next.beliefs.length < 3) next.beliefs.push("");
    next.control = clip(next.control);
    await db.put("startPoint", "me", next);
    const result = await pushLatest("startPoint", "me");
    return { record: await db.get("startPoint", "me"), ...result };
  }

  return {
    mode,
    userId,
    pullAll: () => serial(pullInner),
    flush: () => serial(flushInner),
    pendingCount: () => serial(async () => (await db.all("outbox")).length),
    loadDaily: (date) => serial(async () => (await db.get("daily", date)) || emptyDaily(date)),
    patchDaily: (date, partial) => serial(() => patchDailyInner(date, partial)),
    listDailyBetween: (start, end) =>
      serial(async () => (await db.all("daily")).filter((day) => day.date >= start && day.date <= end)),
    loadWeekly: (weekStart) => serial(async () => (await db.get("weekly", weekStart)) || emptyWeekly(weekStart)),
    patchWeekly: (weekStart, partial) => serial(() => patchWeeklyInner(weekStart, partial)),
    loadMonthly: (month) => serial(async () => (await db.get("monthly", month)) || emptyMonthly(month)),
    patchMonthly: (month, partial) => serial(() => patchMonthlyInner(month, partial)),
    listWorksheets: (type) =>
      serial(async () =>
        (await db.all("worksheets"))
          .filter((sheet) => !type || sheet.type === type)
          .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1)),
      ),
    loadWorksheet: (id) => serial(() => db.get("worksheets", id)),
    createWorksheet: ({ type, entryDate, dailyDate = null, id }) =>
      serial(async () => {
        const sheet = emptyWorksheet({
          id: id || crypto.randomUUID(),
          type,
          entryDate: entryDate || seoulToday(),
          dailyDate,
        });
        sheet.updatedAt = new Date().toISOString();
        sheet.dirty = true;
        await db.put("worksheets", sheet.id, sheet);
        return sheet;
      }),
    patchWorksheet: (id, partial) =>
      serial(async () => {
        const current = await db.get("worksheets", id);
        if (!current) return { ok: false, local: true, record: null };
        const next = stamp(current, {
          ...partial,
          id,
          body: { ...current.body, ...(partial.body || {}) },
        });
        await db.put("worksheets", id, next);
        if (!worksheetHasContent(next.body) && mode !== "cloud") {
          return { record: next, ok: true, preview: true };
        }
        const result = await pushLatest("worksheets", id);
        return { record: await db.get("worksheets", id), ...result };
      }),
    deleteWorksheet: (id) =>
      serial(async () => {
        await db.delete("worksheets", id);
        if (mode !== "cloud" || !supabase) return { ok: true, preview: true };
        try {
          await deleteRemote("worksheets", id);
          await clearOutbox("worksheets", id);
          return { ok: true };
        } catch {
          await enqueue({ op: "delete", table: "worksheets", key: id });
          return { ok: false, local: true };
        }
      }),
    loadReview: (kind, periodStart, periodEnd) =>
      serial(async () => (await db.get("reviews", reviewKey(kind, periodStart))) || emptyReview(kind, periodStart, periodEnd)),
    patchReview: (kind, periodStart, periodEnd, body) =>
      serial(() => patchReviewInner(kind, periodStart, periodEnd, body)),
    listReviews: (kind) =>
      serial(async () =>
        (await db.all("reviews"))
          .filter((review) => !kind || review.kind === kind)
          .sort((a, b) => (a.periodStart < b.periodStart ? 1 : -1)),
      ),
    loadStartPoint: () => serial(async () => (await db.get("startPoint", "me")) || emptyStartPoint()),
    patchStartPoint: (partial) => serial(() => patchStartInner(partial)),
    exportAll: () =>
      serial(async () => {
        try {
          await pullInner();
        } catch {
          /* 계정에 닿지 않아도 이 기기의 기록을 내보냅니다. */
        }
        const start = await db.get("startPoint", "me");
        return {
          app: "positive-planner",
          version: 1,
          timezone: "Asia/Seoul",
          exportedAt: new Date().toISOString(),
          daily: (await db.all("daily")).map(publicRecord),
          weekly: (await db.all("weekly")).map(publicRecord),
          monthly: (await db.all("monthly")).map(publicRecord),
          worksheets: (await db.all("worksheets")).map(publicRecord),
          reviews: (await db.all("reviews")).map(publicRecord),
          startPoint: start?.updatedAt ? publicRecord(start) : null,
        };
      }),
    deleteAll: () =>
      serial(async () => {
        if (mode === "cloud" && supabase) {
          for (const name of Object.keys(TABLES)) {
            const { error } = await supabase.from(TABLES[name].remote).delete().eq("user_id", userId);
            if (error) throw error;
          }
        }
        for (const name of [...Object.keys(TABLES), "outbox"]) await db.clear(name);
        return { ok: true, preview: mode !== "cloud" };
      }),
  };
}
