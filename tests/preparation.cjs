const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium',args:['--no-sandbox']});
 const context=await browser.newContext(); const page=await context.newPage();
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8000/');
 const buttons=page.locator('.kanji'); assert.equal(await buttons.count(),80);
 const chars=await buttons.allTextContents(); assert.equal(new Set(chars).size,80);
 const expected=Array.from('一二三四五六七八九十百千上下左右中大小月日年早木林山川土空田天生花草虫犬人名女男子目耳口手足見音力気円入出立休先夕本正文字学校村町森水火玉王石竹糸貝車金雨赤青白');
 assert.deepEqual([...chars].sort(),expected.sort());
 const one=page.getByRole('button',{name:'一',exact:true});
 await one.click();assert.equal(await one.getAttribute('aria-pressed'),'true');
 await page.reload();assert.equal(await one.getAttribute('aria-pressed'),'true');
 await one.focus();await page.keyboard.press('Space');assert.equal(await one.getAttribute('aria-pressed'),'false');
 await page.reload();assert.equal(await one.getAttribute('aria-pressed'),'false');
 for(let i=0;i<80;i++) await buttons.nth(i).click();
 assert.equal(await page.locator('[aria-pressed="true"]').count(),80);
 await page.reload();assert.equal(await page.locator('[aria-pressed="true"]').count(),80);
 for(let i=0;i<80;i++) await buttons.nth(i).click();
 await page.reload();assert.equal(await page.locator('[aria-pressed="true"]').count(),0);
 for(const value of ['{broken','{}','["一","一","外",null,12]']){
  await page.evaluate(value=>localStorage.setItem('kanji-reading-game:selected-kanji:v1',value),value);
  await page.reload();assert.equal(await buttons.count(),80);
  assert.equal(await page.locator('[aria-pressed="true"]').count(),value.startsWith('[')?1:0);
 }
 await page.setViewportSize({width:320,height:740});
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 const blocked=await browser.newContext();
 await blocked.addInitScript(()=>{Object.defineProperty(window,'localStorage',{get(){throw new DOMException('Denied','SecurityError')}})});
 const p=await blocked.newPage();await p.goto('http://127.0.0.1:8000/');
 await p.getByRole('button',{name:'一',exact:true}).click();
 assert.equal(await p.locator('[aria-pressed="true"]').count(),1);
 assert.match(await p.locator('#save-status').textContent(),/ほぞんできなかった/);
 assert.deepEqual(errors,[]);
 console.log('PASS: exact 80 kanji, toggle, keyboard, reload, all/none, malformed storage, 320px layout, denied storage; no page errors');
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
