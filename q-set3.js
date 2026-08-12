/* Angles A11–A15. See q-all.js for the shape and the rules. */
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

export const SET3 = {

/* ================================================================== A11 ==== *
 * Eating enough to build. Training-led, and the numbers ARE the subject, so
 * the body block is never gated — undereating is the whole ad.                */
A11: {
  ad: 'Eating enough to actually build',
  screens: [
    ask({ id: 'trainday', key: 'trainday', kicker: '2-minute quiz', title: 'Build my plan',
      sub: 'Eating for the training, not against it.',
      question: 'How do you eat on a training day versus a rest day?',
      options: [
        { v: 'same', label: 'Exactly the same' },
        { v: 'less', label: 'Less, if anything — I am being good' },
        { v: 'guess', label: 'More, but I am guessing' },
        { v: 'planned', label: 'Different, and it is planned' }] }),
    ask({ id: 'protein', key: 'protein', question: 'How much protein do you actually get in a day?',
      why: 'It sets the number your plan has to hit for you.',
      options: [
        { v: 'noidea', label: 'Genuinely no idea' }, { v: 'low', label: 'Less than I should' },
        { v: 'guess', label: 'I aim for a number and hope' },
        { v: 'track', label: 'I hit a target and know it' }] }),
    ask({ id: 'dayafter', key: 'barrier', question: 'What happens the day after a hard session?',
      options: [
        { v: 'wrecked', label: 'I am wrecked and starving' },
        { v: 'push', label: 'Nothing much — I push through' },
        { v: 'binge', label: 'I overeat, then feel guilty' },
        { v: 'fine', label: 'I recover fine' }] }),
    card({ id: 'proof', eyebrow: 'The mistake nobody warns you about',
      title: 'Training hard while eating like you are cutting.',
      body: 'It is the most disciplined-looking way to get nowhere. The sessions demand recovery, '
          + 'the food never arrives, and two years later you look almost exactly the same — while '
          + 'doing everything you were told to do.',
      cta: 'That is uncomfortable' }),
    card({ id: 'absolve', eyebrow: 'Worth saying plainly',
      title: 'It was never a discipline problem.',
      body: 'You were doing the hard part, five days a week, for years — on a food plan designed '
          + 'to take away, at exactly the moment your body needed something to build with.',
      cta: 'Keep going' }),
    ask({ id: 'yes', key: 'yes',
      question: 'If the food moved up on the days you train, would you finally see the work?',
      options: [
        { v: 'definitely', label: 'I think that is the whole problem' },
        { v: 'mostly', label: 'Probably' }, { v: 'some', label: 'Maybe' },
        { v: 'no', label: 'I would be scared to eat more' }] }),
    { id: 'gap', type: 'gap', title: 'Protein, most days.',
      withUs: { n: '120 g', label: 'held, every day' },
      without: { n: '60-70 g', label: 'eyeballed' },
      body: 'The difference between training that shows and training that maintains.',
      cta: 'Continue' },
    ...trainingBlock({ when: null, daysWhy: 'More days means more food. The plan moves with it.' }),
    /* Never gated: undereating is the ad, so the numbers are the point. */
    ...bodyBlock({ when: null, title: 'Now the numbers it feeds.',
      why: 'Your protein target is worked out from these. Nothing here is shown to anyone.',
      targetQ: 'Where are you trying to get to?',
      paceWhy: 'Building is slower than losing. These are honest rates.' }),
    FOOD_OFFER,
    ...foodBlock({ when: WHEN_FOOD, dietQ: 'How do you eat?' }),
    { id: 'years', type: 'slider', key: 'years',
      question: 'How long have you been training properly?',
      why: 'Roughly. Off-and-on years still count.',
      min: 1, max: 15, step: 1, start: 3, suffix: 'years' },
    { id: 'payoff', type: 'payoff', from: 'years', rate: 1, per: 'week',
      timesFrom: 'p.daysPerWeek', unit: 'plain',
      lead: 'At the days a week you train, that is roughly:',
      caption: 'sessions — most of them underfed',
      tail: 'The training was never the missing part. Eating for it was.', cta: 'Continue' },
    emailScreen({}),
  ],
  building: ['Reading your answers…', 'Writing your training week…',
    'Working out what it costs you to recover…', 'Setting your protein…',
    'Building meals that hit it…'],
},

/* ================================================================== A12 ==== *
 * Mindset and the diary. Whole-product; the pain is the bad day.              */
A12: {
  ad: 'Mindset & the diary',
  screens: [
    ask({ id: 'whatends', key: 'whatends', kicker: '2-minute quiz', title: 'Build my plan',
      sub: 'For the days it is not about the food.',
      question: 'When a plan ends, what actually ends it?',
      options: [
        { v: 'badday', label: 'One bad day, and how I felt about it after' },
        { v: 'stress', label: 'Something stressful, nothing to do with food' },
        { v: 'boredom', label: 'Boredom' },
        { v: 'food', label: 'Honestly, the food itself' }] }),
    ask({ id: 'badday', key: 'barrier', question: 'What does a bad day usually look like?',
      options: [
        { v: 'eat', label: 'I eat everything, then hate myself' },
        { v: 'skip', label: 'I skip everything and hide from it' },
        { v: 'hold', label: 'I hold it together and pay for it later' },
        { v: 'rare', label: 'They are rare' }] }),
    card({ id: 'proof', eyebrow: 'Nobody asks this',
      title: 'No app has ever asked how you actually are.',
      body: 'They ask what you ate. They ask what you weigh. And the thing that ends most attempts '
          + 'is a bad Tuesday and the hour of self-loathing after it — which nothing on your phone '
          + 'has ever once acknowledged.',
      cta: 'That is true' }),
    ask({ id: 'pattern', key: 'pattern', question: 'Have you ever spotted a pattern in when it happens?',
      why: 'Two lines a day is all it takes for one to show up.',
      options: [
        { v: 'no', label: 'No — I have never looked' },
        { v: 'suspect', label: 'I suspect one, but nothing tracks it' },
        { v: 'yes', label: 'Yes, and it is always the same trigger' },
        { v: 'random', label: 'It feels random' }] }),
    card({ id: 'absolve', eyebrow: 'Worth saying plainly',
      title: 'You never fell off because of the food.',
      body: 'You fell off because of a Tuesday, and then because of what you said to yourself '
          + 'about the Tuesday. That is the actual mechanism, and it is the one thing every '
          + 'tracker on your phone is blind to.',
      cta: 'Keep going' }),
    ask({ id: 'yes', key: 'yes',
      question: 'If a bad day cost you a day instead of the whole thing, would you still be going?',
      options: [
        { v: 'definitely', label: 'Almost certainly' }, { v: 'mostly', label: 'Probably' },
        { v: 'some', label: 'Maybe' }, { v: 'no', label: 'I doubt it' }] }),
    { id: 'gap', type: 'gap', title: 'What a bad Tuesday costs.',
      withUs: { n: '1 day', label: 'the week is graded' },
      without: { n: 'The lot', label: 'the day is graded' },
      body: 'Two lines a day, a week scored as a week, and the pattern finally visible.',
      cta: 'Continue' },
    offerBridge({ key: 'wantsFood', eyebrow: 'And the rest of it',
      title: 'The food, decided in advance.',
      body: 'Fewer decisions is fewer chances for a bad day to become a bad week.',
      yes: 'Yes, build the food', no: 'Skip the food for now' }),
    ...foodBlock({ when: WHEN_FOOD }),
    goalBridge({ title: 'Should it aim at anything?',
      body: 'A target can help, or it can be the pressure that starts the spiral. Your call.',
      noneLabel: 'No target — just consistency' }),
    ...bodyBlock({ when: WHEN_AIMED }),
    offerBridge({ key: 'wantsTraining', title: 'And the training.',
      body: 'Scheduled around the days you actually have, with rest written in.',
      yes: 'Yes, build the training', no: 'Skip the training for now' }),
    ...trainingBlock({}),
    { id: 'lostdays', type: 'slider', key: 'lostdays',
      question: 'In a bad month, how many days go?',
      why: 'The ones where you know exactly what to do and do not do it.',
      min: 1, max: 20, step: 1, start: 6, suffix: 'days a month' },
    { id: 'payoff', type: 'payoff', from: 'lostdays', rate: 1, per: 'month', unit: 'plain',
      lead: 'Which puts it at about:',
      caption: 'days a year lost with nothing physically wrong',
      tail: 'No plan on the market treats that as the actual problem. It is the one thing '
          + 'standing between you and every plan you have already paid for.', cta: 'Continue' },
    emailScreen({}),
  ],
  building: ['Reading your answers…', 'Setting up your daily prompt…',
    'Grading the week, not the day…', 'Writing your week…', 'Locking it in…'],
},

/* ================================================================== A13 ==== *
 * I cancelled my gym. Training-led, home, money-aware.                        */
A13: {
  ad: 'I cancelled my gym',
  screens: [
    ask({ id: 'membership', key: 'membership', kicker: '2-minute quiz', title: 'Build my plan',
      sub: 'Ten feet away, five days a week. One payment.',
      question: 'Be honest about the gym membership.',
      options: [
        { v: 'paying', label: 'Paying for it, barely going' },
        { v: 'cancelled', label: 'Cancelled it, felt guilty' },
        { v: 'going', label: 'Paying and going properly' },
        { v: 'never', label: 'Never had one' }] }),
    ask({ id: 'often', key: 'often', question: 'How often do you actually get there?',
      why: 'It tells us how much the plan has to come to you instead.',
      options: [
        { v: 'never', label: 'Basically never' }, { v: 'month', label: 'Once or twice a month' },
        { v: 'week', label: 'Once a week, on a good week' },
        { v: 'regular', label: 'Two or three times a week' }] }),
    ask({ id: 'stops', key: 'barrier', question: 'What stops you on the days you do not go?',
      options: [
        { v: 'travel', label: 'The trip there and back' },
        { v: 'time', label: 'It never fits the day' },
        { v: 'energy', label: 'By the time I could go, I am done' },
        { v: 'dread', label: 'I dread the room itself' }] }),
    card({ id: 'proof', eyebrow: 'The most common membership in America',
      title: 'Forty dollars a month, used about twice.',
      body: 'It is the standard experience, not the shameful exception. And the reason is almost '
          + 'never laziness — it is the forty-five minutes of travel wrapped around a session that '
          + 'could have happened in your living room.',
      cta: 'That is me' }),
    card({ id: 'absolve', eyebrow: 'Worth saying plainly',
      title: 'You were not paying for a gym. You were paying for guilt.',
      body: 'Forty dollars, arriving on the first, reminding you of something you did not do. The '
          + 'problem was never the training — it was the commute wrapped around it.',
      cta: 'Keep going' }),
    ask({ id: 'yes', key: 'yes',
      question: 'If it were ten feet away and already written, would you actually do it?',
      options: [
        { v: 'definitely', label: 'Most days, genuinely' },
        { v: 'mostly', label: 'A lot more than now' },
        { v: 'some', label: 'I would still need telling what to do' },
        { v: 'no', label: 'Probably not' }] }),
    { id: 'membercost', type: 'slider', key: 'p.gymSpend',
      question: 'What is the membership costing you a month?',
      why: 'Slide to what leaves your account. Zero is fine if you already cancelled.',
      min: 0, max: 150, step: 5, start: 40, prefix: '$', suffix: 'a month' },
    { id: 'payoff', type: 'payoff', from: 'p.gymSpend', rate: 1, per: 'month',
      caption: 'a year, for a building you stopped walking into',
      lead: 'That is what the membership takes off you in a year.',
      tail: 'Dayspine is $49, once, and it is already in your living room.', cta: 'Continue' },
    { id: 'gap', type: 'gap', title: 'Getting a session done.',
      withUs: { n: '20 min', label: 'at home' },
      without: { n: '95 min', label: 'with the trip' },
      body: 'Changing, driving, parking, waiting for a rack, driving back.', cta: 'Continue' },
    ...trainingBlock({ when: null, locationQ: 'Where would it happen now?',
      pilatesQ: 'Want mat Pilates in the week too?' }),
    FOOD_OFFER,
    ...foodBlock({ when: WHEN_FOOD }),
    goalBridge({ title: 'Should any of it aim at something?',
      body: 'A goal changes the loading and the food. Or it can just be training you will do.',
      noneLabel: 'Just get me training again' }),
    ...bodyBlock({ when: WHEN_AIMED }),
    emailScreen({}),
  ],
  building: ['Reading your answers…', 'Building for your living room…',
    'Fitting it to your minutes…', 'Writing your week…', 'Cancelling the commute…'],
},

/* ================================================================== A14 ==== *
 * Six apps in one. Whole-product; sprawl is the pain.                         */
A14: {
  ad: 'Six apps in one',
  screens: [
    ask({ id: 'howmany', key: 'howmany', kicker: '2-minute quiz', title: 'Build my plan',
      sub: 'One place. One payment. Nothing renews.',
      question: 'How many apps does your health live across?',
      options: [
        { v: '5+', label: 'Five or more' }, { v: '3-4', label: 'Three or four' },
        { v: '2', label: 'A couple' }, { v: '1', label: 'Just the one' }] }),
    { id: 'which', type: 'tiles', key: 'which', multi: true,
      question: 'Which of these are on your phone?',
      why: 'Everything you tick is already inside Dayspine, for the one payment.',
      options: [
        { v: 'food', label: 'Food' }, { v: 'training', label: 'Training' },
        { v: 'fasting', label: 'Fasting' }, { v: 'sleep', label: 'Sleep' },
        { v: 'mood', label: 'Mood' }, { v: 'steps', label: 'Steps' },
        { v: 'recipes', label: 'Recipes' }, { v: 'grocery', label: 'Groceries' },
        { v: 'water', label: 'Water' }] },
    ask({ id: 'breakfast', key: 'barrier', question: 'How many do you open before breakfast?',
      options: [
        { v: '3+', label: 'Three or more' }, { v: '2', label: 'Two' },
        { v: '1', label: 'One' }, { v: '0', label: 'None — I gave up on all of it' }] }),
    card({ id: 'proof', eyebrow: 'The daily cost of that',
      title: 'Four apps, and not one of them talks to the others.',
      body: 'A tracker, a training app, a fasting timer, something for sleep. Four logins, four '
          + 'subscriptions, four partial pictures of the same day — and no single place where you '
          + 'can see whether today actually went well.',
      cta: 'That is my phone' }),
    ask({ id: 'goodday', key: 'goodday',
      question: 'At the end of a day, can you tell whether it was a good one?',
      why: 'The whole day lands on one line, in the order it happened.',
      options: [
        { v: 'no', label: 'Not without opening four things' },
        { v: 'feel', label: 'Only by how I feel' },
        { v: 'partly', label: 'Partly — one number, not the picture' },
        { v: 'yes', label: 'Yes, easily' }] }),
    card({ id: 'absolve', eyebrow: 'Worth saying plainly',
      title: 'The admin was the workload.',
      body: 'Four apps is four small daily chores you are also paying for, and none of them can '
          + 'answer the only question that matters at ten at night: was today any good? The stack '
          + 'was the problem, not your consistency.',
      cta: 'Keep going' }),
    ask({ id: 'yes', key: 'yes',
      question: 'If all of it landed in one place, would you actually keep it up?',
      options: [
        { v: 'definitely', label: 'Far more likely' }, { v: 'mostly', label: 'Probably' },
        { v: 'some', label: 'Maybe' }, { v: 'no', label: 'I like them separate' }] }),
    { id: 'spend', type: 'slider', key: 'p.appSpend',
      question: 'What is the whole stack costing you a month?',
      why: 'Slide to the real number. Include the gym if you have one.',
      min: 0, max: 200, step: 5, start: 40, prefix: '$', suffix: 'a month' },
    { id: 'payoff', type: 'payoff', from: 'p.appSpend', rate: 1, per: 'month',
      caption: 'a year, split across apps that never talk to each other',
      lead: 'On its way to costing you this, every year, forever.',
      tail: 'Dayspine is $49. Once. And it is all of them.', cta: 'Continue' },
    { id: 'gap', type: 'gap', title: 'Before breakfast.',
      withUs: { n: '1', label: 'app, one line' }, without: { n: '4', label: 'apps, four logins' },
      body: 'Same day. Same data. One place that can actually answer for it.', cta: 'Continue' },
    offerBridge({ key: 'wantsFood', eyebrow: 'What should it replace first',
      title: 'The food apps.',
      body: 'Meals written for the week, a grocery list with amounts, and photo logging that shows '
          + 'you the numbers before it saves anything.',
      yes: 'Yes, replace those', no: 'Skip the food for now' }),
    ...foodBlock({ when: WHEN_FOOD }),
    goalBridge({ title: 'Should the food aim at anything?',
      body: 'It can point at a goal, or just be good food you like, planned properly.',
      noneLabel: 'Just plan it well' }),
    ...bodyBlock({ when: WHEN_AIMED }),
    offerBridge({ key: 'wantsTraining', title: 'And the training app.',
      body: 'Sessions coached by the real instructor, with the fasting timer and the journal '
          + 'alongside them.',
      yes: 'Yes, replace that too', no: 'Skip the training for now' }),
    ...trainingBlock({}),
    emailScreen({}),
  ],
  building: ['Reading your answers…', 'Collapsing four apps into one…', 'Writing your week…',
    'Costing your shop…', 'Putting your day on one line…'],
},

/* ================================================================== A15 ==== *
 * Photo meal logging. Food-led; the tedium of logging is the subject.         */
A15: {
  ad: 'Photo meal logging',
  screens: [
    ask({ id: 'loghow', key: 'loghow', kicker: '2-minute quiz', title: 'Build my plan',
      sub: 'Photograph the plate. Check it. Done.',
      question: 'How do you log food at the moment?',
      options: [
        { v: 'type', label: 'Typing it in, meal by meal' },
        { v: 'weigh', label: 'Weighing and typing. Every item' },
        { v: 'photo', label: 'A photo app that gets it wrong' },
        { v: 'stopped', label: 'I stopped. It was too much' }] }),
    ask({ id: 'lastlog', key: 'lastlog', question: 'How long do you usually last before you stop?',
      why: 'It tells us how much of the logging has to disappear.',
      options: [
        { v: 'days', label: 'Days' }, { v: 'weeks', label: 'A couple of weeks' },
        { v: 'months', label: 'A month or two' }, { v: 'still', label: 'I am still going' }] }),
    ask({ id: 'photoapp', key: 'barrier', question: 'Have you used a photo-scanning app?',
      options: [
        { v: 'wrong', label: 'Yes — the numbers were obviously wrong' },
        { v: 'correct', label: 'Yes, and I spent my time correcting it' },
        { v: 'ok', label: 'Yes, it was alright' },
        { v: 'no', label: 'Never tried one' }] }),
    card({ id: 'proof', eyebrow: 'The reason people quit',
      title: 'Logging is the part that ends it, not the eating.',
      body: 'Weigh it, search it, pick the wrong entry from a list of forty, correct the entry. '
          + 'Four times a day, every day. Nobody sustains that for a year — and the apps that '
          + 'promise to fix it with a photo mostly guess, so you end up correcting those too.',
      cta: 'Painfully accurate' }),
    card({ id: 'absolve', eyebrow: 'Worth saying plainly',
      title: 'You did not lack discipline. You were doing data entry.',
      body: 'Four rounds of typing a day is a job, and you were doing it unpaid, for an app you '
          + 'were paying for. Getting tired of it was the sane response.',
      cta: 'Keep going' }),
    ask({ id: 'yes', key: 'yes',
      question: 'If you saw the numbers before anything saved, and could fix a weight in one tap — '
              + 'would you trust it?',
      options: [
        { v: 'definitely', label: 'That is the whole thing' },
        { v: 'mostly', label: 'Probably' }, { v: 'some', label: 'I would still check' },
        { v: 'no', label: 'I would rather weigh it myself' }] }),
    { id: 'gap', type: 'gap', title: 'Logging one meal.',
      withUs: { n: '4 sec', label: 'photo, check, done' },
      without: { n: '90 sec', label: 'weigh, search, correct' },
      body: 'Four times a day, every day. That is the difference between a habit and a job.',
      cta: 'Continue' },
    ask({ id: 'howmuch', key: 'x.logDepth', question: 'How much do you actually want to log?',
      why: 'It tells us how much of the logging has to disappear for this to stick.',
      options: [
        { v: 'all', label: 'Everything, properly' },
        { v: 'offplan', label: 'Only the things that were not planned' },
        { v: 'little', label: 'As little as humanly possible' },
        { v: 'nothing', label: 'Nothing — just tell me what to eat' }] }),
    ...foodBlock({ dietQ: 'How do you eat?' }),
    { id: 'payoff', type: 'payoff', from: 'p.weeklyBudget', rate: 0.18, per: 'week',
      lead: 'And a planned week costs about 18% less than an improvised one.',
      tail: 'Which is what happens when the shop comes off the plan instead of the other way round.',
      cta: 'Continue' },
    goalBridge({ title: 'Should the plan aim at anything?',
      body: 'If it does, the numbers matter and it is worth logging the exceptions. If not, it '
          + 'just feeds you well and you can log nothing at all.',
      noneLabel: 'No target — just feed me properly' }),
    ...bodyBlock({ when: WHEN_AIMED }),
    TRAINING_OFFER,
    ...trainingBlock({}),
    emailScreen({}),
  ],
  building: ['Reading your answers…', 'Writing a week you barely need to log…',
    'Setting your targets…', 'Choosing meals you like…', 'Writing your grocery list…'],
},
};
