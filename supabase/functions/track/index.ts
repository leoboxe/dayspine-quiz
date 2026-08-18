/**
 * The event endpoint — ported from Funnel Engine's `/api/track`.
 *
 * Reached through `/api/t` on quiz.dayspine.com, never directly. That proxy is
 * the whole point: a request to a Supabase URL is a third-party request and
 * dies to the same blocklists as the pixel itself, whereas `/api/t` on the
 * site's own origin is indistinguishable from the site working.
 *
 * Responds 204 before forwarding. Meta's round trip is not something a visitor
 * should ever wait on, and the funnel must not get slower because tracking got
 * more thorough.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { MARKETS, isMarketCode, marketFromRequest } from '../_shared/markets.ts';
import { forwardToMeta, isBot, sha256, type TrackEvent } from '../_shared/forwarding.ts';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Cache-Control': 'no-store',
};

const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

/**
 * A Meta object id, or null.
 *
 * Meta ids are long decimal strings (17 to 20 digits today). Anything else in a
 * UTM slot is somebody else's tracking and must not be written into ad_id.
 */
function metaId(v: unknown): string | null {
  const s = typeof v === 'string' ? v.trim() : '';
  return /^\d{15,22}$/.test(s) ? s : null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (req.method !== 'POST') return new Response('method not allowed', { status: 405, headers: cors });

  let body: Record<string, any>;
  try {
    body = await req.json();
  } catch {
    return new Response('bad json', { status: 400, headers: cors });
  }

  const {
    event_type, event_id, visitor_id, session_id, angle, page_slug,
    event_source_url, referrer, metadata, revenue_cents,
    fbp, fbc, fbclid, gclid, ttclid, email,
    utm_source, utm_medium, utm_campaign, utm_content, utm_term,
    ad_id, adset_id, campaign_id, ad_name, adset_name, campaign_name, placement,
  } = body;

  if (!event_type || !event_id || !visitor_id) {
    return new Response('missing event_type, event_id or visitor_id', { status: 400, headers: cors });
  }


  /* The proxy forwards the real client IP and UA; without them Meta's match
     quality drops and every event looks like it came from Supabase. */
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? null;
  const ua = req.headers.get('x-real-user-agent') ?? req.headers.get('user-agent') ?? null;
  const bot = isBot(ua);

  /* Which funnel this event belongs to, from the hostname it was sent from.
     Every row carries it so a market can be read on its own without unpicking
     URLs after the fact. */
  /* api/t.js is the only caller and it runs on the market's own hostname, so
     the value it sets is authoritative. Origin is the fallback and is absent on
     a server-to-server fetch -- relying on it wrote every international event as
     US. The client cannot influence this: the proxy overwrites the body field. */
  const marketCode = isMarketCode(body.market) ? body.market : marketFromRequest(req);

  /*
   * quiz_progress -- the backup of every answer, including abandoned quizzes.
   *
   * `save-quiz` is keyed on email and rejects anything without one, so until a
   * visitor reaches the email screen their answers exist only in that browser's
   * sessionStorage. Anyone who leaves before it takes every answer with them:
   * checked 2026-08-18, `quiz_answers` held 48 A4 rows, all complete, zero
   * partials. Two thirds of arrivals never finish, so that is the majority of
   * the data being dropped.
   *
   * This rides the existing /api/t pipeline rather than adding an endpoint,
   * which means it inherits the first-party proxy (ad blockers cannot see it),
   * the `_ds_vid` cookie as a key, and the bot filter -- none of which would
   * exist on something new.
   *
   * It writes to its OWN table and deliberately does not touch `events`. The
   * quiz saves on every answer, so folding these into `events` would add ~27
   * rows per visitor and drown the funnel counts everything else is measured on.
   *
   * Backup only. Nothing reads this table; the funnel still runs entirely off
   * `quiz_answers`, so a failure here can never affect a visitor.
   */
  if (event_type === 'quiz_progress') {
    if (bot) return new Response('ok', { headers: cors });
    try {
      const answers = metadata && typeof metadata === 'object' ? metadata : {};
      // A quiz is a few dozen short answers. Anything larger is not a quiz.
      if (JSON.stringify(answers).length <= 20000) {
        await admin.from('quiz_progress').upsert({
          visitor_id,
          market: marketCode,
          angle: angle ?? null,
          answers,
          screen_index: typeof body.screen_index === 'number' ? body.screen_index : null,
          screen_id: typeof body.screen_id === 'string' ? body.screen_id.slice(0, 64) : null,
          email: typeof email === 'string' && email.includes('@') ? email.toLowerCase() : undefined,
          /* Only ever set true, never written back to false.
             The email-screen save and the completion save are two concurrent
             keepalive posts moments apart, with no ordering guarantee. Writing
             `complete: false` here meant a late-arriving email save could undo
             the completion flag -- observed on the first end-to-end run: a quiz
             that finished, with all 25 answers and the email attached, stored as
             complete=false. Omitting the column leaves whatever is already
             there, and the row defaults to false on insert. */
          ...(body.quiz_complete === true ? { complete: true } : {}),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'visitor_id' });
      }
    } catch (_e) {
      // A backup that breaks the thing it is backing up is worse than no backup.
    }
    return new Response('ok', { headers: cors });
  }

  const row = {
    event_type, event_id, visitor_id,
    market: marketCode,
    session_id: session_id ?? null,
    angle: angle ?? null,
    page_slug: page_slug ?? null,
    ip_address: ip,
    user_agent: ua,
    referrer: referrer ?? null,
    event_source_url: event_source_url ?? null,
    utm_source: utm_source ?? null, utm_medium: utm_medium ?? null,
    utm_campaign: utm_campaign ?? null, utm_content: utm_content ?? null,
    utm_term: utm_term ?? null,
    /*
     * Meta appends the IDs as UTMs, so read them from there when the dedicated
     * params are absent.
     *
     * The schema was built for a URL template carrying `ad_id=` explicitly. That
     * template was never deployed. What actually arrives on every ad click is
     * utm_content=<ad id>, utm_term=<adset id>, utm_campaign=<campaign id>,
     * appended by Meta itself, while the creative's own url_tags holds only
     * utm_source=facebook. Result before this: ad_id populated on 4 rows out of
     * 791 while utm_content had 747, and per-ad reporting had to join through a
     * column nobody read as an ad id.
     *
     * Guarded on the shape, not just presence: utm_content is a general-purpose
     * parameter and a newsletter or an affiliate could put anything in it. Only
     * a Meta-style numeric id is promoted, so a non-Meta source can never
     * pollute ad_id.
     */
    ad_id: ad_id ?? metaId(utm_content), adset_id: adset_id ?? metaId(utm_term),
    campaign_id: campaign_id ?? metaId(utm_campaign),
    ad_name: ad_name ?? null, adset_name: adset_name ?? null,
    campaign_name: campaign_name ?? null, placement: placement ?? null,
    metadata: metadata ?? null,
    revenue_cents: revenue_cents ?? null,
    fbclid: fbclid ?? null, gclid: gclid ?? null, ttclid: ttclid ?? null,
    fbp: fbp ?? null, fbc: fbc ?? null,
    // Hashed here and never stored raw — a plaintext email in this table would
    // be both a match failure at Meta and a privacy problem of our own making.
    user_email_hash: email ? await sha256(String(email)) : null,
    is_bot: bot,
  };

  /* upsert, not insert: the browser retries sends, and the unique index on
     (event_id, event_type) turns a duplicate into a no-op rather than a 409. */
  const { data, error } = await admin
    .from('events')
    .upsert(row, { onConflict: 'event_id,event_type' })
    .select()
    .single();

  if (error) {
    console.error('track insert failed:', error.message);
    return new Response(null, { status: 204, headers: cors });
  }

  // Recorded, but never forwarded — see isBot.
  if (bot) return new Response(null, { status: 204, headers: cors });

  const forward = (async () => {
    const { data: pixels } = await admin
      .from('tracking_pixels')
      .select('id, platform, pixel_id, test_event_code')
      .eq('platform', 'meta')
      .eq('is_active', true);

    const token = Deno.env.get('META_CAPI_TOKEN');
    if (!token || !pixels?.length) return;

    for (const px of pixels) {
      const result = await forwardToMeta(data as TrackEvent, px, token);
      if (result.success) {
        await admin.from('events').update({ forwarded_at: new Date().toISOString() }).eq('id', data.id);
      } else if (result.retryable) {
        // Nothing is lost to a rate limit or a timeout; the queue owns it now.
        await admin.from('pixel_retry_queue').insert({
          event_id: data.id, platform: 'meta', pixel_id: px.id,
          last_error: result.error ?? null,
        });
      } else {
        console.error('meta forward failed:', result.error);
      }
    }
  })();

  // Deno keeps the isolate alive for this; the visitor does not wait for Meta.
  // @ts-ignore -- EdgeRuntime is injected by the Supabase runtime.
  if (typeof EdgeRuntime !== 'undefined') EdgeRuntime.waitUntil(forward);
  else await forward;

  return new Response(null, { status: 204, headers: cors });
});
