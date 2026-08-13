# Dayspine — the post-quiz lead email sequence

*Design, 2026-08-13. Status: awaiting Leo's review.*

## The problem

22 leads have finished the quiz and given an email. **Not one has ever received a single
message.** There is no email infrastructure in the project at all: 7 edge functions, none of
them for mail. Every one of those leads answered ~25 questions, saw a $49 price, and left, and
we have never spoken to them again.

The launch-readiness audit has carried "no branded confirmation email" as an open gap since
2026-08-06. This closes it and builds the sequence on top.

## Goals

1. Reach every completed lead with 8 emails over 10 days, each personalised from their own quiz
   answers, and **each one selling.**
2. Land in the inbox, not spam, from a domain that has never sent mail.
3. Ship behind three gates: build, test on Leo, then publish.

## Non-goals

- No app changes. Leo's standing instruction (2026-08-10): don't touch the app until something
  works before the paywall.
- No meal-solver port. See "What we deliberately are not building".
- No post-purchase or upsell flows yet. Lead nurture only.
- No feature-gated upsell tiers. Parked by Leo, 2026-08-13, until the proof of concept sells.

---

## 1. Deliverability

### The finding that forces the design

```
dayspine.com   SPF    v=spf1 include:secureserver.net -all
dayspine.com   MX     dayspine-com.mail.protection.outlook.com    <- Microsoft 365
_dmarc         v=DMARC1; p=quarantine; adkim=r; aspf=r
```

The root domain authorises GoDaddy and **not** Microsoft 365, while its MX points at Microsoft
365, and it ends in `-all` (hard fail) under a `p=quarantine` policy. The root domain is already
misconfigured for its own mail.

### Decision: send from `send.dayspine.com`, never the root

| Reason | |
|---|---|
| Reputation isolation | Marketing volume cannot damage the mailbox `support@dayspine.com` uses for refunds |
| Blast radius | The 9 M365 records on the root stay untouched. The funnel-domain work already had to protect these |
| Independent warmup | A new subdomain starts with no history, which is correct for a new sender |

DMARC relaxed alignment (`adkim=r`, `aspf=r`) means a subdomain sender still aligns with the
org-level policy, so we inherit `p=quarantine` without extra work. During warmup we set
`_dmarc.send.dayspine.com` to `p=none` so early failures are reported rather than silently
quarantined, then tighten to `quarantine` once passing cleanly.

DNS goes in at GoDaddy via their API, using the same scoped-PUT technique proven on 2026-08-06
when the funnel CNAME was added (26 -> 27 records, all 9 mail records intact). **Read the full
record set, append, PUT the whole set back.** GoDaddy's API replaces the entire record type on
PUT, so a naive write destroys the mail records.

### Required on every send

- **One-click unsubscribe**: `List-Unsubscribe` plus `List-Unsubscribe-Post: List-Unsubscribe=One-Click`.
  Mandatory under Gmail and Yahoo bulk-sender rules. Its absence alone can bulk-folder us.
- **Text-forward HTML.** One column, system fonts, no image-only content, no tracking-pixel-only
  bodies. A real `text/plain` alternative on every message.
- **Real reply-to** at a monitored mailbox. Replies are the strongest positive engagement signal
  there is.
- **Physical address and an unsubscribe link in the footer** (CAN-SPAM).
- **Suppression is absolute**: unsubscribe, bounce and complaint write to `email_suppressions`
  and every send checks it first.

### Warmup

Volume is trivially small (22 leads, ~8 sends each). No formal ramp schedule is needed. The
sequencing gate does the work: Leo's own address first, then the real list.

---

## 2. Data model

Four tables, mirroring the Funnel Engine shape that already works in production.

| Table | Holds |
|---|---|
| `email_enrollments` | one row per lead per flow: `email`, `flow`, `step`, `next_due_at`, `status` |
| `email_sends` | one row per attempted send: `enrollment_id`, `step`, `resend_id`, `status`, `error` |
| `email_suppressions` | `email`, `reason` (`unsubscribed` / `bounced` / `complained`), `created_at` |
| `email_events` | Resend webhook callbacks: delivered, opened, clicked, bounced, complained |

RLS on with **no policies** on all four, service role only. Same posture as `events`, and for the
same reason: these tables hold raw email addresses.

