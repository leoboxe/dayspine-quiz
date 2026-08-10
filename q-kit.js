/*
 * The shared kit.
 *
 * Fifteen quizzes, each written for its own ad — but four blocks are genuinely
 * mechanical rather than persuasive, and duplicating them fifteen times would
 * add no specificity while guaranteeing they drift apart. A weight slider is a
 * weight slider. What differs per angle is the *framing* around it, so every
 * builder here takes the wording as an argument.
 *
 * Everything else — the opener, the barrier, the proof, the absolution, the
 * leading question, the gap, the payoff and the native data questions — is
 * written per angle and lives in q-all.js.
 *
 * ## The bridge pattern
 *
 * Each angle leads with its own domain and offers the others. The rule, learned
 * the hard way on A1: never ask a question the ad has not earned. Someone who
 * clicked a grocery ad is not asked her weight until she has said she wants the
 * meals aimed at something. Someone who clicked a training ad is not asked about
 * supermarkets until she has said she wants the food side too.
 *
 * Decline any bridge and the block vanishes. Nothing is lost — the app offers
 * the missing half later and only asks what was skipped.
 */

/** Every field the app's plan builder needs, so a buyer never sees plan-setup. */
export const PLAN_FIELDS = [
  'sex', 'age', 'heightIn', 'weightLb', 'targetLb', 'pace', 'goal',
  'diet', 'allergens', 'avoid', 'like', 'weeklyBudget', 'otherAdults', 'children',
  'location', 'daysPerWeek', 'homeGear', 'focus', 'pilates', 'pilatesKit',
];

/* ------------------------------------------------------------------ BODY -- */
/**
 * Height, weight, age, target and pace.
 *
 * Gated behind whatever `when` says, always. This is the most exposing thing in
 * any of the fifteen flows and it is only ever asked of someone who has just
 * volunteered for it.
 */
export function bodyBlock({ when, title, why, targetQ, paceWhy }) {
  return [
    {
      id: 'profile', type: 'profile', showIf: when,
      title: title || 'Then it needs four numbers.',
      question: 'A little about you',
      why: why || 'Only used to set your calories and protein. Nothing here is shown to anyone.',
      sexKey: 'p.sex',
      fields: [
        { key: 'p.heightIn', label: 'Height', min: 54, max: 84, start: 65, format: 'feet' },
        { key: 'p.weightLb', label: 'Weight', min: 90, max: 400, start: 165, suffix: 'lb' },
      ],
    },
    {
      id: 'age', type: 'slider', key: 'p.age', showIf: when,
      question: 'How old are you?',
      min: 18, max: 75, step: 1, start: 34, suffix: 'years old',
    },
    {
      id: 'target', type: 'slider', key: 'p.targetLb', showIf: when,
      question: targetQ || 'And where do you want to get to?',
      why: 'Your finish date comes from this and the pace you pick next.',
      min: 90, max: 400, step: 1, startFrom: 'p.weightLb', startOffset: -15, suffix: 'lb',
    },
    {
      id: 'pace', type: 'question', key: 'p.pace', showIf: when,
      question: 'How fast?',
      why: paceWhy || 'These are real rates — the plan holds you to whichever you pick.',
      options: [
        { v: 'steady', label: 'Steady', hint: 'About 0.7 lb a week' },
        { v: 'balanced', label: 'Balanced', hint: 'About 1 lb a week' },
        { v: 'aggressive', label: 'Aggressive', hint: 'About 1.3 lb a week' },
      ],
    },
  ];
}

