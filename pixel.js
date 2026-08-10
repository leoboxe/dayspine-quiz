/* ---------------------------------------------------------------------------
   Meta pixel — the browser half.

   ⭐ The base code was never installed. Every `fbq(...)` call in this funnel was
   a no-op guarded by `if (window.fbq)`, so the events were correctly named,
   correctly placed, and went nowhere. Nothing anywhere reported a problem.

   The server half lives in the Stripe webhook, which fires Purchase from where
   a payment is a fact. This half exists because a server has no cookies: it
   carries `_fbp` and `_fbc`, which are the strongest match signals Meta has,
   and it catches the funnel steps that never touch a server at all.

   Deduplication is by `event_id`: the SAME id on both halves means Meta counts
   one conversion. Get it wrong and every sale is counted twice, which inflates
   reported ROAS in the most flattering and most expensive direction.
--------------------------------------------------------------------------- */
(function () {
  var DATASET_ID = '2125302081732347';

  /* Standard Meta base snippet. */
  !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
  n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
  n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
  t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}
  (window,document,'script','https://connect.facebook.net/en_US/fbevents.js');

  fbq('init', DATASET_ID);
  /* PageView is NOT fired here. dayspineTrack('page_view') at the bottom fires
     it with an explicit eventID so the browser and server halves deduplicate;
     firing it here as well would report two page views for every one. */

  /* -------------------------------------------------------------------------
     Click-ID capture.

     `fbclid` arrives once, on the ad click, and is gone from the URL by the
     next page. `_fbc` is how that click is attributed to the sale three pages
     later, so it is written to a cookie the moment it is seen.

     Only written if Meta's pixel has not already set one — Funnel Engine hit
     exactly this bug and had to fix it: overwriting Meta's own `_fbc` destroys
     the attribution it was trying to preserve.
  ------------------------------------------------------------------------- */
  function cookie(name) {
    var m = document.cookie.match('(^|;)\s*' + name + '\s*=\s*([^;]+)');
    return m ? m.pop() : null;
  }
  function setCookie(name, value, days) {
    var d = new Date();
    d.setTime(d.getTime() + days * 864e5);
    document.cookie = name + '=' + value + ';expires=' + d.toUTCString() + ';path=/;SameSite=Lax';
  }
  try {
    var fbclid = new URL(location.href).searchParams.get('fbclid');
    if (fbclid && !cookie('_fbc')) {
      setCookie('_fbc', 'fb.1.' + Date.now() + '.' + fbclid, 90);
    }
  } catch (e) {}

  /* The identity the server half cannot see. Read at send time, not now — the
     pixel writes `_fbp` asynchronously after init. */
  window.dayspineMeta = {
    fbp: function () { return cookie('_fbp'); },
    fbc: function () { return cookie('_fbc'); },
    /* One id per purchase, stable across the browser event and the server
       event, and stable across a page refresh mid-checkout. */
    purchaseEventId: function () {
      try {
        var id = sessionStorage.getItem('dayspine.eventId');
        if (!id) {
          id = 'ds-' + Date.now() + '-' + Math.random().toString(36).slice(2, 10);
          sessionStorage.setItem('dayspine.eventId', id);
        }
        return id;
      } catch (e) {
        return 'ds-' + Date.now();
      }
    },
  };

  /* -------------------------------------------------------------------------
     The two halves, fired together.

     Everything below Purchase goes out twice on purpose: `fbq` from the browser
     where the cookies live, and `/api/t` from our own origin where an ad
     blocker cannot reach. Both carry the same `event_id`, so Meta unions the
     match signals and still counts one.

     `/api/t` rather than the Supabase URL directly. A request to *.supabase.co
     is a third-party request and is blocked by exactly the lists that just
     blocked the pixel, which would leave both halves dead for the same visitor
     -- the one case where redundancy buys nothing.
  ------------------------------------------------------------------------- */
  var ANGLE = (function () {
    try {
      var m = /[?&]a=([A-Za-z0-9]+)/.exec(location.search);
      return m ? m[1].toUpperCase() : null;
    } catch (e) { return null; }
  })();

  /* Ad-level attribution, passed through by the ad's URL parameters. Read once
     and remembered, because they are gone from the URL by the next page. */
  var AD = (function () {
    var keep = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term',
                'ad_id', 'adset_id', 'campaign_id', 'ad_name', 'adset_name',
                'campaign_name', 'placement'];
    var out = {};
    try {
      var q = new URL(location.href).searchParams;
      var saved = JSON.parse(sessionStorage.getItem('dayspine.ad') || '{}');
      keep.forEach(function (k) { if (q.get(k)) out[k] = q.get(k); });
      out = Object.keys(out).length ? out : saved;
      sessionStorage.setItem('dayspine.ad', JSON.stringify(out));
    } catch (e) {}
    return out;
  })();

  var META_NAME = {
    page_view: 'PageView',
    quiz_started: 'ViewContent',
    quiz_completed: 'ViewContent',
    lead_captured: 'Lead',
    paywall_reached: 'InitiateCheckout',
    checkout_reached: 'InitiateCheckout',
    add_to_cart: 'AddToCart',
  };

  window.dayspineTrack = function (eventType, data) {
    data = data || {};
    var eventId = data.event_id
      || 'ds-' + eventType + '-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);

    var name = META_NAME[eventType];
    if (name && window.fbq) {
      try {
        fbq('track', name, { content_category: ANGLE || undefined }, { eventID: eventId });
      } catch (e) {}
    }

    var payload = {
      event_type: eventType,
      event_id: eventId,
      angle: ANGLE,
      page_slug: location.pathname.replace(/^\/|\.html$/g, '') || 'index',
      event_source_url: location.href,
      referrer: document.referrer || null,
      fbp: window.dayspineMeta.fbp(),
      fbc: window.dayspineMeta.fbc(),
      fbclid: new URL(location.href).searchParams.get('fbclid'),
    };
    Object.keys(AD).forEach(function (k) { payload[k] = AD[k]; });
    Object.keys(data).forEach(function (k) { payload[k] = data[k]; });

    try {
      /* keepalive so the send survives the navigation it is often reporting --
         a lead event fired as the page unloads is exactly the one worth having. */
      fetch('/api/t', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch(function () {});
    } catch (e) {}

    return eventId;
  };

  /* The only PageView. Fires both halves under one id. */
  window.dayspineTrack('page_view');
})();