Templates live **in code**, not in a table. FE keeps them in the database and pays for it with a
deploy/edit split; here there is one flow and copy changes are code review, which is what we want
while the copy is still being tuned.

---

## 3. Trigger and processing

### Enrollment fires on the COMPLETION write, not the email write

`save-quiz` is called twice: at the email screen (`complete=false`) and at the build screen
(`complete=true`). Enrollment happens on the second.

This is the structural reason the day-0 email can say "your plan is ready" and always be telling
the truth. It also means no copy variant is needed for abandoners.

Evidence it is the right trigger: since the campaign went live on 2026-08-12, **17 of 17 leads are
`complete=true`**. The only two `complete=false` rows in the table are our own test addresses from
10 and 11 August, both holding a full 25 to 27 answers, and both artifacts of the save-quiz race
fixed by the monotonic trigger on 2026-08-11. Real abandonment at that point in the quiz does not
happen, because the email screen is the second-to-last screen.

### Cancellation

The Stripe webhook cancels any active enrollment on purchase. Nobody who has bought keeps getting
sold to. This is a correctness requirement, not a nicety: the sequence argues about price.

### Processing

`email-process` edge function, invoked by Supabase cron every 5 minutes. It selects enrollments
where `next_due_at <= now()` and `status = 'active'`, renders the step, sends via Resend, writes
`email_sends`, advances `step` and `next_due_at`.

**Advance-on-failure.** If Resend errors, the enrollment advances anyway and the failure is logged.
FE learned this the hard way: retrying forever parks a customer on a broken step permanently.

**A disabled kill switch ships first.** The flow row carries `enabled = false` until gate 3. The
processor is deployed and cronned from day one but sends nothing, so the whole pipeline is
exercised before a single real message goes out.

---

## 4. The targets port

Port `energy.ts`, `calorieTarget.ts` and `targets.ts` from `dayspine-pwa/src/domain` into
`supabase/functions/_shared/targets.ts`.

**292 lines, fully self-contained**: `energy.ts` imports nothing, `calorieTarget.ts` imports only
`energy.ts`, `targets.ts` imports both. No React, no Expo, no browser APIs. Deno runs TypeScript
natively, so this is a copy plus rewriting `@/` aliases to relative paths.

This gives every email the lead's **real** calorie number, protein and macros, computed by the
same code the app will use. That is what makes "your plan is ready" concrete rather than a claim.

Drift is the known risk, and the codebase already has the pattern for it: a test asserts the ported
copy produces identical output to the app's for a fixed set of profiles, the same way
`stripeCatalogue.test.ts` asserts the two catalogue copies stay equal.

### What we deliberately are not building

The full meal solver (`mealPlan.ts` 945 lines, `groceryList.ts`, `foods.ts`, `foodCost.ts`,
`packaging.ts`, `budgetMode.ts` — 2,499 lines) stays in the app.

An earlier draft of this design gave the grocery list away free in email 1, which would have
required porting all of it plus a plan-rendering page. **Leo's reframing of email 1 as a
confirmation removed that entire branch of work.** We are telling them the plan is ready and
selling access to it, not shipping the deliverable for free.

---

## 5. The sequence

Founder voice, first person, from Leo. Reply-to is real. Every email ends in the ask; what varies
is which objection each one clears.

| # | Day | Frame | Objection cleared | Personalised from |
|---|---|---|---|---|
| 1 | 0 | **Your plan is ready.** What was built, their real numbers, the outcome | "did anything actually happen" | kcal, protein, diet, household, cook nights |
| 2 | 1 | What a week on it actually looks like | "what am I even buying" | cook nights, cook time, training days, location |
| 3 | 2 | Why the last plan died. Their own stated barrier, quoted back | "I won't stick to it" | `barrier`, `listhow`, `sunday` |
| 4 | 3 | Buy it once, not rented forever | "another subscription" | see the coverage note below |
| 5 | 5 | A real instructor, real classes, not AI slop | "is this AI slop" | pilates interest, training location |
| 6 | 6 | The grocery list nobody else writes | "meal plans never help me" | weekly budget, store, household size |
| 7 | 8 | $49, head-on | price | goal, target, pace |
| 8 | 10 | Last call | inertia | goal |

Eight sends across ten days, with gaps. Daily mail from a brand-new subdomain to a 22-person list
is how a sender gets filtered.

### Personalisation coverage, measured

