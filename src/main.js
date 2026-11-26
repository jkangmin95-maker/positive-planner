import { PP_CONFIG } from "./config.js";
import { configStatus } from "./js/configCheck.js";
import { el, link } from "./js/dom.js";
import { currentRoute, go } from "./js/router.js";
import { createStore } from "./js/store.js";
import { closeSheet, guideBanner, markNav, mountShell, setEntryChrome, syncCover, viewRoot } from "./js/shell.js";
import { renderScreen } from "./js/render.js";
import { seoulToday } from "./js/dates.js";
import { GUIDES } from "./js/guides.js";
import {
  consumeAuthError,
  createSupabase,
  koreanAuthMessage,
  readSession,
  signInWithEmail,
  signInWithGoogle,
} from "./js/auth.js";
import { renderGuide, renderInstall, renderLogin, renderUnconfigured } from "./js/screens/misc.js";
import { seedSample } from "./js/sample.js";

const TITLES = {
  home: "홈",
  today: "오늘",
  week: "주간",
  worksheets: "워크시트",
  worksheet: "워크시트",
  worksheetEdit: "워크시트",
  review: "회고",
  month: "월간",
  guide: "사용법",
  practice: "7일 연습",
  settings: "설정",
  more: "더보기",
  install: "홈 화면에 추가",
  missing: "긍정플래너",
};

function show(node) {
  document.getElementById("app").replaceChildren(node);
}

function flushFields() {
  document.querySelectorAll("input, textarea").forEach((node) => node.dispatchEvent(new Event("pp-flush")));
}

function installGlobals() {
  document.body.addEventListener("click", (event) => {
    const anchor = event.target.closest?.("a");
    if (!anchor?.dataset.appPath) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    event.preventDefault();
    flushFields();
    go(anchor.dataset.appPath);
  });
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    window.__ppInstallPrompt = event;
    const button = document.getElementById("install-now");
    if (button) button.hidden = false;
  });
  window.addEventListener("appinstalled", () => {
    window.__ppInstallPrompt = null;
    const button = document.getElementById("install-now");
    if (button) button.hidden = true;
  });
  window.addEventListener("pp-navigate", () => {
    if (window.__ppRender) window.__ppRender();
    else location.reload();
  });
  window.addEventListener("popstate", () => {
    if (window.__ppRender) window.__ppRender();
    else location.reload();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushFields();
  });
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  const base = document.querySelector("base")?.href;
  if (!base) return;
  const scope = new URL(base).pathname;
  const start = () => {
    navigator.serviceWorker.register(new URL("sw.js", base).href, { scope }).catch(() => {});
  };
  if (typeof requestIdleCallback === "function") requestIdleCallback(start, { timeout: 4000 });
  else window.setTimeout(start, 2000);
}

function showPublic(route) {
  const page = route.name === "guide" ? renderGuide() : renderInstall();
  show(el("div", { class: "public-page" }, [link("/", { class: "text-link back-link" }, "처음으로"), page]));
}

function setStatus(result) {
  const node = document.getElementById("save-status");
  if (!node || !result) return;
  if (result.preview) node.textContent = "이 브라우저에 저장했습니다.";
  else if (result.ok && !result.local) node.textContent = "저장했습니다.";
  else node.textContent = "이 기기에 저장했습니다. 연결되면 계정으로 옮깁니다.";
}

function note(text) {
  const node = document.getElementById("save-status");
  if (node) node.textContent = text;
}

