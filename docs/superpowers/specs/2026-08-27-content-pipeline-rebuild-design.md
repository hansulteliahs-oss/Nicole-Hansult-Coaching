# Content pipeline rebuild: n8n to a scheduled Claude agent (design spec, 2026-08-27)

## Context

The Nicole content pipeline is one n8n workflow, `Nicole — Blog Pipeline`
(`vLC6XPUZEH7NcObO`), 62 nodes, 34 credentialed, running on
`handledautomation.app.n8n.cloud`. It has been live since 2026-06-25.

In those two months it published **one** blog post that it did not strand, and
sent **zero** newsletters to the list. It cost four diagnostic sessions
(2026-07-27 six root causes, 2026-08-04 the blog deadlock twin, 2026-08-13
source scope, 2026-08-24 the approval surface). Three of four newsletter drafts
sit stranded right now.

This spec replaces it with a scheduled Claude agent living in this repo, split
on one line: **the agent decides what to write and writes it; the site does
everything irreversible.** The database enforces the split, so the agent
publishing something by accident is not a bug that can exist.

Eliahs's ask, verbatim: *"I would like to redo the entire pipeline, i feel like
the n8n pipeline has broken a couple times and isnt super reliable. i think
turning this into a claude routine would be a good idea."*

## Decisions (made 2026-08-27, do not relitigate)

| # | Decision | Why |
|---|---|---|
| 1 | **A scheduled Claude Managed Agents deployment replaces the n8n workflow.** Logged as Handled OS decision `16b76c7c`. | Two months, one unstranded post, zero sends. Four diagnostic sessions. A 62-node visual graph nobody can reason about is the root cause behind every individual bug. |
| 2 | **The agent gets its own Postgres role, `nicole_agent`, never `SUPABASE_SECRET_KEY`.** `SELECT` on read tables, `EXECUTE` on five `SECURITY DEFINER` RPCs, zero table write grants. | Eliahs chose direct DB writes over a site endpoint. A scoped role gives him that without giving the agent the ability to flip a post to `published` or reach Mailchimp. Same separation as Handled OS migration 0007. |
| 3 | **The site owns every irreversible action.** Publish, campaign create, schedule, send, cancel, revalidate. The agent proposes; the site acts. | An agent is better than code at deciding what to write, and worse than code at doing something irreversible to 1,110 people. |
| 4 | **This repo, not Handled OS.** The voice corpus, the schema, and the approval surface already live here. | The pillars drifted twice while the strategy lived in a README in a different tree from the 23 lessons it was derived from. Strategy and corpus version together now. |
| 5 | **Failure pushes ntfy to Eliahs's phone and retries once.** Every run writes a durable `pipeline_runs` row regardless. | ntfy.sh drops messages after roughly 12 hours and keeps no history. The durable row is the forensics n8n never had, and the reason 07-27 and 08-04 each cost a full session. |
| 6 | **Nicole approves first; escalate to Eliahs at 48h.** Re-push at 24h. An Eliahs approval is recorded as an override. | Token expiry has killed two cycles at a monthly cadence. A 14-day cart window cannot absorb a missed tap. |
| 7 | **Launch emails are batch-approved up front and scheduled in Mailchimp.** One `batch_id`, one token, one review sitting, no per-send tap. | Removes the missed-tap failure from the launch entirely. The cost is that a scheduled send cannot react to seats sold, which decision 8 covers. |
| 8 | **A daily agent drift check plus a passcode-gated `/queue` page.** The agent detects a stale scheduled send and pushes Eliahs. It cannot unschedule. | Detection is agent work; the action stays human, consistent with decision 3. |
| 9 | **Blog and newsletter both go weekly**, as early as the cutover allows. | Monthly is too slow to matter for search or for AI citation, per the 6-Week Program plan doc section 5. |
| 10 | **Hero images are generated: abstract editorial, no people, workout and longevity focused.** | She sells trust as a physical therapist. AI humans land in uncanny valley and undercut that. Abstract images never do, read as a consistent set, and age well. |
| 11 | **The four Mailchimp lists merge into one audience with origin tags.** The 150 Sugar Cravings contacts get a reintroduction send before entering the weekly rotation. | One audience is cheaper (Mailchimp bills per contact per audience) and simpler. Tags preserve the ability to write to the best-performing 150 separately, which the plan doc ranks as the second acquisition channel. The warm-up avoids spam complaints four weeks before cart open. |
| 12 | **The three stranded drafts are discarded and their topics recycled** into `content_plan`. | Rescuing them carries the stale state that caused the August duplicate-slug crash. |