Personalisation must be built on fields we actually hold, not on fields the quiz *can* collect.
Measured across all 22 leads:

| Field | Coverage | Usable as |
|---|---:|---|
| `barrier` | **22/22** | the spine of the sequence. Their own words on why it failed last time |
| `p.weeklyBudget` | **21/22** | grocery framing, the day-6 email |
| `p.goal`, `p.diet`, `p.allergens`, `p.children`, `p.otherAdults` | 21/22 | plan shape, day 1 and 2 |
| `p.age`, `p.sex`, `p.weightLb`, `p.heightIn`, `p.targetLb`, `p.pace` | 14/22 | the derived calorie and macro numbers |
| `x.cookNights`, `x.cookTime`, `x.store` | 15/22 | the week's shape |
| `p.location`, `p.daysPerWeek`, `p.focus`, `p.pilates` | 10/22 | training emails |
| **`p.appSpend`** | **0/22** | ⛔ **do not use** |

🔴 **`p.appSpend` is collected only on A2 and A14**, and no lead has arrived from either angle.
An earlier draft of the day-3 email anchored on "your monthly app spend, multiplied out", which
would have silently fallen back to a category median for every single lead: a generic figure
presented as if it were theirs. That is worse than not personalising, because it is the one thing
a reader can catch us doing.

**Day 3 instead follows the pattern `paywall.html` already uses and reasons about:** if the number
is present, it is theirs and we say so; if it is absent, the frame flips from *"what you told us
you spend"* to *"what four apps would cost you"*, stated openly as a category figure. The paywall
does exactly this via its `SPEND` map with a median fallback and a swapped label. Same logic,
same honesty.

**General rule: every merge field needs a defined absent-branch, and the absent-branch must never
pretend the number is theirs.** Coverage is re-measured before gate 3, since the mix shifts as
Meta funds new angles.

### Copy standards

- **No em dashes.** Standing rule.
- Direct, no fluff, conversational but authoritative.
- Written-for-text, not spoken.
- Every claim must be product-true against the shipped tree. The claim inventory in
  `ad-angles-master.md` §1 is the allowed list. Nothing about HealthKit, wearables, hormones, or a
  searchable branded-food database.
- Prices: **$49 core, $99 anchor, $9 bump, $39 upsell, $29 downsell.**
- Copy is written through the audit loop against `03_avatar_painpoints.md` (14,169 US documents),
  not drafted once.

---

## 6. The three gates

### Gate 1 — build
DNS, tables, port, processor, templates, Resend webhook. `enabled = false`. Nothing can send.
Unit tests cover: suppression blocks a send, purchase cancels an enrollment, a Resend failure
advances rather than parks, the ported targets match the app's.

### Gate 2 — test on Leo
Leo is enrolled at **leoboxe15@gmail.com** with a real completed quiz row, and receives all 8 on a
compressed schedule (minutes apart, not days). A seed Outlook address is enrolled alongside him,
because Outlook is where M365 sender confusion would surface and Leo's own address cannot show it.
Verified:
- SPF, DKIM and DMARC all `pass` in the raw received headers, checked on a real delivered message
- Inbox placement in **Gmail and Outlook** specifically, since Outlook is where M365 sender
  confusion would show
- One-click unsubscribe works from the real client, and writes a suppression
- Personalisation matches his real quiz answers, field by field
- Review page at `Downloads/Dayspine-Emails/` with a feedback box per email

### Gate 3 — publish
Only on Leo's explicit go. `enabled = true`, and the 22 existing leads are backfilled into the
flow at step 0.

> **Standing rule, from the Funnel Engine docs:** *never send emails to customers without Leo's
> explicit approval. Not for testing, not for backfilling, not for any reason.* Gates 1 and 2 send
> only to seed addresses.

---

## 7. Open items

- **Resend account for Dayspine.** FE's key lives in FE's Supabase (`gdxwsnpyleluoiznybeu`), which
  is off-limits from Dayspine work. Dayspine needs its own key and its own verified domain.
- **The reply-to mailbox does not exist.** `support@dayspine.com` is promised on the paywall for
  refunds and has never been created on M365. Blocks gate 3, not gate 1.
- **The root-domain SPF is broken independently of this project.** It omits Microsoft 365 while the
  MX points there, so mail from `support@dayspine.com` hard-fails into `p=quarantine`. Worth fixing
  in the same DNS pass. Flagged, not assumed.