/* -------------------------------------------------------------- TRAINING -- */
/** Location, gear, days, Pilates and focus. */
export function trainingBlock({ when, locationQ, daysWhy, pilatesQ }) {
  /* null means "always show" -- a training-led angle owns these screens and
     must not hide them behind a bridge it never asks. undefined means "use the
     default gate", which is what food-led angles want. Collapsing the two with
     `when || default` hid the training block on every training-led angle. */
  const gate = when === null ? null : (when || { wantsTraining: 'yes' });
  const g = gate ? { showIf: gate } : {};
  const sub = (extra) => (gate ? { showIf: Object.assign({}, gate, extra) } : { showIf: extra });
  return [
    Object.assign({
      id: 'location', type: 'question', key: 'p.location',
      question: locationQ || 'Where would you train?',
      why: 'Sessions are built for the room you are actually standing in.',
      options: [
        { v: 'gym', label: 'At a gym', hint: 'Barbells and machines' },
        { v: 'home', label: 'At home', hint: 'Whatever you have' },
      ],
    }, g),
    Object.assign({
      id: 'homeGear', type: 'question', key: 'p.homeGear',
      question: 'What have you got?',
      why: 'Nothing you do not own will ever appear in a session.',
      options: [
        { v: 'weights', label: 'Dumbbells or bands' },
        { v: 'bodyweight', label: 'Just my bodyweight', hint: 'Floor, wall, a chair' },
      ],
    }, sub({ 'p.location': 'home' })),
    Object.assign({
      id: 'days', type: 'question', key: 'p.daysPerWeek',
      question: 'How many days a week?',
      why: daysWhy || 'Rest is written in around whatever you pick.',
      options: [
        { v: '3', label: '3 days', hint: 'Full body' },
        { v: '4', label: '4 days', hint: 'Upper / lower' },
        { v: '5', label: '5 days', hint: 'Push, pull, legs' },
        { v: '7', label: 'Every day', hint: '4 training, 3 Pilates' },
      ],
    }, g),
    Object.assign({
      id: 'pilates', type: 'question', key: 'p.pilates',
      question: pilatesQ || 'Want mat Pilates woven into the week?',
      why: 'Real classes, filmed with the instructor, layered between your training days.',
      options: [
        { v: 'yes', label: 'Yes, layer it in', hint: 'It is what makes seven days a week survivable' },
        { v: 'no', label: 'Just the training', hint: 'Gym or home sessions only' },
      ],
    }, g),
    Object.assign({
      id: 'pilatesKit', type: 'tiles', key: 'p.pilatesKit', multi: true,
      question: 'What have you got for it?',
      why: 'Only flows you can actually play get scheduled. A mat and nothing else is fine.',
      options: [
        { v: 'dumbbells', label: 'Dumbbells 1–4 kg' }, { v: 'ankle-weights', label: 'Ankle weights' },
        { v: 'wrist-weights', label: 'Wrist weights' }, { v: 'pilates-ball', label: 'Pilates ball' },
        { v: 'yoga-block', label: 'Yoga block' }, { v: 'band', label: 'Resistance band' },
        { v: 'none', label: 'Just a mat', exclusive: true },
      ],
    }, sub({ 'p.pilates': 'yes' })),
    Object.assign({
      id: 'focus', type: 'tiles', key: 'p.focus', multi: true,
      question: 'Anywhere you want the work biased?',
      why: 'Accessories lean toward whatever you pick. Optional.',
      options: [
        { v: 'glutes', label: 'Glutes' }, { v: 'hamstrings', label: 'Hamstrings' },
        { v: 'quads', label: 'Quads' }, { v: 'abs', label: 'Abs' },
        { v: 'shoulders', label: 'Shoulders' }, { v: 'backOfArms', label: 'Arms' },
        { v: 'upperBack', label: 'Upper back' }, { v: 'chest', label: 'Chest' },
      ],
    }, g),
  ];
}

/* ------------------------------------------------------------------ FOOD -- */
/**
 * Diet, allergens, dislikes, favourites, household and budget.
 *
 * `when` is omitted on food-led angles (she is already here for this) and set to
 * a bridge on training-led ones.
 */
