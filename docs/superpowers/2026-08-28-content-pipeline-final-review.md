# Final whole-branch review: content pipeline rebuild (d6f6f08..52c49a6)

Reviewer: senior code review, whole-branch pass. Read-only. No DB touched, no suite run.

## Verdict

**Merge readiness: Ready with conditions.** No critical defect. Two env vars and the live-token gate must be settled before deploy, and five Important items should be fixed before the launch batch is trusted.

---

## What Is Solid

**The grant split is real, not asserted.** Migration 004 section 7 gives `nicole_agent` schema USAGE, `SELECT` on six tables, and `EXECUTE` on exactly five RPCs. Every site RPC carries an explicit `REVOKE ... FROM PUBLIC, anon, authenticated, nicole_agent` at creation (`004_pipeline_rebuild.sql:663,717,751,787,836,875`), and `REVOKE ALL ON public.approval_tokens FROM nicole_agent` (`004:498`) closes the "approve your own work" path. The role has no membership in another role and is not in Supabase's default-privilege target list, so nothing leaks in sideways. The spec's first non-negotiable property is true of the code.

**Token claim atomicity holds everywhere.** `approve_and_publish` (`004:640-651`), `claim_for_send` (`004:710-711`) and `approve_batch` (`004:822-826`) each pair the state change and `used = true` inside one function body, so they share a transaction by construction rather than by care. `release_for_retry` (`004:775-779`) gates the un-claim on `IF FOUND` from the draft revert, so the token and the draft cannot diverge. Root cause 1 is genuinely closed.

**The send-failure split in `/api/approve` is the best judgment call in the branch.** `app/api/approve/route.ts:95-175`: `sendAttempted` is set immediately before the send await, release fires only on pre-send failures, and an ambiguous send holds the draft in `sending`, writes a forensics row and returns a 502 telling the operator to check Mailchimp first. The comment at `route.ts:106-109` tells the next reader exactly why the line placement is load-bearing. This is the correct answer to a genuinely hard problem and it is covered by three separate tests.

**The error-handling sweep is essentially complete.** Every `admin.rpc(...)` and every mutating `admin.from(...)` on the branch checks `{ error }`. `app/api/approve/batch/route.ts:96` and `:118`, `route.ts:122,159,182`, `lib/actions/queue.ts:80,131`, `lib/content/batch.ts:40,58`, `lib/content/approvals.ts:74,101,125`. One benign read is unchecked; see Minor 5. That is the whole remainder.

**PostgREST shape discipline is uniform across all 11 RPCs.** `RETURNS TABLE` and `SETOF` are read as arrays at `route.ts:55`, `route.ts:77`, `batch/route.ts:52`, and throughout `tests/db/site-rpcs.test.ts`. Bare composite returns are read as objects at `tests/db/agent-rpcs.test.ts:43-60,102-140` and `lib/actions/queue.ts:126`. There is no `data.x` anywhere that should be `data[0].x`. Zero drift across twelve tasks written by twelve agents is the single most impressive thing about this branch.

**`cancelScheduledSendAction` gets the ordering right and says why.** `lib/actions/queue.ts:113-134` unschedules in Mailchimp first, writes the row second. The one ordering that produces a row saying "cancelled" about a campaign that is still armed is the one it refuses to take.

**`createCampaign`'s segment guard.** `lib/mailchimp/campaigns.ts:112-126` tests presence rather than truthiness, then rejects empty and whitespace explicitly because `Number('')` is `0` and passes `isInteger`. That is precisely the trap the spec documents (Sugar Cravings exists as both a 150-member list and a 127-member segment) and it is closed with a regression test.

**FAQ reuse is clean.** `lib/content/postFaq.ts` parses into the site's existing `Faq` shape, so `app/insights/[slug]/page.tsx:64,86,104` and `app/approve/DraftPreview.tsx:119-120` feed the same `faqPageSchema()` and the same `<FaqSection />` that `/services` uses. One shape, one schema builder. The FAQ also renders in the approval preview, so adding the field did not quietly make "nothing ships unseen" false.

**Route-level test coverage is real.** `tests/api/approve.test.ts` covers publish, double tap, expiry, send, `mark_sent` failing after a real send, already-claimed, pre-send release from both `createCampaign` and `setCampaignContent`, and the ambiguous hold. These are the branches that matter.

---

## Findings

### Critical (do not merge)

None.

### Important (fix before production trust)

**I1. The `/approve/batch` "used" gate contradicts the batch route's retry-safe design.**
`lib/content/batch.ts:49` rejects any used token, and `app/approve/batch/page.tsx:53-61` renders "These are already approved. Nothing more to do here. The emails are scheduled."

