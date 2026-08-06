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

const SUPABASE_URL = 'https://guixatihuqwfhzvnrkvb.supabase.co';
const SUPABASE_ANON = 'sb_publishable_HsWRfggaqcEPxG5CHT1wvg_9ImA8qZc';
const STRIPE_PK =
  'pk_test_51U0tDh7RFiAEM4DfVoqrojiCxeYm8Mr4eC7yBqG2XDwOPpW3nYxWR4jTWWdhTU4TZk6X1K69NnQVgJUNaq24ZLvP00VeUlwUUO';

const CORE = 79;
const BUMP = 9;

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
  currency: 'usd',
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

function total() {
  return CORE + (bump.checked ? BUMP : 0);
}

function repaint() {
  const t = total();
  bumpRow.hidden = !bump.checked;
  totalEl.textContent = '$' + t.toFixed(2);
  btnTotal.textContent = '$' + t;
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
  btn.textContent = 'Pay $' + total() + ' once';
}

document.getElementById('pay').addEventListener('submit', async (e) => {
  e.preventDefault();
  errEl.hidden = true;

  const email = (emailEl.value || '').trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return fail('Check your email address.');

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
      body: JSON.stringify({ email, addons: bump.checked ? ['printed-plan'] : [] }),
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
      return_url: location.href.replace('checkout.html', 'upsell.html'),
    },
    // Only leave the page when the bank actually demands it (3DS). Everything
    // else stays put, so the upsell is reached without a round trip.
    redirect: 'if_required',
  });

  if (error) return fail(error.message || 'That payment did not go through.');

  try {
    if (window.fbq) window.fbq('track', 'Purchase', { value: total(), currency: 'USD' });
  } catch (err) {}

  location.href = './upsell.html';
});