## Non-negotiable design properties

1. **The agent cannot publish or send.** Not by policy, by grant. `nicole_agent`
   holds no `UPDATE` on `posts`, no Mailchimp credential, and no `EXECUTE` on
   any RPC that changes a status to `published` or `sent`.
2. **A token is claimed in the same transaction as the thing it authorises.**
   The current pipeline sets `used=true` before publishing, which is why three
   items are stranded. Never again.
3. **Every run is durable before it is notified.** The `pipeline_runs` row is
   written first; ntfy is best-effort on top of it. A missed push costs nothing.
4. **Content invariants are enforced in the database, not the prompt.** A
   newsletter with no link cannot be staged. A colliding slug cannot crash a run.
5. **Nothing ships unseen.** Every piece is read by a human before it reaches
   the public or the list. Escalation changes *who* reads it, never *whether*.
6. **The plan is a table, not a heuristic.** `content_plan` holds what gets
   written and when. "Pick the oldest available idea" is what deadlocked the
   pipeline twice and is deleted.

## Verified facts that shape the design

All checked live on 2026-08-27 against Supabase, Mailchimp, and the repo.

**The record so far**

- `posts`: 4 rows. Published 06-24 (by hand), 06-25 (the Half B test), 08-06
  (after Eliahs manually rescued the deadlock). One stranded draft,
  `your-body-is-talking-are-you-listening-superseded-2026-07-01`.
  **Autonomous publishes that did not require a rescue: 0.**
- `newsletter_drafts`: 4 rows. One `sent` (07-28), and that one was sent by hand
  from the Mailchimp UI with three rows reconciled by hand afterwards. One
  `approved` never sent. Two `draft`. **Live sends by the pipeline: 0.**
- `approval_tokens`: 8 rows, 7 used. One live, expiring
  `2026-08-29T15:00:23Z`, on newsletter `c723b64c`. Nicole has been pushed it
  over ntfy and is approving it. That draft carries one real link, so it does
  not repeat the 07-28 failure.

**The 07-28 zero-click send**

- Campaign `3f4c79f8f0`: 1,110 delivered, 29.8% open, **0.00% click**.
- Mailchimp `click-details` reports `total_items: 0`. The 4,811-character HTML
  contains **no non-Mailchimp links at all**.
- The 0% click rate is a missing call to action, not weak engagement. This is
  the boring explanation the plan doc said to rule out first, and it is correct.

**Mailchimp**

- Lists: `f531604a9a` "Nicole Hansult Newsletter" **1,102**; `ecacfdabed`
  "Sugar Cravings" **150**; `26495cd895` "Vibrant40" **2**; `1bf6240649`
  "14 Day Reset Body Cleanse" **2**.
- "Sugar Cravings" also exists as a static *segment* on the main list with
  **127** members. Different audience, same name. Sends must name a list id.
- The plan doc's "around 1,375 people" who finished the free-guide sequence
  matches nothing. The `Free Guide` segment holds **2**. The closest real
  audience is `Lead Magnet Sign Ups` at **960**. The doc needs correcting.
- `lib/mailchimp.ts` contains only `addSubscriber`. All campaign create, set
  content, schedule, and send logic lives in n8n and must be written in
  TypeScript here.

**The site**

