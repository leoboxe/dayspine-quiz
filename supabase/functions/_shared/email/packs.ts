/**
 * One pack per ad angle.
 *
 * A lead did not take "the Dayspine quiz". They took one of fifteen, chosen by
 * the ad they clicked, and each one interrogates a different problem. The pack
 * is what carries that promise through into the emails, so the sequence
 * continues the conversation the ad started instead of restarting it.
 *
 * Packs exist only for angles that have actually produced leads (A1, A4, A5,
 * A12 as of 2026-08-13). Everything else falls back to DEFAULT_PACK, which is
 * built only on the three fields every angle collects, so a newly funded angle
 * is never blocked waiting on copy.
 *
 * No em dashes in any string here. These are quoted straight into emails.
 */

export interface AnglePack {
  angle: string;
  /** What gets blamed. Never the reader. */
  villain: string;
  /** Day 0, the first line under the confirmation. */
  opening: string;
  /** Day 6 subject and spine: the thing this angle promised. */
  differentiator: string;
  /** Day 2: why the last attempt died, in this angle's terms. */
  died: string;
  /** The answer key holding this angle's stated barrier. */
  barrierKey: string;
  /**
   * How to introduce that answer, phrased to match the question THIS angle
   * actually asked.
   *
   * 🔴 `barrier` is not one question. A1 asks "what usually goes wrong",
   * A4 asks "what did the last one change", A5 asks "what is in the way of a
   * gym", A12 asks "what does a bad day look like". One shared lead-in
   * misquotes three of the four, and the misquote is visible to the reader
   * because they remember answering it.
   */
  barrierLead: string;
  /**
   * And the reply has to fit the answer. "That is a planning problem" is true
   * of a grocery barrier and a category error against "I eat everything, then
   * hate myself".
   */
  barrierReply: string;
  /**
   * Day 6 body. An earlier version gave every angle its own SUBJECT and then
   * A1's grocery-waste body underneath it, so an A4 lifter read "One plan, both
   * halves" followed by three paragraphs about swapping dinners. The subject
   * promising one thing and the body delivering another is worse than no
   * branching at all.
   */
  proof: string[];
  /**
   * Day 5 body. The "real, not AI slop" argument, made with the evidence that
   * matters to THIS reader. Pilates footage is the strongest proof we have and
   * it is the wrong proof for somebody who answered questions about squat
   * programming.
   */
  trust: string[];
  /** Day 8, what they get, ordered so their reason for coming is first. */
  getList: string;
}

export const DEFAULT_PACK: AnglePack = {
  angle: 'default',
  villain: 'the plan that stops at the recipe',
  opening: 'Your plan is built and it is sitting in your account.',
  differentiator: 'One plan instead of four apps',
  died: 'You were handed a spreadsheet and told to work out the rest.',
  barrierKey: 'barrier',
  barrierLead: 'You told me what gets in the way:',
  barrierReply: 'That is not a discipline problem. It is a planning problem wearing a discipline costume, and it is the specific thing this removes.',
  proof: [
    'The plan does not stop at the recipe. It writes the shopping list with real amounts, prices the week, and tells you what you buy and never cook.',
    'Change one thing and the rest moves with it, because it is one plan rather than four apps that have never spoken to each other.',
  ],
  trust: [
    'The food is 170 real whole foods with real nutrition data, not a scraped table.',
    'The Pilates is a real instructor teaching her own classes: 202 clips of her performing each movement, coached in her own voice.',
  ],
  getList: 'the meal plan, the grocery list with real amounts and real prices, the recipes at the planned quantity, the training plan, and 713 exercises',
};

