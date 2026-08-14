-- Dedupe the purchase confirmation.
--
-- email_sends already has UNIQUE(enrollment_id, step), but a confirmation has
-- no enrollment, and Postgres treats NULLs as distinct in a unique constraint.
-- So two NULL-enrollment rows for the same buyer would both be accepted and a
-- retried Stripe delivery would send two receipts.
--
-- Stripe delivers at-least-once and retries until it gets a 2xx, so this is a
-- when, not an if.
create unique index if not exists email_sends_one_confirmation
  on email_sends (email) where step = -1;
