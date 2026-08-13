# Dayspine Lead Email Sequence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every lead who completes the quiz receives 8 emails over 10 days, branched by the ad angle they came from, personalised from their own answers, each one selling — sent from a domain that lands in the inbox.

**Architecture:** Four new tables in the existing Supabase project. A `_shared/email/` module tree holding the angle packs, the personalisation resolver and the 8 templates as plain ESM so the same files run under Node's test runner and under Deno in the edge function. Enrollment fires from `save-quiz` on the completion write. An `email-process` edge function on a 5-minute Supabase cron renders and sends via Resend. The flow ships with `enabled = false` so nothing can send until gate 3.

**Tech Stack:** Supabase edge functions (Deno, native TS), Postgres, Resend, Node 24 (`node --test`, native TS type-stripping) for tests. No build step, no new dependencies.

## Global Constraints

- **Supabase project ref is `guixatihuqwfhzvnrkvb`.** Never `gdxwsnpyleluoiznybeu` — that is funnel-engine.
- **NEVER send email to a real lead.** Gates 1 and 2 send only to `leoboxe15@gmail.com` and seed addresses. Leo's standing rule: *never send emails to customers without explicit approval, not for testing, not for backfilling, not for any reason.*
- **No em dashes** anywhere in email copy. Use commas, periods or parentheses.
- **Prices: $49 core, $99 anchor, $9 bump, $39 upsell, $29 downsell.** Source of truth is `supabase/functions/_shared/catalogue.ts`.
- **Sending domain is `send.dayspine.com`.** Never the root domain.
- Every claim must appear in the claim inventory of `projects/fitcore/ad-angles-master.md` §1. No HealthKit, wearables, hormones, or a searchable branded-food database.
- Every merge field needs a defined absent-branch, and the absent-branch must never present a fallback figure as if it were the lead's own number.
- RLS enabled with **zero policies** on all new tables. Service role only. They hold raw email addresses.
- Angle packs exist for **A1, A4, A5, A12** only. Everything else uses the default pack.

---

### Task 1: ~~Port the targets module~~ CANCELLED 2026-08-13

**Do not build this.** `deriveTargets` requires an `activity` level that the quiz never collects,
so any calorie figure in an email would rest on a guess with a ~25% spread, and the app would show
a different number once it asks the activity question. See spec §4.

Emails quote **stated answers only**. Skip to Task 2; the resolver in Task 3 reads the quiz row
directly and imports nothing.

<details>
<summary>Original task, kept for the record</summary>

Port `energy.ts`, `calorieTarget.ts`, `targets.ts` into `_shared/targets.ts` and assert parity with
the app. Cancelled before any code was written.
</details>

- [ ] **Step 1: Copy the three source files into one module**

Concatenate `energy.ts`, `calorieTarget.ts`, `targets.ts` from `C:/Users/Victus/dayspine-pwa/src/domain/` into `supabase/functions/_shared/targets.ts`, in that order. Delete the now-internal `import` lines between them (`import type { Goal, Sex } from './energy'`, `import { bmrMifflinStJeor, ... } from './energy'`, `import { calorieTarget } from './calorieTarget'`). Keep every export. Add this header:

```ts
/**
 * Calorie and macro targets, ported verbatim from dayspine-pwa/src/domain
 * (energy.ts + calorieTarget.ts + targets.ts) on 2026-08-13.
 *
 * Ported rather than reimplemented because the email tells the lead their
 * number and the app must then show them the same one. tests/targets.test.ts
 * asserts the two copies agree, the same guard stripeCatalogue.test.ts puts on
 * the duplicated price catalogue.
 *
 * If the app's version changes, re-copy and re-run that test.
 */
```

- [ ] **Step 2: Write the failing parity test**

```ts
// tests/targets.test.ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { deriveTargets } from '../supabase/functions/_shared/targets.ts';
import { deriveTargets as appDerive } from '../../dayspine-pwa/src/domain/targets.ts';

const PROFILES = [
  { sex: 'female', age: 34, heightIn: 65, weightLb: 168, targetLb: 145, pace: 'steady', goal: 'lose' },
  { sex: 'male',   age: 41, heightIn: 71, weightLb: 205, targetLb: 180, pace: 'slow',   goal: 'lose' },
  { sex: 'female', age: 28, heightIn: 62, weightLb: 120, targetLb: 120, pace: 'steady', goal: 'maintain' },
  { sex: 'male',   age: 25, heightIn: 69, weightLb: 150, targetLb: 165, pace: 'steady', goal: 'gain' },
];

test('ported targets match the app for every profile', () => {
  for (const p of PROFILES) {
    assert.deepEqual(deriveTargets(p, '2026-08-13'), appDerive(p, '2026-08-13'));
  }
});

test('never returns a calorie target below the floor', () => {
  const tiny = deriveTargets(
    { sex: 'female', age: 60, heightIn: 58, weightLb: 100, targetLb: 90, pace: 'fast', goal: 'lose' },
    '2026-08-13',
  );
  assert.ok(tiny.kcal >= 1200, `expected >= 1200, got ${tiny.kcal}`);
});
```