`approve_batch` claims the token on the first press but always returns the full batch, and `app/api/approve/batch/route.ts:130` tells the operator "Press again to finish the rest." That retry only works if Nicole never refreshes. The moment she does, the page tells her the emails are scheduled when three of five may be. The one message she must be able to trust is the one that can be false.

Fix: on `used`, load the drafts anyway and render `BatchClient` when any draft lacks `mailchimp_campaign_id`, with copy that says how many still need scheduling. Reserve the "all done" message for the case where every draft carries a campaign id.

**I2. The undated-draft check burns the token before it runs.**
`app/api/approve/batch/route.ts:57-65` returns 422 when a draft has no `scheduled_for`. By then `approve_batch` (`004:817-827`) has already claimed the token and flipped every draft to `approved`. One missing send time burns the batch token and schedules nothing, and I1 then blocks the recovery. This is the shape of root cause 1 reappearing one level up: the authorisation is consumed before the thing it authorises is known to be possible.

Fix, cleanest first: read the batch with the same select `resolveBatchToken` uses, validate `scheduled_for` on every row, and only then call `approve_batch`. Alternative: move the check into `approve_batch` as a `RAISE` before the `UPDATE`, which also makes the invariant a database fact rather than a route fact, consistent with property 4.

**I3. Nothing ever moves a `scheduled_sends` row from `queued` to `sent`.**
The only writer is `mark_sent` (`004:745-747`), and `mark_sent` is only ever called from the single-newsletter path at `app/api/approve/route.ts:177`. A batch-scheduled campaign fires inside Mailchimp with no callback into this system, so its row stays `queued` forever and its draft stays `approved` forever.

Consequences: `/queue`'s "N queued" count (`app/queue/QueueClient.tsx:95`) is permanently wrong after the first launch batch, and the daily drift check that decision 8 rests on has no ground truth to compare against. Every already-sent campaign looks like drift. The agent cannot repair this: it has no write grant and no `EXECUTE` on `mark_sent`, correctly.

This does not block the Sep 15 cutover, which uses the single-send path. It must be closed before the Sep 22 launch batch. Either a site-side reconciler (a cron reading Mailchimp campaign status and calling `mark_sent`) or a Mailchimp webhook. Worth deciding now, because it belongs in the agent plan's scope discussion.

**I4. The batch approval page never shows Nicole who each email goes to.**
`lib/content/batch.ts:54` does not select `list_id` or `segment_id`, and `app/approve/batch/page.tsx:72-90` does not render them. Decision 11 has launch emails targeting tags, and the spec records that sending to the wrong Sugar Cravings audience is silent. Property 5 says nothing ships unseen, and the audience is part of what ships. `createCampaign` guards the *format* of a segment id; nothing guards the *choice*.

Fix: select both, render the audience line above each body alongside the send time, with a human label where one is known.

**I5. `tests/db/site-rpcs.test.ts` publishes probe posts to the client's live blog.**
`tests/db/site-rpcs.test.ts:82-93` stages a post via `stagePost` (title `probe`, body `body`) and then calls `approve_and_publish`, which sets `status = 'published'` on a real row in the production `posts` table. The RLS policy "published posts are public" makes it anon-readable for the life of the run, and `afterAll` at `tests/db/site-rpcs.test.ts:75-80` is the only cleanup. An interrupt, a crash, or the known `JWT issued at future` flake leaves a post titled "probe" live on `/insights`.

The plan's Global Constraints make `pnpm test` the pre-commit command, so this runs on every commit. "The DB suites hit production" was an accepted posture for this build; publishing content to the client's public site is a step past that and should not stay accepted.

Fix, cheapest first: move cleanup into a per-test `finally` so the exposure window is one test rather than the whole file, and add a `beforeAll` sweep deleting `posts` where `slug LIKE 'site-rpc-%'` so a prior crash self-heals. Better, and worth doing before the agent plan adds more DB suites: point `tests/db/` at a Supabase branch.

### Minor

**M1.** `app/approve/ApproveClient.tsx:6` says the POST goes to `/api/approve` "(which resumes the n8n workflow)". It calls the site RPCs now. The comment lies about the code beneath it.

**M2.** `lib/content/posts.ts:7-9` says "On publish, n8n calls /api/revalidate which runs revalidateTag('blog') + the per-slug tag". `/api/approve` revalidates in-process at `route.ts:62-65`. Same class of lie, and this one sits in the file a new reader opens first.