- All 4 posts have `hero_image_url = NULL`. The column has never been filled.
- The site **already renders it** in three places: the card at
  `app/insights/page.tsx:51`, the OpenGraph image at
  `app/insights/[slug]/page.tsx:46`, and the JSON-LD `image` at
  `app/insights/[slug]/page.tsx:67`. Images are zero frontend work.
- Because it is null, every social share of her posts renders a blank preview
  and her structured data carries no image.
- `/approve` already resolves the token, renders the full draft, and requires a
  second confirm before a newsletter send. Merged and pushed (`a9703af`), live
  in production. `lib/content/approvals.ts` is the entry point.
- `approval_tokens.token_hash` stores the **raw** token, not a hash. The comment
  in `003_content_pipeline.sql:96` describes an intent never implemented.
  `lib/content/approvals.ts:8` documents this. Do not add hashing without
  migrating the live token.

## Root causes this rebuild must structurally prevent

| # | What broke | Structural fix |
|---|---|---|
| 1 | **Burn before publish.** `Claim Token` sets `used=true` before `Route Kind` publishes; any downstream failure strands the draft forever. 3 items stranded. | `approve_and_publish(token)` claims and flips status in one transaction. Newsletters get an intermediate `sending` state so a Mailchimp timeout releases rather than strands. |
| 2 | **Duplicate slug.** Exec 164 (08-01) died on `23505 posts_slug_key` before Nicole saw anything, because July's unapproved idea stayed `available` and August re-picked it. | `stage_post_draft` resolves slug collisions inside the RPC. `content_plan` replaces oldest-available picking, so a topic is never re-served. |
| 3 | **Zero-link newsletter.** 07-28 reached 1,110 inboxes with nothing to click. | `stage_newsletter_draft` raises if `body_html` has no non-Mailchimp `http` link. |
| 4 | **No audience column.** The list is hardcoded to `f531604a9a` in n8n, so a Sugar Cravings send is impossible. | `newsletter_drafts.list_id` and `.segment_id`. |
| 5 | **No forensics.** n8n Cloud retains only the last few executions, so both deadlocks needed a full diagnostic session to reconstruct. | `pipeline_runs`, one row per run, written before anything else. |
| 6 | **Silent token expiry.** Killed the Jul 1 post (lapsed 07-08) and cascaded into the August crash. | Daily expiry sweep with the 24h/48h escalation ladder. |
| 7 | **Wrong approver.** `Newsletter Preview Email` goes to Eliahs, left from the June supervised setup. Flip to Nicole decided 08-25, never applied. | Notification target lives in config, and Nicole is the default for both kinds. |

## Architecture

```
CMA scheduled deployment (this repo, pinned to main)
  │
  ├── WEEKLY run (Mon 06:00 PT)
  │     run_start('weekly')
  │     read content_plan for the next 14 days; plan_upsert if thin
  │     research the week's angle (web_search, and read what is already published)
  │     write the post: answer-first opening, H2s, FAQ block, one soft CTA
  │     generate the hero image, upload to Vercel Blob
  │     stage_post_draft(...)        -> post_id, slug, token
  │     write the newsletter (must carry a link)
  │     stage_newsletter_draft(...)  -> draft_id, token
  │     ntfy -> Nicole, two approve links
  │     run_finish('ok')
  │
  ├── DAILY run (07:00 PT, cheap)
  │     tokens expiring inside 48h  -> re-push / escalate
  │     drafts sitting > 7 days     -> alert
  │     scheduled sends gone stale  -> alert Eliahs
  │
  └── LAUNCH BATCH run (one-off, week of Sep 22)
        draft every launch email against the approved outline
        stage all under one batch_id, mint one token
        ntfy -> Nicole, "N launch emails ready"

Nicole taps  ->  /approve  or  /approve/batch   (Next.js, already live for singles)
                    │
                    └─ POST server action, service role
                         posts:       approve_and_publish(token) -> revalidate
                         newsletter:  claim_for_send(token) -> Mailchimp -> mark_sent
                         batch:       approve_batch(token) -> create + schedule N campaigns

/queue  (passcode-gated)  ->  cancel_scheduled_send(id, reason)
```

