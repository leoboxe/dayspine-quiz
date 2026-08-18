/**
 * Every market, and the only place a price is written down.
 *
 * `markets.js` at the repo root is GENERATED from this file for the browser --
 * run `node scripts/build-markets.js` after any change here. A hand-copied second
 * copy is how a paywall ends up advertising one price and charging another.
 *
 * ## How the prices were set
 *
 * Leo's floor is **$45 USD net per core sale**, after tax and after Stripe. Each
 * price is the first local-looking number that clears it.
 *
 * The fee model is a US Stripe account presenting a foreign currency to a foreign
 * card: 2.9% base + 1.5% international card + 1% currency conversion = 5.4%, plus
 * a 0.30 fixed fee. Stripe takes its cut of the GROSS, tax included, so tax comes
 * out after the percentage rather than before.
 *
 * Tax is priced in as if REGISTERED IN EVERY MARKET, which is pessimistic today:
 * only the UK has no threshold for a non-UK seller, so GB owes VAT from the first
 * sale while AU, NZ and CA start below their thresholds. Pricing for the worst
 * case means none of these numbers has to move the day a threshold is crossed.
 *
 * Net per core sale at these prices, with tax charged (FX of 2026-08-18):
 *   AU A$79 -> $47.81    CA C$79 -> $47.13
 *   NZ NZ$99 -> $47.53   GB  £45 -> $47.12      US $49 -> $47.28
 *
 * FX moves. These are round retail prices, not conversions, so they should be
 * reviewed rather than recalculated -- if a currency slides far enough that a
 * market drops under the floor, change the price deliberately.
 */

export type MarketCode = 'US' | 'AU' | 'CA' | 'NZ' | 'GB';

export interface Market {
  code: MarketCode;
  /** Stripe presentment currency, lowercase as Stripe wants it. */
  currency: string;
  /** What the buyer sees before the number. */
  symbol: string;
  /** Uppercase, for Meta's `currency` field and anywhere prose needs it. */
  iso: string;
  /** Hostname this market is served from. */
  host: string;
  /** Smallest currency unit, exactly like the US catalogue. */
  prices: {
    core: number;
    anchor: number;
    'printed-plan': number;
    'partner-seat': number;
    'grocery-pro': number;
  };
  /**
   * Consumption tax charged on the price, as a fraction, tax-INCLUSIVE.
   * Recorded so the price can be justified later and so Stripe Tax can be
   * switched on without re-deriving any of this. Not applied in code today --
   * the price already contains it.
   */
  taxRate: number;
  /** True only where registration is required from the first sale. */
  taxFromFirstSale: boolean;
  /**
   * Units of this currency per 1 USD, for APPROXIMATE figures only.
   *
   * Our own prices are never converted -- they are round retail numbers in
   * `prices`. This exists so the emails can quote what a COMPETITOR charges in
   * the reader's own currency: telling an Australian that Noom is "$209 a year"
   * is either wrong or ambiguous, and quoting USD at them undercuts the whole
   * comparison. Rounded hard on use, because nobody believes "A$294.02".
   */
  fxFromUsd: number;
}

