"use strict";
(() => {
  const store = window.GameStore;
  const app = document.getElementById("app");
  let QUESTIONS = [], KANJI = [], data = { users: {}, active: "" };
  let screen = "home", game = null, review = null, feedback = null, timer = null, warning = "", saving = false;
  const esc = x => String(x).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  // 表示用の補助読み。CSVの語彙・正答・選択肢は変更しない。
  const supportingReadings = { 曜: "よう", 葉: "は", 声: "ごえ", 頭: "とう", 長: "ちょう", 紙: "し", 国: "ごく", 才: "さい", 色: "いろ", 作: "さく", 数: "すう", 門: "もん", 道: "みち", 地: "ち", 毎: "まい", 記: "き", 光: "こう", 電: "でん", 元: "げん", 毛: "け", 鳥: "ちょう", 夏: "なつ", 魚: "ぎょ", 心: "しん", 来: "らい", 原: "げん", 方: "がた", 朝: "ちょう", 遠: "えん", 体: "たい" };
  function questionWord(q) {
    return Array.from(q.w, char => {
      let reading = supportingReadings[char];
      if (q.id === 100 && char === "紙") reading = "がみ";
      if (q.id === 373 && char === "道") reading = "どう";
      return reading ? `<ruby>${esc(char)}<rp>（</rp><rt>${reading}</rt><rp>）</rp></ruby>` : esc(char);
    }).join("");
  }
  const shuffle = window.KanjiQuestions.shuffle;
  const today = () => new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const practiceToday = u => u.log.filter(log => log.mode === "practice" && log.date && new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(log.date)) === today()).length;
  const user = () => data.users[data.active];
  const b = (text, action, classes = "") => `<button type="button" class="${classes}" onclick="${esc(action)}" ${saving ? "disabled" : ""}>${text}</button>`;
  function cancelTimer() { clearTimeout(timer); timer = null; }
  async function update(change) {
    if (saving) return false;
    saving = true;
    try { const result = await store.transact(change); data = result.data; warning = ""; return true; }
    catch (error) { warning = "ほぞんできませんでした。星やカードは かえていません。 " + (error.name === "Error" ? error.message : "端末の ほぞんせっていを おとなの方に たしかめてもらってね。"); return false; }
    finally { saving = false; }
  }
  async function startLogin() {
    const cls = document.getElementById("cls").value, num = document.getElementById("num").value;
    const id = cls + "-" + num;
    if (!store.profilePattern.test(id)) { warning = "くみと ばんごうを えらんでね。"; render(); return; }
    if (await update(next => { if (!next.users[id]) next.users[id] = { ...store.freshProfile(), stars: 4, welcomeGiftReceived: true }; next.active = id; })) screen = "select";
    render();
  }
  async function changeUser() {
    if (game && !game.committed && !confirm("とちゅうの もんだいは きろくされません。もどりますか？")) return;
    if (await update(next => { next.active = ""; })) { cancelTimer(); game = review = feedback = null; screen = "home"; }
    render();
  }
  async function toggle(k) {
    const id = data.active;
    await update(next => { const u = store.profile(next, id); u.selected = u.selected.includes(k) ? u.selected.filter(x => x !== k) : [...u.selected, k]; }); render();
  }
  async function selectAll(value) {
    const id = data.active;
    await update(next => { store.profile(next, id).selected = value ? [...KANJI] : []; }); render();
  }
  function available() { const set = new Set(user().selected); return QUESTIONS.filter(q => set.has(q.k)); }
  function poolQuestions(total) {
    const all = available(), history = user().history;
    // 添付試作版の暫定配分を維持。正式な習熟度の計算は未確定。
    const unseen = shuffle(all.filter(q => !history[q.id]));
    const weak = shuffle(all.filter(q => history[q.id]?.wrong > 0)).sort((a, b) => history[b.id].wrong - history[a.id].wrong);
    const rest = shuffle(all.filter(q => history[q.id]));
    const chosen = [], ids = new Set();
    function add(items, n) { for (const q of items) { if (chosen.length >= total || n <= 0) break; if (ids.has(q.id)) continue; chosen.push(q); ids.add(q.id); n--; } }
    add(unseen, 5); add(weak, 3); add(rest, total - chosen.length); add(shuffle(all), total - chosen.length);
    while (chosen.length < total) chosen.push(...shuffle(all).slice(0, total - chosen.length));
    return shuffle(chosen).map(q => ({ ...q, opts: shuffle([q.r, ...q.wrong]) }));
  }
  function begin(mode) {
    if (saving) return;
    try { data = store.read(); } catch { warning = "きろくを よみこめません。"; render(); return; }
    if (!user()) { screen = "home"; render(); return; }
    if (!available().length) { warning = "かんじを 1ついじょう えらんでね！"; render(); return; }
    if (mode === "homework" && user().lastHomework === today()) { warning = "きょうの しゅくだいは おわっているよ！"; render(); return; }
    if (mode === "practice" && practiceToday(user()) >= 5) { warning = "きょうの れんしゅうは おわったよ。また あした！"; render(); return; }
    warning = ""; game = { id: crypto.randomUUID(), profile: data.active, mode, items: poolQuestions(mode === "homework" ? 20 : 10), idx: 0, answers: [], committed: false, awarded: 0, reviewFinished: false };
    review = feedback = null; screen = "play"; render();
  }
  async function commitGame() {
    if (game.committed) return true;
    const current = game;
    const score = current.answers.filter(x => x.ok).length;
    let award = 0;
    const ok = await update(next => {
      const u = store.profile(next, current.profile);
      const prior = u.log.find(log => log.id === current.id);
      if (prior) { award = prior.award; return; }
      if (current.mode === "homework") {
        if (u.lastHomework === today()) throw new Error("きょうの しゅくだいは すでに きろくされています。");
        award = score === current.items.length ? 2 : score >= current.items.length / 2 ? 1 : 0; u.lastHomework = today();
      } else { if (practiceToday(u) >= 5) throw new Error("きょうの れんしゅうは 5かい おわっています。また あした！"); u.practice++; if (u.practice >= 5) { award = 1; u.practice = 0; } }
      for (const answer of current.answers) { const h = u.history[answer.id] ?? { seen: 0, correct: 0, wrong: 0 }; h.seen++; if (answer.ok) h.correct++; else h.wrong++; u.history[answer.id] = h; }
      u.stars += award;
      u.log.push({ id: current.id, date: new Date().toISOString(), mode: current.mode, score, award });
    });
    if (ok) { current.committed = true; current.awarded = award; }
    return ok;
  }
  async function answer(index) {
    if (feedback || !game || screen !== "play") return;
    const current = game;
    const q = current.items[current.idx];
    if (!Number.isInteger(index) || !q.opts[index]) return;
    const ok = q.opts[index] === q.r;
    feedback = { ok, choice: index }; game.answers.push({ id: q.id, ok });
    render(); // 正誤はタップした処理内ですぐ表示。
    if (current.answers.length === current.items.length) { await commitGame(); if (game !== current) return; render(); }
    cancelTimer();
    timer = setTimeout(() => { if (screen !== "play" || game !== current) return; feedback = null; game.idx++; if (game.idx >= game.items.length) screen = "result"; render(); }, ok ? 1500 : 2000);
  }
  async function retryCommit() { if (await commitGame()) warning = ""; render(); }
  function quit() { if (game?.committed) { nav("result"); return; } if (!confirm("とちゅうで やめる？ さいごまで おわっていないと きろくは のこらないよ。")) return; cancelTimer(); game = review = feedback = null; screen = "select"; render(); }
  function startReview() {
    if (!game?.committed) return;
    const missed = game.items.filter((q, i) => !game.answers[i].ok);
    const unique = [...new Map(missed.map(q => [q.id, q])).values()];
    if (!unique.length) return;
    review = { round: 1, items: shuffle(unique.map(q => ({ ...q, opts: shuffle([q.r, ...q.wrong]) }))), idx: 0, failed: [] };
    feedback = null; screen = "review"; render();
  }
  function reviewAnswer(index) {
    if (feedback || screen !== "review") return;
    const q = review.items[review.idx], ok = q.opts[index] === q.r;
    feedback = { ok, choice: index }; if (!ok) review.failed.push(q); render(); cancelTimer();
    timer = setTimeout(() => {
      if (screen !== "review") return;
      feedback = null; review.idx++;
      if (review.idx >= review.items.length) {
        if (review.round === 1 && review.failed.length) review = { round: 2, items: shuffle(review.failed.map(q => ({ ...q, opts: shuffle([q.r, ...q.wrong]) }))), idx: 0, failed: [] };
        else { game.reviewFinished = true; screen = "reviewDone"; }
      }
      render();
    }, ok ? 1500 : 2000);
  }
  function nav(to) { cancelTimer(); feedback = review = null; if (to !== "result") game = null; screen = to; warning = ""; render(); }
  function goRewards(page) { cancelTimer(); location.href = page + ".html"; }
  function render() {
    let html = `<h1>🌸 かんじの よみかた☆マスター</h1>`;
    if (warning) html += `<div class="notice" role="alert">${esc(warning)}</div>`;
    if (!data.active) {
      html += `<section class="card stack"><h2>はじめに おしえてね</h2><div class="login"><label>なんくみ？<select id="cls"><option value="">えらぶ</option>${Array.from({ length: 4 }, (_, i) => `<option value="${i + 1}">${i + 1}くみ</option>`).join("")}</select></label><label>なんばん？<select id="num"><option value="">えらぶ</option>${Array.from({ length: 35 }, (_, i) => `<option value="${i + 1}">${i + 1}ばん</option>`).join("")}</select></label></div>${b("はじめる", "startLogin()", "primary full")}<p class="muted">記録はこの端末のブラウザー内に保存します。別の端末への引き継ぎ・先生のサーバーとは未連携です。</p></section>`;
      app.innerHTML = html; return;
    }
    const u = user();
    html += `<div class="row user-header"><span class="badge">${esc(data.active.replace("-", "くみ "))}ばん</span><span class="badge" id="learning-stars">⭐ ${u.stars}こ</span>${b("とうろく きりかえ", "changeUser()", "small secondary")}</div>`;
    if (screen === "home") screen = "select";
    if (screen === "select") html += `<section class="card"><h2>① ならった かんじを えらぼう！</h2><p class="muted">タッチで えらぶ・もういちどで はずす</p><div class="row"><span class="badge">${u.selected.length} / 80じ</span><div class="buttons">${b("ぜんぶ えらぶ", "selectAll(true)", "small secondary")}${b("ぜんぶ はずす", "selectAll(false)", "small secondary")}</div></div><div class="grid">${KANJI.map(k => `<button type="button" class="kanji ${u.selected.includes(k) ? "on" : ""}" aria-label="${k}" aria-pressed="${u.selected.includes(k)}" onclick="toggle('${k}')" ${saving ? "disabled" : ""}>${k}</button>`).join("")}</div><p class="muted">えらんだ かんじの ことば：${available().length}もん</p></section><section class="card stack"><h2>② どちらで あそぶ？</h2><p>🏠 しゅくだい：1にち 1かい（20もん）</p><button type="button" class="primary full" onclick="begin('homework')" ${u.lastHomework === today() || saving ? "disabled" : ""}>${u.lastHomework === today() ? "✓ きょうの しゅくだいは おわったよ" : "しゅくだいを はじめる"}</button><p>✏️ れんしゅう：1にち 5かいまで（きょう あと ${Math.max(0, 5 - practiceToday(u))}かい）</p><p>あと ${5 - u.practice}かいで ⭐ 1こ</p><button type="button" class="full secondary" onclick="begin('practice')" ${practiceToday(u) >= 5 || saving ? "disabled" : ""}>${practiceToday(u) >= 5 ? "✓ きょうの れんしゅうは おわったよ" : "れんしゅうを はじめる"}</button><div class="result-links">${b("🎁 ガチャ", "goRewards('gacha')", "full")}${b("📖 ずかん", "goRewards('collection')", "full")}</div></section>`;
    if (screen === "play" || screen === "review") {
      const isReview = screen === "review", q = isReview ? review.items[review.idx] : game.items[game.idx];
      const num = isReview ? review.idx + 1 : game.idx + 1, max = isReview ? review.items.length : game.items.length;
      html += `<section class="card play-card" data-question-id="${q.id}"><div class="question-toolbar"><strong>${isReview ? "ふくしゅう " + review.round + "かいめ" : game.mode === "homework" ? "しゅくだい" : "れんしゅう"} ${num} / ${max}</strong>${b("やめる", isReview ? "nav('result')" : "quit()", "small secondary")}</div><div class="progress" role="progressbar" aria-label="こたえた もんだい" aria-valuemin="0" aria-valuemax="${max}" aria-valuenow="${num - 1}"><div style="width:${(num - 1) / max * 100}%"></div></div><div class="answer-display"><div class="feedback ${feedback ? feedback.ok ? "good" : "bad" : ""}" role="status" aria-live="polite">${feedback ? feedback.ok ? "○ せいかい！" : "× たしかめよう" : ""}</div><div class="question remember-word">${questionWord(q)}</div><div class="reading-slot"><div class="remember-reading" ${feedback ? "" : 'style="visibility:hidden" aria-hidden="true"'}>${esc(q.r)}</div>${feedback ? "" : '<p class="muted reading-prompt">ただしい よみかたを えらぼう！</p>'}</div></div><div class="choices">${q.opts.map((option, i) => `<button type="button" ${feedback ? "disabled" : ""} class="choice ${feedback ? option === q.r ? "correct" : i === feedback.choice ? "wrong" : "" : ""}" onclick="${isReview ? "reviewAnswer" : "answer"}(${i})">${esc(option)}</button>`).join("")}</div></section>`;
    }
    if (screen === "result") {
      const score = game.answers.filter(a => a.ok).length, missed = game.items.length - score;
      html += `<section class="card stack"><h2>けっか はっぴょう！</h2><div class="big">${score} / ${game.items.length}</div><div class="big star">${"★".repeat(game.awarded) || "☆"}</div><p style="text-align:center">${game.committed ? "きろくを ほぞんしたよ。こんかいの ⭐：" + game.awarded + "こ" : "まだ ほぞんできていません。"}</p>${!game.committed ? b("もういちど ほぞんする", "retryCommit()", "primary full") : ""}${missed && game.committed && !game.reviewFinished ? b("まちがえた もんだいを ふくしゅう", "startReview()", "primary full") : ""}${b("かんじを えらぶ がめんへ", "nav('select')", "secondary full")}<div class="result-links">${b("🎁 ガチャ", "goRewards('gacha')")}${b("📖 ずかん", "goRewards('collection')")}</div></section>`;
    }
    if (screen === "reviewDone") html += `<section class="card stack"><h2>ふくしゅう おしまい！</h2><p>がんばったね！ つぎも ちょうせんしよう。</p>${b("じゅんびがめんへ", "nav('select')", "primary full")}</section>`;
    html += `<p class="foot">400問の提供CSVを使用｜学級・番号別の端末内保存｜別端末への同期は未連携</p>`;
    app.innerHTML = html;
  }
  async function initialize() {
    try {
      const response = await fetch("data/kanji_400_final.csv"); if (!response.ok) throw new Error("問題をよみこめません。");
      QUESTIONS = window.KanjiQuestions.parseQuestions(await response.text()).map(q => ({ id: q.id, k: q.target, w: q.word, r: q.correct, wrong: q.choices.slice(1) }));
      KANJI = [...new Set(QUESTIONS.map(q => q.k))]; data = store.read(); render();
    } catch { app.innerHTML = `<section class="card"><h1>じゅんびを たしかめよう</h1><p>もんだい または きろくを よみこめませんでした。おとなの方に しらせてね。きろくは けしていません。</p><button type="button" onclick="location.reload()">もういちど よみこむ</button></section>`; }
  }
  Object.assign(window, { startLogin, changeUser, toggle, selectAll, begin, answer, retryCommit, quit, startReview, reviewAnswer, nav, goRewards });
  window.addEventListener("storage", event => { if (event.key !== store.key && event.key !== null) return; try { const next = store.read(); if (next.active !== data.active) { cancelTimer(); game = review = feedback = null; screen = "home"; } data = next; render(); } catch { warning = "きろくの へんこうを よみこめません。"; render(); } });
  initialize();
})();
