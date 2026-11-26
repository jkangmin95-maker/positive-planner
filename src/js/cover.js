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
  if (book.classList.contains("is-turning") || book.classList.contains("is-flat") || cover.classList.contains("is-opening")) return;
  book.classList.remove("is-flat");
  book.classList.add("is-open", "is-turning");
  cover.classList.add("is-opening");
  playGoldDust();
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
  stopGoldDust();
  book.classList.remove("is-turning", "state-flip");
  book.classList.add("is-open", "is-flat");
  cover.classList.remove("is-opening");
  cover.setAttribute("hidden", "");
  cover.setAttribute("tabindex", "-1");
  document.body.classList.remove("has-cover");
  lockBookInputs(book, false);
}

export function showCover({ book, cover, reduced, peak = false, off = false }) {
  book.classList.remove("is-open", "is-flat", "is-turning", "state-flip");
  cover.classList.remove("is-opening");
  cover.removeAttribute("hidden");
  cover.removeAttribute("tabindex");
  document.body.classList.add("has-cover");
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


function assetUrl(path) {
  const base = document.querySelector("base")?.href || "/";
  return new URL(path, base).href;
}

export function loadCoverTexture() {
  const apply = () => {
    document.querySelectorAll(".cover").forEach((node) => node.classList.add("is-textured"));
  };
  const sources = [assetUrl("textures/cover.webp"), assetUrl("textures/cover.jpg")];
  const ready = typeof document !== "undefined" &&
    [...(document.images || [])].some((img) => sources.includes(img.src) && img.complete && img.naturalWidth > 0);
  if (ready) {
    apply();
    return;
  }
  const img = new Image();
  img.onload = apply;
  img.onerror = () => {
    if (img.src.endsWith("cover.webp")) img.src = sources[1];
  };
  img.src = sources[0];
  if (img.complete && img.naturalWidth > 0) apply();
}

let dustFrame = 0;
let dustCanvas = null;

export function stopGoldDust() {
  if (dustFrame) cancelAnimationFrame(dustFrame);
  dustFrame = 0;
  dustCanvas?.remove();
  dustCanvas = null;
}

export function playGoldDust({ duration = 620 } = {}) {
  stopGoldDust();
  if (prefersReducedMotion() || typeof document === "undefined") return;
  const canvas = document.createElement("canvas");
  canvas.className = "gold-dust";
  canvas.setAttribute("aria-hidden", "true");
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const fit = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  fit();
  const width = () => window.innerWidth;
  const height = () => window.innerHeight;
  const particles = Array.from({ length: 48 }, () => ({
    x: width() * (0.35 + Math.random() * 0.6),
    y: height() * (0.2 + Math.random() * 0.6),
    r: 0.5 + Math.random() * 1.7,
    vx: -0.6 + Math.random() * 1.8,
    vy: -1.4 - Math.random() * 2,
    life: 0.45 + Math.random() * 0.55,
    born: Math.random() * 90,
    warm: Math.random() > 0.35,
  }));
  const start = performance.now();
  const tick = (now) => {
    const t = now - start;
    const w = width();
    const h = height();
    ctx.clearRect(0, 0, w, h);
    for (const p of particles) {
      const age = (t - p.born) / (duration * p.life);
      if (age <= 0 || age >= 1) continue;
      const a = age < 0.18 ? age / 0.18 : 1 - (age - 0.18) / 0.82;
      const x = p.x + p.vx * age * 90;
      const y = p.y + p.vy * age * 90;
      ctx.beginPath();
      ctx.fillStyle = p.warm
        ? `rgba(232, 196, 106, ${(a * 0.88).toFixed(3)})`
        : `rgba(255, 236, 180, ${(a * 0.8).toFixed(3)})`;
      ctx.arc(x, y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    if (t < duration + 160) dustFrame = requestAnimationFrame(tick);
    else stopGoldDust();
  };
  document.body.appendChild(canvas);
  dustCanvas = canvas;
  dustFrame = requestAnimationFrame(tick);
}

export function loadPaperTexture() {
  if (document.body.classList.contains("has-paper")) return;
  const run = () => {
    const img = new Image();
    img.onload = () => document.body.classList.add("has-paper");
    img.src = assetUrl("textures/paper-faint.jpg");
  };
  if (typeof requestIdleCallback === "function") requestIdleCallback(run, { timeout: 2500 });
  else window.setTimeout(run, 600);
}
