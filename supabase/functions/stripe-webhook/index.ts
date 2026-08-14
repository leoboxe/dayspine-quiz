import { createClient } from 'jsr:@supabase/supabase-js@2';
import Stripe from 'npm:stripe@22.4.0';
import { CATALOGUE, isAddonSlug } from '../_shared/catalogue.ts';
import { purchaseEmail } from '../_shared/email/purchase.ts';
import { sendEmail } from '../_shared/email/send.ts';
import { sendMetaEvent } from '../_shared/meta.ts';

/**
 * The only thing in this system allowed to say that money moved.
 *
 * Everything else — the checkout page, the upsell page, the app — can be
 * replayed, edited or forged by whoever is holding the browser. Stripe's signed
 * event cannot. So this is where an order becomes `paid`, and this is where
 * entitlements are written.
 *
 * ⚠️ It **replaces `record-purchase`**, which was unauthenticated and mintable:
 * anyone could POST themselves a lifetime licence. After this, a row in
 * `addon_grants` means a Stripe charge succeeded, which is what makes the
 * sign-in wall an actual gate rather than a formality.
 *
 * ### Why the raw body matters
 * The signature is computed over the exact bytes Stripe sent. `await req.json()`
 * would parse and discard them, and every event would fail verification with a
 * message that says nothing about why. `req.text()` first, always.
 *
 * ### Why this is idempotent
 * Stripe retries a webhook until it gets a 2xx, and it delivers at-least-once.
 * A handler that grants on every delivery hands out two Partner Seats for one
 * payment. Grants upsert on (email, addon); the order update is a no-op the
 * second time.
 */

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2026-07-29.dahlia',
  httpClient: Stripe.createFetchHttpClient(),
});

const admin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

const SIGNING_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? '';

/**
 * Writes the entitlements a paid order bought.
 *
 * The Partner Seat is granted to the PARTNER's address, not the buyer's, so
 * they sign in as themselves on their own phone. That is the difference between
 * a seat and a shared password.
 */
