import { el, link } from "../dom.js";
import { autosave } from "../fields.js";
import { addDays, formatKoreanDate, isIsoDate } from "../dates.js";
import { go } from "../router.js";
import { bindJournalPages } from "../pages.js";

const QUOTES = [
  "긍정은 나를 더 행복하게 하고 더 좋은 결과로 이끄는 선택이다.",
  "감정은 떠오를 수 있지만, 붙잡는 것은 선택이다.",
  "모든 생각은 선택이다.",
  "감사하다고 해야 감사한 것이 된다.",
  "그럴 수 있지.",
  "하나 배운 거지.",
];


function mark(kind) {
  const node = el("span", { class: `mark mark-${kind}`, "aria-hidden": "true" });
  node.innerHTML =
    kind === "sun"
      ? '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3.4" fill="none" stroke="currentColor" stroke-width="1.4"/><g stroke="currentColor" stroke-width="1.3" stroke-linecap="round"><path d="M12 3.2v2.4M12 18.4v2.4M3.2 12h2.4M18.4 12h2.4M5.6 5.6l1.7 1.7M16.7 16.7l1.7 1.7M5.6 18.4l1.7-1.7M16.7 7.3l1.7-1.7"/></g></svg>'
      : '<svg viewBox="0 0 24 24"><path d="M15.2 4.6a7.6 7.6 0 1 0 4.2 13.4A8 8 0 1 1 15.2 4.6Z" fill="currentColor"/></svg>';
  return node;
}

function quoteFor(date) {
  const n = String(date).split("").reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  return QUOTES[n % QUOTES.length];
}

function splitLines(text, count) {
  const parts = String(text || "").split("\n");
  while (parts.length < count) parts.push("");
  return parts.slice(0, count);
}

function joinLines(values) {
  const parts = values.map((value) => String(value || ""));
  while (parts.length && parts[parts.length - 1] === "") parts.pop();
  return parts.join("\n");
}

function ruledLines({ id, label, values, count, onSave, multiline = false }) {
  const items = [];
  const controls = [];
  const current = splitLines(values, count);
  const flush = () => onSave(joinLines(controls.map((node) => node.value)));
  for (let i = 0; i < count; i += 1) {
    const control = el(multiline ? "textarea" : "input", {
      id: i === 0 ? id : `${id}-${i + 1}`,
      class: "page-line",
      rows: multiline ? "1" : null,
      value: current[i],
      autocomplete: "off",
      "aria-label": `${label} ${i + 1}`,
    });
    if (!multiline) control.setAttribute("type", "text");
    autosave(control, flush);
    controls.push(control);
    items.push(el("li", {}, [control]));
  }
  return el("section", { class: "prompt" }, [
    el("h2", { class: "prompt-title" }, label),
    el("ol", { class: "ruled", start: "1" }, items),
  ]);
}

export async function renderToday(ctx, route) {
  const requested = route.params.date;
  const date = requested && isIsoDate(requested) ? requested : ctx.today;
  const daily = await ctx.store.loadDaily(date);
  const isToday = date === ctx.today;
  const save = (partial) => ctx.store.patchDaily(date, partial).then(ctx.setStatus);

  const one = el("textarea", {
    id: "one-line",
    name: "oneLine",
    rows: "5",
    value: daily.oneLine,
    placeholder: "떠오른 그대로, 한 줄이면 충분합니다.",
    "aria-label": "오늘 한 줄",
    autocomplete: "off",
    class: "page-verse",
  });
  if (isToday) one.dataset.oneline = "today";
  autosave(one, (value) => (isToday ? ctx.saveTodayLine(value, one) : save({ oneLine: value })));

  const morning = el("article", { class: "leaf leaf-morning", "data-leaf": "morning", "aria-label": "아침" }, [
    el("header", { class: "leaf-head" }, [
      mark("sun"),
      el("p", { class: "date-kicker" }, formatKoreanDate(date)),
    ]),
    el("blockquote", { class: "leaf-quote" }, quoteFor(date)),
    el("div", { class: "one-line", id: "one-line-block" }, [
      el("h1", { class: "book-heading" }, "오늘 한 줄"),
      one,
    ]),
    ruledLines({
      id: "grateful",
      label: "오늘 고마운 것",
      values: daily.feelingNote,
      count: 3,
      onSave: (value) => save({ feelingNote: value }),
    }),
    ruledLines({
      id: "today-choice",
      label: "오늘을 좋게 할 선택",
      values: [daily.emotionFelt, daily.thoughtHeld, daily.choices].join("\n"),
      count: 3,
      onSave: (value) => {
        const [emotionFelt, thoughtHeld, choices] = splitLines(value, 3);
        return save({ emotionFelt, thoughtHeld, choices });
      },
    }),
    ruledLines({
      id: "belief",
      label: "오늘 붙잡을 말",
      values: daily.beliefToAccept,
      count: 2,
      onSave: (value) => save({ beliefToAccept: value }),
    }),
  ]);

  const taskTexts = (daily.tasks || []).map((task) => task.text);
  const evening = el("article", { class: "leaf leaf-evening", "data-leaf": "evening", "aria-label": "저녁" }, [
    el("header", { class: "leaf-head" }, [
      mark("moon"),
      el("h1", { class: "book-heading evening-title" }, "저녁"),
    ]),
    ruledLines({
      id: "highlights",
      label: "오늘 괜찮아진 것",
      values: daily.resultNote,
      count: 3,
      onSave: (value) => save({ resultNote: value }),
    }),
    ruledLines({
      id: "learned",
      label: "오늘 배운 것",
      values: daily.otherSideOneThing,
      count: 2,
      onSave: (value) => save({ otherSideOneThing: value }),
    }),
    ruledLines({
      id: "next-action-input",
      label: "다음에 고를 한 가지",
      values: daily.nextAction,
      count: 2,
      onSave: (value) => save({ nextAction: value }),
    }),
    ruledLines({
      id: "today-tasks",
      label: "하는 일",
      values: taskTexts.join("\n"),
      count: 3,
      onSave: (value) => {
        const texts = splitLines(value, 3);
        const previous = daily.tasks || [];
        const tasks = texts.map((text, index) => ({
          text,
          nextFix: previous[index]?.nextFix || "",
        }));
        return save({ tasks });
      },
    }),
    el("p", { class: "quiet-end" }, "며칠을 비워도 오늘부터 다시 오면 됩니다."),
  ]);

  const journal = el("div", { class: "journal today-sheet", id: "journal" }, [
    el("div", { class: "journal-spread" }, [morning, evening]),
    el("button", { type: "button", class: "page-corner page-corner-prev", "aria-label": "이전 장" }),
    el("button", { type: "button", class: "page-corner page-corner-next", "aria-label": "다음 장" }),
  ]);

  bindJournalPages(journal, {
    date,
    today: ctx.today,
    go,
  });

  return journal;
}