## Schema: migration `004_pipeline_rebuild.sql`

**New tables**

- `content_plan`: the editorial calendar. `planned_for date`, `kind`,
  `working_title`, `angle`, `keyword`, `list_id`, `segment_id`, `status`
  (`planned|drafted|approved|sent|skipped`), `source` (`agent|eliahs|nicole`).
  Replaces oldest-available picking. `content_ideas` survives unchanged as
  Nicole's own bank fed by `/idea`.
- `pipeline_runs`: `kind`, `status` (`running|ok|failed`), `attempt`,
  `started_at`, `finished_at`, `plan_id`, `produced_draft_id`, `error`,
  `notes jsonb`.
- `scheduled_sends`: `newsletter_draft_id`, `mailchimp_campaign_id`, `list_id`,
  `segment_id`, `scheduled_for`, `status` (`queued|sent|cancelled`),
  `cancelled_reason`.

**Altered**

- `newsletter_drafts`: add `list_id text not null default 'f531604a9a'`,
  `segment_id text`, `scheduled_for timestamptz`, `batch_id uuid`. Extend the
  status check to `draft|approved|sending|sent|failed`.
- `posts`: add `faq jsonb`. The answer-first format emits a `FAQPage` JSON-LD
  block, which is most of the AI-citation win the plan doc is after.
- `approval_tokens`: add `batch_id uuid`, so one token approves N drafts.

**Role**

`nicole_agent`: `SELECT` on `content_ideas`, `content_plan`, `posts`,
`newsletter_drafts`, `pipeline_runs`, `scheduled_sends`. `EXECUTE` on the five
agent RPCs below. Nothing else. No `INSERT`, `UPDATE`, or `DELETE` on any table.

**Agent RPCs** (callable by `nicole_agent`)

```
run_start(p_kind text) returns pipeline_runs
run_finish(p_run_id uuid, p_status text, p_error text default null,
           p_notes jsonb default '{}') returns pipeline_runs
plan_upsert(p_planned_for date, p_kind text, p_working_title text,
            p_angle text, p_keyword text, p_list_id text,
            p_segment_id text default null) returns content_plan
stage_post_draft(p_run_id uuid, p_plan_id uuid, p_title text, p_slug text,
                 p_body_md text, p_seo_title text, p_meta_description text,
                 p_category text, p_keyword text, p_faq jsonb,
                 p_hero_image_url text, p_source_idea_id uuid default null)
  returns table(post_id uuid, slug text, token text)
stage_newsletter_draft(p_run_id uuid, p_plan_id uuid, p_subject text,
                       p_preview_text text, p_body_html text, p_list_id text,
                       p_segment_id text, p_type text,
                       p_source_idea_id uuid default null,
                       p_scheduled_for timestamptz default null,
                       p_batch_id uuid default null)
  returns table(draft_id uuid, token text)
```

`stage_post_draft` forces `status='draft'`, resolves slug collisions by
appending a date suffix, and mints the token in the same statement.
`stage_newsletter_draft` forces `status='draft'` and **raises** if `body_html`
contains no `http` link outside `list-manage.com` and `mailchi.mp`.

**Site RPCs** (service role only, never granted to `nicole_agent`)

```
approve_and_publish(p_token text) returns table(slug text, already boolean)
claim_for_send(p_token text)
  returns table(draft_id uuid, subject text, body_html text,
                list_id text, segment_id text, already boolean)
mark_sent(p_draft_id uuid, p_campaign_id text, p_sent_at timestamptz)
release_for_retry(p_draft_id uuid, p_error text)
approve_batch(p_token text) returns setof newsletter_drafts
cancel_scheduled_send(p_id uuid, p_reason text) returns scheduled_sends
```

`claim_for_send` moves the draft to `sending` and claims the token atomically.
`mark_sent` completes it. `release_for_retry` returns it to `approved` and
un-claims, so a Mailchimp timeout is recoverable rather than terminal. This is
the fix for root cause 1.

