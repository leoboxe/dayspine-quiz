/**
 * Meta Conversions API.
 *
 * ### Why the server sends Purchase at all
 * The browser pixel is the one that gets blocked. Ad blockers, Safari's ITP, a
 * closed tab a second too early — every one of those loses a sale that actually
 * happened, and Meta then optimises the campaign against a picture of your
 * buyers with the most privacy-conscious ones deleted. CAPI fires from the
 * Stripe webhook, where a payment is a fact rather than a hope.
 *
 * ### Why the browser STILL sends it too
 * Server events have no cookies. Browser events have no certainty. Sending both
 * with the same `event_id` gives Meta the union of the match signals and one
 * conversion — the pixel's `_fbp`/`_fbc` and the server's confirmation of the
 * money. Mismatch the id and every sale is counted twice, which inflates
 * reported ROAS in the most flattering and most expensive direction.
 *
 * ### On hashing
 * Every identifier Meta calls "advanced matching" must arrive SHA-256 hashed and
 * normalised — lower-cased and trimmed. Sending a raw email is both a match
 * failure and a privacy incident.
 */

const GRAPH = 'https://graph.facebook.com/v25.0';

export interface MetaUserData {
  email?: string | null;
  fbp?: string | null;
  fbc?: string | null;
  /** Full name as typed at checkout. Split into fn/ln here. */
  name?: string | null;
  ip?: string | null;
  userAgent?: string | null;
}

export interface MetaEvent {
  eventName: 'Purchase' | 'InitiateCheckout' | 'Lead' | 'PageView' | 'AddToCart';
  eventId: string;
  eventTime?: number;
  sourceUrl?: string | null;
  value?: number;
  currency?: string;
  contents?: { id: string; quantity: number; item_price: number }[];
  user: MetaUserData;
}

async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value.trim().toLowerCase());
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Sends one event. Returns whether Meta accepted it.
 *
 * Never throws. This is analytics attached to a fulfilment path — a tracking
 * outage must not fail a webhook and make Stripe retry a delivery that already
 * granted the product.
 */
export async function sendMetaEvent(event: MetaEvent): Promise<boolean> {
  const datasetId = Deno.env.get('META_DATASET_ID');
  const token = Deno.env.get('META_CAPI_TOKEN');
  if (!datasetId || !token) {
    console.warn('meta: not configured, skipping', event.eventName);
    return false;
  }

  const user: Record<string, unknown> = {};
  if (event.user.email) {
    const em = await sha256(event.user.email);
    user.em = [em];
    /*
     * external_id, which Meta weights heavily and we were not sending at all.
     *
     * It is a stable, first-party identifier for a person, and Meta uses it to
     * stitch a visitor's events together across sessions and devices even when
     * the cookies are gone. That is exactly our situation: the ad click happens
     * in Meta's in-app browser and the email click happens in Gmail's, so the
     * cookies do not survive but the email does.
     *
     * The hashed email IS the stable id here, because email is the only
     * identifier present on every side of this funnel: the quiz, the checkout,
     * the app sign-in and the email sequence. Sending the same value for em and
     * external_id is explicitly allowed and is what Meta's own examples do.
     */
    user.external_id = [em];
  }
  /*
   * First and last name, from the field the paywall already makes required.
   *
   * It was collected and silently discarded: never passed to Stripe as billing
   * details, never stored on the order, never sent here. Two more match keys
   * for data the buyer had already typed.
   *
   * Split on the last space, so "Mary Anne Smith" gives fn="Mary Anne".
   * Guessing a middle name is worse than treating it as part of the first.
   */
  if (event.user.name) {
    const parts = event.user.name.trim().split(/\s+/);
    if (parts.length === 1) {
      user.fn = [await sha256(parts[0])];
    } else if (parts.length > 1) {
      user.ln = [await sha256(parts[parts.length - 1])];
      user.fn = [await sha256(parts.slice(0, -1).join(' '))];
    }
  }
  // fbp and fbc are NOT hashed — they are Meta's own identifiers, and hashing
  // them silently destroys the match.
  if (event.user.fbp) user.fbp = event.user.fbp;
  if (event.user.fbc) user.fbc = event.user.fbc;
  if (event.user.ip) user.client_ip_address = event.user.ip;
  if (event.user.userAgent) user.client_user_agent = event.user.userAgent;

  const payload: Record<string, unknown> = {
    event_name: event.eventName,
    event_time: event.eventTime ?? Math.floor(Date.now() / 1000),
    event_id: event.eventId,
    // 'website' even though this is sent from a server: it describes where the
    // customer was, not where the HTTP request came from. 'system_generated'
    // would exclude it from attribution against web campaigns.
    action_source: 'website',
    user_data: user,
  };
  if (event.sourceUrl) payload.event_source_url = event.sourceUrl;
  if (event.value !== undefined) {
    payload.custom_data = {
      value: event.value,
      currency: event.currency ?? 'USD',
      ...(event.contents ? { contents: event.contents, content_type: 'product' } : {}),
    };
  }

  const body: Record<string, unknown> = { access_token: token, data: [payload] };
  // Set only while validating in Events Manager; must be absent in production
  // or the events land in the test console and nowhere else.
  const testCode = Deno.env.get('META_TEST_EVENT_CODE');
  if (testCode) body.test_event_code = testCode;

  try {
    const res = await fetch(`${GRAPH}/${datasetId}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const out = await res.json();
    if (!res.ok || out.error) {
      console.error('meta rejected:', out?.error?.message ?? res.status);
      return false;
    }
    console.log(`meta ${event.eventName} accepted:`, out.events_received);
    return true;
  } catch (e) {
    console.error('meta send failed:', e instanceof Error ? e.message : e);
    return false;
  }
}
