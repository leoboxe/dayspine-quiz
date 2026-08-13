import test from 'node:test';
import assert from 'node:assert/strict';
import { nextDueAt, shouldSend, DAYS } from '../supabase/functions/email-process/schedule.ts';
import { buildPayload } from '../supabase/functions/_shared/email/send.ts';
import { STEPS } from '../supabase/functions/_shared/email/templates.ts';

const T0 = new Date('2026-08-13T09:00:00.000Z');

test('the schedule matches the templates, step for step', () => {
  assert.deepEqual(DAYS, STEPS.map((s) => s.day));
});

test('each step is due on its own day, measured from enrolment', () => {
  // step 0 sent -> step 1 is day 1 -> +1 day from enrolment
  assert.equal(nextDueAt(0, T0), '2026-08-14T09:00:00.000Z');
  // step 3 is day 3, step 4 is day 5 -> +2 days
  assert.equal(nextDueAt(3, T0), '2026-08-15T09:00:00.000Z');
  // step 6 is day 8, step 7 is day 10 -> +2 days
  assert.equal(nextDueAt(6, T0), '2026-08-15T09:00:00.000Z');
});

test('the last step ends the sequence rather than scheduling forever', () => {
  assert.equal(nextDueAt(STEPS.length - 1, T0), null);
});

const gate = (over = {}) =>
  ({ enabled: true, suppressed: false, status: 'active', alreadySent: false, ...over });

test('sends only when every gate is open', () => {
  assert.equal(shouldSend(gate()), true);
});

test('the kill switch blocks everything', () => {
  assert.equal(shouldSend(gate({ enabled: false })), false);
});

test('a suppressed address never sends', () => {
  assert.equal(shouldSend(gate({ suppressed: true })), false);
});

test('a cancelled enrollment never sends (this is the buyer guard)', () => {
  assert.equal(shouldSend(gate({ status: 'cancelled' })), false);
  assert.equal(shouldSend(gate({ status: 'done' })), false);
});

test('a step that already has a send row never sends again', () => {
  assert.equal(shouldSend(gate({ alreadySent: true })), false);
});

test('payload carries one-click unsubscribe, which Gmail requires', () => {
  const p = buildPayload({ to: 'a@b.com', subject: 's', html: '<p>h</p>', text: 't', unsubUrl: 'https://u/1' });
  assert.equal(p.headers['List-Unsubscribe'], '<https://u/1>');
  assert.equal(p.headers['List-Unsubscribe-Post'], 'List-Unsubscribe=One-Click');
});

test('payload always has a plain text alternative', () => {
  const p = buildPayload({ to: 'a@b.com', subject: 's', html: '<p>h</p>', text: 't', unsubUrl: 'https://u' });
  assert.ok(p.text.length > 0);
});

test('payload sends from the subdomain and replies to support', () => {
  const p = buildPayload({ to: 'a@b.com', subject: 's', html: '<p>h</p>', text: 't', unsubUrl: 'https://u' });
  assert.match(p.from, /@send\.dayspine\.com>/);
  assert.match(p.reply_to, /support@dayspine\.com/);
});
