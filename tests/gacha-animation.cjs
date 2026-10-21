const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 try{
 const page=await browser.newPage({viewport:{width:1280,height:1100},reducedMotion:'no-preference'});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{crypto.getRandomValues=a=>{a.fill(0);return a;}});
 await page.goto('http://127.0.0.1:8000/gacha.html');
 await page.evaluate(()=>localStorage.setItem('kanji-reading-game:rewards-demo:v1',JSON.stringify({version:1,stars:3,counts:{'001':1}})));
 await page.reload();
 const handle=page.locator('#machine-handle');
 await handle.click();
 assert(await handle.isDisabled());assert(await page.locator('#draw-card').isDisabled());
 assert.equal(await page.locator('.summon-panel').getAttribute('data-stage'),'turn');
 assert.equal(await page.locator('#draw-result img').count(),0);
 assert.notEqual(await page.locator('.handle-bar').evaluate(el=>getComputedStyle(el).animationName),'none');
 await page.waitForFunction(()=>document.querySelector('.summon-panel').dataset.stage==='drop');
 await page.waitForFunction(()=>Number(getComputedStyle(document.querySelector('.prize-capsule')).opacity) > .5);
 assert.equal(await page.locator('#draw-result img').count(),0);
 await page.waitForFunction(()=>document.querySelector('.summon-panel').dataset.stage==='open');
 assert.equal(await page.locator('#draw-result img').count(),0);
 await page.waitForFunction(()=>document.querySelector('.summon-panel').dataset.stage==='revealed');
 assert.equal(await page.locator('#draw-result .gold').count(),1);
 assert.equal(await page.locator('#draw-result .foil-sparkles i').count(),8);
 assert.equal(await page.locator('#star-count').textContent(),'2');
 await page.locator('#draw-result img').evaluate(el=>el.decode());
 await page.screenshot({path:'/tmp/gacha-machine-gold.png',fullPage:true});
 await page.locator('#draw-card').click();
 await page.waitForFunction(()=>document.querySelector('.summon-panel').dataset.stage==='revealed');
 assert.equal(await page.locator('#draw-result .rainbow').count(),1);
 await page.goto('http://127.0.0.1:8000/collection.html');
 await page.locator('#owned-only').check();
 await page.screenshot({path:'/tmp/foil-strong.png',fullPage:true});
 for(const tier of ['gold','rainbow']){
  assert.equal(await page.locator(`.card-art.${tier}`).evaluate(el=>getComputedStyle(el,'::before').mixBlendMode),'color');
  assert.equal(await page.locator(`.card-art.${tier} .foil-sparkles i`).count(),8);
 }
 await page.setViewportSize({width:320,height:740});
 await page.goto('http://127.0.0.1:8000/gacha.html');
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.screenshot({path:'/tmp/gacha-machine-mobile.png',fullPage:true});
 await page.emulateMedia({reducedMotion:'reduce'});await handle.click();
 await page.waitForFunction(()=>!document.querySelector('.summon-panel').classList.contains('is-drawing'));
 assert.equal(await page.locator('.handle-bar').evaluate(el=>getComputedStyle(el).animationName),'none');
 assert.deepEqual(errors,[]);
 console.log('PASS: handle turn → capsule drop → opening → delayed card reveal; single spend, both controls locked, strong foil/sparkles, mobile width and reduced motion');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
