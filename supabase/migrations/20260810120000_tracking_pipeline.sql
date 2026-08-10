-- Server-side tracking pipeline, ported from Funnel Engine.
--
-- Funnel Engine's version is funnel-scoped: pixels hang off `funnel_pixels`
-- keyed by funnel_id. Dayspine is a single product with a single pixel, so that
-- junction would be a join against a constant. Everything else is kept faithful
-- -- the event shape, the hashed-PII columns, the bot flag and the retry queue
-- -- so fixes can be carried between the two in either direction.
--
-- What replaces funnel_id is `angle`: A1..A15, the ad a visitor arrived from.
-- That is the dimension we actually need to slice conversions by, and putting it
-- on the event means per-angle attribution comes through the same pipeline
-- rather than a parallel one bolted on later.

-- ---------------------------------------------------------------- pixels ----
create table if not exists tracking_pixels (
  id            uuid primary key default gen_random_uuid(),
  platform      text not null check (platform in ('meta', 'tiktok', 'google')),
  pixel_id      text not null,
  -- Null for platforms where we only run the browser half. A pixel with no
  -- token still forwards nothing server-side rather than erroring.
  access_token  text,
  -- Set only while verifying in Meta's Test Events tool. Left null in normal
  -- operation: a stale test code silently diverts live events into the test
  -- stream, where they never reach optimisation.
  test_event_code text,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now()
);

create unique index if not exists tracking_pixels_platform_pixel
  on tracking_pixels (platform, pixel_id);

-- ---------------------------------------------------------------- events ----
create table if not exists events (
  id             uuid primary key default gen_random_uuid(),
  created_at     timestamptz not null default now(),

  event_type     text not null,
  -- Shared with the browser pixel so Meta counts one conversion, not two.
  event_id       text not null,
  visitor_id     text not null,
  session_id     text,

  angle          text,
  page_slug      text,
  order_id       uuid,

  ip_address     text,
  user_agent     text,
  referrer       text,
  event_source_url text,

  utm_source     text,
  utm_medium     text,
  utm_campaign   text,
  utm_content    text,
  utm_term       text,

  ad_id          text,
  adset_id       text,
  campaign_id    text,
  ad_name        text,
  adset_name     text,
  campaign_name  text,
  placement      text,

  metadata       jsonb,
  revenue_cents  integer,

  fbclid         text,
  gclid          text,
  ttclid         text,
  fbp            text,
  fbc            text,

  -- Advanced matching. Hashed before insert, never stored raw: a raw email here
  -- is both a match failure at Meta and a privacy incident in our own database.
  user_email_hash   text,
  user_phone_hash   text,
  user_fn_hash      text,
  user_ln_hash      text,
  user_city_hash    text,
  user_state_hash   text,
  user_zip_hash     text,
  user_country_hash text,

  -- Bots are recorded but never forwarded. Dropping them entirely would hide
  -- how much of the traffic is junk; forwarding them poisons optimisation.
  is_bot         boolean not null default false,
  forwarded_at   timestamptz
);

create index if not exists events_created_at on events (created_at desc);
create index if not exists events_visitor    on events (visitor_id);
create index if not exists events_angle_type on events (angle, event_type);
-- The browser can retry a send; the same event_id must not become two rows.
create unique index if not exists events_dedup on events (event_id, event_type);

-- ----------------------------------------------------------- retry queue ----
create table if not exists pixel_retry_queue (
  id             uuid primary key default gen_random_uuid(),
  event_id       uuid not null references events (id) on delete cascade,
  platform       text not null,
  pixel_id       uuid not null references tracking_pixels (id) on delete cascade,
  attempts       int not null default 0,
  last_error     text,
  status         text not null default 'pending' check (status in ('pending', 'failed')),
  next_retry_at  timestamptz not null default now(),
  created_at     timestamptz not null default now()
);

create index if not exists retry_queue_status on pixel_retry_queue (status, next_retry_at);

-- ------------------------------------------------------------------- RLS ----
-- All three are written only by the edge function, which uses the service role
-- and bypasses RLS. Enabling it with no policies means anon and authenticated
-- get nothing -- important, because `events` holds hashed PII and every pixel
-- access token lives in `tracking_pixels`.
alter table events            enable row level security;
alter table tracking_pixels   enable row level security;
alter table pixel_retry_queue enable row level security;