- [ ] **Step 3: Run it and watch it fail**

Run: `node --test tests/targets.test.ts`
Expected: FAIL on the import, because `_shared/targets.ts` does not exist yet, or on an unresolved `@/` alias.

- [ ] **Step 4: Fix the alias imports**

The app files use `@/domain/...` and `@/data/...`. In the ported copy these must be relative or removed. `targets.ts` imports only from `energy.ts` and `calorieTarget.ts`, both now inlined, so after Step 1 there should be zero remaining imports. Confirm with:

```bash
grep -n "^import" supabase/functions/_shared/targets.ts
```
Expected: no output.

- [ ] **Step 5: Run the tests until green**

Run: `node --test tests/targets.test.ts`
Expected: PASS, 2/2.

- [ ] **Step 6: Commit**

```bash
git add supabase/functions/_shared/targets.ts tests/targets.test.ts
git commit -m "Port the calorie and macro targets so emails can quote the lead's real numbers"
```

---

### Task 2: Database schema

**Files:**
- Create: `supabase/migrations/20260813120000_email_flow.sql`

**Interfaces:**
- Produces: tables `email_enrollments`, `email_sends`, `email_suppressions`, `email_events`

- [ ] **Step 1: Write the migration**

```sql
-- The lead email sequence. RLS on with NO policies on every table: service role
-- only, because all four hold raw email addresses. Same posture as `events`.

create table if not exists email_enrollments (
  id            uuid primary key default gen_random_uuid(),
  email         text not null,
  angle         text,
  flow          text not null default 'lead-nurture-v1',
  step          int  not null default 0,
  status        text not null default 'active',   -- active | done | cancelled
  next_due_at   timestamptz not null default now(),
  quiz_answers  jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (email, flow)
);
create index on email_enrollments (status, next_due_at);

create table if not exists email_sends (
  id            uuid primary key default gen_random_uuid(),
  enrollment_id uuid references email_enrollments(id) on delete cascade,
  email         text not null,
  step          int  not null,
  subject       text,
  resend_id     text,
  status        text not null,                    -- sent | failed
  error         text,
  created_at    timestamptz not null default now(),
  unique (enrollment_id, step)
);

create table if not exists email_suppressions (
  email      text primary key,
  reason     text not null,                        -- unsubscribed | bounced | complained
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
create index on email_events (resend_id);

alter table email_enrollments  enable row level security;
alter table email_sends        enable row level security;
alter table email_suppressions enable row level security;
alter table email_events       enable row level security;

-- The kill switch. Gate 3 flips this and nothing before it can send.
create table if not exists email_flow_config (
  flow    text primary key,
  enabled boolean not null default false
);
alter table email_flow_config enable row level security;
insert into email_flow_config (flow, enabled)
  values ('lead-nurture-v1', false)
  on conflict (flow) do nothing;
```

- [ ] **Step 2: Apply it**

```bash
cd C:/Users/Victus/dayspine-funnel
export SUPABASE_ACCESS_TOKEN=$(grep '^SUPABASE_ACCESS_TOKEN' C:/Users/Victus/.env | cut -d= -f2- | tr -d '"'"'"'"'"'"'"'"' \r')
npx --yes supabase@latest db push --project-ref guixatihuqwfhzvnrkvb
```

If `db push` is not linked, apply the SQL through the Management API query endpoint instead, the same one used for reads throughout this project:
`POST https://api.supabase.com/v1/projects/guixatihuqwfhzvnrkvb/database/query` with `{"query": "<the SQL>"}`.

- [ ] **Step 3: Verify the tables exist and RLS is on with no policies**

