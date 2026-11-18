const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const env={window:{}};vm.runInNewContext(fs.readFileSync('js/questions.js','utf8'),env);
const qs=env.window.KanjiQuestions.parseQuestions(fs.readFileSync('data/kanji_400_final.csv','utf8'));
const byId=new Map(qs.map(q=>[q.id,q]));
const key='kanji-reading-prototype-v1';
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 try{
  const context=await browser.newContext({viewport:{width:1024,height:768},hasTouch:true});
  await context.addInitScript(()=>{const native=setTimeout;window.setTimeout=(fn,ms,...rest)=>native(fn,ms>500?40:ms,...rest)});
  const p=await context.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));
  async function read(){return p.evaluate(()=>GameStore.read().users['1-1']);}
  async function seed(count,teacher=false){
   await p.goto('http://127.0.0.1:8000/'+(teacher?'?teacher-test=1':''));await p.waitForSelector('.title-start');
   await p.evaluate(({key,count})=>{const u=GameStore.freshProfile();u.selected=['木'];for(let i=0;i<count/3;i++)u.cardCounts[REWARD_CARDS[i].id]=3;localStorage.setItem(key,JSON.stringify({active:'1-1',users:{'1-1':u}}));},{key,count});
   await p.reload();await p.locator('.title-start').click();await p.waitForSelector('.kanji');
   assert.equal(await p.locator('#kana-unlock-status').count(),0);
  }
  async function enter(value){await p.evaluate(value=>{
   const voiced={が:'か',ぎ:'き',ぐ:'く',げ:'け',ご:'こ',ざ:'さ',じ:'し',ず:'す',ぜ:'せ',ぞ:'そ',だ:'た',ぢ:'ち',づ:'つ',で:'て',ど:'と',ば:'は',び:'ひ',ぶ:'ふ',べ:'へ',ぼ:'ほ'};
   const semi={ぱ:'は',ぴ:'ひ',ぷ:'ふ',ぺ:'へ',ぽ:'ほ'},small={ぁ:'あ',ぃ:'い',ぅ:'う',ぇ:'え',ぉ:'お',ゃ:'や',ゅ:'ゆ',ょ:'よ',っ:'つ'};
   kanaKey('clear');for(const ch of value.normalize('NFKC').replace(/[ァ-ヶ]/g,c=>String.fromCharCode(c.charCodeAt(0)-96))){if(voiced[ch]){kanaKey(voiced[ch]);kanaKey('dakuten')}else if(semi[ch]){kanaKey(semi[ch]);kanaKey('handakuten')}else if(small[ch]){kanaKey(small[ch]);kanaKey('small')}else kanaKey(ch);}
  },value);}
  for(const [cards,score,award,fail,firstOnly]of [[0,20,2,false],[60,19,1,false],[0,10,1,false],[60,9,0,false],[0,0,0,false],[0,20,2,true],[0,19,1,false,true]]){
   await seed(cards);await p.getByRole('button',{name:'ちょうせんを はじめる',exact:true}).click();
   for(let n=0;n<20;n++){
    await p.waitForFunction(n=>document.querySelector('.question-toolbar strong')?.textContent.endsWith(`${n+1} / 20`)&&!document.querySelector('.feedback')?.textContent,n);
    const id=Number(await p.locator('.play-card').getAttribute('data-question-id'));const q=byId.get(id);
    assert.equal(await p.locator('.kana-keyboard').count(),n>=10?1:0,`cards=${cards}, question=${n+1}`);
    if(n<10){await p.evaluate(()=>kanaKey('あ'));assert.equal(await p.locator('#kana-answer').count(),0);}
    else {assert.equal(await p.locator('.choice').count(),0);assert.equal(await p.locator('.question ruby').count(),0);await p.evaluate(()=>answer(0));assert.equal(await p.locator('.feedback').textContent(),'');}
    if(n===19&&fail)await p.evaluate(()=>{window.nativeSet=Storage.prototype.setItem;Storage.prototype.setItem=()=>{throw new DOMException('Full','QuotaExceededError')}});
    const correct=firstOnly?n!==0:n<score;
    if(n<10)await p.locator('.choice').filter({hasText:new RegExp('^'+(correct?q.correct:q.choices.find(x=>x!==q.correct))+'$')}).click();
    else {await enter(correct?q.correct:'あ');assert(!(await p.locator('#kana-submit').isDisabled()));await p.locator('#kana-submit').click();}
    if(n<19)assert.equal((await read()).log.length,0);
   }
   await p.getByRole('heading',{name:'けっか はっぴょう！'}).waitFor();
   if(fail){assert.equal((await read()).log.length,0);await p.evaluate(()=>{Storage.prototype.setItem=window.nativeSet});await p.getByRole('button',{name:'もういちど ほぞんする',exact:true}).click();await p.waitForFunction(()=>GameStore.read().users['1-1'].log.length===1);await p.evaluate(()=>retryCommit());}
   const u=await read();assert.equal(u.log.length,1);assert.equal(u.log[0].score,score);assert.equal(u.stars,award);assert(u.lastHomework);
   if(score===19){await p.getByRole('button',{name:'まちがえた もんだいを ふくしゅう'}).click();assert.equal(await p.locator('.kana-keyboard').count(),firstOnly?0:1);const id=Number(await p.locator('.play-card').getAttribute('data-question-id'));if(firstOnly)await p.locator('.choice').filter({hasText:new RegExp('^'+byId.get(id).correct+'$')}).click();else {await enter(byId.get(id).correct);await p.locator('#kana-submit').click();}await p.getByRole('heading',{name:'ふくしゅう おしまい！'}).waitFor();assert.equal((await read()).stars,award);}
  }
  for(const mode of ['practice','free']){await seed(60);await p.evaluate(mode=>begin(mode),mode);assert.equal(await p.locator('.kana-keyboard').count(),0);assert.equal(await p.locator('.choice').count(),3);}
  await seed(0,true);await p.getByRole('button',{name:'50音入力をテストする',exact:true}).click();assert.equal(await p.locator('.kana-keyboard').count(),1);assert.equal((await read()).log.length,0);
  assert.deepEqual(errors,[]);console.log('PASS: cards 0/60 both 10-choice + 10-keyboard; mode guards, review, 0/9/10/19/20 scores, final-save failure/exact-once retry, other modes and teacher test');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
