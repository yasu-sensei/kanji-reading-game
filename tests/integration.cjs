const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');const vm=require('node:vm');
const sandbox={window:{}};vm.runInNewContext(fs.readFileSync('js/questions.js','utf8'),sandbox);
const questions=JSON.parse(JSON.stringify(sandbox.window.KanjiQuestions.parseQuestions(fs.readFileSync('data/kanji_400_final.csv','utf8'))));
const byId=new Map(questions.map(q=>[q.id,q]));const key='kanji-reading-prototype-v1';
(async()=>{
 const b=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 try{
 const ctx=await b.newContext({viewport:{width:1024,height:768},hasTouch:true,reducedMotion:'reduce'});
 await ctx.addInitScript(()=>{const native=window.setTimeout;window.setTimeout=(fn,ms,...args)=>native(fn,ms>500?40:ms,...args);crypto.getRandomValues=a=>{a.fill(0);return a;};});
 const p=await ctx.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));
 async function state(){return p.evaluate(key=>JSON.parse(localStorage.getItem(key)),key)}
 async function login(cls,num){await p.waitForFunction(()=>document.querySelector('#cls')||document.querySelector('.title-start'));if(await p.locator('.title-start').count())await p.locator('.title-start').click();await p.locator('#cls').selectOption(String(cls));await p.locator('#num').selectOption(String(num));await p.getByRole('button',{name:'はじめる',exact:true}).click();await p.locator('.kanji').first().waitFor();}
 async function answerSet(mode,correctCount=10){
  await p.getByRole('button',{name:mode==='homework'?'ちょうせんを はじめる':mode==='practice'?'しゅぎょうを はじめる':'むげんれんしゅうを はじめる',exact:true}).click();
  const total=mode==='homework'?20:10;
  for(let n=0;n<total;n++){
   await p.waitForFunction(({n,total})=>document.querySelector('.question-toolbar strong')?.textContent.trim().endsWith(`${n+1} / ${total}`),{n,total});
   const id=Number(await p.locator('.play-card').getAttribute('data-question-id'));const q=byId.get(id);assert.equal(q.target,'木');
   const reading=n<correctCount?q.correct:q.choices.find(x=>x!==q.correct);
   const immediate=await p.evaluate(async ({reading,key})=>{const choices=[...document.querySelectorAll('.choice')];const index=choices.findIndex(el=>el.textContent===reading);const promise=window.answer(index);const verdict=document.querySelector('.feedback').textContent;await promise;return {verdict,data:JSON.parse(localStorage.getItem(key)),play:!!document.querySelector('.play-card')};},{reading,key});
   assert.match(immediate.verdict,n<correctCount?/○/:/×/);
   if(n===total-1){assert.equal(immediate.data.users['1-1'].log.at(-1).score,correctCount);assert(immediate.play,'record is committed while question ten feedback is still displayed');}
  }
  await p.getByRole('heading',{name:'けっか はっぴょう！'}).waitFor();
 }
 await p.goto('http://127.0.0.1:8000/');await login(1,1);
 assert.equal((await state()).users['1-1'].stars,4);
 const order=await p.locator('.kanji').allTextContents();assert.deepEqual(order,[...new Set(questions.map(q=>q.target))]);
 await p.getByRole('button',{name:'木',exact:true}).click();await p.waitForFunction(()=>document.querySelector('[aria-label="木"]').getAttribute('aria-pressed')==='true');
 await answerSet('homework',20);
 assert.equal((await state()).users['1-1'].stars,6);assert.equal((await state()).users['1-1'].log.length,1);
 // Re-saving the same completion never duplicates stars or records.
 await p.evaluate(()=>window.retryCommit());assert.equal((await state()).users['1-1'].stars,6);
 await p.getByRole('button',{name:'🎁 ガチャ',exact:true}).click();await p.locator('#machine-handle').waitFor();
 assert.equal(await p.locator('#star-count').textContent(),'6');assert(await p.locator('#add-demo-stars').isHidden());
 await p.locator('#draw-card').evaluate(el=>{el.click();el.click()});await p.waitForFunction(()=>document.querySelector('.summon-panel').dataset.stage==='revealed');
 assert.equal((await state()).users['1-1'].stars,5);assert.equal((await state()).users['1-1'].cardCounts['001'],1);
 await p.getByRole('link',{name:'ずかん',exact:true}).click();assert.equal(await p.locator('#collection-count').textContent(),'1');
 await p.getByRole('link',{name:'かんじ',exact:true}).click();await p.getByRole('button',{name:'✓ きょうの ちょうせんは おわったよ'}).waitFor();assert(await p.getByRole('button',{name:'✓ きょうの ちょうせんは おわったよ'}).isDisabled());
 // Five completed practice sets award one star; quitting an incomplete set does not count.
 for(let n=0;n<5;n++){await answerSet('practice',10);assert((await p.locator('.card.stack').innerText()).includes('しろ☆ 1こ もらったよ！'));if(n===4)assert((await p.locator('.card.stack').innerText()).includes('きん☆ 1こに かえたよ！'));assert.equal((await state()).users['1-1'].practice,(n+1)%5);await p.getByRole('button',{name:'かんじを えらぶ がめんへ',exact:true}).click();}
 assert.equal((await state()).users['1-1'].practice,0);assert.equal((await state()).users['1-1'].stars,6);
 const finished=p.getByRole('button',{name:'✓ きょうの しゅぎょうは おわったよ',exact:true});assert(await finished.isDisabled());
 await p.reload();assert(await finished.isDisabled());await p.evaluate(()=>begin('practice'));assert.equal(await p.locator('.play-card').count(),0);
 // Move recorded completions to yesterday: the daily allowance resets, cumulative stars remain.
 await p.evaluate(key=>{const d=JSON.parse(localStorage.getItem(key));for(const log of d.users['1-1'].log)log.date=new Date(Date.now()-86400000).toISOString();localStorage.setItem(key,JSON.stringify(d));},key);await p.reload();
 await p.getByRole('button',{name:'しゅぎょうを はじめる',exact:true}).click();p.once('dialog',d=>d.accept());await p.getByRole('button',{name:'やめる',exact:true}).click();assert.equal((await state()).users['1-1'].log.length,6);
 // A second profile sees neither the first child's selected kanji, stars, nor cards.
 await p.getByRole('button',{name:'とうろく きりかえ'}).click();await login(1,2);assert.equal(await p.locator('.kanji[aria-pressed="true"]').count(),0);
 await p.getByRole('button',{name:'📖 ずかん'}).click();assert.equal(await p.locator('#collection-count').textContent(),'0');
 await p.goto('http://127.0.0.1:8000/gacha.html');assert.equal(await p.locator('#star-count').textContent(),'4');assert(!(await p.locator('#draw-card').isDisabled()));
 await p.goto('http://127.0.0.1:8000/');await p.getByRole('button',{name:'とうろく きりかえ'}).click();await login(1,1);assert.equal(await p.locator('.kanji[aria-pressed="true"]').count(),1);
 // Review never grants extra stars, and stops after at most two rounds.
 await answerSet('practice',8);const stars=(await state()).users['1-1'].stars;const logs=(await state()).users['1-1'].log.length;
 await p.getByRole('button',{name:'まちがえた もんだいを ふくしゅう'}).click();let reviews=0;
 while(await p.locator('.play-card').count()){
  const id=Number(await p.locator('.play-card').getAttribute('data-question-id'));const q=byId.get(id);
  await p.evaluate(reading=>{const index=[...document.querySelectorAll('.choice')].findIndex(el=>el.textContent===reading);window.reviewAnswer(index);},q.choices.find(x=>x!==q.correct));reviews++;await p.waitForTimeout(60);assert(reviews<=4);
 }
 assert.equal((await state()).users['1-1'].stars,stars);assert.equal((await state()).users['1-1'].log.length,logs);
 await p.getByRole('heading',{name:'ふくしゅう おしまい！'}).waitFor();
 // Unlimited mode remains available beyond five sets after training's daily cap, without stars.
 await p.evaluate(()=>nav('select'));const unlimitedBefore=(await state()).users['1-1'];
 for(let n=0;n<6;n++){await answerSet('free',10);assert((await p.locator('.card.stack').innerText()).includes('☆は ふえないよ'));await p.getByRole('button',{name:'かんじを えらぶ がめんへ',exact:true}).click();}
 const unlimitedAfter=(await state()).users['1-1'];assert.equal(unlimitedAfter.stars,unlimitedBefore.stars);assert.equal(unlimitedAfter.practice,unlimitedBefore.practice);assert.equal(unlimitedAfter.lastHomework,unlimitedBefore.lastHomework);assert.equal(unlimitedAfter.log.length,unlimitedBefore.log.length+6);
 // A failing write never consumes a star or grants a card.
 await p.goto('http://127.0.0.1:8000/gacha.html');const before=await state();
 await p.evaluate(()=>{Storage.prototype.setItem=()=>{throw new DOMException('Full','QuotaExceededError')}});
 await p.locator('#draw-card').click();await p.waitForFunction(()=>document.querySelector('#storage-message').textContent.includes('ほぞんできなかった'));
 assert.deepEqual(await state(),before);
 assert.deepEqual(errors,[]);
 console.log('PASS: profile registration/isolation, CSV questions, immediate verdict, tenth-answer commit, homework limits, practice stars, quit, review limit, earned stars → gacha → personal album, double-click and write failure');
 }finally{await b.close()}
})().catch(e=>{console.error(e);process.exit(1)});
