"use strict";

(() => {
  // CSVの対象漢字の初出順を準備画面と出題側で共有する。
  const kanji = window.KanjiQuestions.kanji;
  const storageKey = "kanji-reading-game:selected-kanji:v1";
  const list = document.getElementById("kanji-list");
  const count = document.getElementById("selection-count");
  const status = document.getElementById("save-status");
  const start = document.getElementById("start-quiz");
  let selected = new Set();
  let initialMessage = "えらぶと じどうで ほぞんするよ。";

  try {
    const stored = localStorage.getItem(storageKey);
    if (stored !== null) {
      const value = JSON.parse(stored);
      if (!Array.isArray(value)) throw new Error("Invalid selection");
      selected = new Set(value.filter((character) => kanji.includes(character)));
      initialMessage = "ほぞんした かんじを よみこんだよ。";
    }
  } catch {
    initialMessage = "ほぞんした かんじを よみこめなかったよ。もういちど えらんでね。";
  }

  function updateCount() {
    count.textContent = `${selected.size} / 80 じ えらんだよ`;
    start.disabled = selected.size === 0;
    document.getElementById("start-hint").textContent = selected.size === 0 ? "かんじを 1じ いじょう えらんでね。" : "えらんだ かんじから 10もん だすよ。";
  }

  for (const character of kanji) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "kanji";
    button.textContent = character;
    button.setAttribute("aria-label", character);
    button.setAttribute("aria-pressed", String(selected.has(character)));
    button.addEventListener("click", () => {
      if (selected.has(character)) selected.delete(character);
      else selected.add(character);
      button.setAttribute("aria-pressed", String(selected.has(character)));
      updateCount();
      try {
        localStorage.setItem(storageKey, JSON.stringify(kanji.filter((item) => selected.has(item))));
        status.textContent = "ほぞんしたよ。";
      } catch {
        status.textContent = "ほぞんできなかったよ。ページを とじると えらんだ かんじが きえることがあるよ。";
      }
    });
    list.append(button);
  }
  start.addEventListener("click", () => {
    if (selected.size === 0) return;
    const params = new URLSearchParams({ kanji: kanji.filter((character) => selected.has(character)).join("") });
    location.href = `quiz.html?${params}`;
  });
  updateCount();
  status.textContent = initialMessage;
})();
