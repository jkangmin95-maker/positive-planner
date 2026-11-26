export function hasDailyContent(day) {
  if (!day) return false;
  const fields = [
    day.oneLine,
    day.emotionFelt,
    day.thoughtHeld,
    day.choices,
    day.feelingNote,
    day.resultNote,
    day.otherSideOneThing,
    day.beliefToAccept,
    day.nextAction,
  ];
  if (fields.some((value) => String(value || "").trim())) return true;
  return (day.tasks || []).some(
    (task) => String(task.text || "").trim() || String(task.nextFix || "").trim(),
  );
}

function line(label, value) {
  const text = String(value || "").trim();
  return text ? `${label}: ${text}` : "";
}

export function journalToText(data) {
  const lines = [
    "긍정플래너",
    "감정과 결과가 함께 좋아지는 선택을 고르는 기록",
    `내보낸 시각: ${data.exportedAt || ""}`,
    "",
  ];

  const days = [...(data.daily || [])]
    .filter(hasDailyContent)
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  lines.push("## 일간");
  if (!days.length) lines.push("적은 날이 없습니다.");
  for (const day of days) {
    lines.push("");
    lines.push(`# ${day.date}`);
    const bits = [
      line("오늘 한 줄", day.oneLine),
      line("떠오른 감정", day.emotionFelt),
      line("붙잡을 생각", day.thoughtHeld),
      line("고르는 선택", day.choices),
      line("기분이 편해지는지", day.feelingNote),
      line("결과도 나아지는지", day.resultNote),
      line("다른 쪽을 위한 작은 한 가지", day.otherSideOneThing),
      line("걸린 문장", day.beliefToAccept),
      line("다음 행동 하나", day.nextAction),
    ].filter(Boolean);
    lines.push(...bits);
    for (const task of day.tasks || []) {
      if (!String(task.text || "").trim() && !String(task.nextFix || "").trim()) continue;
      lines.push(`하는 일: ${String(task.text || "").trim()}`);
      if (String(task.nextFix || "").trim()) {
        lines.push(`다음에 고칠 한 가지: ${String(task.nextFix).trim()}`);
      }
    }
  }

  lines.push("", "## 주간");
  const weeks = [...(data.weekly || [])].sort((a, b) => (a.weekStart < b.weekStart ? 1 : -1));
  if (!weeks.length) lines.push("적은 주가 없습니다.");
  for (const week of weeks) {
    lines.push("");
    lines.push(`# ${week.weekStart}`);
    ["choice1", "choice2", "choice3"].forEach((key, index) => {
      const text = line(`이번 주 선택 ${index + 1}`, week[key]);
      if (text) lines.push(text);
    });
    const bits = [
      line("기분이 편해지는지", week.feelingNote),
      line("결과도 나아지는지", week.resultNote),
      line("다음에 고칠 한 가지", week.nextFix),
      line("주간 회고", week.review),
    ].filter(Boolean);
    lines.push(...bits);
  }

  lines.push("", "## 워크시트");
  for (const sheet of data.worksheets || []) {
    lines.push("");
    lines.push(`# ${sheet.type} ${sheet.entryDate || ""}`.trim());
    for (const [key, value] of Object.entries(sheet.body || {})) {
      if (String(value || "").trim()) lines.push(`${key}: ${String(value).trim()}`);
    }
  }

  return `${lines.join("\n").trim()}\n`;
}
