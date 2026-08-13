import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from '../supabase/functions/_shared/email/resolve.ts';

/* Leo's actual row, 2026-08-10, angle A1. Uses the OLD `p.` prefix, which is
   exactly why it is the fixture: it is the shape half the table is in. */
const LEO_ROW = {
  email: 'leoboxe15@gmail.com',
  angle: 'A1',
  answers: {
    aim: 'none', barrier: 'toomuch', listhow: 'hand', sunday: 'over2',
    'p.allergens': [], 'p.avoid': [], 'p.children': 0, 'p.otherAdults': 2,
    'p.cookNights': ['wed'], 'p.cookTime': '15', 'p.diet': 'standard',
    'p.goal': 'maintain', 'p.store': 'costco', 'p.weeklyBudget': 140,
    wantsTraining: 'yes', yes: 'definitely',
  },
};

/* A row in the NEW `x.` shape, which is what every lead since 2026-08-12 has. */
const NEW_ROW = {
  email: 'new@example.com',
  angle: 'A1',
  answers: {
    barrier: 'rots', sunday: '1-2',
    'x.store': 'aldi', 'x.cookNights': ['mon', 'tue', 'thu'],
    'p.weeklyBudget': 170, 'p.children': 2, 'p.otherAdults': 1,
    'p.diet': 'standard', 'p.allergens': [], 'p.weightLb': 168, 'p.targetLb': 145,
  },
};

test('reads the OLD p. prefix', () => {
  const v = resolve(LEO_ROW);
  assert.equal(v.store, 'Costco');
  assert.equal(v.budget, '$140');
  assert.equal(v.cookNightCount, '1');
  assert.equal(v.cookNights, 'Wednesday');
  assert.equal(v.householdSize, '3');
});

test('reads the NEW x. prefix', () => {
  const v = resolve(NEW_ROW);
  assert.equal(v.store, 'Aldi');
  assert.equal(v.cookNightCount, '3');
  assert.equal(v.cookNights, 'Monday, Tuesday and Thursday');
  assert.equal(v.householdSize, '4');
  assert.equal(v.poundsToGo, '23');
  assert.equal(v.hasWeightGoal, 'true');
});

test('resolves the barrier code to the wording they actually read', () => {
  assert.equal(resolve(LEO_ROW).barrier, 'I buy far more than we get through');
  assert.equal(resolve(NEW_ROW).barrier, 'Half of it goes off before I use it');
});

test('the barrier map is per angle, never merged across quizzes', () => {
  // A12 asks a completely different barrier question. Same key, same code space.
  const a12 = resolve({ email: 'a@b.com', angle: 'A12', answers: { barrier: 'eat' } });
  assert.equal(a12.barrier, 'I eat everything, then hate myself');
  // A1 has no 'eat' option, so it must resolve to empty rather than borrow A12's.
  const a1 = resolve({ email: 'a@b.com', angle: 'A1', answers: { barrier: 'eat' } });
  assert.equal(a1.barrier, '');
  assert.equal(a1.hasBarrier, 'false');
});

test('NEVER returns undefined, NaN or a null-ish string', () => {
  for (const row of [LEO_ROW, NEW_ROW, { email: 'x@y.z', angle: 'A99', answers: {} }]) {
    for (const [k, val] of Object.entries(resolve(row))) {
      assert.equal(typeof val, 'string', `${k} is not a string`);
      assert.doesNotMatch(val, /undefined|NaN|\[object/, `${k} leaked: ${val}`);
    }
  }
});

test('an absent number is flagged absent, never substituted', () => {
  const v = resolve({ email: 'x@y.z', angle: 'A1', answers: { barrier: 'rots' } });
  assert.equal(v.hasBudget, 'false');
  assert.equal(v.budget, '');
  assert.equal(v.hasWeightGoal, 'false');
  assert.equal(v.poundsToGo, '');
});

test('an unknown angle falls back to the default pack without throwing', () => {
  const v = resolve({ email: 'x@y.z', angle: 'A99', answers: { barrier: 'whatever' } });
  assert.equal(v.angle, 'A99');
  assert.ok(v.villain.length > 0);
  assert.ok(v.differentiator.length > 0);
});

test('no em dash survives into any merge value', () => {
  for (const row of [LEO_ROW, NEW_ROW]) {
    for (const [k, val] of Object.entries(resolve(row))) {
      assert.doesNotMatch(val, /—|–/, `${k} contains a dash: ${val}`);
    }
  }
});

test('labels.json is in sync with the live quiz definitions', () => {
  const before = readFileSync('supabase/functions/_shared/email/labels.json', 'utf8');
  execFileSync('node', ['scripts/build-quiz-labels.js'], { stdio: 'pipe' });
  const after = readFileSync('supabase/functions/_shared/email/labels.json', 'utf8');
  assert.equal(after, before, 'labels.json is stale. Run: node scripts/build-quiz-labels.js');
});