async function grant(
  email: string,
  addons: string[],
  partnerEmail: string | null,
  note: string,
): Promise<void> {
  const now = new Date().toISOString();
  const rows: Record<string, unknown>[] = addons.filter(isAddonSlug).map((addon) => ({
    email,
    addon,
    source: 'purchase',
    note,
    granted_at: now,
  }));

  if (partnerEmail && addons.includes('partner-seat')) {
    rows.push({
      email: partnerEmail,
      addon: 'partner-seat',
      source: 'purchase',
      note: `Partner Seat bought by ${email}`,
      granted_at: now,
    });
  }

  if (rows.length === 0) return;

  // Ignore duplicates: a retried delivery has not sold anything twice.
  const { error } = await admin
    .from('addon_grants')
    .upsert(rows, { onConflict: 'email,addon', ignoreDuplicates: true });
  if (error) throw new Error(`grant failed: ${error.message}`);

  /*
   * Stop selling to somebody who has bought.
   *
   * Here rather than at the order update because this is the one function every
   * paid path goes through: core, bump, upsell and downsell all land in grant().
   * Putting it on a single branch would leave a buyer who came in through an
   * upsell still receiving "is it worth $49".
   *
   * This is a correctness requirement, not a courtesy. The sequence argues
   * about price for ten days, and four of the eight emails ask for the sale.
   *
   * The partner is cancelled too. They now have a seat, so they are a user
   * rather than a lead, even though they never paid.
   *
   * Swallowed: a mailing-list update must never fail a webhook that has already
   * taken money. Stripe would retry the whole delivery for a mailing-list bug.
   */
  try {
    const buyers = [...new Set(rows.map((r) => r.email as string))];
    const { error: cancelErr } = await admin
      .from('email_enrollments')
      .update({ status: 'cancelled', updated_at: now })
      .in('email', buyers)
      .eq('status', 'active');
    if (cancelErr) console.error('enrollment cancel failed (non-fatal)', cancelErr.message);
  } catch (e) {
    console.error('enrollment cancel threw (non-fatal)', String(e));
  }

  /*
   * The confirmation email.
   *
   * Stripe's receipt proves money moved. It does not tell anybody how to open
   * the product, and until now install.html was the only route in, reachable
   * only by not closing the tab after checkout. A buyer who closed it had paid
   * $49 and had no way to find what they bought.
   *
   * Only to the buyer, not to a partner-seat recipient: the partner did not pay
   * and a receipt would confuse them. Their own onboarding is a separate thing.
   *
   * Deduped on (email, 'purchase') in email_sends with step -1, so a retried
   * Stripe delivery cannot send two receipts. Swallowed, because a webhook that
   * has already taken money must not fail over an email.
   */
  try {
    const apiKey = Deno.env.get('RESEND_API_KEY') ?? '';
    if (apiKey) {
      const { error: claimErr } = await admin.from('email_sends').insert({
        email, step: -1, status: 'sending', subject: 'purchase confirmation',
      });
      if (!claimErr) {
        const mail = purchaseEmail({ email, items: addons });
        const sent = await sendEmail(
          { to: email, subject: mail.subject, html: mail.html, text: mail.text, unsubUrl: '' },
          apiKey,
        );
        await admin.from('email_sends')
          .update({
            status: sent.ok ? 'sent' : 'failed',
            resend_id: sent.id ?? null,
            error: sent.error ?? null,
            subject: mail.subject,
          })
          .eq('email', email).eq('step', -1);
      }
    }
  } catch (e) {
    console.error('confirmation email threw (non-fatal)', String(e));
  }
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return new Response('method_not_allowed', { status: 405 });

  const signature = req.headers.get('stripe-signature');
  if (!signature || !SIGNING_SECRET) {
    console.error('webhook rejected: missing signature or signing secret');
    return new Response('unauthorized', { status: 400 });
  }

  // Raw bytes, before any parsing — see the note above.
  const raw = await req.text();

  let event: Stripe.Event;
  try {
    // Async variant: Deno has no synchronous crypto for this.
    event = await stripe.webhooks.constructEventAsync(raw, signature, SIGNING_SECRET);
  } catch (e) {
    // A bad signature is either a misconfiguration or someone forging events.
    // Either way it is never processed.
    console.error('signature verification failed:', e instanceof Error ? e.message : e);
    return new Response('invalid signature', { status: 400 });
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const intent = event.data.object as Stripe.PaymentIntent;
        const orderId = intent.metadata?.order_id;
        const isUpsell = intent.metadata?.kind === 'upsell';

        if (isUpsell) {
          // An upsell charged off-session against a saved card.
          const addon = intent.metadata?.addon ?? '';
          const email = intent.metadata?.email ?? '';
          const partnerEmail = intent.metadata?.partner_email || null;
          if (email && addon) {
            await grant(email, [addon], partnerEmail, `Upsell · ${intent.id}`);
          }
          await admin
            .from('order_upsells')
            .update({ status: 'paid' })
            .eq('stripe_payment_intent_id', intent.id);

          // Upsells are their own Purchase. The order-level event covers the
          // core basket; counting the upsell inside it would understate what
          // the campaign actually earned per buyer.
          if (email && addon) {
            const { data: parent } = await admin
              .from('orders')
              .select('fbp, fbc, client_ip, client_ua, event_source_url')
              .eq('id', intent.metadata?.order_id ?? '')
              .single();
            await sendMetaEvent({
              eventName: 'Purchase',
              eventId: `upsell-${intent.id}`,
              sourceUrl: parent?.event_source_url ?? null,
              value: (intent.amount ?? 0) / 100,
              currency: 'usd',
              contents: [{ id: addon, quantity: 1, item_price: (intent.amount ?? 0) / 100 }],
              user: {
                email,
                fbp: parent?.fbp,
                fbc: parent?.fbc,
                ip: parent?.client_ip,
                userAgent: parent?.client_ua,
              },
            });
          }
          break;
        }

        if (!orderId) {
          // Not ours, or created outside this integration. Acknowledge so
          // Stripe stops retrying, but do not invent an order for it.
          console.warn('payment_intent.succeeded with no order_id:', intent.id);
          break;
        }

        const { data: order } = await admin
          .from('orders')
          .select(
            'email, items, partner_email, status, amount_cents, fbp, fbc, client_ip, client_ua, event_source_url, purchase_event_id, capi_sent_at',
          )
          .eq('id', orderId)
          .single();

        if (!order) {
          console.error('no order for id:', orderId);
          break;
        }

        // The saved card, kept so the upsell can charge it one-click.
        const paymentMethod =
          typeof intent.payment_method === 'string'
            ? intent.payment_method
            : (intent.payment_method?.id ?? null);

        await admin
          .from('orders')
          .update({
            status: 'paid',
            paid_at: new Date().toISOString(),
            stripe_payment_method_id: paymentMethod,
            updated_at: new Date().toISOString(),
          })
          .eq('id', orderId);

        await grant(order.email, order.items ?? [], order.partner_email, `Order ${orderId}`);

        /**
         * Tell Meta a sale happened — from here, where it is a fact.
         *
         * The browser fires the same Purchase with the SAME event_id, so Meta
         * counts one conversion and gets the union of both sets of match
         * signals. This one carries the cookies captured at checkout plus the
         * certainty that the money moved; the browser's carries whatever the
         * pixel knows that a server cannot.
         *
         * Guarded on `capi_sent_at` because Stripe delivers at-least-once, and
         * a retried webhook reporting the same sale again would inflate the
         * campaign's measured ROAS in the direction that costs the most.
         *
         * Deliberately last, and deliberately unable to fail the handler: a
         * tracking outage must never make Stripe retry a delivery that has
         * already granted the product.
         */
        if (!order.capi_sent_at) {
          const sent = await sendMetaEvent({
            eventName: 'Purchase',
            eventId: order.purchase_event_id ?? `order-${orderId}`,
            sourceUrl: order.event_source_url,
            value: (order.amount_cents ?? 0) / 100,
            currency: 'usd',
            contents: (order.items ?? []).filter(isAddonSlug).map((slug: string) => ({
              id: slug,
              quantity: 1,
              item_price: CATALOGUE[slug as keyof typeof CATALOGUE].amount / 100,
            })),
            user: {
              email: order.email,
              fbp: order.fbp,
              fbc: order.fbc,
              ip: order.client_ip,
              userAgent: order.client_ua,
            },
          });
          if (sent) {
            await admin
              .from('orders')
              .update({ capi_sent_at: new Date().toISOString() })
              .eq('id', orderId);
          }
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const intent = event.data.object as Stripe.PaymentIntent;
        const orderId = intent.metadata?.order_id;
        if (orderId) {
          // Marked failed, NOT deleted: a buyer whose card declined usually
          // tries again, and the row is the only record of the first attempt.
          await admin
            .from('orders')
            .update({ status: 'failed', updated_at: new Date().toISOString() })
            .eq('id', orderId)
            .eq('status', 'draft');
        }
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        const intentId =
          typeof charge.payment_intent === 'string'
            ? charge.payment_intent
            : charge.payment_intent?.id;
        if (!intentId) break;

        const { data: order } = await admin
          .from('orders')
          .select('id, email, items')
          .eq('stripe_payment_intent_id', intentId)
          .single();
        if (!order) break;

        await admin
          .from('orders')
          .update({ status: 'refunded', updated_at: new Date().toISOString() })
          .eq('id', order.id);

        /**
         * Entitlements are revoked on a refund.
         *
         * A 30-day guarantee that leaves the product working forever is not a
         * guarantee, it is the price. The partner's seat is deliberately NOT
         * revoked here — it was given to a third party who did nothing wrong,
         * and taking it back is a support conversation rather than an automatic
         * consequence.
         */
        const revoke = (order.items ?? []).filter(isAddonSlug);
        if (revoke.length > 0) {
          await admin
            .from('addon_grants')
            .delete()
            .ilike('email', order.email)
            .in('addon', revoke);
        }
        break;
      }

      default:
        // Acknowledged and ignored. Returning non-2xx for an event we simply do
        // not handle makes Stripe retry it for days and buries the real
        // failures in the dashboard.
        break;
    }
  } catch (e) {
    // 500 so Stripe RETRIES. Swallowing a fulfilment error with a 200 is how a
    // paying customer ends up with no product and no record of why.
    console.error('webhook handler failed:', e instanceof Error ? e.message : e);
    return new Response('handler error', { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
