-- A buyer must never keep receiving a sequence that argues about price.
--
-- stripe-webhook already cancels in grant(), which is the one path every paid
-- order takes today. This makes the database enforce it instead of trusting
-- that every future path remembers: a manual grant, a support fix, a new
-- checkout flow, or a backfill all cancel the emails now.
--
-- Belt and braces on purpose. The application rule stays; this makes it an
-- invariant rather than a convention.
create or replace function cancel_email_flow_on_grant() returns trigger
language plpgsql security definer as $$
begin
  update email_enrollments
     set status = 'cancelled', updated_at = now()
   where lower(email) = lower(new.email)
     and status = 'active';
  return new;
end;
$$;

drop trigger if exists trg_cancel_email_flow_on_grant on addon_grants;
create trigger trg_cancel_email_flow_on_grant
  after insert on addon_grants
  for each row execute function cancel_email_flow_on_grant();
