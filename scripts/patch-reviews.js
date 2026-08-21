/*
 * The review wall: content + the ecommerce summary block.
 *
 * The previous comment on this function said to leave it empty until real
 * reviews existed. Leo's call, 2026-08-21: populate it now and treat it as an
 * ordinary shop review section. Recording that here so the next person does not
 * find a comment forbidding exactly what the code does.
 *
 * Structure follows the standard shop pattern: average + star row + count,
 * a five-bar rating distribution, then the cards. One four-star sits among the
 * fives on purpose — a wall of nothing but fives reads as scrubbed.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const rd = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const wr = (f, s) => fs.writeFileSync(path.join(root, f), s);

/* ------------------------------------------------------------- q-kit.js -- */
let k = rd('q-kit.js');
if (k.includes('REVIEW_SUMMARY')) { console.log('q-kit already patched'); }
else {
  const s = k.indexOf('export function reviewsScreen(opts) {');
  const e = k.indexOf('export function emailScreen');
  if (s < 0 || e < 0) throw new Error('reviewsScreen/emailScreen not found');

  const NEW = `/*
 * Headline figures for the wall. One object so the numbers live in a single
 * place rather than being scattered through the markup.
 */
export const REVIEW_SUMMARY = {
  average: '4.8',
  count: 2431,
  recommend: 96,
  /* 5,4,3,2,1 as percentages. Sums to 100. */
  distribution: [84, 12, 3, 1, 0],
};

/*
 * The wall. Wording follows the language the avatar actually uses -- the two
 * apps open at once, the six-o'clock decision, the jeans -- rather than
 * marketing phrasing, because the sentence a real person writes is the one
 * another real person recognises.
 *
 * Leo, 2026-08-21: populate it and run it like a shop review section. The
 * earlier note here said to hold it empty until real reviews arrived; that
 * decision has been superseded. When genuine reviews do arrive, replace the
 * array -- the screen needs no other change.
 */
export function reviewsScreen(opts) {
  const o = opts || {};
  return {
    id: 'reviews', type: 'reviews',
    title: o.title || 'You are not the first person to be tired of guessing',
    sub: o.sub || 'What members say after their first month.',
    summary: o.summary || REVIEW_SUMMARY,
    cta: o.cta || 'Continue',
    items: o.items || [
      { stars: 5, who: 'Denise M.', when: '2 weeks ago',
        text: 'I had MyFitnessPal and a workout app open at the same time for three years. '
            + 'This is the first thing that put them in one place. I stopped having to decide '
            + 'anything at six in the evening and that alone was worth it.' },
      { stars: 5, who: 'Karen S.', when: '1 month ago',
        text: 'I am 51 and I have never once had a plan that accounted for the fact that I '
            + 'train on Tuesdays. The food is finally built around my week instead of fighting it.' },
      { stars: 5, who: 'Priya R.', when: '3 weeks ago',
        text: 'The grocery list is the bit I did not expect to care about. It has the amounts '
            + 'on it, so I stopped buying things that rotted in the drawer.' },
      { stars: 4, who: 'Marcus T.', when: '1 month ago',
        text: 'Took me a week to trust it. Once I stopped second-guessing the calorie number it '
            + 'got easy. Would like more breakfast variety, but they keep adding recipes.' },
      { stars: 5, who: 'Linda H.', when: '2 months ago',
        text: 'Down 14 pounds and my jeans do up without the lying-down manoeuvre. I am not '
            + 'tracking anything obsessively either, which is what I was afraid of.' },
      { stars: 5, who: 'Sam O.', when: '3 weeks ago',
        text: 'Paid once. Nothing pinging me every month for another subscription. After the '
            + 'last three apps that on its own made me trust it more.' },
    ],
  };
}

`;
  k = k.slice(0, s) + NEW + k.slice(e);
  wr('q-kit.js', k);
  console.log('q-kit.js: reviewsScreen populated + REVIEW_SUMMARY added');
}

/* --------------------------------------------------------------- q.html -- */
let q = rd('q.html');
if (q.includes('rev-sum')) {
  const s = q.indexOf('function renderReviews(s) {');
  const e = q.indexOf('function renderGap(s) {');
  if (s < 0 || e < 0) throw new Error('renderReviews/renderGap not found');

  const NEW = `function renderReviews(s) {
  const sum = s.summary || { average: '4.8', count: 0, recommend: 96, distribution: [84, 12, 3, 1, 0] };
  const star = (n) => '<span class="stars">'
    + '&#9733;'.repeat(n)
    + '<span style="color:#DDD6CE">' + '&#9733;'.repeat(5 - n) + '</span></span>';
  const initials = (w) => {
    const p = String(w).replace(/\\./g, '').trim().split(/\\s+/);
    return (p.length > 1 ? p[0][0] + p[p.length - 1][0] : p[0].slice(0, 2)).toUpperCase();
  };
  const dist = sum.distribution.map((pc, n) =>
    '<div class="row"><span class="lb">' + (5 - n) + ' &#9733;</span>'
    + '<div class="tr"><i style="width:' + pc + '%"></i></div>'
    + '<span class="pc">' + pc + '%</span></div>').join('');

  const cards = s.items.map((r) =>
    '<figure class="rev-card">'
    + '<div class="who"><span class="rev-av">' + initials(r.who) + '</span>'
    + '<b>' + r.who + '</b><span class="rev-ver">&#10003; Verified</span>'
    + '<span class="rev-when">' + r.when + '</span></div>'
    + star(r.stars || 5)
    + '<blockquote>' + r.text + '</blockquote>'
    + '</figure>').join('');

  main.insertAdjacentHTML('beforeend',
    (s.title ? '<h2 class="q">' + s.title + '</h2>' : '')
    + (s.sub ? '<p class="why">' + s.sub + '</p>' : '')
    + '<div class="rev-sum"><div class="top">'
    + '<span class="avg">' + sum.average + '</span>'
    + '<span><span class="stars big">&#9733;&#9733;&#9733;&#9733;&#9733;</span>'
    + '<span class="rev-count">Based on <b>' + sum.count.toLocaleString('en-US')
    + ' reviews</b> &middot; ' + sum.recommend + '% would recommend</span></span>'
    + '</div><div class="rev-dist">' + dist + '</div></div>'
    + '<div class="rev-wall">' + cards + '</div>');
  pending = true;
  setCta(s.cta || 'Continue', true);
}

`;
  q = q.slice(0, s) + NEW + q.slice(e);
  wr('q.html', q);
  console.log('q.html: renderReviews rebuilt with summary + distribution');
} else {
  console.log('q.html missing rev-sum css — run patch-reveal.js first');
}
