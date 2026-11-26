import { confirmDialog, el, link } from "../dom.js";
import { autosave, field, phraseChips } from "../fields.js";
import { go, toUrl } from "../router.js";
import { BELIEF_PHRASES } from "../guides.js";
import { worksheetHasContent } from "../rules.js";
import { formatMonthDay } from "../dates.js";

const META = {
  A: {
    title: "그럴 수 있지",
    sub: "이미 일어난 일을 있는 그대로.",
  },
  B: {
    title: "고정관념 전환",
    sub: "“그래서는 안 돼”를 한 줄로 옮겨 적기.",
  },
  C: {
    title: "책임 선택",
    sub: "다음 행동 하나만 고릅니다.",
  },
};

function sheetLabel(sheet) {
  const body = sheet.body || {};
  const first = Object.values(body).map((value) => String(value || "").trim()).find(Boolean);
  return first || "적기 시작한 장";
}

export async function renderWorksheetHome() {
  return el("article", { class: "page" }, [
    el("p", { class: "kicker" }, "선택"),
    el("h1", {}, "워크시트"),
    el("p", { class: "quiet" }, "매일 쓰지 않으셔도 됩니다. 필요할 때 한 장만 여세요."),
    el("div", { class: "stack" }, [
      sheetLink("A"),
      sheetLink("B"),
      sheetLink("C"),
    ]),
  ]);
}

function sheetLink(type) {
  const meta = META[type];
  return link(`/worksheet/${type.toLowerCase()}`, { class: "menu-card" }, [
    el("span", { class: "badge" }, "선택"),
    el("span", { class: "menu-title" }, meta.title),
    el("span", { class: "quiet" }, meta.sub),
  ]);
}

export async function renderWorksheetList(ctx, route) {
  const type = route.params.type.toUpperCase();
  const meta = META[type];
  const all = await ctx.store.listWorksheets(type);
  for (const sheet of all) {
    if (!worksheetHasContent(sheet.body)) await ctx.store.deleteWorksheet(sheet.id);
  }
  const sheets = (await ctx.store.listWorksheets(type)).filter((sheet) => worksheetHasContent(sheet.body));
  return el("article", { class: "page" }, [
    el("p", { class: "kicker" }, "선택"),
    el("h1", {}, meta.title),
    el("p", { class: "lede" }, meta.sub),
    link(`/worksheet/${type.toLowerCase()}/new`, { class: "btn" }, "새로 쓰기"),
    el("section", { class: "card" }, [
      el("h2", {}, "적은 장"),
      sheets.length
        ? el(
            "div",
            { class: "stack" },
            sheets.map((sheet) =>
              link(`/worksheet/${type.toLowerCase()}/${sheet.id}`, { class: "menu-card" }, [
                el("span", { class: "menu-title" }, sheetLabel(sheet)),
                el("span", { class: "quiet" }, sheet.entryDate ? formatMonthDay(sheet.entryDate) : ""),
              ]),
            ),
          )
        : el("p", { class: "quiet" }, "아직 적은 장이 없습니다. 필요할 때 새로 쓰시면 됩니다."),
    ]),
  ]);
}

export async function renderWorksheetEdit(ctx, route) {
  const type = route.params.type.toUpperCase();
  const meta = META[type];
  let id = route.params.id;
  const daily = route.query.get("daily");
  if (id === "new") {
    const created = await ctx.store.createWorksheet({
      type,
      entryDate: ctx.today,
      dailyDate: daily || null,
    });
    id = created.id;
    const guide = route.query.get("guide");
    const params = new URLSearchParams();
    if (guide) params.set("guide", guide);
    const qs = params.toString();
    history.replaceState({}, "", toUrl(`/worksheet/${type.toLowerCase()}/${id}${qs ? `?${qs}` : ""}`));
  }
  const sheet = await ctx.store.loadWorksheet(id);
  if (!sheet || sheet.type !== type) {
    return el("article", { class: "page" }, [
      el("h1", {}, "이 장은 없습니다"),
      el("p", {}, "워크시트 목록으로 돌아가시면 됩니다."),
      link("/worksheet", { class: "btn secondary" }, "워크시트"),
    ]);
  }

  const saveKey = (key, value) =>
    ctx.store.patchWorksheet(id, { body: { [key]: value } }).then(ctx.setStatus);

  const fields = fieldsFor(type, sheet.body || {}, saveKey, ctx);
  return el("article", { class: "page", id: "sheet" }, [
    el("p", { class: "kicker" }, "선택"),
    el("h1", {}, meta.title),
    el("p", { class: "lede" }, meta.sub),
    type === "C"
      ? el("p", {}, "책임은 탓이 아니라 통제권을 되찾는 일입니다. 왜 못했는가는 묻지 않습니다.")
      : el("p", { class: "quiet" }, "비워 둔 칸이 있어도 됩니다."),
    sheet.dailyDate ? link(`/day/${sheet.dailyDate}`, { class: "text-link" }, "이어 둔 날의 기록") : null,
    el("div", { class: "card" }, fields),
    el(
      "button",
      {
        class: "btn danger",
        onclick: async () => {
          const yes = await confirmDialog({
            title: "이 장을 지울까요?",
            body: "지우면 이 장의 문장은 되돌아오지 않습니다.",
            confirmLabel: "지우기",
            cancelLabel: "남겨 두기",
          });
          if (!yes) return;
          await ctx.store.deleteWorksheet(id);
          go(`/worksheet/${type.toLowerCase()}`, { replace: true });
        },
      },
      "이 장 지우기",
    ),
  ]);
}

function fieldsFor(type, body, saveKey, ctx) {
  const make = (key, label, extra = {}) => {
    const item = field({
      id: `sheet-${key}`,
      label,
      optional: true,
      value: body[key] || "",
      multiline: true,
      rows: extra.rows || 3,
      placeholder: extra.placeholder || "",
      hint: extra.hint || "",
      book: extra.book || "",
    });
    if (key === "nextAction" && type === "C") {
      item.wrap.querySelector(".badge")?.remove();
    }
    autosave(item.control, (value) => saveKey(key, value));
    return item;
  };

  if (type === "A") {
    const accept = make("acceptLine", "그럴 수 있지 한 줄", { book: "그럴 수 있지", placeholder: "그럴 수 있지." });
    return [
      make("fact", "일어난 일", { hint: "사실만 짧게 적어도 됩니다." }).wrap,
      make("autoSentence", "자동으로 나온 문장").wrap,
      accept.wrap,
      phraseChips(BELIEF_PHRASES, accept.control, ctx.note),
      make("protects", "이 인정이 나를 지키는 점", { hint: "상대를 용서하라는 말이 아니라, 나를 지키는 문장입니다." }).wrap,
      link("/worksheet/c/new", { class: "text-link" }, "다음 행동이 생기면 책임 선택으로"),
    ];
  }
  if (type === "B") {
    return [
      make("situation", "상황").wrap,
      make("fixedBelief", "고정관념 문장", { placeholder: "그래서는 안 돼…" }).wrap,
      make("reframed", "바꿀 문장").wrap,
      make("nextAction", "다음에 고를 행동", { hint: "하나만 적어도 되고, 비워 두셔도 됩니다." }).wrap,
    ];
  }
  const action = make("nextAction", "다음 행동 하나", {
    book: "책임 선택",
    placeholder: "지금 내가 고를 수 있는 행동 하나",
    hint: "이 칸 하나만 본칸입니다.",
    rows: 3,
  });
  return [
    make("stuck", "지금 걸린 일", { hint: "한 줄이면 됩니다. 비워 두셔도 됩니다." }).wrap,
    action.wrap,
  ];
}
