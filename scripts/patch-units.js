/*
 * Wire units.js into the quiz. Display only -- p.weightLb / p.targetLb /
 * p.heightIn keep storing imperial, so the plan builder is untouched.
 *
 * Five places show a unit:
 *   1. the profile screen's height + weight rows
 *   2. the target slider
 *   3. the pace hints ("About 0.7 lb a week")
 *   4. the reveal headline and the curve's end labels
 *   5. the reveal's "That is 22 lb" line
 *
 * Everything is CRLF-safe: this repo is CRLF and a bare \n needle silently
 * matches nothing while String.replace happily returns the original.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const rd = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const wr = (f, s) => fs.writeFileSync(path.join(root, f), s);
const must = (before, after, what) => {
  if (before === after) throw new Error('no-op: ' + what);
  return after;
};

/* ------------------------------------------------------------- q.html -- */
let q = rd('q.html');
if (q.includes("from './units.js'")) { console.log('q.html already wired'); }
else {
  q = must(q, q.replace(
    "import { ANGLES, pickAngle } from './q-index.js';",
    "import { ANGLES, pickAngle } from './q-index.js';\n"
    + "import { showWeight, showHeight, showDelta, weightUnit, isMetric } from './units.js';"),
    'units import');

  /* 1 + 2. Sliders. `suffix` is authored as 'lb'; in a metric or stone market the
     number itself already carries the unit, so the suffix must not double it. */
  q = must(q, q.replace(
    "  const show = (n) => s.format === 'feet' ? fmtFeet(n) : (s.prefix || '') + n;",
    "  /* A weight slider is authored with suffix 'lb'. showWeight() returns the\n"
    + "     number in the market's own unit, so the authored suffix is replaced\n"
    + "     rather than appended -- otherwise a Briton sees \"11st 11 lb\". */\n"
    + "  const isWeight = s.suffix === 'lb';\n"
    + "  const show = (n) => s.format === 'feet' ? showHeight(n, fmtFeet)\n"
    + "    : isWeight ? showWeight(n, true) : (s.prefix || '') + n;\n"
    + "  const unitWord = isWeight ? weightUnit() : s.suffix;"),
    'slider show()');
  q = must(q, q.replace(
    "    + (s.suffix ? '<span class=\"unit\">' + s.suffix + '</span>' : '')",
    "    + (unitWord ? '<span class=\"unit\">' + unitWord + '</span>' : '')"),
    'slider suffix');

  /* 3. Profile screen rows. */
  q = must(q, q.replace(
    "  const show = (f, n) => f.format === 'feet' ? fmtFeet(n) : n + (f.suffix ? ' ' + f.suffix : '');",
    "  const show = (f, n) => f.format === 'feet' ? showHeight(n, fmtFeet)\n"
    + "    : f.suffix === 'lb' ? showWeight(n)\n"
    + "    : n + (f.suffix ? ' ' + f.suffix : '');"),
    'profile show()');

  /* 4. The reveal: goal headline, curve end labels. */
  q = must(q, q.replace(
    "      + '<h2 class=\"pr-goal\"><span class=\"n\">' + target + ' lb</span> by <span class=\"n\">'",
    "      + '<h2 class=\"pr-goal\"><span class=\"n\">' + showWeight(target) + '</span> by <span class=\"n\">'"),
    'reveal headline');
  q = must(q, q.replace(
    "      + '<p class=\"pr-sub\">That is <b>' + t.toLose + ' lb</b> at the pace you chose. '",
    "      + '<p class=\"pr-sub\">That is <b>' + showDelta(t.toLose) + '</b> at the pace you chose. '"),
    'reveal delta');
  /* Two separate single-line replacements rather than one spanning the break.
     A needle containing a bare \n cannot match a CRLF file, and String.replace
     fails silently when it does not match -- which is how the first version of
     this script reported success on a no-op. */
  q = must(q, q.replace(
    "TODAY &middot; ' + (Number(A['p.weightLb']) || 0) + ' lb</span>'",
    "TODAY &middot; ' + showWeight(Number(A['p.weightLb']) || 0) + '</span>'"),
    'reveal curve start label');
  q = must(q, q.replace(
    "date.toUpperCase() + ' &middot; ' + target + ' lb</span></div></div></div>'",
    "date.toUpperCase() + ' &middot; ' + showWeight(target) + '</span></div></div></div>'"),
    'reveal curve labels');

  wr('q.html', q);
  console.log('q.html wired to units.js');
}

/* ------------------------------------------------------------ q-kit.js -- */
let k = rd('q-kit.js');
if (k.includes("from './units.js'")) { console.log('q-kit already wired'); }
else {
  k = must(k, k.replace(
    /^(\/\*\*?[\s\S]*?\*\/\r?\n)?/,
    (m) => m + "import { showRate } from './units.js';\r\n\r\n"),
    'q-kit units import');

  /* 5. Pace hints. Authored in pounds; a metric market needs kilograms or the
     three options read as someone else's plan. */
  k = must(k, k.replace(
    /\{ v: 'steady', label: 'Steady', hint: 'About 0\.7 lb a week' \},\r?\n(\s*)\{ v: 'balanced', label: 'Balanced', hint: 'About 1 lb a week' \},\r?\n\s*\{ v: 'aggressive', label: 'Aggressive', hint: 'About 1\.3 lb a week' \},/,
    "{ v: 'steady', label: 'Steady', hint: 'About ' + showRate(0.7) },\r\n"
    + "$1{ v: 'balanced', label: 'Balanced', hint: 'About ' + showRate(1) },\r\n"
    + "$1{ v: 'aggressive', label: 'Aggressive', hint: 'About ' + showRate(1.3) },"),
    'pace hints');

  wr('q-kit.js', k);
  console.log('q-kit.js wired to units.js');
}
