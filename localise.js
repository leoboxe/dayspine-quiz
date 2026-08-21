/*
 * Price localisation for the non-US funnels.
 *
 * ## Why it is a runtime pass and not a template
 *
 * The four international funnels are the US funnel on a different hostname. The
 * alternative was to template every price in paywall.html, upsell.html and
 * downsell.html -- twenty-four literals across three files, each edit landing in
 * the file that takes money, for a market that did not exist yet.
 *
 * This does nothing at all on the US funnel. `currentMarket()` returns US, the
 * function returns on its first line, and the page that is currently making
 * money runs exactly the code it ran yesterday. That property is worth more here
 * than tidiness.
 *
 * ## Two kinds of number
 *
 * **Our prices** are looked up. `$49` is not "49 converted"; it is the core
 * price, and the market's core price replaces it -- A$79, £45. These are round
 * retail numbers chosen to clear a net floor, so converting them would be wrong.
 *
 * **Everything else** keeps its number and only changes symbol. `$27 / mo` is
 * what the visitor told us they already spend on other apps; an Australian who
 * types 27 means A$27. Converting their own answer would be nonsense.
 *
 * ## Idempotence
 *
 * A MutationObserver re-runs this because two of the figures are written by
 * script after load. Every processed text node is marked, so a node is never
 * localised twice -- without that, "A$79" re-enters as "$79" and drifts.
 */
import { currentMarket, formatPrice, MARKETS } from './markets.js';

const DONE = new WeakSet();

/** US amounts, in cents, mapped to the slug they represent. */
const US_PRICE_SLUGS = {
  4900: 'core',
  9900: 'anchor',
  900: 'printed-plan',
  3900: 'partner-seat',
  2900: 'grocery-pro',
};

export function localisePrices(root) {
  const market = currentMarket();
  if (!market || market.code === 'US') return;   // the US funnel is left alone entirely

  const us = MARKETS.US;
  const walker = document.createTreeWalker(root || document.body, NodeFilter.SHOW_TEXT);
  const pending = [];
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (!DONE.has(n) && n.nodeValue && n.nodeValue.indexOf('$') !== -1) pending.push(n);
  }

  for (const node of pending) {
    node.nodeValue = node.nodeValue.replace(/\$(\d+)(\.\d{2})?/g, (whole, intPart, decimals) => {
      const cents = Number(intPart) * 100 + (decimals ? Number(decimals.slice(1)) : 0);
      const slug = US_PRICE_SLUGS[cents];

      if (slug) {
        /* One of ours. Use the market's own price, and keep the ".00" style the
           surrounding line already chose so totals stay visually aligned. */
        const localCents = slug === 'anchor' ? market.prices.anchor : market.prices[slug];
        const shown = formatPrice(market, localCents);
        return decimals ? `${shown}.00`.replace(/(\.\d{2})\.00$/, '$1') : shown;
      }

      /* Not a price of ours -- the visitor's own figure. Keep the number, change
         the symbol only. */
      return market.symbol + intPart + (decimals || '');
    });
    DONE.add(node);
  }
}

function boot() {
  /* paywall.html computes a "per month" figure and the AddToCart value from
     CORE_PRICE. Publishing it here keeps that one number on the same config as
     everything else instead of a second US constant. */
  try {
    const m = currentMarket();
    if (m) { window.DAYSPINE_CORE_PRICE = m.prices.core / 100; window.DAYSPINE_CURRENCY = m.iso; }
  } catch (e) {}
  localisePrices(document.body);
  /* Two figures on the paywall are written by script after load, so one pass at
     DOMContentLoaded is not enough. Cheap: it only ever visits nodes containing
     a dollar sign, and each is marked done the first time. */
  const obs = new MutationObserver(() => localisePrices(document.body));
  obs.observe(document.body, { childList: true, subtree: true, characterData: true });
}

try {
  const m0 = currentMarket();
  if (m0) { window.DAYSPINE_CORE_PRICE = m0.prices.core / 100; window.DAYSPINE_CURRENCY = m0.iso; }
} catch (e) {}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
