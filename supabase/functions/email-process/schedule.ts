/**
 * When each step is due, and whether it may send at all.
 *
 * Pure functions with the clock injected, so the whole scheduling story is
 * testable without waiting ten days.
 */

/** Day offsets, matching STEPS in _shared/email/templates.ts. */
export const DAYS = [0, 1, 2, 3, 5, 6, 8, 10];

/**
 * When the step AFTER `justSent` becomes due.
 *
 * Returns null when the sequence is finished, which is what tells the processor
 * to mark the enrollment done rather than parking it due-forever.
 */
export function nextDueAt(justSent: number, enrolledAt: Date): string | null {
  const next = justSent + 1;
  if (next >= DAYS.length) return null;
  const at = new Date(enrolledAt.getTime());
  at.setUTCDate(at.getUTCDate() + (DAYS[next] - DAYS[justSent]));
  return at.toISOString();
}

export interface SendGate {
  enabled: boolean;
  suppressed: boolean;
  status: string;
  alreadySent: boolean;
}

/**
 * Four independent reasons not to send. All of them are hard stops, and the
 * order does not matter because any one of them is sufficient.
 */
export function shouldSend(g: SendGate): boolean {
  if (!g.enabled) return false;      // the kill switch, off until gate 3
  if (g.suppressed) return false;    // unsubscribed, bounced or complained
  if (g.status !== 'active') return false; // cancelled by a purchase, or done
  if (g.alreadySent) return false;   // this step already has an email_sends row
  return true;
}
