/* Angles A6–A10. See q-all.js for the shape and the rules. */
import {
  bodyBlock, trainingBlock, foodBlock, goalBridge, offerBridge, emailScreen,
  WHEN_TRAINING, WHEN_FOOD, WHEN_AIMED,
} from './q-kit.js';

const ask = (o) => Object.assign({ type: 'question' }, o);
const card = (o) => Object.assign({ type: 'interstitial' }, o);

const STORES = [
  { v: 'walmart', label: 'Walmart' }, { v: 'aldi', label: 'Aldi' }, { v: 'kroger', label: 'Kroger' },
  { v: 'target', label: 'Target' }, { v: 'costco', label: 'Costco' }, { v: 'trader', label: 'Trader Joes' },
  { v: 'safeway', label: 'Safeway' }, { v: 'publix', label: 'Publix' }, { v: 'other', label: 'Somewhere else' },
];
const NIGHTS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map((v) => ({
  v, label: v[0].toUpperCase() + v.slice(1),
}));

const TRAINING_OFFER = offerBridge({
  key: 'wantsTraining',
  title: 'The same plan writes a training week.',
  body: 'It is the half that makes the food actually work, and it is already included.',
  yes: 'Yes, build that as well', yesHint: 'Food and training on one plan',
  no: 'Just the food for now',
});
const FOOD_OFFER = offerBridge({
  key: 'wantsFood',
  title: 'The same plan writes your food.',
  body: 'Meals built around the training you just described, and a shopping list with the amounts '
      + 'on it.',
  yes: 'Yes, do the food too', yesHint: 'Meals and the grocery list',
  no: 'Just the training for now',
});

