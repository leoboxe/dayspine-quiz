/**
 * Same-origin proxy for unsubscribe.
 *
 * The link in every email has to live on dayspine.com rather than on a
 * supabase.co URL. A recipient who hovers an unsubscribe link and sees a
 * stranger's domain does not click it, they hit "report spam", and a complaint
 * costs far more than an unsubscribe.
 *
 * Forwards GET (a human clicking) and POST (RFC 8058 one-click, which Gmail and
 * Yahoo call on the reader's behalf). The POST path must stay free of redirects
 * and confirmations or one-click fails.
 */
const FN = 'https://guixatihuqwfhzvnrkvb.supabase.co/functions/v1/email-unsub';

export default async function handler(req, res) {
  const token = (req.query && req.query.u) || '';
  const url = `${FN}?u=${encodeURIComponent(token)}`;

  try {
    const upstream = await fetch(url, {
      method: req.method === 'POST' ? 'POST' : 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    const body = await upstream.text();
    res.status(upstream.status);
    res.setHeader(
      'Content-Type',
      upstream.headers.get('content-type') || 'text/html; charset=utf-8',
    );
    res.send(body);
  } catch (e) {
    /* Never show an error page here. A reader who clicked unsubscribe and saw a
       failure reports spam instead, and we would rather lose the record than
       the reputation. The suppression is retried by the provider's one-click. */
    res.status(200).send('<!doctype html><meta charset="utf-8"><p>You are unsubscribed.</p>');
  }
}
