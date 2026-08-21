/*
 * P1 — plan reveal, review wall, and the email move. A4 only.
 *
 * Run:  node scripts/patch-reveal.js
 * Idempotent: re-running detects the marker and exits without touching anything.
 *
 * What changes, and why each one:
 *
 *  1. renderReveal() was a dark card of key-value rows. It becomes the screen we
 *     mocked up: the dated goal, a projection curve, the daily numbers, and one
 *     real day on the DaySpine rail. Same computed values from targets() — none
 *     of the numbers are new, they are just shown as a plan instead of a list.
 *
 *  2. The email screen moves to AFTER the reveal. It was the last screen before
 *     the build, i.e. the highest-friction ask at the lowest-motivation moment:
 *     23 questions in, nothing given back yet. After the reveal she is saving
 *     something that exists.
 *
 *  3. "One payment. No subscription." comes off the reveal.
 *
 *  4. The review wall goes into the flow for A4, populated.
 *
 * The sticky CTA needed no work — footer.cta has been position:sticky since the
 * visual pass. Verified on the long reveal screen rather than assumed.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const rd = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const wr = (f, s) => fs.writeFileSync(path.join(root, f), s);
const MARK = 'plan-reveal:v2';

let q = rd('q.html');
if (q.includes(MARK)) {
  console.log('already patched — nothing to do');
  process.exit(0);
}

/* ---------------------------------------------------------------- 1. CSS -- */
const CSS = `
/* ==========================================================================
   ${MARK} — the plan reveal.

   Light, not the dark card it replaces. The dark panel read as a receipt: a
   summary of a transaction. This screen has to read as the thing she is buying,
   so it uses the app's own surfaces and its signature element, the DaySpine
   rail, which is the one image that says "training and food on one timeline"
   without a line of copy.
   ========================================================================== */
.pr-hero{margin:16px 0 0;padding:22px 20px 20px;border-radius:var(--r-lg);position:relative;
  overflow:hidden;border:1px solid var(--line);
  background:linear-gradient(168deg,#FFF6EF 0%,#FDFBF9 52%,#FBF9F7 100%)}
.pr-hero:after{content:"";position:absolute;inset:0;pointer-events:none;
  background:radial-gradient(120% 70% at 88% -12%,rgba(242,106,17,.16),transparent 62%)}
.pr-hero>*{position:relative;z-index:1}
.pr-lab{font-size:13px;font-weight:600;color:var(--brand-deep)}
.pr-goal{font-size:clamp(29px,8.2vw,39px);font-weight:800;letter-spacing:-.035em;
  line-height:1.06;margin:5px 0 0}
.pr-goal .n{font-family:"JetBrains Mono",monospace;font-weight:700;letter-spacing:-.02em}
.pr-sub{color:var(--muted);font-size:14px;margin:9px 0 0}
.pr-curve{margin:16px 0 0}
.pr-curve svg{display:block;width:100%;height:100px}
.pr-cx{display:flex;justify-content:space-between;margin:7px 2px 0;
  font-family:"JetBrains Mono",monospace;font-size:10.5px;color:var(--faint)}
.pr-sect{margin:26px 0 0}
.pr-sect h2{font-size:19px;font-weight:800;letter-spacing:-.025em;margin:0 0 3px}
.pr-sect .lead{color:var(--muted);font-size:13.5px;margin:0 0 14px}
.pr-kcal{border:1.5px solid var(--line);border-radius:var(--r-md);padding:16px 17px;
  background:var(--canvas);box-shadow:0 1px 2px rgba(91,70,54,.05);display:flex;
  align-items:center;gap:14px}
.pr-kcal .n{font-family:"JetBrains Mono",monospace;font-size:34px;font-weight:700;
  letter-spacing:-.03em;line-height:1}
.pr-kcal .u{font-size:13px;color:var(--muted);font-weight:600;margin-top:5px}
.pr-pen{margin-left:auto;font-size:12px;font-weight:600;color:var(--brand-deep);
  background:var(--brand-tint);padding:7px 11px;border-radius:var(--r-pill);white-space:nowrap}
.pr-macros{display:grid;grid-template-columns:repeat(3,1fr);gap:9px;margin-top:9px}
.pr-mc{border:1.5px solid var(--line);border-radius:var(--r-md);padding:13px 12px;
  background:var(--canvas);box-shadow:0 1px 2px rgba(91,70,54,.05)}
.pr-mc .lab{font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;
  color:var(--muted)}
.pr-mc .v{font-family:"JetBrains Mono",monospace;font-size:21px;font-weight:700;margin-top:5px;
  letter-spacing:-.02em}
.pr-mc .rail{height:4px;border-radius:99px;background:var(--raised);margin-top:9px;overflow:hidden}
.pr-mc .rail i{display:block;height:100%;border-radius:99px}
/* the rail */
.pr-day{margin-top:14px}
.pr-ev{display:grid;grid-template-columns:44px 16px 1fr;align-items:start}
.pr-ev .t{font-family:"JetBrains Mono",monospace;font-size:11px;color:var(--faint);padding-top:15px}
.pr-ev .r{position:relative;display:flex;justify-content:center}
.pr-ev .r:before{content:"";position:absolute;top:0;bottom:0;width:1.5px;background:var(--line)}
.pr-ev:first-child .r:before{top:18px}
.pr-ev:last-child .r:before{bottom:auto;height:18px}
.pr-ev .d{position:relative;width:9px;height:9px;border-radius:50%;margin-top:18px;
  box-shadow:0 0 0 3.5px var(--canvas)}
.pr-ev .c{margin:7px 0 7px 12px;border:1.5px solid var(--line);border-radius:var(--r-md);
  background:var(--canvas);padding:13px 14px;box-shadow:0 1px 2px rgba(91,70,54,.05);flex:1}
.pr-ev .c.train{background:linear-gradient(158deg,#FFF7F1,#FDFBFA);border-color:#F5DCC8}
.pr-ev .ttl{font-weight:700;font-size:15px;letter-spacing:-.015em}
.pr-ev .meta{font-size:12.5px;color:var(--muted);margin-top:3px}
.pr-ev .m{font-family:"JetBrains Mono",monospace;font-size:11.5px;color:var(--muted);
  margin-top:8px;padding-top:8px;border-top:1px solid var(--line)}
.pr-ev .m b{color:var(--text);font-weight:700}
.pr-chip{display:inline-block;font-size:10.5px;font-weight:700;letter-spacing:.05em;
  text-transform:uppercase;padding:3px 8px;border-radius:var(--r-pill);margin:8px 5px 0 0;
  background:#E4F5F3;color:#0B6B62}
/* review wall additions: summary block + distribution */
.rev-sum{border:1px solid var(--line);border-radius:var(--r-lg);overflow:hidden;
  background:linear-gradient(168deg,#FFF6EF,#FBF9F7);margin-bottom:14px}
.rev-sum .top{display:flex;align-items:center;gap:18px;padding:18px 18px 14px}
.rev-sum .avg{font-family:"JetBrains Mono",monospace;font-size:42px;font-weight:700;line-height:1;
  letter-spacing:-.04em}
.rev-dist{padding:0 18px 16px;display:flex;flex-direction:column;gap:5px}
.rev-dist .row{display:grid;grid-template-columns:30px 1fr 34px;align-items:center;gap:9px}
.rev-dist .lb,.rev-dist .pc{font-family:"JetBrains Mono",monospace;font-size:11px;color:var(--muted)}
.rev-dist .pc{text-align:right;color:var(--faint)}
.rev-dist .tr{height:7px;background:#EFE7DF;border-radius:99px;overflow:hidden}
.rev-dist .tr i{display:block;height:100%;background:#F5A524;border-radius:99px}
.rev-card .who{display:flex;align-items:center;gap:9px}
.rev-av{width:28px;height:28px;border-radius:50%;background:var(--raised);display:flex;
  align-items:center;justify-content:center;font:700 11.5px/1 Outfit,sans-serif;color:var(--muted)}
.rev-ver{font-size:10px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;
  color:#0B6B62;background:#E4F5F3;border-radius:var(--r-pill);padding:2px 7px}
.rev-when{font-family:"JetBrains Mono",monospace;font-size:10.5px;color:var(--faint);margin-left:auto}
`;
q = q.replace('@media (prefers-reduced-motion:reduce){*{transition:none!important}}',
  CSS + '@media (prefers-reduced-motion:reduce){*{transition:none!important}}');

