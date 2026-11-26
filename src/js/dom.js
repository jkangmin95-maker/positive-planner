import { toUrl } from "./router.js";

export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  if (tag === "button" && !Object.prototype.hasOwnProperty.call(attrs, "type")) node.type = "button";
  for (const [key, value] of Object.entries(attrs || {})) {
    if (value == null || value === false) continue;
    if (key === "class") node.className = value;
    else if (key === "value") node.value = value;
    else if (key.startsWith("on") && typeof value === "function") {
      node.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (value === true) node.setAttribute(key, "");
    else node.setAttribute(key, String(value));
  }
  append(node, children);
  return node;
}

function append(node, children) {
  const list = Array.isArray(children) ? children : [children];
  for (const child of list) {
    if (child == null || child === false) continue;
    if (Array.isArray(child)) append(node, child);
    else if (child instanceof Node) node.append(child);
    else node.append(document.createTextNode(String(child)));
  }
}

export function link(path, attrs = {}, children = []) {
  return el("a", { ...attrs, href: toUrl(path), "data-app-path": path }, children);
}

export function confirmDialog({ title, body, confirmLabel, cancelLabel }) {
  return new Promise((resolve) => {
    const dialog = el("div", { class: "modal", role: "dialog", "aria-modal": "true", "aria-labelledby": "confirm-title" });
    const finish = (value) => {
      back.remove();
      document.removeEventListener("keydown", onKey);
      resolve(value);
    };
    const onKey = (event) => {
      if (event.key === "Escape") finish(false);
    };
    const cancel = el("button", { class: "btn secondary", onclick: () => finish(false) }, cancelLabel);
    const confirm = el("button", { class: "btn danger", onclick: () => finish(true) }, confirmLabel);
    dialog.append(
      el("h2", { id: "confirm-title" }, title),
      el("p", {}, body),
      el("div", { class: "row" }, [cancel, confirm]),
    );
    const back = el("div", { class: "modal-back" }, dialog);
    back.addEventListener("click", (event) => {
      if (event.target === back) finish(false);
    });
    document.addEventListener("keydown", onKey);
    document.body.append(back);
    cancel.focus();
  });
}

export function downloadText(filename, text, type) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