async function startApp({ mode, userId, supabase = null, sample = false }) {
  const store = await createStore({ mode, userId, supabase });
  const ctx = {
    store,
    mode,
    supabase,
    today: seoulToday(),
    setStatus,
    note,
  };
  if (sample && mode === "preview") await seedSample(store, ctx.today);
  ctx.saveTodayLine = async (value, source) => {
    const result = await store.patchDaily(ctx.today, { oneLine: value });
    setStatus(result);
    document.querySelectorAll('[data-oneline="today"]').forEach((input) => {
      if (input === source || document.activeElement === input) return;
      if (input.value !== result.record.oneLine) input.value = result.record.oneLine;
    });
  };
  await mountShell(ctx);
  if (mode === "cloud") {
    try {
      await store.pullAll();
    } catch {
      /* 계정과 맞추지 못해도 이 기기의 기록으로 엽니다. */
    }
    if (await store.pendingCount()) setStatus({ ok: false, local: true });
  }
  window.addEventListener("online", () => {
    store.flush().catch(() => {});
  });

  let renderToken = 0;
  async function render() {
    const token = (renderToken += 1);
    closeSheet();
    const route = currentRoute();
    const label = TITLES[route.name] || "긍정플래너";
    document.title = route.name === "home" ? "긍정플래너" : `${label} · 긍정플래너`;
    const banner = document.getElementById("guide-banner");
    const guideId = route.query.get("guide") || "";
    const guide = GUIDES[guideId];
    if (banner) {
      banner.replaceChildren();
      if (guide) banner.append(guideBanner(guideId));
    }
    markNav(route.name);
    setEntryChrome(route.name);
    const view = viewRoot(route.name);
    try {
      const screen = await renderScreen(ctx, route);
      if (token !== renderToken) return;
      view.replaceChildren(screen);
    } catch (error) {
      console.error(error);
      if (token !== renderToken) return;
      view.replaceChildren(
        el("p", { class: "quiet" }, "이 화면을 여는 데 문제가 있었습니다. 오늘 한 줄은 아래 버튼으로 쓰실 수 있습니다."),
      );
    }
    syncCover(route);
    const anchor = (location.hash || "").replace("#", "") || guide?.anchor || "";
    const target = anchor ? document.getElementById(anchor) : null;
    if (target) target.scrollIntoView({ block: "start" });
    else if (!document.body.classList.contains("book-mode")) window.scrollTo(0, 0);
    if (!document.body.classList.contains("book-mode")) view?.focus({ preventScroll: true });
  }

  window.__ppRender = () => {
    render().catch((error) => console.error(error));
  };
  await render();
}

async function startCloud() {
  let supabase;
  try {
    supabase = createSupabase(PP_CONFIG.supabaseUrl.trim(), PP_CONFIG.supabaseAnonKey.trim());
  } catch {
    show(renderUnconfigured({ reason: "invalid" }));
    return;
  }
  const route = currentRoute();
  try {
    const { session, error } = await readSession(supabase);
    const authError = consumeAuthError() || error?.message || "";
    if (!session) {
      if (route.name === "guide" || route.name === "install") {
        showPublic(route);
        return;
      }
      show(
        renderLogin({
          dryRun: false,
          configured: true,
          message: koreanAuthMessage(authError),
          onGoogle: async () => {
            const { error: googleError } = await signInWithGoogle(supabase);
            if (googleError) return koreanAuthMessage(googleError.message);
            return "Google로 이동하는 중입니다.";
          },
          onEmail: async (email) => {
            const { error: emailError } = await signInWithEmail(supabase, email);
            if (emailError) return koreanAuthMessage(emailError.message);
            return "메일을 보냈습니다. 이 브라우저에서 링크를 열어 주세요. 편지함과 스팸함을 함께 봐 주세요.";
          },
        }),
      );
      return;
    }
    await startApp({ mode: "cloud", userId: session.user.id, supabase });
  } catch {
    show(
      renderLogin({
        dryRun: false,
        configured: true,
        message: "연결을 확인해 주세요. 잠시 뒤 다시 시도해 주세요.",
        onGoogle: async () => "연결을 확인해 주세요.",
        onEmail: async () => "연결을 확인해 주세요.",
      }),
    );
  }
}

function boot() {
  registerServiceWorker();
  installGlobals();
  const status = configStatus(PP_CONFIG);
  const params = new URLSearchParams(location.search);
  const preview = params.get("preview");
  const sample = params.get("sample") === "1";
  const route = currentRoute();
  if (preview === "auth") {
    show(
      renderLogin({
        dryRun: true,
        configured: status.ok,
        message: "",
        onGoogle: async () => "연결 정보가 있으면 Google 창이 열립니다.",
        onEmail: async () => "연결 정보가 없어 메일을 보내지 않습니다.",
      }),
    );
    return;
  }
  if (!status.ok && preview !== "1") {
    if (route.name === "guide" || route.name === "install") {
      showPublic(route);
      return;
    }
    show(renderUnconfigured(status));
    return;
  }
  if (preview === "1") {
    startApp({ mode: "preview", userId: "preview", sample }).catch((error) => {
      console.error(error);
      show(el("p", { class: "gate" }, "화면을 열지 못했습니다. 새로고침해 주세요."));
    });
    return;
  }
  startCloud();
}

boot();
