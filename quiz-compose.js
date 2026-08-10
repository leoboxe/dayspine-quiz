/*
 * Composes the running order for one angle.
 *
 * The spine is shared and the angle supplies the parts that have to sound like
 * the ad she just watched. Keeping the two apart matters for a reason beyond
 * tidiness: age, sex, goals, spend, the identity-loss question, the fear
 * question and both commitment gates are byte-identical across all fifteen, so
 * completion rates and answer distributions stay comparable between angles. If
 * A6 out-converts A13 we can say it was the angle, not a different question set.
 *
 * Order is unchanged from the version that shipped, because the order is the
 * blueprint: positive, then neutral, then negative, then pressure release, then
 * the double commitment gate.
 *
 *   1  age            shared   one tap, starts the yes-chain
 *   2  sex            shared
 *   3  angle q1       ANGLE    her grievance, asked back to her
 *   4  goal           shared   positive block -- what she wants
 *   5  proof          ANGLE    social proof before the deep questions
 *   6  angle q2       ANGLE    current behaviour
 *   7  spend          shared   the number the paywall will multiply out
 *   8  angle q3       ANGLE    the defining moment
 *   9  bestshape      shared   identity loss
 *  10  angle q4       ANGLE    what keeps it happening
 *  11  reframe        ANGLE    pressure release: it was not you
 *  12  fear           shared   cost of doing nothing
 *  13  commit1        shared   gate one
 *  14  commit2        shared   gate two
 *
 * `spend` stays in the spine deliberately -- paywall.html reads that answer to
 * anchor $79 against her own yearly outlay, so it must exist on every angle.
 */
import { SCREENS as BASE, LOADING_STEPS } from './quiz-content.js';
import { ANGLES, pickAngle } from './quiz-angles.js';

const byId = (id) => BASE.find((s) => s.id === id);

/** An angle question block -> the screen shape the engine renders. */
function q(block, id) {
  const s = {
    id,
    type: block.multi ? 'multi' : 'question',
    question: block.question,
    key: block.key,
    options: block.options,
  };
  if (block.hint) s.hint = block.hint;
  return s;
}

export function buildScreens(search) {
  const key = pickAngle(search);
  const a = ANGLES[key];

  // Screen one carries the angle's framing, but is otherwise the shared age
  // question -- same options, same key, so the data stays comparable.
  const age = Object.assign({}, byId('age'), {
    title: a.entry.title,
    sub: a.entry.sub,
  });

  const screens = [
    age,
    byId('sex'),
    q(a.q1, 'a_q1'),
    byId('goal'),
    Object.assign({ id: 'a_proof', type: 'interstitial' }, a.proof),
    q(a.q2, 'a_q2'),
    byId('spend'),
    q(a.q3, 'a_q3'),
    byId('bestshape'),
    q(a.q4, 'a_q4'),
    Object.assign({ id: 'a_reframe', type: 'interstitial' }, a.reframe),
    byId('fear'),
    byId('commit1'),
    byId('commit2'),
  ].filter(Boolean);

  return { key, angle: a, screens };
}

export { LOADING_STEPS, ANGLES };
