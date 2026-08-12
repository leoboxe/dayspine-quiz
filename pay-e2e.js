/**
 * End-to-end proof that the checkout takes money.
 *
 * Served locally on purpose: this must be verifiable without GitHub Pages,
 * which has been stuck "building" for hours and is exactly the dependency a
 * payment test should not have. The Stripe calls are real (test mode) — a real
 * PaymentIntent, a real charge, a real webhook delivery.
 *
 * Run:  node serve.js &   then   node pay-e2e.js
 */
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

function playwright() {
  const root = path.join(process.env.LOCALAPPDATA, 'npm-cache', '_npx');
  for (const d of fs.readdirSync(root)) {
    const c = path.join(root, d, 'node_modules', 'playwright-core');
    if (fs.existsSync(c)) return require(c);
  }
  return require('playwright-core');
}
function chromium() {
  const base = path.join(process.env.LOCALAPPDATA, 'ms-playwright');
  for (const d of fs.readdirSync(base).filter((x) => x.startsWith('chromium-')).sort().reverse()) {
    const exe = path.join(base, d, 'chrome-win64', 'chrome.exe');
    if (fs.existsSync(exe)) return exe;
  }
}

const results = [];
const ck = (name, ok, detail = '') => {
  results.push(ok);
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
};

const BASE = process.env.FUNNEL_URL || 'http://localhost:8090';

(async () => {
  const prof = path.join(os.tmpdir(), 'ds-pay-e2e');
  fs.rmSync(prof, { recursive: true, force: true });
  const ctx = await playwright().chromium.launchPersistentContext(prof, {
    headless: true,
    executablePath: chromium(),
    viewport: { width: 414, height: 1000 },
  });
  const page = await ctx.newPage();

  page.on('response', async (r) => {
    if (/create-checkout/.test(r.url())) {
      console.log('    create-checkout ->', r.status(), (await r.text().catch(() => '')).slice(0, 160));
    }
  });

  await page.goto(`${BASE}/checkout.html`, { waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(5000);

  const before = await page.locator('#total').textContent();
  await page.locator('#bump').check();
  await page.waitForTimeout(900);
  const after = await page.locator('#total').textContent();
  ck('bump re-prices the order and the wallet total', before === '$49.00' && after === '$58.00', `${before} -> ${after}`);

  const stripeFrames = page.frames().filter((f) => /js\.stripe\.com/.test(f.url()));
  ck('Payment Element mounts — the Apple/Google Pay surface', stripeFrames.length > 0, `${stripeFrames.length} frames`);

  const email = `e2e-${Date.now()}@example.com`;
  await page.fill('#email', email);

  // Every field the Element renders, filled where it actually lives. Blind
  // keyboard typing does not reliably tab between them in the tabs layout.
  const values = { number: '4242424242424242', expiry: '12 / 34', cvc: '123', postalCode: '12345' };
  const filled = [];
  for (const frame of page.frames()) {
    for (const [name, value] of Object.entries(values)) {
      if (filled.includes(name)) continue;
      const el = frame.locator(`[name="${name}"]`).first();
      if (await el.count().catch(() => 0)) {
        await el.fill(value).catch(() => {});
        filled.push(name);
      }
    }
  }
  ck('card details entered', filled.includes('number') && filled.includes('expiry') && filled.includes('cvc'), filled.join(','));

  /* `requestSubmit()`, not `.click()`. A headless click on a submit button does
     not always produce the form's submit event — the handler simply never runs
     and the page sits there looking fine, which cost an hour of chasing a bug
     that was in this file rather than in the checkout. A real user's click
     works; the automation needs to ask explicitly. */
  await page.evaluate(() => document.getElementById('pay').requestSubmit());
  for (let i = 0; i < 12; i++) {
    await page.waitForTimeout(2000);
    // Guarded: once the charge succeeds the page navigates and these elements
    // no longer exist. Reading them blind turns a SUCCESS into a crash.
    const state = await page.evaluate(() => ({
      btn: (document.getElementById('submit')?.textContent || '').trim(),
      err: (document.getElementById('payErr')?.textContent || '').trim(),
      url: location.pathname,
    }));
    console.log(`    t+${(i + 1) * 2}s  btn="${state.btn}"  err="${state.err}"`);
    if (/upsell/.test(state.url)) break;
  }

  const err = ((await page.locator('#payErr').textContent().catch(() => '')) || '').trim();
  ck('checkout -> upsell after a REAL charge', /upsell/.test(page.url()), err || page.url().split('/').pop());

  /* The one-click upsell, against the card this order just saved. */
  if (/upsell/.test(page.url())) {
    await page.locator('#yes').click().catch(() => {});
    await page.waitForTimeout(800);
    await page.fill('#seatEmail', `partner-${Date.now()}@example.com`).catch(() => {});
    await page.locator('#confirmSeat').click().catch(() => {});
    await page.waitForURL(/install/, { timeout: 45000 }).catch(() => {});
    ck('one-click upsell charges the saved card', /install/.test(page.url()), page.url().split('/').pop());
  }

  fs.writeFileSync(path.join(__dirname, '.last-e2e-email'), email);
  await page.screenshot({ path: path.join(os.tmpdir(), 'dayspine-checkout.png'), fullPage: true });
  await ctx.close();

  const failed = results.filter((r) => !r).length;
  console.log(`\n${results.length - failed}/${results.length} checks passed`);
  process.exit(failed ? 1 : 0);
})().catch((e) => {
  console.error('crashed:', e.message);
  process.exit(1);
});
