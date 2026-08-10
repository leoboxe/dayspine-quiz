/**
 * First-party identity, set by the server.
 *
 * This is the piece Funnel Engine's Cloudflare Worker does that a static site
 * cannot, and it is worth more than it looks. `_fbp` written by Meta's own
 * JavaScript is a document.cookie write, and Safari's ITP caps those at seven
 * days — so a visitor who clicks an ad on Monday and buys the following week is
 * a different person as far as attribution is concerned. The same cookie
 * written by a server in a Set-Cookie header lives the full ninety.
 *
 * Everything here is written only when absent. Meta's pixel is authoritative
 * for its own cookies when it gets there first; overwriting `_fbc` in
 * particular destroys the click attribution it exists to carry, which Funnel
 * Engine had to learn the hard way and `pixel.js` already guards against on the
 * browser side.
 */

export const config = {
  /* HTML only. Running this on assets would spend a function invocation on
     every font and image to set cookies that are already set. */
  matcher: ['/', '/((?!api|assets|_vercel|.*\\.[a-z0-9]+$).*)'],
};

const YEAR = 60 * 60 * 24 * 365;
const NINETY_DAYS = 60 * 60 * 24 * 90;

/** Meta's format exactly: fb.1.<ms since epoch>.<random>. */
function fbp() {
  return `fb.1.${Date.now()}.${Math.floor(Math.random() * 1e10)}`;
}

/** Ten bytes of hex, enough to be unique without being fingerprintable. */
function visitorId() {
  const b = new Uint8Array(10);
  crypto.getRandomValues(b);
  return [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
}

export default function middleware(request) {
  const url = new URL(request.url);
  const jar = request.cookies;
  const res = new Response(null, { headers: { 'x-middleware-next': '1' } });

  const put = (name, value, maxAge) => {
    res.headers.append(
      'set-cookie',
      `${name}=${value}; Path=/; Max-Age=${maxAge}; SameSite=Lax; Secure`,
    );
  };

  // Primary identity, ours. Survives across the quiz, the paywall and back.
  if (!jar.get('_ds_vid')) put('_ds_vid', visitorId(), YEAR);

  // Meta browser id. Written here so it is a real ninety-day cookie.
  if (!jar.get('_fbp')) put('_fbp', fbp(), NINETY_DAYS);

  /* The click id arrives once, in the URL, and is gone by the next page. This
     is the only moment it can be captured. */
  const fbclid = url.searchParams.get('fbclid');
  if (fbclid && !jar.get('_fbc')) {
    put('_fbc', `fb.1.${Date.now()}.${fbclid}`, NINETY_DAYS);
  }

  return res;
}
