"use strict";

(() => {
  const { kanji, parseQuestions, shuffle } = window.KanjiQuestions;
  const selectionKey = "kanji-reading-game:selected-kanji:v1";
  const panels = ["loading-panel", "question-panel", "result-panel"];
  let allQuestions = [];
  let selected = [];
  let questions = [];
  let answers = [];
  let answered = false;
  let loading = false;

  function showPanel(id) {
    for (const panel of panels) document.getElementById(panel).hidden = panel !== id;
  }

  function readSelection() {
    const params = new URLSearchParams(location.search);
    let values;
    if (params.has("kanji")) values = Array.from(params.get("kanji"));
    else {
      const saved = localStorage.getItem(selectionKey);
      values = saved === null ? [] : JSON.parse(saved);
      if (!Array.isArray(values)) throw new Error("かんじを えらびなおしてね。");
    }
    return [...new Set(values.filter((value) => kanji.includes(value)))];
  }

  function startSet() {
    const eligible = allQuestions.filter((question) => selected.includes(question.target));
    if (eligible.length === 0) throw new Error("かんじを えらびなおしてね。");
    // 操作確認用。1字なら5問を2周し、十分な問題がある場合は重複させない。
    questions = [];
    while (questions.length < 10) questions.push(...shuffle(eligible).slice(0, 10 - questions.length));
    answers = [];
    renderQuestion();
  }

  function renderQuestion() {
    answered = false;
    const question = questions[answers.length];
    showPanel("question-panel");
    document.getElementById("question-panel").dataset.questionId = question.id;
    document.getElementById("question-number").textContent = `${answers.length + 1} / 10 もんめ`;
    document.getElementById("selected-kanji").textContent = `えらんだ かんじ：${selected.join("・")}`;
    document.getElementById("quiz-progress").value = answers.length;
    const word = document.getElementById("question-word");
    word.replaceChildren();
    for (const character of question.word) {
      const part = document.createElement(question.target === character ? "mark" : "span");
      part.textContent = character;
      word.append(part);
    }
    const choices = document.getElementById("answer-choices");
    choices.replaceChildren();
    for (const [index, reading] of shuffle(question.choices).entries()) {
      const button = document.createElement("button");
      button.className = "answer-choice";
      button.type = "button";
      const number = document.createElement("span");
      number.className = "choice-number";
      number.textContent = index + 1;
      number.setAttribute("aria-hidden", "true");
      const label = document.createElement("span");
      label.textContent = reading;
      button.append(number, label);
      button.addEventListener("click", () => answerQuestion(question, reading, button));
      choices.append(button);
    }
    const feedback = document.getElementById("answer-feedback");
    feedback.textContent = "";
    feedback.className = "answer-feedback";
    document.getElementById("next-question").hidden = true;
    document.getElementById("question-heading").focus();
  }

  function answerQuestion(question, reading, button) {
    if (answered) return;
    answered = true;
    const correct = reading === question.correct;
    answers.push({ question, reading, correct });
    for (const item of document.querySelectorAll(".answer-choice")) item.disabled = true;
    button.classList.add(correct ? "correct" : "incorrect");
    const feedback = document.getElementById("answer-feedback");
    feedback.className = `answer-feedback ${correct ? "correct" : "incorrect"}`;
    feedback.textContent = correct ? "○ せいかい！" : `△ よみかたを たしかめよう：${question.correct}`;
    document.getElementById("quiz-progress").value = answers.length;
    const next = document.getElementById("next-question");
    next.textContent = answers.length === 10 ? "けっかを みる →" : "つぎの もんだい →";
    next.hidden = false;
  }

  function showResult() {
    showPanel("result-panel");
    document.getElementById("result-score").textContent = `${answers.filter((answer) => answer.correct).length} / 10 もん せいかい`;
    const summary = document.getElementById("answer-summary");
    summary.replaceChildren();
    const list = document.createElement("ol");
    for (const answer of answers) {
      const item = document.createElement("li");
      const mark = document.createElement("span");
      mark.className = answer.correct ? "correct" : "incorrect";
      mark.textContent = answer.correct ? "○" : "△";
      const text = document.createElement("span");
      text.textContent = `${answer.question.word}：${answer.question.correct}`;
      item.append(mark, text);
      list.append(item);
    }
    summary.append(list);
    document.getElementById("result-heading").focus();
  }

  async function load() {
    if (loading) return;
    loading = true;
    showPanel("loading-panel");
    const retry = document.getElementById("retry-load");
    retry.hidden = true;
    const message = document.getElementById("load-message");
    message.textContent = "";
    try {
      try { selected = readSelection(); }
      catch { throw new Error("かんじを よみこめなかったよ。えらびなおしてね。"); }
      if (selected.length === 0) throw new Error("かんじを 1じ いじょう えらんでね。");
      const response = await fetch("data/kanji_400_final.csv", { cache: "no-cache" });
      if (!response.ok) throw new Error("もんだいを よみこめませんでした。もういちど ためしてね。");
      const text = await response.text();
      try { allQuestions = parseQuestions(text); }
      catch { throw new Error("もんだいの データを たしかめる ひつようがあるよ。おとなの方に しらせてね。"); }
      startSet();
    } catch (error) {
      document.getElementById("loading-heading").textContent = "いっしょに じゅんびしよう";
      message.textContent = error instanceof TypeError ? "もんだいを よみこめませんでした。つうしんを たしかめてね。" : error.message;
      retry.hidden = false;
    } finally {
      loading = false;
    }
  }

  document.getElementById("next-question").addEventListener("click", () => {
    if (!answered) return;
    if (answers.length === 10) showResult();
    else renderQuestion();
  });
  document.getElementById("play-again").addEventListener("click", startSet);
  document.getElementById("retry-load").addEventListener("click", load);
  load();
})();