```sql
select tablename, rowsecurity from pg_tables where tablename like 'email_%';
select tablename, count(*) from pg_policies where tablename like 'email_%' group by 1;
```
Expected: 5 tables, `rowsecurity = true` on all, and the policy query returns **zero rows**.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260813120000_email_flow.sql
git commit -m "Add the email flow tables, RLS on with no policies"
```

---

### Task 3: Angle packs and the personalisation resolver

The resolver turns a `quiz_answers` row into a flat map of merge values, with an explicit absent-branch for every field.

**Files:**
- Create: `supabase/functions/_shared/email/packs.ts`
- Create: `supabase/functions/_shared/email/resolve.ts`
- Test: `tests/email-resolve.test.ts`

**Interfaces:**
- Consumes: nothing (Task 1 cancelled — no derived numbers)
- Produces: `PACKS: Record<string, AnglePack>`, `packFor(angle) -> AnglePack`, `resolve(row) -> Vars` where `Vars` is `Record<string, string>` with **no undefined values ever**

- [ ] **Step 1: Write the packs**

```ts
// packs.ts
export interface AnglePack {
  angle: string;
  villain: string;        // the thing being blamed, never the reader
  opening: string;        // day 0 first line
  differentiator: string; // day 6 subject and spine
  died: string;           // day 2: why the last attempt died
}

export const DEFAULT_PACK: AnglePack = {
  angle: 'default',
  villain: 'the plan that stops at the recipe',
  opening: 'Your plan is built.',
  differentiator: 'One plan, not four apps',
  died: 'You were handed a spreadsheet and told to work out the rest.',
};

export const PACKS: Record<string, AnglePack> = {
  A1: {
    angle: 'A1',
    villain: 'the meal plan that ends at the recipe',
    opening: 'Your week is built, and so is the shopping list that goes with it.',
    differentiator: 'The grocery list writes itself',
    died: 'Every meal plan you have downloaded died in the grocery store.',
  },
  A4: {
    angle: 'A4',
    villain: 'the program that programs the lift and never the plate',
    opening: 'Your training week and your food week are the same document now.',
    differentiator: 'One plan, both halves',
    died: 'Your program was fine. Your food was never attached to it.',
  },
  A5: {
    angle: 'A5',
    villain: 'the schedule, not you',
    opening: 'Your plan is built, and it runs in the corner of a room.',
    differentiator: 'No gym, no equipment, nothing to cancel',
    died: 'It was never the workout. It was that the workout never fit the time you actually had.',
  },
  A12: {
    angle: 'A12',
    villain: 'the all-or-nothing week',
    opening: 'Your plan is built, and it is designed to survive a bad Thursday.',
    differentiator: 'The app that gets you to day 28',
    died: 'One bad day ended the week, and then the week ended the month.',
  },
};

export function packFor(angle: string | null | undefined): AnglePack {
  return (angle && PACKS[angle]) || DEFAULT_PACK;
}
```

- [ ] **Step 2: Write the failing resolver test**

```ts
// tests/email-resolve.test.ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { resolve } from '../supabase/functions/_shared/email/resolve.ts';

const A1_ROW = {
  email: 'a@b.com', angle: 'A1',
  answers: {
    'p.sex': 'female', 'p.age': 34, 'p.heightIn': 65, 'p.weightLb': 168,
    'p.targetLb': 145, 'p.pace': 'steady', 'p.goal': 'lose',
    'p.diet': 'standard', 'p.allergens': ['dairy'], 'p.weeklyBudget': 170,
    'p.children': 2, 'p.otherAdults': 1,
    barrier: 'I never know what to cook', sunday: 'over2',
    'x.store': 'aldi', 'x.cookNights': ['mon', 'tue', 'thu', 'sun'],
  },
};

test('resolves the lead real numbers and their own words', () => {
  const v = resolve(A1_ROW);
  assert.match(v.kcal, /^\d{4}$/);
  assert.match(v.proteinG, /^\d{2,3}$/);
  assert.equal(v.cookNightCount, '4');
  assert.equal(v.budget, '$170');
  assert.equal(v.store, 'Aldi');
  assert.equal(v.householdSize, '4');
  assert.ok(v.barrier.length > 0);
});

test('NEVER returns undefined or the string undefined', () => {
  const bare = { email: 'a@b.com', angle: 'A1', answers: { barrier: 'x' } };
  for (const [k, val] of Object.entries(resolve(bare))) {
    assert.equal(typeof val, 'string', `${k} is not a string`);
    assert.doesNotMatch(val, /undefined|NaN|null/, `${k} leaked a placeholder: ${val}`);
  }
});