export const PACKS: Record<string, AnglePack> = {
  A1: {
    angle: 'A1',
    villain: 'the meal plan that ends at the recipe',
    opening: 'Your week is built, and so is the shopping list that goes with it.',
    differentiator: 'The grocery list writes itself',
    died: 'Every meal plan you have ever downloaded died in the grocery store.',
    barrierKey: 'barrier',
    barrierLead: 'When I asked what usually goes wrong, you said:',
    barrierReply: 'That is not a discipline problem. It is a planning problem wearing a discipline costume, and it is exactly what a plan with real quantities on it removes.',
    proof: [
      'Swap one dinner and the shopping list rewrites itself. Quantities change, an item disappears, the total moves.',
      'It also shows you what you are buying and never cooking. On a normal week that is most of the waste in a food budget, and no other app in this category will even tell you about it.',
    ],
    trust: [
      'The food is 170 real whole foods with real nutrition data, not a scraped table, and the recipes are written at the quantity your plan actually asked for.',
      'The Pilates, if you ever want it, is a real instructor teaching her own classes: 202 clips of her performing each movement, coached in her own voice.',
    ],
    getList: 'the meal plan, the grocery list with real amounts and real prices, the recipes at the planned quantity, budget mode, the waste report, and the training side when you want it',
  },
  A4: {
    angle: 'A4',
    villain: 'the program that programs the lift and never the plate',
    opening: 'Your training week and your food week are now the same document.',
    differentiator: 'One plan, both halves',
    died: 'Your program was never the problem. Your food was just never attached to it.',
    barrierKey: 'barrier',
    barrierLead: 'When I asked what the last plan actually changed, you said:',
    barrierReply: 'That is the answer of somebody who trained properly and ate at random. The lifting was never the missing half.',
    proof: [
      'Your lifting week and your eating week are the same document. Change the training split and the food moves with it, because they were never two separate plans.',
      'Adherence is scored per meal against what the plan asked for, so you can see whether the eating actually matched the training instead of guessing.',
    ],
    trust: [
      'The exercise library is 713 movements with 182 start and finish illustrations, and progression runs on estimated one rep max rather than vibes.',
      'The food side is 170 real whole foods with real nutrition data, not a scraped table, so the macros you are hitting are real numbers.',
    ],
    getList: 'the training plan built to your days and your equipment, 713 exercises with one rep max progression, the meal plan attached to it, per meal adherence scoring, and the grocery list with real amounts',
  },
  A5: {
    angle: 'A5',
    villain: 'the schedule, not you',
    opening: 'Your plan is built, and all of it runs in the corner of a room.',
    differentiator: 'No gym, no equipment, nothing to cancel',
    died: 'It was never the workout. The workout just never fit the time you actually had.',
    barrierKey: 'barrier',
    barrierLead: 'When I asked what is actually in the way of a gym, you said:',
    barrierReply: 'None of that is a motivation problem. It is a logistics problem, and a plan that runs in your living room does not have it.',
    proof: [
      'The whole plan runs in a corner of a room. Bodyweight, or whatever you already own, and nothing that assumes a rack or a commute.',
      'There is no membership behind it either. One payment, and no monthly charge to justify to yourself every time you skip a week.',
    ],
    trust: [
      'The Pilates is a real instructor teaching her own classes: 202 clips of her performing each movement, coached in her own voice from what she genuinely said while teaching it.',
      'The exercise library is 713 movements with 182 start and finish illustrations, including a full bodyweight tier.',
    ],
    getList: 'the home training plan built to your equipment and your days, the Pilates flows from a real instructor, 713 exercises, the meal plan and the grocery list with real amounts',
  },
  A12: {
    angle: 'A12',
    villain: 'the all or nothing week',
    opening: 'Your plan is built, and it is designed to survive a bad Thursday.',
    differentiator: 'The app that gets you to day 28',
    died: 'One bad day ended the week, and then the week ended the month.',
    barrierKey: 'barrier',
    barrierLead: 'When I asked what a bad day looks like, you said:',
    barrierReply: 'I am not going to tell you that is a planning problem, because it is not. What I will say is that a bad day only costs you the week when the plan has no way back in. This one does.',
    proof: [
      'The plan is built to survive a bad day. There is a consistency grade and a streak that does not reset the moment you miss once, because the week ending is what actually costs you the month.',
      'And when the scale stalls, it reads the weigh ins and rewrites the calorie number and the finish date. It does not wait for you to notice.',
    ],
    trust: [
      'The Pilates is a real instructor teaching her own classes, 202 clips of her performing each movement, coached in her own voice.',
      'The food is 170 real whole foods with real nutrition data, and the plan adapts from your actual weigh ins rather than from a template.',
    ],
    getList: 'the plan that adapts when the scale stalls, the consistency grade and diary, the meal plan, the grocery list with real amounts, and the training side when you want it',
  },
};

export function packFor(angle: string | null | undefined): AnglePack {
  return (angle && PACKS[angle]) || DEFAULT_PACK;
}
