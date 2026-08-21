/*
 * Body-weight and height units, per market.
 *
 * ## Why display-only
 *
 * The quiz stores `p.weightLb`, `p.targetLb` and `p.heightIn`, and the app's plan
 * builder reads exactly those. So nothing here changes what is STORED: the slider
 * still moves in pounds and inches and still saves pounds and inches. Only the
 * number drawn on screen is converted, at the last moment, in one place.
 *
 * That is deliberate. Converting on input would mean the value written to
 * `p.weightLb` depends on the hostname, and a plan built from an Australian's
 * answers would differ from the same answers given in the US. The stored unit is
 * part of the data contract; the shown unit is presentation.
 *
 * ## What each market gets
 *
 *   US        pounds, feet and inches
 *   GB        stone and pounds, feet and inches  -- Britain weighs itself in
 *             stone and measures itself in feet, and has done throughout
 *             metrication. "75 kg" reads as foreign there; "11st 11" does not.
 *   AU CA NZ  kilograms and centimetres
 *
 * Canada is the arguable one: officially metric, but pounds survive in casual
 * speech. Kilograms is what appears on a Canadian medical form, so that is what
 * is used here. It is one line to change if the funnel data says otherwise.
 *
 * ## Rounding
 *
 * The slider steps in whole pounds, so a metric display moves 0.45 kg per step
 * and would jitter to two decimals if shown raw. Kilograms are rounded to whole
 * numbers, which means a single step sometimes leaves the number unchanged. On a
 * drag that is invisible, and it is much better than 74.84 -> 75.29.
 */
import { currentMarket } from './markets.js';

const LB_PER_KG = 2.2046226218;
const CM_PER_IN = 2.54;

/** Which system a market thinks in. */
const SYSTEM = { US: 'lb', GB: 'stone', AU: 'kg', CA: 'kg', NZ: 'kg' };

export function unitSystem() {
  const m = currentMarket();
  return SYSTEM[m && m.code] || 'lb';
}

export const isMetric = () => unitSystem() === 'kg';

/** 165 -> "165 lb" | "11st 11" | "75 kg". `bare` drops the unit word. */
export function showWeight(lb, bare) {
  const n = Math.round(Number(lb) || 0);
  switch (unitSystem()) {
    case 'kg': {
      const kg = Math.round(n / LB_PER_KG);
      return bare ? String(kg) : kg + ' kg';
    }
    case 'stone': {
      const st = Math.floor(n / 14);
      const rem = n - st * 14;
      /* "11st 11" reads the way it is said. A trailing "lb" is redundant next to
         "st" and makes the slider value too wide on a 375px screen. */
      return st + 'st' + (rem ? ' ' + rem : '');
    }
    default:
      return bare ? String(n) : n + ' lb';
  }
}

/** The unit word alone, for a label sitting beside a number. */
export function weightUnit() {
  return { kg: 'kg', stone: '', lb: 'lb' }[unitSystem()];
}

/** 65 -> "5'5\"" | "165 cm". */
export function showHeight(inches, fmtFeet) {
  const n = Math.round(Number(inches) || 0);
  if (isMetric()) return Math.round(n * CM_PER_IN) + ' cm';
  return fmtFeet ? fmtFeet(n) : Math.floor(n / 12) + "'" + (n % 12) + '"';
}

/** 0.7 -> "0.7 lb a week" | "0.3 kg a week". Stone markets still say pounds
 *  for a RATE -- nobody loses weight at "0.05 stone a week". */
export function showRate(lbPerWeek) {
  if (!isMetric()) return lbPerWeek + ' lb a week';
  const kg = Math.round((lbPerWeek / LB_PER_KG) * 10) / 10;
  return kg + ' kg a week';
}

/** "22 lb" / "10 kg" for a difference, where stone is wrong -- a 22 lb loss is
 *  "a stone and a half" in speech, but the number has to stay legible. */
export function showDelta(lb) {
  const n = Math.round(Number(lb) || 0);
  if (isMetric()) return Math.round(n / LB_PER_KG) + ' kg';
  return n + ' lb';
}
