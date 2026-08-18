/**
 * One pack per ad angle. All fifteen.
 *
 * A lead did not take "the Dayspine quiz". They took one of fifteen, chosen by
 * the ad they clicked, and each one interrogates a different problem with a
 * different set of questions. The pack carries that promise through into the
 * emails so the sequence continues the conversation the ad started.
 *
 * 🔴 `barrier` is NOT one question. Across the fifteen it asks: what usually
 * goes wrong (A1), what went wrong with the ones you paid for (A2), what have
 * the apps actually done (A3), what did the last one change (A4), what is in
 * the way of a gym (A5), what actually ends it (A6), how many dinners get made
 * (A7), what do you do when it stops working (A8), have you found out you were
 * doing one wrong (A9), how much of what you buy gets eaten (A10), what happens
 * the day after a hard session (A11), what does a bad day look like (A12), what
 * stops you on the days you do not go (A13), how many do you open before
 * breakfast (A14), have you used a photo scanning app (A15).
 *
 * Three of those are not grievances at all. So every pack carries its own
 * `barrierLead` and `barrierReply`, and a wrong pairing is visible to the
 * reader, because they remember answering the question.
 *
 * `signalKey` is the angle's OTHER distinctive answer, quoted on day 1. Two of
 * the lead's own answers per sequence, each introduced in wording that matches
 * the question they were actually asked.
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
  /** Day 2 opener: why the last attempt died, in this angle's terms. */
  died: string;
  /** The answer key holding this angle's stated barrier. */
  barrierKey: string;
  /** How to introduce it, phrased to match the question THIS angle asked. */
  barrierLead: string;
  /** A reply that fits the answer rather than a generic diagnosis. */
  barrierReply: string;
  /** The angle's second distinctive answer, quoted on day 1. */
  signalKey: string;
  /** How to introduce that one. Must read as a sentence start. */
  signalLead: string;
  /** Day 6 body. */
  proof: string[];
  /** Day 5 body: "real, not AI slop", proved with what matters to this reader. */
  trust: string[];
  /** Day 8: what they get, ordered so their reason for coming is first. */
  getList: string;
}

const FOOD_TRUST =
  'The food is 170 real whole foods with real nutrition data, not a scraped table, and the recipes are written at the quantity your plan actually asked for.';
const PILATES_TRUST =
  'The Pilates is a real instructor teaching her own classes: 202 clips of her performing each movement, coached in her own voice from what she genuinely said while teaching it.';
const GYM_TRUST =
  'The exercise library is 713 movements with 182 start and finish illustrations, and progression runs on estimated one rep max rather than on vibes.';

