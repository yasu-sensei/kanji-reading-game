"use strict";
(() => {
  const key = "kanji-reading-prototype-v1";
  const cardIds = new Set(window.REWARD_CARDS.map(card => card.id));
  const profilePattern = /^[1-4]-(?:[1-9]|[12][0-9]|3[0-5])$/;
  const clone = value => JSON.parse(JSON.stringify(value));
  function normalize(raw) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw) || !raw.users || typeof raw.users !== "object" || Array.isArray(raw.users)) throw new Error("ほぞんデータを よみこめません。おとなの方に しらせてね。");
    const result = clone(raw);
    for (const [id, u] of Object.entries(result.users)) {
      if (!profilePattern.test(id) || !u || !Number.isSafeInteger(u.stars) || u.stars < 0 || !Number.isInteger(u.practice) || u.practice < 0 || u.practice > 4 || !Array.isArray(u.selected) || !Array.isArray(u.log) || !u.history || typeof u.history !== "object" || Array.isArray(u.history)) throw new Error("ほぞんデータの かたちが ちがいます。おとなの方に しらせてね。");
      u.cardCounts ??= {};
      if (typeof u.cardCounts !== "object" || Array.isArray(u.cardCounts) || Object.entries(u.cardCounts).some(([card, count]) => !cardIds.has(card) || !Number.isInteger(count) || count < 0 || count > 3)) throw new Error("カードの きろくを よみこめません。");
    }
    result.active ??= "";
    if (result.active && (!profilePattern.test(result.active) || !Object.hasOwn(result.users, result.active))) throw new Error("とうろくを たしかめてね。");
    return result;
  }
  function read() {
    const raw = localStorage.getItem(key);
    return raw === null ? { users: {}, active: "" } : normalize(JSON.parse(raw));
  }
  async function transact(change) {
    const run = () => {
      const next = read();
      const result = change(next);
      const checked = normalize(next);
      localStorage.setItem(key, JSON.stringify(checked));
      return { data: checked, result };
    };
    if (navigator.locks?.request) return navigator.locks.request(key, run);
    return run();
  }
  function profile(data, id) {
    if (!id || data.active !== id || !Object.hasOwn(data.users, id)) throw new Error("とうろくが かわったよ。じゅんびがめんに もどってね。");
    return data.users[id];
  }
  function freshProfile() { return { selected: [], stars: 0, practice: 0, history: {}, lastHomework: "", log: [], collection: [], cardCounts: {} }; }
  window.GameStore = Object.freeze({ key, read, transact, profile, freshProfile, profilePattern });
})();
