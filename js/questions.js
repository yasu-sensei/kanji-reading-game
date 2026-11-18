"use strict";

(() => {
  // 提供CSVの対象漢字が初めて登場する順。問題番号・CSV本体は変更しない。
  const kanji = Array.from("木大小一二三四五六七八九十子空先生男女手天青文字正見学校山水雨上下日火田川竹月車人気糸目玉村白土音花休虫金本森出中町入赤耳王口年立草名夕百円千犬早貝林右足石左力");
  const headers = ["番号", "対象漢字", "出題語彙", "正しい読み", "間違い①（候補）", "間違い②（候補）", "確認状況"];

  function parseCSV(text) {
    const rows = [];
    let row = [], field = "", quoted = false, closed = false;
    const source = text.replace(/^\uFEFF/, "");
    for (let index = 0; index < source.length; index += 1) {
      const char = source[index];
      if (quoted) {
        if (char === '"' && source[index + 1] === '"') { field += '"'; index += 1; }
        else if (char === '"') { quoted = false; closed = true; }
        else field += char;
      } else if (char === '"') {
        if (field || closed) throw new Error("不正な引用符です");
        quoted = true;
      } else if (char === ",") {
        row.push(field); field = ""; closed = false;
      } else if (char === "\n" || char === "\r") {
        if (char === "\r" && source[index + 1] === "\n") index += 1;
        row.push(field);
        if (row.some((value) => value !== "")) rows.push(row);
        row = []; field = ""; closed = false;
      } else {
        if (closed) throw new Error("引用符の後に不正な文字があります");
        field += char;
      }
    }
    if (quoted) throw new Error("引用符が閉じていません");
    if (field || closed || row.length) { row.push(field); rows.push(row); }
    return rows;
  }

  function parseQuestions(text) {
    const rows = parseCSV(text);
    if (JSON.stringify(rows.shift()) !== JSON.stringify(headers) || rows.length !== 400) throw new Error("400問の列構成と一致しません");
    const ids = new Set();
    const counts = new Map();
    const questions = rows.map((row) => {
      if (row.length !== headers.length || row.some((value) => !value.trim())) throw new Error("問題に空欄があります");
      const [number, target, word, correct, wrong1, wrong2, status] = row;
      const id = Number(number);
      if (!Number.isInteger(id) || id < 1 || id > 400 || ids.has(id) || !kanji.includes(target) || !word.includes(target) || new Set([correct, wrong1, wrong2]).size !== 3) throw new Error("問題番号・漢字・選択肢が不正です");
      ids.add(id);
      counts.set(target, (counts.get(target) || 0) + 1);
      return Object.freeze({ id, target, word, correct, choices: Object.freeze([correct, wrong1, wrong2]), status });
    });
    if (counts.size !== 80 || [...counts.values()].some((count) => count !== 5)) throw new Error("80字×5問と一致しません");
    return questions;
  }

  function shuffle(items) {
    const result = [...items];
    for (let index = result.length - 1; index > 0; index -= 1) {
      const random = new Uint32Array(1);
      crypto.getRandomValues(random);
      const other = Math.floor((random[0] / 4294967296) * (index + 1));
      [result[index], result[other]] = [result[other], result[index]];
    }
    return result;
  }

  // 日付やチェック操作順ではなく、CSV初出順で末尾の10字を重点範囲にする。
  function focusKanji(selected, order = kanji) {
    const checked = new Set(selected);
    return order.filter(k => checked.has(k)).slice(-10);
  }
  function pickFocusedQuestions({questions, selected, order = kanji, history = {}, total, shuffleFn = shuffle}) {
    const checked = new Set(selected), focus = new Set(focusKanji(selected, order));
    const target = q => q.k ?? q.target;
    const all = questions.filter(q => checked.has(target(q)));
    if (!all.length) throw new Error("かんじを 1ついじょう えらんでね！");
    const focused = all.filter(q => focus.has(target(q)));
    const earlier = all.filter(q => !focus.has(target(q)));
    const used = new Set(), appearances = new Map(), chosen = [];
    const rank = q => { const h = history[q.id]; return !h?.seen ? 0 : h.wrong > 0 ? 1 : 2; };
    const lastSeen = q => Number.isFinite(history[q.id]?.lastSeen) ? history[q.id].lastSeen : 0;
    function take(pool, count, block) {
      for (let n = 0; n < count; n++) {
        const candidates = shuffleFn(pool.filter(q => !used.has(q.id)));
        candidates.sort((a,b) => rank(a)-rank(b) || (appearances.get(target(a)) || 0)-(appearances.get(target(b)) || 0) || lastSeen(a)-lastSeen(b));
        const q = candidates[0]; if (!q) break;
        used.add(q.id); appearances.set(target(q), (appearances.get(target(q)) || 0)+1); block.push(q);
      }
    }
    // ちょうせんの三択10問・入力10問の両方に重点5問ずつを確保する。
    for (const size of total === 20 ? [10,10] : [total]) {
      const block = [];
      take(focused, Math.ceil(size / 2), block);
      take(earlier, size - block.length, block);
      while (block.length < size) {
        const before = block.length;
        take(all, size - block.length, block);
        if (block.length === before) used.clear(); // 全候補を使い切った場合だけ重複を許可。
      }
      chosen.push(...shuffleFn(block));
    }
    return chosen;
  }

  window.KanjiQuestions = Object.freeze({ kanji: Object.freeze(kanji), parseCSV, parseQuestions, shuffle, focusKanji, pickFocusedQuestions });
})();
