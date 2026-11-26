export function showOtherSide(feeling, result) {
  const filled = (value) => Boolean(String(value ?? "").trim());
  return filled(feeling) !== filled(result);
}

export function applyPhrase(current, phrase) {
  if (!String(current ?? "").trim()) return { value: phrase, kept: false };
  return { value: current, kept: true };
}

export function worksheetHasContent(body) {
  return Object.values(body || {}).some((value) => String(value ?? "").trim());
}

export function isNewer(left, right) {
  const a = Date.parse(left || "");
  const b = Date.parse(right || "");
  return (Number.isFinite(a) ? a : 0) > (Number.isFinite(b) ? b : 0);
}

export function clip(value, max = 4000) {
  return String(value ?? "").slice(0, max);
}

export function cleanTasks(tasks, { withNextFix = true } = {}) {
  if (!Array.isArray(tasks)) return [];
  return tasks.slice(0, 30).map((task) => ({
    id: String(task?.id || crypto.randomUUID()),
    text: clip(task?.text, 500),
    nextFix: withNextFix ? clip(task?.nextFix, 500) : "",
  }));
}
