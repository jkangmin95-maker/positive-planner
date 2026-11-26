import { el, link } from "../dom.js";
import { FORMULA, GUIDES } from "../guides.js";
import { MORE_LINKS } from "../nav.js";
import { isEmail } from "../auth.js";

export function renderUnconfigured(status) {
  const secret = status.reason === "secret";
  return el("article", { class: "gate unconfigured" }, [
    el("span", { class: "seal seal-lg", "aria-hidden": "true" }, "긍"),
    el("h1", {}, "긍정플래너"),
    el("p", { class: "lede" }, "기록을 내 계정에만 보관하려면, 먼저 연결이 필요합니다."),
    secret
      ? el(
          "p",
          {},
          "넣으신 키는 비밀 키라 이 앱에 둘 수 없습니다. 공개 키(anon 또는 publishable)만 넣어 주세요.",
        )
      : el("p", {}, "아직 연결 정보가 없습니다. 설정을 마치면 이 자리에서 로그인으로 이어집니다."),
    el("p", { class: "quiet" }, "주소와 공개 키는 src/config.js 에 있습니다. service_role 이나 secret 키는 넣지 마세요."),
    link("/install", { class: "text-link" }, "홈 화면에 추가하는 방법"),
  ]);
}

export function renderLogin({ dryRun, configured, message, onGoogle, onEmail }) {
  const status = el("p", { class: "status", role: "status" }, message || "");
  const email = el("input", {
    id: "email",
    class: "text",
    type: "email",
    name: "email",
    autocomplete: "email",
    inputmode: "email",
    placeholder: "name@example.com",
  });
  const form = el(
    "form",
    {
      class: "stack",
      onsubmit: async (event) => {
        event.preventDefault();
        const value = email.value.trim();
        if (!isEmail(value)) {
          status.textContent = "메일 주소를 다시 확인해 주세요.";
          email.focus();
          return;
        }
        if (dryRun || !configured) {
          status.textContent = "연결 정보가 없어 메일을 보내지 않습니다.";
          return;
        }
        status.textContent = "링크를 보내는 중입니다.";
        status.textContent = await onEmail(value);
      },
    },
    [
      el("label", { for: "email" }, "이메일"),
      email,
      el("button", { class: "btn", type: "submit" }, "로그인 링크 받기"),
    ],
  );

  return el("article", { class: "gate login" }, [
    el("span", { class: "seal seal-lg", "aria-hidden": "true" }, "긍"),
    el("h1", {}, "긍정플래너"),
    el("p", { class: "lede" }, "로그인하시면 바로 오늘 한 줄을 쓸 수 있습니다."),
    el("p", {}, "기록은 내 계정에만 남고, 광고나 순위에 쓰지 않습니다."),
    el(
      "button",
      {
        class: "btn google",
        onclick: async () => {
          if (dryRun || !configured) {
            status.textContent = "연결 정보가 있으면 Google 창이 열립니다.";
            return;
          }
          status.textContent = "Google로 이동하는 중입니다.";
          status.textContent = await onGoogle();
        },
      },
      "Google 계정으로 들어가기",
    ),
    el("p", { class: "or" }, "또는 이메일"),
    form,
    el(
      "p",
      { class: "quiet" },
      "메일의 링크는 이 브라우저에서 열어 주세요. 다른 앱에서 열리면 이어지지 않을 수 있습니다. 그때는 이 창에서 링크를 다시 받아 주세요.",
    ),
    status,
    el("div", { class: "shortcut-row" }, [
      link("/guide", { class: "text-link" }, "사용법"),
      link("/install", { class: "text-link" }, "홈 화면에 추가"),
    ]),
  ]);
}

export function renderMore() {
  return el("article", { class: "page" }, [
    el("h1", {}, "더보기"),
    el(
      "div",
      { class: "stack" },
      MORE_LINKS.map((item) =>
        link(item.href, { class: "menu-card", "data-nav": item.nav }, [
          el("span", { class: "menu-title" }, item.label),
          el("span", { class: "quiet" }, item.note),
        ]),
      ),
    ),
  ]);
}

