-- `complete` must only ever go false -> true.
--
-- save-quiz is called twice: once on email entry (complete=false, so an
-- abandoned quiz is still a lead) and once on completion (complete=true). The
-- email screen sits immediately before the build screen, so those two writes
-- leave the browser a few hundred milliseconds apart and can arrive in either
-- order. When the lead write lands second it overwrites the completion, and the
-- row ends up with every answer present and complete=false.
--
-- That is the one state that actually hurts: the app reads quiz_answers on
-- first sign-in to skip plan setup, so a buyer whose row says false is asked to
-- take the quiz again after paying -- the exact thing this table exists to
-- prevent. Observed on two full automated runs (A8 and A5): 27 answers stored,
-- complete=false, updated_at earlier than created_at.
--
-- Fixing it in the client would mean ordering two independent requests, which
-- is not something a client can guarantee. Here it is guaranteed regardless of
-- arrival order, and it keeps working for any future caller.

create or replace function quiz_answers_monotonic()
returns trigger
language plpgsql
as $$
begin
  new.complete := coalesce(old.complete, false) or coalesce(new.complete, false);
  -- Same reasoning for the clock: a late-arriving earlier write must not make
  -- the row look older than it is.
  new.updated_at := greatest(old.updated_at, new.updated_at);
  return new;
end
$$;

drop trigger if exists quiz_answers_monotonic_trg on quiz_answers;

create trigger quiz_answers_monotonic_trg
  before update on quiz_answers
  for each row
  execute function quiz_answers_monotonic();
