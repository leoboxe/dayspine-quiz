/*
 * GENERATED FILE -- DO NOT EDIT.
 *
 * Source of truth: supabase/functions/_shared/markets.ts
 * Regenerate:      node scripts/build-markets.js
 *
 * Edit the .ts and re-run. Editing this file directly means the price the
 * paywall shows and the price Stripe charges can drift apart, which is the one
 * bug in this funnel a buyer would notice before we did.
 */

export const MARKETS = {
  "US": {
    "code": "US",
    "currency": "usd",
    "symbol": "$",
    "iso": "USD",
    "host": "quiz.dayspine.com",
    "prices": {
      "core": 4900,
      "anchor": 9900,
      "printed-plan": 900,
      "partner-seat": 3900,
      "grocery-pro": 2900
    },
    "taxRate": 0,
    "taxFromFirstSale": false,
    "fxFromUsd": 1
  },
  "AU": {
    "code": "AU",
    "currency": "aud",
    "symbol": "A$",
    "iso": "AUD",
    "host": "au.dayspine.com",
    "prices": {
      "core": 7900,
      "anchor": 15900,
      "printed-plan": 1500,
      "partner-seat": 5900,
      "grocery-pro": 4500
    },
    "taxRate": 0.1,
    "taxFromFirstSale": false,
    "fxFromUsd": 1.4068
  },
  "CA": {
    "code": "CA",
    "currency": "cad",
    "symbol": "C$",
    "iso": "CAD",
    "host": "ca.dayspine.com",
    "prices": {
      "core": 7900,
      "anchor": 15900,
      "printed-plan": 1500,
      "partner-seat": 5900,
      "grocery-pro": 4500
    },
    "taxRate": 0.13,
    "taxFromFirstSale": false,
    "fxFromUsd": 1.3865
  },
  "NZ": {
    "code": "NZ",
    "currency": "nzd",
    "symbol": "NZ$",
    "iso": "NZD",
    "host": "nz.dayspine.com",
    "prices": {
      "core": 9900,
      "anchor": 19900,
      "printed-plan": 1900,
      "partner-seat": 7900,
      "grocery-pro": 5500
    },
    "taxRate": 0.15,
    "taxFromFirstSale": false,
    "fxFromUsd": 1.6926
  },
  "GB": {
    "code": "GB",
    "currency": "gbp",
    "symbol": "£",
    "iso": "GBP",
    "host": "uk.dayspine.com",
    "prices": {
      "core": 4500,
      "anchor": 8900,
      "printed-plan": 900,
      "partner-seat": 3500,
      "grocery-pro": 2500
    },
    "taxRate": 0.2,
    "taxFromFirstSale": true,
    "fxFromUsd": 0.7379
  }
};

export const DEFAULT_MARKET = "US";

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
