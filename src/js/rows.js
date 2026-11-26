import { clip, cleanTasks } from "./rules.js";

export function emptyDaily(date) {
  return {
    date,
    oneLine: "",
    emotionFelt: "",
    thoughtHeld: "",
    choices: "",
    feelingNote: "",
    resultNote: "",
    otherSideOneThing: "",
    tasks: [],
    beliefToAccept: "",
    nextAction: "",
    updatedAt: "",
    dirty: false,
  };
}

export function emptyWeekly(weekStart) {
  return {
    weekStart,
    choice1: "",
    choice2: "",
    choice3: "",
    feelingNote: "",
    resultNote: "",
    tasks: [],
    nextFix: "",
    review: "",
    updatedAt: "",
    dirty: false,
  };
}

export function emptyMonthly(month) {
  return {
    month,
    principle: "",
    structureCheck: "",
    updatedAt: "",
    dirty: false,
  };
}

export function emptyWorksheet({ id, type, entryDate, dailyDate = null }) {
  return {
    id,
    type,
    entryDate,
    dailyDate,
    body: emptyWorksheetBody(type),
    updatedAt: "",
    dirty: false,
  };
}

export function emptyWorksheetBody(type) {
  if (type === "A") return { fact: "", autoSentence: "", acceptLine: "", protects: "" };
  if (type === "B") return { situation: "", fixedBelief: "", reframed: "", nextAction: "" };
  return { stuck: "", nextAction: "" };
}

export function emptyReview(kind, periodStart, periodEnd) {
  const body =
    kind === "4week"
      ? { principle: "", together: "", oneSide: "", direction: "", learned: "" }
      : { comparison: "", direction: "", learned: "" };
  return { kind, periodStart, periodEnd, body, updatedAt: "", dirty: false };
}

export function emptyStartPoint() {
  return {
    worries: ["", "", ""],
    beliefs: ["", "", ""],
    control: "",
    updatedAt: "",
    dirty: false,
  };
}

export function reviewKey(kind, periodStart) {
  return `${kind}|${periodStart}`;
}

function dateOnly(value) {
  return String(value ?? "").slice(0, 10);
}

export function toDailyRow(record, userId) {
  return {
    user_id: userId,
    entry_date: record.date,
    one_line: clip(record.oneLine, 4000),
    emotion_felt: clip(record.emotionFelt),
    thought_held: clip(record.thoughtHeld),
    choices: clip(record.choices),
    feeling_note: clip(record.feelingNote),
    result_note: clip(record.resultNote),
    other_side_one_thing: clip(record.otherSideOneThing),
    tasks: cleanTasks(record.tasks),
    belief_to_accept: clip(record.beliefToAccept),
    next_action: clip(record.nextAction),
    updated_at: record.updatedAt,
  };
}

export function fromDailyRow(row) {
  return {
    date: dateOnly(row.entry_date),
    oneLine: row.one_line ?? "",
    emotionFelt: row.emotion_felt ?? "",
    thoughtHeld: row.thought_held ?? "",
    choices: row.choices ?? "",
    feelingNote: row.feeling_note ?? "",
    resultNote: row.result_note ?? "",
    otherSideOneThing: row.other_side_one_thing ?? "",
    tasks: cleanTasks(row.tasks),
    beliefToAccept: row.belief_to_accept ?? "",
    nextAction: row.next_action ?? "",
    updatedAt: row.updated_at ?? "",
    dirty: false,
  };
}

export function toWeeklyRow(record, userId) {
  return {
    user_id: userId,
    week_start: record.weekStart,
    choice_1: clip(record.choice1),
    choice_2: clip(record.choice2),
    choice_3: clip(record.choice3),
    feeling_note: clip(record.feelingNote),
    result_note: clip(record.resultNote),
    tasks: cleanTasks(record.tasks, { withNextFix: false }),
    next_fix: clip(record.nextFix),
    review: clip(record.review),
    updated_at: record.updatedAt,
  };
}

export function fromWeeklyRow(row) {
  return {
    weekStart: dateOnly(row.week_start),
    choice1: row.choice_1 ?? "",
    choice2: row.choice_2 ?? "",
    choice3: row.choice_3 ?? "",
    feelingNote: row.feeling_note ?? "",
    resultNote: row.result_note ?? "",
    tasks: cleanTasks(row.tasks, { withNextFix: false }),
    nextFix: row.next_fix ?? "",
    review: row.review ?? "",
    updatedAt: row.updated_at ?? "",
    dirty: false,
  };
}

export function toMonthlyRow(record, userId) {
  return {
    user_id: userId,
    month: record.month,
    principle: clip(record.principle),
    structure_check: clip(record.structureCheck),
    updated_at: record.updatedAt,
  };
}

export function fromMonthlyRow(row) {
  return {
    month: row.month,
    principle: row.principle ?? "",
    structureCheck: row.structure_check ?? "",
    updatedAt: row.updated_at ?? "",
    dirty: false,
  };
}

export function toWorksheetRow(record, userId) {
  return {
    id: record.id,
    user_id: userId,
    sheet_type: record.type,
    entry_date: record.entryDate,
    daily_date: record.dailyDate || null,
    body: record.body || {},
    updated_at: record.updatedAt,
  };
}

export function fromWorksheetRow(row) {
  return {
    id: row.id,
    type: row.sheet_type,
    entryDate: dateOnly(row.entry_date),
    dailyDate: row.daily_date ? dateOnly(row.daily_date) : null,
    body: row.body || {},
    updatedAt: row.updated_at ?? "",
    dirty: false,
  };
}

export function toReviewRow(record, userId) {
  return {
    user_id: userId,
    kind: record.kind,
    period_start: record.periodStart,
    period_end: record.periodEnd,
    body: record.body || {},
    updated_at: record.updatedAt,
  };
}

export function fromReviewRow(row) {
  return {
    kind: row.kind,
    periodStart: dateOnly(row.period_start),
    periodEnd: dateOnly(row.period_end),
    body: row.body || {},
    updatedAt: row.updated_at ?? "",
    dirty: false,
  };
}

export function toStartRow(record, userId) {
  return {
    user_id: userId,
    worries: (record.worries || ["", "", ""]).slice(0, 3).map((item) => clip(item)),
    beliefs: (record.beliefs || ["", "", ""]).slice(0, 3).map((item) => clip(item)),
    control_to_regain: clip(record.control),
    updated_at: record.updatedAt,
  };
}

export function fromStartRow(row) {
  const worries = Array.isArray(row.worries) ? row.worries : [];
  const beliefs = Array.isArray(row.beliefs) ? row.beliefs : [];
  return {
    worries: [0, 1, 2].map((index) => worries[index] ?? ""),
    beliefs: [0, 1, 2].map((index) => beliefs[index] ?? ""),
    control: row.control_to_regain ?? "",
    updatedAt: row.updated_at ?? "",
    dirty: false,
  };
}

export function publicRecord(record) {
  if (!record) return record;
  const { dirty, ...rest } = record;
  return rest;
}