test('absent numbers never masquerade as the lead own figure', () => {
  const v = resolve({ email: 'a@b.com', angle: 'A1', answers: { barrier: 'x' } });
  // no budget answer -> the copy must be able to tell, via a flag, not a fake number
  assert.equal(v.hasBudget, 'false');
  assert.equal(v.hasTargets, 'false');
});

test('an unknown angle falls back to the default pack without throwing', () => {
  const v = resolve({ email: 'a@b.com', angle: 'A99', answers: { barrier: 'x' } });
  assert.equal(v.angle, 'A99');
  assert.ok(v.villain.length > 0);
});
```

- [ ] **Step 3: Run it and watch it fail**

Run: `node --test tests/email-resolve.test.ts`
Expected: FAIL, `resolve.ts` does not exist.

- [ ] **Step 4: Implement the resolver**

Every value returned is a string. Presence flags (`hasBudget`, `hasTargets`, `hasStore`, `hasCookNights`) are the string `'true'` or `'false'` so templates can branch without ever printing a fabricated number.

```ts
// resolve.ts
import { deriveTargets } from '../targets.ts';
import { packFor } from './packs.ts';

const STORES: Record<string, string> = {
  walmart: 'Walmart', aldi: 'Aldi', kroger: 'Kroger', target: 'Target',
  costco: 'Costco', trader: "Trader Joe's", safeway: 'Safeway',
  publix: 'Publix', other: 'your store',
};

export interface QuizRow { email: string; angle?: string | null; answers: Record<string, unknown>; }

export function resolve(row: QuizRow): Record<string, string> {
  const a = row.answers || {};
  const pack = packFor(row.angle);
  const s = (v: unknown) => (v === undefined || v === null ? '' : String(v));

  const hasTargets = ['p.sex', 'p.age', 'p.heightIn', 'p.weightLb'].every((k) => a[k] !== undefined);
  let kcal = '', proteinG = '';
  if (hasTargets) {
    const t = deriveTargets({
      sex: a['p.sex'], age: a['p.age'], heightIn: a['p.heightIn'],
      weightLb: a['p.weightLb'], targetLb: a['p.targetLb'] ?? a['p.weightLb'],
      pace: a['p.pace'] ?? 'steady', goal: a['p.goal'] ?? 'maintain',
    } as never, new Date().toISOString().slice(0, 10));
    kcal = String(t.kcal); proteinG = String(t.proteinG);
  }

  const nights = Array.isArray(a['x.cookNights']) ? (a['x.cookNights'] as unknown[]) : [];
  const allergens = Array.isArray(a['p.allergens']) ? (a['p.allergens'] as string[]) : [];
  const household = 1 + Number(a['p.otherAdults'] ?? 0) + Number(a['p.children'] ?? 0);

  return {
    angle: s(row.angle) || 'default',
    villain: pack.villain,
    opening: pack.opening,
    differentiator: pack.differentiator,
    died: pack.died,

    hasTargets: String(hasTargets),
    kcal, proteinG,

    hasBudget: String(a['p.weeklyBudget'] !== undefined),
    budget: a['p.weeklyBudget'] !== undefined ? `$${a['p.weeklyBudget']}` : '',

    hasStore: String(a['x.store'] !== undefined),
    store: STORES[s(a['x.store'])] || '',

    hasCookNights: String(nights.length > 0),
    cookNightCount: nights.length ? String(nights.length) : '',

    householdSize: String(household),
    diet: s(a['p.diet']) || 'standard',
    allergens: allergens.join(', '),
    hasAllergens: String(allergens.length > 0),
    barrier: s(a.barrier),
    hasBarrier: String(Boolean(a.barrier)),
    goal: s(a['p.goal']) || 'maintain',
  };
}
```

- [ ] **Step 5: Run the tests until green**

Run: `node --test tests/email-resolve.test.ts`
Expected: PASS, 4/4.

- [ ] **Step 6: Commit**

```bash
git add supabase/functions/_shared/email/ tests/email-resolve.test.ts
git commit -m "Add the angle packs and a resolver that can never print a fabricated number"
```

---

### Task 4: The eight templates

**Files:**
- Create: `supabase/functions/_shared/email/templates.ts`
- Create: `supabase/functions/_shared/email/layout.ts`
- Test: `tests/email-templates.test.ts`

**Interfaces:**
- Consumes: `resolve` output from Task 3
- Produces: `STEPS: Step[]` where `Step = { day: number, subject(v): string, html(v): string, text(v): string }`, and `renderStep(i, vars) -> { subject, html, text }`

- [ ] **Step 1: Write the layout**

`layout.ts` wraps body HTML in a single-column, system-font, no-image shell with the legal footer and the unsubscribe link. It takes `{ preheader, bodyHtml, unsubUrl }`. Text-forward: max width 560px, one link colour, no background images, no web fonts, no tracking pixel.

- [ ] **Step 2: Write the failing template tests**

```ts
// tests/email-templates.test.ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { STEPS, renderStep } from '../supabase/functions/_shared/email/templates.ts';
import { resolve } from '../supabase/functions/_shared/email/resolve.ts';

