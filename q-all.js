/*
 * Fifteen quizzes, one per ad.
 *
 * ## The test every question had to pass
 *
 * "Would an app that does the thing this ad promised obviously need to know
 * this?" Applied honestly it kills a lot of standard quiz furniture. A grocery
 * ad has no business asking when you want to start. A gym-membership ad has no
 * business opening with your diet.
 *
 * ## Three shapes, because the ads come in three shapes
 *
 *   FOOD-LED     A1 A3 A7 A10 A15 — opens on the kitchen, offers training
 *   TRAINING-LED A4 A5 A9 A11 A13 — opens on the session, offers food
 *   WHOLE        A2 A6 A8 A12 A14 — the pain is the product itself, so it
 *                                   opens on the pain and offers both halves
 *
 * The body block never appears until she has asked for a goal, on every angle
 * except A8 and A11 where the weigh-in *is* the subject of the ad and skipping
 * it would be incoherent.
 *
 * Persuasion lives in the interstitials — proof, absolve, gap, payoff. The
 * questions stay light and functional. That is the finding from the reference
 * teardown and it is what makes a long quiz feel short.
 */
import {
  openerBlock, bodyBlock, trainingBlock, foodBlock, goalBridge, offerBridge, emailScreen,
  WHEN_TRAINING, WHEN_FOOD, WHEN_AIMED,
} from './q-kit.js';

const ask = (o) => Object.assign({ type: 'question' }, o);
const card = (o) => Object.assign({ type: 'interstitial' }, o);

/* Offered on food-led angles, once the kitchen is done. */
const TRAINING_OFFER = offerBridge({
  key: 'wantsTraining',
  title: 'The same plan writes a training week.',
  body: 'It is the half that makes the food actually work, and it is already included. A few more '
      + 'taps and it is built too.',
  yes: 'Yes, build that as well', yesHint: 'Food and training on one plan',
  no: 'Just the food for now',
});

/* Offered on training-led angles, once the session is done. */
const FOOD_OFFER = offerBridge({
  key: 'wantsFood',
  title: 'The same plan writes your food.',
  body: 'Meals built around the training you just described, and a shopping list with the amounts '
      + 'on it. It is what makes the sessions actually show.',
  yes: 'Yes, do the food too', yesHint: 'Meals and the grocery list',
  no: 'Just the training for now',
});

