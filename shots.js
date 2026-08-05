const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const root=path.join(process.env.LOCALAPPDATA,'npm-cache','_npx');
let pw;for(const d of fs.readdirSync(root)){const c=path.join(root,d,'node_modules','playwright-core');if(fs.existsSync(c)){pw=require(c);break;}}
(async()=>{
  const prof=path.join(os.tmpdir(),'ds-funnel-shots');fs.rmSync(prof,{recursive:true,force:true});
  const ctx=await pw.chromium.launchPersistentContext(prof,{headless:true,
    executablePath:path.join(process.env.LOCALAPPDATA,'ms-playwright','chromium-1208','chrome-win64','chrome.exe'),
    viewport:{width:414,height:896},deviceScaleFactor:2});
  const page=await ctx.newPage();
  const errs=[];page.on('pageerror',e=>errs.push(e.message));
  page.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
  await page.goto('http://localhost:8090/',{waitUntil:'load'});
  await page.waitForTimeout(900);

  const out=path.join(__dirname,'shots');fs.mkdirSync(out,{recursive:true});
  const shot=n=>page.screenshot({path:path.join(out,n+'.png')});

  await shot('01-entry');
  const seen=[];
  for(let i=0;i<30;i++){
    const h=await page.evaluate(()=>{
      const q=document.querySelector('h2')||document.querySelector('h1');
      return q?q.textContent.trim():'';
    });
    if(h)seen.push(h);
    if(/You didn/i.test(h))await shot('03-reframe');
    if(/paying for 4 apps/i.test(h))await shot('02-proof');
    if(/Building your plan/i.test(h)){await shot('04-loading');break;}
    // click first option, else the footer CTA
    const opt=page.locator('.opt').first();
    if(await opt.count()){await opt.click({timeout:3000}).catch(()=>{});}
    const cta=page.locator('#cta');
    if(await cta.isVisible().catch(()=>false)&&!(await cta.isDisabled().catch(()=>true))){
      await cta.click({timeout:3000}).catch(()=>{});
    }
    await page.waitForTimeout(500);
  }
  await page.waitForURL(/results/,{timeout:20000}).catch(()=>{});
  await page.waitForTimeout(2500);
  await shot('05-results-top');
  await page.evaluate(()=>window.scrollTo(0,document.body.scrollHeight*0.42));
  await page.waitForTimeout(900);await shot('06-futurepace');
  await page.evaluate(()=>window.scrollTo(0,document.body.scrollHeight*0.62));
  await page.waitForTimeout(900);await shot('07-offer');
  console.log('screens seen:',seen.length);
  console.log(seen.map((s,i)=>`  ${i+1}. ${s.slice(0,64)}`).join('\n'));
  console.log('final url:',page.url());
  console.log('errors:',errs.length?errs.slice(0,5):'none');
  await ctx.close();
})().catch(e=>{console.error('FAILED',e.message);process.exit(1)});
