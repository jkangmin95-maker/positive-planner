const SEOUL = "Asia/Seoul";

export function formatDateInTimeZone(date, timeZone = SEOUL) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function seoulToday(now = new Date()) {
  return formatDateInTimeZone(now, SEOUL);
}

export function seoulMonth(now = new Date()) {
  return seoulToday(now).slice(0, 7);
}

export function addDays(iso, days) {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function weekdayIndex(iso) {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

export function weekdayName(iso) {
  return WEEKDAYS[weekdayIndex(iso)];
}

export function weekStart(iso) {
  const index = weekdayIndex(iso);
  const delta = index === 0 ? -6 : 1 - index;
  return addDays(iso, delta);
}

export function weekDays(iso) {
  const start = weekStart(iso);
  return Array.from({ length: 7 }, (_, index) => addDays(start, index));
}

export function formatKoreanDate(iso) {
  const [year, month, day] = iso.split("-").map(Number);
  return `${year}년 ${month}월 ${day}일 ${weekdayName(iso)}요일`;
}

export function formatMonthDay(iso) {
  const [, month, day] = iso.split("-").map(Number);
  return `${month}월 ${day}일`;
}

export function formatWeekRange(iso) {
  const days = weekDays(iso);
  return `${formatMonthDay(days[0])} – ${formatMonthDay(days[6])}`;
}

export function monthMatrix(month) {
  const [year, monthNumber] = month.split("-").map(Number);
  const first = `${month}-01`;
  const lastDate = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const last = `${month}-${String(lastDate).padStart(2, "0")}`;
  const weeks = [];
  let cursor = weekStart(first);
  while (cursor <= last && weeks.length < 6) {
    const week = [];
    for (let index = 0; index < 7; index += 1) {
      const date = addDays(cursor, index);
      week.push(date.slice(0, 7) === month ? date : null);
    }
    weeks.push(week);
    cursor = addDays(cursor, 7);
  }
  return weeks;
}

export function shiftMonth(month, delta) {
  const [year, monthNumber] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, monthNumber - 1 + delta, 1));
  const nextYear = date.getUTCFullYear();
  const nextMonth = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${nextYear}-${nextMonth}`;
}

export function fourWeekRange(today) {
  const start = addDays(weekStart(today), -21);
  return { start, end: addDays(weekStart(today), 6) };
}

export function thirteenWeekRange(today) {
  const start = addDays(weekStart(today), -84);
  return { start, end: addDays(weekStart(today), 6) };
}

export function isIsoDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value || "");
}

export function isIsoMonth(value) {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value || "");
}
