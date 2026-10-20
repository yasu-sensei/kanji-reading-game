const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const sandbox = { window: {} };
vm.runInNewContext(fs.readFileSync('js/cards.js', 'utf8'), sandbox);
const cards = JSON.parse(JSON.stringify(sandbox.window.REWARD_CARDS));
const key = 'kanji-reading-game:rewards-demo:v1';
const base = 'http://127.0.0.1:8000';

(async () => {
  assert.equal(cards.length, 33);
  assert.equal(new Set(cards.map(c => c.id)).size, 33);
  for (const card of cards) assert(fs.existsSync(card.image));
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] });
  try {
    const context = await browser.newContext({ reducedMotion: 'reduce' });
    await context.addInitScript(() => {
      // Deterministic randomness: always choose the first eligible card.
      crypto.getRandomValues = array => { array.fill(0); return array; };
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${base}/gacha.html`);
    const draw = page.locator('#draw-card');
    assert.equal(await page.locator('#star-count').textContent(), '3');
    for (let n = 1; n <= 3; n++) {
      await draw.click();
      await page.waitForFunction(() => !document.querySelector('.summon-panel').classList.contains('is-drawing'));
      assert.equal(await page.evaluate(key => JSON.parse(localStorage.getItem(key)).counts['001'], key), n);
      const tier = ['normal', 'gold', 'rainbow'][n - 1];
      assert.equal(await page.locator(`#draw-result .card-art.${tier}`).count(), 1);
      if (n > 1) {
        assert.notEqual(await page.locator('#draw-result .card-art').evaluate(el => getComputedStyle(el, '::before').backgroundImage), 'none');
        assert.equal(await page.locator('#draw-result .card-art').evaluate(el => getComputedStyle(el, '::after').animationName), 'none');
      }
    }
    assert(await draw.isDisabled()); // No stars, no extra draw.
    await page.locator('#add-demo-stars').click();
    // Rapid repeat calls must yield a single draw, and never give card 001 a fourth copy.
    await draw.evaluate(el => { el.click(); el.click(); el.click(); });
    await page.waitForFunction(() => !document.querySelector('.summon-panel').classList.contains('is-drawing'));
    const state = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), key);
    assert.deepEqual(state.counts, { '001': 3, '002': 1 });
    assert.equal(state.stars, 2);
    await page.reload();
    assert.equal(await page.locator('#star-count').textContent(), '2');
    await page.goto(`${base}/collection.html`);
    assert.equal(await page.locator('.album-entry').count(), 99);
    assert.equal(await page.locator('#collection-count').textContent(), '4');
    assert.equal(await page.locator('[data-card-id="001"] .album-card-button:enabled').count(), 3);
    assert.equal(await page.locator('[data-card-id="002"] .album-card-button:enabled').count(), 1);
    const rainbow = page.locator('[data-card-id="001"][data-tier="rainbow"] button');
    await rainbow.focus();
    await page.keyboard.press('Enter');
    assert(await page.locator('#card-dialog').evaluate(el => el.open));
    assert.match(await page.locator('#detail-tier').textContent(), /レインボー/);
    await page.keyboard.press('Escape');
    assert(await rainbow.evaluate(el => document.activeElement === el));
    await page.locator('[data-filter="gold"]').click();
    assert.equal(await page.locator('.album-entry').count(), 33);
    await page.locator('#owned-only').check();
    assert.equal(await page.locator('.album-entry').count(), 1);
    await page.locator('[data-filter="all"]').click();
    assert.equal(await page.locator('.album-entry').count(), 4);
    // Update from another tab must refresh the album.
    const second = await context.newPage();
    await second.goto(`${base}/gacha.html`);
    await second.locator('#draw-card').click();
    await page.waitForFunction(() => document.querySelector('#collection-count').textContent === '5');
    await second.close();
    // Only one missing variant: it must be drawn, then the complete collection stops spending stars.
    const completeCounts = Object.fromEntries(cards.map(c => [c.id, 3]));
    completeCounts.SECRET02 = 2;
    await page.evaluate(({ key, counts }) => localStorage.setItem(key, JSON.stringify({ version: 1, stars: 2, counts })), { key, counts: completeCounts });
    await page.goto(`${base}/gacha.html`);
    await draw.click();
    await page.waitForFunction(() => document.querySelector('#draw-message').textContent.includes('コンプリート'));
    assert(await draw.isDisabled());
    assert.equal(await page.locator('#star-count').textContent(), '1');
    assert(await page.locator('#add-demo-stars').isDisabled());
    await page.goto(`${base}/collection.html`);
    await page.locator('#owned-only').uncheck();
    assert.equal(await page.locator('#collection-count').textContent(), '99');
    assert.equal(await page.locator('.album-card-button:enabled').count(), 99);
    await page.setViewportSize({ width: 320, height: 740 });
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    // All images decode, including filenames with Japanese characters and the non-square secret card.
    await page.evaluate(async () => {
      for (const image of document.querySelectorAll('#album-grid img')) { image.loading = 'eager'; await image.decode(); }
    });
    await page.screenshot({ path: '/tmp/kanji-album-mobile.png', fullPage: false });
    await page.goto(`${base}/gacha.html`);
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.setViewportSize({ width: 1280, height: 1000 });
    await page.screenshot({ path: '/tmp/kanji-gacha-desktop.png', fullPage: true });
    // Corrupt/invalid saved records are preserved, and draws stop until an explicit reset.
    for (const raw of ['{broken', JSON.stringify({ version: 1, stars: -1, counts: {} }), JSON.stringify({ version: 1, stars: 3, counts: { '001': 4 } })]) {
      await page.evaluate(({ key, raw }) => localStorage.setItem(key, raw), { key, raw });
      await page.reload();
      assert(await draw.isDisabled());
      assert.equal(await page.evaluate(key => localStorage.getItem(key), key), raw);
    }
    // Reset affects only the demo key.
    await page.evaluate(() => localStorage.setItem('kanji-reading-game:selected-kanji:v1', '["一"]'));
    await page.locator('details').evaluate(el => el.open = true);
    page.once('dialog', dialog => dialog.accept());
    await page.locator('#reset-demo').click();
    assert.equal(await page.locator('#star-count').textContent(), '3');
    assert.equal(await page.evaluate(() => localStorage.getItem('kanji-reading-game:selected-kanji:v1')), '["一"]');
    // Quota failure must not spend stars or award a card.
    await page.evaluate(() => { Storage.prototype.setItem = () => { throw new DOMException('Full', 'QuotaExceededError'); }; });
    await draw.click();
    assert.equal(await page.locator('#star-count').textContent(), '3');
    assert(await draw.isDisabled());
    assert.equal(await page.evaluate(key => localStorage.getItem(key), key), null);
    assert.match(await page.locator('#storage-message').textContent(), /ほぞんできなかった/);
    const denied = await browser.newContext();
    await denied.addInitScript(() => Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('Denied', 'SecurityError'); } }));
    const deniedPage = await denied.newPage();
    await deniedPage.goto(`${base}/gacha.html`);
    assert(await deniedPage.locator('#draw-card').isDisabled());
    await deniedPage.goto(`${base}/collection.html`);
    assert.equal(await deniedPage.locator('.album-entry').count(), 99);
    assert.deepEqual(errors, []);
    console.log('PASS: 33 assets, all 3 foil tiers, persistent 99 slots, filters/dialog/keyboard, 3-copy exclusion, complete stop, rapid clicks, star limits, multi-tab refresh, storage failures, reset isolation, reduced motion, 320px layout and image decode');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
