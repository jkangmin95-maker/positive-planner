import { el, link } from "../dom.js";
import { autosave, field, sectionTitle } from "../fields.js";
import { formatKoreanDate, isIsoMonth, monthMatrix, seoulMonth, shiftMonth, weekdayName } from "../dates.js";

export async function renderMonth(ctx, route) {
  const requested = route.params.month;
  const month = requested && isIsoMonth(requested) ? requested : seoulMonth();
  const record = await ctx.store.loadMonthly(month);
  const [year, monthNumber] = month.split("-").map(Number);
  const matrix = monthMatrix(month);
  const days = await ctx.store.listDailyBetween(`${month}-01`, `${month}-31`);
  const lines = new Map(days.map((day) => [day.date, String(day.oneLine || "").trim()]));
  const save = (partial) => ctx.store.patchMonthly(month, partial).then(ctx.setStatus);
  const principle = field({
    id: "month-principle",
    label: "이번 달의 원리 하나",
    optional: true,
    value: record.principle,
    multiline: true,
    rows: 3,
  });
  const structure = field({
    id: "month-structure",
    label: "구조를 바꾸는 선택",
    optional: true,
    value: record.structureCheck,
    multiline: true,
    rows: 3,
    hint: "사람 이야기가 나오면, 내가 지금 고를 수 있는 것만 남기면 됩니다.",
  });
  autosave(principle.control, (value) => save({ principle: value }));
  autosave(structure.control, (value) => save({ structureCheck: value }));

  return el("article", { class: "page" }, [
    el("h1", {}, ["월간", el("span", { class: "badge" }, "선택")]),
    el("p", { class: "lede" }, `${year}년 ${monthNumber}월`),
    el("p", { class: "quiet" }, "달력은 점수가 아닙니다. 날을 누르면 그날이 열립니다. 비운 날은 그냥 비어 있습니다."),
    el("div", { class: "day-nav" }, [
      link(`/month/${shiftMonth(month, -1)}`, {}, "이전달"),
      month === seoulMonth() ? null : link("/month", {}, "이번 달"),
      link(`/month/${shiftMonth(month, 1)}`, {}, "다음달"),
    ]),
    el("div", { class: "calendar", role: "grid", "aria-label": `${year}년 ${monthNumber}월` }, [
      ...["월", "화", "수", "목", "금", "토", "일"].map((name) => el("span", { class: "cal-head" }, name)),
      ...matrix.flatMap((week) =>
        week.map((date) => {
          if (!date) return el("span", { class: "cal-empty" });
          const line = lines.get(date) || "";
          const label = line ? `${formatKoreanDate(date)}. ${line}` : `${formatKoreanDate(date)} 열기`;
          return link(`/day/${date}`, { class: date === ctx.today ? "cal-day today" : "cal-day", "aria-label": label }, [
            el("span", {}, String(Number(date.slice(8)))),
          ]);
        }),
      ),
    ]),
    el("p", { class: "quiet" }, `요일은 월요일이 먼저입니다. 오늘은 ${weekdayName(ctx.today)}요일입니다.`),
    el("section", { class: "card" }, [sectionTitle("h2", "이번 달의 원리 하나", "", true), principle.wrap]),
    el("section", { class: "card" }, [sectionTitle("h2", "구조를 바꾸는 선택", "", true), structure.wrap]),
    link("/review/4week", { class: "text-link" }, "4주 회고로 가기"),
  ]);
}
