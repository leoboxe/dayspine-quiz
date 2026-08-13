/**
 * Resend event webhook.
 *
 * Every callback is stored. Bounces and complaints additionally write a
 * suppression, because continuing to mail an address that hard-bounced or
 * reported us as spam is the fastest way to lose a sending domain.
 *
 * A complaint is treated exactly like an unsubscribe. Somebody who hits "report
 * spam" has unsubscribed in the only way the interface offered them.
 *
 * 🔴 **SIGNED, AND FAIL CLOSED.** This endpoint runs with --no-verify-jwt, so it
 * is callable by anybody who learns the URL, and its side effect is suppressing
 * an email address. Unsigned, a single forged POST of
 * `{"type":"email.bounced","data":{"to":["someone@example.com"]}}` silently
 * removes that person from the sequence, and a script could walk a list and
 * disable the whole flow. That is a denial of service on our own mailing list
 * with no authentication required.
 *
 * Resend signs with Svix. We verify before reading the body, and we reject when
 * no secret is configured rather than falling back to trusting the payload: a
 * misconfiguration must not silently re-open the hole.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Webhook } from 'https://esm.sh/svix@1.24.0';

const SUPPRESS: Record<string, string> = {
  'email.bounced': 'bounced',
  'email.complained': 'complained',
};

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('POST only', { status: 405 });

  const secret = Deno.env.get('RESEND_WEBHOOK_SECRET') ?? '';
  if (!secret) {
    console.error('RESEND_WEBHOOK_SECRET is not set, refusing to trust the payload');
    return new Response('not configured', { status: 500 });
  }

  const raw = await req.text();
  let body: { type?: string; data?: { email_id?: string; to?: string[] } };
  try {
    body = new Webhook(secret).verify(raw, {
      'svix-id': req.headers.get('svix-id') ?? '',
      'svix-timestamp': req.headers.get('svix-timestamp') ?? '',
      'svix-signature': req.headers.get('svix-signature') ?? '',
    }) as typeof body;
  } catch {
    return new Response('bad signature', { status: 401 });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const type = body.type ?? 'unknown';
  const email = body.data?.to?.[0] ?? null;

  await supabase.from('email_events').insert({
    email,
    resend_id: body.data?.email_id ?? null,
    type,
    payload: body,
  });

  const reason = SUPPRESS[type];
  if (reason && email) {
    await supabase.from('email_suppressions').upsert({ email, reason }, { onConflict: 'email' });
    await supabase.from('email_enrollments')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('email', email).eq('status', 'active');
  }

  /* 200 on anything that verified. A non-2xx makes Resend retry, and there is
     nothing here worth retrying: the event is stored, or it is one we ignore. */
  return new Response('ok', { status: 200 });
});
