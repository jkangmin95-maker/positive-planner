import { prefersReducedMotion, playGoldDust, stopGoldDust } from "./cover.js";

export function bindJournalPages(root, { date, today, go }) {
  if (!root || root.dataset.bound === "1") return;
  root.dataset.bound = "1";

  const prevBtn = root.querySelector(".page-corner-prev");
  const nextBtn = root.querySelector(".page-corner-next");
  let busy = false;

  const isSpread = () => window.matchMedia("(min-width: 900px) and (orientation: landscape)").matches;
  const showingEvening = () => root.classList.contains("show-evening");

  const pathFor = (iso) => (iso === today ? "/today" : `/day/${iso}`);

  const shiftDate = (iso, days) => {
    const next = new Date(`${iso}T12:00:00+09:00`);
    next.setDate(next.getDate() + days);
    const y = next.getFullYear();
    const m = String(next.getMonth() + 1).padStart(2, "0");
    const d = String(next.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const destination = (dir) => {
    if (isSpread()) {
      return { type: "day", date: shiftDate(date, dir) };
    }
    if (dir > 0 && !showingEvening()) return { type: "leaf", evening: true };
    if (dir < 0 && showingEvening()) return { type: "leaf", evening: false };
    return { type: "day", date: shiftDate(date, dir) };
  };

  const applyLeaf = (evening) => {
    root.classList.toggle("show-evening", evening);
  };

  const turn = async (dir) => {
    if (busy) return;
    const dest = destination(dir);
    if (dest.type === "leaf") {
      await animate(dir);
      applyLeaf(dest.evening);
      return;
    }
    if (dest.date === date) return;
    await animate(dir);
    go(pathFor(dest.date));
  };

  const animate = (dir) =>
    new Promise((resolve) => {
      if (prefersReducedMotion()) {
        resolve();
        return;
      }
      busy = true;
      const ghost = document.createElement("div");
      ghost.className = `curl-ghost ${dir > 0 ? "curl-forward" : "curl-back"}`;
      ghost.setAttribute("aria-hidden", "true");
      root.appendChild(ghost);
      root.classList.add("is-turning", dir > 0 ? "turn-forward" : "turn-back");
      playGoldDust({ duration: 700 });
      void ghost.offsetWidth;
      ghost.classList.add("is-flipped");
      const done = () => {
        ghost.remove();
        root.classList.remove("is-turning", "turn-forward", "turn-back");
        stopGoldDust();
        busy = false;
        resolve();
      };
      ghost.addEventListener("transitionend", done, { once: true });
      window.setTimeout(done, 780);
    });

  prevBtn?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    turn(-1);
  });
  nextBtn?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    turn(1);
  });

  let startX = 0;
  let startY = 0;
  let tracking = false;
  root.addEventListener("pointerdown", (event) => {
    if (event.target.closest("textarea, input, a, button")) return;
    tracking = true;
    startX = event.clientX;
    startY = event.clientY;
  });
  root.addEventListener("pointerup", (event) => {
    if (!tracking) return;
    tracking = false;
    const dx = event.clientX - startX;
    const dy = event.clientY - startY;
    if (Math.abs(dx) < 56 || Math.abs(dx) < Math.abs(dy)) return;
    turn(dx < 0 ? 1 : -1);
  });
  root.addEventListener("pointercancel", () => {
    tracking = false;
  });
}

export function journalPageName(root) {
  return root?.classList.contains("show-evening") ? "evening" : "morning";
}
