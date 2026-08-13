-- The post-quiz lead email sequence.
--
-- RLS is on with NO policies on every table here, service role only, because all
-- of them hold raw email addresses. Same posture as `events`, and for the same
-- reason: a readable policy on any of these is a list leak.

create table if not exists email_enrollments (
  id            uuid primary key default gen_random_uuid(),
  email         text not null,
  angle         text,
  flow          text not null default 'lead-nurture-v1',
  step          int  not null default 0,
  status        text not null default 'active',       -- active | done | cancelled
  next_due_at   timestamptz not null default now(),
  quiz_answers  jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (email, flow)
);
create index if not exists email_enrollments_due
  on email_enrollments (status, next_due_at);

-- One row per attempted send. The unique constraint is what makes the processor
-- safe to run twice: a step that already has a row cannot be sent again, so an
-- overlapping cron tick or a retried invocation cannot double-mail somebody.
create table if not exists email_sends (
  id            uuid primary key default gen_random_uuid(),
  enrollment_id uuid references email_enrollments(id) on delete cascade,
  email         text not null,
  step          int  not null,
  subject       text,
  resend_id     text,
  status        text not null,                        -- sent | failed
  error         text,
  created_at    timestamptz not null default now(),
  unique (enrollment_id, step)
);

create table if not exists email_suppressions (
  email      text primary key,
  reason     text not null,                           -- unsubscribed | bounced | complained
  created_at timestamptz not null default now()
);

create table if not exists email_events (
  id         uuid primary key default gen_random_uuid(),
  email      text,
  resend_id  text,
  type       text not null,
  payload    jsonb,
  created_at timestamptz not null default now()
);
create index if not exists email_events_resend on email_events (resend_id);

-- The kill switch. Everything ships with this false. Gate 3 is the single UPDATE
-- that turns real sending on, and nothing before it can reach a lead.
create table if not exists email_flow_config (
  flow    text primary key,
  enabled boolean not null default false
);

alter table email_enrollments  enable row level security;
alter table email_sends        enable row level security;
alter table email_suppressions enable row level security;
alter table email_events       enable row level security;
alter table email_flow_config  enable row level security;

insert into email_flow_config (flow, enabled)
  values ('lead-nurture-v1', false)
  on conflict (flow) do nothing;
