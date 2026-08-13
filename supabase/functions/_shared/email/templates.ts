/**
 * The eight emails.
 *
 * Rules that are enforced by tests/email-templates.test.ts, not by discipline:
 *   - every step links to the offer, because every email sells
 *   - no em dashes anywhere
 *   - no unreplaced token, no "undefined", no superseded price
 *
 * Rules that are on me:
 *   - founder first person, from Leo, direct, no fluff
 *   - every claim appears in the claim inventory in ad-angles-master.md section 1
 *   - a merge value is only ever used inside its `has*` guard, so an absent
 *     answer degrades to a true general sentence and never to a fabricated
 *     personal one
 *
 * Days 0, 2 and 6 are angle-filled. The rest are fixed. See spec section 5.
 */
import { renderHtml, renderText, type LayoutInput } from './layout.ts';
import type { Vars } from './resolve.ts';

export interface Step {
  day: number;
  subject: (v: Vars) => string;
  preheader: (v: Vars) => string;
  paragraphs: (v: Vars) => string[];
  cta: (v: Vars) => string;
}

const on = (v: Vars, flag: string) => v[flag] === 'true';

/** "for the 3 nights you cook" but only when we actually know. */
const nights = (v: Vars) =>
  on(v, 'hasCookNights')
    ? `the ${v.cookNightCount} ${Number(v.cookNightCount) === 1 ? 'night' : 'nights'} a week you cook`
    : 'the nights you cook';

const household = (v: Vars) =>
  on(v, 'hasHousehold') ? `for ${v.householdSize} people` : 'for your house';

/**
 * The shape of their plan, as a sentence.
 *
 * Built by collecting only the clauses we actually have and joining them, then
 * capitalising the result. Concatenating optional fragments inline is how the
 * first draft produced "It is built from what you told me. for your house,
 * highProtein eating, no Nothing" against a real lead row: a lowercase sentence
 * start, a raw code, and an allergen list whose only entry meant "no allergens".
 */
function planShape(v: Vars): string {
  const parts: string[] = [];
  if (on(v, 'hasHousehold')) parts.push(`for ${v.householdSize} people`);
  if (on(v, 'hasDiet')) parts.push(`${v.diet}`);
  if (on(v, 'hasAllergens')) parts.push(`no ${v.allergens.toLowerCase()}`);
  if (on(v, 'hasCookNights')) {
    parts.push(`built around the ${v.cookNightCount} ${Number(v.cookNightCount) === 1 ? 'night' : 'nights'} a week you cook`);
  }
  if (parts.length === 0) return 'It is built from the answers you gave, not from a template.';
  const joined = parts.length === 1
    ? parts[0]
    : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
  return `It is built from what you told me, not from a template: ${joined}.`;
}

/* Pack-supplied bodies. Imported through resolve so templates never reach past
   the merge values, which is what keeps every step testable from a plain Vars. */
import { packFor } from './packs.ts';
const proofFor = (v: Vars) => packFor(v.angle === 'default' ? null : v.angle).proof;
const trustFor = (v: Vars) => {
  const pack = packFor(v.angle === 'default' ? null : v.angle);
  /* Never lead the trust email with training proof for somebody who told the
     quiz they do not want training. */
  return v.wantsTraining === 'false' ? pack.trust.slice(0, 1) : pack.trust;
};

