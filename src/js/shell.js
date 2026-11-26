import { el, link } from "./dom.js";
import { autosave, phraseChips } from "./fields.js";
import { SIDE_LINKS, tabFor } from "./nav.js";
import { ONE_LINE_PHRASES, GUIDES } from "./guides.js";
import { formatKoreanDate } from "./dates.js";
import {
  bindKeyboardInset,
  flattenBook,
  loadCoverTexture,
  loadPaperTexture,
  openCover,
  prefersReducedMotion,
  shouldShowCover,
  showCover,
  stopCoverCue,
} from "./cover.js";

let dismiss = () => {};
let coverBound = false;

export function closeSheet() {
  dismiss();
}

export function setEntryChrome(routeName) {
  const bookMode = routeName === "home" || routeName === "today";
  document.body.classList.toggle("on-entry", bookMode);
  document.body.classList.toggle("book-mode", bookMode);
  const skip = document.querySelector("a.skip");
  if (skip) skip.setAttribute("href", bookMode ? "#one-line" : "#view");
}

export function viewRoot(routeName) {
  if (routeName === "home" || routeName === "today") {
    return document.getElementById("book-view");
  }
  return document.getElementById("view");
}

export function markNav(name) {
  const tab = tabFor(name);
  document.querySelectorAll("[data-nav]").forEach((node) => {
    const key = node.getAttribute("data-nav");
    const current =
      key === name ||
      (key === "worksheet" && String(name).startsWith("worksheet")) ||
      (node.classList.contains("tab") && key === tab && tab !== "") ||
      (node.classList.contains("book-tab") && key === tab && tab !== "");
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

export function syncCover(route) {
  const book = document.getElementById("book");
  const cover = document.getElementById("cover");
  const tabs = document.getElementById("book-tabs");
  if (!book || !cover) return;
  const bookMode = route.name === "home" || route.name === "today";
  if (!bookMode) {
    stopCoverCue(cover);
    return;
  }
  const reduced = prefersReducedMotion(route.query);
  const peak = route.query.get("cue") === "peak";
  const off = route.query.get("cue") === "0" || route.query.get("cue") === "off";
  if (shouldShowCover(route.query)) {
    showCover({ book, cover, reduced, peak, off });
    tabs?.setAttribute("hidden", "");
    tabs?.classList.remove("is-visible");
    loadCoverTexture();
  } else {
    flattenBook({ book, cover });
    tabs?.removeAttribute("hidden");
    tabs?.classList.add("is-visible");
    loadPaperTexture();
  }
}

function bindCover() {
  if (coverBound) return;
  coverBound = true;
  const book = document.getElementById("book");
  const cover = document.getElementById("cover");
  const tabs = document.getElementById("book-tabs");
  cover.addEventListener("click", () => {
    if (book.classList.contains("is-flat") || book.classList.contains("is-turning")) return;
    const reduced = prefersReducedMotion(new URLSearchParams(location.search));
    openCover({
      book,
      cover,
      reduced,
      onFlat: () => {
        tabs?.removeAttribute("hidden");
        tabs?.classList.add("is-visible");
        const field = document.getElementById("one-line") || document.querySelector("[data-oneline='today']");
        loadPaperTexture();
        if (field && !field.disabled) {
          try {
            field.focus({ preventScroll: true });
          } catch {
            field.focus();
          }
        }
      },
    });
  });
  bindKeyboardInset();
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

  const cover = el("button", { type: "button", class: "cover", id: "cover", "aria-label": "책을 열어 오늘 한 줄을 씁니다" }, [
    el("div", { class: "cover-inner" }, [
      el("div", { class: "cover-rule", "aria-hidden": "true" }),
      el("h1", {}, "긍정플래너"),
      el("p", { class: "subtitle" }, "『긍정학개론』"),
      el("div", { class: "cover-mark", "aria-hidden": "true" }, "궁"),
    ]),
    el("span", { class: "cover-cue", "aria-hidden": "true" }, [
      el("span", { class: "cue-page" }),
      el("span", { class: "cue-flap" }),
    ]),
  ]);

  const desk = el("div", { class: "desk" }, [
    el("div", { class: "stage" }, [
      el("div", { class: "book", id: "book" }, [
        el("section", { class: "page-leaf left left-page", "aria-label": "오늘의 공식" }, [
          el("p", { class: "quote-kicker" }, "『긍정학개론』"),
          el("h2", { class: "quote-title" }, "긍정은 감정과 결과가 함께 좋아지도록 고르는 일이다."),
          el("p", { class: "quote-body" }, "이미 일어난 일은 받아 둡니다. 말은 짧게, 나를 지키는 쪽으로 고릅니다."),
          el("p", { class: "quote-foot" }, "그럴 수 있지"),
        ]),
        el("div", { class: "right-stack" }, [
          el("section", { class: "page-leaf right", id: "book-view", "aria-label": "오늘 한 줄" }),
          el("div", { class: "block-mask", "aria-hidden": "true" }),
          cover,
        ]),
      ]),
    ]),
    el("nav", { class: "book-tabs", id: "book-tabs", "aria-label": "주요 메뉴", hidden: true }, [
      link("/today", { class: "book-tab", "data-nav": "today" }, "오늘"),
      link("/week", { class: "book-tab", "data-nav": "week" }, "주간"),
      link("/more", { class: "book-tab", "data-nav": "more" }, "더보기"),
    ]),
  ]);

  const app = el("div", { class: "app" }, [
    sidebar,
    el("div", { class: "main-col" }, [
      el("header", { class: "topbar" }, [
        link("/", { class: "brand brand-link" }, [el("span", { class: "seal", "aria-hidden": "true" }, "긍"), el("span", {}, "긍정플래너")]),
        el("label", { class: "top-oneline" }, [el("span", {}, "오늘 한 줄"), topInput]),
      ]),
      el("div", { id: "guide-banner" }),
      el("main", { id: "view", tabindex: "-1" }),
    ]),
    desk,
    el("p", { id: "save-status", class: "save-status", role: "status", "aria-live": "polite" }),
    el("button", { class: "oneline-launcher", onclick: openSheet }, "오늘 한 줄"),
    el("nav", { class: "tabbar", "aria-label": "주요 메뉴" }, [
      link("/today", { class: "tab", "data-nav": "today" }, "오늘"),
      link("/week", { class: "tab", "data-nav": "week" }, "주간"),
      link("/more", { class: "tab", "data-nav": "more" }, "더보기"),
    ]),
    sheetRoot,
  ]);

  document.getElementById("app").replaceChildren(app);
  bindCover();
  loadCoverTexture();
}
