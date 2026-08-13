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
  },
};

export function packFor(angle: string | null | undefined): AnglePack {
  return (angle && PACKS[angle]) || DEFAULT_PACK;
}
