import { el, link } from "../dom.js";
import { autosave, field, sectionTitle, taskEditor } from "../fields.js";
import { addDays, formatWeekRange, isIsoDate, weekDays, weekStart, weekdayName } from "../dates.js";

export async function renderWeek(ctx, route) {
  const requested = route.params.date;
  const anchor = requested && isIsoDate(requested) ? requested : ctx.today;
  const start = weekStart(anchor);
  const week = await ctx.store.loadWeekly(start);
  const days = weekDays(start);
  const dailies = await ctx.store.listDailyBetween(days[0], days[6]);
  const byDate = new Map(dailies.map((day) => [day.date, day]));
  const save = (partial) => ctx.store.patchWeekly(start, partial).then(ctx.setStatus);
  const isThisWeek = start === weekStart(ctx.today);

  const choiceFields = ["choice1", "choice2", "choice3"].map((key, index) => {
    const item = field({
      id: key,
      label: `이번 주 선택 ${index + 1}`,
      optional: true,
      value: week[key],
      placeholder: index === 0 ? "한 가지만 있어도 됩니다" : "",
    });
    autosave(item.control, (value) => save({ [key]: value }));
    return item.wrap;
  });
  const feeling = field({
    id: "week-feeling",
    label: "기분이 편해지는지",
    optional: true,
    value: week.feelingNote,
    multiline: true,
    rows: 2,
    hint: "점수표가 아닙니다.",
  });
  const result = field({
    id: "week-result",
    label: "결과도 나아지는지",
    optional: true,
    value: week.resultNote,
    multiline: true,
    rows: 2,
  });
  const nextFix = field({
    id: "week-next",
    label: "다음에 고칠 한 가지",
    book: "하나 배운 거지",
    optional: true,
    value: week.nextFix,
    multiline: true,
    rows: 2,
  });
  const review = field({
    id: "week-review",
    label: "주간 회고",
    optional: true,
    value: week.review,
    multiline: true,
    rows: 4,
    hint: "적지 않으셔도 이번 주가 성립합니다.",
  });
  autosave(feeling.control, (value) => save({ feelingNote: value }));
  autosave(result.control, (value) => save({ resultNote: value }));
  autosave(nextFix.control, (value) => save({ nextFix: value }));
  autosave(review.control, (value) => save({ review: value }));

  const prev = link(`/week/${addDays(start, -7)}`, {}, "이전 주");
  const next = link(`/week/${addDays(start, 7)}`, {}, "다음 주");

  return el("article", { class: "page" }, [
    el("p", { class: "kicker" }, isThisWeek ? "이번 주" : "보고 있는 주"),
    el("h1", {}, "주간"),
    el("p", { class: "lede" }, formatWeekRange(start)),
    el("p", { class: "quiet" }, "일간을 비운 날이 있어도 주간은 그대로 둡니다."),
    el("div", { class: "day-nav" }, [prev, isThisWeek ? null : link("/week", {}, "이번 주"), next]),
    el("section", { class: "card" }, [
      sectionTitle("h2", "이번 주 선택", "", true),
      el("p", { class: "quiet" }, "한 가지만 있어도 됩니다."),
      ...choiceFields,
      feeling.wrap,
      result.wrap,
    ]),
    el("section", { class: "card" }, [
      sectionTitle("h2", "하는 일", "행동", true),
      taskEditor({
        tasks: week.tasks,
        withNextFix: false,
        onChange: (tasks) => save({ tasks }),
      }),
    ]),
    el("section", { class: "card" }, [
      el("h2", {}, "요일"),
      el(
        "div",
        { class: "week-days" },
        days.map((date) => {
          const line = String(byDate.get(date)?.oneLine || "").trim();
          return link(`/day/${date}`, { class: "day-cell" }, [
            el("span", { class: "day-name" }, `${weekdayName(date)} ${date.slice(8)}`),
            line ? el("span", { class: "day-line" }, line) : el("span", { class: "day-line day-line-empty" }, ""),
          ]);
        }),
      ),
    ]),
    el("section", { class: "card" }, [sectionTitle("h2", "다음에 고칠 한 가지", "하나 배운 거지", true), nextFix.wrap]),
    el("section", { id: "review", class: "card anchor" }, [
      sectionTitle("h2", "주간 회고", "", true),
      review.wrap,
    ]),
  ]);
}
