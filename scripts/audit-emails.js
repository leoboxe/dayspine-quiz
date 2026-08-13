/**
 * Read every email the system can produce and flag what tests do not catch.
 *
 * Assertions check invariants I thought of. This checks the things that only
 * show up when a human reads output: subjects that truncate in Gmail, quotes
 * that do not parse in their sentence, doubled words, orphan punctuation.
 */
import { readFileSync } from 'node:fs';
import { STEPS, renderStep } from '../supabase/functions/_shared/email/templates.ts';
import { resolve } from '../supabase/functions/_shared/email/resolve.ts';
import { PACKS } from '../supabase/functions/_shared/email/packs.ts';
import { ANGLES } from '../q-index.js';

const real = JSON.parse(readFileSync(new URL('./_preview-rows.json', import.meta.url), 'utf8'));
const issues = [];
const flag = (sev, where, msg, sample = '') => issues.push({ sev, where, msg, sample });

/** Build a maximally-answered row for an angle, straight from its own quiz. */
function fullRow(angle) {
  const a = { 'p.weeklyBudget': 150, 'p.children': 1, 'p.otherAdults': 1,
    'p.weightLb': 180, 'p.targetLb': 160, 'p.diet': 'highProtein', 'p.allergens': ['dairy'] };
  for (const s of ANGLES[angle].screens || []) {
    if (!s.key || !Array.isArray(s.options) || !s.options.length) continue;
    const first = s.options[0];
    if (first?.v === undefined) continue;
    a[s.key] = s.multi ? [first.v] : first.v;
  }
  return a;
}

const cases = [];
for (const angle of Object.keys(PACKS)) {
  cases.push([`${angle}/full`, angle, fullRow(angle)]);
  cases.push([`${angle}/empty`, angle, {}]);
  const r = real.find((x) => x.angle === angle);
  if (r) cases.push([`${angle}/REAL`, angle, r.answers]);
}
cases.push(['A99/unknown', 'A99', { barrier: 'x' }]);
cases.push(['null-angle', null, {}]);

for (const [label, angle, answers] of cases) {
  let v;
  try { v = resolve({ email: 'a@b.com', angle, answers }); }
  catch (e) { flag('FATAL', label, 'resolve threw: ' + e.message); continue; }

  for (let i = 0; i < STEPS.length; i++) {
    let r;
    try { r = renderStep(i, v); }
    catch (e) { flag('FATAL', `${label} D${STEPS[i].day}`, 'render threw: ' + e.message); continue; }
    const where = `${label} D${r.day}`;
    const body = r.text;

    if (r.subject.length > 68) flag('WARN', where, `subject ${r.subject.length} chars, Gmail truncates ~68`, r.subject);
    if (r.subject.length < 12) flag('WARN', where, 'subject suspiciously short', r.subject);
    const pre = (r.html.match(/overflow:hidden">([^<]*)</) || [])[1] || '';
    if (pre.length > 100) flag('WARN', where, `preheader ${pre.length} chars`, pre);
    if (!pre) flag('WARN', where, 'no preheader');
    if (pre && r.subject.toLowerCase() === pre.toLowerCase()) flag('WARN', where, 'preheader repeats subject');

    for (const m of body.matchAll(/\b(\w+) \1\b/gi)) {
      if (!['that that','had had'].includes(m[0].toLowerCase())) flag('BUG', where, 'doubled word: ' + m[0], m.input.slice(Math.max(0,m.index-50), m.index+60));
    }
    if (/\s[,.]/.test(body)) flag('BUG', where, 'space before punctuation');
    if (/ {2,}/.test(body.replace(/\n/g,''))) flag('BUG', where, 'double space');
    if (/"\s*"/.test(body)) flag('BUG', where, 'empty quotes');
    if (/\ba\s+[aeiouAEIOU]/.test(body)) flag('WARN', where, 'possible "a" before vowel', (body.match(/\ba\s+[aeiouAEIOU]\w+/)||[])[0]);
    if (/\.\s*\./.test(body)) flag('BUG', where, 'double period');
    if (/[a-z]"\./.test(body)) { /* quote then period, fine */ }
    if (/(^|\n)\s*[a-z]/.test(body.replace(/\n\n/g,'\n'))) {
      const bad = body.split('\n\n').filter(p => /^[a-z]/.test(p.trim()));
      if (bad.length) flag('BUG', where, 'paragraph starts lowercase', bad[0].slice(0,70));
    }
    if (/undefined|NaN|\[object/.test(body + r.subject)) flag('FATAL', where, 'placeholder leak');
    if (/—|–/.test(body + r.subject)) flag('BUG', where, 'em dash');
    if (!/quiz\.dayspine\.com\/paywall/.test(body)) flag('FATAL', where, 'no offer link');
    if (!/\$49/.test(body)) flag('BUG', where, 'no price stated');
  }
}

const order = { FATAL: 0, BUG: 1, WARN: 2 };
issues.sort((a, b) => order[a.sev] - order[b.sev]);
const counts = issues.reduce((m, i) => (m[i.sev] = (m[i.sev] || 0) + 1, m), {});
console.log(`CASES: ${cases.length} rows x ${STEPS.length} steps = ${cases.length * STEPS.length} emails`);
console.log('ISSUES:', JSON.stringify(counts));
console.log();
const seen = new Set();
for (const i of issues) {
  const k = i.sev + i.msg.slice(0, 40);
  if (seen.has(k)) continue;
  seen.add(k);
  console.log(`[${i.sev}] ${i.where}: ${i.msg}`);
  if (i.sample) console.log(`        ${String(i.sample).slice(0, 120)}`);
}
console.log(`\n(${issues.length} total, ${seen.size} distinct kinds)`);
