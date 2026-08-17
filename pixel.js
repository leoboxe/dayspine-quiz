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

  /* -------------------------------------------------------------------------
     Advanced matching.

     `fbq('init', ID)` with no second argument -- which is what this was --
     sends Meta NO identity at all from the browser. The browser half then
     matched on cookies alone, so an ad click in Meta's in-app browser and the
     purchase that followed were two anonymous visitors as far as the browser
     was concerned.

     We know the email from the quiz (q.html fires lead_captured with it) and
     again at checkout. Passing it to init lets Meta hash it and match on a
     person rather than a cookie.

     Values go in RAW and deliberately so: the pixel normalises and hashes them
     itself, and hashing here would risk a double hash that matches nothing. The
     server half hashes because a server must -- there is no pixel to do it.

     Read from storage first, so identity established on the quiz still applies
     on the paywall two pages later.
  ------------------------------------------------------------------------- */
  function storedIdentity() {
    try {
      var raw = sessionStorage.getItem('dayspine.id');
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  var identity = storedIdentity();
  if (identity && identity.em) {
    fbq('init', DATASET_ID, identity);
  } else {
    fbq('init', DATASET_ID);
  }
  /* PageView is NOT fired here. dayspineTrack('page_view') at the bottom fires
     it with an explicit eventID so the browser and server halves deduplicate;
     firing it here as well would report two page views for every one. */

  /* -------------------------------------------------------------------------
     Click-ID capture.

     `fbclid` arrives once, on the ad click, and is gone from the URL by the
     next page. `_fbc` is how that click is attributed to the sale three pages
     later, so it is written to a cookie the moment it is seen.

     A new fbclid always replaces an existing `_fbc`. The neighbouring rule --
     never clobber Meta's own `_fbc` -- applies when we have nothing better to
     write; it does not apply when the URL is carrying the very click being
     attributed.
  ------------------------------------------------------------------------- */
  function cookie(name) {
    /* Split, not a regex.
       This was previously `match('(^|;)\s*' + name + ...)` -- a pattern built
       from a STRING, where \s is not an escape at all and collapses to a bare
       letter "s". It therefore looked for "s_fbps=" and never matched anything,
       so fbp() and fbc() returned null on every call and every event reached
       Meta without the two cookies that carry the ad click. Nothing looked
       broken: the pixel loaded, the events fired, the match quality was just
       quietly halved.
       Splitting has no escaping hazard to get wrong a second time. */
    var parts = document.cookie ? document.cookie.split(';') : [];
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i].trim();
      if (p.indexOf(name + '=') === 0) {
        return decodeURIComponent(p.slice(name.length + 1));
      }
    }
    return null;
  }
  function setCookie(name, value, days) {
    var d = new Date();
    d.setTime(d.getTime() + days * 864e5);
    document.cookie = name + '=' + value + ';expires=' + d.toUTCString() + ';path=/;SameSite=Lax';
  }
  try {
    /* A new fbclid in the URL always wins. See middleware.js: the cookie may
       hold an older campaign, and the URL holds the click being attributed now.
       Meta's own pixel does the same thing a moment later; doing it here first
       means the page_view is not attributed to the previous ad. */
    var fbclid = new URL(location.href).searchParams.get('fbclid');
    if (fbclid) {
      setCookie('_fbc', 'fb.1.' + Date.now() + '.' + fbclid, 90);
    }
  } catch (e) {}

  /* The identity the server half cannot see. Read at send time, not now — the
     pixel writes `_fbp` asynchronously after init. */
  /* Survives a storage failure, which the sessionStorage-only version did not. */
  var purchaseId = null;

  window.dayspineMeta = {
    fbp: function () { return cookie('_fbp'); },
    fbc: function () { return cookie('_fbc'); },
    /* One id per purchase, stable across the browser event and the server
       event, and stable across a page refresh mid-checkout.
       Held in a closure variable FIRST, and only then in sessionStorage.
       The old version went straight to storage and fell back to
       'ds-' + Date.now() when it threw -- which returns a DIFFERENT id on every
       call. The two calls that matter are seconds apart (create-checkout when
       she submits, the Purchase pixel after confirmPayment returns), so the
       ids diverged, Meta saw two Purchases instead of one, and every sale
       reported double. Storage throws more often than it looks: Safari private
       mode, partitioned storage, and in-app webviews -- which is where all of
       the ad traffic arrives. Verified throwing in a real browser, where two
       back-to-back calls only agreed because they landed in the same
       millisecond.
       The closure keeps it stable for the page; sessionStorage is now only for
       surviving a refresh, and its absence costs nothing. */
    /* Re-init with advanced matching once we learn who this is. Meta supports
       calling init again to add user data, and it applies to every event fired
       afterwards. Remembered for the rest of the session so the paywall and the
       upsell inherit it without asking again.

       No PageView is fired by init in this setup, so re-initialising cannot
       double-count anything. */
    identify: function (email, name) {
      var em = (email || '').trim().toLowerCase();
      if (!em) return;
      var data = { em: em };
      if (name) {
        var parts = String(name).trim().split(/\s+/);
        if (parts.length > 1) {
          data.ln = parts[parts.length - 1].toLowerCase();
          data.fn = parts.slice(0, -1).join(' ').toLowerCase();
        } else if (parts[0]) {
          data.fn = parts[0].toLowerCase();
        }
      }
      try { sessionStorage.setItem('dayspine.id', JSON.stringify(data)); } catch (e) {}
      try { if (window.fbq) fbq('init', DATASET_ID, data); } catch (e) {}
    },
    purchaseEventId: function () {
      if (purchaseId) return purchaseId;
      var fresh = 'ds-' + Date.now() + '-' + Math.random().toString(36).slice(2, 10);
      try {
        purchaseId = sessionStorage.getItem('dayspine.eventId') || fresh;
        sessionStorage.setItem('dayspine.eventId', purchaseId);
      } catch (e) {
        purchaseId = fresh;
      }
      return purchaseId;
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
    /*
     * Read from the URL, then REMEMBER IT, exactly as the AD block below does.
     *
     * Without the memory this died at the paywall. q.html navigated with
     * `location.href = './paywall.html'` and no query string, so `?a=` was gone
     * and every downstream event lost its angle. Measured before this fix:
     * quiz_started 99/101 carried an angle, paywall_reached 1/94, add_to_cart
     * 0/18, checkout_completed 0/8. A cliff, not a decay.
     *
     * That made per-angle paywall conversion uncomputable, which is the single
     * comparison fifteen angles exist to support. It also reached Meta blind:
     * forwarding.ts maps angle to content_category, so InitiateCheckout and
     * AddToCart arrived unlabelled.
     *
     * The URL still wins when present, so a fresh click always sets the angle
     * rather than inheriting a stale one from an earlier session.
     */
    try {
      var m = /[?&]a=([A-Za-z0-9]+)/.exec(location.search);
      var fromUrl = m ? m[1].toUpperCase() : null;
      if (fromUrl) {
        sessionStorage.setItem('dayspine.angle', fromUrl);
        return fromUrl;
      }
      return sessionStorage.getItem('dayspine.angle') || null;
    } catch (e) {
      var m2 = /[?&]a=([A-Za-z0-9]+)/.exec(location.search);
      return m2 ? m2[1].toUpperCase() : null;
    }
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

    /* Any event that knows the email upgrades the browser's match quality for
       every event after it. q.html fires lead_captured with the address, which
       used to be forwarded to our server and dropped before fbq. */
    if (data.email) {
      try { window.dayspineMeta.identify(data.email, data.name); } catch (e) {}
    }

    var name = META_NAME[eventType];
    if (name && window.fbq) {
      try {
        /* value/currency ride along when the caller has them. Meta needs a value
           on AddToCart and Purchase to optimise toward revenue rather than event
           count, and an event sent without one is not corrected later. Passed
           only when present, so the events that have no natural value stay
           exactly as they were. */
        var custom = { content_category: ANGLE || undefined };
        if (typeof data.value === 'number') {
          custom.value = data.value;
          custom.currency = data.currency || 'USD';
        }
        fbq('track', name, custom, { eventID: eventId });
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
