/**
 * The email shell.
 *
 * Deliberately plain. This is a founder writing to somebody who filled in a
 * quiz two days ago, and it has to look like that in the inbox: one column,
 * system fonts, no hero image, no logo bar, no web fonts, no tracking pixel.
 *
 * That is also the single cheapest deliverability lever available. A brand-new
 * subdomain sending image-heavy templated HTML to a cold list is the exact
 * profile filters are tuned for. Text-forward mail from a real person with a
 * real reply-to is not.
 */

export const OFFER_URL = 'https://quiz.dayspine.com/paywall.html';

/**
 * From and reply-to are DIFFERENT addresses, and that is deliberate.
 *
 * `send.dayspine.com` is an outbound-only subdomain. Its MX points at Amazon
 * SES's bounce host, not at a mailbox, so nothing sent to `leo@send.dayspine.com`
 * reaches a human: it bounces. Every one of these emails says "reply to this and
 * it reaches me", so the reply-to has to be an address that actually receives.
 *
 * `support@dayspine.com` is a real Microsoft 365 mailbox, and it is the address
 * already printed on the paywall for refunds.
 */
export const FROM = 'Leo at Dayspine <leo@send.dayspine.com>';
export const REPLY_TO = 'support@dayspine.com';

/** CAN-SPAM requires a real postal address on commercial mail. */
export const POSTAL = 'Exotix creators LLC, 30 N Gould St, Sheridan, WY 82801';

export interface LayoutInput {
  /** The inbox preview line. Never a repeat of the subject. */
  preheader: string;
  /** Body paragraphs, already personalised. Plain strings, no markup. */
  paragraphs: string[];
  /** The button label. Every email has one; every email sells. */
  cta: string;
  unsubUrl: string;
}

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function renderHtml({ preheader, paragraphs, cta, unsubUrl }: LayoutInput): string {
  const body = paragraphs
    .map((p) => `<p style="margin:0 0 18px;font-size:16px;line-height:1.6;color:#1a1613">${esc(p)}</p>`)
    .join('\n      ');

  return `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#ffffff">
  <span style="display:none;font-size:1px;color:#ffffff;max-height:0;overflow:hidden">${esc(preheader)}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff">
    <tr><td align="center" style="padding:28px 16px">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%">
        <tr><td style="font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
      ${body}
      <p style="margin:26px 0 30px">
        <a href="${OFFER_URL}" style="background:#F26A11;color:#ffffff;text-decoration:none;font-weight:700;font-size:16px;padding:14px 26px;border-radius:999px;display:inline-block">${esc(cta)}</a>
      </p>
      <p style="margin:0 0 6px;font-size:16px;line-height:1.6;color:#1a1613">Leo</p>
      <p style="margin:0 0 22px;font-size:14px;line-height:1.6;color:#6b625a">I built Dayspine. Reply to this and it reaches me, not a helpdesk.</p>
      <hr style="border:0;border-top:1px solid #e8e2dc;margin:0 0 14px">
      <p style="margin:0;font-size:12px;line-height:1.6;color:#8a8079">
        You gave us your email when you built your plan at dayspine.com.<br>
        <a href="${unsubUrl}" style="color:#8a8079">Unsubscribe</a> and you will not hear from me again.<br>
        ${esc(POSTAL)}
      </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

export function renderText({ paragraphs, cta, unsubUrl }: LayoutInput): string {
  return [
    ...paragraphs,
    `${cta}: ${OFFER_URL}`,
    '',
    'Leo',
    'I built Dayspine. Reply to this and it reaches me, not a helpdesk.',
    '',
    '---',
    'You gave us your email when you built your plan at dayspine.com.',
    `Unsubscribe: ${unsubUrl}`,
    POSTAL,
  ].join('\n\n');
}
