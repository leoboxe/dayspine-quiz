/**
 * The first-party event proxy.
 *
 * Funnel Engine serves `/t` from the same origin as the funnel, and that is the
 * entire trick: `quiz.dayspine.com/api/t` is a request to the site you are
 * already on, while a direct call to `*.supabase.co` is a third-party request
 * that uBlock and Safari treat exactly like the pixel they just blocked.
 *
 * The proxy also supplies the two things the browser cannot prove about itself
 * and the edge function has no other way to learn: the real client IP and the
 * real user agent. Without them every event arrives looking like it came from
 * Supabase's data centre, which costs match quality and defeats bot filtering.
 */

export const config = { runtime: 'edge' };

const UPSTREAM = 'https://guixatihuqwfhzvnrkvb.supabase.co/functions/v1/track';

export default async function handler(request) {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'content-type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
    });
  }
  if (request.method !== 'POST') {
    return new Response('method not allowed', { status: 405 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response('bad json', { status: 400 });
  }

  /* Cookies are read here rather than trusted from the payload. The browser
     sends what it can see; this is what the server actually set, and on Safari
     those are not the same thing. */
  const jar = request.headers.get('cookie') || '';
  const cookie = (name) => {
    const m = jar.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]+)'));
    return m ? decodeURIComponent(m[1]) : null;
  };

  /* Vercel's middleware bridge collapses repeated Set-Cookie headers and keeps
     only the last one, so middleware sets them in priority order and whatever
     lost that race is repaired here. A function response is a normal response
     and carries as many cookies as it likes, so this is the reliable half. */
  const backfill = [];
  const YEAR = 60 * 60 * 24 * 365;
  const NINETY = 60 * 60 * 24 * 90;
  const put = (n, v, age) =>
    backfill.push([n, `${n}=${v}; Path=/; Max-Age=${age}; SameSite=Lax; Secure`]);

  let vid = body.visitor_id || cookie('_ds_vid');
  if (!vid) {
    const b = new Uint8Array(10);
    crypto.getRandomValues(b);
    vid = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
    put('_ds_vid', vid, YEAR);
  }

  let fbp = body.fbp || cookie('_fbp');
  if (!fbp) {
    fbp = `fb.1.${Date.now()}.${Math.floor(Math.random() * 1e10)}`;
    put('_fbp', fbp, NINETY);
  }

  const enriched = {
    ...body,
    fbp,
    fbc: body.fbc || cookie('_fbc'),
    visitor_id: vid,
  };

  const ip = (request.headers.get('x-forwarded-for') || '').split(',')[0].trim();

  try {
    await fetch(UPSTREAM, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(ip ? { 'x-forwarded-for': ip } : {}),
        'x-real-user-agent': request.headers.get('user-agent') || '',
      },
      body: JSON.stringify(enriched),
    });
  } catch (err) {
    // Analytics must never surface as a broken page.
    console.error('track proxy failed:', String(err));
  }

  const headers = [
    ['Cache-Control', 'no-store'],
    ['Access-Control-Allow-Origin', '*'],
    ...backfill.map(([, v]) => ['set-cookie', v]),
  ];
  return new Response(null, { status: 204, headers });
}
