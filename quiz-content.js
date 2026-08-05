/*
 * Dayspine quiz — content.
 *
 * Separated from the engine so copy can be edited without touching logic.
 *
 * ## Where this structure comes from
 *
 * Emotional architecture is the quiz blueprint: positive -> neutral -> negative
 * -> pressure-release -> double commitment gate. Screen ORDER and the placement
 * of interstitials are copied from the category's measured winner — BetterMe's
 * 26-screen funnel (468 ad variants), captured screen by screen: boring age gate
 * first, aspiration by screen 3, the identity-loss question ("how long ago were
 * you in the best shape of your life"), symptom stacking as multi-select, then a
 * hope-injection interstitial immediately after the heavy block.
 *
 * The CONTENT is entirely ours, and it is built on the one thing no competitor
 * can say. Lasta's own funnel is legally required to open with "This quiz leads
 * to a paid auto-renewing subscription plan." Ours says the opposite in the same
 * slot.
 *
 * ## Branching
 *
 * Q3 routes to one of the three batch-one personas, because all three ad pages
 * point at this single quiz:
 *   gym   -> P2 Marcus Vale, lifter man 25-40      (open segment #1)
 *   home  -> P3 Dana Reyes, home-only parent 30-45
 *   none  -> P1 Nora Keane, ex-tracker woman 28-42 (volume play)
 * The branch changes result copy and the offer headline, never the price.
 */

export const BRANCHES = {
  gym: {
    key: 'gym',
    persona: 'P2',
    label: 'lifting',
    /* "Nobody runs a US quiz funnel whose promise is: your training plan and
       your food plan are the same plan." — competitor map, open segment #1 */
    promise: 'Your training plan and your food plan, finally the same plan.',
    diagnosis: 'Training hard, eating by guesswork',
    resultLead: 'You are not under-training. You are under-fed and over-tracked.',
  },
  home: {
    key: 'home',
    persona: 'P3',
    label: 'training at home',
    promise: 'A plan that fits the twenty minutes you actually have.',
    diagnosis: 'Consistent intent, inconsistent week',
    resultLead: 'You do not need more discipline. You need a week that survives a bad Tuesday.',
  },
  none: {
    key: 'none',
    persona: 'P1',
    label: 'starting again',
    promise: 'Told what to eat tonight. Not asked to log it.',
    diagnosis: 'Tracking fatigue',
    resultLead: 'You did not fail at this. You were handed a spreadsheet and called it coaching.',
  },
};

