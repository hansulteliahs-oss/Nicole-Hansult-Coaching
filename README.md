# Nicole Hansult Coaching

The live site at **[nicolehansultcoaching.com](https://nicolehansultcoaching.com)** — Next.js on Vercel. It replaced the Squarespace site; the DNS cutover is done, so anything merged to `main` reaches the public site.

It is both a marketing site and the delivery surface for two products: the **Vibrant40 Jumpstart** course and an **AI content pipeline** that drafts blog posts and newsletters for Nicole to approve from her phone.

## Status

**Live and in production.** `main` auto-deploys to the Vercel project `nicole-hansult-coaching`. 292 tests across 33 files.

## Stack

Next.js 15 (App Router, Turbopack) · React · TypeScript · Tailwind v4 · Supabase (Postgres, auth, RLS) · Stripe · Resend + react-email · Mailchimp · Mux · Vercel Blob · Sentry · Vitest

## Commands

```bash
npm run dev                     # local dev server
npm run typecheck               # tsc --noEmit
npm test                        # vitest, 292 tests
npm run build                   # production build
npm run verify:no-squarespace   # assert no Squarespace CDN URLs remain
npm run verify:phase-1          # phase-1 acceptance checks
```

Copy `.env.example` to `.env.local` and fill it in. `.env*` is gitignored — **this repo is public**, so never commit a real key.

## What's in here

**Marketing** — home, about, services (+ three-month coaching and Vibrant40 detail pages), testimonials, contact, booking, insights, and the legal pages.

**Lead magnet** — `/look-and-feel-good-naked` and its thank-you page. Opt-ins sync to Mailchimp with a "Free Guide" tag, non-blocking, `status_if_new` so opt-outs are never revived.

**Accounts** — Supabase auth: login, signup, password reset and set, `/account`. Gates the paid course.

**Vibrant40** — `/vibrant40`, `/vibrant40/welcome`, `/vibrant40/days/[slug]`. Stripe checkout at `/api/checkout`, fulfilment via `/api/webhooks/stripe`.

**Content pipeline** — the part that isn't obvious from the route names:

- `/idea` — passcode-gated intake writing to the `content_ideas` bank in Supabase.
- `/insights` and `/insights/[slug]` — the blog, rendered from the `posts` table, not from files.
- `/approve` and `/approve/batch` — where Nicole reads a draft and approves it. The page resolves the token server-side and renders the full draft above the button, so nothing is approved unseen. The draft's kind comes from the database, never the URL, so a tampered query param can't make the page show one thing and approve another. **Newsletters take two presses** — one approve tap otherwise sends to the full list (~1,110 people) with no recall.
- `/queue` — run log, scheduled sends, and the only cancel button.

Schema lives in `supabase/migrations/` (`001_submissions` → `004_pipeline_rebuild`). Migration 004 is applied to production.

## Copy conventions

The entry offer is the **Clinical Longevity Assessment** ($295, 75 minutes). Two dead variants keep resurfacing in older material — "Clinical Longevity **Evaluation**" and "**Comprehensive** Longevity Assessment". Neither is correct, and the acronym "CLE" must not appear in published copy; spell it out.

`docs/CONTENT-AUDIT.md` is the one deliberate exception. It is a verbatim record of what the old Squarespace site said, so it keeps that site's wording on purpose. Don't "fix" it.

Note that `/services/clinical-longevity-evaluation` survives as a **slug only** — `next.config.ts` 308s it to `/services`. That URL and the image filenames still carry the old word; renaming them is a routing decision, not a copy fix.

## Open items

Carried from `docs/superpowers/2026-08-28-content-pipeline-handoff.md` — **verify against production before relying on any of these being resolved:**

- **Nothing moves a `scheduled_sends` row from `queued` to `sent`.** `mark_sent` is only called from the single-newsletter path; a batch-scheduled campaign fires inside Mailchimp with no callback. After the first batch send, `/queue`'s "N queued" count is permanently wrong and the drift check has no ground truth. Needs a site-side reconciler or a Mailchimp webhook. **Close this before the first launch batch.**
- **`nicole_agent` is `NOLOGIN`** until `ALTER ROLE nicole_agent LOGIN PASSWORD '<from vault>'` runs. Every grant on the role is inert until then. Deliberately not automated.
- **Vercel Production env vars** — confirm `MAILCHIMP_FROM_NAME`, `MAILCHIMP_REPLY_TO` and `QUEUE_KEY` are set. `mailchimpConfig()` throws without the first two, which reaches Nicole as "the send failed and the draft was released" on every attempt. `/queue` answers a correct passcode with "Wrong passcode" until `QUEUE_KEY` exists — it fails closed, which is correct.

**Known non-defect:** `tests/db/` intermittently fails with `JWT issued at future` when the client's token is briefly ahead of Supabase's clock. `beforeAll` throws and the suite reports failed with its tests skipped. Re-running clears it.

## Docs

| Path | What it is |
|---|---|
| `docs/CONTENT-AUDIT.md` | Verbatim crawl of the old Squarespace site |
| `docs/decisions/log.md` | Decision log — pricing, geography, offer ladder |
| `docs/superpowers/plans/` · `specs/` | Content-pipeline rebuild plan and design spec |
| `docs/superpowers/2026-08-28-content-pipeline-handoff.md` | Deploy sequence and deferred items |