## Images

Generated per post, abstract editorial, no people, workout and longevity
focused. Examples of the register: morning light across a wood floor, a
kettlebell and a folded towel, a mobility band coiled on concrete, a notebook
and coffee beside a yoga mat. Consistent grade across the set.

The agent derives an image prompt from the finished post, calls the image API,
uploads to Vercel Blob through the existing `BLOB_READ_WRITE_TOKEN` path, and
passes the URL to `stage_post_draft`. Generating an image is not irreversible,
so this stays on the agent side of the line.

**Recommended generator: OpenAI `gpt-image-1`.** Best prompt adherence for
editorial and abstract work, and it is a native API rather than a paid shim.
Requires one new credential. Backfill the three published posts in the same
change, since each currently shares with a blank preview card.

## Audience consolidation

One-time, scripted, tested, in `scripts/`. Not clicked through the UI.

1. Export members from `ecacfdabed` (150), `26495cd895` (2), `1bf6240649` (2).
2. Import into `f531604a9a` tagged `origin:sugar-cravings`, `origin:vibrant40`,
   `origin:14-day-reset`. Tag existing members `origin:newsletter`.
3. Send the 150 a reintroduction before they enter the weekly rotation.
4. Verify counts, then archive the three source lists.

The weekly newsletter goes to the whole merged audience. Launch emails target
tags. This is what "one audience" means in practice and it keeps the plan doc's
second acquisition channel intact.

## Failure, retry, forensics

Every run opens with `run_start` and closes with `run_finish`. On an exception
the agent retries **once**, then writes `status='failed'` with the error text
and pushes ntfy to Eliahs. The push is best-effort; the row is the record.

`pipeline_runs` is queryable from the `/queue` page, so "what happened last
Monday" is answerable months later. That is the single thing n8n could not do.

## Cutover

| When | What |
|---|---|
| Week of Sep 1 | Migration `004`, the RPCs, the `nicole_agent` role. Mailchimp campaign create / schedule / send / cancel in TypeScript with tests. `/approve/batch` and `/queue`. |
| Week of Sep 8 | Agent runs in shadow: drafts, stages, pushes to Eliahs only. n8n schedule triggers disabled, workflow retained. Audience merge plus the 150 warm-up. |
| Week of Sep 15 | First live weekly blog and newsletter through the new pipeline. Nicole approves both. |
| Week of Sep 22 | Launch batch drafted, Nicole batch-approves, campaigns scheduled. |
| Sep 28 | Cart opens. Scheduled sends fire. |
| After one clean cycle | Archive the n8n workflow. Keep the JSON export. |

Eliahs asked for weekly as early as possible. Sep 15 is the honest first live
date given the migration and the Mailchimp rewrite. Compressing shadow week to
two days would move it to Sep 8, at the cost of confidence four weeks before a
launch. Not recommended, but available.

## Out of scope

- Rebuilding the site. It works.
- The Vibrant40 purchase-to-list repair. Real, one-time, tracked separately.
- Instagram repurposing, ads, Google Business Profile. Plan doc, not pipeline.
- The Seca data posts. They need Nicole's anonymised export first.

## Open items before the build starts

1. **An image generation API key.** Blocks the image feature, not the pipeline.
2. **Confirm `MAILCHIMP_AUDIENCE_ID` is set on Vercel.** It is read by
   `lib/mailchimp.ts:15` but is absent from `.env.local`, and `addSubscriber`
   silently skips when it is missing. Lead-magnet signups may not be syncing.
3. **Correct the plan doc's 1,375 to 960** before Nicole acts on it.
4. **Nicole's four answers from the plan doc.** Question 1 (the program name)
   and question 4 (the ongoing coaching offer) are required by every launch
   email. **These are on the critical path for the Sep 22 batch.**
5. **An ntfy topic for Eliahs**, distinct from `NICOLE_NTFY_TOPIC`.
6. **A CMA environment and vault** for this repo, with the `nicole_agent`
   Postgres credential and the image API key.