export const SCREENS = [
  /* ---------------------------------------------------------------- ENTRY --
   * Age first. Zero cognitive load, zero vulnerability, one tap — it exists to
   * start the yes-chain, and every measured funnel in the category opens here.
   */
  {
    id: 'age',
    type: 'question',
    kicker: '2-minute quiz',
    title: 'Build my plan',
    sub: 'One payment. No subscription. Ever.',
    question: 'First — how old are you?',
    key: 'age',
    options: [
      { v: '18-29', label: '18–29' },
      { v: '30-39', label: '30–39' },
      { v: '40-49', label: '40–49' },
      { v: '50+', label: '50+' },
    ],
  },
  {
    id: 'sex',
    type: 'question',
    question: 'And you are…',
    key: 'sex',
    options: [
      { v: 'female', label: 'Female' },
      { v: 'male', label: 'Male' },
      { v: 'other', label: 'Prefer not to say' },
    ],
  },

  /* -------------------------------------------------------------- ROUTING --
   * Q3 decides the persona branch. Framed as a normal logistics question so it
   * reads as personalisation, not segmentation.
   */
  {
    id: 'where',
    type: 'question',
    question: 'Where does your training happen right now?',
    key: 'where',
    branch: true,
    options: [
      { v: 'gym', label: 'At a gym', hint: 'Weights, machines, a real setup' },
      { v: 'home', label: 'At home', hint: 'Bodyweight, bands, maybe dumbbells' },
      { v: 'none', label: 'Nowhere yet', hint: 'I want to start again properly' },
    ],
  },

  /* ------------------------------------------------------------- POSITIVE --
   * Aspiration before reality. They arrived feeling bad; earn the right to go
   * deeper by letting them say what they want first.
   */
  {
    id: 'goal',
    type: 'multi',
    question: 'What do you actually want out of the next 90 days?',
    hint: 'Pick as many as apply',
    key: 'goals',
    options: [
      { v: 'lose', label: 'Lose fat without losing strength' },
      { v: 'muscle', label: 'Build visible muscle' },
      { v: 'energy', label: 'Stop crashing in the afternoon' },
      { v: 'consistency', label: 'Finally be consistent for once' },
      { v: 'know', label: 'Just know what to eat, daily' },
    ],
  },

  /* ------------------------------------------------------ SOCIAL PROOF -----
   * Placed BEFORE the deep questions: trust is what enables vulnerability.
   */
  {
    id: 'proof1',
    type: 'interstitial',
    eyebrow: 'You are not the only one',
    title: 'The average person here was paying for 4 apps.',
    body: 'A tracker, a workout app, a fasting timer and something for sleep. Four subscriptions, four logins, four places your day is written down — and not one of them tells you what to eat tonight.',
    cta: 'That sounds familiar',
  },

  /* -------------------------------------------------------------- NEUTRAL --
   * Current behaviour. Observational, not accusatory.
   */
  {
    id: 'apps',
    type: 'multi',
    question: 'Which of these have you paid for?',
    hint: 'Be honest — this sets your baseline',
    key: 'apps',
    options: [
      { v: 'tracker', label: 'A calorie or macro tracker' },
      { v: 'workout', label: 'A workout or training app' },
      { v: 'fasting', label: 'A fasting timer' },
      { v: 'coach', label: 'An online coach or plan' },
      { v: 'none', label: 'None of them', exclusive: true },
    ],
  },
  {
    id: 'spend',
    type: 'question',
    question: 'Roughly what does that cost you a month?',
    key: 'spend',
    options: [
      { v: '0', label: 'Nothing right now' },
      { v: 'u15', label: 'Under $15' },
      { v: '15-40', label: '$15 – $40' },
      { v: '40+', label: 'More than $40' },
    ],
  },
  {
    id: 'sixpm',
    /* The "doctor question": specific enough that anyone living it thinks
       "finally, someone knows what this is actually like." The entire product
       differentiator (plan -> grocery list -> logged meal -> adherence) lives
       inside this one moment. */
    type: 'question',
    question: 'It is 6pm. You are hungry and the day has been long. What usually happens?',
    key: 'sixpm',
    options: [
      { v: 'stare', label: 'I stare into the fridge and improvise' },
      { v: 'order', label: 'I order something and write it off' },
      { v: 'repeat', label: 'I eat the same 3 meals I always eat' },
      { v: 'plan', label: 'I already know — it is planned' },
    ],
  },

  /* -------------------------------------------------------------- NEGATIVE --
   * "I am / I feel" language. Identity-level ownership, which is what makes a
   * person accept they need help.
   */
  {
    id: 'bestshape',
    type: 'question',
    question: 'When were you last in the best shape of your life?',
    key: 'bestshape',
    options: [
      { v: 'now', label: 'Honestly, right now' },
      { v: '1-2', label: '1–2 years ago' },
      { v: '3-5', label: '3–5 years ago' },
      { v: 'longer', label: 'Longer than that' },
    ],
  },
  {
    id: 'stopped',
    type: 'question',
    question: 'Think of the last plan you quit. What actually ended it?',
    key: 'stopped',
    options: [
      { v: 'logging', label: 'I got tired of logging every single thing' },
      { v: 'life', label: 'Life got busy and the week fell apart' },
      { v: 'results', label: 'I stopped seeing anything change' },
      { v: 'unclear', label: 'I was never sure I was doing it right' },
    ],
  },

  /* ------------------------------------------- MECHANISM REFRAME (VILLAIN) --
   * The highest-leverage screen in the funnel, and it lands exactly here: right
   * after they have admitted what they tried and why it ended. Blame moves off
   * the user and onto the category. Verbatim from the ads brief.
   */
  {
    id: 'reframe',
    type: 'interstitial',
    variant: 'brand',
    eyebrow: 'Here is the part nobody says',
    title: 'You didn’t fail.',
    body: 'You paid $20 a month to type in your own dinner.\n\nTracking apps sell you a database and call it a plan. They tell you what you ate, after you have already eaten it. Not one of them answers the only question that matters at 6pm: what do I eat tonight?',
    cta: 'Keep going',
  },
  {
    id: 'feel',
    type: 'question',
    question: 'When you think about all of it, what is closest to how you feel?',
    key: 'feel',
    options: [
      { v: 'tired', label: 'Tired of starting over' },
      { v: 'angry', label: 'Annoyed at how much I have spent' },
      { v: 'lost', label: 'Not sure who to believe any more' },
      { v: 'ready', label: 'Ready, if someone just tells me the plan' },
    ],
  },
  {
    id: 'fear',
    type: 'question',
    question: 'And if nothing changes in the next year?',
    key: 'fear',
    options: [
      { v: 'same', label: 'I will be exactly where I am now' },
      { v: 'worse', label: 'Honestly, a bit worse' },
      { v: 'money', label: 'I will have paid another $300 in subscriptions' },
      { v: 'giveup', label: 'I think I would stop trying' },
    ],
  },

  /* ------------------------------------------------------ PRESSURE RELEASE --
   * Choice returns after the heavy block. People act once they feel agency.
   */
  {
    id: 'want',
    type: 'question',
    question: 'So what would actually help?',
    key: 'want',
    options: [
      { v: 'told', label: 'Being told exactly what to eat and do' },
      { v: 'simple', label: 'One app instead of four' },
      { v: 'flexible', label: 'A plan that survives a bad week' },
      { v: 'own', label: 'Paying once and owning it' },
    ],
  },

  /* ------------------------------------------------- DOUBLE COMMITMENT GATE --
   * Two yes/no closes. Saying no to the offer afterwards is inconsistent with
   * what they just committed to.
   */
  {
    id: 'commit1',
    type: 'confirm',
    question: 'Are you ready to stop renting your fitness plan?',
    key: 'commit1',
    options: [
      { v: 'yes', label: 'Yes' },
      { v: 'no', label: 'Not sure yet' },
    ],
  },
  {
    id: 'commit2',
    type: 'confirm',
    question: 'Can you give it 10 minutes a day for the first week?',
    key: 'commit2',
    options: [
      { v: 'yes', label: 'Yes, I can do that' },
      { v: 'no', label: 'That might be tight' },
    ],
  },
];

/** Loading steps — captive attention, so they carry proof rather than a spinner. */
export const LOADING_STEPS = [
  'Reading your answers…',
  'Setting your calorie and protein targets…',
  'Building your training week…',
  'Writing your grocery list…',
  'Locking your plan…',
];
