import { el, link } from "../dom.js";
import { autosave, field, phraseChips, taskEditor } from "../fields.js";
import { addDays, formatKoreanDate, isIsoDate } from "../dates.js";
import { showOtherSide } from "../rules.js";
import { BELIEF_PHRASES } from "../guides.js";

export async function renderToday(ctx, route) {
  const requested = route.params.date;
  const date = requested && isIsoDate(requested) ? requested : ctx.today;
  const daily = await ctx.store.loadDaily(date);
  const isToday = date === ctx.today;
  const guide = route.query.get("guide") || "";
  const hasText = (value) => String(value || "").trim().length > 0;
  const choiceOpen = [daily.emotionFelt, daily.thoughtHeld, daily.choices, daily.feelingNote, daily.resultNote, daily.otherSideOneThing].some(hasText);
  const tasksOpen = (daily.tasks || []).some((task) => hasText(task.text) || hasText(task.nextFix));
  const beliefOpen = hasText(daily.beliefToAccept);
  const nextOpen = hasText(daily.nextAction);
  const save = (partial) => ctx.store.patchDaily(date, partial).then(ctx.setStatus);

  const one = el("textarea", {
    id: "one-line",
    name: "oneLine",
    rows: "5",
    value: daily.oneLine,
    placeholder: "떠오른 그대로, 한 줄이면 충분합니다.",
    "aria-label": "오늘 한 줄",
    autocomplete: "off",
  });
  if (isToday) one.dataset.oneline = "today";
  autosave(one, (value) => (isToday ? ctx.saveTodayLine(value, one) : save({ oneLine: value })));

  const emotion = field({
    id: "emotion",
    label: "떠오른 감정",
    book: "감정은 떠오를 수 있음",
    value: daily.emotionFelt,
    multiline: true,
    rows: 2,
  });
  const thought = field({
    id: "thought",
    label: "붙잡을 생각",
    book: "붙잡는 것은 선택",
    value: daily.thoughtHeld,
    multiline: true,
    rows: 2,
  });
  const choices = field({
    id: "choices",
    label: "고르는 선택",
    book: "긍정",
    value: daily.choices,
    multiline: true,
    rows: 2,
  });
  const feeling = field({
    id: "feeling",
    label: "기분이 편해지는지",
    value: daily.feelingNote,
    multiline: true,
    rows: 2,
    hint: "짧은 메모입니다. 점수가 아닙니다.",
  });
  const result = field({
    id: "result",
    label: "결과도 나아지는지",
    value: daily.resultNote,
    multiline: true,
    rows: 2,
  });
  const other = field({
    id: "other-side",
    label: "다른 쪽을 위한 작은 한 가지",
    value: daily.otherSideOneThing,
    multiline: true,
    rows: 2,
  });
  const otherWrap = el("div", {}, other.wrap);
  const syncOther = () => {
    otherWrap.hidden = !showOtherSide(feeling.control.value, result.control.value);
  };
  syncOther();

  autosave(emotion.control, (value) => save({ emotionFelt: value }));
  autosave(thought.control, (value) => save({ thoughtHeld: value }));
  autosave(choices.control, (value) => save({ choices: value }));
  autosave(feeling.control, (value) => {
    syncOther();
    return save({ feelingNote: value });
  });
  autosave(result.control, (value) => {
    syncOther();
    return save({ resultNote: value });
  });
  autosave(other.control, (value) => save({ otherSideOneThing: value }));

  const belief = field({
    id: "belief",
    label: "걸린 문장",
    book: "그럴 수 있지",
    value: daily.beliefToAccept,
    multiline: true,
    rows: 2,
    hint: "힌트는 고르지 않으셔도 됩니다.",
  });
  autosave(belief.control, (value) => save({ beliefToAccept: value }));

  const next = field({
    id: "next-action-input",
    label: "다음 행동 하나",
    book: "책임 선택",
    value: daily.nextAction,
    multiline: true,
    rows: 2,
    placeholder: "지금 내가 고를 수 있는 행동 하나",
    hint: "책임은 탓이 아니라 통제권을 되찾는 일입니다. 칸은 하나뿐입니다.",
  });
  autosave(next.control, (value) => save({ nextAction: value }));

  return el("div", { class: "today-sheet" }, [
    el("div", { class: "one-line", id: "one-line-block" }, [
      el("h1", {}, "오늘 한 줄"),
      el("p", { class: "date-kicker" }, formatKoreanDate(date)),
      isToday
        ? null
        : el("div", { class: "day-nav" }, [
            link(`/day/${addDays(date, -1)}`, {}, "이전 날"),
            link("/today", {}, "오늘로"),
            link(`/day/${addDays(date, 1)}`, {}, "다음 날"),
          ]),
      one,
    ]),
    el("div", { class: "optional" }, [
      fold("choice", "오늘의 선택", choiceOpen || guide === "2" || guide === "3", [
        el("p", { class: "hint" }, "떠오른 감정, 붙잡을 생각, 고르는 선택"),
        emotion.wrap,
        thought.wrap,
        choices.wrap,
        el("p", { class: "quiet" }, "비워 두셔도 됩니다. 한쪽만 적어도 그날을 탓하지 않습니다."),
        feeling.wrap,
        result.wrap,
        otherWrap,
      ]),
      fold("tasks", "하는 일", tasksOpen || guide === "4", [
        el("p", { class: "hint" }, "행동"),
        el("p", { class: "quiet" }, "다짐이 아니라 행동으로. 비워 두셔도 됩니다. 어긋나면 다음에 고칠 한 가지만 적으시면 됩니다."),
        taskEditor({
          tasks: daily.tasks,
          withNextFix: true,
          onChange: (tasks) => save({ tasks }),
        }),
      ]),
      fold("belief", "걸린 문장", beliefOpen, [
        el("p", { class: "hint" }, "그럴 수 있지"),
        belief.wrap,
        phraseChips(BELIEF_PHRASES, belief.control, ctx.note),
        el("div", { class: "shortcut-row" }, [
          link(`/worksheet/a/new?daily=${date}`, { class: "text-link" }, "워크시트 A로 더 쓰기"),
          link(`/worksheet/b/new?daily=${date}`, { class: "text-link" }, "워크시트 B로 더 쓰기"),
        ]),
      ]),
      fold("next-action", "다음 행동 하나", nextOpen, [
        el("p", { class: "hint" }, "책임 선택"),
        next.wrap,
        el("p", { class: "quiet" }, "왜 못했는가는 묻지 않습니다."),
        link(`/worksheet/c/new?daily=${date}`, { class: "text-link" }, "워크시트 C로 더 쓰기"),
      ]),
    ]),
    el("p", { class: "quiet-end" }, "며칠을 비워도 오늘부터 다시 오면 됩니다."),
  ]);
}

function fold(id, title, open, children) {
  return el("details", { id, open: Boolean(open) }, [el("summary", {}, title), ...children]);
}
