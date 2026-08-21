/**
 * The processor. Runs every 5 minutes on cron.
 *
 * Reads enrollments that are due, renders the step against the lead's own quiz
 * answers, sends it, and advances.
 *
 * Three rules that are not negotiable:
 *
 * 1. **The kill switch is checked first, every run.** `email_flow_config.enabled`
 *    ships false. Until a human flips it, this function does everything except
 *    the send, which means the whole pipeline gets exercised before a single
 *    real lead is mailed.
 *
 * 2. **Advance on failure.** If Resend errors, the enrollment still moves to the
 *    next step and the failure is recorded. Retrying forever parks a lead on a
 *    broken step permanently, which is the failure Funnel Engine hit and fixed
 *    the same way.
 *
 * 3. **The send row is written BEFORE the send.** `email_sends` has
 *    UNIQUE(enrollment_id, step), so an overlapping cron tick or a retried
 *    invocation collides on the insert instead of mailing somebody twice. A
 *    duplicate email is worse than a missing one.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { STEPS, renderStep } from '../_shared/email/templates.ts';
import { resolve } from '../_shared/email/resolve.ts';
import { sendEmail } from '../_shared/email/send.ts';
import { nextDueAt, shouldSend } from './schedule.ts';

const FLOW = 'lead-nurture-v1';
const BATCH = 50;
const UNSUB_BASE = 'https://quiz.dayspine.com/api/unsub';

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
  const apiKey = Deno.env.get('RESEND_API_KEY') ?? '';

  const { data: cfg } = await supabase
    .from('email_flow_config').select('enabled').eq('flow', FLOW).maybeSingle();
  const enabled = cfg?.enabled === true;

  const { data: due, error } = await supabase
    .from('email_enrollments')
    .select('id, email, angle, market, step, status, quiz_answers, created_at')
    .eq('status', 'active')
    .eq('flow', FLOW)
    .lte('next_due_at', new Date().toISOString())
    .limit(BATCH);

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });

  const result = { enabled, considered: due?.length ?? 0, sent: 0, failed: 0, skipped: 0 };

  for (const e of due ?? []) {
    const step = e.step ?? 0;
    if (step >= STEPS.length) {
      await supabase.from('email_enrollments').update({ status: 'done' }).eq('id', e.id);
      continue;
    }

    const { data: sup } = await supabase
      .from('email_suppressions').select('email').eq('email', e.email).maybeSingle();
    const { data: already } = await supabase
      .from('email_sends').select('id').eq('enrollment_id', e.id).eq('step', step).maybeSingle();

    const gate = {
      enabled,
      suppressed: Boolean(sup),
      status: e.status,
      alreadySent: Boolean(already),
    };

    if (!shouldSend(gate)) {
      result.skipped++;
      /* A suppressed lead is cancelled outright rather than left to come back
         round on the next tick forever. */
      if (gate.suppressed) {
        await supabase.from('email_enrollments')
          .update({ status: 'cancelled', updated_at: new Date().toISOString() }).eq('id', e.id);
      }
      continue;
    }

    const v = resolve({ email: e.email, angle: e.angle, market: e.market, answers: e.quiz_answers ?? {} });
    const unsubUrl = `${UNSUB_BASE}?u=${e.id}`;
    const r = renderStep(step, v, unsubUrl);

    // Claim the step first. The unique index makes this the concurrency guard.
    const { error: claimErr } = await supabase.from('email_sends').insert({
      enrollment_id: e.id, email: e.email, step, subject: r.subject, status: 'sending',
    });
    if (claimErr) { result.skipped++; continue; } // another tick has it

    const sent = await sendEmail(
      { to: e.email, subject: r.subject, html: r.html, text: r.text, unsubUrl },
      apiKey,
    );

    await supabase.from('email_sends')
      .update({
        status: sent.ok ? 'sent' : 'failed',
        resend_id: sent.id ?? null,
        error: sent.error ?? null,
      })
      .eq('enrollment_id', e.id).eq('step', step);

    sent.ok ? result.sent++ : result.failed++;

    // Advance regardless of the send result. See rule 2.
    const enrolledAt = new Date(e.created_at);
    const next = nextDueAt(step, enrolledAt);
    await supabase.from('email_enrollments').update({
      step: step + 1,
      status: next === null ? 'done' : 'active',
      next_due_at: next ?? new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', e.id);
  }

  return new Response(JSON.stringify(result), {
    status: 200, headers: { 'Content-Type': 'application/json' },
  });
});
