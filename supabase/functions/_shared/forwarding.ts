/**
 * Pixel forwarding — ported from Funnel Engine's `apps/api/app/lib/pixel-forwarding.ts`.
 *
 * The original is 579 lines with a single import, which is why it moves across
 * almost unchanged: it is plain functions over `fetch` and Web Crypto, both of
 * which Deno has natively. Three deliberate changes, each noted at the point it
 * happens:
 *
 *   1. Pixel lookup. Funnel Engine resolves pixels through `funnel_pixels` keyed
 *      by funnel_id. Dayspine has one product and one pixel, so that join would
 *      be against a constant. Pixels are read from `tracking_pixels` by
 *      `is_active` instead.
 *
 *   2. Token storage. Funnel Engine keeps `access_token` on the pixel row. Here
 *      the token stays in the `META_CAPI_TOKEN` secret, because the Stripe
 *      webhook already reads it from there — putting a live token in a second
 *      place guarantees the two drift, and the failure mode is silent (events
 *      keep 200-ing against a revoked token until someone checks Events Manager).
 *
 *   3. `Purchase` is never forwarded from here. It is fired by the Stripe
 *      webhook, from where a payment is a fact rather than a hope, and both
 *      halves share one `event_id`. Forwarding it from the browser path too
 *      would be a third copy of the same conversion.
 */

const GRAPH = 'https://graph.facebook.com/v25.0';
const TIMEOUT_MS = 8000;

/* Verbatim from Funnel Engine. Bots are the reason a campaign optimises toward
   an audience that never buys, and `facebookexternalhit` in particular hits
   every link Meta itself scrapes. */
const BOT_UA_PATTERNS = [
  /bot/i, /crawl/i, /spider/i, /slurp/i, /mediapartners/i,
  /facebookexternalhit/i, /bingpreview/i, /yandex/i, /baidu/i,
  /semrush/i, /ahrefs/i, /mj12bot/i, /dotbot/i, /petalbot/i,
  /headlesschrome/i, /phantomjs/i, /selenium/i, /puppeteer/i,
  /wget/i, /curl/i, /httpie/i, /python-requests/i, /go-http-client/i,
  /java\//i, /libwww/i, /apache-httpclient/i,
];

export function isBot(userAgent: string | null): boolean {
  if (!userAgent) return true;          // No UA = suspicious
  if (userAgent.length < 20) return true; // Too short = likely bot
  return BOT_UA_PATTERNS.some((p) => p.test(userAgent));
}

/* Dayspine's funnel emits its own vocabulary; Meta only accepts its own.
   Anything unmapped is stored but not forwarded, which is how a new event can
   be added to the funnel without silently posting garbage to the dataset. */
const META_EVENT_MAP: Record<string, string> = {
  page_view: 'PageView',
  quiz_started: 'ViewContent',
  quiz_completed: 'ViewContent',
  lead_captured: 'Lead',
  paywall_reached: 'InitiateCheckout',
  checkout_reached: 'InitiateCheckout',
  add_to_cart: 'AddToCart',
  // checkout_completed is deliberately absent -- see note 3 in the header.
};

export interface TrackEvent {
  id: string;
  created_at: string;
  event_type: string;
  event_id: string;
  visitor_id: string;
  angle: string | null;
  event_source_url: string | null;
  ip_address: string | null;
  user_agent: string | null;
  revenue_cents: number | null;
  fbp: string | null;
  fbc: string | null;
  user_email_hash: string | null;
  metadata: Record<string, unknown> | null;
}

export async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value.trim().toLowerCase());
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

export interface ForwardResult {
  success: boolean;
  status?: number;
  error?: string;
  retryable?: boolean;
}

/**
 * Sends one event to Meta.
 *
 * Never throws: this sits on the request path of a funnel, and a tracking
 * outage must not become a user-facing error.
 */
export async function forwardToMeta(
  event: TrackEvent,
  pixel: { pixel_id: string; test_event_code: string | null },
  token: string,
): Promise<ForwardResult> {
  try {
    const eventName = META_EVENT_MAP[event.event_type];
    if (!eventName) return { success: false, error: `unmapped: ${event.event_type}` };

    /* Meta rejects events timestamped in the future, and a client clock that is
       a few seconds fast is common enough to matter. */
    const now = Math.floor(Date.now() / 1000);
    const eventTime = Math.min(Math.floor(new Date(event.created_at).getTime() / 1000), now);

    const userData: Record<string, unknown> = {
      client_ip_address: event.ip_address,
      client_user_agent: event.user_agent,
      external_id: [await sha256(event.visitor_id)],
    };
    if (event.user_email_hash) userData.em = [event.user_email_hash];
    if (event.fbp) userData.fbp = event.fbp;
    if (event.fbc) userData.fbc = event.fbc;

    const payload: Record<string, unknown> = {
      data: [{
        event_name: eventName,
        event_time: eventTime,
        event_id: event.event_id,
        event_source_url: event.event_source_url || undefined,
        action_source: 'website',
        user_data: userData,
        custom_data: {
          ...(event.revenue_cents ? { value: event.revenue_cents / 100, currency: 'usd' } : {}),
          /* The ad this visitor came from. Carried on every event so per-angle
             performance comes out of the same pipeline as everything else. */
          ...(event.angle ? { content_category: event.angle } : {}),
        },
        // CCPA: empty array = no restrictions.
        data_processing_options: [],
        data_processing_options_country: 0,
        data_processing_options_state: 0,
      }],
    };
    if (pixel.test_event_code) payload.test_event_code = pixel.test_event_code;

    const res = await fetchWithTimeout(`${GRAPH}/${pixel.pixel_id}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });

    // Rate limited or upstream wobble: worth retrying.
    if (res.status === 429 || res.status >= 500) {
      return { success: false, status: res.status, retryable: true, error: `http ${res.status}` };
    }
    // A dead token will 200 nothing and fail every event silently otherwise.
    if (res.status === 401 || res.status === 403) {
      console.error('META CAPI TOKEN EXPIRED OR INVALID — events are being dropped');
      return { success: false, status: res.status, error: 'token rejected' };
    }
    if (!res.ok) {
      return { success: false, status: res.status, error: (await res.text()).slice(0, 300) };
    }
    return { success: true, status: res.status };
  } catch (err) {
    // AbortError included: a timeout is retryable, not a failure of the event.
    return { success: false, retryable: true, error: String(err).slice(0, 300) };
  }
}
