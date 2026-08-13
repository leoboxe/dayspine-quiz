/**
 * Resend event webhook.
 *
 * Every callback is stored. Bounces and complaints additionally write a
 * suppression, because continuing to mail an address that hard-bounced or
 * reported us as spam is the fastest way to lose a sending domain.
 *
 * A complaint is treated exactly like an unsubscribe. Somebody who hits "report
 * spam" has unsubscribed in the only way the interface offered them.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPPRESS: Record<string, string> = {
  'email.bounced': 'bounced',
  'email.complained': 'complained',
};

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('POST only', { status: 405 });

  let body: { type?: string; data?: { email_id?: string; to?: string[] } };
  try {
    body = await req.json();
  } catch {
    return new Response('bad json', { status: 400 });
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

  /* Always 200. A non-2xx makes Resend retry, and there is nothing here worth
     retrying: the event is already stored or it is one we do not act on. */
  return new Response('ok', { status: 200 });
});
