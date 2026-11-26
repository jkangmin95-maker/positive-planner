import { el, link } from "../dom.js";
import { autosave, field, sectionTitle } from "../fields.js";
import { addDays, formatMonthDay, fourWeekRange, isIsoDate, thirteenWeekRange, weekStart } from "../dates.js";

export async function renderReview(ctx, route) {
  const kind = route.params.kind || "";
  if (!kind) return reviewHome();
  if (kind === "week") {
    return el("article", { class: "page" }, [
      el("h1", {}, "주간 회고"),
      el("p", { class: "quiet" }, "주간 화면의 회고 칸과 같은 기록입니다. 채우지 않으셔도 됩니다."),
      link(`/week/${weekStart(ctx.today)}#review`, { class: "btn" }, "이번 주 회고 열기"),
    ]);
  }
  return kind === "13week" ? renderLongReview(ctx, route, "13week") : renderLongReview(ctx, route, "4week");
}

function reviewHome() {
  return el("article", { class: "page" }, [
    el("h1", {}, ["회고", el("span", { class: "badge" }, "선택")]),
    el("p", {}, "페이지는 있습니다. 채우지 않으셔도 됩니다."),
    el("p", { class: "quiet" }, "빈 회고는 그대로 비어 있습니다."),
    el("div", { class: "stack" }, [
      link("/review/week", { class: "menu-card" }, [
        el("span", { class: "menu-title" }, "주간 회고"),
        el("span", { class: "quiet" }, "이번 주 화면과 같은 칸"),
      ]),
      link("/review/4week", { class: "menu-card" }, [
        el("span", { class: "menu-title" }, "4주 회고"),
        el("span", { class: "quiet" }, "원리, 함께 좋아진 선택, 고칠 방향"),
      ]),
      link("/review/13week", { class: "menu-card" }, [
        el("span", { class: "menu-title" }, "13주 회고"),
        el("span", { class: "quiet" }, "출발점과 비교는, 출발점을 적었을 때만"),
      ]),
    ]),
  ]);
}

async function renderLongReview(ctx, route, kind) {
  const fallback = kind === "4week" ? fourWeekRange(ctx.today) : thirteenWeekRange(ctx.today);
  const requested = route.query.get("start");
  const start = requested && isIsoDate(requested) ? requested : fallback.start;
  const span = kind === "4week" ? 27 : daysBetween(fallback.start, fallback.end);
  const endGuess = addDays(start, span);
  const record = await ctx.store.loadReview(kind, start, endGuess);
  const end = record.updatedAt ? record.periodEnd : endGuess;
  const title = kind === "4week" ? "4주 회고" : "13주 회고";
  const specs =
    kind === "4week"
      ? [
          ["principle", "이번 구간의 원리 하나"],
          ["together", "감정과 결과가 함께 좋아진 선택"],
          ["oneSide", "한쪽에만 기울었던 선택"],
          ["direction", "고칠 방향"],
          ["learned", "하나 배운 거지"],
        ]
      : [
          ["direction", "고칠 방향"],
          ["learned", "하나 배운 거지"],
        ];

  const fields = specs.map(([key, label]) => {
    const item = field({
      id: `${kind}-${key}`,
      label,
      book: key === "learned" ? "하나 배운 거지" : "",
      optional: true,
      value: record.body?.[key] || "",
      multiline: true,
      rows: 3,
    });
    autosave(item.control, (value) => ctx.store.patchReview(kind, start, end, { [key]: value }).then(ctx.setStatus));
    return item.wrap;
  });

  let comparison = null;
  if (kind === "13week") {
    const startPoint = await ctx.store.loadStartPoint();
    const wrote = [...startPoint.worries, ...startPoint.beliefs, startPoint.control].some((value) =>
      String(value || "").trim(),
    );
    if (wrote) {
      const item = field({
        id: "comparison",
        label: "출발점과 나란히 보면",
        optional: true,
        value: record.body?.comparison || "",
        multiline: true,
        rows: 4,
        hint: "비교는 채우라고 있는 칸이 아닙니다.",
      });
      autosave(item.control, (value) =>
        ctx.store.patchReview(kind, start, end, { comparison: value }).then(ctx.setStatus),
      );
      const quotes = [...startPoint.worries, ...startPoint.beliefs, startPoint.control]
        .map((value) => String(value || "").trim())
        .filter(Boolean);
      comparison = el("section", { class: "card" }, [
        sectionTitle("h2", "출발점에 적어 둔 말", "", true),
        el("ul", { class: "quotes" }, quotes.map((quote) => el("li", {}, quote))),
        item.wrap,
      ]);
    }
  }

  const past = (await ctx.store.listReviews(kind)).filter((item) => item.periodStart !== start && item.updatedAt);

  return el("article", { class: "page" }, [
    el("h1", {}, [title, el("span", { class: "badge" }, "선택")]),
    el("p", { class: "quiet" }, "비워 두셔도 됩니다."),
    el("p", {}, `${formatMonthDay(start)} – ${formatMonthDay(end)}`),
    el("div", { class: "card" }, fields),
    comparison,
    kind === "13week" && !comparison
      ? el("p", { class: "quiet" }, "출발점은 설정에 있습니다. 안 적으셔도 되고, 그러면 비교 칸은 두지 않습니다.")
      : null,
    past.length
      ? el("section", { class: "card" }, [
          el("h2", {}, "이전에 적은 회고"),
          el(
            "div",
            { class: "stack" },
            past.map((item) =>
              link(`/review/${kind}?start=${item.periodStart}`, { class: "text-link" }, formatMonthDay(item.periodStart)),
            ),
          ),
        ])
      : null,
  ]);
}

function daysBetween(start, end) {
  const [ys, ms, ds] = start.split("-").map(Number);
  const [ye, me, de] = end.split("-").map(Number);
  const a = Date.UTC(ys, ms - 1, ds);
  const b = Date.UTC(ye, me - 1, de);
  return Math.round((b - a) / 86400000);
}
