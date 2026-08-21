/**
 * Turn a `quiz_answers` row into flat merge values for the templates.
 *
 * Three rules, each of which exists because of something found in the live data
 * on 2026-08-13:
 *
 * 1. **Every value is a string, and never the string "undefined".** Templates
 *    branch on `has*` flags, never on truthiness of the value itself.
 *
 * 2. **An absent number NEVER becomes a fallback presented as the lead's own.**
 *    This is the rule that killed an earlier day-3 email built on `p.appSpend`,
 *    a field collected only by A2 and A14, which no lead has ever come from. It
 *    would have printed a category median as "the number you gave me" for all
 *    22 leads.
 *
 * 3. **Both `p.` and `x.` prefixes are read.** The quiz split its namespace on
 *    2026-08-10, so rows before that store `p.store` / `p.cookNights` and rows
 *    after store `x.store` / `x.cookNights`. Both are live in the table right
 *    now. Reading only one silently loses the field for half the leads.
 *
 * Answers are CODES ("toomuch", "over2", "costco"), so anything shown to a
 * human is resolved through labels.json, which is generated from the quiz
 * definitions themselves by scripts/build-quiz-labels.js.
 */
import LABELS from './labels.json' with { type: 'json' };
import { packFor } from './packs.ts';
import { MARKETS, DEFAULT_MARKET, isMarketCode, formatPrice, approxLocal, priceInWords } from '../markets.ts';

export interface QuizRow {
  email: string;
  angle?: string | null;
  answers: Record<string, unknown>;
  /** Which funnel this lead came from. Decides the currency in every email. */
  market?: string | null;
}

export type Vars = Record<string, string>;

/* Written as a phrase that reads inside a sentence, not as the on-screen label.
   "Lots of protein eating" is not English; "high protein" is. */
const DIET: Record<string, string> = {
  highProtein: 'high protein',
  vegetarian: 'vegetarian',
  dairyFree: 'dairy free',
};

const DAY_NAMES: Record<string, string> = {
  mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday',
  fri: 'Friday', sat: 'Saturday', sun: 'Sunday',
};

/** `p.store` and `x.store` are the same question either side of a refactor. */
function pick(answers: Record<string, unknown>, bare: string): unknown {
  return answers[`p.${bare}`] ?? answers[`x.${bare}`] ?? answers[bare];
}

/** Code to the exact wording the lead read on screen, for THIS angle. */
function label(angle: string, key: string, value: unknown): string {
  const forAngle = (LABELS as Record<string, Record<string, Record<string, string>>>)[angle];
  const map = forAngle?.[key];
  if (!map) return '';
  if (Array.isArray(value)) {
    return value.map((v) => map[String(v)]).filter(Boolean).join(', ');
  }
  return map[String(value)] ?? '';
}

/** "Monday, Tuesday and Thursday" rather than "mon, tue, thu". */
function listDays(v: unknown): string {
  if (!Array.isArray(v)) return '';
  const named = v.map((d) => DAY_NAMES[String(d)]).filter(Boolean);
  if (named.length === 0) return '';
  if (named.length === 1) return named[0];
  return `${named.slice(0, -1).join(', ')} and ${named[named.length - 1]}`;
}

const num = (v: unknown): number | null => {
  const n = Number(v);
  return v === undefined || v === null || v === '' || Number.isNaN(n) ? null : n;
};

