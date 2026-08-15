/**
 * Recover a buyer's original ad click, when the browser at checkout has lost it.
 *
 * ### The problem this exists for
 *
 * `_fbc` is the Meta click id, and it is the single strongest attribution signal
 * a Purchase can carry. It is written as a first-party cookie the moment
 * somebody arrives from an ad with an `fbclid`.
 *
 * All of our ad traffic arrives inside **Meta's in-app browser**. The email
 * sequence, which is the whole point of collecting a lead, sends them a link
 * that opens in **Gmail's browser or Safari**. Those are separate cookie jars,
 * so a lead who buys on day 3 from an email arrives with **no `_fbc` and no
 * `_fbp` at all**, and the order records none.
 *
 * The Purchase still fires and Meta still accepts it. It just arrives without
 * the click, so the sale is never joined back to the ad that produced it. That
 * failure is silent and it flatters nothing: Stripe shows the revenue, Meta
 * shows a conversion, and the ad simply looks worse than it is while the
 * optimiser learns from an incomplete picture.
 *
 * It is the same cookie-jar problem the quiz answers hit, and it has the same
 * shape of fix: the identifier has to survive server-side, keyed on the only
 * thing present on both sides of the gap, which is the email.
 *
 * ### Why this is legitimate
 *
 * We are not inventing a click. That person really did click that ad, on this
 * domain, and we recorded the id at the time. Meta's own Conversions API
 * guidance is to capture `fbc` on arrival, store it, and send it with
 * conversions that happen later. This does exactly that, and only ever fills a
 * gap: a click id present on the order is always preferred and never replaced.
 */
import { sha256 } from './forwarding.ts';

export interface RecoveredClick {
  fbp: string | null;
  fbc: string | null;
  /** True when anything was actually recovered, for logging. */
  recovered: boolean;
}

/**
 * Look up the click ids this email arrived with, most recent first.
 *
 * `events` stores the email only as a SHA-256 hash, so the lookup hashes the
 * buyer's address the same way rather than reading anything back in plaintext.
 *
 * @param admin  a service-role Supabase client
 * @param email  the buyer's address, raw
 * @param have   what the order already carries, which always wins
 */
export async function recoverClickIds(
  // deno-lint-ignore no-explicit-any
  admin: any,
  email: string,
  have: { fbp?: string | null; fbc?: string | null },
): Promise<RecoveredClick> {
  const out: RecoveredClick = { fbp: have.fbp ?? null, fbc: have.fbc ?? null, recovered: false };

  // Nothing to do when the browser already gave us the click.
  if (out.fbc) return out;

  try {
    const hash = await sha256(email);
    const { data } = await admin
      .from('events')
      .select('fbp, fbc, created_at')
      .eq('user_email_hash', hash)
      .not('fbc', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1);

    const row = data?.[0];
    if (row?.fbc) {
      out.fbc = row.fbc;
      // Only fill fbp if the order had none either. A live fbp from this
      // browser is a better signal than a stale one from another.
      if (!out.fbp && row.fbp) out.fbp = row.fbp;
      out.recovered = true;
    }
  } catch (_e) {
    // Never let attribution recovery break a webhook that has taken money.
    // A Purchase with a weaker match is worth far more than a failed one.
  }

  return out;
}
