import { el } from "./dom.js";
import { applyPhrase } from "./rules.js";

export function autosave(input, save) {
  let timer = 0;
  let last = input.value;
  const run = () => {
    window.clearTimeout(timer);
    if (input.value === last) return;
    last = input.value;
    save(input.value);
  };
  input.addEventListener("input", () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(run, 450);
  });
  input.addEventListener("change", run);
  input.addEventListener("blur", run);
  input.addEventListener("pp-flush", run);
}

export function sectionTitle(tag, easy, book, optional = false) {
  return el(tag, { class: "section-title" }, [
    easy,
    book ? el("span", { class: "book-hint" }, book) : null,
    optional ? el("span", { class: "badge" }, "선택") : null,
  ]);
}

export function field({
  id,
  label,
  book = "",
  optional = false,
  value = "",
  multiline = false,
  placeholder = "",
  name = "",
  rows = 3,
  hint = "",
  className = "",
}) {
  const control = el(multiline ? "textarea" : "input", {
    id,
    name: name || id,
    class: className || "text",
    placeholder,
    value,
    autocomplete: "off",
    rows: multiline ? String(rows) : null,
  });
  if (!multiline) control.setAttribute("type", "text");
  const wrap = el("div", { class: "field" }, [
    el("label", { class: "field-label", for: id }, [
      label,
      book ? el("span", { class: "book-hint" }, book) : null,
      optional ? el("span", { class: "badge" }, "선택") : null,
    ]),
    control,
    hint ? el("p", { class: "quiet" }, hint) : null,
  ]);
  return { wrap, control };
}

export function phraseChips(phrases, input, announce) {
  return el(
    "div",
    { class: "chips", role: "group", "aria-label": "예시 문장" },
    phrases.map((phrase) =>
      el(
        "button",
        {
          class: "chip",
          onclick: () => {
            const result = applyPhrase(input.value, phrase);
            if (result.kept) {
              announce("적어 두신 문장을 그대로 둡니다.");
              return;
            }
            input.value = result.value;
            input.dispatchEvent(new Event("input", { bubbles: true }));
            announce("예시를 넣었습니다. 고쳐 쓰셔도 됩니다.");
          },
        },
        phrase,
      ),
    ),
  );
}

export function taskEditor({ tasks, withNextFix, onChange }) {
  const host = el("div", { class: "tasks" });
  const state = (tasks || []).map((task) => ({
    id: task.id || crypto.randomUUID(),
    text: task.text || "",
    nextFix: task.nextFix || "",
  }));

  function commit() {
    onChange(state.map((task) => ({ ...task })));
  }

  function render() {
    const nodes = state.map((task, index) => {
      const text = el("input", {
        type: "text",
        class: "text",
        value: task.text,
        placeholder: "행동으로 적어 보세요",
        "aria-label": "하는 일",
        autocomplete: "off",
      });
      autosave(text, (value) => {
        state[index].text = value;
        commit();
      });
      let nextWrap = null;
      if (withNextFix) {
        const next = el("input", {
          type: "text",
          class: "text",
          value: task.nextFix,
          placeholder: "하나 배운 거지",
          "aria-label": "다음에 고칠 한 가지",
          autocomplete: "off",
        });
        autosave(next, (value) => {
          state[index].nextFix = value;
          commit();
        });
        nextWrap = el("label", { class: "subfield" }, [
          el("span", {}, ["다음에 고칠 한 가지", el("span", { class: "book-hint" }, "하나 배운 거지")]),
          next,
        ]);
      }
      return el("div", { class: "task" }, [
        text,
        nextWrap,
        el(
          "button",
          {
            class: "text-btn",
            onclick: () => {
              state.splice(index, 1);
              commit();
              render();
            },
          },
          "이 줄 빼기",
        ),
      ]);
    });
    host.replaceChildren(
      ...nodes,
      el(
        "button",
        {
          class: "text-btn",
          onclick: () => {
            state.push({ id: crypto.randomUUID(), text: "", nextFix: "" });
            commit();
            render();
          },
        },
        "하는 일 한 줄 더하기",
      ),
    );
  }

  render();
  return host;
}