**M3.** `app/api/revalidate/route.ts:2` says "called by n8n on publish". Nothing calls it now. Either keep it as a deliberate manual escape hatch and say so in the comment, or delete it along with `REVALIDATE_SECRET` at `.env.example:48`. Leaving it undocumented is how a secret survives past its purpose.

**M4.** `.gitignore` lists `.superpowers/` twice, at lines 51-52 and 53-54, each under its own comment. Drop one.

**M5.** `app/api/approve/route.ts:88` is the only unchecked `{ error }` left on the branch. It fails soft (the campaign loses its preview line) so it does not need a status change, but it should log. One line.

**M6.** `tests/db/nicole-agent-grants.test.ts:95-99` asserts `.not.toBe(true)` on the six site RPCs. That was correct while Tasks 6 and 7 were unwritten; all six exist now, so it should be `toBe(false)`. As written, a report row that goes missing passes vacuously, because `find()` returns `undefined` and `undefined?.granted` is `undefined`. The comments at lines 10-12 and 97 also still describe the unfinished state.

**M7.** `supabase/migrations/003_content_pipeline.sql:96` comments `token_hash` as "sha256 of the emailed token". It stores the raw token. This is the first thing a reader hits and the fact is load-bearing for the live token. Comments in an applied migration are not re-executed, so correcting it is safe. (This is deferred item 5; it is worth doing now, not later, precisely because of the live token.)

**M8.** The Definition of done says `grep -rn "N8N_RESUME_WEBHOOK_URL" --include="*.ts" --include="*.tsx" .` returns nothing. It returns `app/api/approve/route.ts:4`, a historical comment. Harmless, but either reword the comment or tick the box with the note, rather than leaving a checklist item that reads as failing.

**M9.** `004:433-436` looks up an existing batch token with no lock, so two concurrent `stage_newsletter_draft` calls under one `batch_id` could mint two tokens. Not reachable today (staging is sequential) and `token_hash` is the primary key so neither row is corrupt, but `lib/content/batch.ts` and the tests query `approval_tokens` by `batch_id` with `.single()`, which would then throw.

**M10.** `claim_for_send` (`004:696-711`) does not require the draft to be in `draft` or `approved`. A row sitting in `failed` would be moved to `sending`. No current caller can reach it, since the page gates on the token.

---

## Deferred-Minor Triage

1. **Probe inserts not pushed to the cleanup array** (`tests/db/pipeline-rebuild-schema.test.ts:288-306`) — **ACCEPT-AS-IS.** Only fires when the constraint under test has already regressed; the leaked row is an inert token with a 2099 expiry.
2. **Later `it` blocks read state written by earlier ones** — **ACCEPT-AS-IS.** `vitest.config.ts:15` pins `shuffle: false, concurrent: false` explicitly for exactly this reason.
3. **TOCTOU race in the slug collision loop** (`004:331-337`) — **FIX-SOON.** The spec plans for a weekly run and a launch-batch run in the same week, which is when overlap becomes reachable, and the fix is one `pg_advisory_xact_lock(hashtext(v_base))` before the loop.
4. **`vitest.config.ts` comment scope imprecision** — **ACCEPT-AS-IS.** Values are vitest defaults everywhere; the wording is loose, not wrong.
5. **Migration 003's `sha256` comment** — **FIX-SOON.** Safe to edit in an applied file, and the raw-token fact is what the live token depends on. Same as M7.
6. **`HTTPS://` and protocol-relative links not captured by the link check** (`004:411`) — **FIX-SOON.** Adding the `i` flag is one character and removes a false rejection. Leave the protocol-relative case failing; it is bad practice in email anyway.
7. **Exclusion list may miss Mailchimp footer domain families** (`004:412`) — **FIX-SOON, highest value item on this list.** This one fails in the *unsafe* direction, unlike item 6. If the footer uses `eepurl.com` or `campaign-archive.com`, a body whose only links are footer plumbing passes the check and goes out link-less. That is root cause 3 reopening. Pull campaign `3f4c79f8f0`'s HTML, list every distinct host, extend the pattern. One API call, before the first live send.
8. **`agent_grant_report` does not need SECURITY DEFINER** — **ACCEPT-AS-IS.** It works and the search_path is correct. Changing the security model of the security oracle is a larger edit than the finding justifies.
9. **The oracle ignores schema-level USAGE** — **FIX-SOON.** Three lines adding `has_schema_privilege('nicole_agent','public','USAGE')` to the report and one assertion. It closes the one silent way the grant suite stays green while the agent is broken at runtime.
10. **A newsletter is claimable straight from `draft`** — **ACCEPT-AS-IS.** Confirmed intentional: for newsletters her tap is the approval, and the two-press confirm is the interlock.
11. **`mark_sent` and `release_for_retry` take no `FOR UPDATE`** — **ACCEPT-AS-IS.** Both are called from a single-threaded route after the claim has already serialised. Add the one-line comment saying so.
12. **41-character SHA in `task-6-report.md`** — **ACCEPT-AS-IS.** Report prose, no code affected.
13. **`approve_batch` ORDER BY has no unique tiebreaker** (`004:832`) — **FIX-SOON.** Appending `, id` is free, and the batch route's "scheduled N of M" message reads off this order.
14. **`parsePostFaq` caps nothing** (`lib/content/postFaq.ts:18-33`) — **FIX-SOON.** A cap of 12 is three lines and bounds a public page and its JSON-LD against an LLM run-on. Cheap now, awkward once posts are live.
15. **`FaqSection` keys on `faq.question`** — **ACCEPT-AS-IS.** Pre-existing, worst case a React duplicate-key warning. If you do item 14, dedupe in the same pass and this closes with it.
16. **Unchecked `as string` cast plus the single log line in `/queue`** — **FIX-SOON**, for the log line only. `lib/actions/queue.ts:81` uses `runs.error?.message ?? sends.error?.message`, which hides the sends error whenever both fail. The cast is fine: `mailchimp_campaign_id` is `NOT NULL` at `004:82`.
17. **`scheduled` counter not incremented on `sendRowError`** — **ACCEPT-AS-IS.** Under-reports by one on a path that already returns a 502 naming the specific campaign.

