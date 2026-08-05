/* Walk the ENTIRE funnel as a buyer would: quiz -> results -> checkout (+bump)
 * -> upsell -> downsell -> install. Asserts each handoff, because a funnel that
 * breaks at step 4 still passes any test that only checks step 1. */
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const root=path.join(process.env.LOCALAPPDATA,'npm-cache','_npx');
let pw;for(const d of fs.readdirSync(root)){const c=path.join(root,d,'node_modules','playwright-core');if(fs.existsSync(c)){pw=require(c);break;}}
const R=[];const ck=(n,ok,d='')=>{R.push(ok);console.log(`${ok?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`)};
(async()=>{
  const prof=path.join(os.tmpdir(),'ds-flow');fs.rmSync(prof,{recursive:true,force:true});
  const ctx=await pw.chromium.launchPersistentContext(prof,{headless:true,
    executablePath:path.join(process.env.LOCALAPPDATA,'ms-playwright','chromium-1208','chrome-win64','chrome.exe'),
    viewport:{width:414,height:896},deviceScaleFactor:2,
    userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'});
  const page=await ctx.newPage();
  const errs=[];page.on('pageerror',e=>errs.push(e.message));
  const out=path.join(__dirname,'shots');fs.mkdirSync(out,{recursive:true});

  await page.goto('http://localhost:8090/',{waitUntil:'load'});
  await page.waitForTimeout(800);
  for(let i=0;i<26;i++){
    const h=await page.evaluate(()=>{const q=document.querySelector('h2')||document.querySelector('h1');return q?q.textContent.trim():''});
    if(/Building your plan/i.test(h))break;
    const o=page.locator('.opt').first();
    if(await o.count())await o.click({timeout:3000}).catch(()=>{});
    const c=page.locator('#cta');
    if(await c.isVisible().catch(()=>0)&&!(await c.isDisabled().catch(()=>1)))await c.click({timeout:3000}).catch(()=>{});
    await page.waitForTimeout(430);
  }
  await page.waitForURL(/results/,{timeout:25000}).catch(()=>{});
  ck('quiz -> results',/results/.test(page.url()),page.url().split('/').pop());
  await page.waitForTimeout(1800);

  await page.locator('#buy').click({timeout:8000}).catch(()=>{});
  await page.waitForURL(/checkout/,{timeout:15000}).catch(()=>{});
  const okCheckout = /checkout/.test(page.url()) && await page.locator('#total').count()>0;
  ck('results -> checkout',okCheckout,okCheckout?'':'page did not render (404?)');

  const t0=await page.locator('#total').textContent().catch(()=>'');
  await page.locator('#bump').check({timeout:5000}).catch(()=>{});
  await page.waitForTimeout(300);
  const t1=await page.locator('#total').textContent().catch(()=>'');
  ck('order bump updates the total',t0==='$79.00'&&t1==='$98.00',`${t0} -> ${t1}`);
  await page.screenshot({path:path.join(out,'08-checkout.png')});

  await page.fill('#email','leo@example.com');
  await page.fill('#name','Leo B');
  await page.fill('#card','4242 4242 4242 4242');
  await page.locator('#submit').click({timeout:5000}).catch(()=>{});
  await page.waitForURL(/upsell/,{timeout:15000}).catch(()=>{});
  ck('checkout -> upsell',/upsell/.test(page.url()));
  await page.screenshot({path:path.join(out,'09-upsell.png')});

  await page.locator('#no').click({timeout:5000}).catch(()=>{});
  await page.waitForURL(/downsell/,{timeout:15000}).catch(()=>{});
  ck('decline -> downsell',/downsell/.test(page.url()));
  await page.screenshot({path:path.join(out,'10-downsell.png')});

  await page.locator('#no').click({timeout:5000}).catch(()=>{});
  await page.waitForURL(/install/,{timeout:15000}).catch(()=>{});
  ck('downsell -> install',/install/.test(page.url()));
  await page.waitForTimeout(700);
  const txt=await page.evaluate(()=>document.body.innerText);
  ck('iOS instructions shown',/Add to Home Screen/i.test(txt));
  await page.screenshot({path:path.join(out,'11-install.png')});

  ck('no page errors',errs.length===0,errs[0]||'');
  await ctx.close();
  const bad=R.filter(x=>!x).length;
  console.log(`\n${R.length-bad}/${R.length} funnel steps passed`);
  process.exit(bad?1:0);
})().catch(e=>{console.error('FAILED',e.message);process.exit(1)});
