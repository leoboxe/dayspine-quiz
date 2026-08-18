/**
 * Generate `markets.js` (browser) from `markets.ts` (server).
 *
 * The paywall has to print a price and the checkout has to charge one. If those
 * two numbers come from two hand-maintained files they will disagree eventually,
 * and the failure is silent in the worst possible place: the page advertises A$79
 * and Stripe takes A$99, or the reverse.
 *
 * So the prices are written down once, in markets.ts, and this emits the browser
 * copy. tests/markets.test.js re-runs it and fails if the checked-in file has
 * drifted -- the same guard build-quiz-labels.js has.
 *
 * Node's native TypeScript stripping is what lets this import the .ts directly,
 * so the DATA is never re-typed. The three helpers below are re-emitted rather
 * than imported because the browser needs plain JS; they are small, pure, and
 * unit-tested on both sides.
 *
 * Usage: node scripts/build-markets.js
 */
import { writeFileSync } from 'node:fs';
import { MARKETS, DEFAULT_MARKET } from '../supabase/functions/_shared/markets.ts';

const header = `/*
 * GENERATED FILE -- DO NOT EDIT.
 *
 * Source of truth: supabase/functions/_shared/markets.ts
 * Regenerate:      node scripts/build-markets.js
 *
 * Edit the .ts and re-run. Editing this file directly means the price the
 * paywall shows and the price Stripe charges can drift apart, which is the one
 * bug in this funnel a buyer would notice before we did.
 */
`;

const body = `
export const MARKETS = ${JSON.stringify(MARKETS, null, 2)};

export const DEFAULT_MARKET = ${JSON.stringify(DEFAULT_MARKET)};

/**
 * Which market this page is, decided by the hostname it is being served from.
 * Unrecognised hosts fall back to US -- a funnel that refuses to load because a
 * preview domain was not in a list sells nothing.
 */
export function marketFromHost(host) {
  const h = String(host || '').toLowerCase().split(':')[0];
  for (const m of Object.values(MARKETS)) {
    if (h === m.host) return m.code;
  }
  const byPrefix = { au: 'AU', ca: 'CA', nz: 'NZ', uk: 'GB', gb: 'GB' };
  return byPrefix[h.split('.')[0]] || DEFAULT_MARKET;
}

/** The market for the page currently open. */
export function currentMarket() {
  return MARKETS[marketFromHost(typeof location === 'undefined' ? '' : location.hostname)];
}

/** Formats an amount in the smallest unit, e.g. 7900 -> "A$79". */
export function formatPrice(market, amount) {
  const major = amount / 100;
  const shown = Number.isInteger(major) ? String(major) : major.toFixed(2);
  return market.symbol + shown;
}
`;

writeFileSync(new URL('../markets.js', import.meta.url), header + body, 'utf8');
console.log(`wrote markets.js for ${Object.keys(MARKETS).length} markets: ${Object.keys(MARKETS).join(', ')}`);
