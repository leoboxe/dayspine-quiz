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
  /* Documents only. Running this on assets would spend a function invocation on
     every font and image to set cookies that are already set.
     Excluding "anything with an extension" is the obvious way to write this and
     it is wrong here: every page in this funnel is a literal .html file, so that
     version silently skips the entire site and sets no cookies anywhere. Assets
     are therefore excluded by naming their extensions, and .html is not one. */
  matcher: [
    '/',
    '/((?!api/|assets/|_vercel|.*\\.(?:js|mjs|css|map|png|jpg|jpeg|gif|svg|webp|ico|woff|woff2|ttf|mp4|webm|json|txt|xml)$).*)',
  ],
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

  /* `request.cookies` is a Next.js convenience that does not exist here -- this
     is framework-agnostic middleware, so the request is a plain Request and the
     header has to be parsed by hand. Reading it as if it were NextRequest
     throws on every page load, which takes the whole site down rather than just
     the tracking. */
  const jar = request.headers.get('cookie') || '';
  const has = (name) => new RegExp('(?:^|;\\s*)' + name + '=').test(jar);

  /* Collected as tuples and handed to the Headers constructor in one go.
     headers.append('set-cookie', ...) looks like the natural way to write this
     and quietly loses all but the last cookie in this runtime -- the symptom is
     a page that sets _fbc correctly and never sets _fbp or a visitor id at all,
     which looks like working attribution right up until you check. An array of
     entries is the one form that reliably survives as repeated headers. */
  const out = [['x-middleware-next', '1']];

  /* Meta's pixel writes _fbp and _fbc on the registrable domain. A host-only
     cookie of the same name is a DIFFERENT cookie, so without this the browser
     ends up holding two _fbp values and whichever is read first wins -- which
     was visible in testing as _fbp and _fbc each appearing twice. Matching the
     domain means we are writing the same cookie Meta would have written, only
     earlier and from the server. Skipped on preview hosts and localhost, where
     there is no registrable domain worth scoping to. */
  const host = url.hostname;
  const domain = host.endsWith('dayspine.com') ? '; Domain=.dayspine.com' : '';

  const put = (name, value, maxAge) => {
    out.push([
      'set-cookie',
      `${name}=${value}; Path=/${domain}; Max-Age=${maxAge}; SameSite=Lax; Secure`,
    ]);
  };

  // Primary identity, ours. Survives across the quiz, the paywall and back.
  if (!has('_ds_vid')) put('_ds_vid', visitorId(), YEAR);

  // Meta browser id. Written here so it is a real ninety-day cookie.
  if (!has('_fbp')) put('_fbp', fbp(), NINETY_DAYS);

  /* The click id arrives once, in the URL, and is gone by the next page, so
     this is the only moment it can be captured.
     A new fbclid in the URL always wins, even over an existing _fbc. The
     tempting rule is "never overwrite _fbc", but that is about not clobbering a
     good value with a stale one -- here the URL carries the click being
     attributed right now, and the cookie holds an older campaign. Skipping the
     write credits the new visit to the previous ad until Meta's own pixel
     corrects it, which showed up in testing as a page_view attributed to the
     previous click while every later event on the same page had the new one. */
  const fbclid = url.searchParams.get('fbclid');
  if (fbclid) {
    put('_fbc', `fb.1.${Date.now()}.${fbclid}`, NINETY_DAYS);
  }

  return new Response(null, { headers: out });
}
