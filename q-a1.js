/*
 * A1 — the grocery list.
 *
 * ## The test every question here had to pass
 *
 * "Would an app that writes your grocery list obviously need to know this?"
 *
 * She clicked an ad about a woman copying ingredients off twelve open tabs. Her
 * mental model is a shopping-list app, and every question that only makes sense
 * in a weight-loss app tells her the grocery framing was a costume. Two things
 * failed that test in the previous build and both are gone:
 *
 *   "When do you want to start?"  A diet-app question. A list has no start date.
 *   The body block.               Why would a shopping-list app want her weight?
 *
 * ## Earning the body questions instead of imposing them
 *
 * The weight data is genuinely needed -- the list comes off a meal plan and the
 * meal plan needs targets. So it is gated behind a bridge in exactly the way
 * training is: she is asked whether the meals should aim at anything. If she
 * says she is happy as she is, weight is never mentioned, the plan runs at
 * maintenance, and the shopping list she actually came for is unchanged.
 *
 * That turns the most exposing question in the flow into one she volunteered
 * for, which is the only honest way to ask it on this angle.
 *
 * ## What is native to a list app, and now gets asked
 *
 * How often she shops, which nights she actually cooks, how long she will spend
 * on a weeknight, and what never goes in the trolley. All four shape the plan
 * and all four are questions she would expect. The allergen screen is the same
 * data as before in her language rather than a clinic's.
 *
 * Keys beginning `p.` are fields the app's plan builder needs.
 */

export const ANGLE = 'A1';