export function resolve(row: QuizRow): Vars {
  const a = row.answers || {};

  /*
   * Money, in the reader's own currency.
   *
   * Every price here used to be a dollar literal, which is right for exactly one
   * of five funnels. An Australian who paid A$79 being emailed "one payment of
   * $49" is quoted a number they never saw.
   *
   * Two kinds of figure, handled differently on purpose:
   *   - OURS come from the market's price list, never converted. A$79 is a
   *     chosen retail price, not 49 times an exchange rate.
   *   - COMPETITORS' are USD facts about other apps, so they ARE converted and
   *     rounded hard. "Noom is about A$290 a year" is the honest register;
   *     false precision would be worse than the approximation.
   */
  const market = MARKETS[isMarketCode(row.market) ? row.market : DEFAULT_MARKET];
  const money = {
    core: formatPrice(market, market.prices.core),
    anchor: formatPrice(market, market.prices.anchor),
    coreWords: priceInWords(market),
    partnerSeat: formatPrice(market, market.prices['partner-seat']),
    rivalLow: approxLocal(market, 39),
    rivalHigh: approxLocal(market, 70),
    fasticYear: approxLocal(market, 79.99),
    noomYear: approxLocal(market, 209),
    reverseMonth: approxLocal(market, 39.99),
    fourSubsMonth: approxLocal(market, 27),
    fourSubsYear: approxLocal(market, 324),
  };
  const angle = row.angle || 'default';
  const pack = packFor(row.angle);

  const budget = num(pick(a, 'weeklyBudget'));
  const children = num(pick(a, 'children')) ?? 0;
  const adults = num(pick(a, 'otherAdults')) ?? 0;
  const household = 1 + children + adults;
  const weight = num(pick(a, 'weightLb'));
  const target = num(pick(a, 'targetLb'));

  const nights = pick(a, 'cookNights');
  const nightList = listDays(nights);
  const nightCount = Array.isArray(nights) ? nights.length : 0;

  /* "none" is an OPTION in the allergen list, labelled "Nothing", so a lead who
     answered "no allergies" renders as `no Nothing` if it is treated as a value.
     It means the absence of the field, not a value of it. */
  const allergensRaw = pick(a, 'allergens');
  const allergens = Array.isArray(allergensRaw)
    ? allergensRaw.filter((x) => String(x) !== 'none')
    : [];
  const allergenList = label(angle, 'p.allergens', allergens);

  const barrierRaw = a[pack.barrierKey];
  const barrierLabel = label(angle, pack.barrierKey, barrierRaw);

  const storeLabel = label(angle, 'x.store', pick(a, 'store'))
    || label(angle, 'p.store', pick(a, 'store'));

  const v: Vars = {
    angle,
    villain: pack.villain,
    opening: pack.opening,
    differentiator: pack.differentiator,
    died: pack.died,
    barrierLead: pack.barrierLead,
    barrierReply: pack.barrierReply,
    getList: pack.getList,
    signalLead: pack.signalLead,

    /* The angle's second distinctive answer. Every angle has one and it differs
       per angle (A1 listhow, A4 split, A8 weighin, A14 which...), so it is
       declared by the pack rather than hard coded per template. */
    hasSignal: String(Boolean(label(angle, pack.signalKey, a[pack.signalKey]))),
    signal: label(angle, pack.signalKey, a[pack.signalKey]),

    /* Their own words on what went wrong. The only field every angle collects,
       and the strongest thing in the whole dataset to write from. */
    hasBarrier: String(Boolean(barrierLabel)),
    barrier: barrierLabel,

    hasBudget: String(budget !== null),
    budget: budget !== null ? `$${budget}` : '',

    hasStore: String(Boolean(storeLabel)),
    store: storeLabel,
    /* "Somewhere else" and "your store" are the catch all options. They are fine
       mid sentence and nonsense in a subject line ("Last one from me, Somewhere
       else list included"), so subjects gate on this instead. */
    hasNamedStore: String(Boolean(storeLabel) && !/somewhere else|your store/i.test(storeLabel)),

    hasCookNights: String(nightCount > 0),
    cookNights: nightList,
    cookNightCount: nightCount > 0 ? String(nightCount) : '',

    hasHousehold: String(household > 1),
    householdSize: String(household),

    /* The stored value is a code (`highProtein`), which must never reach a
       reader. `standard` means "no restriction", which is not worth a sentence,
       so it resolves to absent rather than to the label "Anything". */
    hasDiet: String(pick(a, 'diet') !== undefined && pick(a, 'diet') !== 'standard'),
    diet: pick(a, 'diet') === 'standard' ? '' : DIET[String(pick(a, 'diet') ?? '')] ?? '',

    hasAllergens: String(Boolean(allergenList)),
    allergens: allergenList,

    hasWeightGoal: String(weight !== null && target !== null && weight !== target),
    weightLb: weight !== null ? String(weight) : '',
    targetLb: target !== null ? String(target) : '',
    poundsToGo: weight !== null && target !== null ? String(Math.abs(weight - target)) : '',

    goal: String(pick(a, 'goal') ?? 'maintain'),

    hasSunday: String(Boolean(label(angle, 'sunday', a.sunday))),
    sunday: label(angle, 'sunday', a.sunday),

    hasListHow: String(Boolean(label(angle, 'listhow', a.listhow))),
    listhow: label(angle, 'listhow', a.listhow),

    /* Some leads explicitly declined training. Selling them a training plan is
       the clearest possible signal that nobody read their answers. */
    wantsTraining: String(a.wantsTraining !== 'no'),

    hasCookTime: String(Boolean(label(angle, 'x.cookTime', pick(a, 'cookTime')) || pick(a, 'cookTime'))),
    cookTime: label(angle, 'x.cookTime', pick(a, 'cookTime')) || label(angle, 'p.cookTime', pick(a, 'cookTime')),

    /* Money, in the reader's currency. Templates must use these and never a
       literal -- a dollar sign in a template is correct for one funnel in five. */
    core: money.core,
    anchor: money.anchor,
    coreWords: money.coreWords,
    partnerSeat: money.partnerSeat,
    rivalLow: money.rivalLow,
    rivalHigh: money.rivalHigh,
    fasticYear: money.fasticYear,
    noomYear: money.noomYear,
    reverseMonth: money.reverseMonth,
    fourSubsMonth: money.fourSubsMonth,
    fourSubsYear: money.fourSubsYear,
    market: market.code,
  };

  /* Belt and braces. A single undefined reaching a template renders the literal
     word "undefined" in somebody's inbox, which is the most expensive kind of
     typo: it tells the reader nothing here was written for them. */
  for (const k of Object.keys(v)) {
    if (v[k] === undefined || v[k] === null || v[k] === 'undefined' || v[k] === 'NaN') v[k] = '';
  }
  return v;
}
