"use strict";

(() => {
  const cards = window.REWARD_CARDS;
  const tiers = [
    { id: "normal", name: "ノーマル", required: 1 },
    { id: "gold", name: "ゴールド", required: 2 },
    { id: "rainbow", name: "レインボー", required: 3 },
  ];
  const storageKey = "kanji-reading-game:rewards-demo:v1";
  const storageMessage = document.getElementById("storage-message");
  const page = document.body.dataset.page;
  let state;
  let storageOK = true;
  let busy = false;
  let filter = "all";
  let lastFocus;

  function initialState() {
    return { version: 1, stars: 3, counts: {} };
  }

  function readState() {
    const raw = localStorage.getItem(storageKey);
    if (raw === null) return initialState();
    const value = JSON.parse(raw);
    if (!value || value.version !== 1 || !Number.isInteger(value.stars) || value.stars < 0 || value.stars > 999 || !value.counts || typeof value.counts !== "object" || Array.isArray(value.counts)) {
      throw new Error("Invalid reward state");
    }
    for (const [id, count] of Object.entries(value.counts)) {
      if (!cards.some((card) => card.id === id) || !Number.isInteger(count) || count < 0 || count > 3) throw new Error("Invalid card count");
    }
    return { version: 1, stars: value.stars, counts: { ...value.counts } };
  }

  function refreshState() {
    try {
      state = readState();
      storageOK = true;
      storageMessage.textContent = "";
    } catch {
      storageOK = false;
      state = initialState();
      storageMessage.textContent = "おためしの記録を よみこめません。ガチャは おやすみ中です。おとなの方に しらせてね。";
    }
  }

  function saveState(next) {
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
      state = next;
      storageMessage.textContent = "";
      return true;
    } catch {
      storageOK = false;
      storageMessage.textContent = "ほぞんできなかったので、星もカードも かえていないよ。おとなの方に しらせてね。";
      return false;
    }
  }

  function countFor(card) {
    return state.counts[card.id] || 0;
  }

  function unlockedCount() {
    return cards.reduce((sum, card) => sum + countFor(card), 0);
  }

  function makeArt(card, tier, lazy = false) {
    const frame = document.createElement("div");
    frame.className = `card-art ${tier.id}`;
    const image = document.createElement("img");
    image.src = card.image;
    image.alt = `${card.name}の${tier.name}カード`;
    image.loading = lazy ? "lazy" : "eager";
    image.decoding = "async";
    image.addEventListener("error", () => {
      image.hidden = true;
      const message = document.createElement("p");
      message.textContent = "えを よみこめませんでした。";
      frame.append(message);
    }, { once: true });
    frame.append(image);
    return frame;
  }

  function renderGacha() {
    const complete = unlockedCount() === cards.length * 3;
    document.getElementById("star-count").textContent = state.stars;
    const draw = document.getElementById("draw-card");
    draw.disabled = !storageOK || busy || complete || state.stars === 0;
    draw.textContent = complete ? "✦ ぜんぶ あつめたよ！" : "★ 1こで ガチャをひく";
    const add = document.getElementById("add-demo-stars");
    add.disabled = !storageOK || busy || complete || state.stars > 996;
    const message = document.getElementById("draw-message");
    if (complete) message.textContent = "コンプリート！ 99まいの たからものが そろったよ。";
    else if (state.stars === 0) message.textContent = "おためしの星を ふやすと、また ひけるよ。";
    else if (!busy) message.textContent = "星1こで 1かい。3まい あつめた なかまは もうでないよ。";
  }

  function showResult(card, count) {
    const tier = tiers[count - 1];
    document.getElementById("result-heading").textContent = count === 1 ? "なかまが ふえたよ！" : "カードが かがやいたよ！";
    const result = document.getElementById("draw-result");
    result.replaceChildren(makeArt(card, tier));
    const title = document.createElement("h3");
    title.textContent = card.name;
    const meta = document.createElement("p");
    meta.className = "result-meta";
    meta.textContent = `${count}まいめ · ${tier.name}カード`;
    result.append(title, meta);
    document.getElementById("draw-message").textContent = `${card.name}の ${tier.name}カードを ずかんに ほぞんしたよ！`;
  }

  function drawCard() {
    if (busy) return;
    refreshState();
    const eligible = cards.filter((card) => countFor(card) < 3);
    if (!storageOK || state.stars === 0 || eligible.length === 0) {
      renderGacha();
      return;
    }
    // おためし画面のみの等確率抽選。本番の排出率を確定するものではない。
    const random = new Uint32Array(1);
    crypto.getRandomValues(random);
    const card = eligible[Math.floor((random[0] / 4294967296) * eligible.length)];
    const count = countFor(card) + 1;
    const next = { ...state, stars: state.stars - 1, counts: { ...state.counts, [card.id]: count } };
    if (!saveState(next)) {
      renderGacha();
      return;
    }
    busy = true;
    renderGacha();
    document.querySelector(".summon-panel").classList.add("is-drawing");
    showResult(card, count);
    setTimeout(() => {
      busy = false;
      document.querySelector(".summon-panel").classList.remove("is-drawing");
      renderGacha();
    }, 700);
  }

  function openDetail(card, tier, button) {
    lastFocus = button;
    document.getElementById("detail-card").replaceChildren(makeArt(card, tier));
    document.getElementById("detail-name").textContent = card.name;
    document.getElementById("detail-tier").textContent = `No.${card.id} · ${tier.name}`;
    document.getElementById("detail-count").textContent = `この なかまは ${countFor(card)}まい もっているよ。`;
    document.getElementById("card-dialog").showModal();
  }

  function renderAlbum() {
    const total = unlockedCount();
    document.getElementById("collection-count").textContent = total;
    document.getElementById("collection-progress").value = total;
    const grid = document.getElementById("album-grid");
    const ownedOnly = document.getElementById("owned-only").checked;
    grid.replaceChildren();
    let visible = 0;
    let owned = 0;
    for (const card of cards) {
      for (const tier of tiers) {
        if (filter !== "all" && filter !== tier.id) continue;
        const unlocked = countFor(card) >= tier.required;
        if (ownedOnly && !unlocked) continue;
        visible += 1;
        if (unlocked) owned += 1;
        const entry = document.createElement("article");
        entry.className = "album-entry";
        entry.dataset.cardId = card.id;
        entry.dataset.tier = tier.id;
        const button = document.createElement("button");
        button.type = "button";
        button.className = "album-card-button";
        if (unlocked) {
          button.setAttribute("aria-label", `${card.name} ${tier.name}カードを おおきくみる`);
          button.append(makeArt(card, tier, true));
          button.addEventListener("click", () => openDetail(card, tier, button));
        } else {
          button.disabled = true;
          button.setAttribute("aria-label", `No.${card.id} ${tier.name} まだもっていないカード`);
          const back = document.createElement("div");
          back.className = "card-art locked-art";
          const mark = document.createElement("span");
          mark.textContent = "✧";
          mark.setAttribute("aria-hidden", "true");
          const caption = document.createElement("small");
          caption.textContent = "まだ であっていないよ";
          back.append(mark, caption);
          button.append(back);
        }
        const label = document.createElement("p");
        label.className = "album-label";
        const number = document.createElement("span");
        number.textContent = `No.${card.id}`;
        const badge = document.createElement("span");
        badge.className = `tier-label ${tier.id}`;
        badge.textContent = tier.name;
        label.append(number, badge);
        const name = document.createElement("h2");
        name.textContent = unlocked ? card.name : "？？？";
        entry.append(button, label, name);
        grid.append(entry);
      }
    }
    document.getElementById("album-empty").hidden = visible !== 0;
    document.getElementById("album-summary").textContent = `${visible}まいを ひょうじ · ${owned}まい もっているよ`;
  }

  function render() {
    if (page === "gacha") renderGacha();
    else renderAlbum();
  }

  refreshState();
  render();
  if (page === "gacha") {
    document.getElementById("draw-card").addEventListener("click", drawCard);
    document.getElementById("add-demo-stars").addEventListener("click", () => {
      if (busy) return;
      refreshState();
      if (storageOK && state.stars <= 996 && unlockedCount() < 99) saveState({ ...state, stars: state.stars + 3 });
      renderGacha();
    });
  } else {
    document.getElementById("tier-filters").addEventListener("click", (event) => {
      const button = event.target.closest("button[data-filter]");
      if (!button) return;
      filter = button.dataset.filter;
      for (const item of document.querySelectorAll("[data-filter]")) item.setAttribute("aria-pressed", String(item === button));
      renderAlbum();
    });
    document.getElementById("owned-only").addEventListener("change", renderAlbum);
    const dialog = document.getElementById("card-dialog");
    document.getElementById("close-detail").addEventListener("click", () => dialog.close());
    document.getElementById("detail-done").addEventListener("click", () => dialog.close());
    dialog.addEventListener("close", () => lastFocus?.isConnected && lastFocus.focus());
  }
  document.getElementById("reset-demo").addEventListener("click", () => {
    if (busy || !confirm("おためしの星とカードを すべてリセットしますか？ 学習の記録は変更しません。")) return;
    try {
      localStorage.removeItem(storageKey);
      refreshState();
      if (page === "gacha") {
        document.getElementById("draw-result").textContent = "ガチャをひくと、ここにカードが あらわれるよ。";
        document.getElementById("result-heading").textContent = "きみの なかまを よぼう";
      } else document.getElementById("card-dialog").close();
      render();
    } catch {
      storageMessage.textContent = "リセットできませんでした。";
    }
  });
  window.addEventListener("storage", (event) => {
    if (event.key !== storageKey && event.key !== null) return;
    refreshState();
    if (page === "collection") document.getElementById("card-dialog").close();
    render();
  });
})();