export const DEFAULT_PACK: AnglePack = {
  angle: 'default',
  villain: 'the plan that stops at the recipe',
  opening: 'Your plan is built and it is sitting in your account.',
  differentiator: 'One plan instead of four apps',
  died: 'You were handed a spreadsheet and told to work out the rest.',
  barrierKey: 'barrier',
  barrierLead: 'You told me what gets in the way:',
  barrierReply:
    'That is not a discipline problem. It is a planning problem wearing a discipline costume, and it is the specific thing this removes.',
  signalKey: 'yes',
  signalLead: 'You said',
  proof: [
    'The plan does not stop at the recipe. It writes the shopping list with real amounts, prices the week, and tells you what you buy and never cook.',
    'Change one thing and the rest moves with it, because it is one plan rather than four apps that have never spoken to each other.',
  ],
  trust: [FOOD_TRUST, PILATES_TRUST],
  getList:
    'the meal plan, the grocery list with real amounts and real prices, the recipes at the planned quantity, the training plan, and 713 exercises',
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
    barrierReply:
      'That is not a discipline problem. It is a planning problem wearing a discipline costume, and it is exactly what a plan with real quantities on it removes.',
    signalKey: 'listhow',
    signalLead: 'You said you write the list',
    proof: [
      'Swap one dinner and the shopping list rewrites itself. Quantities change, an item disappears, the total moves.',
      'It also shows you what you are buying and never cooking. On a normal week that is most of the waste in a food budget, and no other app in this category will even tell you about it.',
    ],
    trust: [FOOD_TRUST, PILATES_TRUST],
    getList:
      'the meal plan, the grocery list with real amounts and real prices, the recipes at the planned quantity, budget mode, and the waste report',
  },
  A2: {
    angle: 'A2',
    villain: 'the app that paywalled what used to be free',
    opening: 'Your plan is built, and there is no tier above it that I am holding back for later.',
    differentiator: 'Buy it once. Nothing renews.',
    died: 'You did not fail. You paid every month to type in your own dinner.',
    barrierKey: 'barrier',
    barrierLead: 'When I asked what went wrong with the ones you have paid for, you said:',
    barrierReply:
      'That is the model working as designed. A subscription has to keep something back, or there is nothing left to sell you next month.',
    signalKey: 'stack',
    signalLead: 'You told me you are running',
    proof: [
      'Everything is included the moment you are in. There is no premium tier, no unlock, and no feature sitting greyed out with a padlock on it.',
      'Nothing renews. No card kept on file for later, no date to remember, and no cancel flow built to be slightly harder than giving up.',
    ],
    trust: [FOOD_TRUST, GYM_TRUST],
    getList:
      'every module with nothing held back: the meal plan, the grocery list, the training plan, 713 exercises, the Pilates flows, the fasting timer and the diary',
  },
  A3: {
    angle: 'A3',
    villain: 'the tracker that hands you a spreadsheet and calls it a plan',
    opening: 'Your plan is built. Not a log to fill in, an actual answer to what you eat.',
    differentiator: 'It tells you what to eat, tonight',
    died: 'You did not fail at discipline. You were handed a blank log and told to work out the rest.',
    barrierKey: 'barrier',
    barrierLead: 'When I asked what the apps you have used have actually done, you said:',
    barrierReply:
      'That is the whole category. They are logging tools that assume the plan already exists in your head.',
    signalKey: 'sixpm',
    signalLead: 'On what happens at six in the evening, you said',
    proof: [
      'Every meal is decided before you get there. Breakfast, lunch, dinner and snacks, with the amounts worked out, so six in the evening is a question that has already been answered.',
      'The shopping list is written underneath it, so the food for those meals is actually in the house.',
    ],
    trust: [FOOD_TRUST, PILATES_TRUST],
    getList:
      'the meal plan with every meal decided and portioned, the grocery list with real amounts, the recipes at the planned quantity, and the training plan',
  },
  A4: {
    angle: 'A4',
    villain: 'the program that programs the lift and never the plate',
    opening: 'Your training week and your food week are now the same document.',
    differentiator: 'One plan, both halves',
    died: 'Your program was never the problem. Your food was just never attached to it.',
    barrierKey: 'barrier',
    barrierLead: 'When I asked what the last plan actually changed, you said:',
    barrierReply:
      'That is the answer of somebody who trained properly and ate at random. The lifting was never the missing half.',
    signalKey: 'split',
    /* Reads as: <lead> "two separate apps". That is the thing this replaces.
       Was 'You train on a', which produced "You train on a "two separate apps""
       -- the lead was written for an answer shape this question never had. */
    signalLead: 'When I asked how you plan your week, you said',
    proof: [
      'Your lifting week and your eating week are the same document. Change the training split and the food moves with it, because they were never two separate plans.',
      'Adherence is scored per meal against what the plan asked for, so you can see whether the eating actually matched the training instead of guessing.',
    ],
    trust: [GYM_TRUST, FOOD_TRUST],
    getList:
      'the training plan built to your days and your equipment, 713 exercises with one rep max progression, the meal plan attached to it, per meal adherence scoring, and the grocery list',
  },
  A5: {
    angle: 'A5',
    villain: 'the schedule, not you',
    opening: 'Your plan is built, and all of it runs in the corner of a room.',
    differentiator: 'No gym, no equipment, nothing to cancel',
    died: 'It was never the workout. The workout just never fit the time you actually had.',
    barrierKey: 'barrier',
    barrierLead: 'When I asked what is actually in the way of a gym, you said:',
    barrierReply:
      'None of that is a motivation problem. It is a logistics problem, and a plan that runs in your living room does not have it.',
    signalKey: 'homefail',
    signalLead: 'On what went wrong training at home before, you said',
    proof: [
      'The whole plan runs in a corner of a room. Bodyweight, or whatever you already own, and nothing that assumes a rack or a commute.',
      'There is no membership behind it either. One payment, and no monthly charge to justify to yourself every time you skip a week.',
    ],
    trust: [PILATES_TRUST, GYM_TRUST],
    getList:
      'the home training plan built to your equipment and your days, the Pilates flows from a real instructor, 713 exercises including a full bodyweight tier, the meal plan and the grocery list',
  },
  A6: {
    angle: 'A6',
    villain: 'the all or nothing week',
    opening: 'Your plan is built, and it is built to still be there on day 28.',
    differentiator: 'The app that gets you to day 28',
    died: 'You are not starting again on Monday. You have said that before.',
    barrierKey: 'barrier',
    barrierLead: 'When I asked what actually ends it, you said:',
    barrierReply:
      'Agreed, and that is not about wanting it enough. A week ends when there is no way back into it after one bad day.',
    signalKey: 'restarts',
    signalLead: 'You said you have started over',
    proof: [
      'There is a consistency grade and a streak that does not reset the moment you miss once, because one bad Thursday should not cost you the week.',
      'The diary shows the pattern rather than a pass or a fail, so you can see which days actually go wrong instead of guessing at it.',
    ],
    trust: [FOOD_TRUST, PILATES_TRUST],
    getList:
      'the consistency grade and diary, the meal plan, the grocery list with real amounts, the training plan, and the plan adapting when the scale stalls',
  },
  A7: {
    angle: 'A7',
    villain: 'cooking twice, or guessing for one of you',
    opening: 'Your plan is built, and it is built for the house rather than just for you.',
    differentiator: 'One list. Two people. Two targets.',
    died: 'You are already cooking for two. You were just guessing for one of them.',
    barrierKey: 'barrier',
    barrierLead: 'When I asked how many dinners get made on a normal night, you said:',
    barrierReply:
      'That is the real cost of two people eating differently, and it is a planning problem rather than a cooking one.',
    signalKey: 'who',
    signalLead: 'You are planning for',
    proof: [
      'Two calorie targets, two plans, one shop. The lists merge on grams before packaging, so you are never sent for two half packs of everything.',
      'You cook once. The portions differ, the meal does not.',
    ],
    trust: [FOOD_TRUST, PILATES_TRUST],
    getList:
      'the shared grocery list for the household, two separate targets and plans, the recipes at the planned quantity, and the training plan',
  },
  A8: {
    angle: 'A8',
    villain: 'the app that says nothing while the scale sits still',
    opening: 'Your plan is built, and it is built to change when the scale does not.',
    differentiator: 'The plan that changes when you do not',
    died: 'Three weeks, nothing on the scale, and the app said nothing at all. That is the bug.',
    barrierKey: 'barrier',
    barrierLead: 'When I asked what you do when it stops working, you said:',
    barrierReply:
      'That is the honest answer, and it is the wrong job to be doing. Reading a stall and recalculating is arithmetic, and it should not be yours.',
    signalKey: 'weighin',
    signalLead: 'You weigh in',
    proof: [
      'It reads your weigh ins over a rolling window, and when the trend stalls it changes the calorie number and re dates the finish rather than waiting for you to notice.',
      'The adjustment is capped and floored, so it corrects the plan without ever prescribing something unsafe.',
    ],
    trust: [FOOD_TRUST, GYM_TRUST],
    getList:
      'the plan that adapts from your weigh ins, the meal plan, the grocery list with real amounts, per meal adherence scoring, and the training plan',
  },
  A9: {
    angle: 'A9',
    villain: 'the stock model doing an exercise nobody checked',
    opening: 'Your plan is built, and every movement in it is demonstrated by a real person.',
    differentiator: 'A real coach. Real classes. Not AI slop.',
    died: 'You were copying a silhouette off a diagram and hoping.',
    barrierKey: 'barrier',
    barrierLead: 'When I asked whether you have ever found out you were doing one wrong, you said:',
    barrierReply:
      'That is far more common than anybody admits, and it is what happens when the demonstration is a drawing rather than a person.',
    signalKey: 'howknow',
    signalLead: 'On how you check your form, you said',
    proof: [
      'The Pilates is a real instructor teaching her own classes. 202 clips of her performing each movement, cued at the moment she cues it, coached in her own voice.',
      'Every lift has a start and a finish illustration, 182 of them, so there is no guessing at what the position is meant to be.',
    ],
    trust: [PILATES_TRUST, GYM_TRUST],
    getList:
      'the Pilates flows from a real instructor with 202 movement clips, 713 exercises with start and finish illustrations, the training plan, and the meal plan',
  },
  A10: {
    angle: 'A10',
    villain: 'the food you buy and never cook',
    opening: 'Your plan is built, and it is priced line by line.',
    differentiator: 'Same macros. Cheaper shop.',
    died: 'You are not overspending on food. You are overspending on food you never cook.',
    barrierKey: 'barrier',
    barrierLead: 'When I asked how much of what you buy actually gets eaten, you said:',
    barrierReply:
      'That gap is where a food budget actually goes, and no meal planner in this category will even show it to you.',
    signalKey: 'bill',
    signalLead: 'You put your weekly bill at',
    proof: [
      'Budget mode solves the same week against cheaper food. Same macros, fewer items, a lower total, rather than swapping things around on a finished list.',
      'And it flags what you buy and never cook, which is the part of a grocery bill nobody itemises.',
    ],
    trust: [FOOD_TRUST, PILATES_TRUST],
    getList:
      'budget mode, the grocery list priced line by line with the full shop total, the waste report, the meal plan, and the recipes at the planned quantity',
  },
  A11: {
    angle: 'A11',
    villain: 'training hard on a plate that never grew',
    opening: 'Your plan is built, and it is built to feed the training rather than survive it.',
    differentiator: 'Eat enough to actually grow',
    died: 'You trained hard enough. You just never ate like somebody who did.',
    barrierKey: 'barrier',
    barrierLead: 'When I asked what happens the day after a hard session, you said:',
    barrierReply:
      'That is what under eating around training feels like from the inside, and it is a plate problem rather than a programme problem.',
    signalKey: 'protein',
    signalLead: 'On protein you said',
    proof: [
      'A lean gain runs on a controlled surplus rather than a guess, with protein set from bodyweight rather than as a share of whatever you happened to eat.',
      'The training and the food are the same plan, so a heavier week gets fed like one.',
    ],
    trust: [GYM_TRUST, FOOD_TRUST],
    getList:
      'the surplus plan with protein set from bodyweight, the training plan with one rep max progression, 713 exercises, the meal plan and the grocery list',
  },
  A12: {
    angle: 'A12',
    villain: 'the all or nothing week',
    opening: 'Your plan is built, and it is designed to survive a bad Thursday.',
    differentiator: 'The app that gets you to day 28',
    died: 'One bad day ended the week, and then the week ended the month.',
    barrierKey: 'barrier',
    barrierLead: 'When I asked what a bad day looks like, you said:',
    barrierReply:
      'I am not going to tell you that is a planning problem, because it is not. What I will say is that a bad day only costs you the week when the plan has no way back in. This one does.',
    signalKey: 'whatends',
    signalLead: 'On what actually ends a good run, you said',
    proof: [
      'The plan is built to survive a bad day. There is a consistency grade and a streak that does not reset the moment you miss once.',
      'And when the scale stalls it reads the weigh ins and rewrites the calorie number and the finish date. It does not wait for you to notice.',
    ],
    trust: [FOOD_TRUST, PILATES_TRUST],
    getList:
      'the consistency grade and diary, the plan that adapts when the scale stalls, the meal plan, the grocery list with real amounts, and the training plan',
  },
  A13: {
    angle: 'A13',
    villain: 'the membership you pay for and do not use',
    opening: 'Your plan is built, and none of it needs a building.',
    differentiator: 'Cancel the membership',
    died: 'The membership was never the thing that was going to make you go.',
    barrierKey: 'barrier',
    barrierLead: 'When I asked what stops you on the days you do not go, you said:',
    barrierReply:
      'None of that gets solved by paying the membership again next month. It gets solved by the session not requiring the trip.',
    signalKey: 'often',
    signalLead: 'You said you actually go',
    proof: [
      'The whole plan runs at home, on whatever you already own, so the session does not depend on a commute or an opening hour.',
      'One payment, and then nothing monthly. Not a cheaper membership. No membership.',
    ],
    trust: [PILATES_TRUST, GYM_TRUST],
    getList:
      'the home training plan built to your equipment, the Pilates flows from a real instructor, 713 exercises, the meal plan and the grocery list',
  },
  A14: {
    angle: 'A14',
    villain: 'the stack',
    opening: 'Your plan is built, and all of it is in one place.',
    differentiator: 'Six apps. Now one.',
    died: 'It was never that you needed more tools. It was that none of them talked to each other.',
    barrierKey: 'barrier',
    barrierLead: 'When I asked how many you open before breakfast, you said:',
    barrierReply:
      'That is the tax on a stack. Every one of them holds a piece of the picture and none of them holds the picture.',
    signalKey: 'which',
    signalLead: 'The ones you named were',
    proof: [
      'Food, training, cardio, fasting, sleep and the journal all sit on one timeline, so the day reads as one day rather than six apps worth of fragments.',
      'One payment covers all of it, and there is no module sold separately later.',
    ],
    trust: [FOOD_TRUST, GYM_TRUST],
    getList:
      'all six modules on one timeline: food, training, cardio, fasting, sleep and the journal, plus the grocery list and 713 exercises',
  },
  A15: {
    angle: 'A15',
    villain: 'typing your dinner into a database every night',
    opening: 'Your plan is built, and most of the logging is already done by it existing.',
    differentiator: 'Stop logging every meal',
    died: 'You did not run out of willpower. You ran out of patience for data entry.',
    barrierKey: 'barrier',
    barrierLead: 'When I asked whether you have used a photo scanning app, you said:',
    barrierReply:
      'Fair. The scanner is convenience, not the point. The point is that a planned meal does not need logging at all, because it was already written down.',
    signalKey: 'loghow',
    signalLead: 'You said you log',
    proof: [
      'When the meal was planned, it is already recorded. Adherence is scored against what the plan asked for, so logging is a tick rather than a form.',
      'And when you eat something off plan, a photo with a confirmation step covers it. The same meal returns the same number every time.',
    ],
    trust: [FOOD_TRUST, PILATES_TRUST],
    getList:
      'the meal plan that logs itself, per meal adherence scoring, photo logging with a confirmation step, the grocery list with real amounts, and the training plan',
  },
};

export function packFor(angle: string | null | undefined): AnglePack {
  return (angle && PACKS[angle]) || DEFAULT_PACK;
}