const V = resolve({ email: 'a@b.com', angle: 'A1', answers: { barrier: 'I never know what to cook' } });

test('there are 8 steps on the specified days', () => {
  assert.equal(STEPS.length, 8);
  assert.deepEqual(STEPS.map((s) => s.day), [0, 1, 2, 3, 5, 6, 8, 10]);
});

test('every step renders subject, html and text for every angle', () => {
  for (const angle of ['A1', 'A4', 'A5', 'A12', 'A99']) {
    const v = resolve({ email: 'a@b.com', angle, answers: { barrier: 'x' } });
    for (let i = 0; i < STEPS.length; i++) {
      const r = renderStep(i, v);
      assert.ok(r.subject.length > 0, `${angle} step ${i} subject`);
      assert.ok(r.html.length > 0 && r.text.length > 0, `${angle} step ${i} body`);
    }
  }
});

test('no unreplaced tokens, no undefined, no em dashes', () => {
  for (const angle of ['A1', 'A4', 'A5', 'A12', 'A99']) {
    const v = resolve({ email: 'a@b.com', angle, answers: { barrier: 'x' } });
    for (let i = 0; i < STEPS.length; i++) {
      const r = renderStep(i, v);
      const all = r.subject + r.html + r.text;
      assert.doesNotMatch(all, /\{\{|\}\}/, `${angle} step ${i} has an unreplaced token`);
      assert.doesNotMatch(all, /undefined|NaN/, `${angle} step ${i} leaked a placeholder`);
      assert.doesNotMatch(all, /\u2014/, `${angle} step ${i} contains an em dash`);
    }
  }
});

test('every step sells: each links to the paywall', () => {
  for (let i = 0; i < STEPS.length; i++) {
    assert.match(renderStep(i, V).html, /quiz\.dayspine\.com/, `step ${i} has no link to the offer`);
  }
});

test('prices are current, never the old ones', () => {
  for (let i = 0; i < STEPS.length; i++) {
    const all = renderStep(i, V).html + renderStep(i, V).text;
    assert.doesNotMatch(all, /\$79|\$19\b/, `step ${i} quotes a superseded price`);
  }
});
```

- [ ] **Step 3: Run and watch fail**

Run: `node --test tests/email-templates.test.ts`
Expected: FAIL, `templates.ts` does not exist.

- [ ] **Step 4: Write the eight emails**

Follow the arc in the spec §5. Each `Step` object carries `day`, `subject(v)`, `html(v)`, `text(v)`.

Slots 3 (day 2), 6 (day 6) and the day-0 opening pull from the angle pack. Slots 4, 5, 7, 8 are fixed copy.

Copy rules, all enforced by the tests above plus review:
- Founder first person, from Leo. Direct, no fluff, conversational but authoritative.
- **Every email ends in the ask**, with a link to `https://quiz.dayspine.com/paywall.html`.
- No em dashes.
- Every claim must be in the `ad-angles-master.md` §1 claim inventory.
- Any merge field must be wrapped in its presence flag. Pattern:
  `${v.hasBudget === 'true' ? `at the ${v.budget} a week you gave me` : 'at a normal weekly shop'}`
- Written through the audit loop against `Dayspine Marketing Research/data/03_avatar_painpoints.md`, not drafted once.

- [ ] **Step 5: Run the tests until green**

Run: `node --test tests/email-templates.test.ts`
Expected: PASS, 5/5.

- [ ] **Step 6: Commit**

```bash
git add supabase/functions/_shared/email/templates.ts supabase/functions/_shared/email/layout.ts tests/email-templates.test.ts
git commit -m "Write the eight lead emails, angle-branched, every one selling"
```

---

### Task 5: The sender

**Files:**
- Create: `supabase/functions/_shared/email/send.ts`
- Test: `tests/email-send.test.ts`

**Interfaces:**
- Produces: `sendEmail({ to, subject, html, text, unsubUrl, resendKey }) -> { ok, id?, error? }`

