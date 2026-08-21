/**
 * An upsell must charge the ORDER's market, not the US price list.
 *
 * Two separate failures are guarded here, both of which shipped:
 *
 * 1. `charge-upsell` originally read `CATALOGUE[addon].amount` and hardcoded
 *    `usd`, so an Australian who paid A$79 would have been charged $39 USD
 *    against a card Stripe had already charged in AUD.
 *
 * 2. The fix's three `const`s were then placed INSIDE a guard block, after its
 *    `return` -- unreachable, with the names used out of scope below. Every
 *    upsell threw, in every market including the US. esbuild parses that
 *    happily because it is a scope error, not a syntax one, which is exactly how
 *    it reached production.
 *
 * This asserts the pricing rule directly, and separately asserts the source file
 * does not reintroduce either shape.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MARKETS, isMarketCode, DEFAULT_MARKET } from '../supabase/functions/_shared/markets.ts';
import { priceFor } from '../supabase/functions/_shared/catalogue.ts';

/** Exactly what charge-upsell does, so the rule is tested rather than the prose. */
function upsellCharge(order: { market?: string | null; currency_code?: string | null }, addon: 'partner-seat' | 'grocery-pro') {
  const market = isMarketCode(order.market) ? order.market : DEFAULT_MARKET;
  return { amount: priceFor(market, addon), currency: order.currency_code || MARKETS[market].currency };
}

test('an AU order is upsold in AUD at the AU price, never USD', () => {
  const r = upsellCharge({ market: 'AU', currency_code: 'aud' }, 'partner-seat');
  assert.equal(r.currency, 'aud');
  assert.equal(r.amount, MARKETS.AU.prices['partner-seat']);
  assert.notEqual(r.amount, MARKETS.US.prices['partner-seat'], 'must not fall back to the US price');
});

test('every market upsells in its own currency and price', () => {
  for (const code of Object.keys(MARKETS) as (keyof typeof MARKETS)[]) {
    const m = MARKETS[code];
    for (const addon of ['partner-seat', 'grocery-pro'] as const) {
      const r = upsellCharge({ market: code, currency_code: m.currency }, addon);
      assert.equal(r.currency, m.currency, `${code} ${addon} currency`);
      assert.equal(r.amount, m.prices[addon], `${code} ${addon} amount`);
    }
  }
});

test('a pre-market order falls back to US, which is what those rows are', () => {
  const r = upsellCharge({ market: null, currency_code: null }, 'partner-seat');
  assert.equal(r.currency, 'usd');
  assert.equal(r.amount, MARKETS.US.prices['partner-seat']);
});

test('the source declares the pricing consts AFTER the saved-card guard closes', () => {
  const src = readFileSync(new URL('../supabase/functions/charge-upsell/index.ts', import.meta.url), 'utf8');
  const guard = src.indexOf("return json({ error: 'no_saved_card' }, 409);");
  const guardCloses = src.indexOf('}', guard);
  const decl = src.indexOf('const upsellAmount');
  assert.ok(guard > 0 && decl > 0, 'markers present');
  assert.ok(decl > guardCloses, 'pricing consts must be outside the guard block, or they are dead code');
  assert.ok(src.indexOf('amount: upsellAmount') > decl, 'declared before use');
});

test('the source never hardcodes usd or the US catalogue amount for an upsell', () => {
  const src = readFileSync(new URL('../supabase/functions/charge-upsell/index.ts', import.meta.url), 'utf8');
  assert.ok(!/currency:\s*'usd'/.test(src), "no hardcoded 'usd'");
  assert.ok(!/amount:\s*item\.amount/.test(src), 'no US catalogue amount');
});