export function renderPractice() {
  const days = [
    ["1", "오늘 한 줄", "한 줄이면 오늘은 충분합니다.", "/today?guide=1"],
    ["2", "감정과 생각", "떠오른 감정과, 붙잡을 생각을 나눠 적습니다.", "/today?guide=2"],
    ["3", "오늘의 선택", "기분이 편해지는지, 결과도 나아지는지 짧게 적습니다.", "/today?guide=3"],
    ["4", "하는 일", "어긋나면 다음에 고칠 한 가지만 적습니다.", "/today?guide=4"],
    ["5", "그럴 수 있지", "이미 일어난 일을 있는 그대로 적습니다.", "/worksheet/a/new?guide=5"],
    ["6", "고정관념 전환", "그래서는 안 돼, 를 바꿀 문장으로 옮깁니다.", "/worksheet/b/new?guide=6"],
    ["7", "다음 행동 하나", "책임은 지금 고를 행동 하나입니다.", "/worksheet/c/new?guide=7"],
  ];
  return el("article", { class: "page" }, [
    el("h1", {}, "7일 연습"),
    el("p", {}, "하루씩 따라가 보셔도 되고, 마음에 드는 날만 여셔도 됩니다."),
    el("p", { class: "quiet" }, "빠지셔도 됩니다. 며칠을 세지 않습니다."),
    el(
      "ol",
      { class: "practice-list" },
      days.map(([day, title, body, href]) =>
        el("li", {}, [
          el("p", { class: "kicker" }, `${day}일차`),
          el("h2", {}, title),
          el("p", {}, body),
          link(href, { class: "text-link" }, "이 안내 열기"),
        ]),
      ),
    ),
    el("p", { class: "quiet" }, `${GUIDES[1].kicker}부터 ${GUIDES[7].kicker}까지, 순서를 지키지 않아도 됩니다.`),
  ]);
}

export function renderGuide() {
  return el("article", { class: "page guide" }, [
    el("h1", {}, "사용법"),
    el("p", { class: "lede" }, "긍정플래너는 기분을 달래는 일기장이 아닙니다. 감정이 편해지고, 결과도 좋아지는 선택을 매일 고르는 곳입니다."),
    el("section", {}, [
      el("h2", {}, "긍정이란"),
      el("p", {}, "나를 더 편안하게 하고, 삶도 실제로 나아지게 하는 선택입니다. 기분만 달래거나, 불안으로 밀어붙여 결과만 올리는 선택은 이 책에서 말하는 긍정으로 보지 않습니다."),
      el("p", { class: "quiet" }, "이 문장은 사용법에만 둡니다. 하루 화면에서 점수로 재지 않습니다."),
    ]),
    el("section", {}, [
      el("h2", {}, "오늘 한 줄이면 충분합니다"),
      el("p", {}, "나머지 칸은 모두 선택입니다. 빈칸은 실패가 아닙니다. 오늘은 그만큼만 고르신 것입니다."),
      el("p", {}, "며칠을 비워도 오늘부터 다시 오면 됩니다. 과거 빈칸을 먼저 채우지 않으셔도 됩니다. 연속으로 적었는지는 세지 않습니다."),
    ]),
    el("section", {}, [
      el("h2", {}, "순서는 짧습니다"),
      el("ol", { class: "steps" }, [
        el("li", {}, "이미 일어난 일은 ‘그럴 수 있지’로 받아 둡니다. 상대를 용서하라는 말이 아니라, 나를 지키는 말입니다."),
        el("li", {}, "다음에 할 행동은 하나만 고릅니다. 책임은 탓이 아니라 통제권을 되찾는 일입니다."),
        el("li", {}, "말은 짧게 바꿉니다. 마음이 먼저가 아니어도 됩니다."),
      ]),
    ]),
    el("section", {}, [
      el("h2", {}, "어긋난 일"),
      el("p", {}, "결과는 아직 정보입니다. 왜 못했는가는 묻지 않습니다. 다음에 고칠 한 가지, 또는 하나 배운 거지만 적으시면 됩니다."),
    ]),
    el("section", {}, [
      el("h2", {}, "회고와 출발점"),
      el("p", {}, "페이지는 있습니다. 건너뛰어도 됩니다."),
    ]),
    el("section", {}, [
      el("h2", {}, "종이와 함께 쓰실 때"),
      el("p", {}, "웹과 종이는 자동으로 이어지지 않습니다. 본문은 한쪽에만 적고, 다른 쪽은 오늘 한 줄이면 됩니다."),
    ]),
    el("section", {}, [
      el("h2", {}, "사람 이야기가 나올 때"),
      el("p", {}, "상대가 왜 틀렸는가를 적지 않습니다. 내가 지금 고를 수 있는 것만 남깁니다. 혼자 있는 날을 부족한 날로 세지 않습니다."),
    ]),
    el("section", {}, [
      el("h2", {}, "알림"),
      el("p", {}, "알림은 보내지 않습니다."),
    ]),
    el("section", { id: "phrases" }, [
      el("h2", {}, "공식 카드"),
      el("p", { class: "quiet" }, "고르지 않으셔도 됩니다. 자기 문장을 쓰셔도 됩니다."),
      el("ul", { class: "formula" }, FORMULA.map((phrase) => el("li", {}, phrase))),
    ]),
  ]);
}

