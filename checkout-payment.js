/* ---------------------------------------------------------------------------
   Checkout.

   The flow is Funnel Engine's, which has actually taken money:
     draft order -> PaymentIntent -> client confirms -> webhook fulfils.

   Two things this file deliberately does NOT do:

   1. **Send a price.** It posts a selection of add-on slugs; `create-checkout`
      prices them from the server-side catalogue. A checkout that accepts an
      amount from the browser sells the app for a cent to anybody who opens the
      network tab.

   2. **Mark anything paid.** Only the Stripe webhook does that. The browser is
      the one party in this transaction with a motive to lie about whether money
      moved — and `confirmPayment` resolving is not proof either, because the
      customer can close the tab a millisecond before it does.

   The deferred-intent flow (`mode: 'payment'`) is what lets the bump change the
   total: `elements.update({ amount })` re-prices the wallet sheet and the card
   form together, so the Apple Pay total can never disagree with the button.
--------------------------------------------------------------------------- */

import { currentMarket } from './markets.js';

const SUPABASE_URL = 'https://guixatihuqwfhzvnrkvb.supabase.co';
const SUPABASE_ANON = 'sb_publishable_HsWRfggaqcEPxG5CHT1wvg_9ImA8qZc';
/*
 * LIVE publishable key. Safe in the bundle by design — it can only create
 * payment methods and confirm intents the server already authorised, which is
 * why Stripe publishes it. The secret key never leaves the edge function.
 */
const STRIPE_PK =
  'pk_live_51SM9r7CV0B2KOmXXq0LDIO174zhFEaMqO3slq8HW8yFoZKedWrwIAYczzxCxQPYrVxoV6M3h1pjdUFoeMBAo71vL00coL89fee';

/* Market prices, not US constants. These set the amount on the Stripe Element,
   so a stale number here shows one total in the wallet sheet and charges
   another. The server prices the order independently from the same config --
   this only has to agree with it, never to be trusted by it. */
const MARKET = currentMarket();
const CORE = MARKET.prices.core / 100;
const BUMP = MARKET.prices['printed-plan'] / 100;
const CURRENCY = MARKET.currency;

const bump = document.getElementById('bump');
const bumpRow = document.getElementById('bumpRow');
const totalEl = document.getElementById('total');
const btnTotal = document.getElementById('btnTotal');
const errEl = document.getElementById('payErr');
const btn = document.getElementById('submit');
const emailEl = document.getElementById('email');

const stripe = Stripe(STRIPE_PK);

const elements = stripe.elements({
  mode: 'payment',
  amount: CORE * 100,
  currency: CURRENCY,
  // Must match what the server sets on the intent, or confirmation fails with a
  // mismatch error no buyer could act on.
  setupFutureUsage: 'off_session',
  appearance: {
    theme: 'stripe',
    variables: {
      colorPrimary: '#F26A11',
      borderRadius: '10px',
      fontFamily: 'Outfit, system-ui, sans-serif',
    },
  },
});

elements.create('payment', { layout: 'tabs' }).mount('#payment-element');

/* NO InitiateCheckout here. It used to fire on this line, once the Stripe element
   mounted, on the reasoning that an IC counting people who never saw a payment
   form makes the funnel look healthier than it is.

   That reasoning is sound and the placement was still wrong, because paywall.html
   ALREADY fires InitiateCheckout on arrival (via dayspineTrack('paywall_reached'),
   which the server mirrors under a shared eventID). This file loads on that same
   page, so both fired for every visitor -- and this one passed no eventID, so Meta
   had nothing to collapse them on. Measured 2026-08-12: Meta reported 13
   InitiateCheckouts against 9 real paywall visits in our own events table, and
   exactly 2x on A1_GroceryList_cold (8 reported, 4 real). With no purchases yet,
   IC was the only signal the optimiser had, so the inflation was also differential
   across ads -- the worst kind, because it distorts CBO allocation.

   Do not re-add it. The "did she actually engage with payment" signal already
   exists and is stronger: paywall.html fires AddToCart when the payment sheet is
   opened, which is a deliberate tap rather than a mount. If that signal ever needs
   a server half, route it through dayspineTrack('add_to_cart') -- already mapped in
   forwarding.ts -- never through a bare fbq() call. */

function total() {
  return CORE + (bump.checked ? BUMP : 0);
}

function repaint() {
  const t = total();
  bumpRow.hidden = !bump.checked;
  totalEl.textContent = MARKET.symbol + t.toFixed(2);
  btnTotal.textContent = MARKET.symbol + t;
  // Re-prices the wallet sheet and the card form in one call.
  elements.update({ amount: t * 100 });
}

bump.addEventListener('change', () => {
  repaint();
  try {
    if (window.fbq && bump.checked) window.fbq('trackCustom', 'BumpAdded', { value: BUMP });
  } catch (e) {}
});

repaint();

function fail(message) {
  errEl.textContent = message;
  errEl.hidden = false;
  btn.disabled = false;
  btn.textContent = 'Pay ' + MARKET.symbol + total() + ' once';
}