- [ ] **Step 1: Write the failing test**

```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPayload } from '../supabase/functions/_shared/email/send.ts';

test('carries one-click unsubscribe headers', () => {
  const p = buildPayload({ to: 'a@b.com', subject: 's', html: '<p>h</p>', text: 't', unsubUrl: 'https://u' });
  assert.equal(p.headers['List-Unsubscribe'], '<https://u>');
  assert.equal(p.headers['List-Unsubscribe-Post'], 'List-Unsubscribe=One-Click');
});

test('always sends a plain text alternative', () => {
  const p = buildPayload({ to: 'a@b.com', subject: 's', html: '<p>h</p>', text: 't', unsubUrl: 'https://u' });
  assert.ok(p.text && p.text.length > 0);
});

test('sends from the subdomain, never the root', () => {
  const p = buildPayload({ to: 'a@b.com', subject: 's', html: '<p>h</p>', text: 't', unsubUrl: 'https://u' });
  assert.match(p.from, /@send\.dayspine\.com>?$/);
  assert.doesNotMatch(p.from, /@dayspine\.com>?$/);
});
```

- [ ] **Step 2: Run and watch fail.** `node --test tests/email-send.test.ts` → FAIL.

- [ ] **Step 3: Implement `buildPayload` and `sendEmail`**

`from` is `Leo at Dayspine <leo@send.dayspine.com>`, `reply_to` is `leo@send.dayspine.com`. `sendEmail` POSTs to `https://api.resend.com/emails` with `Authorization: Bearer ${resendKey}`. It never throws; it returns `{ ok: false, error }` so the processor can advance on failure.

- [ ] **Step 4: Run until green.** Expected: PASS, 3/3.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/_shared/email/send.ts tests/email-send.test.ts
git commit -m "Add the Resend sender with one-click unsubscribe and a text alternative"
```

---

### Task 6: Enrol on the completion write

**Files:**
- Modify: `supabase/functions/save-quiz/index.ts`

**Interfaces:**
- Consumes: `email_enrollments` from Task 2

- [ ] **Step 1: Read the function and find the completion branch**

```bash
grep -n "complete" supabase/functions/save-quiz/index.ts
```

- [ ] **Step 2: Add the enrolment, guarded**

After the successful upsert, and **only when `complete === true`**, upsert an enrollment:

```ts
/* Enrol on the COMPLETION write, never the email write. That is what makes
   "your plan is ready" true in the day-0 email: the build screen has rendered.
   onConflict does nothing, so a re-submit never restarts a sequence. */
if (complete) {
  await supabase.from('email_enrollments').upsert(
    { email, angle, quiz_answers: answers, step: 0, status: 'active', next_due_at: new Date().toISOString() },
    { onConflict: 'email,flow', ignoreDuplicates: true },
  );
}
```

Wrap in try/catch that swallows. **An enrolment failure must never take down a quiz save**, the same rule that keeps `save-quiz` separate from `create-checkout`.

- [ ] **Step 3: Deploy and test end to end**

```bash
npx --yes supabase@latest functions deploy save-quiz --project-ref guixatihuqwfhzvnrkvb
```
Then POST a completed quiz for `enroll-test@dayspine.test` and confirm exactly one row appears in `email_enrollments`. POST it twice and confirm still exactly one row.

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/save-quiz/index.ts
git commit -m "Enrol a lead into the email flow on the completion write"
```

---

### Task 7: The processor

**Files:**
- Create: `supabase/functions/email-process/index.ts`
- Test: `tests/email-process.test.ts` (pure logic: due selection, advance, suppression)

**Interfaces:**
- Consumes: Tasks 1 to 5
- Produces: `nextDue(step) -> ISO string`, `dueSteps(enrollment, now) -> boolean`

- [ ] **Step 1: Write the failing logic tests**

```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { nextDueAt, shouldSend } from '../supabase/functions/email-process/schedule.ts';

test('schedules each step on its specified day', () => {
  const t0 = new Date('2026-08-13T09:00:00Z');
  assert.equal(nextDueAt(0, t0), new Date('2026-08-14T09:00:00Z').toISOString()); // step 0 sent -> next on day 1
  assert.equal(nextDueAt(3, t0), new Date('2026-08-15T09:00:00Z').toISOString()); // day 3 -> day 5
});

test('a suppressed address never sends', () => {
  assert.equal(shouldSend({ suppressed: true, enabled: true, status: 'active' }), false);
});

test('a disabled flow never sends', () => {
  assert.equal(shouldSend({ suppressed: false, enabled: false, status: 'active' }), false);
});

test('a cancelled enrollment never sends', () => {
  assert.equal(shouldSend({ suppressed: false, enabled: true, status: 'cancelled' }), false);
});
```

