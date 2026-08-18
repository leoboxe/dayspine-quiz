-- Persist the recovered Meta click id on the order.
--
-- `recoverClickIds` has been running inside the Stripe webhook since the click
-- id was first stored, and it works: on 2026-08-17 it recovered a buyer's
-- 15 Aug click for a purchase made 62 hours later, in a different browser.
--
-- But it only ever existed in flight. The recovered id went into the Meta
-- payload and was never written down, so `orders.fbc` still read null
-- afterwards and the only proof the recovery had happened at all was a line in
-- the edge function logs. Whether a given sale carried its click id was not
-- answerable in SQL.
--
-- Two consequences, one of them a real bug:
--   * diagnosis required log archaeology inside the 24h log window, after
--     which the answer is simply gone;
--   * a webhook retry after `capi_sent_at` is set skips the whole block, so a
--     resend would go out WITHOUT the click id that the first attempt found.
--
-- Writing it back fixes both, and makes the recovery idempotent: once `fbc` is
-- populated, `recoverClickIds` returns early and does no lookup at all.
alter table orders add column if not exists fbc_recovered_at timestamptz;

comment on column orders.fbc_recovered_at is
  'Set when fbc was recovered from the lead''s stored click rather than sent by the buyer''s browser. Null means the browser supplied it (or there is none).';