document.getElementById('pay').addEventListener('submit', async (e) => {
  e.preventDefault();
  errEl.hidden = true;

  const email = (emailEl.value || '').trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return fail('Check your email address.');

  /* Tell the pixel who this is BEFORE the Purchase fires, so the browser half
     carries the email and name rather than cookies alone. */
  try {
    if (window.dayspineMeta && window.dayspineMeta.identify) {
      window.dayspineMeta.identify(email, (document.getElementById('name') || {}).value);
    }
  } catch (err) {}

  btn.disabled = true;
  btn.textContent = 'Processing…';

  // Validate the Element BEFORE anything is created server-side, so a mistyped
  // card does not leave a draft order and a dangling PaymentIntent behind.
  const { error: submitError } = await elements.submit();
  if (submitError) return fail(submitError.message || 'Check your card details.');

  let clientSecret;
  let orderId;
  try {
    const res = await fetch(SUPABASE_URL + '/functions/v1/create-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + SUPABASE_ANON },
      body: JSON.stringify({
        email,
        /* The paywall makes this required and nothing used to read it. Two more
           match keys for Meta, and better Stripe risk scoring, for free. */
        name: (document.getElementById('name') || {}).value || null,
        addons: bump.checked ? ['printed-plan'] : [],
        /* The cookies a server cannot read, and the id that dedupes this sale
           against the webhook's copy of it. */
        fbp: window.dayspineMeta ? window.dayspineMeta.fbp() : null,
        fbc: window.dayspineMeta ? window.dayspineMeta.fbc() : null,
        eventId: window.dayspineMeta ? window.dayspineMeta.purchaseEventId() : null,
        sourceUrl: location.href,
      }),
    });
    const out = await res.json();
    if (!res.ok || !out.clientSecret) throw new Error(out.error || 'checkout_failed');
    clientSecret = out.clientSecret;
    orderId = out.orderId;
  } catch (err) {
    return fail('We could not start the payment. Please try again.');
  }

  // Carried to the upsell, which charges the card THIS order saved.
  try {
    sessionStorage.setItem('dayspine.order', JSON.stringify({ email, orderId, value: total() }));
    if (bump.checked && typeof grantAddon === 'function') grantAddon('printed-plan');
  } catch (err) {}

  const { error } = await stripe.confirmPayment({
    elements,
    clientSecret,
    confirmParams: {
      /* Billing name, from the field the page already requires. Stripe uses it
         for risk scoring and it makes the receipt legible. */
      payment_method_data: {
        billing_details: { name: (document.getElementById('name') || {}).value || undefined },
      },
      /* Resolved against the current page rather than string-replaced.
         This was `location.href.replace('checkout.html', 'upsell.html')`, from
         when the payment lived on checkout.html. It now lives on paywall.html,
         where that string is absent, so the replace did nothing and return_url
         stayed on the paywall: a buyer sent through 3-D Secure -- routine in
         Europe and standard for wallets -- came back to the offer page after
         paying and had every reason to think it had failed. Only that path is
         affected, which is why it survives casual testing: redirect is
         'if_required', so a card that skips 3DS never uses return_url at all. */
      return_url: new URL('./upsell.html', location.href).href,
    },
    // Only leave the page when the bank actually demands it (3DS). Everything
    // else stays put, so the upsell is reached without a round trip.
    redirect: 'if_required',
  });

  if (error) return fail(error.message || 'That payment did not go through.');

  /* The browser half of Purchase. The SAME event_id goes to the webhook, so
     Meta counts one conversion and takes the union of both sets of match
     signals — this one has the cookies, that one has the certainty. */
  try {
    if (window.fbq) {
      window.fbq(
        'track',
        'Purchase',
        { value: total(), currency: MARKET.iso },
        { eventID: window.dayspineMeta ? window.dayspineMeta.purchaseEventId() : undefined },
      );
    }
  } catch (err) {}

  /* Our own record of the sale. `checkout_completed` is deliberately absent
     from the forward map, so this is stored and never sent on -- the webhook
     owns the Purchase that reaches Meta. Without it we have no server-side
     evidence that the browser half ever ran, which is exactly the question that
     came up after the first real purchase. keepalive, because it is racing the
     same navigation as the beacon below. */
  try {
    if (window.dayspineTrack) {
      window.dayspineTrack('checkout_completed', {
        event_id: window.dayspineMeta ? window.dayspineMeta.purchaseEventId() : undefined,
        revenue_cents: Math.round(total() * 100),
      });
    }
  } catch (err) {}

  /* fbq sends via an <img> beacon, and navigating aborts one in flight. Measured
     at 23ms on a desktop connection, which is where this looks safe and is not:
     on mobile data it is hundreds of milliseconds, and the assignment below runs
     immediately. Losing it does not lose the sale -- the webhook reports that
     from the server -- but it loses the browser's match signals and makes
     Events Manager look like the pixel is dead. A third of a second here is
     imperceptible after a payment that just took several. */
  setTimeout(function () { location.href = './upsell.html'; }, 350);
});
