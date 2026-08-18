/**
 * What Dayspine sells, and what it costs — on the SERVER.
 *
 * The client sends a selection of add-on slugs and never an amount. That is the
 * single most important rule in this whole integration: a checkout that trusts
 * a price from the browser is a checkout that sells the app for one cent to
 * anybody who opens the network tab.
 *
 * Mirrors `src/domain/addons.ts`, which is the same catalogue for the app's own
 * UI. Two copies is a real risk — they are asserted equal in
 * `__tests__/domain/stripeCatalogue.test.ts`, because the failure mode is a
 * paywall that advertises $9 and charges $19.
 */

export type AddonSlug = 'core' | 'printed-plan' | 'partner-seat' | 'grocery-pro';

export interface CatalogueItem {
  slug: AddonSlug;
  name: string;
  /** Cents. Stripe deals in the smallest currency unit; so does this. */
  amount: number;
  /** Where in the funnel it is sold. `core` is the purchase itself. */
  slot: 'core' | 'bump' | 'upsell' | 'downsell';
}

import { MARKETS, type MarketCode } from './markets.ts';

export const CATALOGUE: Record<AddonSlug, CatalogueItem> = {
  /* $49 from 2026-08-12 (was $79). Leo's call: the buyer's reference price is set
     by the app-store cohort (Cal AI $29.99/yr, Yazio $47.90/yr, MacroFactor
     $71.99/yr), so $49 matches the number she expects to see for a YEAR while
     still being one-time. The anchor stays $99. Add-ons deliberately unchanged. */
  core: { slug: 'core', name: 'Dayspine — lifetime', amount: 4900, slot: 'core' },
  'printed-plan': { slug: 'printed-plan', name: 'The Printed Plan', amount: 900, slot: 'bump' },
  'partner-seat': { slug: 'partner-seat', name: 'Partner Seat', amount: 3900, slot: 'upsell' },
  'grocery-pro': { slug: 'grocery-pro', name: 'Grocery Pro', amount: 2900, slot: 'downsell' },
};

export function isAddonSlug(value: unknown): value is AddonSlug {
  return typeof value === 'string' && value in CATALOGUE;
}

/**
 * Total for a selection, in cents.
 *
 * Unknown slugs are dropped rather than priced at zero — a typo must not become
 * a free add-on, and an injected slug must not become a negative line.
 */
export function totalFor(slugs: readonly string[]): number {
  return slugs.filter(isAddonSlug).reduce((sum, s) => sum + CATALOGUE[s].amount, 0);
}

/** Normalised, de-duplicated, catalogue-valid selection. `core` always first. */
export function normalise(slugs: readonly unknown[]): AddonSlug[] {
  const valid = [...new Set(slugs.filter(isAddonSlug))];
  return valid.sort((a, b) => (a === 'core' ? -1 : b === 'core' ? 1 : 0));
}

/** Loose on purpose: a lookup key, not proof the mailbox exists. */
export function cleanEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const email = value.trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || email.length > 254) return null;
  return email;
}

export const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

/* ------------------------------------------------------------------ MARKETS --

   The amounts above are the US price list and stay the source of truth for the
   US funnel. Every other market prices the same four things differently -- not
   as a conversion, but as its own round retail number that clears Leo's $45 USD
   net floor after local tax and Stripe's international loading. See markets.ts.

   Everything below takes a market and returns that market's numbers. Nothing
   should read CATALOGUE[...].amount directly any more: it silently means "the US
   price", which is right in one funnel out of five.
*/

/** The price of one item in one market, in that currency's smallest unit. */
export function priceFor(market: MarketCode, slug: AddonSlug): number {
  return MARKETS[market].prices[slug];
}

/** What a basket costs in one market. The only number allowed near Stripe. */
export function totalForMarket(market: MarketCode, slugs: readonly string[]): number {
  return slugs.filter(isAddonSlug).reduce((sum, s) => sum + priceFor(market, s), 0);
}
