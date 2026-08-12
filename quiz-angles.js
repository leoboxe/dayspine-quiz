/*
 * Fifteen quizzes. Not one quiz with fifteen skins.
 *
 * ## Why this was rewritten
 *
 * The first attempt shared eight of fourteen screens and wrote six per angle.
 * Leo's call: not specific enough. He is right, and the reference proves it --
 * mise never asks a generic question, because a generic question is the moment
 * the buyer remembers she is filling in a form.
 *
 * So every question below is written for its ad. A13 asks about a gym
 * membership because the ad was about a gym membership. A15 asks how she logs
 * food. Nothing is reused between angles except four mechanics that exist for
 * reasons other than persuasion:
 *
 *   start   -- one tap, echoed at the reveal (replaces mise's name field)
 *   spend   -- the slider whose number the payoff and the paywall both multiply
 *   basics  -- age and sex, because the plan engine needs them
 *   build   -- the final committing tap
 *
 * The cost of this is that answer distributions are no longer comparable
 * between angles. Completion rate and purchase rate still are, and those are the
 * numbers that decide anything.
 *
 * ## The order, and why it is fixed
 *
 * Taken from the reference teardown and held identical across all fifteen, so
 * the thing being tested is the copy and not the architecture.
 *
 *   1  hook      on-topic, one tap, nothing to be ashamed of
 *   2  promise   what this is, in the ad's language
 *   3  start     when do you want to begin
 *   4  want      aspiration, before any problem is raised
 *   5  barrier   the obstacle, always a circumstance and never a defect
 *   6  absolve   agree and promise, immediately after she concedes
 *   7  yes       a question whose only sane answer is the benefit
 *   8  data1     + a line saying what the answer buys her
 *   9  gap       with us / without us, drawn as two numbers
 *  10  data2     + reason-why
 *  11  tiles     something concrete and tappable
 *  12  data3     a different input type again
 *  13  spend     she authors the number
 *  14  payoff    her number, multiplied, against $49 once
 *  15  avoid     constraints, framed as care
 *  16  basics    age and sex, late, because they are admin
 *  17  build     the committing verb
 *
 * ## Rules every line here obeys
 *
 * No option humiliates her. She has to stay honest for seventeen screens, and
 * the moment one answer makes her feel stupid she starts answering for the
 * machine.
 *
 * Every data question carries `why` -- the reference attaches a benefit to all
 * of them, and it is the difference between configuring and being interrogated.
 *
 * The persuasion lives in `absolve`, `gap` and `payoff`. The questions stay
 * light. That is the whole finding from the teardown.
 */

/* Shared mechanics. Four screens, none of them persuasive. */
export const MECHANICS = {
  start: {
    id: 'start', type: 'question', key: 'start',
    question: 'When do you want to start?',
    why: 'Your first week gets built around this date.',
    options: [
      { v: 'today', label: 'Today' },
      { v: 'tomorrow', label: 'Tomorrow' },
      { v: 'monday', label: 'Next Monday' },
    ],
  },
  spend: {
    id: 'spend', type: 'slider', key: 'spend',
    min: 0, max: 150, step: 5, start: 30, unit: '$', suffix: '/ month',
    why: 'Slide to what you are spending right now. It sets what you are compared against.',
  },
  basics: {
    id: 'basics', type: 'question', key: 'age',
    question: 'Last thing — how old are you?',
    why: 'Your calorie and protein targets are calculated from it.',
    options: [
      { v: '18-29', label: '18–29' },
      { v: '30-39', label: '30–39' },
      { v: '40-49', label: '40–49' },
      { v: '50+', label: '50+' },
    ],
  },
  sex: {
    id: 'sex', type: 'question', key: 'sex',
    question: 'And you are…',
    options: [
      { v: 'female', label: 'Female' },
      { v: 'male', label: 'Male' },
      { v: 'other', label: 'Prefer not to say' },
    ],
  },
  build: {
    id: 'build', type: 'build',
    title: 'That is everything.',
    body: 'Your week, your shopping list and your training are about to be written around every '
        + 'answer you just gave.',
    cta: 'Build my plan',
  },
};

