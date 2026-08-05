/* Prove the price copy is coherent for EVERY spend answer, not just the one the
 * screenshot happened to hit. This is the bug class that cost trust on the
 * paywall: "$0/mo ... is $324/year". */
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const root=path.join(process.env.LOCALAPPDATA,'npm-cache','_npx');
let pw;for(const d of fs.readdirSync(root)){const c=path.join(root,d,'node_modules','playwright-core');if(fs.existsSync(c)){pw=require(c);break;}}
const CASES=[
  {spend:'0',   apps:[],                    label:'pays nothing, 0 apps'},
  {spend:'u15', apps:['tracker'],           label:'under $15, 1 app'},
  {spend:'15-40',apps:['tracker','workout'],label:'$15-40, 2 apps'},
  {spend:'40+', apps:['tracker','workout','fasting','coach'],label:'$40+, 4 apps'},
];
(async()=>{
  const prof=path.join(os.tmpdir(),'ds-econ');fs.rmSync(prof,{recursive:true,force:true});
  const ctx=await pw.chromium.launchPersistentContext(prof,{headless:true,
    executablePath:path.join(process.env.LOCALAPPDATA,'ms-playwright','chromium-1208','chrome-win64','chrome.exe'),
    viewport:{width:414,height:896}});
  const page=await ctx.newPage();
  let fails=0;
  for(const c of CASES){
    await page.goto('http://localhost:8090/results.html?b=none',{waitUntil:'domcontentloaded'});
    await page.evaluate(a=>sessionStorage.setItem('dayspine.answers',JSON.stringify({branch:'none',answers:a})),
      {spend:c.spend,apps:c.apps,stopped:'logging',sixpm:'stare',bestshape:'3-5',feel:'tired'});
    await page.reload({waitUntil:'load'});await page.waitForTimeout(700);
    const t=await page.evaluate(()=>document.body.innerText);
    const problems=[];
    if(/\$0\/mo/.test(t)&&/\$\d+\/year/.test(t)&&!/average person/i.test(t))problems.push('claims $0/mo AND a yearly cost');
    if(/\b1 apps\b/.test(t))problems.push('"1 apps" grammar');
    if(/\$0\/mo forever/.test(t))problems.push('table says "$0/mo forever"');
    if(/\$undefined|NaN/.test(t))problems.push('undefined/NaN in copy');
    console.log(`${problems.length?'FAIL':'PASS'}  ${c.label}${problems.length?'  -> '+problems.join('; '):''}`);
    if(problems.length)fails++;
  }
  await ctx.close();
  console.log(`\n${CASES.length-fails}/${CASES.length} spend paths coherent`);
  process.exit(fails?1:0);
})().catch(e=>{console.error(e.message);process.exit(1)});
