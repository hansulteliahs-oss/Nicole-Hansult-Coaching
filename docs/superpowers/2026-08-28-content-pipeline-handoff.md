# Content pipeline rebuild — handoff

Branch `feat/content-pipeline-rebuild`, 22 commits, `d6f6f08..ecbb517`.
Full suite 292/292 across 33 files. **Not pushed, not merged, not deployed.**

Plan: `docs/superpowers/plans/2026-08-27-content-pipeline-rebuild.md`
Spec:  `docs/superpowers/specs/2026-08-27-content-pipeline-rebuild-design.md`

## State of the world right now

- **Migration `004_pipeline_rebuild.sql` IS applied to production** (project
  `vxtkdwjudzzgyssxhtin`). All 11 RPCs, the `nicole_agent` role, RLS policies
  and the `agent_grant_report()` security oracle are live.
- **The site code is NOT deployed.** `origin/main` is still `a9703af`, so
  production runs the old `/approve` that forwards to n8n.
- That split is safe and has been for the whole build: every schema change is
  additive or a widening, and n8n's `Claim Token` update touches neither
  `draft_id` nor `batch_id`.
- Production reconciles exactly to the pre-work baseline: 4 posts (3 published),
  8 approval_tokens, 4 newsletter_drafts, 0 content_plan / pipeline_runs /
  scheduled_sends, 16 content_ideas. No test residue.

## Deploy sequence — do these in order

1. **Set on Vercel Production:** `MAILCHIMP_FROM_NAME`, `MAILCHIMP_REPLY_TO`,
   `QUEUE_KEY`. `mailchimpConfig()` throws without the first two, which surfaces
   to Nicole as "the send failed and the draft was released" on every attempt.
   `/queue` answers a correct passcode with "Wrong passcode" until `QUEUE_KEY`
   exists (it fails closed, which is correct).
2. **Wait for the live approval token.** Newsletter `c723b64c`, unused, expires
   **2026-08-29 15:00:23 UTC**. Confirm `used = true` or past that timestamp
   before deploying.
3. **Merge and deploy.**
4. **Disable the n8n schedule triggers in the same sitting.** The one
   double-send path in the entire cutover is resuming that parked n8n execution
   by hand *after* the new route has already sent.
5. **Out of band, when ready:** `ALTER ROLE nicole_agent LOGIN PASSWORD '<from
   vault>'`. Until then the role is NOLOGIN and every grant on it is inert. This
   is deliberately not done by any agent — Handled OS task 169.

## Must close before the Sep 22 launch batch

**Nothing moves a `scheduled_sends` row from `queued` to `sent`.** `mark_sent`
is only called from the single-newsletter path; a batch-scheduled campaign fires
inside Mailchimp with no callback. After the first launch batch, `/queue`'s
"N queued" count is permanently wrong and decision 8's daily drift check has no
ground truth — every sent campaign looks like drift. The agent cannot repair it
(no write grant, no EXECUTE on `mark_sent`, correctly).

Fix is a site-side reconciler (cron reading Mailchimp campaign status, calling
`mark_sent`) or a Mailchimp webhook. Belongs in the agent-deployment plan.
**Not needed for the Sep 15 cutover**, which uses the single-send path.

## Known non-defect

`tests/db/` intermittently fails with `JWT issued at future` from Supabase — the
client's token is momentarily ahead of the server's clock, `beforeAll` throws,
and the suite reports failed with its tests SKIPPED (which is why it reads as
"1 failed / N passed"). Seen across three different test files, so it follows
the auth handshake, not any one test. Re-run clears it. Not caused by any code
in this branch. If it becomes annoying: retry the client construction in
`beforeAll`, or check NTP sync on the machine.

## Deferred, triaged by the final review

8 FIX-SOON, 9 ACCEPT-AS-IS, 0 must-fix-before-merge. Highest value first:

- **`approve_batch` TOCTOU on slug collision** (`004:331-337`) — one
  `pg_advisory_xact_lock` before the loop. Reachable only if the weekly and
  launch-batch runs overlap.
- **`agent_grant_report` USAGE row** — done in this branch (F13).
- **Migration 003's `token_hash` comment** says "sha256 of the emailed token";
  it stores the RAW token. Safe to correct in an applied file, and the raw-token
  fact is what the live approval token depends on.
- **`parsePostFaq` cap/dedupe** — done in this branch (F9).
- Full triage of all 17, plus the whole-branch findings, in
  `docs/superpowers/2026-08-28-content-pipeline-final-review.md`.

## Things verified against production, not inferred

- The agent **cannot** publish or send: EXECUTE granted on 5 staging RPCs,
  denied on all 6 site RPCs, 0 table write grants, cannot read `approval_tokens`.
- Root cause 1 is dead: a simulated Mailchimp failure returns the draft to
  `approved`, un-claims the token, and the same approval link works again.
- The link invariant rejects a no-link body and a Mailchimp-plumbing-only body,
  accepts a real link, and is not fooled by `evil-list-manage.com`.
- Nicole's Mailchimp footer links are **merge tags**, not URLs, so footer
  plumbing cannot masquerade as a real link at stage time.
