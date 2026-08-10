/*
 * save-quiz — the only bridge the answers can cross.
 *
 * A buyer answers the quiz inside Instagram's in-app browser and then installs
 * the PWA, which runs in Safari or Chrome. Those are different browsers with
 * separate storage jars, so nothing written to localStorage in the quiz is ever
 * visible to the installed app. The answers have to go through the server, and
 * the only identifier that exists on both sides of the purchase is the email.
 *
 * Called twice on purpose:
 *   - once when she enters her email, so an abandoned quiz is still a lead
 *   - once when the quiz completes, with complete=true
 * Upsert on lower(email) means the second call overwrites the first and a
 * retried request is harmless.
 *
 * Deliberately NOT folded into create-checkout. That function takes money; it
 * should not grow a second responsibility whose failure could take a payment
 * with it. If this one 500s the buyer still buys, and the answers are
 * recoverable from the client on next open.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);

  let body: { email?: string; angle?: string; answers?: unknown; complete?: boolean };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'bad json' }, 400);
  }

  const email = (body.email || '').trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ error: 'bad email' }, 400);

  const angle = (body.angle || 'A3').slice(0, 8);
  const answers = body.answers && typeof body.answers === 'object' ? body.answers : {};

  // A quiz is a few dozen short answers. Anything larger is not a quiz.
  const size = JSON.stringify(answers).length;
  if (size > 20000) return json({ error: 'answers too large' }, 413);

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { error } = await supabase
    .from('quiz_answers')
    .upsert(
      {
        email,
        angle,
        answers,
        complete: body.complete === true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'email' },
    );

  if (error) {
    console.error('save-quiz upsert failed', error.message);
    return json({ error: 'save failed' }, 500);
  }
  return json({ ok: true });
});