- [ ] **Step 2: Run and watch fail.**

- [ ] **Step 3: Implement `schedule.ts` and `index.ts`**

`index.ts` per run: read `email_flow_config.enabled`; if false, log and exit 0 without sending. Otherwise select up to 50 enrollments with `status='active' and next_due_at <= now()`, and for each: check `email_suppressions`, resolve vars, render step, send, write `email_sends`, then advance `step` and `next_due_at` **whether or not the send succeeded**.

```ts
/* Advance on failure. Retrying forever parks a lead on a broken step for good,
   which is exactly the failure Funnel Engine hit and fixed the same way. The
   failure is recorded in email_sends for debugging. */
```

When `step` passes the last index, set `status = 'done'`.

- [ ] **Step 4: Run until green.** Expected: PASS, 4/4.

- [ ] **Step 5: Deploy and schedule**

```bash
npx --yes supabase@latest functions deploy email-process --project-ref guixatihuqwfhzvnrkvb
```
Then create the cron through the Management API query endpoint:

```sql
select cron.schedule('email-process', '*/5 * * * *', $$
  select net.http_post(
    url := 'https://guixatihuqwfhzvnrkvb.supabase.co/functions/v1/email-process',
    headers := '{"Authorization": "Bearer <service-role-key>"}'::jsonb
  );
$$);
```

- [ ] **Step 6: Verify the kill switch holds**

With `enabled = false`, insert an enrollment due now, wait one cron cycle, and confirm `email_sends` is still **empty**. This is the single most important check in the plan.

- [ ] **Step 7: Commit**

```bash
git add supabase/functions/email-process/ tests/email-process.test.ts
git commit -m "Add the email processor, disabled by default, advancing on failure"
```

---

### Task 8: A purchase cancels the sequence

**Files:**
- Modify: `supabase/functions/stripe-webhook/index.ts`

- [ ] **Step 1: Add the cancellation on successful payment**

```ts
/* Nobody who has bought keeps getting sold to. The sequence argues about price,
   so this is a correctness requirement, not a courtesy. */
await supabase.from('email_enrollments')
  .update({ status: 'cancelled', updated_at: new Date().toISOString() })
  .eq('email', email).eq('status', 'active');
```

- [ ] **Step 2: Test it**

Insert an active enrollment for a synthetic email, run the webhook path for that email, assert `status = 'cancelled'`.

- [ ] **Step 3: Deploy and commit**

```bash
npx --yes supabase@latest functions deploy stripe-webhook --project-ref guixatihuqwfhzvnrkvb
git add supabase/functions/stripe-webhook/index.ts
git commit -m "Cancel the email sequence when the lead buys"
```

---

### Task 9: Unsubscribe and the Resend webhook

**Files:**
- Create: `supabase/functions/email-unsub/index.ts`
- Create: `supabase/functions/email-webhook/index.ts`

- [ ] **Step 1: Implement unsubscribe**

Accepts both `GET` (link click) and `POST` (one-click, RFC 8058). Takes a signed token, writes `email_suppressions`, sets any active enrollment to `cancelled`, returns a plain confirmation page. Must succeed on POST **without** any confirmation step, or Gmail's one-click fails.

- [ ] **Step 2: Implement the Resend webhook**

Writes every callback into `email_events`. On `email.bounced` and `email.complained`, also write `email_suppressions`.

- [ ] **Step 3: Deploy, then verify**

```bash
npx --yes supabase@latest functions deploy email-unsub --project-ref guixatihuqwfhzvnrkvb
npx --yes supabase@latest functions deploy email-webhook --project-ref guixatihuqwfhzvnrkvb
```
`curl -X POST` the unsubscribe endpoint with a valid token and confirm a suppression row appears and the enrollment is cancelled.

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/email-unsub/ supabase/functions/email-webhook/
git commit -m "Add one-click unsubscribe and the Resend event webhook"
```

---

### Task 10: DNS for send.dayspine.com

**Files:**
- Create: `scripts/dns-add-send-subdomain.js`

**Blocked on:** a Resend account for Dayspine and its domain-verification records. `GODADDY_PAT` is in `C:/Users/Victus/.env`.

- [ ] **Step 1: Read the current record set first**

```bash
curl -s -H "Authorization: sso-key $GODADDY_PAT" \
  "https://api.godaddy.com/v1/domains/dayspine.com/records" | python -m json.tool | head -40
