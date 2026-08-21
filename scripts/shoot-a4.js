/* Walk A4 to the end and screenshot the new screens. */
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const root = path.join(process.env.LOCALAPPDATA, 'npm-cache', '_npx');
let pw; for (const d of fs.readdirSync(root)) {
  const c = path.join(root, d, 'node_modules', 'playwright-core');
  if (fs.existsSync(c)) { pw = require(c); break; }
}
const OUT = path.join(__dirname, '..', 'shots', 'a4');

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const prof = path.join(os.tmpdir(), 'ds-a4');
  fs.rmSync(prof, { recursive: true, force: true });
  const ctx = await pw.chromium.launchPersistentContext(prof, {
    headless: true,
    executablePath: path.join(process.env.LOCALAPPDATA, 'ms-playwright',
      'chromium-1208', 'chrome-win64', 'chrome.exe'),
    viewport: { width: 414, height: 896 }, deviceScaleFactor: 2,
  });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });

  await page.goto('http://localhost:8090/q.html?a=A4', { waitUntil: 'load' });
  await page.waitForTimeout(700);

  const shot = (n) => page.screenshot({ path: path.join(OUT, n + '.png'), fullPage: true });
  const vshot = (n) => page.screenshot({ path: path.join(OUT, n + '.png') }); // viewport only

  let hitReviews = false, hitBuild = false;
  for (let i = 0; i < 60; i++) {
    const state = await page.evaluate(() => ({
      h: (document.querySelector('h1,h2') || {}).textContent || '',
      reviews: !!document.querySelector('.rev-sum'),
      build: !!document.querySelector('.build'),
      reveal: !!document.querySelector('.pr-hero'),
      email: !!document.querySelector('#em'),
      cta: (document.getElementById('next') || {}).textContent || '',
    }));

    if (state.reviews && !hitReviews) {
      hitReviews = true;
      await shot('01-reviews-full'); await vshot('02-reviews-sticky');
    }
    if (state.build && !hitBuild) { hitBuild = true; await vshot('03-build');
      await page.waitForTimeout(9000); continue; }   // the build animation runs ~4.2s
    if (state.reveal) {
      await page.waitForTimeout(400);
      await shot('04-reveal-full'); await vshot('05-reveal-sticky');
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(300); await vshot('06-reveal-bottom');
      await page.click('#next'); await page.waitForTimeout(600);
      await vshot('07-email-after-reveal');
      break;
    }
    if (state.email && !state.reveal) {
      await page.fill('#em', 'test@example.com'); await page.waitForTimeout(200);
    }
    // answer: tap an option, a tile, or move a slider; else press the CTA
    const opt = page.locator('.opt').first();
    if (await opt.count()) { await opt.click(); await page.waitForTimeout(280); continue; }
    const btn = page.locator('#next');
    if (await btn.count() && await btn.isEnabled()) { await btn.click(); await page.waitForTimeout(320); }
    else { await page.waitForTimeout(500); }
  }

  console.log('reviews screen reached:', hitReviews);
  console.log('build screen reached  :', hitBuild);
  console.log('errors:', errs.length ? errs.slice(0, 6) : 'none');
  console.log('shots:', fs.readdirSync(OUT).join(', '));
  await ctx.close();
})();
