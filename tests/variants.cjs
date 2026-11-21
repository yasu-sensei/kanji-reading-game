const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 try {
 const context=await browser.newContext({viewport:{width:1024,height:768},hasTouch:true,reducedMotion:'reduce'});
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8000/gacha.html');
 await page.evaluate(()=>{
  const profile={selected:['木'],stars:5,practice:2,history:{},lastHomework:'',log:[],collection:[],cardCounts:{}};
  const counts=Object.fromEntries(window.REWARD_CARDS.map(c=>[c.id,4]));counts['005']=3;
  localStorage.setItem('kanji-reading-prototype-v1',JSON.stringify({active:'1-1',users:{'1-1':{...profile,cardCounts:counts},'1-2':{...profile,cardCounts:{'001':3}}}}));
 });
 await page.reload();await page.locator('#draw-card').click();
 await page.waitForFunction(()=>document.querySelector('.summon-panel').dataset.stage==='revealed');
 assert.match(await page.locator('#draw-result img').getAttribute('src'),/005_ギアウル_氷結亜種/);
 await page.locator('#draw-result img').evaluate(img=>img.decode());
 assert(await page.locator('#draw-card').isDisabled());
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('kanji-reading-prototype-v1')));
 assert.equal(saved.users['1-1'].stars,4);assert.equal(saved.users['1-1'].practice,2);assert.deepEqual(saved.users['1-1'].selected,['木']);
 assert.equal(saved.users['1-1'].cardCounts['005'],4);assert.equal(saved.users['1-2'].cardCounts['001'],3);
 await page.goto('http://127.0.0.1:8000/collection.html');
 assert.equal(await page.locator('#collection-count').textContent(),'132');
 await page.locator('[data-filter=variant]').click();assert.equal(await page.locator('.album-entry').count(),33);
 await page.locator('[data-card-id="005"] button').click();assert.match(await page.locator('#detail-name').textContent(),/氷結亜種/);
 await page.keyboard.press('Escape');await page.reload();assert.equal(await page.locator('#collection-count').textContent(),'132');
 // Existing three-copy saves restore without awarding or removing anything.
 await page.evaluate(()=>{const k='kanji-reading-prototype-v1',d=JSON.parse(localStorage.getItem(k));d.active='1-2';localStorage.setItem(k,JSON.stringify(d));});
 await page.reload();assert.equal(await page.locator('#collection-count').textContent(),'3');
 await page.locator('[data-filter=variant]').click();assert.equal(await page.locator('.album-card-button:enabled').count(),0);
 await page.goto('http://127.0.0.1:8000/gacha.html');
 await page.evaluate(()=>{Storage.prototype.setItem=()=>{throw new DOMException('Full','QuotaExceededError');};});
 await page.locator('#draw-card').click();assert.equal(await page.locator('#star-count').textContent(),'5');
 await page.waitForFunction(()=>document.querySelector('#storage-message').textContent.includes('ほぞんできなかった'));
 assert.deepEqual(errors,[]);
 // GAS file must embed both old and new artwork, and display all fourth-tier images offline.
 await page.route('**/gas-test.html', route=>route.fulfill({contentType:'text/html',body:require('node:fs').readFileSync('/workspace/kanji-gas-export/Game.html','utf8')}));
 await page.goto('http://127.0.0.1:8000/gas-test.html#collection');
 const embedded=await page.evaluate(()=>window.REWARD_CARDS.every(c=>c.image.startsWith('data:image/jpeg;base64,')&&c.variantImage.startsWith('data:image/jpeg;base64,')));
 assert(embedded);
 await page.evaluate(async()=>{for(const c of window.REWARD_CARDS){const img=new Image();img.src=c.variantImage;await img.decode();}});
 console.log('PASS: integrated fourth copy, 132 completion, legacy saves, profile isolation, save failure, Chromebook viewport, GAS 33 embedded variants');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