export function renderInstall() {
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const safari = el("section", { class: "card" }, [
    el("h2", {}, "iPhone · Safari"),
    el("ol", { class: "steps" }, [
      el("li", {}, "화면 아래나 위의 공유 버튼을 누릅니다. 네모에서 화살표가 올라가는 모양입니다."),
      el("li", {}, "목록을 내려 ‘홈 화면에 추가’를 누릅니다."),
      el("li", {}, "오른쪽 위의 ‘추가’를 누릅니다."),
    ]),
    el("p", { class: "quiet" }, "아이폰에서는 Safari로 열어 주세요. 다른 앱 안의 브라우저에는 이 메뉴가 없을 수 있습니다."),
  ]);
  const chrome = el("section", { class: "card" }, [
    el("h2", {}, "Android · Chrome"),
    el("ol", { class: "steps" }, [
      el("li", {}, "오른쪽 위의 메뉴(⋮)를 누릅니다."),
      el("li", {}, "‘홈 화면에 추가’ 또는 ‘앱 설치’를 누릅니다."),
      el("li", {}, "‘설치’ 또는 ‘추가’를 누릅니다."),
    ]),
  ]);
  const installButton = el(
    "button",
    {
      class: "btn",
      hidden: !window.__ppInstallPrompt,
      onclick: async () => {
        const prompt = window.__ppInstallPrompt;
        if (!prompt) return;
        prompt.prompt();
        await prompt.userChoice;
        window.__ppInstallPrompt = null;
        installButton.hidden = true;
      },
    },
    "이 기기에 설치하기",
  );

  return el("article", { class: "page" }, [
    el("h1", {}, "홈 화면에 추가"),
    el("p", {}, "홈 화면에 두면, 브라우저를 찾지 않고 바로 오늘 한 줄을 열 수 있습니다."),
    installButton,
    ios ? safari : chrome,
    ios ? chrome : safari,
    el("p", { class: "quiet" }, "설치해도 로그인과 기록은 같습니다. 홈 화면의 아이콘을 지워도 계정의 기록은 남습니다."),
  ]);
}

export function renderMissing() {
  return el("article", { class: "page" }, [
    el("h1", {}, "이 화면은 없습니다"),
    el("p", {}, "오늘 한 줄로 돌아가시면 됩니다."),
    link("/", { class: "btn" }, "오늘 한 줄"),
  ]);
}
