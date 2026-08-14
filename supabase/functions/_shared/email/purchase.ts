/**
 * The buyer confirmation email.
 *
 * This closes a gap the launch-readiness audit has carried open since
 * 2026-08-06: Stripe sends a receipt, but nothing told the buyer how to get
 * into the thing they just paid for. `install.html` was the only route in, and
 * it was reachable only by not closing the tab after checkout.
 *
 * Three jobs, in this order:
 *   1. Confirm the money landed and say exactly what they bought.
 *   2. Get them into the app. Install steps for both platforms, because we
 *      cannot detect the device from an email.
 *   3. Give them a human. A one-time purchase with no subscription still needs
 *      somewhere to send a bug report, and "reply to this email" beats any
 *      help centre we do not have.
 *
 * Deliberately NOT part of the nurture sequence. That flow sells; this one is
 * transactional, goes to somebody who has already paid, and must never be
 * blocked by an unsubscribe from marketing.
 */
import { renderHtml, renderText, POSTAL, type LayoutInput } from './layout.ts';

export const APP_URL = 'https://app.dayspine.com/';
export const SUPPORT = 'support@dayspine.com';

/** Human names for the catalogue slugs, so the receipt reads as English. */
const NAMES: Record<string, string> = {
  core: 'Dayspine, lifetime access',
  'printed-plan': 'The Printed Plan',
  'partner-seat': 'Partner Seat',
  'grocery-pro': 'Grocery Pro',
};

export function purchaseEmail(opts: { email: string; items?: string[] }): {
  subject: string;
  html: string;
  text: string;
} {
  const bought = (opts.items ?? ['core']).map((s) => NAMES[s] ?? s);
  const extras = bought.filter((b) => b !== NAMES.core);

  const paragraphs = [
    'Your payment went through and your account is ready. Thank you, genuinely.',
    `You bought ${bought.join(', ')}. It is yours permanently. Nothing renews, there is no subscription, and there is nothing to cancel later.`,

    'One step left, and it takes about ten seconds: put Dayspine on your home screen.',

    `Open ${APP_URL} on your phone and sign in with this email address, ${opts.email}. That address is your access, so use the same one here.`,

    'On an iPhone: open that link in Safari specifically, tap the Share button at the bottom, then "Add to Home Screen", then "Add". Chrome and Firefox on iPhone cannot add an app to the home screen, only Safari can.',

    'On Android: open the link in Chrome, tap the three dots in the top right, then "Install app" or "Add to Home screen".',

    'It then opens full screen like any other app and works offline. You can install it on as many of your own devices as you like.',

    `If anything is broken, confusing, or just not what you expected, reply to this email. It reaches me, not a helpdesk. You can also write to ${SUPPORT}.`,

    'And if it is not for you, you have 30 days. Email me and I will refund you in full, no argument.',
  ];

  const input: LayoutInput = {
    preheader: 'Your account is ready. One step to put it on your home screen.',
    paragraphs,
    cta: 'Open Dayspine',
    unsubUrl: '',
  };

  /* The offer button in the shared layout points at the paywall, which would be
     absurd here: this reader has already bought. Repointed at the app, and the
     marketing unsubscribe footer is replaced with a transactional one, because
     a receipt is not something you opt out of. */
  const html = renderHtml(input)
    .replace(/href="https:\/\/quiz\.dayspine\.com\/paywall\.html"/g, `href="${APP_URL}"`)
    .replace(
      /You gave us your email when you built your plan at dayspine\.com\.<br>[\s\S]*?<br>/,
      `You are receiving this because you bought Dayspine. This is a receipt, not marketing.<br>`,
    );

  const text = renderText(input)
    .replace(/https:\/\/quiz\.dayspine\.com\/paywall\.html/g, APP_URL)
    .replace(/You gave us your email when you built your plan at dayspine\.com\./,
      'You are receiving this because you bought Dayspine. This is a receipt, not marketing.')
    .replace(/Unsubscribe: .*/, POSTAL);

  return { subject: 'You are in. Here is how to open Dayspine', html, text };
}