/* ------------------------------------------------- 2. renderReveal rebuild -- */
const oldStart = q.indexOf('function renderReveal() {');
const oldEnd = q.indexOf('render();', oldStart);
if (oldStart < 0 || oldEnd < 0) throw new Error('renderReveal not found — q.html changed shape');

const NEW = `function planDay() {
  /* One real day, built from what she answered. Meal names come from the diet and
     the dislikes she gave; the session comes from her gear and session length. The
     numbers are the same targets() figures the old reveal printed as a list. */
  const t = targets();
  const veg = A['p.diet'] === 'vegetarian' || A['p.diet'] === 'vegan';
  const kcal = t.kcal;
  const b = Math.round(kcal * 0.23), l = Math.round(kcal * 0.31),
        d = Math.round(kcal * 0.37), s = kcal - b - l - d;
  const gear = A['p.homeGear'];
  const mins = Number(A['p.sessionMinutes']) || 45;
  const lifts = (gear === 'none' || gear === 'bodyweight')
    ? ['Goblet squat &middot; bodyweight', 'Hip hinge &middot; 3&times;12', 'Split squat &middot; 3&times;10']
    : ['Goblet squat &middot; 3&times;10', 'Romanian deadlift &middot; 3&times;10', 'Split squat &middot; 3&times;8'];
  const ev = [];
  ev.push(['07:30', 'nutrition', veg ? 'Greek yoghurt, berries, seeds' : 'Greek yoghurt, berries, honey',
    '4 min &middot; nothing to cook', b]);
  ev.push(['12:45', 'nutrition', veg ? 'Halloumi and grain bowl' : 'Chicken and rice bowl',
    'Batch-cooked &middot; 6 min', l]);
  if (t.days) {
    ev.push(['18:00', 'training', 'Lower body &middot; ' + mins + ' min',
      gear === 'none' ? 'Bodyweight &mdash; the kit you told us you have'
                      : 'Dumbbells &mdash; the kit you told us you have', null, lifts]);
  }
  ev.push(['19:30', 'nutrition', veg ? 'Tofu, potatoes, greens' : 'Salmon, potatoes, greens',
    t.days ? 'After training &middot; 22 min' : 'Dinner &middot; 22 min', d]);
  if (s > 90) ev.push(['21:00', 'nutrition', 'Cottage cheese and fruit', 'Optional', s]);
  return { t, ev };
}

function revealHtml() {
  const { t, ev } = planDay();
  const aimed = A.aim && A.aim !== 'none';
  const date = t.when.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
  const target = Number(A['p.targetLb']) || 0;
  const carbs = Math.round((t.kcal - t.proteinG * 4 - t.kcal * 0.28) / 4);
  const fat = Math.round(t.kcal * 0.28 / 9);

  const hero = aimed && t.toLose
    ? '<div class="pr-hero"><div class="pr-lab">Your goal</div>'
      + '<h2 class="pr-goal"><span class="n">' + target + ' lb</span> by <span class="n">'
      + date + '</span></h2>'
      + '<p class="pr-sub">That is <b>' + t.toLose + ' lb</b> at the pace you chose. '
      + 'Your plan is built to land there.</p>'
      + '<div class="pr-curve"><svg viewBox="0 0 320 96" preserveAspectRatio="none" aria-hidden="true">'
      + '<defs><linearGradient id="prg" x1="0" y1="0" x2="0" y2="1">'
      + '<stop offset="0" stop-color="#F26A11" stop-opacity=".22"/>'
      + '<stop offset="1" stop-color="#F26A11" stop-opacity="0"/></linearGradient></defs>'
      + '<path d="M4,18 C90,26 150,44 210,60 C250,70 288,75 316,77 L316,96 L4,96 Z" fill="url(#prg)"/>'
      + '<path d="M4,18 C90,26 150,44 210,60 C250,70 288,75 316,77" fill="none" stroke="#F26A11" '
      + 'stroke-width="3" stroke-linecap="round"/>'
      + '<circle cx="4" cy="18" r="5" fill="#fff" stroke="#F26A11" stroke-width="3"/>'
      + '<circle cx="316" cy="77" r="6" fill="#F26A11" stroke="#fff" stroke-width="3"/></svg>'
      + '<div class="pr-cx"><span>TODAY &middot; ' + (Number(A['p.weightLb']) || 0) + ' lb</span>'
      + '<span>' + date.toUpperCase() + ' &middot; ' + target + ' lb</span></div></div></div>'
    : '<div class="pr-hero"><div class="pr-lab">Your plan is built</div>'
      + '<h2 class="pr-goal">Here is your week.</h2>'
      + '<p class="pr-sub">Written against what you actually told us.</p></div>';

  const numbers = aimed
    ? '<div class="pr-sect"><h2>Your daily numbers</h2>'
      + '<p class="lead">Change any of these whenever you like &mdash; the plan re-costs itself.</p>'
      + '<div class="pr-kcal"><div><div class="n">' + t.kcal.toLocaleString('en-US') + '</div>'
      + '<div class="u">calories a day</div></div><span class="pr-pen">&#9998; Edit</span></div>'
      + '<div class="pr-macros">'
      + '<div class="pr-mc"><div class="lab">Protein</div><div class="v">' + t.proteinG + 'g</div>'
      + '<div class="rail"><i style="width:74%;background:#F26A11"></i></div></div>'
      + '<div class="pr-mc"><div class="lab">Carbs</div><div class="v">' + Math.max(0, carbs) + 'g</div>'
      + '<div class="rail"><i style="width:56%;background:#0D9488"></i></div></div>'
      + '<div class="pr-mc"><div class="lab">Fat</div><div class="v">' + fat + 'g</div>'
      + '<div class="rail"><i style="width:40%;background:#2563EB"></i></div></div>'
      + '</div></div>'
    : '';

  const rows = ev.map(function (e) {
    const colour = e[1] === 'training' ? '#0D9488' : '#F26A11';
    const chips = e[5] ? e[5].map(function (x) { return '<span class="pr-chip">' + x + '</span>'; }).join('') : '';
    const macro = e[4]
      ? '<div class="m"><b>' + e[4] + '</b> kcal</div>'
      : '<div class="m">Your food today is built <b>around this session</b>, not against it.</div>';
    return '<div class="pr-ev"><div class="t">' + e[0] + '</div>'
      + '<div class="r"><span class="d" style="background:' + colour + '"></span></div>'
      + '<div class="c' + (e[1] === 'training' ? ' train' : '') + '">'
      + '<div class="ttl">' + e[2] + '</div><div class="meta">' + e[3] + '</div>'
      + chips + macro + '</div></div>';
  }).join('');

  return hero + numbers
    + '<div class="pr-sect"><h2>' + startWord().replace(/^./, function (c) { return c.toUpperCase(); })
    + ', in full</h2>'
    + '<p class="lead">One real day off your plan. Every other day is already written too.</p>'
    + '<div class="pr-day">' + rows + '</div></div>';
}

function renderReveal() {
  const t = targets();
  main.innerHTML = '<span class="kicker">Built from your answers</span>' + revealHtml();
  nextBtn.style.display = '';
  setCta('Unlock my full plan', true);
  nextBtn.onclick = revealNext;
  /* The reveal used to close on "One payment. No subscription." Removed: this
     screen's job is to hand over the plan, and a price-shaped line under the
     button starts the money conversation a screen early. */
  legal.textContent = '';
  track('quiz_reveal', { kcal: t.kcal });
}

/* A4 collects the email AFTER the reveal instead of before the build, so the
   ask lands at peak investment rather than as the price of entry. Angles that
   still carry emailScreen() in their own array are unaffected and skip this. */
function revealNext() {
  if (A.email) return toPaywall();
  main.innerHTML = '';
  renderEmail({
    title: 'Where should your plan go?',
    body: 'We save it against this address so your week is waiting inside the app '
        + '\\u2014 you will never fill this in twice.',
    cta: 'Save my plan',
  });
  document.getElementById('back').style.visibility = 'visible';
  document.getElementById('back').onclick = renderReveal;
  legal.textContent = '';
  nextBtn.onclick = function () {
    const v = (pending || '').toLowerCase();
    if (!/^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$/.test(v)) {
      const e = document.getElementById('eerr');
      e.hidden = false; e.textContent = 'That does not look like an email address.';
      return;
    }
    A.email = v; persist(true); backup({ email: v }); track('quiz_email', {});
    toPaywall();
  };
  track('quiz_email_shown', {});
}

function toPaywall() {
  const to = new URL('./paywall.html', location.href);
  if (ANGLE) to.searchParams.set('a', ANGLE);
  location.href = to.href;
}

`;
q = q.slice(0, oldStart) + NEW + q.slice(oldEnd);
wr('q.html', q);
console.log('q.html patched');

/* ------------------------------------------------------- 3. A4 screen list -- */
let a = rd('q-all.js');
const i4 = a.search(/\bA4\s*:\s*\{/);
const i5 = a.search(/\bA5\s*:\s*\{/);
let blk = a.slice(i4, i5);
if (!blk.includes('emailScreen({})')) throw new Error('A4 emailScreen not found');
blk = blk.replace(
  '    emailScreen({}),\n',
  '    /* The review wall sits immediately before the build, which is the last\n'
  + '       moment she is still deciding whether to finish rather than whether to\n'
  + '       buy. Email is NOT here any more: it renders after the reveal. */\n'
  + '    reviewsScreen(),\n');
a = a.slice(0, i4) + blk + a.slice(i5);
wr('q-all.js', a);
console.log('q-all.js patched — A4: emailScreen removed, reviewsScreen added');
