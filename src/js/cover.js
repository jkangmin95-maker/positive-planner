export const OPENED_KEY = "pp.hasOpened";

export function hasOpened() {
  try {
    return localStorage.getItem(OPENED_KEY) === "1";
  } catch {
    return false;
  }
}

export function markOpened() {
  try {
    localStorage.setItem(OPENED_KEY, "1");
  } catch {
    /* 저장을 못 해도 이번 방문에서는 연 것으로 둡니다. */
  }
}

export function clearOpened() {
  try {
    localStorage.removeItem(OPENED_KEY);
  } catch {
    /* 지우지 못해도 다음 안내만 못 할 수 있습니다. */
  }
}

export function prefersReducedMotion(query = null) {
  if (query?.get("motion") === "reduce") return true;
  return Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches);
}

export function shouldShowCover(query) {
  if (query.get("cover") === "1" || query.get("visit") === "first") return true;
  if (query.get("opened") === "1" || query.get("visit") === "return") return false;
  return !hasOpened();
}

export function startCoverCue(cover, { reduced = false, peak = false, off = false } = {}) {
  stopCoverCue(cover);
  cover.classList.remove("is-cue-animate", "is-cue-repeat", "is-cue-static", "is-cue-peak");
  if (off) return () => stopCoverCue(cover);
  if (peak) {
    cover.classList.add("is-cue-peak");
    return () => stopCoverCue(cover);
  }
  if (reduced) {
    cover.classList.add("is-cue-static");
    return () => stopCoverCue(cover);
  }

  const state = { timer: 0, cancelled: false };
  const play = () => {
    if (state.cancelled) return;
    cover.classList.remove("is-cue-animate", "is-cue-repeat");
    void cover.offsetWidth;
    cover.classList.add("is-cue-repeat");
    state.timer = window.setTimeout(play, 900 + 3200);
  };
  // 2초 뒤에 한 번 들렸다가 내려놓고, 몇 초마다 반복합니다.
  state.timer = window.setTimeout(play, 2000);
  cover._ppCue = state;
  return () => stopCoverCue(cover);
}

export function stopCoverCue(cover) {
  const state = cover?._ppCue;
  if (state) {
    state.cancelled = true;
    window.clearTimeout(state.timer);
    cover._ppCue = null;
  }
  cover?.classList.remove("is-cue-animate", "is-cue-repeat", "is-cue-static", "is-cue-peak");
}

function lockBookInputs(book, locked) {
  book.querySelectorAll("textarea, input").forEach((node) => {
    node.disabled = Boolean(locked);
  });
}

export function openCover({ book, cover, reduced, onFlat }) {
  stopCoverCue(cover);
  markOpened();
  if (reduced) {
    flattenBook({ book, cover });
    onFlat?.();
    return;
  }
  if (book.classList.contains("is-turning") || book.classList.contains("is-flat")) return;
  book.classList.remove("is-flat");
  book.classList.add("is-open", "is-turning");
  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    cover.removeEventListener("transitionend", onEnd);
    flattenBook({ book, cover });
    onFlat?.();
  };
  const onEnd = (event) => {
    if (event.target === cover && event.propertyName === "transform") finish();
  };
  cover.addEventListener("transitionend", onEnd);
  window.setTimeout(finish, 700);
}

export function flattenBook({ book, cover }) {
  stopCoverCue(cover);
  book.classList.remove("is-turning", "state-flip");
  book.classList.add("is-open", "is-flat");
  cover.setAttribute("hidden", "");
  cover.setAttribute("tabindex", "-1");
  lockBookInputs(book, false);
}

export function showCover({ book, cover, reduced, peak = false, off = false }) {
  book.classList.remove("is-open", "is-flat", "is-turning", "state-flip");
  cover.removeAttribute("hidden");
  cover.removeAttribute("tabindex");
  lockBookInputs(book, true);
  startCoverCue(cover, { reduced, peak, off });
}

export function bindKeyboardInset() {
  const viewport = window.visualViewport;
  if (!viewport) return () => {};
  const apply = () => {
    const inset = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
    document.documentElement.style.setProperty("--kb-inset", `${Math.round(inset)}px`);
  };
  viewport.addEventListener("resize", apply);
  viewport.addEventListener("scroll", apply);
  apply();
  return () => {
    viewport.removeEventListener("resize", apply);
    viewport.removeEventListener("scroll", apply);
  };
}
