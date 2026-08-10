/*
 * All fifteen, merged, and the picker that chooses between them.
 *
 * Each ad links with ?a=A7. An untagged or unrecognised link falls back to A3,
 * the broadest angle, rather than rendering nothing -- a mistyped UTM should
 * still sell.
 */
import { ANGLES as SET1 } from './q-all.js';
import { SET2 } from './q-set2.js';
import { SET3 } from './q-set3.js';

export const ANGLES = { ...SET1, ...SET2, ...SET3 };
export const DEFAULT_ANGLE = 'A3';

export function pickAngle(search) {
  const m = /[?&]a=([a-z0-9]+)/i.exec(search || '');
  const key = m ? m[1].toUpperCase() : null;
  return (key && ANGLES[key]) ? key : DEFAULT_ANGLE;
}
