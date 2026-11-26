import { el, link } from "../dom.js";
import { autosave, phraseChips } from "../fields.js";
import { ONE_LINE_PHRASES } from "../guides.js";
import { formatKoreanDate } from "../dates.js";

export async function renderHome(ctx) {
  const daily = await ctx.store.loadDaily(ctx.today);
  const area = el("textarea", {
    class: "writing",
    name: "oneLine",
    rows: "4",
    value: daily.oneLine,
    "data-oneline": "today",
    "aria-labelledby": "home-title",
    placeholder: "오늘의 한 줄",
  });
  autosave(area, (value) => ctx.saveTodayLine(value, area));

  return el("article", { class: "page home" }, [
    el("p", { class: "kicker" }, formatKoreanDate(ctx.today)),
    el("h1", { id: "home-title" }, "오늘 한 줄"),
    el("p", { class: "lede" }, "감정이 편해지고, 결과도 좋아지는 선택을 고르는 곳입니다."),
    el("p", {}, "며칠을 비워도 오늘부터 다시 오면 됩니다."),
    el("p", { class: "quiet" }, "과거 빈칸을 먼저 채우지 않으셔도 됩니다."),
    el("div", { class: "writing-wrap", id: "one-line" }, [
      area,
      el("p", { class: "enough" }, "이 한 줄이면 충분합니다."),
      el("p", { class: "quiet" }, "예: 그럴 수 있지. / 오늘은 이 한 가지만 해보자. / 하나 배운 거지."),
      phraseChips(ONE_LINE_PHRASES, area, ctx.note),
    ]),
    link("/today", { class: "btn" }, "오늘의 다른 칸 열기"),
    el("section", { class: "card" }, [
      el("h2", {}, "이렇게 씁니다"),
      el("ol", { class: "steps" }, [
        el("li", {}, "이미 일어난 일은, 그럴 수 있지로 받아 둡니다."),
        el("li", {}, "다음에 할 행동은 하나만 고릅니다."),
        el("li", {}, "말은 짧게, 나를 지키는 쪽으로 고릅니다."),
      ]),
      link("/guide", { class: "text-link" }, "사용법 더 보기"),
    ]),
    el("div", { class: "shortcut-row" }, [
      link("/week", { class: "text-link" }, "이번 주 열기"),
      link("/practice", { class: "text-link" }, "7일 연습"),
    ]),
  ]);
}
