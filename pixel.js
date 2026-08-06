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
  fbq('track', 'PageView');

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
})();