export const SCREENS = [

/* --------------------------------------------------------------- HER WORLD -- */
{
  /* Mirrors the ad almost verbatim, so screen one earns a nod rather than a
     decision. One tap, nothing to be ashamed of. */
  id: 'listhow', type: 'question', key: 'listhow',
  kicker: '2-minute quiz', title: 'Build my list',
  sub: 'Off your plan, with the amounts on it. One payment, no subscription.',
  question: 'How do you write your grocery list at the moment?',
  options: [
    { v: 'hand', label: 'By hand, off recipes' },
    { v: 'notes', label: 'A notes app, as things occur to me' },
    { v: 'memory', label: 'I wing it in the aisles' },
    { v: 'app', label: 'An app attempts it for me' },
  ],
},
{
  id: 'howoften', type: 'question', key: 'p.shopCadence',
  question: 'How often do you do a big shop?',
  why: 'Your list is written to that rhythm — one big one, or topped up through the week.',
  options: [
    { v: 'weekly', label: 'Once a week' },
    { v: 'twice', label: 'A couple of times a week' },
    { v: 'often', label: 'Little and often' },
    { v: 'chaos', label: 'There is no rhythm to it' },
  ],
},
{
  id: 'wrong', type: 'question', key: 'barrier',
  question: 'What usually goes wrong?',
  options: [
    { v: 'forget', label: 'I forget the one thing dinner needed' },
    { v: 'amounts', label: 'Right food, wrong amounts' },
    { v: 'toomuch', label: 'I buy far more than we get through' },
    { v: 'rots', label: 'Half of it goes off before I use it' },
  ],
},
{
  id: 'proof', type: 'interstitial',
  eyebrow: 'You are not the only one',
  title: 'Every meal planner on the market ships a broken list.',
  body: 'Missing quantities. Items silently dropped on the way to the list. No way to add a whole '
      + 'week at once. We read thousands of reviews of the big ones and the same six complaints '
      + 'come up every time — which is why the list is the first thing Dayspine gets right, not '
      + 'the last.',
  cta: 'That sounds familiar',
},
{
  id: 'absolve', type: 'interstitial',
  eyebrow: 'Worth saying plainly',
  title: 'You were doing the app’s job for it.',
  body: 'Copying ingredients off a recipe is data entry. Something already knows what you are '
      + 'eating on Thursday — the list is just arithmetic on top of that, and it should have '
      + 'been handed to you years ago.',
  cta: 'Go on',
},
{
  id: 'yes', type: 'question', key: 'yes',
  question: 'If the list arrived already written, with the amounts on it — would that give you '
          + 'your Sunday back?',
  options: [
    { v: 'definitely', label: 'Definitely' },
    { v: 'mostly', label: 'Most of it' },
    { v: 'some', label: 'Some of it' },
    { v: 'no', label: 'Not really' },
  ],
},
{
  id: 'sunday', type: 'question', key: 'sunday',
  question: 'How long does the whole job take you — deciding, listing, shopping?',
  why: 'It sets how much time your plan has to give back.',
  options: [
    { v: 'over2', label: 'Over two hours' },
    { v: '1-2', label: 'An hour or two' },
    { v: 'under1', label: 'Under an hour' },
    { v: 'avoid', label: 'I have started avoiding it' },
  ],
},
{
  id: 'gap', type: 'gap',
  title: 'The same Sunday, both ways.',
  withUs: { n: '4 min', label: 'with Dayspine' },
  without: { n: '90 min', label: 'on your own' },
  body: 'Deciding, costing and writing the list — done before you open your eyes.',
  cta: 'Continue',
},

/* ------------------------------------------------------------- THE TROLLEY -- */
{
  id: 'store', type: 'tiles', key: 'p.store',
  question: 'Where do you shop?',
  why: 'Prices and aisle order come from your actual store.',
  options: [
    { v: 'walmart', label: 'Walmart' }, { v: 'aldi', label: 'Aldi' },
    { v: 'kroger', label: 'Kroger' }, { v: 'target', label: 'Target' },
    { v: 'costco', label: 'Costco' }, { v: 'trader', label: "Trader Joe's" },
    { v: 'safeway', label: 'Safeway' }, { v: 'publix', label: 'Publix' },
    { v: 'other', label: 'Somewhere else' },
  ],
},
{
  id: 'household', type: 'steppers',
  question: 'Who are you feeding?',
  why: 'Every quantity on the list scales to this.',
  fields: [
    { key: 'p.otherAdults', label: 'Other adults', min: 0, max: 6, start: 0, unit: 'besides you' },
    { key: 'p.children', label: 'Children', min: 0, max: 6, start: 0, unit: 'smaller portions' },
  ],
},
{
  id: 'nights', type: 'tiles', key: 'p.cookNights', multi: true,
  question: 'Which nights do you actually cook?',
  why: 'Only these get a dinner written. The rest are left alone.',
  options: [
    { v: 'mon', label: 'Mon' }, { v: 'tue', label: 'Tue' }, { v: 'wed', label: 'Wed' },
    { v: 'thu', label: 'Thu' }, { v: 'fri', label: 'Fri' }, { v: 'sat', label: 'Sat' },
    { v: 'sun', label: 'Sun' },
  ],
},
{
  id: 'cooktime', type: 'question', key: 'p.cookTime',
  question: 'On a weeknight, how long are you really willing to spend?',
  why: 'Nothing longer than this ever gets written into your week.',
  options: [
    { v: '15', label: 'Fifteen minutes' },
    { v: '30', label: 'About half an hour' },
    { v: '45', label: 'Up to forty-five' },
    { v: 'enjoy', label: 'I like cooking — take your time' },
  ],
},
{
  id: 'budget', type: 'slider', key: 'p.weeklyBudget',
  question: 'What does the shop cost you in a week?',
  why: 'Slide to what you actually spend. Your plan gets built to come in under it.',
  min: 40, max: 400, step: 10, start: 140, prefix: '$', suffix: 'a week',
},
{
  id: 'payoff', type: 'payoff',
  lead: 'A planned week comes in about 18% under an unplanned one — that is what the overlap '
      + 'between meals is worth.',
  from: 'p.weeklyBudget', rate: 0.18, per: 'week',
  tail: 'And it is the part no recipe app does for you.',
  cta: 'Continue',
},
{
  id: 'never', type: 'tiles', key: 'p.allergens', multi: true,
  question: 'Anything that never goes in the trolley?',
  why: 'These are excluded from every meal, permanently.',
  options: [
    { v: 'dairy', label: 'Dairy' }, { v: 'eggs', label: 'Eggs' },
    { v: 'fish', label: 'Fish' }, { v: 'gluten', label: 'Gluten' },
    { v: 'peanuts', label: 'Peanuts' }, { v: 'shellfish', label: 'Shellfish' },
    { v: 'soy', label: 'Soy' }, { v: 'treeNuts', label: 'Tree nuts' },
    { v: 'none', label: 'Nothing', exclusive: true },
  ],
},
{
  id: 'dislike', type: 'tiles', key: 'p.avoid', multi: true,
  question: 'Anything you just do not like?',
  why: 'Kept off the list unless there is genuinely nothing else to build a meal from.',
  options: [
    { v: 'Aubergine', label: 'Aubergine' }, { v: 'Beetroot', label: 'Beetroot' },
    { v: 'Brussels sprouts', label: 'Sprouts' }, { v: 'Cottage cheese', label: 'Cottage cheese' },
    { v: 'Mackerel, cooked', label: 'Mackerel' }, { v: 'Mushrooms', label: 'Mushrooms' },
    { v: 'Olives', label: 'Olives' }, { v: 'Quark', label: 'Quark' },
    { v: 'Tofu, firm', label: 'Tofu' }, { v: 'Tuna, canned in water', label: 'Tinned tuna' },
    { v: 'none', label: 'Nothing', exclusive: true },
  ],
},
{
  id: 'favourites', type: 'tiles', key: 'p.like', multi: true,
  question: 'And anything you would happily eat every week?',
  why: 'Favourites show up more often. Nothing here narrows your plan.',
  options: [
    { v: 'Chicken breast, cooked', label: 'Chicken' },
    { v: 'Beef sirloin steak, cooked', label: 'Beef' },
    { v: 'Salmon fillet, cooked', label: 'Salmon' },
    { v: 'Egg, whole', label: 'Eggs' },
    { v: 'Wholemeal pasta, cooked', label: 'Pasta' },
    { v: 'White rice, cooked', label: 'Rice' },
    { v: 'Greek yoghurt 0%', label: 'Greek yoghurt' },
    { v: 'Avocado', label: 'Avocado' },
    { v: 'Sweet potato, baked', label: 'Sweet potato' },
  ],
},
{
  id: 'diet', type: 'question', key: 'p.diet',
  question: 'How does the house eat?',
  why: 'Every meal on the list respects this.',
  options: [
    { v: 'standard', label: 'Anything' },
    { v: 'highProtein', label: 'Lots of protein' },
    { v: 'vegetarian', label: 'Vegetarian' },
    { v: 'dairyFree', label: 'Dairy free' },
  ],
},

/* --- THE FOOD BRIDGE. The weight question is the most exposing thing in the
   flow and she came here for a shopping list, so it has to be volunteered for
   rather than sprung. Decline and it is never mentioned. ------------------- */
{
  id: 'aim', type: 'bridge', key: 'aim',
  eyebrow: 'Before the list',
  title: 'Your list comes off a meal plan.',
  body: 'Which means those meals can be aimed at something, if you want them to be. Or they can '
      + 'just be good food you like, planned properly.',
  options: [
    { v: 'lose', label: 'Aim them at losing weight', hint: 'Needs four numbers from you' },
    { v: 'gain', label: 'Aim them at building muscle', hint: 'Needs four numbers from you' },
    { v: 'none', label: 'Just plan them well', hint: 'No weigh-ins, nothing to measure' },
  ],
},
{
  id: 'profile', type: 'profile', showIf: { aim: { not: 'none' } },
  title: 'Then it needs four numbers.',
  question: 'A little about you',
  why: 'This is only used to set your calories and protein. Nothing here is shown to anyone.',
  sexKey: 'p.sex',
  fields: [
    { key: 'p.heightIn', label: 'Height', min: 54, max: 84, start: 65, format: 'feet' },
    { key: 'p.weightLb', label: 'Weight', min: 90, max: 400, start: 165, suffix: 'lb' },
  ],
},
{
  id: 'age', type: 'slider', key: 'p.age', showIf: { aim: { not: 'none' } },
  question: 'How old are you?',
  min: 18, max: 75, step: 1, start: 34, suffix: 'years old',
},
{
  id: 'target', type: 'slider', key: 'p.targetLb', showIf: { aim: { not: 'none' } },
  question: 'And where do you want to get to?',
  why: 'Your finish date comes from this and the pace you pick next.',
  min: 90, max: 400, step: 1, startFrom: 'p.weightLb', startOffset: -15, suffix: 'lb',
},
{
  id: 'pace', type: 'question', key: 'p.pace', showIf: { aim: { not: 'none' } },
  question: 'How fast?',
  why: 'These are real rates — the plan holds you to whichever you pick.',
  options: [
    { v: 'steady', label: 'Steady', hint: 'About 0.7 lb a week' },
    { v: 'balanced', label: 'Balanced', hint: 'About 1 lb a week' },
    { v: 'aggressive', label: 'Aggressive', hint: 'About 1.3 lb a week' },
  ],
},

/* ---------------------------------------------------------- THE SECOND HALF */
{
  id: 'bridge', type: 'bridge', key: 'wantsTraining',
  eyebrow: 'One more thing',
  title: 'The same plan writes a training week.',
  body: 'It is the half that makes the food actually work, and it is already included. Four more '
      + 'taps and it is built too.',
  options: [
    { v: 'yes', label: 'Yes, build that as well', hint: 'Food and training on one plan' },
    { v: 'no', label: 'Just the food for now', hint: 'You can add it inside the app any time' },
  ],
},
{
  id: 'location', type: 'question', key: 'p.location', showIf: { wantsTraining: 'yes' },
  question: 'Where would you train?',
  why: 'Sessions are built for the room you are actually standing in.',
  options: [
    { v: 'gym', label: 'At a gym', hint: 'Barbells and machines' },
    { v: 'home', label: 'At home', hint: 'Whatever you have' },
  ],
},
{
  id: 'homeGear', type: 'question', key: 'p.homeGear',
  showIf: { wantsTraining: 'yes', 'p.location': 'home' },
  question: 'What have you got?',
  why: 'Nothing you do not own will ever appear in a session.',
  options: [
    { v: 'weights', label: 'Dumbbells or bands' },
    { v: 'bodyweight', label: 'Just my bodyweight', hint: 'Floor, wall, a chair' },
  ],
},
{
  id: 'days', type: 'question', key: 'p.daysPerWeek', showIf: { wantsTraining: 'yes' },
  question: 'How many days a week?',
  why: 'Rest is written in around whatever you pick.',
  options: [
    { v: '3', label: '3 days', hint: 'Full body' },
    { v: '4', label: '4 days', hint: 'Upper / lower' },
    { v: '5', label: '5 days', hint: 'Push, pull, legs' },
    { v: '7', label: 'Every day', hint: '4 training, 3 Pilates' },
  ],
},
{
  id: 'pilates', type: 'question', key: 'p.pilates', showIf: { wantsTraining: 'yes' },
  question: 'Want mat Pilates woven into the week?',
  why: 'Real classes, filmed with the instructor, layered between your training days.',
  options: [
    { v: 'yes', label: 'Yes, layer it in', hint: 'It is what makes seven days a week survivable' },
    { v: 'no', label: 'Just the training', hint: 'Gym or home sessions only' },
  ],
},
{
  id: 'pilatesKit', type: 'tiles', key: 'p.pilatesKit', multi: true,
  showIf: { wantsTraining: 'yes', 'p.pilates': 'yes' },
  question: 'What have you got for it?',
  why: 'Only flows you can actually play get scheduled. A mat and nothing else is fine.',
  options: [
    { v: 'dumbbells', label: 'Dumbbells 1–4 kg' }, { v: 'ankle-weights', label: 'Ankle weights' },
    { v: 'wrist-weights', label: 'Wrist weights' }, { v: 'pilates-ball', label: 'Pilates ball' },
    { v: 'yoga-block', label: 'Yoga block' }, { v: 'band', label: 'Resistance band' },
    { v: 'none', label: 'Just a mat', exclusive: true },
  ],
},
{
  id: 'focus', type: 'tiles', key: 'p.focus', multi: true, showIf: { wantsTraining: 'yes' },
  question: 'Anywhere you want the work biased?',
  why: 'Accessories lean toward whatever you pick. Optional.',
  options: [
    { v: 'glutes', label: 'Glutes' }, { v: 'hamstrings', label: 'Hamstrings' },
    { v: 'quads', label: 'Quads' }, { v: 'abs', label: 'Abs' },
    { v: 'shoulders', label: 'Shoulders' }, { v: 'backOfArms', label: 'Arms' },
    { v: 'upperBack', label: 'Upper back' }, { v: 'chest', label: 'Chest' },
  ],
},

/* ----------------------------------------------------------------- CAPTURE -- */
{
  id: 'email', type: 'email',
  title: 'Where should the list go?',
  body: 'We save it against this address so your week is waiting inside the app — you will never '
      + 'fill this in twice.',
  cta: 'Build my list',
},
];

export const BUILDING = [
  'Reading your answers…',
  'Choosing meals you will actually cook…',
  'Costing the week against your budget…',
  'Merging the ingredients…',
  'Writing your grocery list…',
];

export const RESULT = {
  lead: 'You have been hand-building the thing the plan should hand you.',
  diagnosis: 'Manual meal planning',
  promise: 'The week written, and a shopping list with the amounts already on it.',
};
