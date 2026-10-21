const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const sandbox={window:{},crypto:require('node:crypto').webcrypto};
vm.runInNewContext(fs.readFileSync('js/questions.js','utf8'),sandbox);
const api=sandbox.window.KanjiQuestions;
assert.equal(JSON.stringify(api.parseCSV('\ufeffa,b\r\n"x,y","z""q"\r\n')),JSON.stringify([['a','b'],['x,y','z"q']]));
assert.equal(JSON.stringify(api.parseCSV('a,b\n"x\ny",z')),JSON.stringify([['a','b'],['x\ny','z']]));
for(const value of ['a\n"unclosed','a\nx"y','a\n"x"y'])assert.throws(()=>api.parseCSV(value));
const source=fs.readFileSync('data/kanji_400_final.csv','utf8');
const questions=JSON.parse(JSON.stringify(api.parseQuestions(source)));
assert.equal(questions.length,400);
assert.throws(()=>api.parseQuestions(source.replace('りんごのき','りんごのもく')));
assert.throws(()=>api.parseQuestions(source.split('\n').slice(0,-2).join('\n')));
const byId=new Map(questions.map(q=>[q.id,q]));
assert.equal(byId.size,400);
const base='http://127.0.0.1:8000';
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 try{
  const context=await browser.newContext({hasTouch:true,viewport:{width:1024,height:768}});
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/index.html');
  assert(await page.locator('#start-quiz').isDisabled());
  await page.getByRole('button',{name:'木',exact:true}).click();
  assert(await page.locator('#start-quiz').isEnabled());
  await page.getByRole('button',{name:'花',exact:true}).click();
  await page.locator('#start-quiz').click();
  await page.locator('#question-panel').waitFor({state:'visible'});
  assert.match(page.url(),/quiz.html\?kanji=/);
  const seen=[];
  for(let index=0;index<10;index++){
   const word=await page.locator('#question-word').textContent();const id=Number(await page.locator('#question-panel').getAttribute('data-question-id'));seen.push(id);
   const q=byId.get(id);assert(q);assert(['木','花'].includes(q.target));
   const choices=page.locator('.answer-choice');assert.equal(await choices.count(),3);
   const labels=await choices.locator('span:not(.choice-number)').allTextContents();assert.deepEqual([...labels].sort(),[...q.choices].sort());
   assert.equal(await page.locator('#next-question').isVisible(),false);
   if(index===0){
    await page.screenshot({path:'/tmp/kanji-quiz-chromebook.png',fullPage:true});
    for(const choice of await choices.all()){
     const box=await choice.boundingBox();assert(box.height>=52);assert(box.y+box.height<=768);
     assert(await choice.evaluate(el=>parseFloat(getComputedStyle(el).fontSize))>=22);
    }
   }
   const expected=index%2===0?q.correct:q.choices.find(c=>c!==q.correct);
   const target=choices.filter({hasText:expected});
   // Exact labels avoid substrings such as こかげ / もくかげ.
   const button=page.getByRole('button',{name:expected,exact:true});
   await button.focus();
   // Verdict must be committed synchronously in the same click, before Next.
   const immediate=await button.evaluate(el=>{el.click();return {text:document.getElementById('answer-feedback').textContent, next:!document.getElementById('next-question').hidden};});
   assert(immediate.next);
   assert.match(immediate.text,index%2===0?/○ せいかい/:/× たしかめよう/);
   if(index===0)assert(await page.locator('#answer-feedback').evaluate(el=>el.closest('.question-box')!==null));
   await button.evaluate(el=>{el.click();el.click()});
   assert.equal(await page.locator('.answer-choice:disabled').count(),3);
   assert.match(await page.locator('#answer-feedback').textContent(),index%2===0?/せいかい/:new RegExp(q.correct));
   if(index===0){const next=await page.locator('#next-question').boundingBox();assert(next.y+next.height<=768);}
   await page.locator('#next-question').evaluate(el=>{el.click();el.click()});
  }
  assert.equal(new Set(seen).size,10);
  assert.equal(await page.locator('#result-score').textContent(),'5 / 10 もん せいかい');
  assert.equal(await page.locator('#answer-summary li').count(),10);
  await page.locator('#play-again').click();assert.equal(await page.locator('#question-number').textContent(),'1 / 10 もんめ');
  assert.equal(await page.locator('.answer-choice:enabled').count(),3);
  // One selected kanji gives five original questions twice.
  await page.goto(base+'/quiz.html?kanji='+encodeURIComponent('木'));
  const repeats=[];
  for(let i=0;i<10;i++){
   await page.locator('#question-panel').waitFor({state:'visible'});
   const id=Number(await page.locator('#question-panel').getAttribute('data-question-id'));const q=byId.get(id);assert.equal(q.target,'木');repeats.push(id);
   await page.getByRole('button',{name:q.correct,exact:true}).click();await page.locator('#next-question').click();
  }
  assert.equal(new Set(repeats).size,5);for(const word of new Set(repeats))assert.equal(repeats.filter(w=>w===word).length,2);
  assert.match(await page.locator('#result-score').textContent(),/^10/);
  await page.goto(base+'/quiz.html?kanji=');await page.locator('#load-message').waitFor({state:'visible'});assert.match(await page.locator('#load-message').textContent(),/えらんで/);
  await page.route('**/data/kanji_400_final.csv',route=>route.fulfill({status:500,body:'error'}));
  await page.goto(base+'/quiz.html?kanji='+encodeURIComponent('木花'));assert.match(await page.locator('#load-message').textContent(),/よみこめません/);
  await page.unroute('**/data/kanji_400_final.csv');await page.locator('#retry-load').click();await page.locator('#question-panel').waitFor({state:'visible'});
  await page.route('**/data/kanji_400_final.csv',route=>route.fulfill({status:200,body:'bad csv'}));
  await page.reload();assert.match(await page.locator('#load-message').textContent(),/おとなの方/);await page.unroute('**/data/kanji_400_final.csv');
  for(const [width,height]of [[1366,768],[768,1024],[320,740]]){
   await page.setViewportSize({width,height});await page.goto(base+'/quiz.html?kanji='+encodeURIComponent('木花'));await page.locator('#question-panel').waitFor({state:'visible'});
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  }
  // Quiz has no writes to reward or preparation storage.
  assert.equal(await page.evaluate(()=>localStorage.getItem('kanji-reading-game:rewards-demo:v1')),null);
  const denied=await browser.newContext();await denied.addInitScript(()=>Object.defineProperty(window,'localStorage',{get(){throw new DOMException('Denied','SecurityError')}}));
  const p=await denied.newPage();await p.goto(base+'/index.html');await p.getByRole('button',{name:'木',exact:true}).click();await p.locator('#start-quiz').click();await p.locator('#question-panel').waitFor({state:'visible'});
  await p.goto(base+'/quiz.html');await p.locator('#load-message').waitFor({state:'visible'});assert.match(await p.locator('#load-message').textContent(),/えらびなおして/);
  assert.deepEqual(errors,[]);
  console.log('PASS: CSV parser and 400 originals, selected targets, 10-question set, first-answer scoring, double-click safety, one-kanji repetition, restart, loading/error/retry, keyboard, storage denial, Chromebook touch sizing and mobile layout');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