export const ANGLES = {

/* ==================================================================== A1 === */
A1: {
  ad: 'The grocery list',
  promise: {
    title: 'The list writes itself.',
    body: 'Off your plan, with the amounts already on it. One payment, no subscription.',
    cta: 'Start',
  },
  hook: {
    question: 'How do you write your grocery list at the moment?',
    key: 'listhow',
    options: [
      { v: 'hand', label: 'By hand, off recipes' },
      { v: 'notes', label: 'A notes app, as things occur to me' },
      { v: 'memory', label: 'I wing it in the aisles' },
      { v: 'app', label: 'An app attempts it for me' },
    ],
  },
  want: {
    question: 'What would a good Sunday actually look like?',
    key: 'want',
    options: [
      { v: 'notthink', label: 'Not thinking about food at all' },
      { v: 'onetrip', label: 'One trip, everything right' },
      { v: 'cheaper', label: 'A smaller bill' },
      { v: 'ready', label: 'The week already sorted by Sunday night' },
    ],
  },
  barrier: {
    question: 'What makes it take so long?',
    key: 'barrier',
    options: [
      { v: 'tabs', label: 'Copying ingredients off twelve open tabs' },
      { v: 'amounts', label: 'Working out how much of everything to buy' },
      { v: 'deciding', label: 'Deciding what we are even eating' },
      { v: 'household', label: 'Everyone wants something different' },
    ],
  },
  absolve: {
    title: 'You were doing the app’s job for it.',
    body: 'Copying ingredients off a recipe is data entry. The plan already knows what you are '
        + 'eating on Thursday — the list is arithmetic on top of that, and it should have been '
        + 'handed to you.',
    cta: 'Go on',
  },
  yes: {
    question: 'If the list arrived written, with the amounts on it — would that give you your '
            + 'Sunday back?',
    key: 'yes',
    options: [
      { v: 'definitely', label: 'Definitely' },
      { v: 'mostly', label: 'Most of it' },
      { v: 'some', label: 'Some of it' },
      { v: 'no', label: 'Not really' },
    ],
  },
  data1: {
    question: 'How long does the whole Sunday job take you?',
    why: 'It sets how much time the plan has to give back.',
    key: 'sunday',
    options: [
      { v: 'over2', label: 'Over two hours' },
      { v: '1-2', label: 'An hour or two' },
      { v: 'under1', label: 'Under an hour' },
      { v: 'avoid', label: 'I have started avoiding it' },
    ],
  },
  gap: {
    title: 'Sunday, with and without.',
    with: { n: '4 min', label: 'with Dayspine' },
    without: { n: '90 min', label: 'on your own' },
    body: 'Planning, costing and writing the list, done before you open your eyes.',
    cta: 'Continue',
  },
  data2: {
    question: 'What usually goes wrong once you are home?',
    why: 'The list is built to close whichever gap you pick.',
    key: 'wrong',
    options: [
      { v: 'onething', label: 'The one thing dinner needed is missing' },
      { v: 'amounts', label: 'Right food, wrong amounts' },
      { v: 'extra', label: 'A load of things I did not need' },
      { v: 'fine', label: 'It mostly works out' },
    ],
  },
  tiles: {
    question: 'Where do you shop?',
    why: 'Prices and aisle order come from your actual store.',
    key: 'store', layout: 'tiles', multi: false,
    options: [
      { v: 'walmart', label: 'Walmart' }, { v: 'aldi', label: 'Aldi' },
      { v: 'kroger', label: 'Kroger' }, { v: 'target', label: 'Target' },
      { v: 'costco', label: 'Costco' }, { v: 'trader', label: "Trader Joe's" },
      { v: 'safeway', label: 'Safeway' }, { v: 'publix', label: 'Publix' },
      { v: 'other', label: 'Somewhere else' },
    ],
  },
  data3: {
    question: 'How many are you shopping for?',
    why: 'Every quantity on the list scales to this.',
    key: 'household', type: 'stepper', min: 1, max: 8, start: 2, unit: 'people',
  },
  spendLabel: 'What do you spend on groceries in a week?',
  spendCfg: { min: 40, max: 400, step: 10, start: 140, suffix: '/ week' },
  payoff: {
    lead: 'A planned week comes in about 18% under an unplanned one.',
    calc: 'weekly',
    tail: 'That is what the overlap between meals is worth — and it is the part no recipe app '
        + 'does for you.',
    cta: 'Continue',
  },
  avoid: {
    question: 'Anything that should never appear on the list?',
    why: 'These are excluded from every meal, permanently.',
    key: 'avoid', multi: true,
    options: [
      { v: 'dairy', label: 'Dairy' }, { v: 'gluten', label: 'Gluten' },
      { v: 'nuts', label: 'Nuts' }, { v: 'pork', label: 'Pork' },
      { v: 'shellfish', label: 'Shellfish' }, { v: 'none', label: 'Nothing', exclusive: true },
    ],
  },
  result: {
    lead: 'You have been hand-building the thing the plan should hand you.',
    diagnosis: 'Manual meal planning',
    promise: 'The week written, and a list with the amounts already on it.',
  },
},

/* ==================================================================== A2 === */
A2: {
  ad: 'Buy it, don’t rent it',
  promise: {
    title: 'Bought once. Never rented.',
    body: 'Everything, for one payment. Nothing renews and there is nothing to cancel.',
    cta: 'Start',
  },
  hook: {
    question: 'How many fitness or food apps are billing you right now?',
    key: 'billing',
    options: [
      { v: '3+', label: 'Three or more' },
      { v: '2', label: 'Two' },
      { v: '1', label: 'One' },
      { v: '0', label: 'None — I cancelled them all' },
    ],
  },
  want: {
    question: 'What would you actually want out of paying for one of these?',
    key: 'want',
    options: [
      { v: 'told', label: 'To be told exactly what to do' },
      { v: 'own', label: 'To own it, not rent it' },
      { v: 'stop', label: 'To stop paying for four things at once' },
      { v: 'result', label: 'A result I can see' },
    ],
  },
  barrier: {
    question: 'What has gone wrong with the ones you have paid for?',
    key: 'barrier',
    options: [
      { v: 'paywall', label: 'The good part moved behind another paywall' },
      { v: 'unused', label: 'I stopped opening it and kept paying' },
      { v: 'trial', label: 'A trial charged me before I noticed' },
      { v: 'cancel', label: 'Cancelling was deliberately awkward' },
    ],
  },
  absolve: {
    title: 'You did not fail. You were renting.',
    body: 'An app that bills monthly has to keep you subscribed, which is a different job from '
        + 'getting you a result. That is why the useful part is always one tier up.',
    cta: 'Go on',
  },
  yes: {
    question: 'Would you rather pay once and own it, than pay every month forever?',
    key: 'yes',
    options: [
      { v: 'definitely', label: 'Obviously' },
      { v: 'mostly', label: 'If it is actually complete' },
      { v: 'some', label: 'Depends on the price' },
      { v: 'no', label: 'I do not mind subscribing' },
    ],
  },
  data1: {
    question: 'How long have you been paying monthly for this stuff?',
    why: 'It is used to work out what you have already spent.',
    key: 'howlong',
    options: [
      { v: 'years', label: 'Years. I stopped counting' },
      { v: '1-2', label: 'A year or two' },
      { v: 'months', label: 'A few months' },
      { v: 'new', label: 'I am just starting out' },
    ],
  },
  gap: {
    title: 'Two years of this.',
    with: { n: '$49', label: 'Dayspine, once' },
    without: { n: '$1,200', label: 'four apps, two years' },
    body: 'At $50 a month across a tracker, a training app, a fasting timer and a coach.',
    cta: 'Continue',
  },
  data2: {
    question: 'Which of these are you paying for?',
    why: 'Anything you tick is replaced by something already inside Dayspine.',
    key: 'stack', multi: true,
    options: [
      { v: 'tracker', label: 'A calorie or macro tracker' },
      { v: 'workout', label: 'A training app' },
      { v: 'fasting', label: 'A fasting timer' },
      { v: 'coach', label: 'A coach or a plan' },
      { v: 'gym', label: 'A gym membership' },
      { v: 'none', label: 'None of them', exclusive: true },
    ],
  },
  tiles: {
    question: 'What do you want it to cover?',
    why: 'All of it is included — this only orders your home screen.',
    key: 'cover', layout: 'tiles', multi: true,
    options: [
      { v: 'food', label: 'Food' }, { v: 'training', label: 'Training' },
      { v: 'grocery', label: 'Groceries' }, { v: 'fasting', label: 'Fasting' },
      { v: 'mind', label: 'Mood' }, { v: 'progress', label: 'Progress' },
    ],
  },
  data3: {
    question: 'How many people would use it?',
    why: 'A household seat can be added later. It is never a subscription.',
    key: 'household', type: 'stepper', min: 1, max: 6, start: 1, unit: 'people',
  },
  spendLabel: 'What are all of those costing you a month, together?',
  spendCfg: { min: 0, max: 150, step: 5, start: 35, suffix: '/ month' },
  payoff: {
    lead: 'Here is what that is on its way to costing you.',
    calc: 'monthly',
    tail: 'Dayspine is $49. Once. There is no second year of it.',
    cta: 'Continue',
  },
  avoid: {
    question: 'Anything you never want to see?',
    why: 'Set once and it holds across every meal.',
    key: 'avoid', multi: true,
    options: [
      { v: 'dairy', label: 'Dairy' }, { v: 'gluten', label: 'Gluten' },
      { v: 'nuts', label: 'Nuts' }, { v: 'pork', label: 'Pork' },
      { v: 'shellfish', label: 'Shellfish' }, { v: 'none', label: 'Nothing', exclusive: true },
    ],
  },
  result: {
    lead: 'You were never bad at this. You were on a meter.',
    diagnosis: 'Subscription fatigue',
    promise: 'Bought once. Nothing renews, ever.',
  },
},

/* ==================================================================== A3 === */
A3: {
  ad: 'Nobody gave you a plan',
  promise: {
    title: 'Told what to eat tonight.',
    body: 'Not asked to log it afterwards. One payment, no subscription.',
    cta: 'Start',
  },
  hook: {
    question: 'Do you know what you are eating tonight?',
    key: 'tonight',
    options: [
      { v: 'no', label: 'No idea yet' },
      { v: 'vaguely', label: 'Vaguely — I will improvise' },
      { v: 'same', label: 'The same thing I always eat' },
      { v: 'yes', label: 'Yes, it is planned' },
    ],
  },
  want: {
    question: 'What would you actually want an app to do?',
    key: 'want',
    options: [
      { v: 'tell', label: 'Just tell me what to eat' },
      { v: 'shop', label: 'Tell me what to buy as well' },
      { v: 'train', label: 'And what to do in the gym' },
      { v: 'all', label: 'All of it, decided for me' },
    ],
  },
  barrier: {
    question: 'What have the apps you have used actually done?',
    key: 'barrier',
    options: [
      { v: 'count', label: 'Counted what I had already eaten' },
      { v: 'nag', label: 'Reminded me I was behind' },
      { v: 'nothing', label: 'Sat there until I opened them' },
      { v: 'sort', label: 'Given me a plan', hint: 'Genuinely?' },
    ],
  },
  absolve: {
    title: 'You were handed a spreadsheet and told it was coaching.',
    body: 'Knowing your numbers is not the same as being given a plan. You have been doing the '
        + 'deciding yourself, at six in the evening, and then logging your own homework.',
    cta: 'Go on',
  },
  yes: {
    question: 'If dinner was decided before you got home, would six o’clock stop being a decision?',
    key: 'yes',
    options: [
      { v: 'definitely', label: 'Completely' },
      { v: 'mostly', label: 'Mostly' },
      { v: 'some', label: 'A bit' },
      { v: 'no', label: 'I quite like deciding' },
    ],
  },
  data1: {
    question: 'What normally happens at six?',
    why: 'The plan is written to survive whichever this is.',
    key: 'sixpm',
    options: [
      { v: 'stare', label: 'I stare into the fridge' },
      { v: 'order', label: 'I order something' },
      { v: 'repeat', label: 'The same three meals' },
      { v: 'plan', label: 'I already know' },
    ],
  },
  gap: {
    title: 'How the decision goes.',
    with: { n: '0', label: 'decisions with a plan' },
    without: { n: '21', label: 'meals to invent a week' },
    body: 'Every one of them at the end of a day, when you have the least left to decide with.',
    cta: 'Continue',
  },
  data2: {
    question: 'How many meals a day should it plan?',
    why: 'It only writes the ones you actually want written.',
    key: 'meals',
    options: [
      { v: '3', label: 'Three' },
      { v: '4', label: 'Three and a snack' },
      { v: '2', label: 'Two — I skip breakfast' },
      { v: 'dinner', label: 'Just dinner' },
    ],
  },
  tiles: {
    question: 'What do you actually like eating?',
    why: 'Favourites show up more often. Nothing here narrows your plan.',
    key: 'likes', layout: 'tiles', multi: true,
    options: [
      { v: 'chicken', label: 'Chicken' }, { v: 'beef', label: 'Beef' },
      { v: 'fish', label: 'Fish' }, { v: 'eggs', label: 'Eggs' },
      { v: 'pasta', label: 'Pasta' }, { v: 'rice', label: 'Rice' },
      { v: 'veg', label: 'Vegetarian' }, { v: 'quick', label: 'Anything fast' },
    ],
  },
  data3: {
    question: 'How long will you actually spend cooking?',
    why: 'Nothing longer than this gets written into your week.',
    key: 'cooktime',
    options: [
      { v: '15', label: 'Fifteen minutes' },
      { v: '30', label: 'About half an hour' },
      { v: '45', label: 'Up to forty-five' },
      { v: 'enjoy', label: 'I enjoy cooking, take your time' },
    ],
  },
  spendLabel: 'What are you paying a month for apps that never told you what to eat?',
  spendCfg: { min: 0, max: 150, step: 5, start: 25, suffix: '/ month' },
  payoff: {
    lead: 'For counting what you had already eaten.',
    calc: 'monthly',
    tail: 'Dayspine costs $49 once, and it decides first.',
    cta: 'Continue',
  },
  avoid: {
    question: 'Anything you will not eat?',
    why: 'Excluded from every meal, permanently.',
    key: 'avoid', multi: true,
    options: [
      { v: 'dairy', label: 'Dairy' }, { v: 'gluten', label: 'Gluten' },
      { v: 'nuts', label: 'Nuts' }, { v: 'pork', label: 'Pork' },
      { v: 'shellfish', label: 'Shellfish' }, { v: 'none', label: 'Nothing', exclusive: true },
    ],
  },
  result: {
    lead: 'You did not fail at this. Nobody ever gave you the plan.',
    diagnosis: 'Decision fatigue',
    promise: 'Told what to eat tonight. Not asked to log it.',
  },
},
};

export const DEFAULT_ANGLE = 'A3';

export function pickAngle(search) {
  var m = /[?&]a=([a-z0-9]+)/i.exec(search || '');
  var key = m ? m[1].toUpperCase() : null;
  return (key && ANGLES[key]) ? key : DEFAULT_ANGLE;
}
