import { el, link } from "./dom.js";
import { autosave, phraseChips } from "./fields.js";
import { SIDE_LINKS, tabFor } from "./nav.js";
import { ONE_LINE_PHRASES, GUIDES } from "./guides.js";
import { formatKoreanDate } from "./dates.js";

let dismiss = () => {};

export function closeSheet() {
  dismiss();
}

export function setEntryChrome(routeName) {
  document.body.classList.toggle("on-entry", routeName === "home" || routeName === "today");
}

export function markNav(name) {
  const tab = tabFor(name);
  document.querySelectorAll("[data-nav]").forEach((node) => {
    const key = node.getAttribute("data-nav");
    const current =
      key === name ||
      (key === "worksheet" && String(name).startsWith("worksheet")) ||
      (node.classList.contains("tab") && key === tab && tab !== "");
    if (current) node.setAttribute("aria-current", "page");
    else node.removeAttribute("aria-current");
  });
}

export function guideBanner(guideId) {
  const guide = GUIDES[guideId];
  if (!guide) return null;
  return el("aside", { class: "guide-banner" }, [
    el("p", { class: "kicker" }, `${guide.kicker} · 7일 연습`),
    el("p", {}, guide.body),
    link("/practice", { class: "text-link" }, "연습 목록"),
  ]);
}

export async function mountShell(ctx) {
  const todayRecord = await ctx.store.loadDaily(ctx.today);
  const topInput = el("input", {
    type: "text",
    class: "text top-input",
    name: "topOneLine",
    value: todayRecord.oneLine,
    placeholder: "오늘의 한 줄",
    "aria-label": "오늘 한 줄",
    autocomplete: "off",
    "data-oneline": "today",
  });
  autosave(topInput, (value) => ctx.saveTodayLine(value, topInput));

  const sidebar = el(
    "aside",
    { class: "sidebar" },
    [
      link("/", { class: "brand brand-link" }, [el("span", { class: "seal", "aria-hidden": "true" }, "긍"), el("span", {}, "긍정플래너")]),
      el(
        "nav",
        { class: "side-nav", "aria-label": "메뉴" },
        SIDE_LINKS.map((item) =>
          link(item.href, { class: "side-link", "data-nav": item.nav }, [
            el("span", { class: "side-label" }, item.label),
            el("span", { class: "side-note" }, item.note),
          ]),
        ),
      ),
    ],
  );

  const sheetRoot = el("div", { id: "sheet-root" });
  dismiss = () => {
    sheetRoot.querySelectorAll("input, textarea").forEach((node) => node.dispatchEvent(new Event("pp-flush")));
    sheetRoot.replaceChildren();
    document.body.classList.remove("sheet-open");
  };

  const openSheet = async () => {
    const record = await ctx.store.loadDaily(ctx.today);
    const area = el("textarea", {
      class: "writing",
      name: "sheetOneLine",
      rows: "4",
      value: record.oneLine,
      "data-oneline": "today",
      "aria-label": "오늘 한 줄",
    });
    autosave(area, (value) => ctx.saveTodayLine(value, area));
    const close = el("button", { class: "text-btn", onclick: dismiss }, "닫기");
    const panel = el("div", { class: "sheet", role: "dialog", "aria-modal": "true", "aria-labelledby": "sheet-title" }, [
      el("div", { class: "sheet-handle", "aria-hidden": "true" }),
      el("div", { class: "row spread" }, [el("h2", { id: "sheet-title" }, "오늘 한 줄"), close]),
      el("p", { class: "quiet" }, formatKoreanDate(ctx.today)),
      area,
      el("p", { class: "enough" }, "이 한 줄이면 충분합니다."),
      phraseChips(ONE_LINE_PHRASES, area, ctx.note),
      link("/today", { class: "btn secondary", onclick: dismiss }, "오늘의 다른 칸"),
    ]);
    const back = el("div", { class: "sheet-back" }, panel);
    back.addEventListener("click", (event) => {
      if (event.target === back) dismiss();
    });
    sheetRoot.replaceChildren(back);
    document.body.classList.add("sheet-open");
    area.focus();
  };

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") dismiss();
  });

  const app = el("div", { class: "app" }, [
    sidebar,
    el("div", { class: "main-col" }, [
      el("header", { class: "topbar" }, [
        link("/", { class: "brand brand-link" }, [el("span", { class: "seal", "aria-hidden": "true" }, "긍"), el("span", {}, "긍정플래너")]),
        el("label", { class: "top-oneline" }, [el("span", {}, "오늘 한 줄"), topInput]),
        el("p", { id: "save-status", class: "save-status", role: "status", "aria-live": "polite" }),
      ]),
      el("div", { id: "guide-banner" }),
      el("main", { id: "view", tabindex: "-1" }),
    ]),
    el("button", { class: "oneline-launcher", onclick: openSheet }, "오늘 한 줄"),
    el("nav", { class: "tabbar", "aria-label": "주요 메뉴" }, [
      link("/today", { class: "tab", "data-nav": "today" }, "오늘"),
      link("/week", { class: "tab", "data-nav": "week" }, "주간"),
      link("/more", { class: "tab", "data-nav": "more" }, "더보기"),
    ]),
    sheetRoot,
  ]);

  document.getElementById("app").replaceChildren(app);
}