Net: 8 FIX-SOON, 9 ACCEPT-AS-IS, 0 MUST-FIX-BEFORE-MERGE. Item 7 is the one worth doing before the first live send rather than "soon".

---

## Deployment Notes

**The current split state is safe, and has been for the length of this build.** Migration 004 is live against the old deployed code (`a9703af`), and every schema change is additive or a widening. New `newsletter_drafts` columns carry defaults (`004:101-105`); the status check only gains values (`004:113-114`); `posts.faq` is `NOT NULL DEFAULT '[]'` so old inserts are unaffected (`004:119`); `approval_tokens.draft_id` becomes nullable under a check that n8n's existing mint (draft_id set, batch_id null) satisfies (`004:127-133`); the three new tables are RLS-on with anon and authenticated revoked (`004:144-153`); and the `nicole_agent` policies are scoped `TO nicole_agent`, so nothing widens for anon. Old code, new schema: fine.

**Hard gate before deploy: set `MAILCHIMP_FROM_NAME` and `MAILCHIMP_REPLY_TO` on Vercel Production.** `mailchimpConfig()` (`lib/mailchimp/campaigns.ts:28-48`) throws when either is unset. That throw lands in the pre-send branch at `route.ts:115`, so the draft is released and the link stays live, which is the safe outcome. But Nicole sees "the send failed and the draft was released, open the link and try again" and every retry fails identically. Set them first.

**Also set `QUEUE_KEY`.** `lib/actions/queue.ts:58` returns `bad_key` when the env var is unset, so `/queue` fails closed, which is correct. It also means a correct passcode is answered with "Wrong passcode" until the var exists.

**The live-token gate is about the parked n8n execution, not only the token.** Once the two Mailchimp vars are set, either outcome is safe: if Nicole taps before deploy the old code resumes n8n and it sends; if she taps after, the new route claims and sends and the n8n execution stays parked harmlessly. The single double-send path in the whole cutover is resuming that parked execution by hand *after* the new route has already sent. Simplest sequencing: confirm `c723b64c`'s token is `used = true` or past `2026-08-29T15:00:23Z`, deploy, then disable the n8n schedule triggers in the same sitting.

**`ALTER ROLE nicole_agent LOGIN PASSWORD` is still unrun, deliberately.** Until it is, the role is `NOLOGIN` and the grants are inert. Worth stating plainly: the security oracle passing today is a statement about the future, not about anything currently connecting.

**Before the first live weekly send, do deferred item 7.** Pull campaign `3f4c79f8f0`'s HTML and list every distinct host. If Mailchimp's footer uses a domain family outside `list-manage.com` and `mailchi.mp`, the link check at `004:409-417` passes on a body whose only links are footer plumbing, and the 07-28 send can happen again. This is the only item on the deferred list that can reproduce a named root cause.

**Nothing else in the branch has to ship together.** `/queue` and `/approve/batch` are new routes with their own gates, and the FAQ change is a read against a column that defaults to `[]`.