export function foodBlock({ when, dietQ, budgetQ, budgetWhy, includeBudget = true, includeHousehold = true }) {
  const g = when ? { showIf: when } : {};
  const out = [
    Object.assign({
      id: 'never', type: 'tiles', key: 'p.allergens', multi: true,
      question: 'Anything you cannot eat?',
      why: 'These are never included, whatever else you pick.',
      options: [
        { v: 'dairy', label: 'Dairy' }, { v: 'eggs', label: 'Eggs' },
        { v: 'fish', label: 'Fish' }, { v: 'gluten', label: 'Gluten' },
        { v: 'peanuts', label: 'Peanuts' }, { v: 'shellfish', label: 'Shellfish' },
        { v: 'soy', label: 'Soy' }, { v: 'treeNuts', label: 'Tree nuts' },
        { v: 'none', label: 'Nothing', exclusive: true },
      ],
    }, g),
    Object.assign({
      id: 'dislike', type: 'tiles', key: 'p.avoid', multi: true,
      question: 'Anything you just do not like?',
      why: 'Kept off your plan unless there is genuinely nothing else to build a meal from.',
      options: [
        { v: 'Aubergine', label: 'Aubergine' }, { v: 'Beetroot', label: 'Beetroot' },
        { v: 'Brussels sprouts', label: 'Sprouts' }, { v: 'Cottage cheese', label: 'Cottage cheese' },
        { v: 'Mackerel, cooked', label: 'Mackerel' }, { v: 'Mushrooms', label: 'Mushrooms' },
        { v: 'Olives', label: 'Olives' }, { v: 'Quark', label: 'Quark' },
        { v: 'Tofu, firm', label: 'Tofu' }, { v: 'Tuna, canned in water', label: 'Tinned tuna' },
        { v: 'none', label: 'Nothing', exclusive: true },
      ],
    }, g),
    Object.assign({
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
    }, g),
    Object.assign({
      id: 'diet', type: 'question', key: 'p.diet',
      question: dietQ || 'How do you eat?',
      why: 'Every meal in your plan respects this.',
      options: [
        { v: 'standard', label: 'Anything' },
        { v: 'highProtein', label: 'Lots of protein' },
        { v: 'vegetarian', label: 'Vegetarian' },
        { v: 'dairyFree', label: 'Dairy free' },
      ],
    }, g),
  ];
  if (includeHousehold) {
    out.unshift(Object.assign({
      id: 'household', type: 'steppers',
      question: 'Who are you feeding?',
      why: 'Every quantity on your list scales to this.',
      fields: [
        { key: 'p.otherAdults', label: 'Other adults', min: 0, max: 6, start: 0, unit: 'besides you' },
        { key: 'p.children', label: 'Children', min: 0, max: 6, start: 0, unit: 'smaller portions' },
      ],
    }, g));
  }
  if (includeBudget) {
    out.push(Object.assign({
      id: 'budget', type: 'slider', key: 'p.weeklyBudget',
      question: budgetQ || 'What does the shop cost you in a week?',
      why: budgetWhy || 'Slide to what you actually spend. Your plan gets built to come in under it.',
      min: 40, max: 400, step: 10, start: 140, prefix: '$', suffix: 'a week',
    }, g));
  }
  return out;
}

/* --------------------------------------------------------------- BRIDGES -- */
/** Offers the goal, which is the only honest way to reach the body block. */
export function goalBridge({ title, body, loseLabel, gainLabel, noneLabel, noneHint, eyebrow }) {
  return {
    id: 'aim', type: 'bridge', key: 'aim',
    eyebrow: eyebrow || 'Before we build it',
    title, body,
    options: [
      { v: 'lose', label: loseLabel || 'Aim it at losing weight', hint: 'Needs four numbers from you' },
      { v: 'gain', label: gainLabel || 'Aim it at building muscle', hint: 'Needs four numbers from you' },
      { v: 'none', label: noneLabel || 'Just plan it well',
        hint: noneHint || 'No weigh-ins, nothing to measure' },
    ],
  };
}

/** Offers the half she did not come for. */
export function offerBridge({ key, eyebrow, title, body, yes, yesHint, no, noHint }) {
  return {
    id: key, type: 'bridge', key,
    eyebrow: eyebrow || 'One more thing',
    title, body,
    options: [
      { v: 'yes', label: yes, hint: yesHint },
      { v: 'no', label: no, hint: noHint || 'You can add it inside the app any time' },
    ],
  };
}

export function emailScreen({ title, body, cta }) {
  return {
    id: 'email', type: 'email',
    title: title || 'Where should your plan go?',
    body: body || 'We save it against this address so it is waiting inside the app — you will '
        + 'never fill this in twice.',
    cta: cta || 'Build my plan',
  };
}

export const WHEN_TRAINING = { wantsTraining: 'yes' };
export const WHEN_FOOD = { wantsFood: 'yes' };
export const WHEN_AIMED = { aim: { not: 'none' } };
