/**
 * Generate the value-to-label map the emails quote from.
 *
 * Every interesting quiz answer is stored as a CODE, not as prose: `barrier` is
 * "toomuch", `sunday` is "over2", `x.store` is "costco". An email that says "you
 * told me toomuch" is worse than one that says nothing, so the codes have to be
 * resolved back to the exact wording the lead actually read on screen.
 *
 * Generated rather than hand-written because the quiz owns that wording, and a
 * hand-copied map silently rots the first time an option is reworded.
 * tests/email-resolve.test.ts re-runs this and fails if the checked-in file has
 * drifted from the quiz definitions.
 *
 * ⚠️ Maps are PER ANGLE. The same key means different things in different
 * quizzes -- `barrier` is a multiple-choice grievance in A1 and a numeric count
 * elsewhere -- so a flat merge across all fifteen produces a map that is
 * confidently wrong. Found on 2026-08-13 when a merged map returned
 * {"0":"None...","1":"One","2":"Two"} for A1's barrier.
 *
 * Usage: node scripts/build-quiz-labels.js
 */
import { writeFileSync } from 'node:fs';
import { ANGLES } from '../q-index.js';

/* Quiz copy is written for the screen and contains em dashes. Email copy for Leo
   may not, and these strings get quoted straight into emails. Normalise here, at
   the boundary, rather than trusting every template to remember. */
const deDash = (s) => String(s).replace(/\s*[—–]\s*/g, ', ');

const out = {};
for (const [angle, spec] of Object.entries(ANGLES)) {
  const forAngle = {};
  for (const screen of spec.screens || []) {
    if (!screen.key || !Array.isArray(screen.options)) continue;
    const map = (forAngle[screen.key] ??= {});
    for (const opt of screen.options) {
      if (opt && opt.v !== undefined && opt.label) map[String(opt.v)] = deDash(opt.label);
    }
  }
  out[angle] = forAngle;
}

const path = new URL('../supabase/functions/_shared/email/labels.json', import.meta.url);
writeFileSync(path, JSON.stringify(out, null, 2) + '\n', 'utf8');

const keys = Object.values(out).reduce((n, a) => n + Object.keys(a).length, 0);
console.log(`wrote labels for ${Object.keys(out).length} angles, ${keys} keyed screens`);