export const SET2 = {

/* =================================================================== A6 ==== *
 * Day 28. Whole-product: the pain is the restart loop itself.                 */
A6: {
  ad: 'The app that gets you to day 28',
  screens: [
    ask({ id: 'restarts', key: 'restarts', kicker: '2-minute quiz', title: 'Build my plan',
      sub: 'Built for the week you actually have, not the perfect one.',
      question: 'How many times have you started over this year?',
      options: [
        { v: '10+', label: 'More than ten. I lost count' }, { v: '4-9', label: 'Four or five' },
        { v: '2-3', label: 'Two or three' }, { v: 'once', label: 'This is the first proper go' }] }),
    ask({ id: 'howfar', key: 'howfar', question: 'How far do you usually get?',
      why: 'It tells us where the plan has to hold you.',
      options: [
        { v: 'days', label: 'A few days' }, { v: '2wk', label: 'Two weeks or so' },
        { v: 'month', label: 'About a month' }, { v: 'longer', label: 'Longer, then it fades' }] }),
    ask({ id: 'trigger', key: 'barrier', question: 'What actually ends it?',
      options: [
        { v: 'meal', label: 'One meal off plan, and the week goes' },
        { v: 'weekend', label: 'A weekend. Every time' },
        { v: 'busy', label: 'A genuinely chaotic week' },
        { v: 'bored', label: 'It just gets boring' }] }),
    card({ id: 'proof', eyebrow: 'The most common story in our research',
      title: 'One bad Thursday, and the whole week goes.',
      body: 'I already blew it, so I might as well write off the week and start Monday. That '
          + 'sentence, almost word for word, comes up again and again. It is not a character '
          + 'flaw — it is what happens when a plan grades you daily and one bad day reads as '
          + 'total failure.',
      cta: 'That is exactly it' }),
    card({ id: 'absolve', eyebrow: 'Worth saying plainly',
      title: 'You did not quit. The scoring did.',
      body: 'Grade the week instead of the day and a bad Thursday costs you a Thursday. That is '
          + 'the whole difference between reaching day 28 and starting again on Monday for the '
          + 'eleventh time.',
      cta: 'Keep going' }),
    ask({ id: 'yes', key: 'yes',
      question: 'If one bad day cost you a day instead of a week, would you still be going?',
      options: [
        { v: 'definitely', label: 'Almost certainly' }, { v: 'mostly', label: 'Probably' },
        { v: 'some', label: 'Maybe' }, { v: 'no', label: 'It is not the scoring, it is me' }] }),
    { id: 'gap', type: 'gap', title: 'What one bad day costs.',
      withUs: { n: '1 day', label: 'graded weekly' }, without: { n: '7 days', label: 'graded daily' },
      body: 'Same Thursday. Same pizza. Completely different Friday.', cta: 'Continue' },
    ask({ id: 'hardest', key: 'hardest', question: 'Which part falls over first?',
      why: 'Whichever you pick gets the most structure.',
      options: [
        { v: 'food', label: 'The food' }, { v: 'training', label: 'The training' },
        { v: 'both', label: 'Both together' }, { v: 'mood', label: 'Neither — my head goes first' }] }),
    offerBridge({ key: 'wantsFood', eyebrow: 'What should it hold for you',
      title: 'The food side, decided in advance.',
      body: 'A week written before Monday, so there is nothing to fall off — and a shopping list '
          + 'that means Monday is not a project.',
      yes: 'Yes, build the food', yesHint: 'Meals and the grocery list',
      no: 'Skip the food for now' }),
    { id: 'wasted', type: 'slider', key: 'wasted',
      question: 'Roughly what have you spent on plans, apps and memberships that did not stick?',
      why: 'A rough figure is fine. Nobody sees this.',
      min: 0, max: 3000, step: 50, start: 400, prefix: '$', suffix: 'a year' },
    { id: 'payoff', type: 'payoff', from: 'wasted', rate: 1, per: 'year',
      lead: 'So that is what starting over has cost you.',
      caption: 'a year, on plans that ended before day 28',
      tail: 'Dayspine is one payment. If it gets you past day 28 once, it has already done '
          + 'something none of those managed.', cta: 'Continue' },
    ...foodBlock({ when: WHEN_FOOD }),
    goalBridge({ title: 'Should it aim at anything?',
      body: 'A target gives the week a shape. Or it can simply be a week that holds together.',
      noneLabel: 'Just keep me consistent' }),
    ...bodyBlock({ when: WHEN_AIMED }),
    offerBridge({ key: 'wantsTraining', title: 'And the training week.',
      body: 'Sessions scheduled around the days you actually have, with rest written in — so a '
          + 'missed one is planned for rather than fatal.',
      yes: 'Yes, build the training', no: 'Skip the training for now' }),
    ...trainingBlock({}),
    emailScreen({}),
  ],
  building: ['Reading your answers…', 'Grading the week, not the day…', 'Writing in the rest…',
    'Choosing meals you will keep…', 'Locking your week…'],
},

/* =================================================================== A7 ==== *
 * One list, two people. Food-led; the household is the whole story.           */
A7: {
  ad: 'One list, two people',
  screens: [
    ask({ id: 'who', key: 'who', kicker: '2-minute quiz', title: 'Build my list',
      sub: 'One dinner, two sets of numbers. One payment, no subscription.',
      question: 'Who else are you cooking for?',
      options: [
        { v: 'partner-diff', label: 'A partner on completely different goals' },
        { v: 'partner-same', label: 'A partner, roughly the same' },
        { v: 'kids', label: 'Kids, plus me' },
        { v: 'family', label: 'A whole household' }] }),
    ask({ id: 'dinners', key: 'barrier', question: 'So how many dinners get made on a normal night?',
      options: [
        { v: 'two', label: 'Two. Every night' }, { v: 'sometimes', label: 'Two a few times a week' },
        { v: 'compromise', label: 'One, and I compromise mine' },
        { v: 'one', label: 'One that works for everyone' }] }),
    card({ id: 'proof', eyebrow: 'The part nobody builds for',
      title: 'Every plan on the market is written for exactly one person.',
      body: 'Which is why you end up cooking twice, shopping twice and binning half of it. The '
          + 'decision fatigue of feeding yourself and everybody else is what actually ends most '
          + 'plans — not the food.',
      cta: 'That is my house' }),
    { id: 'cost', type: 'tiles', key: 'cost', multi: true,
      question: 'What does doing it twice cost you?',
      why: 'Whichever you pick is what your plan removes first.',
      options: [
        { v: 'time', label: 'An hour of my evening' }, { v: 'waste', label: 'Food in the bin' },
        { v: 'money', label: 'A much bigger shop' }, { v: 'plan', label: 'My own plan slipping' },
        { v: 'peace', label: 'The mood in the kitchen' }] },
    card({ id: 'absolve', eyebrow: 'Worth saying plainly',
      title: 'You are not disorganised. You are cooking two plans.',
      body: 'Nobody could keep that up. One dinner, portioned differently for each person, off one '
          + 'shopping list — that is one job instead of three, and it is the version that '
          + 'survives a Wednesday.',
      cta: 'Keep going' }),
    ask({ id: 'yes', key: 'yes',
      question: 'If one dinner covered both of you at different amounts, would that end the '
              + 'double cooking?',
      options: [
        { v: 'definitely', label: 'Completely' }, { v: 'mostly', label: 'Most nights' },
        { v: 'some', label: 'Some nights' }, { v: 'no', label: 'We are too far apart for that' }] }),
    { id: 'gap', type: 'gap', title: 'Dinners cooked in a week.',
      withUs: { n: '7', label: 'one plan, two portions' },
      without: { n: '14', label: 'two plans' },
      body: 'Same food, same goals, half the pans.', cta: 'Continue' },
    { id: 'store', type: 'tiles', key: 'x.store', question: 'Where do you shop?',
      why: 'Your week is costed against typical shelf prices — telling us where you shop is how that gets sharper.', options: STORES },
    { id: 'nights', type: 'tiles', key: 'x.cookNights', multi: true,
      question: 'Which nights does someone actually cook?',
      why: 'So the plan knows which nights it is actually writing for.', options: NIGHTS },
    ask({ id: 'cooktime', key: 'x.cookTime',
      question: 'On a normal weeknight, how long are you willing to be in the kitchen?',
      why: 'One dinner that works for everyone should cost you less time, not more.',
      options: [
        { v: '15', label: 'Fifteen minutes' }, { v: '30', label: 'About half an hour' },
        { v: '45', label: 'Up to forty-five' }, { v: 'enjoy', label: 'I like cooking — take your time' }] }),
    ...foodBlock({ dietQ: 'How does the house eat?',
      budgetQ: 'What does the shop cost for all of you in a week?' }),
    { id: 'payoff', type: 'payoff', from: 'p.weeklyBudget', rate: 0.18, per: 'week',
      lead: 'One planned shop for the household runs about 18% under two improvised ones.',
      tail: 'That is the overlap between meals you were never getting.', cta: 'Continue' },
    goalBridge({ title: 'Should your half aim at something?',
      body: 'The dinner stays the same for everyone — only your portion and your targets change.',
      noneLabel: 'No, just feed us properly' }),
    ...bodyBlock({ when: WHEN_AIMED, title: 'Then it needs your numbers.',
      why: 'Only yours. Everyone else is portioned from the same dinner.' }),
    TRAINING_OFFER,
    ...trainingBlock({}),
    emailScreen({ title: 'Where should the list go?', cta: 'Build my list' }),
  ],
  building: ['Reading your answers…', 'Finding dinners that work for everyone…',
    'Splitting the portions…', 'Merging it into one shop…', 'Writing your grocery list…'],
},

/* =================================================================== A8 ==== *
 * The plan that changes when you don't. The weigh-in IS the subject, so the
 * body block is never gated here — hiding it would make the ad incoherent.    */
A8: {
  ad: 'The plan that changes when you don’t',
  screens: [
    ask({ id: 'stalled', key: 'stalled', kicker: '2-minute quiz', title: 'Build my plan',
      sub: 'A plan that reads your weigh-ins and moves.',
      question: 'How long have you been doing everything right with nothing to show?',
      options: [
        { v: 'months', label: 'Months' }, { v: '4-8wk', label: 'A month or two' },
        { v: '2-3wk', label: 'Two or three weeks' }, { v: 'moving', label: 'It is actually moving' }] }),
    ask({ id: 'weighin', key: 'weighin', question: 'How often do you weigh in?',
      why: 'It sets how quickly your plan is allowed to react.',
      options: [
        { v: 'daily', label: 'Most days' }, { v: 'weekly', label: 'Once a week' },
        { v: 'sometimes', label: 'When I feel brave' },
        { v: 'stopped', label: 'I stopped. It was demoralising' }] }),
    ask({ id: 'whenstall', key: 'barrier', question: 'When it stops working, what do you do?',
      options: [
        { v: 'harder', label: 'The same thing, harder' },
        { v: 'cut', label: 'Cut calories further' },
        { v: 'switch', label: 'Switch plan entirely' },
        { v: 'quit', label: 'Lose faith and drift off it' }] }),
    card({ id: 'proof', eyebrow: 'Why this keeps happening',
      title: 'Your app watched you stall and did nothing.',
      body: 'It had every weigh-in you ever gave it. It knew the number had not moved in three '
          + 'weeks. And it showed you the same target the next morning, because almost none of '
          + 'them are built to change their own advice.',
      cta: 'That is infuriating' }),
    card({ id: 'absolve', eyebrow: 'Worth saying plainly',
      title: 'Three weeks of doing it right is not failure.',
      body: 'It is information, and it should have triggered something. A plan that never changes '
          + 'when the result does not is not a plan — it is a starting guess you were left to '
          + 'carry on your own.',
      cta: 'Keep going' }),
    ask({ id: 'yes', key: 'yes',
      question: 'If it told you straight that it was not working, and moved the numbers itself — '
              + 'would you trust it more?',
      options: [
        { v: 'definitely', label: 'Far more' }, { v: 'mostly', label: 'Probably' },
        { v: 'some', label: 'A bit' }, { v: 'no', label: 'I would rather decide myself' }] }),
    { id: 'gap', type: 'gap', title: 'After three flat weeks.',
      withUs: { n: 'Moves', label: 'target and week rewritten' },
      without: { n: 'Nothing', label: 'same number, again' },
      body: 'It reads the weigh-ins you have already given it, moves the target, and rebuilds the '
          + 'week underneath it.', cta: 'Continue' },
    ...bodyBlock({ when: null, title: 'It needs a baseline to move from.',
      why: 'This is the number your plan watches. Nothing here is shown to anyone.',
      targetQ: 'And where are you trying to get to?',
      paceWhy: 'It starts here and adjusts when the scale disagrees.' }),
    offerBridge({ key: 'wantsFood', title: 'The food moves with it.',
      body: 'When the target changes, the meals and the shopping list change too — not just a '
          + 'number on a screen.',
      yes: 'Yes, build the food', no: 'Skip the food for now' }),
    ...foodBlock({ when: WHEN_FOOD }),
    offerBridge({ key: 'wantsTraining', title: 'And the training moves with it.',
      body: 'More days means more food, and a stall changes the sessions too.',
      yes: 'Yes, build the training', no: 'Skip the training for now' }),
    ...trainingBlock({}),
    { id: 'spend', type: 'slider', key: 'spend',
      question: 'While it has been stuck, what have you been paying to fix it?',
      why: 'Apps, supplements, a coach, a membership. Roughly, per month.',
      min: 0, max: 400, step: 5, start: 60, prefix: '$', suffix: 'a month' },
    { id: 'payoff', type: 'payoff', from: 'spend', rate: 1, per: 'month',
      lead: 'That is what a stalled plan has been costing you.',
      caption: 'a year, for a number that did not move',
      tail: 'The effort was never the problem. Nothing was adjusting to what the effort was '
          + 'actually doing.', cta: 'Continue' },
    emailScreen({}),
  ],
  building: ['Reading your answers…', 'Setting your starting targets…',
    'Working out your finish date…', 'Writing your week…', 'Arming the check-in…'],
},

/* =================================================================== A9 ==== *
 * A real coach, not AI slop. Training-led; instruction is the product.        */
A9: {
  ad: 'A real coach, not AI slop',
  screens: [
    ask({ id: 'howknow', key: 'howknow', kicker: '2-minute quiz', title: 'Build my plan',
      sub: 'A real instructor on screen. Not a name and a stick figure.',
      question: 'Mid-workout, how do you work out what a move actually is?',
      options: [
        { v: 'youtube', label: 'I stop and look it up' },
        { v: 'guess', label: 'I guess from the little diagram' },
        { v: 'skip', label: 'I skip it and do something I know' },
        { v: 'know', label: 'I usually know them' }] }),
    ask({ id: 'wrong', key: 'barrier', question: 'Have you ever found out you were doing one wrong?',
      options: [
        { v: 'months', label: 'Yes — after months of it' },
        { v: 'once', label: 'Once or twice, by accident' },
        { v: 'suspect', label: 'I suspect I am, right now' },
        { v: 'no', label: 'Not that I know of' }] }),
    card({ id: 'proof', eyebrow: 'The bit that is quietly awful',
      title: 'A move name and a stick figure is not instruction.',
      body: 'It is a label. So you pause, you search, you lose the thread of the session — and '
          + 'after a few weeks of that you quietly stop, without ever deciding to. Watching '
          + 'someone do the movement is not a luxury feature. It is the whole thing.',
      cta: 'Go on' }),
    ask({ id: 'holdback', key: 'holdback', question: 'What stops you pushing harder?',
      why: 'Whichever you pick changes how your sessions are coached.',
      options: [
        { v: 'form', label: 'Not trusting my form' },
        { v: 'hurt', label: 'Worrying I will hurt myself' },
        { v: 'unsure', label: 'Not knowing if it is even the right move' },
        { v: 'nothing', label: 'Nothing — I go hard' }] }),
    card({ id: 'absolve', eyebrow: 'Worth saying plainly',
      title: 'You were not being coached. You were being labelled.',
      body: 'Nobody learns a movement from two words and a wireframe. Every pause you took was '
          + 'the reasonable response to being handed a name instead of a demonstration.',
      cta: 'Keep going' }),
    ask({ id: 'yes', key: 'yes',
      question: 'If the instructor was on screen doing it, would you stop stopping?',
      options: [
        { v: 'definitely', label: 'Completely' }, { v: 'mostly', label: 'Mostly' },
        { v: 'some', label: 'A bit' }, { v: 'no', label: 'I would still check' }] }),
    { id: 'gap', type: 'gap', title: 'A forty-minute session.',
      withUs: { n: '0 min', label: 'looking things up' },
      without: { n: '11 min', label: 'stopped, on your phone' },
      body: 'Paused, searching, watching a stranger demonstrate it, finding your place again.',
      cta: 'Continue' },
    ...trainingBlock({ when: null, pilatesQ: 'Want the filmed Pilates classes too?',
      daysWhy: 'Every session is coached, whichever you pick.' }),
    FOOD_OFFER,
    ...foodBlock({ when: WHEN_FOOD }),
    goalBridge({ title: 'Should any of it aim at something?',
      body: 'A goal changes the loading and the calories. Or it can just be training done properly.',
      noneLabel: 'Just coach me well' }),
    ...bodyBlock({ when: WHEN_AIMED }),
    { id: 'lookup', type: 'slider', key: 'lookup',
      question: 'In a session, how long goes on working out what a movement actually is?',
      why: 'Phone out, video, watching it twice, finding your place again.',
      min: 0, max: 25, step: 1, start: 7, suffix: 'minutes a session' },
    { id: 'payoff', type: 'payoff', from: 'lookup', rate: 1, per: 'week',
      timesFrom: 'p.daysPerWeek', unit: 'hours',
      lead: 'Across the days you train, that is:',
      caption: 'hours a year, stood still with your phone out',
      tail: 'Every movement in your week is filmed and talked through. There is nothing to '
          + 'look up.', cta: 'Continue' },
    emailScreen({}),
  ],
  building: ['Reading your answers…', 'Picking movements you can be coached through…',
    'Matching the class footage…', 'Writing your week…', 'Setting your progressions…'],
},

/* ================================================================== A10 ==== *
 * Same macros, cheaper groceries. Food-led; money is the subject.             */
A10: {
  ad: 'Same macros, cheaper groceries',
  screens: [
    ask({ id: 'bill', key: 'bill', kicker: '2-minute quiz', title: 'Build my list',
      sub: 'Same calories, same protein — a smaller shop.',
      question: 'What has happened to your grocery bill?',
      options: [
        { v: 'wayup', label: 'Way up, and I cannot say why' }, { v: 'up', label: 'Up a bit' },
        { v: 'eating', label: 'Up since I started eating properly' },
        { v: 'same', label: 'About the same' }] }),
    ask({ id: 'eaten', key: 'barrier', question: 'How much of what you buy actually gets eaten?',
      options: [
        { v: 'half', label: 'About half, if I am honest' },
        { v: 'produce', label: 'Everything except the fresh stuff' },
        { v: 'most', label: 'Most of it' }, { v: 'all', label: 'Nearly all of it' }] }),
    card({ id: 'proof', eyebrow: 'Where it actually goes',
      title: 'It is not that you are buying expensive food.',
      body: 'It is that you are buying too many different things. Forty ingredients across seven '
          + 'days means half get used once and the rest goes off in the drawer. Fewer '
          + 'ingredients, planned to overlap, is the same food for a lot less money.',
      cta: 'That makes sense' }),
    ask({ id: 'budgeting', key: 'budgeting', question: 'Do you shop to a budget?',
      why: 'If you set one, the plan has to fit inside it.',
      options: [
        { v: 'try', label: 'I try, and I always go over' },
        { v: 'no', label: 'No — I just wince at the total' },
        { v: 'strict', label: 'Yes, strictly' },
        { v: 'want', label: 'I would love to, but nothing helps me' }] }),
    card({ id: 'absolve', eyebrow: 'Worth saying plainly',
      title: 'The waste was designed in.',
      body: 'A recipe app picks seven unrelated dinners because they photograph well, not because '
          + 'they share a shopping list. You paid for an overlap that was never there — and then '
          + 'binned it on Sunday.',
      cta: 'Keep going' }),
    ask({ id: 'yes', key: 'yes',
      question: 'If the week was built to a number you set, would you stop going over?',
      options: [
        { v: 'definitely', label: 'Definitely' }, { v: 'mostly', label: 'Most weeks' },
        { v: 'some', label: 'Some weeks' }, { v: 'no', label: 'I would still overspend' }] }),
    { id: 'store', type: 'tiles', key: 'x.store', question: 'Where do you shop?',
      why: 'Your week is costed against typical shelf prices — telling us where you shop is how that gets sharper.', options: STORES },
    { id: 'nights', type: 'tiles', key: 'x.cookNights', multi: true,
      question: 'Which nights do you actually cook?',
      why: 'Nights you do not cook are nights the shop does not need to cover.',
      options: [{ v: 'mon', label: 'Mon' }, { v: 'tue', label: 'Tue' }, { v: 'wed', label: 'Wed' },
        { v: 'thu', label: 'Thu' }, { v: 'fri', label: 'Fri' }, { v: 'sat', label: 'Sat' },
        { v: 'sun', label: 'Sun' }] },
    ...foodBlock({ budgetQ: 'What is the shop costing you a week right now?',
      budgetWhy: 'Slide to the real number. Your plan gets built to come in under it.' }),
    { id: 'payoff', type: 'payoff', from: 'p.weeklyBudget', rate: 0.18, per: 'week',
      lead: 'Planned to overlap, the same calories and the same protein come in about 18% cheaper.',
      tail: 'Not cheaper food. Fewer things, all of them used.', cta: 'Continue' },
    { id: 'gap', type: 'gap', title: 'Ingredients in a week.',
      withUs: { n: '42', label: 'planned to overlap' },
      without: { n: '70+', label: 'seven separate recipes' },
      body: 'Every extra ingredient is one more thing bought once and thrown away.',
      cta: 'Continue' },
    goalBridge({ title: 'Should the food aim at anything?',
      body: 'Same shop either way — a goal only changes the amounts on your plate.',
      noneLabel: 'No, just cheaper and planned' }),
    ...bodyBlock({ when: WHEN_AIMED }),
    TRAINING_OFFER,
    ...trainingBlock({}),
    emailScreen({ title: 'Where should the list go?', cta: 'Build my list' }),
  ],
  building: ['Reading your answers…', 'Finding meals that share ingredients…',
    'Costing it against your store…', 'Bringing it under your budget…', 'Writing your grocery list…'],
},
};
