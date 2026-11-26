import { confirmDialog, downloadText, el, link } from "../dom.js";
import { autosave, field, sectionTitle } from "../fields.js";
import { journalToText } from "../textExport.js";
import { go } from "../router.js";

export async function renderSettings(ctx) {
  const start = await ctx.store.loadStartPoint();
  const worryInputs = [0, 1, 2].map((index) =>
    field({
      id: `worry-${index}`,
      label: `지금 마음에 걸리는 일 ${index + 1}`,
      optional: true,
      value: start.worries[index] || "",
    }),
  );
  const beliefInputs = [0, 1, 2].map((index) =>
    field({
      id: `belief-start-${index}`,
      label: `당연하다고 믿는 문장 ${index + 1}`,
      book: index === 0 ? "고정관념" : "",
      optional: true,
      value: start.beliefs[index] || "",
    }),
  );
  const control = field({
    id: "control",
    label: "되찾고 싶은 통제권",
    book: "책임",
    optional: true,
    value: start.control,
    multiline: true,
    rows: 3,
  });

  const saveWorries = () =>
    ctx.store.patchStartPoint({ worries: worryInputs.map((item) => item.control.value) }).then(ctx.setStatus);
  const saveBeliefs = () =>
    ctx.store.patchStartPoint({ beliefs: beliefInputs.map((item) => item.control.value) }).then(ctx.setStatus);
  worryInputs.forEach((item) => autosave(item.control, saveWorries));
  beliefInputs.forEach((item) => autosave(item.control, saveBeliefs));
  autosave(control.control, (value) => ctx.store.patchStartPoint({ control: value }).then(ctx.setStatus));

  return el("article", { class: "page" }, [
    el("h1", {}, "설정"),
    el("section", { id: "start", class: "card anchor" }, [
      sectionTitle("h2", "나의 출발점", "", true),
      el("p", { class: "quiet" }, "비교하려고 남겨 두는 칸입니다. 안 적으셔도 됩니다."),
      ...worryInputs.map((item) => item.wrap),
      ...beliefInputs.map((item) => item.wrap),
      control.wrap,
    ]),
    el("section", { class: "card" }, [
      el("h2", {}, "내 기록 내보내기"),
      el("p", { class: "quiet" }, "기록은 광고나 순위, 학습에 쓰지 않습니다. 우리사이 계정과도 연결되어 있지 않습니다."),
      el("div", { class: "row" }, [
        el(
          "button",
          {
            class: "btn",
            onclick: async () => {
              const data = await ctx.store.exportAll();
              downloadText(
                `positive-planner-${ctx.today}.json`,
                JSON.stringify(data, null, 2),
                "application/json",
              );
              ctx.note("JSON 파일을 내려받았습니다.");
            },
          },
          "JSON으로 내보내기",
        ),
        el(
          "button",
          {
            class: "btn secondary",
            onclick: async () => {
              const data = await ctx.store.exportAll();
              downloadText(`positive-planner-${ctx.today}.txt`, journalToText(data), "text/plain");
              ctx.note("텍스트 파일을 내려받았습니다.");
            },
          },
          "텍스트로 내보내기",
        ),
      ]),
    ]),
    el("section", { class: "card" }, [
      el("h2", {}, "종이와 함께"),
      el("p", {}, "웹과 종이는 자동으로 이어지지 않습니다. 본문은 한쪽에만 적고, 다른 쪽은 오늘 한 줄이면 됩니다."),
      link("/install", { class: "text-link" }, "홈 화면에 추가"),
      link("/guide", { class: "text-link" }, "사용법"),
    ]),
    el("section", { class: "card" }, [
      el("h2", {}, "기록 지우기"),
      el("p", { class: "quiet" }, "지우면 되돌릴 수 없습니다. 로그인 계정 자체는 앱에서 지우지 않고, 기록만 지웁니다."),
      el(
        "button",
        {
          class: "btn danger",
          onclick: async () => {
            const yes = await confirmDialog({
              title: "기록을 지울까요?",
              body: "이 계정의 일간, 주간, 워크시트, 회고가 지워집니다. 남겨 두기를 권합니다.",
              confirmLabel: "지우기",
              cancelLabel: "남겨 두기",
            });
            if (!yes) return;
            try {
              await ctx.store.deleteAll();
              ctx.note("기록을 지웠습니다.");
              go("/");
            } catch {
              ctx.note("기록을 다 지우지 못했습니다. 잠시 뒤 다시 시도해 주세요.");
            }
          },
        },
        "내 기록 지우기",
      ),
    ]),
    ctx.mode === "cloud"
      ? el(
          "button",
          {
            class: "btn secondary",
            onclick: async () => {
              await ctx.supabase.auth.signOut();
              location.assign(document.querySelector("base").href);
            },
          },
          "로그아웃",
        )
      : el("p", { class: "quiet" }, "미리보기는 계정이 없습니다. 기록은 이 브라우저에만 있습니다."),
  ]);
}
