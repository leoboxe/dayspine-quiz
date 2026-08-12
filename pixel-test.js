/**
 * Does the Meta pixel actually fire?
 *
 * Every `fbq(...)` in this funnel was guarded by `if (window.fbq)` and the base
 * code was never installed — so the calls were correctly named, correctly
 * placed, and silently did nothing for weeks. That is the failure this test
 * exists to make impossible: it watches the NETWORK, not the code.
 *
 * A request to `facebook.com/tr` with the right `ev=` is the only proof that an
 * event left the browser.
 *
 * ⚠️ **RUNS HEADED, AND MUST.** Meta's pixel downloads its config in headless
 * Chromium and then transmits nothing — almost certainly bot suppression. Run
 * headless, this test reports a perfectly working pixel as completely dead, and
 * it did: it produced a confident, wrong diagnosis that the dataset refused
 * browser events. The window is positioned offscreen so nothing flashes.
 *
 * The same trap makes an *unconfigured* pixel id look like a working control —
 * with no config it falls back to the image beacon, which is not suppressed. So
 * "a different id fired, ours didn't" proves nothing at all.
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

const BASE = process.env.FUNNEL_URL || 'https://quiz.dayspine.com';

(async () => {
  const prof = path.join(os.tmpdir(), 'ds-pixel');
  fs.rmSync(prof, { recursive: true, force: true });
  const ctx = await playwright().chromium.launchPersistentContext(prof, {
    headless: false,
    executablePath: chromium(),
    viewport: { width: 414, height: 1000 },
    args: ['--window-position=-2400,-2400'],
  });
  const page = await ctx.newPage();

  /** Every event Meta actually received, with its dataset id. */
  const fired = [];
  page.on('request', (r) => {
    const u = r.url();
    if (/facebook\.com\/tr/.test(u)) {
      const q = new URL(u).searchParams;
      fired.push({ ev: q.get('ev'), id: q.get('id'), eid: q.get('eid') });
    }
  });

  // Arrive the way a buyer from an ad does: with an fbclid.
  // paywall.html, NOT checkout.html -- checkout.html is legacy and is reached only
  // by results.html and old test scripts. Pointing this test at it meant the page
  // every buyer actually sees was never covered, which is how the duplicate
  // InitiateCheckout below survived to production.
  await page.goto(`${BASE}/paywall.html?fbclid=TEST_CLICK_${Date.now()}`, {
    waitUntil: 'load', timeout: 60000,
  });
  await page.waitForTimeout(9000);
  // The pixel batches; navigating away flushes whatever is still queued.
  await page.goto(`${BASE}/install.html`, { waitUntil: 'load', timeout: 45000 }).catch(() => {});
  await page.waitForTimeout(5000);

  ck('pixel base code loads and fires PageView',
    fired.some((f) => f.ev === 'PageView'),
    fired.map((f) => f.ev).join(', ') || 'nothing fired');

  ck('events go to the right dataset',
    fired.length > 0 && fired.every((f) => f.id === '2125302081732347'),
    [...new Set(fired.map((f) => f.id))].join(', ') || '-');

  /* EXACTLY one, not "at least one". Two independent lines each fired their own
     InitiateCheckout -- paywall.html on arrival (deduped against the server half
     by eventID) and checkout-payment.js when the Stripe element mounted (no
     eventID at all, so nothing could collapse them). Meta counted both: 13
     against 9 real paywall visits on 2026-08-12, and exactly 2x on A1_cold.
     `some()` could never see that. The count is the assertion. */
  const ic = fired.filter((f) => f.ev === 'InitiateCheckout');
  ck('InitiateCheckout fires exactly once per paywall view',
    ic.length === 1, `${ic.length} fired`);

  /* A dedup id is only required where the SERVER also sends the event -- without
     one the server half lands as a second conversion instead of the same one
     confirmed twice. Browser-only customs (InstallStepShown, BumpAdded,
     Upsell1Accepted, DownsellAccepted) have no server counterpart, so asserting
     an id on those would fail on correct behaviour. Keep this list in step with
     META_EVENT_MAP in supabase/functions/_shared/forwarding.ts. */
  const DEDUPED = ['PageView', 'ViewContent', 'Lead', 'InitiateCheckout', 'AddToCart', 'Purchase'];
  const undeduped = fired.filter((f) => DEDUPED.includes(f.ev) && !f.eid);
  ck('every server-mirrored event carries a dedup id',
    undeduped.length === 0,
    undeduped.map((f) => f.ev).join(', ') || 'all have one');

  // _fbc must be written from the fbclid, or the click is never attributed.
  const cookies = await ctx.cookies();
  const fbc = cookies.find((c) => c.name === '_fbc');
  const fbp = cookies.find((c) => c.name === '_fbp');
  ck('_fbc captured from the ad click', Boolean(fbc), fbc ? fbc.value.slice(0, 28) + '…' : 'missing');
  ck('_fbp set by the pixel', Boolean(fbp), fbp ? fbp.value.slice(0, 24) + '…' : 'missing');

  // The dedup id must be stable — one purchase, one id, shared with the server.
  const a = await page.evaluate(() => window.dayspineMeta.purchaseEventId());
  const b = await page.evaluate(() => window.dayspineMeta.purchaseEventId());
  ck('purchase event id is stable across calls', a === b && a.length > 8, a);

  await ctx.close();
  const failed = results.filter((r) => !r).length;
  console.log(`\n${results.length - failed}/${results.length} checks passed`);
  process.exit(failed ? 1 : 0);
})().catch((e) => {
  console.error('crashed:', e.message);
  process.exit(1);
});
