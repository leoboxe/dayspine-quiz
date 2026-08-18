import { createClient } from 'jsr:@supabase/supabase-js@2';
import Stripe from 'npm:stripe@22.4.0';
import { isMarketCode, MARKETS, DEFAULT_MARKET } from '../_shared/markets.ts';
import { CATALOGUE, priceFor, CORS, cleanEmail, isAddonSlug, json } from '../_shared/catalogue.ts';

/**
 * One-click upsell: charge the card the buyer already paid with.
 *
 * The whole point of `setup_future_usage: 'off_session'` at checkout. Accepting
 * the Partner Seat is a single tap thirty seconds after paying — no card, no
 * wallet, no second form. Funnel Engine does this through a
 * `claim_upsell_session` RPC; this is the same mechanic with the state in
 * `order_upsells`.
 *
 * ### The three things that stop this being a double-charge machine
 * 1. **The order must be `paid`.** A draft order has no proven card behind it,
 *    and charging one would be charging a card that never cleared.
 * 2. **One accept per add-on per order**, enforced by a unique index. A buyer
 *    who double-taps Confirm has not bought two seats — and the second tap is
 *    the likeliest tap in the funnel, because nothing visibly happens for a
 *    second while the charge runs.
 * 3. **The price comes from the catalogue**, never the request.
 *
 * ### `off_session: true` is not cosmetic
 * It tells Stripe the cardholder is not present, which changes how a 3DS
 * challenge is handled: instead of prompting a customer who cannot answer, the
 * charge fails with `authentication_required` and we decline gracefully. Sending
 * it as an on-session payment would hang the buyer on an invisible bank prompt.
 */

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2026-07-29.dahlia',
  httpClient: Stripe.createFetchHttpClient(),
});

const admin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  let body: { orderId?: unknown; addon?: unknown; partnerEmail?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'bad_request' }, 400);
  }

  const orderId = typeof body.orderId === 'string' ? body.orderId : '';
  const addon = body.addon;
  if (!orderId || !isAddonSlug(addon) || addon === 'core') {
    return json({ error: 'bad_request' }, 400);
  }

  const item = CATALOGUE[addon];   // name only; the price comes from the order's market

  /*
   * The upsell inherits its market from the ORDER, not from the request.
   *
   * This charges a card the buyer saved minutes ago against a PaymentIntent in
   * a specific currency. Pricing it from the request origin would let an
   * Australian who lands on the US upsell page be charged USD against an AUD
   * customer, and pricing it from CATALOGUE would charge every market the US
   * price. The order already knows what was charged and in what -- use that.
   */
  if (item.slot !== 'upsell' && item.slot !== 'downsell') {
    return json({ error: 'not_an_upsell' }, 400);
  }

  const partnerEmail = cleanEmail(body.partnerEmail);

  try {
    const { data: order } = await admin
      .from('orders')
      .select('id, email, status, stripe_customer_id, stripe_payment_method_id, market, currency_code')
      .eq('id', orderId)
      .single();

    if (!order) return json({ error: 'no_order' }, 404);

    // Rule 1: only a paid order has a card worth charging.
    if (order.status !== 'paid') return json({ error: 'order_not_paid' }, 409);
    if (!order.stripe_payment_method_id || !order.stripe_customer_id) {
      return json({ error: 'no_saved_card' }, 409);
    }

    /* Falls back to US only if an old row predates the market column. Those rows
       are genuinely US -- it is the only market that has run.

       These sat INSIDE the guard above, after its return: unreachable, and the
       names were then used out of scope further down. Every upsell threw, in
       every market. esbuild parses that happily -- it is a type/scope error, not
       a syntax one -- which is why it reached production. */
    const upsellMarket = isMarketCode(order.market) ? order.market : DEFAULT_MARKET;
    const upsellAmount = priceFor(upsellMarket, addon);
    const upsellCurrency = order.currency_code || MARKETS[upsellMarket].currency;

    /**
     * Rule 2: claim the slot BEFORE charging.
     *
     * The unique index on (order_id, addon) makes this the lock. Charging first
     * and recording after leaves a window where a double-tap charges twice and
     * only one row survives — the money is gone and nothing says so.
     */
    const { data: claim, error: claimError } = await admin
      .from('order_upsells')
      .insert({ order_id: order.id, addon, amount_cents: upsellAmount, status: 'pending' })
      .select('id')
      .single();

    if (claimError || !claim) {
      // Unique violation: already accepted. Success, not an error — the buyer
      // owns it, which is the outcome they were asking for.
      if (claimError?.code === '23505') return json({ ok: true, alreadyOwned: true }, 200);
      console.error('upsell claim failed:', claimError?.message);
      return json({ error: 'claim_failed' }, 500);
    }

    let intent: Stripe.PaymentIntent;
    try {
      intent = await stripe.paymentIntents.create({
        amount: upsellAmount,
        currency: upsellCurrency,
        customer: order.stripe_customer_id,
        payment_method: order.stripe_payment_method_id,
        // Cardholder is not at the keyboard — see the note above.
        off_session: true,
        confirm: true,
        receipt_email: order.email,
        metadata: {
          kind: 'upsell',
          order_id: order.id,
          addon,
          email: order.email,
          partner_email: partnerEmail ?? '',
          app: 'dayspine',
        },
      });
    } catch (e) {
      // Release the claim so a genuine retry (different card, later) can run.
      await admin.from('order_upsells').update({ status: 'failed' }).eq('id', claim.id);
      const code = (e as Stripe.errors.StripeError)?.code ?? 'charge_failed';
      console.error('upsell charge failed:', code);
      // A declined card is the buyer's business; the raw Stripe message is not.
      return json({ error: 'charge_declined', code }, 402);
    }

    await admin
      .from('order_upsells')
      .update({ stripe_payment_intent_id: intent.id })
      .eq('id', claim.id);

    /**
     * The webhook grants the entitlement, not this function.
     *
     * `confirm: true` usually returns `succeeded` inline, and it would be easy
     * to grant here and be done. But then a charge that succeeds while this
     * function times out would be a charge with no product — and the webhook is
     * the one path Stripe guarantees to deliver.
     */
    return json({ ok: true, status: intent.status, paymentIntentId: intent.id }, 200);
  } catch (e) {
    console.error('charge-upsell failed:', e instanceof Error ? e.message : e);
    return json({ error: 'upsell_failed' }, 500);
  }
});
