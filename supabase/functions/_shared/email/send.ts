/**
 * The Resend sender.
 *
 * Never throws. The processor advances a lead past a failed step rather than
 * retrying forever, so a thrown error here would turn a transient Resend blip
 * into a stuck enrollment. Failures come back as data.
 */
import { FROM, REPLY_TO } from './layout.ts';

export interface SendInput {
  to: string;
  subject: string;
  html: string;
  text: string;
  unsubUrl: string;
}

export interface SendPayload {
  from: string;
  reply_to: string;
  to: string[];
  subject: string;
  html: string;
  text: string;
  headers: Record<string, string>;
}

/**
 * Split out from the network call so the shape is testable without sending.
 *
 * `List-Unsubscribe-Post` is not optional. Gmail and Yahoo's bulk sender rules
 * require one-click unsubscribe, and its absence alone is enough to get a new
 * sender bulk-foldered.
 */
export function buildPayload({ to, subject, html, text, unsubUrl }: SendInput): SendPayload {
  return {
    from: FROM,
    reply_to: REPLY_TO,
    to: [to],
    subject,
    html,
    text,
    headers: {
      'List-Unsubscribe': `<${unsubUrl}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    },
  };
}

export async function sendEmail(
  input: SendInput,
  apiKey: string,
): Promise<{ ok: boolean; id?: string; error?: string }> {
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(buildPayload(input)),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: `${res.status} ${JSON.stringify(body).slice(0, 200)}` };
    return { ok: true, id: body.id };
  } catch (e) {
    return { ok: false, error: String(e).slice(0, 200) };
  }
}
