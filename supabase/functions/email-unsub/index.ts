/**
 * Unsubscribe. GET for a human clicking the link, POST for one-click.
 *
 * ⚠️ **POST must succeed with no confirmation step and no body.** That is RFC
 * 8058, and it is what Gmail and Yahoo call when the reader hits their built in
 * unsubscribe button. Any interstitial ("are you sure?") makes one-click fail,
 * and a sender whose one-click fails gets bulk-foldered.
 *
 * The token is the enrollment UUID. It is unguessable, it is already unique per
 * lead, and the worst case for a leaked one is that somebody unsubscribes an
 * address they already knew. Signing it would add a secret to rotate for no
 * meaningful gain.
 *
 * Suppression is by EMAIL, not by enrollment, so it holds across any future
 * flow rather than just this one.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const PAGE = (msg: string) => `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Dayspine</title></head>
<body style="margin:0;background:#fff;font:16px/1.6 -apple-system,'Segoe UI',Roboto,Arial,sans-serif;color:#1a1613">
<div style="max-width:520px;margin:14vh auto;padding:0 24px">
<h1 style="font-size:26px;letter-spacing:-.02em;margin:0 0 10px">${msg}</h1>
<p style="color:#6b625a;margin:0">You will not hear from me again. If this was a mistake, just reply to any of the emails and I will put you back on.</p>
<p style="margin:26px 0 0"><a href="https://dayspine.com" style="color:#B24A05">dayspine.com</a></p>
</div></body></html>`;

async function suppress(token: string) {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
  const { data: enr } = await supabase
    .from('email_enrollments').select('id, email').eq('id', token).maybeSingle();
  if (!enr) return false;

  await supabase.from('email_suppressions')
    .upsert({ email: enr.email, reason: 'unsubscribed' }, { onConflict: 'email' });
  await supabase.from('email_enrollments')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('email', enr.email).eq('status', 'active');
  return true;
}

Deno.serve(async (req) => {
  const token = new URL(req.url).searchParams.get('u') ?? '';

  /* One-click. Must return 200 without asking anything. Returns 200 even when
     the token is unknown: telling a mail provider "that unsubscribe failed"
     when the reader has already opted out is worse than a no-op. */
  if (req.method === 'POST') {
    if (token) await suppress(token).catch(() => {});
    return new Response('ok', { status: 200 });
  }

  if (req.method !== 'GET') return new Response('method not allowed', { status: 405 });

  const ok = token ? await suppress(token).catch(() => false) : false;
  return new Response(
    PAGE(ok ? 'Unsubscribed.' : 'You are unsubscribed.'),
    { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
  );
});
