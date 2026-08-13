/**
 * Render every email, for every angle pack, against REAL lead rows, into a
 * self-contained review page in Downloads.
 *
 * Real rows rather than fixtures on purpose: fixtures are written by the same
 * person who wrote the templates and therefore agree with them. A real row is
 * the only thing that catches a merge field that is empty in the wild, a code
 * with no label, or an answer shape nobody anticipated (A5's barrier is an
 * array, not a string).
 *
 * Usage: node scripts/render-email-preview.js
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { STEPS, renderStep } from '../supabase/functions/_shared/email/templates.ts';
import { resolve } from '../supabase/functions/_shared/email/resolve.ts';

const OUT = 'C:/Users/Victus/Downloads/Dayspine-Emails';
const rows = JSON.parse(readFileSync(new URL('./_preview-rows.json', import.meta.url), 'utf8'));
const ORDER = ['A1', 'A4', 'A5', 'A12'];
const TITLES = {
  A1: 'A1 — the grocery list',
  A4: 'A4 — train and eat',
  A5: 'A5 — no gym',
  A12: 'A12 — the bad day',
};

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

let cards = '';
let n = 0;
const warnings = [];

for (const angle of ORDER) {
  const row = rows.find((r) => r.angle === angle);
  if (!row) continue;
  const v = resolve({ email: 'preview@dayspine.test', angle, answers: row.answers });

  const facts = ['barrier', 'store', 'cookNights', 'budget', 'householdSize', 'diet', 'sunday', 'listhow']
    .filter((k) => v[k])
    .map((k) => `<span class="f"><b>${k}</b> ${esc(v[k])}</span>`)
    .join('');

  cards += `<h2>${esc(TITLES[angle] || angle)} <small>real lead ${esc(row.tag)}, ${Object.keys(row.answers).length} answers</small></h2>
  <div class="facts">${facts || '<span class="f warn">no personalisable answers resolved</span>'}</div>`;

  for (let i = 0; i < STEPS.length; i++) {
    const r = renderStep(i, v, 'https://quiz.dayspine.com/u?t=preview');
    n++;
    if (/undefined|NaN|\{\{/.test(r.subject + r.text)) warnings.push(`${angle} day ${r.day}`);
    const id = `${angle}-${r.day}`;
    cards += `
  <div class="card">
    <div class="meta">
      <span class="day">Day ${r.day}</span>
      <span class="subj">${esc(r.subject)}</span>
    </div>
    <iframe srcdoc="${esc(r.html).replace(/"/g, '&quot;')}" loading="lazy"></iframe>
    <details><summary>plain text version</summary><pre>${esc(r.text)}</pre></details>
    <textarea id="fb-${id}" data-label="${angle} day ${r.day} (${esc(r.subject)})" placeholder="Feedback on ${angle} day ${r.day}..."></textarea>
  </div>`;
  }
}

const page = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Dayspine lead emails, review</title><style>
*{box-sizing:border-box}
body{margin:0;background:#f7f5f3;color:#1a1613;font:15px/1.6 "Segoe UI",-apple-system,Roboto,Arial,sans-serif;padding:26px 18px 90px}
.wrap{max-width:1180px;margin:0 auto}
h1{font-size:27px;margin:0 0 4px;letter-spacing:-.02em}
.sub{color:#6b625a;margin:0 0 22px}
h2{font-size:20px;margin:36px 0 8px;padding-top:18px;border-top:2px solid #e3ddd6}
h2 small{font-weight:400;font-size:13px;color:#8a8079}
.facts{margin:0 0 16px;display:flex;flex-wrap:wrap;gap:7px}
.f{background:#fff;border:1px solid #e3ddd6;border-radius:999px;padding:4px 11px;font-size:12.5px;color:#4a423b}
.f b{color:#B24A05;font-weight:700;margin-right:5px}
.f.warn{background:#fdecea;border-color:#f3b7ae;color:#9b2c1c}
.card{background:#fff;border:1px solid #e3ddd6;border-radius:12px;padding:14px;margin:0 0 18px;box-shadow:0 1px 5px rgba(80,60,45,.05)}
.meta{display:flex;align-items:baseline;gap:11px;margin-bottom:9px;flex-wrap:wrap}
.day{background:#FEF3EA;color:#B24A05;font-weight:800;font-size:12px;padding:3px 10px;border-radius:999px;white-space:nowrap}
.subj{font-weight:700;font-size:15.5px}
iframe{width:100%;height:520px;border:1px solid #ece7e1;border-radius:8px;background:#fff}
details{margin-top:9px}
summary{cursor:pointer;font-size:13px;color:#6b625a}
pre{white-space:pre-wrap;background:#f6f2ef;border-radius:8px;padding:12px;font-size:12.5px;line-height:1.55;margin:8px 0 0}
textarea{width:100%;min-height:64px;margin-top:10px;padding:9px 11px;border:1px solid #d9d2ca;border-radius:8px;font:14px/1.5 inherit;resize:vertical}
textarea:focus{outline:2px solid #F26A11;border-color:#F26A11}
.bar{position:fixed;left:0;right:0;bottom:0;background:#1a1613;color:#fff;padding:12px 18px;display:flex;justify-content:space-between;align-items:center;gap:14px}
.bar button{background:#F26A11;color:#fff;border:0;border-radius:999px;padding:10px 20px;font:700 14px inherit;cursor:pointer}
.bar span{font-size:13px;color:#c9c1b9}
</style></head><body><div class="wrap">
<h1>Dayspine lead emails</h1>
<p class="sub">${n} emails. 8 per angle, rendered against a real lead row for each. Nothing has been sent to anybody.</p>
${cards}
</div>
<div class="bar"><span>Type feedback under any email, then copy it all in one go.</span>
<button onclick="copyAll()">Copy all feedback</button></div>
<script>
function copyAll(){
  const out=[];
  document.querySelectorAll('textarea').forEach(t=>{ if(t.value.trim()) out.push('### '+t.dataset.label+'\\n'+t.value.trim()); });
  const txt = out.length ? out.join('\\n\\n') : '(no feedback entered)';
  navigator.clipboard.writeText(txt).then(()=>{
    const b=document.querySelector('.bar button'); const o=b.textContent;
    b.textContent='Copied '+out.length+' notes'; setTimeout(()=>b.textContent=o,1600);
  });
}
</script></body></html>`;

mkdirSync(OUT, { recursive: true });
writeFileSync(`${OUT}/REVIEW - the 8 emails.html`, page, 'utf8');
console.log(`rendered ${n} emails to ${OUT}/REVIEW - the 8 emails.html`);
if (warnings.length) console.log('⚠ placeholder leaks:', warnings.join(', '));
else console.log('no placeholder leaks');
