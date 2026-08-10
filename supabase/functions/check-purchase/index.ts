import { createClient } from 'jsr:@supabase/supabase-js@2';

/**
 * Does this email address have a Dayspine purchase behind it?
 *
 * The sign-in wall asks before sending a magic link, so somebody who mistyped
 * the address they bought with is told immediately rather than staring at an
 * inbox that will never receive anything. That failure mode is worse than it
 * sounds: the person is a paying customer, locked out of a product they own,
 * with nothing anywhere telling them why.
 *
 * Returns a bare boolean — never which add-ons, never when, never how much. It
 * is unauthenticated by necessity (there is no session yet), so it must not
 * become a way to read the customer list.
 *
 * 🔴 It does let someone test whether a given address bought Dayspine, one
 * address at a time. That is an accepted trade for telling real buyers the
 * truth about a typo. If it ever matters, the fix is a signed token handed over
 * by the funnel — not removing the check.
 */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceKey) return json({ error: 'not_configured' }, 500);

  let body: { email?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'bad_request' }, 400);
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ known: false }, 200);

  const admin = createClient(url, serviceKey);
  const { data, error } = await admin
    .from('addon_grants')
    .select('addon')
    .ilike('email', email)
    .limit(1);

  /**
   * Fail OPEN on a server error, never closed.
   *
   * A database blip must not lock a paying customer out of what they own. The
   * magic link still proves the address, and `claim-addons` grants only what
   * actually exists — so the worst case of being wrong here is a stranger
   * receiving an email and then finding an empty account.
   */
  if (error) return json({ known: true, degraded: true }, 200);

  return json({ known: (data?.length ?? 0) > 0 }, 200);
});
