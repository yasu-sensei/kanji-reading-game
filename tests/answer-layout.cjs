const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
(async () => {
 const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] });
 try {
  for (const width of [375, 768, 1024, 1366]) {
   const page = await browser.newPage({ viewport: { width, height: 768 }, hasTouch: true });
   await page.route('**/js/app.js', route => route.fulfill({ contentType: 'application/javascript', body: fs.readFileSync('js/app.js', 'utf8').replace('items: poolQuestions(mode === "homework" ? 20 : 10)', 'items: Array(10).fill(window.fixture)') }));
   await page.goto('http://127.0.0.1:8000/');
   await page.waitForFunction(()=>document.querySelector('#cls')||document.querySelector('.title-start'));if(await page.getByRole('button',{name:'ゲームをはじめる',exact:true}).count()) await page.getByRole('button',{name:'ゲームをはじめる',exact:true}).click();await page.waitForSelector('#cls');
   await page.evaluate(() => { const u = GameStore.freshProfile(); u.selected = ['木']; localStorage.setItem(GameStore.key, JSON.stringify({ active: '1-1', users: { '1-1': u } })); });
   await page.reload(); await page.waitForSelector('.kanji');
   for (const [id, word, reading] of [[2,'木かげ','こかげ'],[3,'木曜日','もくようび'],[4,'木の葉','このは'],[340,'夕方の空','ゆうがたのそら'],[1,'りんごの木','りんごのき']]) {
    for (const correct of [true, false]) {
     await page.evaluate(({ id, word, reading }) => { window.fixture = { id, w: word, r: reading, opts: [reading, 'ちがう', 'べつ'], k:'木' }; begin('practice'); }, { id, word, reading });
     const before = await page.locator('.choices').boundingBox();
     const height = await page.locator('.play-card').evaluate(el => el.getBoundingClientRect().height);
     await page.evaluate(correct => answer(correct ? 0 : 1), correct);
     const after = await page.locator('.choices').boundingBox();
     assert.equal(after.y, before.y, `${width}px ${word}: buttons moved`);
     assert.equal(await page.locator('.play-card').evaluate(el => el.getBoundingClientRect().height), height);
     assert(await page.locator('.remember-reading').isVisible());
     await page.evaluate(() => nav('select'));
    }
   }
   await page.close();
  }
  console.log('PASS: answer buttons and card height unchanged on correct/wrong answers, ruby and long words, 375–1366px');
 } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