export const MARKETS: Record<MarketCode, Market> = {
  US: {
    code: 'US', currency: 'usd', symbol: '$', iso: 'USD', host: 'quiz.dayspine.com',
    prices: { core: 4900, anchor: 9900, 'printed-plan': 900, 'partner-seat': 3900, 'grocery-pro': 2900 },
    taxRate: 0, taxFromFirstSale: false, fxFromUsd: 1,
  },
  AU: {
    code: 'AU', currency: 'aud', symbol: 'A$', iso: 'AUD', host: 'au.dayspine.com',
    prices: { core: 7900, anchor: 15900, 'printed-plan': 1500, 'partner-seat': 5900, 'grocery-pro': 4500 },
    taxRate: 0.10, taxFromFirstSale: false, fxFromUsd: 1.4068,   // GST above A$75k turnover
  },
  CA: {
    code: 'CA', currency: 'cad', symbol: 'C$', iso: 'CAD', host: 'ca.dayspine.com',
    prices: { core: 7900, anchor: 15900, 'printed-plan': 1500, 'partner-seat': 5900, 'grocery-pro': 4500 },
    taxRate: 0.13, taxFromFirstSale: false, fxFromUsd: 1.3865,   // GST/HST above C$30k, rate varies by province
  },
  NZ: {
    code: 'NZ', currency: 'nzd', symbol: 'NZ$', iso: 'NZD', host: 'nz.dayspine.com',
    prices: { core: 9900, anchor: 19900, 'printed-plan': 1900, 'partner-seat': 7900, 'grocery-pro': 5500 },
    taxRate: 0.15, taxFromFirstSale: false, fxFromUsd: 1.6926,   // GST above NZ$60k turnover
  },
  GB: {
    code: 'GB', currency: 'gbp', symbol: '£', iso: 'GBP', host: 'uk.dayspine.com',
    prices: { core: 4500, anchor: 8900, 'printed-plan': 900, 'partner-seat': 3500, 'grocery-pro': 2500 },
    taxRate: 0.20, taxFromFirstSale: true, fxFromUsd: 0.7379,    // ⚠️ UK VAT applies from the first sale
  },
};

export const DEFAULT_MARKET: MarketCode = 'US';

export function isMarketCode(v: unknown): v is MarketCode {
  return typeof v === 'string' && v in MARKETS;
}

/**
 * Which market a request belongs to, decided by hostname.
 *
 * Hostname rather than a build-time variable: the same bundle then serves any
 * market, there is nothing to forget to set at deploy time, and a mismatch is
 * impossible because the URL the buyer is looking at IS the input.
 *
 * Anything unrecognised falls back to US rather than throwing. A funnel that
 * refuses to load because a preview domain was not in a list sells nothing.
 */
export function marketFromHost(host: string | null | undefined): MarketCode {
  const h = (host || '').toLowerCase().split(':')[0];
  for (const m of Object.values(MARKETS)) {
    if (h === m.host) return m.code;
  }
  const first = h.split('.')[0];
  const byPrefix: Record<string, MarketCode> = { au: 'AU', ca: 'CA', nz: 'NZ', uk: 'GB', gb: 'GB' };
  return byPrefix[first] ?? DEFAULT_MARKET;
}

/** The market for an incoming edge-function request. */
export function marketFromRequest(req: Request): MarketCode {
  const explicit = req.headers.get('x-dayspine-market');
  if (isMarketCode(explicit)) return explicit;
  for (const header of ['origin', 'referer']) {
    const raw = req.headers.get(header);
    if (!raw) continue;
    try {
      return marketFromHost(new URL(raw).hostname);
    } catch { /* malformed header, try the next one */ }
  }
  return DEFAULT_MARKET;
}

/** Formats an amount in the smallest unit, e.g. 7900 -> "A$79". */
export function formatPrice(market: Market, amount: number): string {
  const major = amount / 100;
  const shown = Number.isInteger(major) ? String(major) : major.toFixed(2);
  return `${market.symbol}${shown}`;
}

/**
 * A USD figure expressed roughly in the market's currency, for competitor
 * prices in copy. Rounded to something a person would actually say.
 */
export function approxLocal(market: Market, usd: number): string {
  const raw = usd * market.fxFromUsd;
  const rounded = raw >= 100 ? Math.round(raw / 10) * 10
    : raw >= 20 ? Math.round(raw)
    : Math.round(raw * 2) / 2;
  return `${market.symbol}${Number.isInteger(rounded) ? rounded : rounded.toFixed(2)}`;
}

/** "forty five pounds" -- for the one line that spells the price out. */
export function priceInWords(market: Market): string {
  const n = Math.round(market.prices.core / 100);
  const ones = ['zero','one','two','three','four','five','six','seven','eight','nine','ten',
    'eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen'];
  const tens = ['','','twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety'];
  const words = n < 20 ? ones[n]
    : `${tens[Math.floor(n / 10)]}${n % 10 ? ' ' + ones[n % 10] : ''}`;
  const unit = market.iso === 'GBP' ? 'pounds' : 'dollars';
  return `${words} ${unit}`;
}