export const STEPS: Step[] = [
  /* ── DAY 0 ─ confirmation. The plan exists. Here is what is in it. ───────── */
  {
    day: 0,
    subject: (v) =>
      on(v, 'hasCookNights')
        ? `Your plan is ready, built around ${v.cookNightCount} ${Number(v.cookNightCount) === 1 ? 'night' : 'nights'} a week`
        : on(v, 'hasHousehold') ? `Your plan is ready, for ${v.householdSize}` : 'Your plan is ready',
    preheader: (v) =>
      on(v, 'hasNamedStore') ? `Priced against ${v.store}, and the list is written.`
      : on(v, 'hasBudget') ? `Costed against the ${v.budget} a week you set.`
      : 'Built around the week you described.',
    paragraphs: (v) => [
      v.opening,
      `${planShape(v)}${on(v, 'hasBudget') ? ` It costs the whole week against the ${v.budget} you set, line by line.` : ''}`,
      on(v, 'hasStore')
        ? `The shopping list comes with it. Real quantities, grouped the way a shop is laid out, and priced so you can see the whole till before you leave the house. You said you shop at ${v.store}.`
        : 'The shopping list comes with it. Real quantities, grouped the way a shop is laid out, and priced so you can see the whole till before you leave the house.',
      'That is the part nothing else does. Most plans hand you recipes and stop, and the plan quietly dies somewhere between the recipe and the aisle.',
      'It is one payment of $49 and then it is yours. Nothing renews, there is no subscription, and there is nothing to cancel later.',
    ],
    cta: () => 'Open my plan',
  },

  /* ── DAY 1 ─ what a week on it actually looks like. ──────────────────────── */
  {
    day: 1,
    subject: (v) =>
      on(v, 'hasCookTime') ? `A week that fits ${v.cookTime.toLowerCase()}` : 'What a week on this actually looks like',
    preheader: (v) =>
      on(v, 'hasHousehold') ? `Every meal decided, for ${v.householdSize}, portions included.`
      : 'Not a diet. A week that already has its decisions made.',
    paragraphs: (v) => [
      'Here is the honest version of what changes.',
      `You open it on Sunday. The week is already decided: every meal, ${household(v)}, with portions worked out so protein lands where it should and nothing is guessed. You are not choosing, you are reading.`,
      'The grocery list is already written underneath it, with amounts, so the shop is a list you tick rather than a puzzle you solve standing in an aisle.',
      ...(on(v, 'hasSignal') ? [`${v.signalLead} "${v.signal.toLowerCase()}". That is the thing this replaces.`] : []),
      `Then on ${nights(v)}, you make the thing the plan said, and the recipe is written at the quantity the plan promised. Not "serves 4, adjust as needed". The actual amount.`,
      'The training side sits on the same week, so what you lift and what you eat are one document instead of two apps that have never spoken to each other.',
      'That is the whole product. One payment, $49, and it does not renew.',
    ],
    cta: () => 'See my week',
  },

  /* ── DAY 2 ─ ANGLE ─ why the last one died. Their own answer, quoted. ────── */
  {
    day: 2,
    /* NOT the raw barrier. Subjects show on lock screens and in previews, and
       some of these answers are the reader at their least generous about
       themselves ("I eat everything, then hate myself"). Quoting that back on a
       notification is cruel and it is not ours to broadcast. The quote stays in
       the body, where barrierLead gives it context. */
    subject: (v) => (on(v, 'hasBarrier') ? 'You already told me why it stopped' : 'Why the last one stopped'),
    preheader: (v) => (on(v, 'hasBarrier') ? 'Your words, not mine. And it is fixable.' : 'It was not discipline.'),
    paragraphs: (v) => [
      v.died,
      on(v, 'hasBarrier')
        ? `${v.barrierLead} "${v.barrier}".`
        : 'You already know which part of it stops you.',
      v.barrierReply,
      `The thing that failed you was ${v.villain}, and it was never going to be anything else.`,
      on(v, 'hasSunday')
        ? `You said the whole job takes you ${v.sunday.toLowerCase()}. The plan does the deciding, the costing and the list before you open your eyes.`
        : 'The plan does the deciding, the costing and the list before you open your eyes.',
      'One payment of $49. Nothing renews.',
    ],
    cta: () => 'Get my plan',
  },

  /* ── DAY 3 ─ buy it once. Fixed copy, no fabricated spend figure. ────────── */
  {
    day: 3,
    subject: () => 'Buy it once instead of renting it forever',
    preheader: () => '$49, once. There is no second year of it.',
    paragraphs: () => [
      'Every app in this category is built to charge you forever. That is not an accident, it is the business model: a low first month, then $39 to $70 every month after, and a cancel flow designed to be slightly harder than giving up.',
      'Fastic is $79.99 a year. Noom is $209 a year. Reverse Health rebills at $39.99 a month. You have almost certainly paid one of them and forgotten about it for a few months.',
      'Dayspine is $49. Once. There is no second year of it, no card kept on file for later, nothing to remember to cancel, and no plan that quietly upgrades itself.',
      'I can do that because I am one person who built a tool, not a company that has to keep you subscribed to survive. The regular price is $99 and it will go back to that.',
      'Thirty day refund. If it does not do what I just said, email me and I send your money back.',
    ],
    cta: () => 'Buy it once, $49',
  },

  /* ── DAY 5 ─ trust. Real instructor, real classes. ───────────────────────── */
  {
    day: 5,
    subject: () => 'Everything in here is a real person',
    preheader: (v) => (v.wantsTraining === 'false'
      ? 'Real food data. Real recipes. No generated nonsense.'
      : 'Not stock models. Not AI. Her actual classes.'),
    paragraphs: (v) => [
      'There is a lot of AI slop in fitness apps right now. Generated recipe photos of food nobody cooked. Plans written by a model that has never met anybody. You can usually tell, and it is the fastest way to stop trusting an app.',
      ...trustFor(v),
      'AI does the scheduling. It does not do the authoring. That distinction is the whole difference between a plan you follow and a plan you catch out.',
      'One payment, $49, and it is yours.',
    ],
    cta: () => 'Get the app',
  },

  /* ── DAY 6 ─ ANGLE ─ the thing this angle actually promised. ─────────────── */
  {
    day: 6,
    subject: (v) => v.differentiator,
    preheader: (v) => (on(v, 'hasBudget') ? `Against the ${v.budget} a week you gave me.` : 'The bit nobody else does.'),
    paragraphs: (v) => [
      `${v.differentiator}. That is the part I would buy this for, and it is the part every other plan skips.`,
      ...proofFor(v),
      on(v, 'hasBudget')
        ? `Against the ${v.budget} a week you set, you can see whether the week fits before you go.`
        : 'You can see whether it fits before you commit to it.',
      on(v, 'hasListHow')
        ? `You said you handle it "${v.listhow.toLowerCase()}" right now. This is that job, done, every week, without you.`
        : 'That job, done, every week, without you.',
      'One payment of $49. It does not renew.',
    ],
    cta: () => 'See it work',
  },

  /* ── DAY 8 ─ the price objection, head on. ───────────────────────────────── */
  {
    day: 8,
    subject: (v) => (on(v, 'hasWeightGoal') ? `Is $49 worth ${v.poundsToGo} lb` : 'Is it worth $49'),
    preheader: () => 'A fair question. Here is the honest answer.',
    paragraphs: (v) => [
      'Fair question, so here is the straight answer.',
      `What you get: ${v.getList}. Plus the fasting timer, the diary, and the plan adapting itself when the scale stops moving.`,
      'What it costs: $49, one time. Not $49 a month. Not $49 now and $39 later. Forty nine dollars, and then never again.',
      'The nearest thing to it that you can actually buy is four separate subscriptions at roughly $27 a month between them. That is $324 a year, every year, forever.',
      'And if I am wrong, you have thirty days to email me and get all of it back. I would rather refund you than have you keep something you do not use.',
    ],
    cta: () => 'Get it for $49',
  },

  /* ── DAY 10 ─ last call. ─────────────────────────────────────────────────── */
  {
    day: 10,
    subject: (v) => (on(v, 'hasNamedStore') ? `Last one from me, ${v.store} list included` : 'Last one from me'),
    preheader: (v) => (on(v, 'hasWeightGoal')
      ? `${v.weightLb} to ${v.targetLb}. The plan is still there.`
      : 'Your plan is still there. I will stop after this.'),
    paragraphs: (v) => [
      'This is the last one, so I will keep it short.',
      `Your plan is built and it is still sitting there. ${planShape(v).replace('It is built from what you told me, not from a template: ', 'Built ').replace('It is built from the answers you gave, not from a template.', 'Built from your answers.')} It took you a few minutes to answer all that, and it would be a waste for it to sit unopened.`,
      on(v, 'hasBarrier')
        ? `${v.barrierLead} "${v.barrier}". That is the exact thing it fixes.`
        : 'It exists to fix the specific thing you said goes wrong.',
      ...(on(v, 'hasWeightGoal') ? [`You put ${v.weightLb} lb now and ${v.targetLb} lb as the target. The plan is dated for that, and it re dates itself if the scale disagrees.`] : []),
      '$49, once, thirty day refund, nothing renews. The regular price is $99 and it goes back to that.',
      'If it is not for you, that is genuinely fine, and you will not hear from me again either way.',
    ],
    cta: () => 'Open my plan',
  },
];

export function renderStep(
  index: number,
  v: Vars,
  unsubUrl = 'https://quiz.dayspine.com/u',
): { subject: string; html: string; text: string; day: number } {
  const step = STEPS[index];
  if (!step) throw new Error(`no step at index ${index}`);
  const input: LayoutInput = {
    preheader: step.preheader(v),
    paragraphs: step.paragraphs(v),
    cta: step.cta(v),
    unsubUrl,
  };
  return {
    day: step.day,
    subject: step.subject(v),
    html: renderHtml(input),
    text: renderText(input),
  };
}