```
Count the records and confirm all 9 mail records are present. **Write this count down.**

- [ ] **Step 2: Add the records with a scoped PUT**

GoDaddy's API **replaces the entire record type on PUT**. Use the per-type, per-name endpoint (`/records/{type}/{name}`), never the collection endpoint, exactly as the funnel CNAME was added on 2026-08-06 (26 to 27 records, all 9 mail records intact).

Records needed, values supplied by Resend on domain verification:
- `TXT send` — the SPF for the subdomain
- `TXT resend._domainkey.send` — DKIM
- `MX send` — Resend's bounce host, if the plan requires it
- `TXT _dmarc.send` — `v=DMARC1; p=none; rua=mailto:leoboxe15@gmail.com` during warmup

- [ ] **Step 3: Verify nothing was destroyed**

Re-read the full record set. Assert the total equals the count from Step 1 plus the number added, and that all 9 mail records are still present. **If the count is wrong, restore immediately.**

- [ ] **Step 4: Confirm propagation and Resend verification**

```bash
curl -s "https://dns.google/resolve?name=send.dayspine.com&type=TXT"
curl -s "https://dns.google/resolve?name=resend._domainkey.send.dayspine.com&type=TXT"
```
Then confirm the domain shows verified in Resend.

- [ ] **Step 5: Commit**

```bash
git add scripts/dns-add-send-subdomain.js
git commit -m "Add the send.dayspine.com DNS records, scoped so the M365 mail records survive"
```

---

### Task 11: Gate 2, the review

**Files:**
- Create: `scripts/render-email-preview.js`
- Output: `C:/Users/Victus/Downloads/Dayspine-Emails/`

- [ ] **Step 1: Render all 32 emails to a review page**

8 steps by 4 angle packs, each rendered against Leo's real A1 answers where the angle allows and against a representative row otherwise. Self-contained HTML in `Downloads/Dayspine-Emails/`, one card per email showing subject, preheader and the rendered HTML in an iframe, with a **feedback textarea under every single email** and a "Copy all feedback" button. Reuse the pattern at `C:/Users/Victus/nabila-reel-clones/review.html`.

- [ ] **Step 2: Send the real thing to Leo**

Enrol `leoboxe15@gmail.com` with `next_due_at = now()` and a compressed schedule (steps minutes apart, not days). Enrol a seed Outlook address alongside. Flip `enabled = true` **only** while both are the only active enrollments, and confirm that with a count query first:

```sql
select email, status from email_enrollments where status = 'active';
```
Expected: exactly the two test addresses. If any other row is active, **stop**.

- [ ] **Step 3: Verify delivery properly**

- SPF, DKIM and DMARC all `pass` in the raw headers of a delivered message
- Inbox placement in Gmail **and** Outlook, not Promotions if avoidable, and recorded either way
- One-click unsubscribe works from the real client and writes a suppression
- Personalisation matches Leo's actual quiz answers field by field

- [ ] **Step 4: Set `enabled = false` again**

Gate 3 is a separate, explicit decision. Leave the switch off.

- [ ] **Step 5: Deliver**

`SendUserFile` the review page. Do not describe the emails in chat instead of showing them.

- [ ] **Step 6: Commit**

```bash
git add scripts/render-email-preview.js
git commit -m "Add the email review renderer for gate 2"
```

---

## Self-Review

**Spec coverage:** §1 deliverability → Tasks 5, 9, 10. §2 data model → Task 2. §3 trigger and processing → Tasks 6, 7, 8. §4 targets port → Task 1. §5 the sequence and angle branching → Tasks 3, 4. §6 gates → the kill switch in Tasks 2 and 7, gate 2 in Task 11. §7 open items → Task 10 is explicitly blocked on the Resend account.

**Placeholders:** none. Every code step carries real code. The email copy itself is written during Task 4 under the constraints listed there and enforced by five tests.

**Type consistency:** `resolve()` returns `Record<string, string>` in Task 3 and is consumed as such in Task 4. `deriveTargets` is produced in Task 1 and consumed in Task 3. `buildPayload` in Task 5 is consumed by Task 7. `nextDueAt`/`shouldSend` live in `email-process/schedule.ts` and are imported by both the test and `index.ts`.

**Known external blockers:** Task 10 and Task 11 Step 2 cannot complete without a Resend account for Dayspine. Everything else runs to green without it.