export const ANGLES = {

/* ==================================================================== A1 === *
 * The grocery list. Food-led.                                                 */
A1: {
  ad: 'The grocery list',
  screens: [
    ask({ id: 'listhow', key: 'listhow', kicker: '2-minute quiz', title: 'Build my list',
      sub: 'Off your plan, with the amounts on it. One payment, no subscription.',
      question: 'How do you write your grocery list at the moment?',
      options: [
        { v: 'hand', label: 'By hand, off recipes' },
        { v: 'notes', label: 'A notes app, as things occur to me' },
        { v: 'memory', label: 'I wing it in the aisles' },
        { v: 'app', label: 'An app attempts it for me' }] }),
    ask({ id: 'howoften', key: 'x.shopCadence', question: 'How often do you do a big shop?',
      why: 'One big shop and a top-up are different lists. This is how we know which you want.',
      options: [
        { v: 'weekly', label: 'Once a week' },
        { v: 'twice', label: 'A couple of times a week' },
        { v: 'often', label: 'Little and often' },
        { v: 'chaos', label: 'There is no rhythm to it' }] }),
    ask({ id: 'wrong', key: 'barrier', question: 'What usually goes wrong?',
      options: [
        { v: 'forget', label: 'I forget the one thing dinner needed' },
        { v: 'amounts', label: 'Right food, wrong amounts' },
        { v: 'toomuch', label: 'I buy far more than we get through' },
        { v: 'rots', label: 'Half of it goes off before I use it' }] }),
    card({ id: 'proof', eyebrow: 'You are not the only one',
      title: 'Every meal planner on the market ships a broken list.',
      body: 'Missing quantities. Items silently dropped on the way to the list. No way to add a '
          + 'whole week at once. We read thousands of reviews of the big ones and the same six '
          + 'complaints come up every time — which is why the list is the first thing Dayspine '
          + 'gets right, not the last.',
      cta: 'That sounds familiar' }),
    card({ id: 'absolve', eyebrow: 'Worth saying plainly',
      title: 'You were doing the app’s job for it.',
      body: 'Copying ingredients off a recipe is data entry. Something already knows what you are '
          + 'eating on Thursday — the list is just arithmetic on top of that, and it should have '
          + 'been handed to you years ago.',
      cta: 'Go on' }),
    ask({ id: 'yes', key: 'yes',
      question: 'If the list arrived already written, with the amounts on it — would that give '
              + 'you your Sunday back?',
      options: [
        { v: 'definitely', label: 'Definitely' }, { v: 'mostly', label: 'Most of it' },
        { v: 'some', label: 'Some of it' }, { v: 'no', label: 'Not really' }] }),
    ask({ id: 'sunday', key: 'sunday',
      question: 'How long does the whole job take you — deciding, listing, shopping?',
      why: 'It sets how much time your plan has to give back.',
      options: [
        { v: 'over2', label: 'Over two hours' }, { v: '1-2', label: 'An hour or two' },
        { v: 'under1', label: 'Under an hour' }, { v: 'avoid', label: 'I have started avoiding it' }] }),
    { id: 'gap', type: 'gap', title: 'The same Sunday, both ways.',
      withUs: { n: '4 min', label: 'with Dayspine' }, without: { n: '90 min', label: 'on your own' },
      body: 'Deciding, costing and writing the list — done before you open your eyes.',
      cta: 'Continue' },
    { id: 'store', type: 'tiles', key: 'x.store', question: 'Where do you shop?',
      why: 'Your week is costed against typical shelf prices — telling us where you shop is how that gets sharper.',
      options: [
        { v: 'walmart', label: 'Walmart' }, { v: 'aldi', label: 'Aldi' }, { v: 'kroger', label: 'Kroger' },
        { v: 'target', label: 'Target' }, { v: 'costco', label: 'Costco' }, { v: 'trader', label: "Trader Joe's" },
        { v: 'safeway', label: 'Safeway' }, { v: 'publix', label: 'Publix' }, { v: 'other', label: 'Somewhere else' }] },
    { id: 'nights', type: 'tiles', key: 'x.cookNights', multi: true,
      question: 'Which nights do you actually cook?',
      why: 'So the plan knows which nights it is actually writing for.',
      options: [{ v: 'mon', label: 'Mon' }, { v: 'tue', label: 'Tue' }, { v: 'wed', label: 'Wed' },
        { v: 'thu', label: 'Thu' }, { v: 'fri', label: 'Fri' }, { v: 'sat', label: 'Sat' },
        { v: 'sun', label: 'Sun' }] },
    ask({ id: 'cooktime', key: 'x.cookTime',
      question: 'On a weeknight, how long are you really willing to spend?',
      why: 'So nothing lands in your week that you were never going to cook.',
      options: [
        { v: '15', label: 'Fifteen minutes' }, { v: '30', label: 'About half an hour' },
        { v: '45', label: 'Up to forty-five' }, { v: 'enjoy', label: 'I like cooking — take your time' }] }),
    ...foodBlock({ includeHousehold: true, dietQ: 'How does the house eat?' }),
    { id: 'payoff', type: 'payoff', from: 'p.weeklyBudget', rate: 0.18, per: 'week',
      lead: 'A planned week comes in about 18% under an unplanned one — that is what the overlap '
          + 'between meals is worth.',
      tail: 'And it is the part no recipe app does for you.', cta: 'Continue' },
    goalBridge({ title: 'Your list comes off a meal plan.',
      body: 'Which means those meals can be aimed at something, if you want them to be. Or they '
          + 'can just be good food you like, planned properly.',
      loseLabel: 'Aim them at losing weight', gainLabel: 'Aim them at building muscle',
      noneLabel: 'Just plan them well' }),
    ...bodyBlock({ when: WHEN_AIMED }),
    TRAINING_OFFER,
    ...trainingBlock({}),
    emailScreen({ title: 'Where should the list go?',
      body: 'We save it against this address so your week is waiting inside the app — you will '
          + 'never fill this in twice.', cta: 'Build my list' }),
  ],
  building: ['Reading your answers…', 'Choosing meals you will actually cook…',
    'Costing the week against your budget…', 'Merging the ingredients…', 'Writing your grocery list…'],
},

/* ==================================================================== A2 === *
 * Buy it, don't rent it. Whole-product — the pain is the billing itself.       */
A2: {
  ad: 'Buy it, don’t rent it',
  screens: [
    ask({ id: 'billing', key: 'billing', kicker: '2-minute quiz', title: 'Build my plan',
      sub: 'One payment. Nothing renews. Ever.',
      question: 'How many fitness or food apps are billing you right now?',
      options: [
        { v: '3+', label: 'Three or more' }, { v: '2', label: 'Two' },
        { v: '1', label: 'One' }, { v: '0', label: 'None — I cancelled them all' }] }),
    { id: 'stack', type: 'tiles', key: 'stack', multi: true,
      question: 'Which of these are you paying for?',
      why: 'Everything you tick is already inside Dayspine, for the one payment.',
      options: [
        { v: 'tracker', label: 'Calorie tracker' }, { v: 'workout', label: 'Training app' },
        { v: 'fasting', label: 'Fasting timer' }, { v: 'recipes', label: 'Recipes' },
        { v: 'coach', label: 'A coach' }, { v: 'gym', label: 'Gym' },
        { v: 'sleep', label: 'Sleep' }, { v: 'mind', label: 'Journalling' },
        { v: 'none', label: 'None of them', exclusive: true }] },
    ask({ id: 'walls', key: 'barrier', question: 'What went wrong with the ones you have paid for?',
      options: [
        { v: 'paywall', label: 'The good part moved behind another paywall' },
        { v: 'unused', label: 'I stopped opening it and kept paying' },
        { v: 'trial', label: 'A trial charged me before I noticed' },
        { v: 'cancel', label: 'Cancelling was deliberately awkward' }] }),
    card({ id: 'proof', eyebrow: 'It is the loudest complaint in the category',
      title: 'The feature you paid for got taken away.',
      body: 'Across thousands of reviews the anger is almost never about price. It is about '
          + 'betrayal — things that were free became paid, then the good parts moved behind a '
          + 'second paywall, and you kept paying while getting less.',
      cta: 'That is exactly it' }),
    card({ id: 'absolve', eyebrow: 'Worth saying plainly',
      title: 'You did not fail. You were renting.',
      body: 'An app that bills monthly has to keep you subscribed, which is a different job from '
          + 'getting you a result. That is why the useful part is always one tier up.',
      cta: 'Go on' }),
    ask({ id: 'yes', key: 'yes',
      question: 'Would you rather pay once and own it, than pay every month forever?',
      options: [
        { v: 'definitely', label: 'Obviously' }, { v: 'mostly', label: 'If it is actually complete' },
        { v: 'some', label: 'Depends on the price' }, { v: 'no', label: 'I do not mind subscribing' }] }),
    ask({ id: 'howlong', key: 'howlong', question: 'How long have you been paying for this stuff?',
      why: 'It is used to work out what it has already cost you.',
      options: [
        { v: 'years', label: 'Years. I stopped counting' }, { v: '1-2', label: 'A year or two' },
        { v: 'months', label: 'A few months' }, { v: 'new', label: 'I am just starting out' }] }),
    { id: 'spend', type: 'slider', key: 'p.appSpend',
      question: 'What is all of that costing you a month, together?',
      why: 'Slide to the real number. Include the gym if you have one.',
      min: 0, max: 200, step: 5, start: 35, prefix: '$', suffix: 'a month' },
    { id: 'payoff', type: 'payoff', from: 'p.appSpend', rate: 1, per: 'month',
      caption: 'a year, rented — and you own none of it',
      lead: 'On its way to costing you this, every year, forever.',
      tail: 'Dayspine is $49. Once. There is no second year of it.', cta: 'Continue' },
    { id: 'gap', type: 'gap', title: 'Over two years.',
      withUs: { n: '$49', label: 'Dayspine, once' }, without: { n: '$1,200', label: 'four apps' },
      body: 'At fifty dollars a month across a tracker, a training app, a timer and a coach.',
      cta: 'Continue' },
    offerBridge({ key: 'wantsFood', eyebrow: 'What do you want built first',
      title: 'It covers the food side.',
      body: 'Meals written for the week, and a grocery list with the amounts on it — the thing '
          + 'your tracker never did.',
      yes: 'Yes, build the food', yesHint: 'Meals and the shopping list',
      no: 'Skip the food for now' }),
    ...foodBlock({ when: WHEN_FOOD }),
    goalBridge({ showIf: WHEN_FOOD, title: 'Should the food aim at anything?',
      body: 'It can be pointed at a goal, or it can just be good food you like, planned properly.',
      noneLabel: 'Just plan it well' }),
    ...bodyBlock({ when: WHEN_AIMED }),
    offerBridge({ key: 'wantsTraining', title: 'And the training side.',
      body: 'Sessions that talk you through the movements, with the real instructor on screen — '
          + 'replacing the training app in that list.',
      yes: 'Yes, build the training', yesHint: 'Gym or home, your call',
      no: 'Skip the training for now' }),
    ...trainingBlock({}),
    emailScreen({ cta: 'Build my plan' }),
  ],
  building: ['Reading your answers…', 'Replacing four subscriptions…', 'Writing your week…',
    'Costing your shop…', 'Locking it to one payment…'],
},

/* ==================================================================== A3 === *
 * Nobody gave you a plan. Food-led, decision fatigue.                          */
A3: {
  ad: 'Nobody gave you a plan',
  screens: [
    ask({ id: 'tonight', key: 'tonight', kicker: '2-minute quiz', title: 'Build my plan',
      sub: 'Told what to eat tonight. One payment, no subscription.',
      question: 'Do you know what you are eating tonight?',
      options: [
        { v: 'no', label: 'No idea yet' }, { v: 'vaguely', label: 'Vaguely — I will improvise' },
        { v: 'same', label: 'The same thing I always eat' }, { v: 'yes', label: 'Yes, it is planned' }] }),
    ask({ id: 'appsdo', key: 'barrier', question: 'What have the apps you have used actually done?',
      options: [
        { v: 'count', label: 'Counted what I had already eaten' },
        { v: 'nag', label: 'Reminded me I was behind' },
        { v: 'nothing', label: 'Sat there until I opened them' },
        { v: 'plan', label: 'Given me a plan', hint: 'Genuinely?' }] }),
    card({ id: 'proof', eyebrow: 'The most common sentence in our research',
      title: '“I just want to be told what to eat.”',
      body: 'That is a real quote, and versions of it come up over and over. Every app in this '
          + 'category counts. Almost none of them decide. The gap between those two words is '
          + 'where most people quit.',
      cta: 'That is me' }),
    ask({ id: 'sixpm', key: 'sixpm',
      question: 'It is six, you are hungry, the day was long. What happens?',
      why: 'Your plan is written to survive whichever this is.',
      options: [
        { v: 'stare', label: 'I stare into the fridge' }, { v: 'order', label: 'I order something' },
        { v: 'repeat', label: 'The same three meals' }, { v: 'planned', label: 'I already know' }] }),
    card({ id: 'absolve', eyebrow: 'Worth saying plainly',
      title: 'You were handed a spreadsheet and told it was coaching.',
      body: 'Knowing your numbers is not the same as being given a plan. You have been doing the '
          + 'deciding yourself, at the worst hour of the day, and then logging your own homework '
          + 'afterwards.',
      cta: 'Go on' }),
    ask({ id: 'yes', key: 'yes',
      question: 'If dinner was decided before you got home, would six o’clock stop being a decision?',
      options: [
        { v: 'definitely', label: 'Completely' }, { v: 'mostly', label: 'Mostly' },
        { v: 'some', label: 'A bit' }, { v: 'no', label: 'I quite like deciding' }] }),
    { id: 'gap', type: 'gap', title: 'Meals to invent in a week.',
      withUs: { n: '0', label: 'with a plan' }, without: { n: '21', label: 'on your own' },
      body: 'Every one of them at the end of a day, when you have the least left to decide with.',
      cta: 'Continue' },
    ask({ id: 'meals', key: 'x.mealsPerDay', question: 'How many meals a day should it plan?',
      why: 'So it plans the meals you actually eat, and leaves the rest alone.',
      options: [
        { v: '3', label: 'Three' }, { v: '4', label: 'Three and a snack' },
        { v: '2', label: 'Two — I skip breakfast' }, { v: 'dinner', label: 'Just dinner' }] }),
    { id: 'store', type: 'tiles', key: 'x.store', question: 'Where do you shop?',
      why: 'Your week is costed against typical shelf prices — telling us where you shop is how '
         + 'that gets sharper.',
      options: [
        { v: 'walmart', label: 'Walmart' }, { v: 'aldi', label: 'Aldi' }, { v: 'kroger', label: 'Kroger' },
        { v: 'target', label: 'Target' }, { v: 'costco', label: 'Costco' }, { v: 'trader', label: "Trader Joe's" },
        { v: 'safeway', label: 'Safeway' }, { v: 'publix', label: 'Publix' }, { v: 'other', label: 'Somewhere else' }] },
    { id: 'nights', type: 'tiles', key: 'x.cookNights', multi: true,
      question: 'Which nights do you actually cook?',
      why: 'So the plan only writes dinners for the nights that exist.',
      options: [{ v: 'mon', label: 'Mon' }, { v: 'tue', label: 'Tue' }, { v: 'wed', label: 'Wed' },
        { v: 'thu', label: 'Thu' }, { v: 'fri', label: 'Fri' }, { v: 'sat', label: 'Sat' },
        { v: 'sun', label: 'Sun' }] },
    ask({ id: 'cooktime', key: 'x.cookTime',
      question: 'How long will you actually spend cooking on a weeknight?',
      why: 'So nothing lands in your week that you were never going to cook.',
      options: [
        { v: '15', label: 'Fifteen minutes' }, { v: '30', label: 'About half an hour' },
        { v: '45', label: 'Up to forty-five' }, { v: 'enjoy', label: 'I enjoy cooking' }] }),
    ...foodBlock({ dietQ: 'How do you eat?' }),
    { id: 'payoff', type: 'payoff', from: 'p.weeklyBudget', rate: 0.18, per: 'week',
      lead: 'A decided week also costs less than an improvised one — about 18% less.',
      tail: 'Which is what happens when the shop is planned instead of guessed.', cta: 'Continue' },
    goalBridge({ title: 'Should the plan aim at anything?',
      body: 'It can point at a goal, or it can simply take the deciding off you and feed you well.',
      noneLabel: 'Just decide it for me' }),
    ...bodyBlock({ when: WHEN_AIMED }),
    TRAINING_OFFER,
    ...trainingBlock({}),
    emailScreen({}),
  ],
  building: ['Reading your answers…', 'Deciding your week…', 'Setting your targets…',
    'Choosing meals you like…', 'Writing your grocery list…'],
},

/* ==================================================================== A4 === *
 * One plan, not two apps. Training-led, and the food is the point of it.       */
A4: {
  ad: 'One plan, not two apps',
  screens: [
    /* Screens 1 and 2: the two questions that need no thought. See openerBlock.
       The headline names what you get; the subhead keeps the old command, which
       is the line the ad's viewer is expecting to see. */
    ...openerBlock({
      title: 'Your training and food, one plan',
      sub: 'Build my plan',
    }),
    /* The ad's own premise, now screen 3 rather than screen 1 -- asked once the
       visitor is already moving instead of as the price of entry. Half of all
       finishers pick "two apps", so it stays as the qualifier it always was.
       Options cut from up to eight words to two or three: the old set made a
       cold reader parse roughly thirty words before their first tap. */
    ask({ id: 'split', key: 'split',
      question: 'How do you plan your meals and workouts?',
      options: [
        { v: 'two', label: 'Two separate apps' },
        { v: 'apphead', label: 'An app for training, guesswork for food' },
        { v: 'paper', label: 'Written down, then improvised' },
        /* Was "One place / Which one?" -- a hint that asked a question the screen
           had no input to answer, so it read as a broken field. The people it was
           aimed at are almost all in the option below anyway: someone already
           running one joined-up plan is not the buyer. */
        { v: 'noplan', label: 'Honestly, I do not plan it' }] }),
    ask({ id: 'programs', key: 'programs', question: 'How many training programs have you run through?',
      why: 'It tells us how much structure you are used to.',
      options: [
        { v: '5+', label: 'Five or more' }, { v: '3-4', label: 'Three or four' },
        { v: '1-2', label: 'One or two' }, { v: 'none', label: 'Never followed a real one' }] }),
    ask({ id: 'changed', key: 'barrier', question: 'Be honest — what did the last one change?',
      options: [
        { v: 'nothing', label: 'Almost nothing, physically' },
        { v: 'strength', label: 'I got stronger, but I look the same' },
        { v: 'unfinished', label: 'I did not finish it' },
        { v: 'drifted', label: 'It worked, then I drifted' }] }),
    card({ id: 'proof', eyebrow: 'Why this stalls people',
      title: 'Your lifting app does not know what you ate.',
      body: 'And your food app does not know you pulled today. So the calories never move with '
          + 'the training and the training never accounts for the food — and the one question '
          + 'that matters, what should I eat today given what I just did, goes unanswered.',
      cta: 'That is the problem' }),
    card({ id: 'absolve', eyebrow: 'Worth saying plainly',
      title: 'It was never your discipline.',
      body: 'You did the sessions. You logged the food. Nobody ever gave you one plan where the '
          + 'two halves knew about each other, so the effort kept cancelling itself out and it '
          + 'read like a willpower problem.',
      cta: 'Go on' }),
    ask({ id: 'yes', key: 'yes',
      question: 'If the food moved with the training automatically, would you stop guessing?',
      options: [
        { v: 'definitely', label: 'Entirely' }, { v: 'mostly', label: 'Mostly' },
        { v: 'some', label: 'A bit' }, { v: 'no', label: 'I like managing it myself' }] }),
    { id: 'gap', type: 'gap', title: 'One plan, or two that ignore each other.',
      withUs: { n: '1', label: 'plan, both halves' }, without: { n: '2', label: 'apps, neither talks' },
      body: 'Two subscriptions, two logins, and no single place that can answer the only question '
          + 'that matters.',
      cta: 'Continue' },
    ...trainingBlock({ when: null, locationQ: 'Where do you train?',
      daysWhy: 'Your calories move with this — more days, more food.' }),
    FOOD_OFFER,
    ...foodBlock({ when: WHEN_FOOD, dietQ: 'How do you eat?' }),
    { id: 'payoff', type: 'payoff', from: 'p.weeklyBudget', rate: 0.18, per: 'week', showIf: WHEN_FOOD,
      lead: 'A planned shop also runs about 18% under an improvised one.',
      tail: 'Which is the quiet part of eating for your training instead of around it.',
      cta: 'Continue' },
    goalBridge({ title: 'What should the two halves aim at?',
      body: 'The training sets what you burn. The food sets what you build. Point them at the '
          + 'same thing and they stop cancelling out.',
      loseLabel: 'Losing fat, keeping strength', gainLabel: 'Building muscle',
      noneLabel: 'Neither — just make it coherent' }),
    ...bodyBlock({ when: WHEN_AIMED, omitAgeSex: true }),
    emailScreen({}),
  ],
  building: ['Reading your answers…', 'Writing your training week…', 'Matching calories to it…',
    'Choosing meals that fit…', 'Writing your grocery list…'],
},

/* ==================================================================== A5 === *
 * No gym, no equipment. Training-led, logistics-first.                         */
A5: {
  ad: 'No gym, no equipment',
  screens: [
    { id: 'blocker', type: 'tiles', key: 'barrier', multi: true,
      kicker: '2-minute quiz', title: 'Build my plan',
      sub: 'Built around the twenty minutes you actually have.',
      question: 'What is actually in the way of a gym?',
      why: 'Pick as many as are true.',
      options: [
        { v: 'time', label: 'The trip there and back' }, { v: 'kids', label: 'Childcare' },
        { v: 'money', label: 'Paying for something I barely use' },
        { v: 'room', label: 'The room itself' }, { v: 'energy', label: 'No energy by then' },
        { v: 'nothing', label: 'Nothing — I just do not go', exclusive: true }] },
    ask({ id: 'minutes', key: 'p.sessionMinutes', question: 'Realistically, how long have you got?',
      why: 'No session written for you will ever run longer than this.',
      options: [
        { v: '15', label: 'Fifteen minutes' }, { v: '20-30', label: 'Twenty to thirty' },
        { v: '45', label: 'Forty-five, if it is planned' },
        { v: 'varies', label: 'Wildly different every day' }] }),
    card({ id: 'proof', eyebrow: 'Worth saying plainly',
      title: 'Home training is not the compromise version.',
      body: 'Most home plans are a gym plan with the machines crossed out, which is exactly why '
          + 'they feel like less. A plan built for a mat, a band and two dumbbells from the start '
          + 'is a different thing — and it is the one you will actually do on a Tuesday.',
      cta: 'Go on' }),
    ask({ id: 'homefail', key: 'homefail', question: 'When you have tried training at home, what went wrong?',
      options: [
        { v: 'what', label: 'I never knew what to actually do' },
        { v: 'bored', label: 'Same four moves, got bored' },
        { v: 'form', label: 'I was not sure I was doing it right' },
        { v: 'stopped', label: 'Life happened and it stopped' }] }),
    card({ id: 'absolve', eyebrow: 'And plainly again',
      title: 'You do not need more discipline.',
      body: 'You need a week that survives a bad Tuesday — built for the room you are standing in '
          + 'and the time you actually have, so there is nothing to organise before you start.',
      cta: 'Keep going' }),
    ask({ id: 'yes', key: 'yes',
      question: 'If it was written for your living room and took twenty minutes, would you do it?',
      options: [
        { v: 'definitely', label: 'Most days, yes' }, { v: 'mostly', label: 'A lot more than now' },
        { v: 'some', label: 'Some weeks' }, { v: 'no', label: 'Probably not' }] }),
    { id: 'gap', type: 'gap', title: 'Getting a session done.',
      withUs: { n: '20 min', label: 'at home' }, without: { n: '95 min', label: 'with the gym trip' },
      body: 'Changing, driving, parking, waiting for a rack, driving back.',
      cta: 'Continue' },
    ...trainingBlock({ when: null, locationQ: 'Where would it happen?',
      pilatesQ: 'Want mat Pilates in there too?' }),
    FOOD_OFFER,
    ...foodBlock({ when: WHEN_FOOD }),
    goalBridge({ title: 'Should any of it aim at something?',
      body: 'It can point at a goal, or it can simply be training you will actually do.',
      noneLabel: 'Just get me moving' }),
    ...bodyBlock({ when: WHEN_AIMED }),
    { id: 'commute', type: 'slider', key: 'commute',
      question: 'Door to door, how long was the trip to a gym?',
      why: 'One way. Changing rooms and parking count.',
      min: 5, max: 75, step: 5, start: 25, suffix: 'minutes each way' },
    { id: 'payoff', type: 'payoff', from: 'commute', rate: 2, per: 'week',
      timesFrom: 'p.daysPerWeek', unit: 'hours',
      lead: 'On the days you said you would train, that trip alone comes to:',
      caption: 'hours a year, before a single rep',
      tail: 'Training at home does not save you a gym. It saves you that.', cta: 'Continue' },
    emailScreen({}),
  ],
  building: ['Reading your answers…', 'Building for your space…', 'Fitting it to your minutes…',
    'Layering in the recovery…', 'Writing your week…'],
},
};
