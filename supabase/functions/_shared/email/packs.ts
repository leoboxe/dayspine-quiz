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
}

export const DEFAULT_PACK: AnglePack = {
  angle: 'default',
  villain: 'the plan that stops at the recipe',
  opening: 'Your plan is built and it is sitting in your account.',
  differentiator: 'One plan instead of four apps',
  died: 'You were handed a spreadsheet and told to work out the rest.',
  barrierKey: 'barrier',
};

export const PACKS: Record<string, AnglePack> = {
  A1: {
    angle: 'A1',
    villain: 'the meal plan that ends at the recipe',
    opening: 'Your week is built, and so is the shopping list that goes with it.',
    differentiator: 'The grocery list writes itself',
    died: 'Every meal plan you have ever downloaded died in the grocery store.',
    barrierKey: 'barrier',
  },
  A4: {
    angle: 'A4',
    villain: 'the program that programs the lift and never the plate',
    opening: 'Your training week and your food week are now the same document.',
    differentiator: 'One plan, both halves',
    died: 'Your program was never the problem. Your food was just never attached to it.',
    barrierKey: 'barrier',
  },
  A5: {
    angle: 'A5',
    villain: 'the schedule, not you',
    opening: 'Your plan is built, and all of it runs in the corner of a room.',
    differentiator: 'No gym, no equipment, nothing to cancel',
    died: 'It was never the workout. The workout just never fit the time you actually had.',
    barrierKey: 'barrier',
  },
  A12: {
    angle: 'A12',
    villain: 'the all or nothing week',
    opening: 'Your plan is built, and it is designed to survive a bad Thursday.',
    differentiator: 'The app that gets you to day 28',
    died: 'One bad day ended the week, and then the week ended the month.',
    barrierKey: 'barrier',
  },
};

export function packFor(angle: string | null | undefined): AnglePack {
  return (angle && PACKS[angle]) || DEFAULT_PACK;
}
