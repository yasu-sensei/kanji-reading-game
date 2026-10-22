const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
const {chromium} = require('playwright');
const env = {window:{}};
for (const name of ['questions','word-readings']) vm.runInNewContext(fs.readFileSync(`js/${name}.js`,'utf8'),env);
const questions=env.window.KanjiQuestions.parseQuestions(fs.readFileSync('data/kanji_400_final.csv','utf8'));
const normalize=s=>s.replace(/[ァ-ヶ]/g,c=>String.fromCharCode(c.charCodeAt(0)-96));
assert.equal(Object.keys(env.window.WORD_READINGS).length,400);
for (const q of questions) {
 const parts=env.window.WORD_READINGS[q.id];
 assert.equal(parts.map(p=>p[0]).join(''),q.word);
 assert.equal(normalize(parts.map(([t,r])=>r||t).join('')),normalize(q.correct),q.word);
}
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 try {
 const p=await browser.newPage();
 await p.route('**/js/app.js*',route=>route.fulfill({contentType:'application/javascript',body:fs.readFileSync('js/app.js','utf8').replace('items: poolQuestions(mode === "homework" ? 20 : 10)', 'items: Array(10).fill({id:13,w:"小石",r:"こいし",opts:["こいし","しょうせき","おいし"]})')}));
 await p.goto('http://127.0.0.1:8000/');await p.waitForSelector('#cls');
 await p.evaluate(()=>{const u=GameStore.freshProfile();u.selected=['小'];localStorage.setItem(GameStore.key,JSON.stringify({active:'1-1',users:{'1-1':u}}))});await p.reload();await p.waitForSelector('.kanji');await p.evaluate(()=>begin('practice'));
 assert.equal(await p.locator('.question ruby').count(),1);assert.equal(await p.locator('.question rt').textContent(),'いし');
 await p.evaluate(()=>answer(0));assert.equal(await p.locator('.question rt').textContent(),'いし');
 await p.evaluate(()=>nav('select'));await p.getByRole('button',{name:'石',exact:true}).click();await p.reload();await p.waitForSelector('.kanji');await p.evaluate(()=>begin('practice'));assert.equal(await p.locator('.question ruby').count(),0);
 console.log('PASS: 400 word readings reconstruct CSV; 小石 selection, feedback and reload update ruby');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
