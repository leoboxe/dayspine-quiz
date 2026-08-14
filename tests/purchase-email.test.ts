import test from 'node:test';
import assert from 'node:assert/strict';
import { purchaseEmail, APP_URL, SUPPORT } from '../supabase/functions/_shared/email/purchase.ts';

const e = purchaseEmail({ email: 'buyer@example.com', items: ['core'] });

test('never points a buyer back at the paywall', () => {
  assert.doesNotMatch(e.html, /paywall\.html/, 'html still links to the offer');
  assert.doesNotMatch(e.text, /paywall\.html/, 'text still links to the offer');
});

test('sends them to the app and names their access email', () => {
  assert.match(e.html, new RegExp(APP_URL.replace(/[/.]/g, '\$&')));
  assert.match(e.text, /buyer@example\.com/);
});

test('covers BOTH platforms, since an email cannot detect the device', () => {
  assert.match(e.text, /iPhone/);
  assert.match(e.text, /Safari/);
  assert.match(e.text, /Android/);
  assert.match(e.text, /Chrome/);
});

test('gives them a route to a human, and the guarantee', () => {
  assert.match(e.text, new RegExp(SUPPORT));
  assert.match(e.text, /reply to this email/i);
  assert.match(e.text, /30 days/);
});

test('is transactional, not marketing: no unsubscribe, no sell', () => {
  assert.doesNotMatch(e.text, /Unsubscribe:/i, 'a receipt is not something you opt out of');
  assert.match(e.text, /receipt, not marketing/);
  assert.doesNotMatch(e.html + e.text, /\$49|Buy it once|worth \$/, 'do not sell to somebody who bought');
});

test('names what they actually bought, including add-ons', () => {
  const withBump = purchaseEmail({ email: 'b@c.com', items: ['core', 'printed-plan'] });
  assert.match(withBump.text, /The Printed Plan/);
  assert.match(withBump.text, /lifetime access/);
});

test('no em dashes, no placeholders', () => {
  assert.doesNotMatch(e.subject + e.html + e.text, /—|–/);
  assert.doesNotMatch(e.subject + e.html + e.text, /undefined|NaN|\{\{/);
});
