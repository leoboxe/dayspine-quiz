import test from 'node:test';
import assert from 'node:assert/strict';
import { STEPS, renderStep } from '../supabase/functions/_shared/email/templates.ts';
import { resolve } from '../supabase/functions/_shared/email/resolve.ts';

const ANGLES = ['A1', 'A4', 'A5', 'A12', 'A99'];

/** Rich row and bare row. The bare row is the one that catches fabrication. */
const rich = (angle: string) =>
  resolve({
    email: 'a@b.com', angle,
    answers: {
      barrier: angle === 'A12' ? 'eat' : 'rots', sunday: 'over2', listhow: 'hand',
      'x.store': 'aldi', 'x.cookNights': ['mon', 'tue', 'thu'],
      'p.weeklyBudget': 170, 'p.children': 2, 'p.otherAdults': 1,
      'p.diet': 'standard', 'p.allergens': [], 'p.weightLb': 168, 'p.targetLb': 145,
    },
  });
const bare = (angle: string) => resolve({ email: 'a@b.com', angle, answers: {} });

test('there are 8 steps on the specified days', () => {
  assert.equal(STEPS.length, 8);
  assert.deepEqual(STEPS.map((s) => s.day), [0, 1, 2, 3, 5, 6, 8, 10]);
});

test('every step renders for every angle, rich and bare', () => {
  for (const angle of ANGLES) {
    for (const v of [rich(angle), bare(angle)]) {
      for (let i = 0; i < STEPS.length; i++) {
        const r = renderStep(i, v);
        assert.ok(r.subject.length > 0, `${angle} step ${i} subject`);
        assert.ok(r.html.length > 200, `${angle} step ${i} html`);
        assert.ok(r.text.length > 100, `${angle} step ${i} text`);
      }
    }
  }
});

test('no unreplaced token, no undefined, no NaN', () => {
  for (const angle of ANGLES) {
    for (const v of [rich(angle), bare(angle)]) {
      for (let i = 0; i < STEPS.length; i++) {
        const r = renderStep(i, v);
        const all = `${r.subject}\n${r.html}\n${r.text}`;
        assert.doesNotMatch(all, /\{\{|\}\}/, `${angle} step ${i}: unreplaced token`);
        assert.doesNotMatch(all, /undefined|NaN|\[object Object\]/, `${angle} step ${i}: leaked placeholder`);
      }
    }
  }
});

test('no em dashes anywhere, ever', () => {
  for (const angle of ANGLES) {
    for (const v of [rich(angle), bare(angle)]) {
      for (let i = 0; i < STEPS.length; i++) {
        const r = renderStep(i, v);
        assert.doesNotMatch(`${r.subject}${r.html}${r.text}`, /—|–/, `${angle} step ${i}: em dash`);
      }
    }
  }
});

test('EVERY step sells: every one links to the offer', () => {
  for (let i = 0; i < STEPS.length; i++) {
    const r = renderStep(i, rich('A1'));
    assert.match(r.html, /quiz\.dayspine\.com\/paywall\.html/, `step ${i} html has no offer link`);
    assert.match(r.text, /quiz\.dayspine\.com\/paywall\.html/, `step ${i} text has no offer link`);
  }
});

test('prices are current, never a superseded one', () => {
  for (const angle of ANGLES) {
    for (let i = 0; i < STEPS.length; i++) {
      const r = renderStep(i, rich(angle));
      const all = `${r.subject}${r.html}${r.text}`;
      /* The lookahead matters. Competitor prices are quoted deliberately and
         factually, and Fastic really is $79.99 a year, so a bare /\$79\b/ fires
         on legitimate copy. What must never appear is OUR superseded price: a
         $79 or $19 with nothing after it. */
      assert.doesNotMatch(all, /\$79(?![.\d])/, `${angle} step ${i}: quotes our old $79`);
      assert.doesNotMatch(all, /\$19(?![.\d])/, `${angle} step ${i}: quotes the old $19 bump`);
      assert.match(all, /\$49/, `${angle} step ${i}: never states the actual price`);
    }
  }
});

test('a bare row never fabricates a personal number or a fake quote', () => {
  for (const angle of ANGLES) {
    for (let i = 0; i < STEPS.length; i++) {
      const r = renderStep(i, bare(angle));
      const all = `${r.subject}${r.text}`;
      assert.doesNotMatch(all, /\$170|\bAldi\b|Monday, Tuesday/, `${angle} step ${i}: leaked the rich fixture`);
      assert.doesNotMatch(all, /you told me you actually cook/, `${angle} step ${i}: claims an answer it does not have`);
      assert.doesNotMatch(all, /""/, `${angle} step ${i}: empty quoted string`);
    }
  }
});

test('the angle-filled steps actually differ between angles', () => {
  const a1 = renderStep(5, rich('A1')).subject;   // day 6, differentiator
  const a4 = renderStep(5, rich('A4')).subject;
  const a5 = renderStep(5, rich('A5')).subject;
  assert.notEqual(a1, a4);
  assert.notEqual(a4, a5);

  const died1 = renderStep(2, rich('A1')).text;   // day 2, why it died
  const died4 = renderStep(2, rich('A4')).text;
  assert.notEqual(died1, died4);
});

test('the barrier is quoted only when we have one', () => {
  const withBarrier = renderStep(2, rich('A1')).text;
  assert.match(withBarrier, /Half of it goes off before I use it/);
  const without = renderStep(2, bare('A1')).text;
  assert.doesNotMatch(without, /you picked/);
});

test('every email carries unsubscribe and a postal address', () => {
  for (let i = 0; i < STEPS.length; i++) {
    const r = renderStep(i, rich('A1'));
    assert.match(r.html, /Unsubscribe/i, `step ${i} html unsubscribe`);
    assert.match(r.text, /Unsubscribe:/i, `step ${i} text unsubscribe`);
    assert.match(r.html, /Sheridan, WY/, `step ${i} postal address`);
  }
});
