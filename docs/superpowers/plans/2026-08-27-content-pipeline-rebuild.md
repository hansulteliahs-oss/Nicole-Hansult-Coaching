# Content Pipeline Rebuild — Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move every irreversible action — publish, campaign create, schedule, send, cancel — out of n8n and into this repo, backed by a schema that makes the agent structurally incapable of publishing or sending.

**Architecture:** One idempotent migration (`004_pipeline_rebuild.sql`) adds three tables, four alters, a scoped `nicole_agent` Postgres role, five agent RPCs and six site RPCs. All eleven RPCs are `SECURITY DEFINER`, so the agent's total lack of table write grants is not a policy but a fact. The site then gets a rewritten `/api/approve` that calls those RPCs directly instead of forwarding to n8n, a TypeScript Mailchimp campaign client, a batch-approval surface, and a `/queue` forensics page.

**Tech Stack:** Next.js 16.2.6 (App Router, React 19.2.4), TypeScript 6, Supabase Postgres (`vxtkdwjudzzgyssxhtin`), `@supabase/supabase-js` 2, Mailchimp Marketing API v3 over `fetch`, vitest 4, pnpm 8, Node >= 22.

**Spec:** `docs/superpowers/specs/2026-08-27-content-pipeline-rebuild-design.md`

---

## Global Constraints

- **`approval_tokens.token_hash` stores the RAW token, not a hash.** The column comment in `003_content_pipeline.sql:96` describes an intent never implemented. `lib/content/approvals.ts:8` documents this. Do not add hashing — it breaks the live token.
- **Migration `004_pipeline_rebuild.sql` must be idempotent end to end.** This repo has no `supabase/config.toml` and no linked project, so migrations are applied by hand and this one is applied repeatedly as it grows across Tasks 1–7. Use `CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`, `DROP CONSTRAINT IF EXISTS` before `ADD CONSTRAINT`, `CREATE OR REPLACE FUNCTION`, `DROP POLICY IF EXISTS` before `CREATE POLICY`, and a `pg_roles` guard before `CREATE ROLE`.
- **Every `SECURITY DEFINER` function must carry `SET search_path = public, extensions`.** `gen_random_bytes` lives in the `extensions` schema on Supabase; `SET search_path = public` alone makes every token mint fail at runtime.
- **Never put a role password in the migration.** `CREATE ROLE nicole_agent NOLOGIN` in SQL; the password is set out of band and stored in the vault (Handled OS task 169).
- **The agent gets `SELECT` and `EXECUTE` only.** No `INSERT`, `UPDATE`, or `DELETE` grant on any table, ever, and no `EXECUTE` on any site RPC.
- **Mailchimp campaign helpers throw on misconfiguration.** `lib/mailchimp.ts:addSubscriber` is deliberately fail-soft (a lead-magnet sync must never break a form). Campaign send is the opposite: a silent no-op on a send is the exact failure class this rebuild exists to kill.
- **Mailchimp `schedule_time` must fall on a 15-minute boundary** (minutes ∈ {0, 15, 30, 45}, seconds 0). The API rejects anything else.
- **Live audience ids:** main list `f531604a9a` (1,102). Do not hardcode any other. "Sugar Cravings" exists both as list `ecacfdabed` (150) and as a static segment on the main list (127) — different audiences, same name.
- **Test env:** live-DB tests load `.env.local` via `dotenv` and self-skip when `SUPABASE_SECRET_KEY` is absent, mirroring `tests/db/paywall-schema.test.ts`. Unit tests mock `@/lib/supabase/admin` with `vi.hoisted`, mirroring `tests/content/approvals.test.ts`.
- **Next.js 16 is not the Next.js you know** (`AGENTS.md`). Read `node_modules/next/dist/docs/` before writing route or page code.
- **Run `pnpm typecheck && pnpm test` before every commit.**

---

## Sequencing hazard — read before starting Task 9

A **live approval token expires 2026-08-29T15:00:23Z** on newsletter draft `c723b64c`. Nicole has been pushed it over ntfy and is approving it. Today's `/api/approve` forwards to `N8N_RESUME_WEBHOOK_URL`; Task 9 replaces that path.

**Tasks 1–8 are purely additive and touch nothing on the live path.** Do them in any order relative to that deadline.

**Task 9 must not ship until that token is used or has expired.** Check before starting:

```sql
select token_hash, used, expires_at from approval_tokens
where draft_id = 'c723b64c-...'::uuid;
```

If it is still `used = false` and unexpired, do Tasks 10–12 first and come back.

---

## Applying the migration

No linked Supabase project. Apply the file with the Supabase MCP:

```
mcp__claude_ai_Supabase__apply_migration
  project_id: vxtkdwjudzzgyssxhtin
  name: 004_pipeline_rebuild
  query: <contents of supabase/migrations/004_pipeline_rebuild.sql>
```

Fallback: paste the file into the SQL editor for project `vxtkdwjudzzgyssxhtin`. Either way the file is idempotent, so re-applying the whole thing after each task is the intended workflow — never apply a fragment.

---

## File structure

**Created**

| Path | Responsibility |
|---|---|
| `supabase/migrations/004_pipeline_rebuild.sql` | All schema, the role, all eleven RPCs. Grows across Tasks 1–7. |
| `tests/db/pipeline-rebuild-schema.test.ts` | Live-DB assertions: tables, columns, constraints. |
| `tests/db/agent-rpcs.test.ts` | Live-DB assertions for the five agent RPCs. |
| `tests/db/site-rpcs.test.ts` | Live-DB assertions for the six site RPCs, including the burn-before-publish scenario. |
| `tests/db/nicole-agent-grants.test.ts` | Live-DB assertions that the role holds exactly the intended privileges. |
| `lib/mailchimp/campaigns.ts` | Campaign create / set content / schedule / send / unschedule. Throws. |
| `tests/mailchimp/campaigns.test.ts` | Unit tests with `fetch` stubbed. |
| `lib/content/batch.ts` | Resolve a batch token into the drafts it authorises. |
| `tests/content/batch.test.ts` | Unit tests, admin client mocked. |
| `app/approve/batch/page.tsx` | Batch review surface. |
| `app/approve/batch/BatchClient.tsx` | Client island for the single batch approve press. |
| `app/api/approve/batch/route.ts` | POST — approve N drafts, create + schedule N campaigns. |
| `app/queue/page.tsx` | Passcode-gated run log + scheduled sends. |
| `app/queue/QueueClient.tsx` | Passcode gate + cancel button. |
| `lib/actions/queue.ts` | `loadQueueAction`, `cancelScheduledSendAction`. |
| `tests/actions/queue.test.ts` | Unit tests for the gate and the cancel ordering. |
| `lib/content/postFaq.ts` | Validate the `faq` jsonb into the site's existing `Faq` shape. |
| `tests/content/post-faq.test.ts` | Unit tests. |
| `tests/api/approve.test.ts` | Route tests, Supabase + Mailchimp mocked. |

**Modified**

| Path | Change |
|---|---|
| `app/api/approve/route.ts` | Rewritten: RPCs + Mailchimp + in-process revalidate. n8n forward deleted. |
| `lib/content/approvals.ts` | Add `faq` to the post draft; add a `batch` rejection so `/approve` can redirect. |
| `lib/content/posts.ts` | Add `faq` to `Post` and `POST_COLUMNS`. |
| `app/insights/[slug]/page.tsx` | Emit `FAQPage` JSON-LD and render the FAQ block. |
| `app/approve/DraftPreview.tsx` | Show the FAQ so it is not published unseen. |
| `app/approve/page.tsx` | Redirect a batch token to `/approve/batch`. |
| `.env.example` | `MAILCHIMP_AUDIENCE_ID`, `MAILCHIMP_FROM_NAME`, `MAILCHIMP_REPLY_TO`, `REVALIDATE_SECRET`, `QUEUE_KEY`, `IDEA_BANK_KEY`. |

---

### Task 1: Migration 004 — tables, alters, RLS

**Files:**
- Create: `supabase/migrations/004_pipeline_rebuild.sql`
- Test: `tests/db/pipeline-rebuild-schema.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: tables `content_plan`, `pipeline_runs`, `scheduled_sends`; columns `newsletter_drafts.list_id|segment_id|scheduled_for|batch_id`, `posts.faq`, `approval_tokens.batch_id`; constraints `newsletter_drafts_status_check` (now `draft|approved|sending|sent|failed`) and `approval_tokens_target_check` (exactly one of `draft_id` / `batch_id`).

- [ ] **Step 1: Write the failing test**

`tests/db/pipeline-rebuild-schema.test.ts`:

```ts
/**
 * Migration 004 schema verification — hits the live Supabase project with the
 * service-role key. Skipped when SUPABASE_SECRET_KEY is absent (CI has no
 * secrets), same posture as tests/db/paywall-schema.test.ts.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { config as loadEnv } from 'dotenv';
import path from 'node:path';

loadEnv({ path: path.resolve(__dirname, '../../.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SECRET = process.env.SUPABASE_SECRET_KEY;
const RUN = Boolean(SUPABASE_URL && SUPABASE_SECRET);
const describeIf = RUN ? describe : describe.skip;

describeIf('migration 004_pipeline_rebuild — schema', () => {
  let admin: SupabaseClient;
  const created: { table: string; id: string }[] = [];

  beforeAll(() => {
    admin = createClient(SUPABASE_URL!, SUPABASE_SECRET!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  });

  afterAll(async () => {
    for (const row of created.reverse()) {
      await admin.from(row.table).delete().eq('id', row.id);
    }
  });

  it('content_plan exists and enforces one row per (planned_for, kind)', async () => {
    const day = '2099-01-04';
    const { data: first, error: e1 } = await admin
      .from('content_plan')
      .insert({ planned_for: day, kind: 'post', working_title: 'probe' })
      .select('id, status, source')
      .single();
    expect(e1).toBeNull();
    created.push({ table: 'content_plan', id: first!.id });
    expect(first!.status).toBe('planned');
    expect(first!.source).toBe('agent');

    const { error: e2 } = await admin
      .from('content_plan')
      .insert({ planned_for: day, kind: 'post', working_title: 'duplicate' });
    expect(e2?.code).toBe('23505');
  });

  it('pipeline_runs exists with running/1/{} defaults', async () => {
    const { data, error } = await admin
      .from('pipeline_runs')
      .insert({ kind: 'weekly' })
      .select('id, status, attempt, notes, started_at')
      .single();
    expect(error).toBeNull();
    created.push({ table: 'pipeline_runs', id: data!.id });
    expect(data!.status).toBe('running');
    expect(data!.attempt).toBe(1);
    expect(data!.notes).toEqual({});
    expect(data!.started_at).toBeTruthy();
  });

  it('scheduled_sends exists and accepts a service-role select', async () => {
    const { error } = await admin.from('scheduled_sends').select('id').limit(1);
    expect(error).toBeNull();
  });

  it('newsletter_drafts gained list_id (defaulted), segment_id, scheduled_for, batch_id', async () => {
    const { data, error } = await admin
      .from('newsletter_drafts')
      .insert({ type: 'tip', subject: 'probe' })
      .select('id, list_id, segment_id, scheduled_for, batch_id')
      .single();
    expect(error).toBeNull();
    created.push({ table: 'newsletter_drafts', id: data!.id });
    expect(data!.list_id).toBe('f531604a9a');
    expect(data!.segment_id).toBeNull();
    expect(data!.scheduled_for).toBeNull();
    expect(data!.batch_id).toBeNull();
  });

  it('newsletter_drafts status check now admits sending and failed', async () => {
    const id = created.find((r) => r.table === 'newsletter_drafts')!.id;
    for (const status of ['sending', 'failed', 'approved', 'draft']) {
      const { error } = await admin
        .from('newsletter_drafts')
        .update({ status })
        .eq('id', id);
      expect(error, `status=${status}`).toBeNull();
    }
    const { error } = await admin
      .from('newsletter_drafts')
      .update({ status: 'nonsense' })
      .eq('id', id);
    expect(error?.code).toBe('23514');
  });

  it('posts.faq exists and defaults to an empty array', async () => {
    const { data, error } = await admin
      .from('posts')
      .insert({ slug: `probe-faq-${Date.now()}`, title: 'probe' })
      .select('id, faq')
      .single();
    expect(error).toBeNull();
    created.push({ table: 'posts', id: data!.id });
    expect(data!.faq).toEqual([]);
  });

  it('approval_tokens requires exactly one of draft_id / batch_id', async () => {
    const postId = created.find((r) => r.table === 'posts')!.id;

    const both = await admin.from('approval_tokens').insert({
      token_hash: `probe-both-${Date.now()}`,
      draft_kind: 'post',
      draft_id: postId,
      batch_id: '00000000-0000-0000-0000-000000000001',
      expires_at: '2099-01-01T00:00:00Z',
    });
    expect(both.error?.code).toBe('23514');

    const neither = await admin.from('approval_tokens').insert({
      token_hash: `probe-neither-${Date.now()}`,
      draft_kind: 'newsletter',
      expires_at: '2099-01-01T00:00:00Z',
    });
    expect(neither.error?.code).toBe('23514');

    const batchOnly = `probe-batch-${Date.now()}`;
    const ok = await admin.from('approval_tokens').insert({
      token_hash: batchOnly,
      draft_kind: 'newsletter',
      batch_id: '00000000-0000-0000-0000-000000000001',
      expires_at: '2099-01-01T00:00:00Z',
    });
    expect(ok.error).toBeNull();
    await admin.from('approval_tokens').delete().eq('token_hash', batchOnly);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run tests/db/pipeline-rebuild-schema.test.ts`
Expected: FAIL — `content_plan` does not exist (PostgREST `PGRST205`, "Could not find the table 'public.content_plan'"). If instead every test is skipped, `.env.local` is missing `SUPABASE_SECRET_KEY`; fix that before continuing, because a skipped suite proves nothing.

- [ ] **Step 3: Write the migration**

`supabase/migrations/004_pipeline_rebuild.sql`:

```sql
-- 004 — pipeline rebuild: n8n replaced by a scheduled Claude agent.
--
-- Spec: docs/superpowers/specs/2026-08-27-content-pipeline-rebuild-design.md
--
-- This file is applied BY HAND (no supabase/config.toml, no linked project) and
-- is re-applied repeatedly as it grows. Everything in it is idempotent.
--
-- The split it enforces: the agent decides what to write and writes it; the
-- site does everything irreversible. `nicole_agent` holds SELECT + EXECUTE on
-- five staging RPCs and nothing else, so "the agent published something by
-- accident" is not a bug that can exist.

-- ──────────────────────────────────────────────────────────────────────────────
-- 1. content_plan — the editorial calendar.
--
-- Replaces "pick the oldest available idea", which deadlocked the pipeline
-- twice (root cause 2): July's unapproved idea stayed available, August
-- re-picked it, and exec 164 died on 23505 posts_slug_key before Nicole saw
-- anything. A slot is served once. content_ideas survives unchanged as
-- Nicole's own bank fed by /idea.
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.content_plan (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  planned_for        DATE        NOT NULL,
  kind               TEXT        NOT NULL CHECK (kind IN ('post', 'newsletter')),
  working_title      TEXT        NOT NULL,
  angle              TEXT,
  keyword            TEXT,
  list_id            TEXT,
  segment_id         TEXT,
  status             TEXT        NOT NULL DEFAULT 'planned'
                                 CHECK (status IN ('planned', 'drafted', 'approved', 'sent', 'skipped')),
  source             TEXT        NOT NULL DEFAULT 'agent'
                                 CHECK (source IN ('agent', 'eliahs', 'nicole')),
  -- Set by the staging RPCs so approve_and_publish / mark_sent can advance the
  -- slot without the site needing to know how the agent picked it.
  produced_post_id   UUID        REFERENCES public.posts(id) ON DELETE SET NULL,
  produced_draft_id  UUID        REFERENCES public.newsletter_drafts(id) ON DELETE SET NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- The natural key plan_upsert conflicts on. One post and one newsletter per day.
CREATE UNIQUE INDEX IF NOT EXISTS content_plan_slot_idx
  ON public.content_plan (planned_for, kind);

-- ──────────────────────────────────────────────────────────────────────────────
-- 2. pipeline_runs — one row per run, written before anything else.
--
-- n8n Cloud retains only the last few executions, so both deadlocks needed a
-- full diagnostic session to reconstruct (root cause 5). This is the forensics
-- n8n could not do, and it is why ntfy is allowed to be best-effort.
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.pipeline_runs (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  kind              TEXT        NOT NULL
                                CHECK (kind IN ('weekly', 'daily', 'launch_batch', 'send')),
  status            TEXT        NOT NULL DEFAULT 'running'
                                CHECK (status IN ('running', 'ok', 'failed')),
  attempt           INT         NOT NULL DEFAULT 1,
  started_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at       TIMESTAMPTZ,
  plan_id           UUID        REFERENCES public.content_plan(id) ON DELETE SET NULL,
  produced_draft_id UUID,
  error             TEXT,
  notes             JSONB       NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS pipeline_runs_started_idx
  ON public.pipeline_runs (started_at DESC);

-- ──────────────────────────────────────────────────────────────────────────────
-- 3. scheduled_sends — launch campaigns parked in Mailchimp.
--
-- Decision 7 batch-approves launch emails and schedules them, which removes the
-- missed-tap failure. The cost is that a scheduled send cannot react to seats
-- sold, so decision 8 has the daily agent watch these rows for drift. The agent
-- can detect; only the site can cancel.
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.scheduled_sends (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  newsletter_draft_id   UUID        NOT NULL REFERENCES public.newsletter_drafts(id) ON DELETE CASCADE,
  mailchimp_campaign_id TEXT        NOT NULL,
  list_id               TEXT        NOT NULL,
  segment_id            TEXT,
  scheduled_for         TIMESTAMPTZ NOT NULL,
  status                TEXT        NOT NULL DEFAULT 'queued'
                                    CHECK (status IN ('queued', 'sent', 'cancelled')),
  cancelled_reason      TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS scheduled_sends_status_idx
  ON public.scheduled_sends (status, scheduled_for);

-- ──────────────────────────────────────────────────────────────────────────────
-- 4. Alters
-- ──────────────────────────────────────────────────────────────────────────────

-- The list was hardcoded to f531604a9a inside n8n, so a Sugar Cravings send was
-- impossible (root cause 4). Default preserves every existing row's behaviour.
ALTER TABLE public.newsletter_drafts
  ADD COLUMN IF NOT EXISTS list_id       TEXT NOT NULL DEFAULT 'f531604a9a',
  ADD COLUMN IF NOT EXISTS segment_id    TEXT,
  ADD COLUMN IF NOT EXISTS scheduled_for TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS batch_id      UUID;

-- 'sending' is the intermediate state that makes a Mailchimp timeout releasable
-- rather than terminal (root cause 1). 'failed' is where a send lands after the
-- retry is also exhausted.
ALTER TABLE public.newsletter_drafts
  DROP CONSTRAINT IF EXISTS newsletter_drafts_status_check;
ALTER TABLE public.newsletter_drafts
  ADD CONSTRAINT newsletter_drafts_status_check
  CHECK (status IN ('draft', 'approved', 'sending', 'sent', 'failed'));

-- The answer-first format emits a FAQPage JSON-LD block, which is most of the
-- AI-citation win the 6-Week plan doc is after.
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS faq JSONB NOT NULL DEFAULT '[]'::jsonb;

-- One token approves N drafts (decision 7). A batch token carries no single
-- draft_id, so draft_id becomes nullable and a check enforces exactly one
-- target — a token that points at both, or at neither, is a bug we refuse to
-- store rather than one we discover during a launch.
ALTER TABLE public.approval_tokens
  ADD COLUMN IF NOT EXISTS batch_id UUID;
ALTER TABLE public.approval_tokens
  ALTER COLUMN draft_id DROP NOT NULL;
ALTER TABLE public.approval_tokens
  DROP CONSTRAINT IF EXISTS approval_tokens_target_check;
ALTER TABLE public.approval_tokens
  ADD CONSTRAINT approval_tokens_target_check
  CHECK ((draft_id IS NOT NULL) <> (batch_id IS NOT NULL));

CREATE INDEX IF NOT EXISTS approval_tokens_batch_idx
  ON public.approval_tokens (batch_id) WHERE batch_id IS NOT NULL;

-- ──────────────────────────────────────────────────────────────────────────────
-- 5. RLS on the new tables — service-role-only for now.
--
-- The nicole_agent SELECT policies are added in Task 5 alongside the role, so
-- this file stays applicable before that role exists.
-- ──────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.content_plan     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipeline_runs    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_sends  ENABLE ROW LEVEL SECURITY;

-- Supabase grants anon/authenticated broad table privileges by default. RLS
-- with no policy already blocks them; revoking as well means a future policy
-- added for one role cannot silently open these tables to the public.
REVOKE ALL ON public.content_plan    FROM anon, authenticated;
REVOKE ALL ON public.pipeline_runs   FROM anon, authenticated;
REVOKE ALL ON public.scheduled_sends FROM anon, authenticated;
```

- [ ] **Step 4: Apply the migration**

Apply the file as described in "Applying the migration" above (Supabase MCP `apply_migration`, project `vxtkdwjudzzgyssxhtin`, name `004_pipeline_rebuild`).

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm vitest run tests/db/pipeline-rebuild-schema.test.ts`
Expected: PASS, 7 tests. Not skipped.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/004_pipeline_rebuild.sql tests/db/pipeline-rebuild-schema.test.ts
git commit -m "feat(pipeline): migration 004 tables, alters, and RLS"
```

---

## PostgREST return shapes — read once, before Task 2

Every RPC in this plan is called from tests and from route handlers through
`admin.rpc(...)`. The shape that comes back depends on the SQL return type, and
getting it wrong fails silently as `undefined` rather than loudly as an error:

| SQL return type | `data` shape | Functions |
|---|---|---|
| `RETURNS public.<table>` | a single **object** | `run_start`, `run_finish`, `plan_upsert`, `cancel_scheduled_send` |
| `RETURNS TABLE(...)` | an **array** of row objects | `stage_post_draft`, `stage_newsletter_draft`, `approve_and_publish`, `claim_for_send`, `agent_grant_report` |
| `RETURNS SETOF public.<table>` | an **array** | `approve_batch` |
| `RETURNS void` | `null` | `mark_sent`, `release_for_retry` |

Read the array ones as `data?.[0]`. Never `data.token`.

---

### Task 2: Agent RPCs — run lifecycle and the editorial calendar

**Files:**
- Modify: `supabase/migrations/004_pipeline_rebuild.sql` (append section 6)
- Test: `tests/db/agent-rpcs.test.ts`

**Interfaces:**
- Consumes: tables `pipeline_runs` and `content_plan` from Task 1.
- Produces:
  - `run_start(p_kind text) returns public.pipeline_runs`
  - `run_finish(p_run_id uuid, p_status text, p_error text default null, p_notes jsonb default '{}') returns public.pipeline_runs`
  - `plan_upsert(p_planned_for date, p_kind text, p_working_title text, p_angle text, p_keyword text, p_list_id text, p_segment_id text default null) returns public.content_plan`

- [ ] **Step 1: Write the failing test**

`tests/db/agent-rpcs.test.ts`:

```ts
/**
 * Migration 004 — the five RPCs nicole_agent is allowed to call.
 *
 * Runs against live Supabase with the service-role key, same posture as
 * tests/db/pipeline-rebuild-schema.test.ts. Tasks 2, 3 and 4 each add a
 * describe block to this file.
 *
 * Every row created here is deleted in afterAll. Nothing in this file may
 * touch a row it did not create — `posts` and `newsletter_drafts` hold real
 * published content.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { config as loadEnv } from 'dotenv';
import path from 'node:path';

loadEnv({ path: path.resolve(__dirname, '../../.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SECRET = process.env.SUPABASE_SECRET_KEY;
const RUN = Boolean(SUPABASE_URL && SUPABASE_SECRET);
const describeIf = RUN ? describe : describe.skip;

let admin: SupabaseClient;
const trash: { table: string; column: string; value: string }[] = [];

beforeAll(() => {
  if (!RUN) return;
  admin = createClient(SUPABASE_URL!, SUPABASE_SECRET!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
});

afterAll(async () => {
  if (!RUN) return;
  for (const row of trash.reverse()) {
    await admin.from(row.table).delete().eq(row.column, row.value);
  }
});

describeIf('run_start / run_finish', () => {
  it('opens a running row and closes it with status, error and notes', async () => {
    const { data: run, error } = await admin.rpc('run_start', { p_kind: 'weekly' });
    expect(error).toBeNull();
    trash.push({ table: 'pipeline_runs', column: 'id', value: run.id });

    expect(run.status).toBe('running');
    expect(run.attempt).toBe(1);
    expect(run.finished_at).toBeNull();

    const { data: done, error: e2 } = await admin.rpc('run_finish', {
      p_run_id: run.id,
      p_status: 'ok',
      p_notes: { posts: 1, newsletters: 1 },
    });
    expect(e2).toBeNull();
    expect(done.status).toBe('ok');
    expect(done.finished_at).toBeTruthy();
    expect(done.error).toBeNull();
    expect(done.notes).toEqual({ posts: 1, newsletters: 1 });
  });

  it('run_finish records the error text on a failure', async () => {
    const { data: run } = await admin.rpc('run_start', { p_kind: 'daily' });
    trash.push({ table: 'pipeline_runs', column: 'id', value: run.id });

    const { data: done, error } = await admin.rpc('run_finish', {
      p_run_id: run.id,
      p_status: 'failed',
      p_error: 'image API 429',
    });
    expect(error).toBeNull();
    expect(done.status).toBe('failed');
    expect(done.error).toBe('image API 429');
  });

  it('run_finish refuses a status that is not ok or failed', async () => {
    const { data: run } = await admin.rpc('run_start', { p_kind: 'weekly' });
    trash.push({ table: 'pipeline_runs', column: 'id', value: run.id });

    const { error } = await admin.rpc('run_finish', {
      p_run_id: run.id,
      p_status: 'running',
    });
    expect(error).not.toBeNull();
    expect(error!.message).toMatch(/ok or failed/i);
  });

  it('run_finish raises on an unknown run id', async () => {
    const { error } = await admin.rpc('run_finish', {
      p_run_id: '00000000-0000-0000-0000-000000000009',
      p_status: 'ok',
    });
    expect(error).not.toBeNull();
  });
});

describeIf('plan_upsert', () => {
  const day = '2099-02-10';

  it('inserts a slot, then updates the same (planned_for, kind) instead of colliding', async () => {
    const { data: first, error } = await admin.rpc('plan_upsert', {
      p_planned_for: day,
      p_kind: 'post',
      p_working_title: 'Why your knees hurt on stairs',
      p_angle: 'answer-first, quads not knees',
      p_keyword: 'knee pain going down stairs',
      p_list_id: null,
    });
    expect(error).toBeNull();
    trash.push({ table: 'content_plan', column: 'id', value: first.id });
    expect(first.status).toBe('planned');
    expect(first.source).toBe('agent');

    const { data: second, error: e2 } = await admin.rpc('plan_upsert', {
      p_planned_for: day,
      p_kind: 'post',
      p_working_title: 'Stair pain is a quad problem',
      p_angle: 'sharper angle',
      p_keyword: 'knee pain going down stairs',
      p_list_id: null,
    });
    expect(e2).toBeNull();
    expect(second.id).toBe(first.id);
    expect(second.working_title).toBe('Stair pain is a quad problem');
  });

  it('leaves a slot alone once it has been drafted, and returns it unchanged', async () => {
    const id = trash.find((r) => r.table === 'content_plan')!.value;
    await admin.from('content_plan').update({ status: 'drafted' }).eq('id', id);

    const { data, error } = await admin.rpc('plan_upsert', {
      p_planned_for: day,
      p_kind: 'post',
      p_working_title: 'a re-plan that must not land',
      p_angle: null,
      p_keyword: null,
      p_list_id: null,
    });
    expect(error).toBeNull();
    expect(data.id).toBe(id);
    expect(data.status).toBe('drafted');
    expect(data.working_title).toBe('Stair pain is a quad problem');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run tests/db/agent-rpcs.test.ts`
Expected: FAIL — PostgREST `PGRST202`, "Could not find the function public.run_start(p_kind)". Skipped means `.env.local` has no `SUPABASE_SECRET_KEY`; fix that first.

- [ ] **Step 3: Append section 6 to the migration**

Append to `supabase/migrations/004_pipeline_rebuild.sql`:

```sql
-- ──────────────────────────────────────────────────────────────────────────────
-- 6. Agent RPCs — the entire surface nicole_agent is allowed to call.
--
-- All SECURITY DEFINER, so the agent can do exactly these five things while
-- holding zero table write grants. Every one carries
-- `SET search_path = public, extensions` because gen_random_bytes() lives in
-- the extensions schema on Supabase — `SET search_path = public` alone makes
-- every token mint fail at runtime.
--
-- Each function REVOKEs EXECUTE from PUBLIC immediately after creation.
-- Postgres grants EXECUTE to PUBLIC by default, which on a SECURITY DEFINER
-- function means anon could call it. The GRANT to nicole_agent lands in
-- section 8, once the role exists.
-- ──────────────────────────────────────────────────────────────────────────────

-- run_start — the durable row, written before anything else happens.
-- Non-negotiable property 3: the row is the record, ntfy is best-effort on top.
CREATE OR REPLACE FUNCTION public.run_start(p_kind text)
RETURNS public.pipeline_runs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $fn$
DECLARE
  v_run public.pipeline_runs;
BEGIN
  INSERT INTO public.pipeline_runs (kind) VALUES (p_kind) RETURNING * INTO v_run;
  RETURN v_run;
END;
$fn$;

REVOKE EXECUTE ON FUNCTION public.run_start(text) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.run_start(text) TO service_role;

-- run_finish — closes the row. Refuses 'running' so a run cannot be "finished"
-- back into the state it started in, which would make the daily sweep's
-- "still running after an hour" check unreliable.
CREATE OR REPLACE FUNCTION public.run_finish(
  p_run_id uuid,
  p_status text,
  p_error  text  DEFAULT NULL,
  p_notes  jsonb DEFAULT '{}'::jsonb
)
RETURNS public.pipeline_runs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $fn$
DECLARE
  v_run public.pipeline_runs;
BEGIN
  IF p_status NOT IN ('ok', 'failed') THEN
    RAISE EXCEPTION 'run_finish: status must be ok or failed, got %', p_status
      USING ERRCODE = '22023';
  END IF;

  UPDATE public.pipeline_runs
     SET status      = p_status,
         finished_at = now(),
         error       = p_error,
         notes       = COALESCE(p_notes, '{}'::jsonb)
   WHERE id = p_run_id
  RETURNING * INTO v_run;

  IF v_run.id IS NULL THEN
    RAISE EXCEPTION 'run_finish: no pipeline_runs row %', p_run_id
      USING ERRCODE = 'P0002';
  END IF;

  RETURN v_run;
END;
$fn$;

REVOKE EXECUTE ON FUNCTION public.run_finish(uuid,text,text,jsonb) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.run_finish(uuid,text,text,jsonb) TO service_role;

-- plan_upsert — the agent writes the calendar; it does not pick from a bag.
--
-- Non-negotiable property 6: the plan is a table, not a heuristic. "Pick the
-- oldest available idea" deadlocked the pipeline twice. A slot is keyed by
-- (planned_for, kind) and is served once.
--
-- The DO UPDATE is guarded on status='planned'. Once a slot is drafted,
-- approved or sent, a later re-plan must not overwrite the working title that
-- an existing draft was written against. In that case RETURNING yields no row,
-- so we read the existing one back and return it: the agent learns "this slot
-- is already spoken for" instead of receiving an error it would retry into.
CREATE OR REPLACE FUNCTION public.plan_upsert(
  p_planned_for   date,
  p_kind          text,
  p_working_title text,
  p_angle         text,
  p_keyword       text,
  p_list_id       text,
  p_segment_id    text DEFAULT NULL
)
RETURNS public.content_plan
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $fn$
DECLARE
  v_plan public.content_plan;
BEGIN
  INSERT INTO public.content_plan
    (planned_for, kind, working_title, angle, keyword, list_id, segment_id, source)
  VALUES
    (p_planned_for, p_kind, p_working_title, p_angle, p_keyword,
     p_list_id, p_segment_id, 'agent')
  ON CONFLICT (planned_for, kind) DO UPDATE
     SET working_title = EXCLUDED.working_title,
         angle         = EXCLUDED.angle,
         keyword       = EXCLUDED.keyword,
         list_id       = EXCLUDED.list_id,
         segment_id    = EXCLUDED.segment_id
   WHERE public.content_plan.status = 'planned'
  RETURNING * INTO v_plan;

  IF v_plan.id IS NULL THEN
    SELECT * INTO v_plan
      FROM public.content_plan
     WHERE planned_for = p_planned_for AND kind = p_kind;
  END IF;

  RETURN v_plan;
END;
$fn$;

REVOKE EXECUTE ON FUNCTION public.plan_upsert(date,text,text,text,text,text,text) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.plan_upsert(date,text,text,text,text,text,text) TO service_role;
```

- [ ] **Step 4: Re-apply the whole migration**

Apply the complete file as described in "Applying the migration". Never apply a fragment.

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm vitest run tests/db/agent-rpcs.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/004_pipeline_rebuild.sql tests/db/agent-rpcs.test.ts
git commit -m "feat(pipeline): run_start, run_finish and plan_upsert"
```

---

### Task 3: `stage_post_draft` — slug collisions die here

**Files:**
- Modify: `supabase/migrations/004_pipeline_rebuild.sql` (append to section 6)
- Test: `tests/db/agent-rpcs.test.ts` (append a describe block)

**Interfaces:**
- Consumes: `run_start`, `plan_upsert` from Task 2.
- Produces: `stage_post_draft(p_run_id uuid, p_plan_id uuid, p_title text, p_slug text, p_body_md text, p_seo_title text, p_meta_description text, p_category text, p_keyword text, p_faq jsonb, p_hero_image_url text, p_source_idea_id uuid default null) returns table(post_id uuid, slug text, token text)`.
  Read it as `data[0]` — it is a `RETURNS TABLE`, so PostgREST hands back an array.

- [ ] **Step 1: Write the failing test**

Append to `tests/db/agent-rpcs.test.ts`:

```ts
describeIf('stage_post_draft', () => {
  const base = `plan-probe-stairs-${Date.now()}`;

  it('stages a draft, mints a token, and advances the plan slot to drafted', async () => {
    const { data: run } = await admin.rpc('run_start', { p_kind: 'weekly' });
    trash.push({ table: 'pipeline_runs', column: 'id', value: run.id });

    const { data: plan } = await admin.rpc('plan_upsert', {
      p_planned_for: '2099-03-02',
      p_kind: 'post',
      p_working_title: 'probe',
      p_angle: null,
      p_keyword: null,
      p_list_id: null,
    });
    trash.push({ table: 'content_plan', column: 'id', value: plan.id });

    const { data, error } = await admin.rpc('stage_post_draft', {
      p_run_id: run.id,
      p_plan_id: plan.id,
      p_title: 'Why your knees hurt on stairs',
      p_slug: base,
      p_body_md: '## The short answer\n\nIt is usually the quads.',
      p_seo_title: 'Knee pain on stairs',
      p_meta_description: 'Why it happens and what to do.',
      p_category: 'Functional Longevity',
      p_keyword: 'knee pain going down stairs',
      p_faq: [{ question: 'Is it arthritis?', answer: 'Usually not.' }],
      p_hero_image_url: 'https://example.public.blob.vercel-storage.com/a.png',
    });
    expect(error).toBeNull();

    const row = data[0];
    trash.push({ table: 'approval_tokens', column: 'token_hash', value: row.token });
    trash.push({ table: 'posts', column: 'id', value: row.post_id });

    expect(row.slug).toBe(base);
    expect(row.token).toMatch(/^[0-9a-f]{48}$/);

    // The RPC forces status='draft'. The agent has no way to ask for anything else.
    const { data: post } = await admin
      .from('posts')
      .select('status, faq, hero_image_url')
      .eq('id', row.post_id)
      .single();
    expect(post!.status).toBe('draft');
    // Shape matches `Faq` in lib/content/faqs.ts, so Task 10 needs no mapping.
    expect(post!.faq).toEqual([{ question: 'Is it arthritis?', answer: 'Usually not.' }]);

    // The token is live and points at this post.
    const { data: tok } = await admin
      .from('approval_tokens')
      .select('draft_kind, draft_id, used, batch_id')
      .eq('token_hash', row.token)
      .single();
    expect(tok!.draft_kind).toBe('post');
    expect(tok!.draft_id).toBe(row.post_id);
    expect(tok!.used).toBe(false);
    expect(tok!.batch_id).toBeNull();

    const { data: after } = await admin
      .from('content_plan')
      .select('status, produced_post_id')
      .eq('id', plan.id)
      .single();
    expect(after!.status).toBe('drafted');
    expect(after!.produced_post_id).toBe(row.post_id);
  });

  it('resolves a colliding slug instead of raising 23505 (root cause 2)', async () => {
    const { data, error } = await admin.rpc('stage_post_draft', {
      p_run_id: null,
      p_plan_id: null,
      p_title: 'Same topic, second run',
      p_slug: base,
      p_body_md: 'body',
      p_seo_title: null,
      p_meta_description: null,
      p_category: null,
      p_keyword: null,
      p_faq: null,
      p_hero_image_url: null,
    });
    expect(error).toBeNull();

    const row = data[0];
    trash.push({ table: 'approval_tokens', column: 'token_hash', value: row.token });
    trash.push({ table: 'posts', column: 'id', value: row.post_id });

    expect(row.slug).not.toBe(base);
    expect(row.slug).toMatch(new RegExp(`^${base}-\\d{4}-\\d{2}-\\d{2}$`));
  });

  it('normalises a messy slug and defaults faq to an empty array', async () => {
    const { data, error } = await admin.rpc('stage_post_draft', {
      p_run_id: null,
      p_plan_id: null,
      p_title: 'Messy',
      p_slug: `  Sleep & Recovery: ${Date.now()}!  `,
      p_body_md: 'body',
      p_seo_title: null,
      p_meta_description: null,
      p_category: null,
      p_keyword: null,
      p_faq: null,
      p_hero_image_url: null,
    });
    expect(error).toBeNull();

    const row = data[0];
    trash.push({ table: 'approval_tokens', column: 'token_hash', value: row.token });
    trash.push({ table: 'posts', column: 'id', value: row.post_id });

    expect(row.slug).toMatch(/^sleep-recovery-\d+$/);

    const { data: post } = await admin
      .from('posts')
      .select('faq')
      .eq('id', row.post_id)
      .single();
    expect(post!.faq).toEqual([]);
  });

  it('refuses a slug that normalises to nothing', async () => {
    const { error } = await admin.rpc('stage_post_draft', {
      p_run_id: null,
      p_plan_id: null,
      p_title: 'Empty',
      p_slug: '!!!',
      p_body_md: 'body',
      p_seo_title: null,
      p_meta_description: null,
      p_category: null,
      p_keyword: null,
      p_faq: null,
      p_hero_image_url: null,
    });
    expect(error).not.toBeNull();
    expect(error!.message).toMatch(/slug is empty/i);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run tests/db/agent-rpcs.test.ts -t stage_post_draft`
Expected: FAIL — `PGRST202`, function not found.

- [ ] **Step 3: Append `stage_post_draft` to section 6**

```sql
-- stage_post_draft — the agent's only way to put a post into the database.
--
-- Forces status='draft'. There is no parameter for status, so "the agent
-- published something by accident" is not a bug that can exist.
--
-- Slug collision is resolved HERE, inside the same transaction as the insert.
-- Root cause 2: on 2026-08-01 exec 164 died on `23505 posts_slug_key` before
-- Nicole ever saw the draft, because July's unapproved idea stayed available
-- and August re-picked it. A collision is now a suffix, not a crash.
--
-- The token is minted in the same transaction as the row it authorises
-- (non-negotiable property 2). A staged draft always has a live link.
CREATE OR REPLACE FUNCTION public.stage_post_draft(
  p_run_id           uuid,
  p_plan_id          uuid,
  p_title            text,
  p_slug             text,
  p_body_md          text,
  p_seo_title        text,
  p_meta_description text,
  p_category         text,
  p_keyword          text,
  p_faq              jsonb,
  p_hero_image_url   text,
  p_source_idea_id   uuid DEFAULT NULL
)
RETURNS TABLE(post_id uuid, slug text, token text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $fn$
DECLARE
  v_base  text;
  v_try   text;
  v_n     int := 0;
  v_id    uuid;
  v_token text;
BEGIN
  v_base := trim(both '-' from regexp_replace(lower(trim(p_slug)), '[^a-z0-9]+', '-', 'g'));
  IF v_base IS NULL OR v_base = '' THEN
    RAISE EXCEPTION 'stage_post_draft: slug is empty after normalisation (input %)', p_slug
      USING ERRCODE = '22023';
  END IF;

  v_try := v_base;
  WHILE EXISTS (SELECT 1 FROM public.posts p WHERE p.slug = v_try) LOOP
    v_n := v_n + 1;
    v_try := CASE
               WHEN v_n = 1 THEN v_base || '-' || to_char(current_date, 'YYYY-MM-DD')
               ELSE v_base || '-' || to_char(current_date, 'YYYY-MM-DD') || '-' || v_n
             END;
  END LOOP;

  INSERT INTO public.posts
    (slug, status, title, body_md, seo_title, meta_description,
     category, keyword, faq, hero_image_url, source_idea_id)
  VALUES
    (v_try, 'draft', p_title, p_body_md, p_seo_title, p_meta_description,
     p_category, p_keyword, COALESCE(p_faq, '[]'::jsonb), p_hero_image_url, p_source_idea_id)
  RETURNING id INTO v_id;

  v_token := encode(gen_random_bytes(24), 'hex');
  INSERT INTO public.approval_tokens (token_hash, draft_kind, draft_id, expires_at)
  VALUES (v_token, 'post', v_id, now() + interval '14 days');

  IF p_plan_id IS NOT NULL THEN
    UPDATE public.content_plan
       SET status = 'drafted', produced_post_id = v_id
     WHERE id = p_plan_id;
  END IF;

  IF p_run_id IS NOT NULL THEN
    UPDATE public.pipeline_runs
       SET plan_id           = COALESCE(plan_id, p_plan_id),
           produced_draft_id = v_id
     WHERE id = p_run_id;
  END IF;

  RETURN QUERY SELECT v_id, v_try, v_token;
END;
$fn$;

REVOKE EXECUTE ON FUNCTION public.stage_post_draft(uuid,uuid,text,text,text,text,text,text,text,jsonb,text,uuid) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.stage_post_draft(uuid,uuid,text,text,text,text,text,text,text,jsonb,text,uuid) TO service_role;
```

- [ ] **Step 4: Re-apply the whole migration**

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm vitest run tests/db/agent-rpcs.test.ts`
Expected: PASS, 10 tests.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/004_pipeline_rebuild.sql tests/db/agent-rpcs.test.ts
git commit -m "feat(pipeline): stage_post_draft resolves slug collisions in-transaction"
```

---

### Task 4: `stage_newsletter_draft` — a link-less newsletter cannot be staged

**Files:**
- Modify: `supabase/migrations/004_pipeline_rebuild.sql` (append to section 6)
- Test: `tests/db/agent-rpcs.test.ts` (append a describe block)

**Interfaces:**
- Consumes: `run_start`, `plan_upsert` from Task 2.
- Produces: `stage_newsletter_draft(p_run_id uuid, p_plan_id uuid, p_subject text, p_preview_text text, p_body_html text, p_list_id text, p_segment_id text, p_type text, p_source_idea_id uuid default null, p_scheduled_for timestamptz default null, p_batch_id uuid default null) returns table(draft_id uuid, token text)`.
  Read as `data[0]`. When `p_batch_id` is supplied, every draft in that batch returns the **same** token — the first one mints it, later ones reuse it. That is decision 7's "one batch_id, one token" made mechanical.

- [ ] **Step 1: Write the failing test**

Append to `tests/db/agent-rpcs.test.ts`:

```ts
describeIf('stage_newsletter_draft', () => {
  const REAL_LINK =
    '<p>Read it: <a href="https://nicolehansultcoaching.com/insights/knees">the post</a></p>';

  it('stages a draft with a real link and mints a token', async () => {
    const { data, error } = await admin.rpc('stage_newsletter_draft', {
      p_run_id: null,
      p_plan_id: null,
      p_subject: 'Stairs, knees, quads',
      p_preview_text: 'The short version',
      p_body_html: REAL_LINK,
      p_list_id: 'f531604a9a',
      p_segment_id: null,
      p_type: 'repurpose',
    });
    expect(error).toBeNull();

    const row = data[0];
    trash.push({ table: 'approval_tokens', column: 'token_hash', value: row.token });
    trash.push({ table: 'newsletter_drafts', column: 'id', value: row.draft_id });

    expect(row.token).toMatch(/^[0-9a-f]{48}$/);

    const { data: draft } = await admin
      .from('newsletter_drafts')
      .select('status, list_id, segment_id, batch_id')
      .eq('id', row.draft_id)
      .single();
    expect(draft!.status).toBe('draft');
    expect(draft!.list_id).toBe('f531604a9a');
  });

  it('refuses a body with no link at all — this is the 07-28 send', async () => {
    const { error } = await admin.rpc('stage_newsletter_draft', {
      p_run_id: null,
      p_plan_id: null,
      p_subject: 'Nothing to click',
      p_preview_text: null,
      p_body_html: '<p>Great tips this week. Reply if you want more.</p>',
      p_list_id: 'f531604a9a',
      p_segment_id: null,
      p_type: 'tip',
    });
    expect(error).not.toBeNull();
    expect(error!.message).toMatch(/non-Mailchimp link/i);
  });

  it('refuses a body whose only links are Mailchimp plumbing', async () => {
    const { error } = await admin.rpc('stage_newsletter_draft', {
      p_run_id: null,
      p_plan_id: null,
      p_subject: 'Unsubscribe links only',
      p_preview_text: null,
      p_body_html:
        '<a href="https://nicole.us21.list-manage.com/unsubscribe?u=1">unsubscribe</a>' +
        '<a href="https://mailchi.mp/abc/view">view in browser</a>',
      p_list_id: 'f531604a9a',
      p_segment_id: null,
      p_type: 'tip',
    });
    expect(error).not.toBeNull();
    expect(error!.message).toMatch(/non-Mailchimp link/i);
  });

  it('gives every draft in one batch the same token', async () => {
    const batchId = '00000000-0000-0000-0000-0000000000b1';

    const one = await admin.rpc('stage_newsletter_draft', {
      p_run_id: null,
      p_plan_id: null,
      p_subject: 'Launch 1 of 2',
      p_preview_text: null,
      p_body_html: REAL_LINK,
      p_list_id: 'f531604a9a',
      p_segment_id: null,
      p_type: 'offer',
      p_scheduled_for: '2099-09-28T16:00:00Z',
      p_batch_id: batchId,
    });
    const two = await admin.rpc('stage_newsletter_draft', {
      p_run_id: null,
      p_plan_id: null,
      p_subject: 'Launch 2 of 2',
      p_preview_text: null,
      p_body_html: REAL_LINK,
      p_list_id: 'f531604a9a',
      p_segment_id: null,
      p_type: 'offer',
      p_scheduled_for: '2099-09-30T16:00:00Z',
      p_batch_id: batchId,
    });

    expect(one.error).toBeNull();
    expect(two.error).toBeNull();

    trash.push({ table: 'newsletter_drafts', column: 'id', value: one.data[0].draft_id });
    trash.push({ table: 'newsletter_drafts', column: 'id', value: two.data[0].draft_id });
    trash.push({ table: 'approval_tokens', column: 'batch_id', value: batchId });

    expect(two.data[0].token).toBe(one.data[0].token);

    const { data: tokens } = await admin
      .from('approval_tokens')
      .select('token_hash, draft_id, batch_id')
      .eq('batch_id', batchId);
    expect(tokens).toHaveLength(1);
    expect(tokens![0].draft_id).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run tests/db/agent-rpcs.test.ts -t stage_newsletter_draft`
Expected: FAIL — `PGRST202`.

- [ ] **Step 3: Append `stage_newsletter_draft` to section 6**

```sql
-- stage_newsletter_draft — the agent's only way to put a newsletter into the
-- database. Forces status='draft'.
--
-- Root cause 3, enforced in the database rather than the prompt
-- (non-negotiable property 4): campaign 3f4c79f8f0 reached 1,110 inboxes on
-- 2026-07-28 with a 0.00% click rate because the 4,811-character HTML held no
-- non-Mailchimp link at all. Mailchimp's click-details reported total_items 0.
-- The check below is why that send cannot be staged again, no matter how the
-- writing prompt changes.
--
-- Batching (decision 7): when p_batch_id is supplied the draft mints no token
-- of its own. The first draft in the batch mints the one batch token; every
-- later draft returns the same string, so the agent has exactly one link to
-- push regardless of the order it stages them in.
CREATE OR REPLACE FUNCTION public.stage_newsletter_draft(
  p_run_id         uuid,
  p_plan_id        uuid,
  p_subject        text,
  p_preview_text   text,
  p_body_html      text,
  p_list_id        text,
  p_segment_id     text,
  p_type           text,
  p_source_idea_id uuid        DEFAULT NULL,
  p_scheduled_for  timestamptz DEFAULT NULL,
  p_batch_id       uuid        DEFAULT NULL
)
RETURNS TABLE(draft_id uuid, token text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $fn$
DECLARE
  v_id    uuid;
  v_token text;
BEGIN
  -- Capture the host of every absolute URL in the body, then require at least
  -- one that is not Mailchimp's own plumbing (unsubscribe, view-in-browser).
  IF NOT EXISTS (
    SELECT 1
      FROM regexp_matches(COALESCE(p_body_html, ''), 'https?://([^\s"''<>/]+)', 'g') AS m(parts)
     WHERE m.parts[1] !~* '(^|\.)(list-manage\.com|mailchi\.mp)$'
  ) THEN
    RAISE EXCEPTION
      'stage_newsletter_draft: body_html carries no non-Mailchimp link. A newsletter with nothing to click is the 2026-07-28 send.'
      USING ERRCODE = '23514';
  END IF;

  INSERT INTO public.newsletter_drafts
    (type, status, subject, preview_text, body_html,
     list_id, segment_id, source_idea_id, scheduled_for, batch_id)
  VALUES
    (p_type, 'draft', p_subject, p_preview_text, p_body_html,
     COALESCE(p_list_id, 'f531604a9a'), p_segment_id, p_source_idea_id,
     p_scheduled_for, p_batch_id)
  RETURNING id INTO v_id;

  IF p_batch_id IS NULL THEN
    v_token := encode(gen_random_bytes(24), 'hex');
    INSERT INTO public.approval_tokens (token_hash, draft_kind, draft_id, expires_at)
    VALUES (v_token, 'newsletter', v_id, now() + interval '14 days');
  ELSE
    SELECT t.token_hash INTO v_token
      FROM public.approval_tokens t
     WHERE t.batch_id = p_batch_id
     LIMIT 1;

    IF v_token IS NULL THEN
      v_token := encode(gen_random_bytes(24), 'hex');
      INSERT INTO public.approval_tokens (token_hash, draft_kind, batch_id, expires_at)
      VALUES (v_token, 'newsletter', p_batch_id, now() + interval '14 days');
    END IF;
  END IF;

  IF p_plan_id IS NOT NULL THEN
    UPDATE public.content_plan
       SET status = 'drafted', produced_draft_id = v_id
     WHERE id = p_plan_id;
  END IF;

  IF p_run_id IS NOT NULL THEN
    UPDATE public.pipeline_runs
       SET plan_id           = COALESCE(plan_id, p_plan_id),
           produced_draft_id = v_id
     WHERE id = p_run_id;
  END IF;

  RETURN QUERY SELECT v_id, v_token;
END;
$fn$;

REVOKE EXECUTE ON FUNCTION public.stage_newsletter_draft(uuid,uuid,text,text,text,text,text,text,uuid,timestamptz,uuid) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.stage_newsletter_draft(uuid,uuid,text,text,text,text,text,text,uuid,timestamptz,uuid) TO service_role;
```

- [ ] **Step 4: Re-apply the whole migration**

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm vitest run tests/db/agent-rpcs.test.ts`
Expected: PASS, 14 tests.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/004_pipeline_rebuild.sql tests/db/agent-rpcs.test.ts
git commit -m "feat(pipeline): stage_newsletter_draft refuses a link-less body"
```

---

### Task 5: The `nicole_agent` role — the split, made a grant

**Files:**
- Modify: `supabase/migrations/004_pipeline_rebuild.sql` (append sections 7 and 8)
- Test: `tests/db/nicole-agent-grants.test.ts`

**Interfaces:**
- Consumes: the five agent RPCs from Tasks 2–4, the tables from Task 1.
- Produces:
  - Postgres role `nicole_agent` (NOLOGIN in SQL; `LOGIN PASSWORD` set out of band).
  - `agent_grant_report() returns table(object text, privilege text, granted boolean)` — service-role only. `granted` is `null` for a function that does not exist yet, which is how this file stays applicable at every intermediate task.

**Out of band, once, after this task** (Handled OS task 169 — do not put the password in the repo):

```sql
ALTER ROLE nicole_agent LOGIN PASSWORD '<generated, stored via bin/hos secret>';
```

- [ ] **Step 1: Write the failing test**

`tests/db/nicole-agent-grants.test.ts`:

```ts
/**
 * The security property this whole rebuild rests on: nicole_agent can read six
 * tables and call five functions, and can do nothing else.
 *
 * Asserted through agent_grant_report(), which wraps has_table_privilege /
 * has_function_privilege. PostgREST cannot query information_schema, and
 * information_schema.role_table_grants would not show another role's grants to
 * service_role anyway.
 *
 * `granted: null` means the function does not exist yet — expected while
 * Tasks 6 and 7 are still unwritten. The assertions below are therefore
 * "never true", not "always false".
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { config as loadEnv } from 'dotenv';
import path from 'node:path';

loadEnv({ path: path.resolve(__dirname, '../../.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SECRET = process.env.SUPABASE_SECRET_KEY;
const RUN = Boolean(SUPABASE_URL && SUPABASE_SECRET);
const describeIf = RUN ? describe : describe.skip;

type GrantRow = { object: string; privilege: string; granted: boolean | null };

const READ_TABLES = [
  'content_ideas',
  'content_plan',
  'posts',
  'newsletter_drafts',
  'pipeline_runs',
  'scheduled_sends',
];

const AGENT_FUNCTIONS = [
  'public.run_start(text)',
  'public.run_finish(uuid,text,text,jsonb)',
  'public.plan_upsert(date,text,text,text,text,text,text)',
  'public.stage_post_draft(uuid,uuid,text,text,text,text,text,text,text,jsonb,text,uuid)',
  'public.stage_newsletter_draft(uuid,uuid,text,text,text,text,text,text,uuid,timestamptz,uuid)',
];

const SITE_FUNCTIONS = [
  'public.approve_and_publish(text)',
  'public.claim_for_send(text)',
  'public.mark_sent(uuid,text,timestamptz)',
  'public.release_for_retry(uuid,text)',
  'public.approve_batch(text)',
  'public.cancel_scheduled_send(uuid,text)',
];

describeIf('nicole_agent privileges', () => {
  let admin: SupabaseClient;
  let rows: GrantRow[];

  const find = (object: string, privilege: string) =>
    rows.find((r) => r.object === object && r.privilege === privilege);

  beforeAll(async () => {
    admin = createClient(SUPABASE_URL!, SUPABASE_SECRET!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await admin.rpc('agent_grant_report');
    if (error) throw new Error(`agent_grant_report failed: ${error.message}`);
    rows = data as GrantRow[];
  });

  it('reads the six tables the pipeline needs', () => {
    for (const table of READ_TABLES) {
      expect(find(table, 'SELECT')?.granted, table).toBe(true);
    }
  });

  it('cannot write to a single table — not one INSERT, UPDATE or DELETE', () => {
    const all = [...READ_TABLES, 'approval_tokens'];
    for (const table of all) {
      for (const priv of ['INSERT', 'UPDATE', 'DELETE']) {
        expect(find(table, priv)?.granted, `${table}.${priv}`).toBe(false);
      }
    }
  });

  it('cannot read approval_tokens — it mints them, it never reads one back', () => {
    expect(find('approval_tokens', 'SELECT')?.granted).toBe(false);
  });

  it('may execute exactly the five staging RPCs', () => {
    for (const fn of AGENT_FUNCTIONS) {
      expect(find(fn, 'EXECUTE')?.granted, fn).toBe(true);
    }
  });

  it('may never execute a site RPC', () => {
    for (const fn of SITE_FUNCTIONS) {
      // null = not created yet (Tasks 6/7 pending). Never true.
      expect(find(fn, 'EXECUTE')?.granted, fn).not.toBe(true);
    }
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run tests/db/nicole-agent-grants.test.ts`
Expected: FAIL in `beforeAll` — "agent_grant_report failed: Could not find the function public.agent_grant_report".

- [ ] **Step 3: Append sections 7 and 8 to the migration**

```sql
-- ──────────────────────────────────────────────────────────────────────────────
-- 7. The nicole_agent role.
--
-- Decision 2: the agent gets its own Postgres role, never SUPABASE_SECRET_KEY.
-- Same separation as Handled OS migration 0007.
--
-- NOLOGIN here on purpose — no password ever lands in this file or in git.
-- Out of band, once, from the vault (Handled OS task 169):
--     ALTER ROLE nicole_agent LOGIN PASSWORD '<generated>';
-- ──────────────────────────────────────────────────────────────────────────────
DO $role$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'nicole_agent') THEN
    CREATE ROLE nicole_agent NOLOGIN;
  END IF;
END
$role$;

GRANT USAGE ON SCHEMA public TO nicole_agent;

GRANT SELECT ON
  public.content_ideas,
  public.content_plan,
  public.posts,
  public.newsletter_drafts,
  public.pipeline_runs,
  public.scheduled_sends
TO nicole_agent;

-- approval_tokens is deliberately absent above, and revoked here in case a
-- later blanket grant ever tries to include it. The agent mints tokens through
-- the stage_* RPCs and pushes the link; it never needs to read one back, and a
-- SELECT here would let it approve its own work.
REVOKE ALL ON public.approval_tokens FROM nicole_agent;

-- The five agent RPCs, and only those. Section 9 revokes the site RPCs from
-- this role explicitly as each one is created.
GRANT EXECUTE ON FUNCTION public.run_start(text) TO nicole_agent;
GRANT EXECUTE ON FUNCTION public.run_finish(uuid,text,text,jsonb) TO nicole_agent;
GRANT EXECUTE ON FUNCTION public.plan_upsert(date,text,text,text,text,text,text) TO nicole_agent;
GRANT EXECUTE ON FUNCTION public.stage_post_draft(uuid,uuid,text,text,text,text,text,text,text,jsonb,text,uuid) TO nicole_agent;
GRANT EXECUTE ON FUNCTION public.stage_newsletter_draft(uuid,uuid,text,text,text,text,text,text,uuid,timestamptz,uuid) TO nicole_agent;

-- RLS is enabled on all of these, and a table GRANT alone reads nothing
-- through RLS. nicole_agent needs a policy per table. posts already carries
-- "published posts are public"; policies are OR'd, so this one widens the
-- agent to drafts without widening anon.
DROP POLICY IF EXISTS "agent reads content_ideas" ON public.content_ideas;
CREATE POLICY "agent reads content_ideas" ON public.content_ideas
  FOR SELECT TO nicole_agent USING (true);

DROP POLICY IF EXISTS "agent reads content_plan" ON public.content_plan;
CREATE POLICY "agent reads content_plan" ON public.content_plan
  FOR SELECT TO nicole_agent USING (true);

DROP POLICY IF EXISTS "agent reads posts" ON public.posts;
CREATE POLICY "agent reads posts" ON public.posts
  FOR SELECT TO nicole_agent USING (true);

DROP POLICY IF EXISTS "agent reads newsletter_drafts" ON public.newsletter_drafts;
CREATE POLICY "agent reads newsletter_drafts" ON public.newsletter_drafts
  FOR SELECT TO nicole_agent USING (true);

DROP POLICY IF EXISTS "agent reads pipeline_runs" ON public.pipeline_runs;
CREATE POLICY "agent reads pipeline_runs" ON public.pipeline_runs
  FOR SELECT TO nicole_agent USING (true);

DROP POLICY IF EXISTS "agent reads scheduled_sends" ON public.scheduled_sends;
CREATE POLICY "agent reads scheduled_sends" ON public.scheduled_sends
  FOR SELECT TO nicole_agent USING (true);

-- ──────────────────────────────────────────────────────────────────────────────
-- 8. agent_grant_report — the security property, made assertable.
--
-- PostgREST cannot query information_schema, and role_table_grants would not
-- show another role's grants to service_role anyway. has_table_privilege and
-- has_function_privilege answer for any role from any caller.
--
-- to_regprocedure() returns NULL rather than raising for a function that does
-- not exist, so this report is valid at every intermediate state of the file
-- (the site RPCs arrive in section 9). NULL reads as "not created yet".
-- ──────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.agent_grant_report()
RETURNS TABLE(object text, privilege text, granted boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $fn$
  SELECT t.tbl,
         p.priv,
         has_table_privilege('nicole_agent', 'public.' || t.tbl, p.priv)
    FROM (VALUES ('content_ideas'), ('content_plan'), ('posts'),
                 ('newsletter_drafts'), ('pipeline_runs'), ('scheduled_sends'),
                 ('approval_tokens')) AS t(tbl)
    CROSS JOIN (VALUES ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE')) AS p(priv)
  UNION ALL
  SELECT f.fn,
         'EXECUTE',
         CASE WHEN to_regprocedure(f.fn) IS NULL THEN NULL
              ELSE has_function_privilege('nicole_agent', to_regprocedure(f.fn), 'EXECUTE')
         END
    FROM (VALUES
      ('public.run_start(text)'),
      ('public.run_finish(uuid,text,text,jsonb)'),
      ('public.plan_upsert(date,text,text,text,text,text,text)'),
      ('public.stage_post_draft(uuid,uuid,text,text,text,text,text,text,text,jsonb,text,uuid)'),
      ('public.stage_newsletter_draft(uuid,uuid,text,text,text,text,text,text,uuid,timestamptz,uuid)'),
      ('public.approve_and_publish(text)'),
      ('public.claim_for_send(text)'),
      ('public.mark_sent(uuid,text,timestamptz)'),
      ('public.release_for_retry(uuid,text)'),
      ('public.approve_batch(text)'),
      ('public.cancel_scheduled_send(uuid,text)')
    ) AS f(fn);
$fn$;

REVOKE EXECUTE ON FUNCTION public.agent_grant_report() FROM PUBLIC, anon, authenticated, nicole_agent;
GRANT  EXECUTE ON FUNCTION public.agent_grant_report() TO service_role;
```

- [ ] **Step 4: Re-apply the whole migration**

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm vitest run tests/db/nicole-agent-grants.test.ts`
Expected: PASS, 5 tests. The site-RPC test passes on `null` at this point and on `false` after Task 7.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/004_pipeline_rebuild.sql tests/db/nicole-agent-grants.test.ts
git commit -m "feat(pipeline): nicole_agent role, read-only grants, and a grant report"
```

---

### Task 6: Site RPCs — publish and send, claimed in one transaction

**Files:**
- Modify: `supabase/migrations/004_pipeline_rebuild.sql` (append section 9)
- Test: `tests/db/site-rpcs.test.ts`

**Interfaces:**
- Consumes: `stage_post_draft`, `stage_newsletter_draft` from Tasks 3–4.
- Produces:
  - `approve_and_publish(p_token text) returns table(slug text, already boolean)` — array, read `data[0]`
  - `claim_for_send(p_token text) returns table(draft_id uuid, subject text, body_html text, list_id text, segment_id text, already boolean)` — array, read `data[0]`
  - `mark_sent(p_draft_id uuid, p_campaign_id text, p_sent_at timestamptz)` — void
  - `release_for_retry(p_draft_id uuid, p_error text)` — void

This is the fix for root cause 1. Today `Claim Token` sets `used=true` *before* `Route Kind` publishes, so any downstream failure strands the draft forever — three items are stranded right now. Here the claim and the state change are statements in the same function body, therefore the same transaction: either both land or neither does.

- [ ] **Step 1: Write the failing test**

`tests/db/site-rpcs.test.ts`:

```ts
/**
 * Migration 004 — the six RPCs only the site may call.
 *
 * The scenario that matters most is the last one: a Mailchimp failure after
 * the token is claimed must RELEASE the draft, not strand it. That is root
 * cause 1, and three real drafts are stranded by it today.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { config as loadEnv } from 'dotenv';
import path from 'node:path';

loadEnv({ path: path.resolve(__dirname, '../../.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SECRET = process.env.SUPABASE_SECRET_KEY;
const RUN = Boolean(SUPABASE_URL && SUPABASE_SECRET);
const describeIf = RUN ? describe : describe.skip;

const LINKED = '<p><a href="https://nicolehansultcoaching.com/insights/x">read</a></p>';

let admin: SupabaseClient;
const trash: { table: string; column: string; value: string }[] = [];

async function stagePost(slug: string) {
  const { data, error } = await admin.rpc('stage_post_draft', {
    p_run_id: null,
    p_plan_id: null,
    p_title: 'probe',
    p_slug: slug,
    p_body_md: 'body',
    p_seo_title: null,
    p_meta_description: null,
    p_category: null,
    p_keyword: null,
    p_faq: null,
    p_hero_image_url: null,
  });
  if (error) throw new Error(error.message);
  const row = data[0];
  trash.push({ table: 'approval_tokens', column: 'token_hash', value: row.token });
  trash.push({ table: 'posts', column: 'id', value: row.post_id });
  return row as { post_id: string; slug: string; token: string };
}

async function stageNewsletter() {
  const { data, error } = await admin.rpc('stage_newsletter_draft', {
    p_run_id: null,
    p_plan_id: null,
    p_subject: 'probe',
    p_preview_text: null,
    p_body_html: LINKED,
    p_list_id: 'f531604a9a',
    p_segment_id: null,
    p_type: 'tip',
  });
  if (error) throw new Error(error.message);
  const row = data[0];
  trash.push({ table: 'approval_tokens', column: 'token_hash', value: row.token });
  trash.push({ table: 'newsletter_drafts', column: 'id', value: row.draft_id });
  return row as { draft_id: string; token: string };
}

beforeAll(() => {
  if (!RUN) return;
  admin = createClient(SUPABASE_URL!, SUPABASE_SECRET!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
});

afterAll(async () => {
  if (!RUN) return;
  for (const row of trash.reverse()) {
    await admin.from(row.table).delete().eq(row.column, row.value);
  }
});

describeIf('approve_and_publish', () => {
  it('publishes the post and claims the token together', async () => {
    const staged = await stagePost(`site-rpc-publish-${Date.now()}`);

    const { data, error } = await admin.rpc('approve_and_publish', {
      p_token: staged.token,
    });
    expect(error).toBeNull();
    expect(data[0].slug).toBe(staged.slug);
    expect(data[0].already).toBe(false);

    const { data: post } = await admin
      .from('posts')
      .select('status, published_at')
      .eq('id', staged.post_id)
      .single();
    expect(post!.status).toBe('published');
    expect(post!.published_at).toBeTruthy();

    const { data: tok } = await admin
      .from('approval_tokens')
      .select('used')
      .eq('token_hash', staged.token)
      .single();
    expect(tok!.used).toBe(true);
  });

  it('is idempotent — a second tap reports already, not an error', async () => {
    const staged = await stagePost(`site-rpc-idem-${Date.now()}`);
    await admin.rpc('approve_and_publish', { p_token: staged.token });

    const { data, error } = await admin.rpc('approve_and_publish', {
      p_token: staged.token,
    });
    expect(error).toBeNull();
    expect(data[0].slug).toBe(staged.slug);
    expect(data[0].already).toBe(true);
  });

  it('refuses an expired token and leaves the post a draft', async () => {
    const staged = await stagePost(`site-rpc-expired-${Date.now()}`);
    await admin
      .from('approval_tokens')
      .update({ expires_at: '2020-01-01T00:00:00Z' })
      .eq('token_hash', staged.token);

    const { error } = await admin.rpc('approve_and_publish', { p_token: staged.token });
    expect(error).not.toBeNull();
    expect(error!.message).toMatch(/expired/i);

    const { data: post } = await admin
      .from('posts')
      .select('status')
      .eq('id', staged.post_id)
      .single();
    expect(post!.status).toBe('draft');
  });

  it('refuses an unknown token', async () => {
    const { error } = await admin.rpc('approve_and_publish', { p_token: 'nope' });
    expect(error).not.toBeNull();
  });

  it('refuses a newsletter token — wrong door', async () => {
    const staged = await stageNewsletter();
    const { error } = await admin.rpc('approve_and_publish', { p_token: staged.token });
    expect(error).not.toBeNull();
    expect(error!.message).toMatch(/not a post token/i);
  });
});

describeIf('claim_for_send / mark_sent / release_for_retry', () => {
  it('claims the draft into sending and hands back everything the sender needs', async () => {
    const staged = await stageNewsletter();

    const { data, error } = await admin.rpc('claim_for_send', { p_token: staged.token });
    expect(error).toBeNull();

    const claim = data[0];
    expect(claim.draft_id).toBe(staged.draft_id);
    expect(claim.subject).toBe('probe');
    expect(claim.body_html).toBe(LINKED);
    expect(claim.list_id).toBe('f531604a9a');
    expect(claim.already).toBe(false);

    const { data: draft } = await admin
      .from('newsletter_drafts')
      .select('status')
      .eq('id', staged.draft_id)
      .single();
    expect(draft!.status).toBe('sending');
  });

  it('mark_sent completes the draft with its campaign id', async () => {
    const staged = await stageNewsletter();
    await admin.rpc('claim_for_send', { p_token: staged.token });

    const sentAt = '2099-01-01T00:00:00Z';
    const { error } = await admin.rpc('mark_sent', {
      p_draft_id: staged.draft_id,
      p_campaign_id: 'probe-campaign-1',
      p_sent_at: sentAt,
    });
    expect(error).toBeNull();

    const { data: draft } = await admin
      .from('newsletter_drafts')
      .select('status, mailchimp_campaign_id, sent_at')
      .eq('id', staged.draft_id)
      .single();
    expect(draft!.status).toBe('sent');
    expect(draft!.mailchimp_campaign_id).toBe('probe-campaign-1');
    expect(draft!.sent_at).toBeTruthy();
  });

  it('ROOT CAUSE 1: a Mailchimp failure releases the draft instead of stranding it', async () => {
    const staged = await stageNewsletter();
    await admin.rpc('claim_for_send', { p_token: staged.token });

    // Mailchimp times out here in real life.
    const { error } = await admin.rpc('release_for_retry', {
      p_draft_id: staged.draft_id,
      p_error: 'Mailchimp 504',
    });
    expect(error).toBeNull();

    const { data: draft } = await admin
      .from('newsletter_drafts')
      .select('status')
      .eq('id', staged.draft_id)
      .single();
    expect(draft!.status).toBe('approved');

    const { data: tok } = await admin
      .from('approval_tokens')
      .select('used')
      .eq('token_hash', staged.token)
      .single();
    expect(tok!.used).toBe(false);

    // And the whole thing is retryable from the same link.
    const { data: again, error: e2 } = await admin.rpc('claim_for_send', {
      p_token: staged.token,
    });
    expect(e2).toBeNull();
    expect(again[0].already).toBe(false);
  });

  it('a second claim on an already-sent draft reports already, and does not resend', async () => {
    const staged = await stageNewsletter();
    await admin.rpc('claim_for_send', { p_token: staged.token });
    await admin.rpc('mark_sent', {
      p_draft_id: staged.draft_id,
      p_campaign_id: 'probe-campaign-2',
      p_sent_at: '2099-01-01T00:00:00Z',
    });

    const { data, error } = await admin.rpc('claim_for_send', { p_token: staged.token });
    expect(error).toBeNull();
    expect(data[0].already).toBe(true);
    expect(data[0].draft_id).toBe(staged.draft_id);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run tests/db/site-rpcs.test.ts`
Expected: FAIL — `PGRST202` on `approve_and_publish`.

- [ ] **Step 3: Append section 9 to the migration**

```sql
-- ──────────────────────────────────────────────────────────────────────────────
-- 9. Site RPCs — every irreversible action lives here.
--
-- Decision 3: the agent proposes, the site acts. None of these is ever granted
-- to nicole_agent, and each one revokes EXECUTE from PUBLIC on creation.
--
-- ROOT CAUSE 1 is fixed by the structure, not by care: in each function the
-- token claim and the state change are statements in one function body, so
-- they share a transaction. The n8n pipeline set used=true in a node that ran
-- BEFORE the publish node, which is why three drafts are stranded today.
-- ──────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.approve_and_publish(p_token text)
RETURNS TABLE(slug text, already boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $fn$
DECLARE
  v_tok  public.approval_tokens;
  v_slug text;
BEGIN
  -- FOR UPDATE so two taps in the same second serialise rather than race.
  SELECT * INTO v_tok
    FROM public.approval_tokens
   WHERE token_hash = p_token
     FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'approve_and_publish: unknown token' USING ERRCODE = 'P0002';
  END IF;
  IF v_tok.batch_id IS NOT NULL THEN
    RAISE EXCEPTION 'approve_and_publish: this token approves a batch, use approve_batch'
      USING ERRCODE = '22023';
  END IF;
  IF v_tok.draft_kind <> 'post' THEN
    RAISE EXCEPTION 'approve_and_publish: not a post token' USING ERRCODE = '22023';
  END IF;

  -- Already approved: report the slug and say so. A double tap is a normal
  -- thing for a phone to do, not an error worth showing Nicole.
  IF v_tok.used THEN
    SELECT p.slug INTO v_slug FROM public.posts p WHERE p.id = v_tok.draft_id;
    -- Same guard the first-tap path applies. Without it a used token whose post
    -- was later deleted returns (slug: NULL, already: true) silently, while the
    -- identical condition raises on the first tap.
    IF v_slug IS NULL THEN
      RAISE EXCEPTION 'approve_and_publish: post % is gone', v_tok.draft_id
        USING ERRCODE = 'P0002';
    END IF;
    RETURN QUERY SELECT v_slug, true;
    RETURN;
  END IF;

  IF v_tok.expires_at <= now() THEN
    RAISE EXCEPTION 'approve_and_publish: token expired' USING ERRCODE = '22023';
  END IF;

  UPDATE public.posts
     SET status       = 'published',
         published_at = COALESCE(published_at, now())
   WHERE id = v_tok.draft_id
  RETURNING posts.slug INTO v_slug;   -- qualified: bare `slug` is the OUT param

  IF v_slug IS NULL THEN
    RAISE EXCEPTION 'approve_and_publish: post % is gone', v_tok.draft_id
      USING ERRCODE = 'P0002';
  END IF;

  UPDATE public.approval_tokens SET used = true WHERE token_hash = p_token;

  -- 'approved' is terminal for a post slot: published IS approved. 'sent' is
  -- reserved for newsletters, where the two are genuinely different events.
  UPDATE public.content_plan
     SET status = 'approved'
   WHERE produced_post_id = v_tok.draft_id;

  RETURN QUERY SELECT v_slug, false;
END;
$fn$;

REVOKE EXECUTE ON FUNCTION public.approve_and_publish(text) FROM PUBLIC, anon, authenticated, nicole_agent;
GRANT  EXECUTE ON FUNCTION public.approve_and_publish(text) TO service_role;

-- claim_for_send — moves the draft to 'sending' and claims the token together,
-- then hands back the payload. 'sending' is the intermediate state that makes
-- a Mailchimp timeout releasable rather than terminal.
CREATE OR REPLACE FUNCTION public.claim_for_send(p_token text)
RETURNS TABLE(draft_id uuid, subject text, body_html text,
              list_id text, segment_id text, already boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $fn$
DECLARE
  v_tok public.approval_tokens;
  v_d   public.newsletter_drafts;
BEGIN
  SELECT * INTO v_tok
    FROM public.approval_tokens
   WHERE token_hash = p_token
     FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'claim_for_send: unknown token' USING ERRCODE = 'P0002';
  END IF;
  IF v_tok.batch_id IS NOT NULL THEN
    RAISE EXCEPTION 'claim_for_send: this token approves a batch, use approve_batch'
      USING ERRCODE = '22023';
  END IF;
  IF v_tok.draft_kind <> 'newsletter' THEN
    RAISE EXCEPTION 'claim_for_send: not a newsletter token' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_d FROM public.newsletter_drafts WHERE id = v_tok.draft_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'claim_for_send: draft % is gone', v_tok.draft_id USING ERRCODE = 'P0002';
  END IF;

  IF v_tok.used OR v_d.status IN ('sending', 'sent') THEN
    RETURN QUERY SELECT v_d.id, v_d.subject, v_d.body_html, v_d.list_id, v_d.segment_id, true;
    RETURN;
  END IF;

  IF v_tok.expires_at <= now() THEN
    RAISE EXCEPTION 'claim_for_send: token expired' USING ERRCODE = '22023';
  END IF;

  UPDATE public.newsletter_drafts SET status = 'sending' WHERE id = v_d.id;
  UPDATE public.approval_tokens   SET used = true        WHERE token_hash = p_token;

  RETURN QUERY SELECT v_d.id, v_d.subject, v_d.body_html, v_d.list_id, v_d.segment_id, false;
END;
$fn$;

REVOKE EXECUTE ON FUNCTION public.claim_for_send(text) FROM PUBLIC, anon, authenticated, nicole_agent;
GRANT  EXECUTE ON FUNCTION public.claim_for_send(text) TO service_role;

-- mark_sent — the send landed. Completes the draft, the plan slot, and any
-- scheduled_sends row that was waiting on this draft.
CREATE OR REPLACE FUNCTION public.mark_sent(
  p_draft_id    uuid,
  p_campaign_id text,
  p_sent_at     timestamptz
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $fn$
BEGIN
  UPDATE public.newsletter_drafts
     SET status                = 'sent',
         mailchimp_campaign_id = p_campaign_id,
         sent_at               = COALESCE(p_sent_at, now())
   WHERE id = p_draft_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'mark_sent: draft % is gone', p_draft_id USING ERRCODE = 'P0002';
  END IF;

  UPDATE public.content_plan SET status = 'sent' WHERE produced_draft_id = p_draft_id;

  UPDATE public.scheduled_sends
     SET status = 'sent'
   WHERE newsletter_draft_id = p_draft_id AND status = 'queued';
END;
$fn$;

REVOKE EXECUTE ON FUNCTION public.mark_sent(uuid,text,timestamptz) FROM PUBLIC, anon, authenticated, nicole_agent;
GRANT  EXECUTE ON FUNCTION public.mark_sent(uuid,text,timestamptz) TO service_role;

-- release_for_retry — Mailchimp failed after the claim. Return the draft to
-- 'approved' and un-claim the token so the SAME link works again.
--
-- This is the whole point of root cause 1. Under n8n this path did not exist:
-- the token was already burnt, so a failure here stranded the draft forever
-- and needed a hand rescue. Three drafts are in that state right now.
CREATE OR REPLACE FUNCTION public.release_for_retry(p_draft_id uuid, p_error text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $fn$
BEGIN
  UPDATE public.newsletter_drafts
     SET status = 'approved'
   WHERE id = p_draft_id AND status = 'sending';

  -- Only un-claim if the draft was actually reverted. Ungated, these two
  -- diverge: a call on a draft that is not 'sending' no-ops the draft while
  -- still handing back a live approval link for an issue that already went out.
  IF FOUND THEN
    UPDATE public.approval_tokens
       SET used = false
     WHERE draft_id = p_draft_id AND draft_kind = 'newsletter';
  END IF;

  INSERT INTO public.pipeline_runs (kind, status, finished_at, produced_draft_id, error, notes)
  VALUES ('send', 'failed', now(), p_draft_id, p_error,
          jsonb_build_object('released', true));
END;
$fn$;

REVOKE EXECUTE ON FUNCTION public.release_for_retry(uuid,text) FROM PUBLIC, anon, authenticated, nicole_agent;
GRANT  EXECUTE ON FUNCTION public.release_for_retry(uuid,text) TO service_role;
```

- [ ] **Step 4: Re-apply the whole migration**

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm vitest run tests/db/site-rpcs.test.ts tests/db/nicole-agent-grants.test.ts`
Expected: `site-rpcs` PASS, 9 tests. `nicole-agent-grants` still PASS — four of the six site functions now report `granted: false` rather than `null`, which the "never true" assertion covers.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/004_pipeline_rebuild.sql tests/db/site-rpcs.test.ts
git commit -m "feat(pipeline): approve_and_publish and the claim/send/release cycle"
```

---

### Task 7: Site RPCs — batch approval and cancelling a scheduled send

**Files:**
- Modify: `supabase/migrations/004_pipeline_rebuild.sql` (append to section 9)
- Test: `tests/db/site-rpcs.test.ts` (append a describe block)

**Interfaces:**
- Consumes: `stage_newsletter_draft` batch behaviour from Task 4.
- Produces:
  - `approve_batch(p_token text) returns setof public.newsletter_drafts` — array. Idempotent: a second call returns the same rows without re-approving, so the batch route can be retried safely after a partial Mailchimp failure.
  - `cancel_scheduled_send(p_id uuid, p_reason text) returns public.scheduled_sends` — a single object.

- [ ] **Step 1: Write the failing test**

Append to `tests/db/site-rpcs.test.ts`:

```ts
describeIf('approve_batch', () => {
  const batchId = '00000000-0000-0000-0000-0000000000c1';

  async function stageBatchPair() {
    const rows = [];
    for (const subject of ['Launch A', 'Launch B']) {
      const { data, error } = await admin.rpc('stage_newsletter_draft', {
        p_run_id: null,
        p_plan_id: null,
        p_subject: subject,
        p_preview_text: null,
        p_body_html: LINKED,
        p_list_id: 'f531604a9a',
        p_segment_id: null,
        p_type: 'offer',
        p_scheduled_for: '2099-09-28T16:00:00Z',
        p_batch_id: batchId,
      });
      if (error) throw new Error(error.message);
      trash.push({ table: 'newsletter_drafts', column: 'id', value: data[0].draft_id });
      rows.push(data[0]);
    }
    trash.push({ table: 'approval_tokens', column: 'batch_id', value: batchId });
    return rows;
  }

  it('approves every draft in the batch on one token', async () => {
    const rows = await stageBatchPair();

    const { data, error } = await admin.rpc('approve_batch', { p_token: rows[0].token });
    expect(error).toBeNull();
    expect(data).toHaveLength(2);
    expect(data.every((d: { status: string }) => d.status === 'approved')).toBe(true);

    const { data: tok } = await admin
      .from('approval_tokens')
      .select('used')
      .eq('batch_id', batchId)
      .single();
    expect(tok!.used).toBe(true);
  });

  it('is idempotent — a retry returns the same rows and re-approves nothing', async () => {
    const { data: first } = await admin
      .from('approval_tokens')
      .select('token_hash')
      .eq('batch_id', batchId)
      .single();

    // Simulate the route getting halfway: one draft already has a campaign.
    const { data: drafts } = await admin
      .from('newsletter_drafts')
      .select('id')
      .eq('batch_id', batchId)
      .order('subject');
    await admin
      .from('newsletter_drafts')
      .update({ mailchimp_campaign_id: 'probe-batch-campaign' })
      .eq('id', drafts![0].id);

    const { data, error } = await admin.rpc('approve_batch', {
      p_token: first!.token_hash,
    });
    expect(error).toBeNull();
    expect(data).toHaveLength(2);
    // The already-created campaign is preserved, so the route can skip it.
    const withCampaign = data.filter(
      (d: { mailchimp_campaign_id: string | null }) => d.mailchimp_campaign_id !== null,
    );
    expect(withCampaign).toHaveLength(1);
  });

  it('refuses a single-draft token', async () => {
    const staged = await stageNewsletter();
    const { error } = await admin.rpc('approve_batch', { p_token: staged.token });
    expect(error).not.toBeNull();
    expect(error!.message).toMatch(/not a batch token/i);
  });
});

describeIf('cancel_scheduled_send', () => {
  async function seedScheduled() {
    const staged = await stageNewsletter();
    const { data, error } = await admin
      .from('scheduled_sends')
      .insert({
        newsletter_draft_id: staged.draft_id,
        mailchimp_campaign_id: 'probe-sched-1',
        list_id: 'f531604a9a',
        scheduled_for: '2099-09-28T16:00:00Z',
      })
      .select('id')
      .single();
    if (error) throw new Error(error.message);
    trash.push({ table: 'scheduled_sends', column: 'id', value: data!.id });
    return data!.id as string;
  }

  it('cancels a queued send with a reason', async () => {
    const id = await seedScheduled();

    const { data, error } = await admin.rpc('cancel_scheduled_send', {
      p_id: id,
      p_reason: 'seats sold out',
    });
    expect(error).toBeNull();
    expect(data.status).toBe('cancelled');
    expect(data.cancelled_reason).toBe('seats sold out');
  });

  it('a second cancel reads as already cancelled, not an error', async () => {
    const id = await seedScheduled();
    await admin.rpc('cancel_scheduled_send', { p_id: id, p_reason: 'first' });

    const { data, error } = await admin.rpc('cancel_scheduled_send', {
      p_id: id,
      p_reason: 'second',
    });
    expect(error).toBeNull();
    expect(data.status).toBe('cancelled');
    expect(data.cancelled_reason).toBe('first');
  });

  it('raises on an unknown id', async () => {
    const { error } = await admin.rpc('cancel_scheduled_send', {
      p_id: '00000000-0000-0000-0000-0000000000ff',
      p_reason: 'x',
    });
    expect(error).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run tests/db/site-rpcs.test.ts -t approve_batch`
Expected: FAIL — `PGRST202`.

- [ ] **Step 3: Append the last two RPCs to section 9**

```sql
-- approve_batch — decision 7. One token, one review sitting, N drafts.
--
-- Idempotent by construction: the token claim and the status flip happen once,
-- but the function always RETURNS the full batch. The route can therefore be
-- retried after a partial Mailchimp failure — it re-reads the rows, sees which
-- already carry a mailchimp_campaign_id, and creates only the missing ones.
CREATE OR REPLACE FUNCTION public.approve_batch(p_token text)
RETURNS SETOF public.newsletter_drafts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $fn$
DECLARE
  v_tok public.approval_tokens;
BEGIN
  SELECT * INTO v_tok
    FROM public.approval_tokens
   WHERE token_hash = p_token
     FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'approve_batch: unknown token' USING ERRCODE = 'P0002';
  END IF;
  IF v_tok.batch_id IS NULL THEN
    RAISE EXCEPTION 'approve_batch: not a batch token' USING ERRCODE = '22023';
  END IF;

  IF NOT v_tok.used THEN
    IF v_tok.expires_at <= now() THEN
      RAISE EXCEPTION 'approve_batch: token expired' USING ERRCODE = '22023';
    END IF;

    UPDATE public.newsletter_drafts
       SET status = 'approved'
     WHERE batch_id = v_tok.batch_id AND status = 'draft';

    UPDATE public.approval_tokens SET used = true WHERE token_hash = p_token;
  END IF;

  RETURN QUERY
    SELECT * FROM public.newsletter_drafts
     WHERE batch_id = v_tok.batch_id
     ORDER BY scheduled_for NULLS LAST, created_at;
END;
$fn$;

REVOKE EXECUTE ON FUNCTION public.approve_batch(text) FROM PUBLIC, anon, authenticated, nicole_agent;
GRANT  EXECUTE ON FUNCTION public.approve_batch(text) TO service_role;

-- cancel_scheduled_send — decision 8. The daily agent DETECTS a stale
-- scheduled send and pushes Eliahs; only this function, called from /queue by
-- a human, acts on it.
--
-- The caller must unschedule in Mailchimp FIRST and call this only on success.
-- A row that says 'cancelled' while the campaign is still armed is the one
-- failure ordering that actually hurts. See lib/actions/queue.ts.
CREATE OR REPLACE FUNCTION public.cancel_scheduled_send(p_id uuid, p_reason text)
RETURNS public.scheduled_sends
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $fn$
DECLARE
  v_row public.scheduled_sends;
BEGIN
  UPDATE public.scheduled_sends
     SET status           = 'cancelled',
         cancelled_reason = p_reason
   WHERE id = p_id AND status = 'queued'
  RETURNING * INTO v_row;

  IF v_row.id IS NULL THEN
    -- Already sent or already cancelled. Return it unchanged so a double click
    -- on /queue reads as "already cancelled" rather than an error.
    SELECT * INTO v_row FROM public.scheduled_sends WHERE id = p_id;
    IF v_row.id IS NULL THEN
      RAISE EXCEPTION 'cancel_scheduled_send: no scheduled send %', p_id
        USING ERRCODE = 'P0002';
    END IF;
  END IF;

  RETURN v_row;
END;
$fn$;

REVOKE EXECUTE ON FUNCTION public.cancel_scheduled_send(uuid,text) FROM PUBLIC, anon, authenticated, nicole_agent;
GRANT  EXECUTE ON FUNCTION public.cancel_scheduled_send(uuid,text) TO service_role;
```

- [ ] **Step 4: Re-apply the whole migration**

- [ ] **Step 5: Run the full DB suite**

Run: `pnpm vitest run tests/db/`
Expected: PASS. `nicole-agent-grants` now reports `granted: false` for all six site functions — the security property is complete and asserted.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/004_pipeline_rebuild.sql tests/db/site-rpcs.test.ts
git commit -m "feat(pipeline): approve_batch and cancel_scheduled_send complete migration 004"
```

---

### Task 8: The Mailchimp campaign client

**Files:**
- Create: `lib/mailchimp/campaigns.ts`
- Create: `tests/mailchimp/campaigns.test.ts`
- Modify: `.env.example`

⚠️ **`lib/mailchimp.ts` and `lib/mailchimp/` will both exist.** That is legal — `@/lib/mailchimp` resolves to the file, `@/lib/mailchimp/campaigns` to the directory — but do not "tidy" it by adding `lib/mailchimp/index.ts`, which would make the existing `addSubscriber` import ambiguous.

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces, all from `@/lib/mailchimp/campaigns`:
  - `mailchimpConfig(): { apiKey: string; server: string; fromName: string; replyTo: string }` — throws when unset
  - `assertQuarterHour(when: Date): void`
  - `createCampaign(args: { listId: string; segmentId?: string | null; subject: string; previewText?: string | null; title: string }): Promise<string>` — the campaign id
  - `setCampaignContent(campaignId: string, html: string): Promise<void>`
  - `scheduleCampaign(campaignId: string, when: Date): Promise<void>`
  - `sendCampaign(campaignId: string): Promise<void>`
  - `unscheduleCampaign(campaignId: string): Promise<void>`

Everything here **throws**. `lib/mailchimp.ts:addSubscriber` is deliberately fail-soft because a lead-magnet sync must never break a form; a send is the opposite. A silent no-op on a send is the exact failure class this rebuild exists to kill — the 07-28 campaign is what "it looked like it worked" costs.

- [ ] **Step 1: Write the failing test**

`tests/mailchimp/campaigns.test.ts`:

```ts
/**
 * lib/mailchimp/campaigns — create / content / schedule / send / unschedule.
 *
 * fetch is stubbed; nothing here touches Mailchimp. The assertions that matter
 * are (a) every helper throws on a non-OK response, and (b) schedule refuses a
 * time Mailchimp would reject, because a rejected schedule four weeks before
 * cart open is a launch that silently does not happen.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import {
  assertQuarterHour,
  createCampaign,
  setCampaignContent,
  scheduleCampaign,
  sendCampaign,
  unscheduleCampaign,
  mailchimpConfig,
} from '@/lib/mailchimp/campaigns';

type Call = { url: string; init: RequestInit };
let calls: Call[];

function stubFetch(response: { ok: boolean; status: number; body?: string }) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return {
        ok: response.ok,
        status: response.status,
        text: async () => response.body ?? '',
      } as unknown as Response;
    }),
  );
}

beforeEach(() => {
  calls = [];
  process.env.MAILCHIMP_API_KEY = 'key123-us21';
  process.env.MAILCHIMP_FROM_NAME = 'Nicole Hansult';
  process.env.MAILCHIMP_REPLY_TO = 'nicole@mail.nicolehansultcoaching.com';
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('mailchimpConfig', () => {
  it('derives the data-centre server from the key suffix', () => {
    expect(mailchimpConfig().server).toBe('us21');
  });

  it('throws when the from-name is missing rather than sending as nobody', () => {
    delete process.env.MAILCHIMP_FROM_NAME;
    expect(() => mailchimpConfig()).toThrow(/MAILCHIMP_FROM_NAME/);
  });

  it('throws when the API key is missing', () => {
    delete process.env.MAILCHIMP_API_KEY;
    expect(() => mailchimpConfig()).toThrow(/MAILCHIMP_API_KEY/);
  });
});

describe('assertQuarterHour', () => {
  it('accepts a quarter-hour boundary', () => {
    expect(() => assertQuarterHour(new Date('2026-09-28T16:15:00.000Z'))).not.toThrow();
  });

  it('rejects 16:20', () => {
    expect(() => assertQuarterHour(new Date('2026-09-28T16:20:00.000Z'))).toThrow(
      /quarter-hour/i,
    );
  });

  it('rejects a stray seconds value', () => {
    expect(() => assertQuarterHour(new Date('2026-09-28T16:15:30.000Z'))).toThrow(
      /quarter-hour/i,
    );
  });
});

describe('createCampaign', () => {
  it('posts a regular campaign to the named list and returns the id', async () => {
    stubFetch({ ok: true, status: 200, body: JSON.stringify({ id: 'abc123' }) });

    const id = await createCampaign({
      listId: 'f531604a9a',
      subject: 'Stairs, knees, quads',
      previewText: 'The short version',
      title: 'Weekly 2026-09-15',
    });

    expect(id).toBe('abc123');
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe('https://us21.api.mailchimp.com/3.0/campaigns');
    expect(calls[0].init.method).toBe('POST');

    const body = JSON.parse(calls[0].init.body as string);
    expect(body.type).toBe('regular');
    expect(body.recipients.list_id).toBe('f531604a9a');
    expect(body.recipients.segment_opts).toBeUndefined();
    expect(body.settings.subject_line).toBe('Stairs, knees, quads');
    expect(body.settings.from_name).toBe('Nicole Hansult');
  });

  it('attaches a saved segment when one is supplied', async () => {
    stubFetch({ ok: true, status: 200, body: JSON.stringify({ id: 'abc123' }) });

    await createCampaign({
      listId: 'f531604a9a',
      segmentId: '4821',
      subject: 'Sugar Cravings reintroduction',
      title: 'Warm-up',
    });

    const body = JSON.parse(calls[0].init.body as string);
    expect(body.recipients.segment_opts).toEqual({ saved_segment_id: 4821 });
  });

  it('refuses a non-numeric segment id instead of silently sending to everyone', async () => {
    stubFetch({ ok: true, status: 200, body: JSON.stringify({ id: 'abc123' }) });

    await expect(
      createCampaign({
        listId: 'f531604a9a',
        segmentId: 'sugar-cravings',
        subject: 's',
        title: 't',
      }),
    ).rejects.toThrow(/not numeric/i);
  });

  it('throws on a non-OK response and includes the body', async () => {
    stubFetch({ ok: false, status: 400, body: '{"detail":"bad list"}' });

    await expect(
      createCampaign({ listId: 'nope', subject: 's', title: 't' }),
    ).rejects.toThrow(/400.*bad list/s);
  });

  it('throws when Mailchimp returns 200 with no id', async () => {
    stubFetch({ ok: true, status: 200, body: '{}' });

    await expect(
      createCampaign({ listId: 'f531604a9a', subject: 's', title: 't' }),
    ).rejects.toThrow(/no campaign id/i);
  });
});

describe('setCampaignContent / send / schedule / unschedule', () => {
  it('PUTs the html to the content endpoint', async () => {
    stubFetch({ ok: true, status: 200, body: '{}' });
    await setCampaignContent('abc123', '<p>hi</p>');

    expect(calls[0].url).toBe('https://us21.api.mailchimp.com/3.0/campaigns/abc123/content');
    expect(calls[0].init.method).toBe('PUT');
    expect(JSON.parse(calls[0].init.body as string)).toEqual({ html: '<p>hi</p>' });
  });

  it('sends, tolerating the empty 204 body Mailchimp returns', async () => {
    stubFetch({ ok: true, status: 204, body: '' });
    await expect(sendCampaign('abc123')).resolves.toBeUndefined();

    expect(calls[0].url).toBe(
      'https://us21.api.mailchimp.com/3.0/campaigns/abc123/actions/send',
    );
    expect(calls[0].init.method).toBe('POST');
  });

  it('schedules at a quarter-hour boundary', async () => {
    stubFetch({ ok: true, status: 204, body: '' });
    await scheduleCampaign('abc123', new Date('2026-09-28T16:00:00.000Z'));

    expect(calls[0].url).toBe(
      'https://us21.api.mailchimp.com/3.0/campaigns/abc123/actions/schedule',
    );
    expect(JSON.parse(calls[0].init.body as string)).toEqual({
      schedule_time: '2026-09-28T16:00:00.000Z',
    });
  });

  it('refuses to schedule off-boundary without calling Mailchimp at all', async () => {
    stubFetch({ ok: true, status: 204, body: '' });

    await expect(
      scheduleCampaign('abc123', new Date('2026-09-28T16:07:00.000Z')),
    ).rejects.toThrow(/quarter-hour/i);
    expect(calls).toHaveLength(0);
  });

  it('unschedules', async () => {
    stubFetch({ ok: true, status: 204, body: '' });
    await unscheduleCampaign('abc123');

    expect(calls[0].url).toBe(
      'https://us21.api.mailchimp.com/3.0/campaigns/abc123/actions/unschedule',
    );
  });

  it('throws when a send is refused', async () => {
    stubFetch({ ok: false, status: 500, body: 'boom' });
    await expect(sendCampaign('abc123')).rejects.toThrow(/500.*boom/s);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run tests/mailchimp/campaigns.test.ts`
Expected: FAIL — "Failed to resolve import '@/lib/mailchimp/campaigns'".

- [ ] **Step 3: Write the client**

`lib/mailchimp/campaigns.ts`:

```ts
/**
 * Mailchimp Marketing API v3 — campaign create, content, schedule, send,
 * unschedule.
 *
 * All of this lived in the n8n workflow. `lib/mailchimp.ts` only ever held
 * addSubscriber, so every send path had to be written here in TypeScript as
 * part of the rebuild.
 *
 * THROWS ON EVERYTHING. addSubscriber next door is deliberately fail-soft so a
 * misconfiguration can never break the lead-magnet form. A send is the
 * opposite: campaign 3f4c79f8f0 went to 1,110 people on 2026-07-28 and looked
 * fine, and "it looked fine" is the failure class this rebuild exists to kill.
 * Callers decide what to do with the throw; nothing here swallows one.
 */
const API_ROOT = (server: string) => `https://${server}.api.mailchimp.com/3.0`;

export type MailchimpConfig = {
  apiKey: string;
  server: string;
  fromName: string;
  replyTo: string;
};

/**
 * Read config at call time, not at module load. Missing env then surfaces at
 * request time with a name attached, matching lib/supabase/admin.ts.
 */
export function mailchimpConfig(): MailchimpConfig {
  const apiKey = process.env.MAILCHIMP_API_KEY;
  const fromName = process.env.MAILCHIMP_FROM_NAME;
  const replyTo = process.env.MAILCHIMP_REPLY_TO;

  const missing: string[] = [];
  if (!apiKey) missing.push('MAILCHIMP_API_KEY');
  if (!fromName) missing.push('MAILCHIMP_FROM_NAME');
  if (!replyTo) missing.push('MAILCHIMP_REPLY_TO');
  if (missing.length > 0) {
    throw new Error(`Mailchimp campaigns are not configured: ${missing.join(', ')} unset.`);
  }

  // Keys are suffixed with the data-centre prefix, e.g. "abc123-us21".
  const server = apiKey!.split('-')[1];
  if (!server) {
    throw new Error('MAILCHIMP_API_KEY has no data-centre suffix (expected "<key>-us21").');
  }

  return { apiKey: apiKey!, server, fromName: fromName!, replyTo: replyTo! };
}

async function call(
  path: string,
  method: 'GET' | 'POST' | 'PUT',
  body?: unknown,
): Promise<unknown> {
  const { apiKey, server } = mailchimpConfig();

  const res = await fetch(`${API_ROOT(server)}${path}`, {
    method,
    headers: {
      Authorization: 'Basic ' + Buffer.from(`any:${apiKey}`).toString('base64'),
      'Content-Type': 'application/json',
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Mailchimp ${method} ${path} failed (${res.status}): ${text}`);
  }
  // The action endpoints answer 204 with an empty body.
  return text ? JSON.parse(text) : null;
}

/**
 * Mailchimp rejects a schedule_time that is not on a 15-minute boundary. It
 * does so with a 400 at schedule time, which during a launch batch reads as
 * "nothing went out" long after anyone is watching. Fail here instead.
 */
export function assertQuarterHour(when: Date): void {
  if (Number.isNaN(when.getTime())) {
    throw new Error('scheduleCampaign: invalid date');
  }
  const offBoundary =
    when.getUTCMinutes() % 15 !== 0 ||
    when.getUTCSeconds() !== 0 ||
    when.getUTCMilliseconds() !== 0;

  if (offBoundary) {
    throw new Error(
      `scheduleCampaign: Mailchimp only accepts quarter-hour schedule times; got ${when.toISOString()}`,
    );
  }
}

export async function createCampaign(args: {
  listId: string;
  segmentId?: string | null;
  subject: string;
  previewText?: string | null;
  title: string;
}): Promise<string> {
  const { fromName, replyTo } = mailchimpConfig();

  const recipients: {
    list_id: string;
    segment_opts?: { saved_segment_id: number };
  } = { list_id: args.listId };

  if (args.segmentId) {
    // "Sugar Cravings" exists as list ecacfdabed (150) AND as a saved segment
    // on the main list (127). Sending to the wrong one is silent, so a segment
    // id that is not a number is a bug we refuse rather than one we discover
    // from an open-rate report.
    const saved = Number(args.segmentId);
    if (!Number.isInteger(saved)) {
      throw new Error(`createCampaign: segment id "${args.segmentId}" is not numeric`);
    }
    recipients.segment_opts = { saved_segment_id: saved };
  }

  const data = (await call('/campaigns', 'POST', {
    type: 'regular',
    recipients,
    settings: {
      subject_line: args.subject,
      preview_text: args.previewText ?? undefined,
      title: args.title,
      from_name: fromName,
      reply_to: replyTo,
    },
  })) as { id?: string } | null;

  if (!data?.id) {
    throw new Error('createCampaign: Mailchimp returned no campaign id');
  }
  return data.id;
}

export async function setCampaignContent(campaignId: string, html: string): Promise<void> {
  await call(`/campaigns/${campaignId}/content`, 'PUT', { html });
}

export async function scheduleCampaign(campaignId: string, when: Date): Promise<void> {
  assertQuarterHour(when);
  await call(`/campaigns/${campaignId}/actions/schedule`, 'POST', {
    schedule_time: when.toISOString(),
  });
}

export async function sendCampaign(campaignId: string): Promise<void> {
  await call(`/campaigns/${campaignId}/actions/send`, 'POST');
}

export async function unscheduleCampaign(campaignId: string): Promise<void> {
  await call(`/campaigns/${campaignId}/actions/unschedule`, 'POST');
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm vitest run tests/mailchimp/campaigns.test.ts`
Expected: PASS, 17 tests.

- [ ] **Step 5: Document the env vars**

Append to `.env.example`:

```
# ─── Phase 6: content pipeline (Plan 2026-08-27) ───

# Mailchimp — audience sync (existing) + campaign send (new)
MAILCHIMP_API_KEY=                      # "<key>-us21"; the suffix is the data centre
MAILCHIMP_AUDIENCE_ID=                  # f531604a9a — the merged newsletter audience
MAILCHIMP_FROM_NAME=                    # Nicole Hansult
MAILCHIMP_REPLY_TO=                     # nicole@mail.nicolehansultcoaching.com

# Blog cache invalidation — /api/revalidate shared secret
REVALIDATE_SECRET=

# Passcode gates (mom-grade privacy on unlisted pages)
IDEA_BANK_KEY=                          # /idea
QUEUE_KEY=                              # /queue — run log + scheduled sends
```

- [ ] **Step 6: Typecheck, test, commit**

```bash
pnpm typecheck && pnpm test
git add lib/mailchimp/campaigns.ts tests/mailchimp/campaigns.test.ts .env.example
git commit -m "feat(mailchimp): campaign create, content, schedule, send, unschedule"
```

Then set `MAILCHIMP_FROM_NAME` and `MAILCHIMP_REPLY_TO` on Vercel Production. `MAILCHIMP_API_KEY` and `MAILCHIMP_AUDIENCE_ID` are already set.

---

### Task 9: `/api/approve` stops forwarding to n8n

> ⛔ **Do not start this task until the live token on newsletter `c723b64c` is used or expired.** Re-read "Sequencing hazard" above and run the check query. Tasks 10, 11 and 12 are safe to do first.

**Files:**
- Modify: `app/api/approve/route.ts` (full rewrite, 44 lines → ~130)
- Create: `tests/api/approve.test.ts`

**Interfaces:**
- Consumes: `approve_and_publish`, `claim_for_send`, `mark_sent`, `release_for_retry` (Task 6); `createCampaign`, `setCampaignContent`, `sendCampaign` (Task 8).
- Produces: `POST /api/approve` accepting `{ token }`, answering `{ ok: true, already: boolean, slug?: string, campaignId?: string }`. `ApproveClient.tsx` needs no change — it already POSTs `{ token, kind }` and only reads `res.ok` and `data.error`. `kind` becomes ignored, which is what `app/approve/page.tsx` already documents as the correct posture.

- [ ] **Step 1: Write the failing test**

`tests/api/approve.test.ts`:

```ts
/**
 * POST /api/approve — the route that does the irreversible thing.
 *
 * Supabase and Mailchimp are both mocked. The case worth the most is the last
 * one: when the send throws, the route MUST call release_for_retry before it
 * answers, or we have rebuilt root cause 1 in TypeScript.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  tokenRow: null as Record<string, unknown> | null,
  tokenError: null as { message: string } | null,
  rpcResults: {} as Record<string, { data: unknown; error: { message: string } | null }>,
  rpcCalls: [] as { fn: string; args: Record<string, unknown> }[],
  previewText: null as string | null,
  sendThrows: null as Error | null,
  mailchimpCalls: [] as string[],
  revalidated: [] as string[],
}));

vi.mock('@/lib/supabase/admin', () => ({
  getAdminClient: () => ({
    from(table: string) {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () =>
              table === 'approval_tokens'
                ? { data: mocks.tokenRow, error: mocks.tokenError }
                : { data: { preview_text: mocks.previewText }, error: null },
          }),
        }),
      };
    },
    async rpc(fn: string, args: Record<string, unknown>) {
      mocks.rpcCalls.push({ fn, args });
      return mocks.rpcResults[fn] ?? { data: null, error: null };
    },
  }),
}));

vi.mock('@/lib/mailchimp/campaigns', () => ({
  createCampaign: async () => {
    mocks.mailchimpCalls.push('create');
    if (mocks.sendThrows) throw mocks.sendThrows;
    return 'campaign-1';
  },
  setCampaignContent: async () => {
    mocks.mailchimpCalls.push('content');
  },
  sendCampaign: async () => {
    mocks.mailchimpCalls.push('send');
    if (mocks.sendThrows) throw mocks.sendThrows;
  },
}));

vi.mock('next/cache', () => ({
  revalidateTag: (tag: string) => mocks.revalidated.push(`tag:${tag}`),
  revalidatePath: (p: string) => mocks.revalidated.push(`path:${p}`),
}));

const { POST } = await import('@/app/api/approve/route');

const post = (body: unknown) =>
  POST(
    new Request('http://localhost/api/approve', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }),
  );

beforeEach(() => {
  mocks.tokenRow = null;
  mocks.tokenError = null;
  mocks.rpcResults = {};
  mocks.rpcCalls = [];
  mocks.previewText = null;
  mocks.sendThrows = null;
  mocks.mailchimpCalls = [];
  mocks.revalidated = [];
});

describe('POST /api/approve', () => {
  it('rejects a body with no token', async () => {
    const res = await post({});
    expect(res.status).toBe(400);
  });

  it('404s an unknown token', async () => {
    const res = await post({ token: 'nope' });
    expect(res.status).toBe(404);
    expect(mocks.rpcCalls).toHaveLength(0);
  });

  it('sends a batch token to the batch page instead of approving anything', async () => {
    mocks.tokenRow = { draft_kind: 'newsletter', batch_id: 'b-1' };
    const res = await post({ token: 't' });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/batch/i);
    expect(mocks.rpcCalls).toHaveLength(0);
  });

  it('publishes a post and revalidates the blog in-process', async () => {
    mocks.tokenRow = { draft_kind: 'post', batch_id: null };
    mocks.rpcResults.approve_and_publish = {
      data: [{ slug: 'knee-pain-stairs', already: false }],
      error: null,
    };

    const res = await post({ token: 't' });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      ok: true,
      already: false,
      slug: 'knee-pain-stairs',
    });

    expect(mocks.rpcCalls[0].fn).toBe('approve_and_publish');
    expect(mocks.revalidated).toEqual([
      'tag:blog',
      'tag:blog:knee-pain-stairs',
      'path:/insights/knee-pain-stairs',
      'path:/insights',
    ]);
  });

  it('reports a second post tap as already, without erroring', async () => {
    mocks.tokenRow = { draft_kind: 'post', batch_id: null };
    mocks.rpcResults.approve_and_publish = {
      data: [{ slug: 'knee-pain-stairs', already: true }],
      error: null,
    };

    const res = await post({ token: 't' });
    expect(res.status).toBe(200);
    expect((await res.json()).already).toBe(true);
  });

  it('surfaces an expired token as 409, not 500', async () => {
    mocks.tokenRow = { draft_kind: 'post', batch_id: null };
    mocks.rpcResults.approve_and_publish = {
      data: null,
      error: { message: 'approve_and_publish: token expired' },
    };

    const res = await post({ token: 't' });
    expect(res.status).toBe(409);
  });

  it('creates, fills and sends a newsletter, then marks it sent', async () => {
    mocks.tokenRow = { draft_kind: 'newsletter', batch_id: null };
    mocks.rpcResults.claim_for_send = {
      data: [
        {
          draft_id: 'd-1',
          subject: 'Stairs',
          body_html: '<p><a href="https://x.com">read</a></p>',
          list_id: 'f531604a9a',
          segment_id: null,
          already: false,
        },
      ],
      error: null,
    };

    const res = await post({ token: 't' });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      ok: true,
      already: false,
      campaignId: 'campaign-1',
    });

    expect(mocks.mailchimpCalls).toEqual(['create', 'content', 'send']);
    expect(mocks.rpcCalls.map((c) => c.fn)).toEqual(['claim_for_send', 'mark_sent']);
    expect(mocks.rpcCalls[1].args.p_campaign_id).toBe('campaign-1');
  });

  it('does not touch Mailchimp when the claim reports already', async () => {
    mocks.tokenRow = { draft_kind: 'newsletter', batch_id: null };
    mocks.rpcResults.claim_for_send = {
      data: [{ draft_id: 'd-1', already: true }],
      error: null,
    };

    const res = await post({ token: 't' });
    expect(res.status).toBe(200);
    expect((await res.json()).already).toBe(true);
    expect(mocks.mailchimpCalls).toEqual([]);
  });

  it('ROOT CAUSE 1: releases the draft when the send throws', async () => {
    mocks.tokenRow = { draft_kind: 'newsletter', batch_id: null };
    mocks.rpcResults.claim_for_send = {
      data: [
        {
          draft_id: 'd-1',
          subject: 'Stairs',
          body_html: '<p>x</p>',
          list_id: 'f531604a9a',
          segment_id: null,
          already: false,
        },
      ],
      error: null,
    };
    mocks.sendThrows = new Error('Mailchimp 504');

    const res = await post({ token: 't' });
    expect(res.status).toBe(502);

    const fns = mocks.rpcCalls.map((c) => c.fn);
    expect(fns).toEqual(['claim_for_send', 'release_for_retry']);
    expect(fns).not.toContain('mark_sent');
    expect(mocks.rpcCalls[1].args.p_error).toMatch(/504/);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run tests/api/approve.test.ts`
Expected: FAIL — the current route reads `N8N_RESUME_WEBHOOK_URL` and returns 500 "approval is not configured yet".

- [ ] **Step 3: Rewrite the route**

Replace `app/api/approve/route.ts` entirely:

```ts
/**
 * POST /api/approve — the site does the irreversible thing.
 *
 * This used to forward to N8N_RESUME_WEBHOOK_URL and let a 62-node workflow
 * decide what happened next. It now calls the site RPCs directly. Decision 3:
 * the agent proposes, the site acts.
 *
 * `kind` from the client is IGNORED. The approval_tokens row is authoritative,
 * exactly as app/approve/page.tsx already treats it, so a tampered query param
 * cannot make the page render one thing and this route do another.
 *
 * The newsletter path is the reason release_for_retry exists: if Mailchimp
 * throws anywhere between the claim and the send, the draft goes back to
 * 'approved' and the same link works again. Under n8n the token was already
 * burnt at that point and the draft was stranded forever — three of them still
 * are.
 */
import { NextResponse } from 'next/server';
import { revalidateTag, revalidatePath } from 'next/cache';
import type { SupabaseClient } from '@supabase/supabase-js';

import { getAdminClient } from '@/lib/supabase/admin';
import {
  createCampaign,
  setCampaignContent,
  sendCampaign,
} from '@/lib/mailchimp/campaigns';

type PublishRow = { slug: string; already: boolean };
type ClaimRow = {
  draft_id: string;
  subject: string;
  body_html: string;
  list_id: string;
  segment_id: string | null;
  already: boolean;
};

async function publishPost(admin: SupabaseClient, token: string) {
  const { data, error } = await admin.rpc('approve_and_publish', { p_token: token });
  if (error) {
    console.error(`[approve] approve_and_publish: ${error.message}`);
    return NextResponse.json({ error: error.message }, { status: 409 });
  }

  const row = (data as PublishRow[] | null)?.[0];
  if (!row?.slug) {
    return NextResponse.json({ error: 'publish returned nothing' }, { status: 502 });
  }

  // In-process, so publishing no longer depends on a second HTTP hop to
  // /api/revalidate with a shared secret. 'max' matches app/api/revalidate.
  revalidateTag('blog', 'max');
  revalidateTag(`blog:${row.slug}`, 'max');
  revalidatePath(`/insights/${row.slug}`);
  revalidatePath('/insights');

  return NextResponse.json({ ok: true, already: row.already, slug: row.slug });
}

async function sendNewsletter(admin: SupabaseClient, token: string) {
  const { data, error } = await admin.rpc('claim_for_send', { p_token: token });
  if (error) {
    console.error(`[approve] claim_for_send: ${error.message}`);
    return NextResponse.json({ error: error.message }, { status: 409 });
  }

  const claim = (data as ClaimRow[] | null)?.[0];
  if (!claim) {
    return NextResponse.json({ error: 'claim returned nothing' }, { status: 502 });
  }
  if (claim.already) {
    return NextResponse.json({ ok: true, already: true });
  }

  // claim_for_send deliberately does not carry preview_text — its contract is
  // "everything needed to send". The preview line is part of what Nicole
  // approved though, so read it here rather than dropping it.
  const { data: extra } = await admin
    .from('newsletter_drafts')
    .select('preview_text')
    .eq('id', claim.draft_id)
    .maybeSingle();

  let campaignId: string;
  try {
    campaignId = await createCampaign({
      listId: claim.list_id,
      segmentId: claim.segment_id,
      subject: claim.subject,
      previewText: (extra as { preview_text: string | null } | null)?.preview_text ?? null,
      title: `Newsletter ${claim.draft_id}`,
    });
    await setCampaignContent(campaignId, claim.body_html);
    await sendCampaign(campaignId);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Mailchimp failed';
    // Release BEFORE answering. A 502 with the draft still in 'sending' is
    // root cause 1 rebuilt in TypeScript.
    await admin.rpc('release_for_retry', {
      p_draft_id: claim.draft_id,
      p_error: message,
    });
    console.error(`[approve] send failed, draft released: ${message}`);
    return NextResponse.json(
      { error: 'the send failed and the draft was released — open the link and try again' },
      { status: 502 },
    );
  }

  await admin.rpc('mark_sent', {
    p_draft_id: claim.draft_id,
    p_campaign_id: campaignId,
    p_sent_at: new Date().toISOString(),
  });

  return NextResponse.json({ ok: true, already: false, campaignId });
}

export async function POST(req: Request) {
  let body: { token?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid request' }, { status: 400 });
  }

  const token = body.token;
  if (!token) {
    return NextResponse.json({ error: 'missing token' }, { status: 400 });
  }

  const admin = getAdminClient();

  const { data: tokenRow, error } = await admin
    .from('approval_tokens')
    .select('draft_kind, batch_id')
    .eq('token_hash', token)
    .maybeSingle();

  if (error) {
    console.error(`[approve] token lookup failed: ${error.message}`);
    return NextResponse.json({ error: 'could not read the token' }, { status: 502 });
  }
  if (!tokenRow) {
    return NextResponse.json({ error: 'unknown token' }, { status: 404 });
  }
  if (tokenRow.batch_id) {
    return NextResponse.json(
      { error: 'this link approves a batch — open /approve/batch' },
      { status: 400 },
    );
  }

  if (tokenRow.draft_kind === 'post') return publishPost(admin, token);
  if (tokenRow.draft_kind === 'newsletter') return sendNewsletter(admin, token);

  return NextResponse.json({ error: 'unknown draft kind' }, { status: 400 });
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm vitest run tests/api/approve.test.ts`
Expected: PASS, 9 tests.

- [ ] **Step 5: Typecheck, full suite, commit**

```bash
pnpm typecheck && pnpm test
git add app/api/approve/route.ts tests/api/approve.test.ts
git commit -m "feat(approve): call the site RPCs directly, drop the n8n forward"
```

- [ ] **Step 6: Retire the n8n webhook variable**

`N8N_RESUME_WEBHOOK_URL` is now unreferenced. Leave it set on Vercel until the n8n workflow is archived (spec cutover, "after one clean cycle"), then remove it. Confirm nothing else reads it:

```bash
grep -rn "N8N_RESUME_WEBHOOK_URL" --include="*.ts" --include="*.tsx" .
```
Expected: no matches outside `.env.example` / docs.

---

### Task 10: FAQ blocks — the AI-citation win, reusing what the site already has

**Files:**
- Create: `lib/content/postFaq.ts`
- Create: `tests/content/post-faq.test.ts`
- Modify: `lib/content/posts.ts` (add `faq` to `Post` and `POST_COLUMNS`)
- Modify: `lib/content/approvals.ts` (add `faq` to the post draft)
- Modify: `app/insights/[slug]/page.tsx` (render the accordion + emit `FAQPage` JSON-LD)
- Modify: `app/approve/DraftPreview.tsx` (show the FAQ so it is not published unseen)

**Reuse note — this is why there is no `lib/content/faq.ts`:** `lib/content/faqs.ts` already exports `interface Faq { question; answer }` and `faqPageSchema(faqs)`, and `components/ui/FaqSection.tsx` already renders an accessible `<details>` accordion from `ReadonlyArray<Faq>`. Both are live on `/services` and `/services/vibrant40-jumpstart`. The DB shape is therefore `[{ "question": "...", "answer": "..." }]` — identical to `Faq` — and the only new code is a validating parser. A second FAQ shape and a second schema builder would be the drift that the header comment in `faqs.ts` explicitly exists to prevent.

**Interfaces:**
- Consumes: `posts.faq jsonb` from Task 1, written by `stage_post_draft` (Task 3).
- Produces: `parsePostFaq(value: unknown): Faq[]` from `@/lib/content/postFaq`. Total: returns `[]` for anything malformed and drops individual bad entries.

- [ ] **Step 1: Write the failing test**

`tests/content/post-faq.test.ts`:

```ts
/**
 * posts.faq is jsonb written by an LLM. It reaches the public site and the
 * structured data, so it is parsed defensively: a bad shape must render an
 * empty section, never crash /insights/[slug].
 */
import { describe, it, expect } from 'vitest';

import { parsePostFaq } from '@/lib/content/postFaq';
import { faqPageSchema } from '@/lib/content/faqs';

describe('parsePostFaq', () => {
  it('parses a well-formed array', () => {
    expect(
      parsePostFaq([
        { question: 'Is it arthritis?', answer: 'Usually not.' },
        { question: 'Should I stop stairs?', answer: 'No.' },
      ]),
    ).toEqual([
      { question: 'Is it arthritis?', answer: 'Usually not.' },
      { question: 'Should I stop stairs?', answer: 'No.' },
    ]);
  });

  it('returns [] for null, a string, an object, or a JSON string', () => {
    expect(parsePostFaq(null)).toEqual([]);
    expect(parsePostFaq('nope')).toEqual([]);
    expect(parsePostFaq({ question: 'a', answer: 'b' })).toEqual([]);
    expect(parsePostFaq(undefined)).toEqual([]);
  });

  it('drops entries missing a question or an answer instead of rendering blanks', () => {
    expect(
      parsePostFaq([
        { question: 'Good', answer: 'Yes' },
        { question: 'No answer' },
        { answer: 'No question' },
        { question: '   ', answer: 'blank' },
        'not an object',
        null,
      ]),
    ).toEqual([{ question: 'Good', answer: 'Yes' }]);
  });

  it('trims whitespace', () => {
    expect(parsePostFaq([{ question: '  Q  ', answer: '  A  ' }])).toEqual([
      { question: 'Q', answer: 'A' },
    ]);
  });

  it('feeds the existing faqPageSchema unchanged', () => {
    const schema = faqPageSchema(parsePostFaq([{ question: 'Q', answer: 'A' }]));
    expect(schema['@type']).toBe('FAQPage');
    expect(schema.mainEntity).toEqual([
      {
        '@type': 'Question',
        name: 'Q',
        acceptedAnswer: { '@type': 'Answer', text: 'A' },
      },
    ]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run tests/content/post-faq.test.ts`
Expected: FAIL — "Failed to resolve import '@/lib/content/postFaq'".

- [ ] **Step 3: Write the parser**

`lib/content/postFaq.ts`:

```ts
/**
 * posts.faq — jsonb, LLM-written, defensively parsed.
 *
 * The shape deliberately matches `Faq` in lib/content/faqs.ts, so a post's FAQ
 * feeds the SAME faqPageSchema() and the SAME <FaqSection /> that /services
 * uses. One shape, one schema builder, nothing to drift.
 *
 * Spec decision: the answer-first format emits a FAQPage JSON-LD block, which
 * is most of the AI-citation win the 6-Week plan doc is after.
 */
import type { Faq } from '@/lib/content/faqs';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Total. Anything that is not a clean {question, answer} pair is dropped. */
export function parsePostFaq(value: unknown): Faq[] {
  if (!Array.isArray(value)) return [];

  const out: Faq[] = [];
  for (const entry of value) {
    if (!isRecord(entry)) continue;
    const { question, answer } = entry;
    if (typeof question !== 'string' || typeof answer !== 'string') continue;

    const q = question.trim();
    const a = answer.trim();
    if (q === '' || a === '') continue;

    out.push({ question: q, answer: a });
  }
  return out;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm vitest run tests/content/post-faq.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 5: Carry `faq` through the loaders**

In `lib/content/posts.ts`, add to the `Post` type (after `hero_image_url`):

```ts
  faq: unknown;
```

and extend `POST_COLUMNS`:

```ts
const POST_COLUMNS =
  'slug, title, body_md, seo_title, meta_description, category, keyword, hero_image_url, faq, published_at, created_at';
```

`unknown` on purpose: it is raw jsonb until `parsePostFaq` has looked at it, and typing it `Faq[]` here would be a lie the renderer then trusts.

In `lib/content/approvals.ts`, add `faq: unknown;` to the `post` variant of `ApprovalDraft`, add `faq` to the select list, and add `faq: data.faq ?? []` to the returned object. The existing test asserts the select list covers everything that publishes — `tests/content/approvals.test.ts` will fail until the column is in the string, which is the intended nudge.

- [ ] **Step 6: Render it on the public post**

In `app/insights/[slug]/page.tsx`:

```ts
import { FaqSection } from '@/components/ui/FaqSection';
import { faqPageSchema } from '@/lib/content/faqs';
import { parsePostFaq } from '@/lib/content/postFaq';
```

Inside `PostPage`, after `const url = ...`:

```ts
  const faqs = parsePostFaq(post.faq);
```

Then emit the second JSON-LD block next to the existing `BlogPosting` one:

```tsx
      {faqs.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqPageSchema(faqs)) }}
        />
      )}
```

and render the accordion between `<LessonBody />` and the CTA block:

```tsx
          {faqs.length > 0 && <FaqSection items={faqs} className="mt-12" />}
```

- [ ] **Step 7: Show it in the approval preview**

In `app/approve/DraftPreview.tsx`, import `parsePostFaq` and `FaqSection`, then render inside the post branch, after `<LessonBody />`:

```tsx
        {(() => {
          const faqs = parsePostFaq(draft.faq);
          return faqs.length > 0 ? <FaqSection items={faqs} className="mt-10" /> : null;
        })()}
```

"Nothing ships unseen" is a hard rule and the FAQ block publishes under Nicole's name into her structured data. If it is not in the preview it is not seen.

- [ ] **Step 8: Typecheck, full suite, commit**

```bash
pnpm typecheck && pnpm test
git add lib/content/postFaq.ts tests/content/post-faq.test.ts lib/content/posts.ts \
        lib/content/approvals.ts "app/insights/[slug]/page.tsx" app/approve/DraftPreview.tsx
git commit -m "feat(posts): FAQ blocks on the post, in the schema, and in the preview"
```

---

### Task 11: Batch approval — one token, one sitting, N launch emails

**Files:**
- Create: `lib/content/batch.ts`
- Create: `tests/content/batch.test.ts`
- Create: `app/approve/batch/page.tsx`
- Create: `app/approve/batch/BatchClient.tsx`
- Create: `app/api/approve/batch/route.ts`
- Modify: `lib/content/approvals.ts` (add the `batch` rejection)
- Modify: `app/approve/page.tsx` (redirect a batch token to the batch page)

**Interfaces:**
- Consumes: `approve_batch` (Task 7), `createCampaign` / `setCampaignContent` / `scheduleCampaign` (Task 8), the shared batch token from `stage_newsletter_draft` (Task 4).
- Produces:
  - `resolveBatchToken(token: string): Promise<BatchResolution>` from `@/lib/content/batch`, where
    `BatchResolution = { ok: true; drafts: BatchDraft[] } | { ok: false; reason: ApprovalRejection }` and
    `BatchDraft = { id: string; subject: string; preview_text: string | null; body_html: string; scheduled_for: string | null }`
  - `POST /api/approve/batch` accepting `{ token }`, answering `{ ok: true; scheduled: number; skipped: number }`
  - `ApprovalRejection` gains `'batch'`

Decision 7 in one sentence: token expiry has killed two cycles at a monthly cadence, and a 14-day cart window cannot absorb a missed tap — so the launch emails are read once, approved once, and parked in Mailchimp.

- [ ] **Step 1: Write the failing test**

`tests/content/batch.test.ts`:

```ts
/**
 * lib/content/batch — resolve a batch token into the drafts it authorises.
 *
 * Admin client mocked, same posture as tests/content/approvals.test.ts.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  tokenRow: null as Record<string, unknown> | null,
  tokenError: null as { message: string } | null,
  drafts: [] as Record<string, unknown>[],
  draftsError: null as { message: string } | null,
  selects: [] as { table: string; columns: string }[],
}));

vi.mock('@/lib/supabase/admin', () => ({
  getAdminClient: () => ({
    from(table: string) {
      return {
        select(columns: string) {
          mocks.selects.push({ table, columns });
          return {
            eq() {
              return {
                maybeSingle: async () => ({
                  data: mocks.tokenRow,
                  error: mocks.tokenError,
                }),
                order: async () => ({ data: mocks.drafts, error: mocks.draftsError }),
              };
            },
          };
        },
      };
    },
  }),
}));

const { resolveBatchToken } = await import('@/lib/content/batch');

const FUTURE = new Date(Date.now() + 7 * 86400_000).toISOString();
const PAST = new Date(Date.now() - 60_000).toISOString();

beforeEach(() => {
  mocks.tokenRow = null;
  mocks.tokenError = null;
  mocks.drafts = [];
  mocks.draftsError = null;
  mocks.selects = [];
});

describe('resolveBatchToken', () => {
  it('rejects an empty token without touching the database', async () => {
    expect(await resolveBatchToken('')).toEqual({ ok: false, reason: 'missing' });
    expect(mocks.selects).toHaveLength(0);
  });

  it('rejects an unknown token', async () => {
    expect(await resolveBatchToken('t')).toEqual({ ok: false, reason: 'missing' });
  });

  it('rejects a single-draft token — that link belongs on /approve', async () => {
    mocks.tokenRow = { batch_id: null, used: false, expires_at: FUTURE };
    expect(await resolveBatchToken('t')).toEqual({ ok: false, reason: 'missing' });
  });

  it('reports used before expired, matching resolveApprovalToken', async () => {
    mocks.tokenRow = { batch_id: 'b-1', used: true, expires_at: PAST };
    expect(await resolveBatchToken('t')).toEqual({ ok: false, reason: 'used' });
  });

  it('rejects an expired token', async () => {
    mocks.tokenRow = { batch_id: 'b-1', used: false, expires_at: PAST };
    expect(await resolveBatchToken('t')).toEqual({ ok: false, reason: 'expired' });
  });

  it('returns every draft in the batch, in send order', async () => {
    mocks.tokenRow = { batch_id: 'b-1', used: false, expires_at: FUTURE };
    mocks.drafts = [
      {
        id: 'd-1',
        subject: 'Doors open',
        preview_text: 'Cart is live',
        body_html: '<p><a href="https://x.com">join</a></p>',
        scheduled_for: '2026-09-28T16:00:00Z',
      },
      {
        id: 'd-2',
        subject: 'Last call',
        preview_text: null,
        body_html: '<p><a href="https://x.com">join</a></p>',
        scheduled_for: '2026-10-11T16:00:00Z',
      },
    ];

    const res = await resolveBatchToken('t');
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.drafts.map((d) => d.subject)).toEqual(['Doors open', 'Last call']);

    // The preview must carry everything that goes out, same rule as /approve.
    const draftSelect = mocks.selects.find((s) => s.table === 'newsletter_drafts')!;
    for (const column of ['subject', 'preview_text', 'body_html', 'scheduled_for']) {
      expect(draftSelect.columns).toContain(column);
    }
  });

  it('rejects a batch whose drafts have vanished', async () => {
    mocks.tokenRow = { batch_id: 'b-1', used: false, expires_at: FUTURE };
    mocks.drafts = [];
    expect(await resolveBatchToken('t')).toEqual({ ok: false, reason: 'missing' });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run tests/content/batch.test.ts`
Expected: FAIL — "Failed to resolve import '@/lib/content/batch'".

- [ ] **Step 3: Write the resolver**

`lib/content/batch.ts`:

```ts
/**
 * Batch approval token resolution — server only.
 *
 * Decision 7: launch emails are batch-approved up front and scheduled in
 * Mailchimp. One batch_id, one token, one review sitting, no per-send tap.
 * Token expiry has killed two cycles at a monthly cadence and a 14-day cart
 * window cannot absorb a missed tap.
 *
 * The token is the RAW string in approval_tokens.token_hash — see the note at
 * the top of lib/content/approvals.ts. Do not add hashing.
 */
import { getAdminClient } from '@/lib/supabase/admin';
import type { ApprovalRejection } from '@/lib/content/approvals';

export type BatchDraft = {
  id: string;
  subject: string;
  preview_text: string | null;
  body_html: string;
  scheduled_for: string | null;
};

export type BatchResolution =
  | { ok: true; drafts: BatchDraft[] }
  | { ok: false; reason: ApprovalRejection };

const reject = (reason: ApprovalRejection): BatchResolution => ({ ok: false, reason });

export async function resolveBatchToken(token: string): Promise<BatchResolution> {
  if (!token) return reject('missing');

  const admin = getAdminClient();

  const { data: tokenRow, error } = await admin
    .from('approval_tokens')
    .select('batch_id, used, expires_at')
    .eq('token_hash', token)
    .maybeSingle();

  if (error) {
    console.error(`[batch] token lookup failed: ${error.message}`);
    return reject('missing');
  }
  if (!tokenRow) return reject('missing');
  // A single-draft token on this page is a wrong link, not an expired one.
  if (!tokenRow.batch_id) return reject('missing');

  // used before expires_at, same ordering and same reason as resolveApprovalToken.
  if (tokenRow.used) return reject('used');
  if (new Date(tokenRow.expires_at).getTime() <= Date.now()) return reject('expired');

  const { data, error: draftsError } = await admin
    .from('newsletter_drafts')
    .select('id, subject, preview_text, body_html, scheduled_for')
    .eq('batch_id', tokenRow.batch_id)
    .order('scheduled_for', { ascending: true, nullsFirst: false });

  if (draftsError) {
    console.error(`[batch] draft load failed: ${draftsError.message}`);
    return reject('missing');
  }
  if (!data || data.length === 0) return reject('missing');

  return { ok: true, drafts: data as BatchDraft[] };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm vitest run tests/content/batch.test.ts`
Expected: PASS, 7 tests.

- [ ] **Step 5: Route a batch token off `/approve`**

In `lib/content/approvals.ts`:

```ts
export type ApprovalRejection = 'missing' | 'used' | 'expired' | 'batch';
```

add `batch_id` to the token select, and immediately after the `if (!tokenRow) return reject('missing');` line:

```ts
  // A batch token authorises N drafts and has no draft_id. /approve cannot
  // render it; the page turns this into a redirect to /approve/batch.
  if (tokenRow.batch_id) return reject('batch');
```

In `app/approve/page.tsx`, add the import and the redirect:

```ts
import { redirect } from 'next/navigation';
```

```ts
    const resolution = await resolveApprovalToken(token);
    if (!resolution.ok) {
      if (resolution.reason === 'batch') {
        redirect(`/approve/batch?token=${encodeURIComponent(token)}`);
      }
      content = <Message {...REJECTION_COPY[resolution.reason]} />;
    } else {
```

and add the key `REJECTION_COPY` now needs for the type to be complete (unreachable after the redirect, but the record must be total):

```ts
  batch: {
    title: 'Opening your launch emails',
    body: 'This link covers several emails at once. One moment.',
  },
```

- [ ] **Step 6: Build the batch page**

`app/approve/batch/page.tsx`:

```tsx
/**
 * /approve/batch — read every launch email, then approve them all at once.
 *
 * Decision 7. Nicole reads N emails in one sitting and presses once; the
 * campaigns are created and scheduled in Mailchimp, so the sends no longer
 * depend on her being reachable on the day.
 *
 * "Nothing ships unseen" is unchanged: every body is rendered here, in the
 * same sandboxed iframe /approve uses.
 */
import type { Metadata } from 'next';

import { Nav } from '@/components/layout/Nav';
import { Footer } from '@/components/layout/Footer';
import { resolveBatchToken } from '@/lib/content/batch';

import { BatchClient } from './BatchClient';

export const metadata: Metadata = {
  title: 'Approve launch emails',
  robots: { index: false },
};

export const dynamic = 'force-dynamic';

function formatWhen(iso: string | null): string {
  if (!iso) return 'No send time set';
  return new Date(iso).toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/Los_Angeles',
  });
}

export default async function ApproveBatchPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const resolution = token
    ? await resolveBatchToken(token)
    : ({ ok: false, reason: 'missing' } as const);

  return (
    <>
      <Nav />
      <main className="bg-bg">
        <section className="mx-auto max-w-2xl px-6 pt-32 md:pt-40 pb-24">
          {!resolution.ok ? (
            <div className="text-center">
              <h1 className="font-serif text-3xl text-ink mb-4">
                {resolution.reason === 'used'
                  ? 'These are already approved'
                  : "We can't open this batch"}
              </h1>
              <p className="text-inkSoft">
                {resolution.reason === 'used'
                  ? 'Nothing more to do here. The emails are scheduled.'
                  : 'Text Eliahs and he will send a fresh link.'}
              </p>
            </div>
          ) : (
            <>
              <h1 className="font-serif text-3xl text-ink mb-2 text-center">
                {resolution.drafts.length} launch emails
              </h1>
              <p className="text-inkSoft mb-10 text-center">
                Read them all. One press schedules every one of them.
              </p>

              {resolution.drafts.map((draft, i) => (
                <article key={draft.id} className="mb-12 text-left">
                  <p className="text-xs font-semibold uppercase tracking-wide text-grayDeep mb-1">
                    {i + 1} of {resolution.drafts.length} · {formatWhen(draft.scheduled_for)} PT
                  </p>
                  <h2 className="font-serif text-2xl text-ink mb-2">{draft.subject}</h2>
                  {draft.preview_text && (
                    <p className="text-sm text-inkSoft mb-4">
                      Preview text: {draft.preview_text}
                    </p>
                  )}
                  <iframe
                    title={`Launch email ${i + 1}`}
                    srcDoc={draft.body_html}
                    sandbox=""
                    className="w-full h-[60vh] rounded-2xl border border-inkFaint bg-white"
                  />
                </article>
              ))}

              <BatchClient token={token!} count={resolution.drafts.length} />
            </>
          )}
        </section>
      </main>
      <Footer />
    </>
  );
}
```

`app/approve/batch/BatchClient.tsx`:

```tsx
'use client';

/**
 * The one press that schedules the whole batch.
 *
 * Two presses, not one, for the same reason a single newsletter takes two:
 * this arms real sends to the full list and cannot be recalled from here.
 * Cancelling afterwards means /queue.
 */
import { useState } from 'react';

import { Pill } from '@/components/ui/Pill';
import { NEWSLETTER_AUDIENCE_APPROX } from '@/app/approve/approval-state';

type State = 'idle' | 'confirming' | 'working' | 'done' | 'error';

export function BatchClient({ token, count }: { token: string; count: number }) {
  const [state, setState] = useState<State>('idle');
  const [message, setMessage] = useState('');

  async function submit() {
    try {
      const res = await fetch('/api/approve/batch', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Request failed (${res.status})`);
      }
      setState('done');
    } catch (err) {
      setState('error');
      setMessage(err instanceof Error ? err.message : 'Something went wrong.');
    }
  }

  if (state === 'done') {
    return (
      <div className="text-center">
        <h2 className="font-serif text-3xl text-ink mb-4">Scheduled 🎉</h2>
        <p className="text-inkSoft">
          All {count} emails are queued in Mailchimp. You can close this tab.
        </p>
      </div>
    );
  }

  return (
    <div className="text-center">
      {state === 'confirming' && (
        <p className="mx-auto mb-6 max-w-md rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          This schedules {count} emails to roughly{' '}
          {NEWSLETTER_AUDIENCE_APPROX.toLocaleString('en-US')} people each. They
          will send on their own at the times listed above.
        </p>
      )}

      <Pill
        variant="orchid"
        size="lg"
        disabled={state === 'working'}
        onClick={() => {
          if (state === 'working') return;
          if (state === 'idle') {
            setState('confirming');
            return;
          }
          setState('working');
          void submit();
        }}
      >
        {state === 'working'
          ? 'Scheduling…'
          : state === 'confirming'
            ? `Yes, schedule all ${count}`
            : state === 'error'
              ? 'Try again'
              : `Review done — schedule ${count} emails`}
      </Pill>

      {state === 'error' && (
        <p className="mt-6 text-sm text-red-600">
          {message}. Please try again, or text Eliahs if it keeps failing.
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 7: Build the batch route**

`app/api/approve/batch/route.ts`:

```ts
/**
 * POST /api/approve/batch — approve N drafts and park N campaigns in Mailchimp.
 *
 * Retry-safe by construction. approve_batch claims the token once but always
 * returns the full batch, and this route skips any draft that already carries
 * a mailchimp_campaign_id. So a partial failure — three created, then a 504 —
 * is fixed by pressing the button again, not by a rescue.
 *
 * scheduled_sends rows are written with the service-role client rather than
 * through an RPC: recording what was just scheduled is bookkeeping, not an
 * irreversible act, and the site already writes tables this way (lib/actions/idea.ts).
 */
import { NextResponse } from 'next/server';

import { getAdminClient } from '@/lib/supabase/admin';
import {
  createCampaign,
  setCampaignContent,
  scheduleCampaign,
} from '@/lib/mailchimp/campaigns';

type Draft = {
  id: string;
  subject: string;
  preview_text: string | null;
  body_html: string;
  list_id: string;
  segment_id: string | null;
  scheduled_for: string | null;
  mailchimp_campaign_id: string | null;
};

export async function POST(req: Request) {
  let body: { token?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid request' }, { status: 400 });
  }
  if (!body.token) {
    return NextResponse.json({ error: 'missing token' }, { status: 400 });
  }

  const admin = getAdminClient();

  const { data, error } = await admin.rpc('approve_batch', { p_token: body.token });
  if (error) {
    console.error(`[approve/batch] approve_batch: ${error.message}`);
    return NextResponse.json({ error: error.message }, { status: 409 });
  }

  const drafts = (data as Draft[] | null) ?? [];
  if (drafts.length === 0) {
    return NextResponse.json({ error: 'the batch is empty' }, { status: 404 });
  }

  const undated = drafts.filter((d) => !d.mailchimp_campaign_id && !d.scheduled_for);
  if (undated.length > 0) {
    return NextResponse.json(
      {
        error: `these have no send time: ${undated.map((d) => d.subject).join(', ')}`,
      },
      { status: 422 },
    );
  }

  let scheduled = 0;
  let skipped = 0;

  for (const draft of drafts) {
    if (draft.mailchimp_campaign_id) {
      skipped += 1;
      continue;
    }
    try {
      const campaignId = await createCampaign({
        listId: draft.list_id,
        segmentId: draft.segment_id,
        subject: draft.subject,
        previewText: draft.preview_text,
        title: `Launch ${draft.subject}`,
      });
      await setCampaignContent(campaignId, draft.body_html);
      await scheduleCampaign(campaignId, new Date(draft.scheduled_for!));

      await admin
        .from('newsletter_drafts')
        .update({ mailchimp_campaign_id: campaignId })
        .eq('id', draft.id);

      await admin.from('scheduled_sends').insert({
        newsletter_draft_id: draft.id,
        mailchimp_campaign_id: campaignId,
        list_id: draft.list_id,
        segment_id: draft.segment_id,
        scheduled_for: draft.scheduled_for,
      });

      scheduled += 1;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Mailchimp failed';
      console.error(`[approve/batch] "${draft.subject}": ${message}`);
      return NextResponse.json(
        {
          error: `scheduled ${scheduled} of ${drafts.length}, then "${draft.subject}" failed: ${message}. Press again to finish the rest.`,
        },
        { status: 502 },
      );
    }
  }

  return NextResponse.json({ ok: true, scheduled, skipped });
}
```

- [ ] **Step 8: Typecheck, full suite, commit**

```bash
pnpm typecheck && pnpm test
git add lib/content/batch.ts tests/content/batch.test.ts lib/content/approvals.ts \
        app/approve/page.tsx app/approve/batch/ app/api/approve/batch/route.ts
git commit -m "feat(approve): batch approval schedules N launch campaigns on one token"
```

---

### Task 12: `/queue` — the forensics n8n could never do

**Files:**
- Create: `lib/actions/queue.ts`
- Create: `tests/actions/queue.test.ts`
- Create: `app/queue/page.tsx`
- Create: `app/queue/QueueClient.tsx`

**Interfaces:**
- Consumes: `pipeline_runs` and `scheduled_sends` (Task 1), `cancel_scheduled_send` (Task 7), `unscheduleCampaign` (Task 8).
- Produces, from `@/lib/actions/queue`:
  - `loadQueueAction(key: string): Promise<QueueResult>` where
    `QueueResult = { ok: true; runs: RunRow[]; sends: SendRow[] } | { ok: false; error: 'bad_key' | 'rate_limited' | 'server' }`
  - `cancelScheduledSendAction(key: string, id: string, reason: string): Promise<CancelResult>` where
    `CancelResult = { ok: true } | { ok: false; error: 'bad_key' | 'rate_limited' | 'server' | 'mailchimp' }`

**The ordering that matters:** Mailchimp is unscheduled **first**; the row is marked cancelled only after that succeeds. A row that says `cancelled` while the campaign is still armed is the one failure direction that actually sends an email nobody meant to send. The reverse — Mailchimp unscheduled but the row still `queued` — is visible on this page and harmless.

- [ ] **Step 1: Write the failing test**

`tests/actions/queue.test.ts`:

```ts
/**
 * /queue server actions — passcode gate and the cancel ordering.
 *
 * The ordering assertion is the point of this file: unschedule in Mailchimp,
 * THEN mark the row cancelled. Reversed, a Mailchimp failure leaves a row
 * claiming a campaign is cancelled while it is still armed to send.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  order: [] as string[],
  runs: [] as unknown[],
  sends: [] as unknown[],
  sendRow: null as Record<string, unknown> | null,
  unscheduleThrows: null as Error | null,
  rpcCalls: [] as { fn: string; args: Record<string, unknown> }[],
}));

vi.mock('@/lib/supabase/admin', () => ({
  getAdminClient: () => ({
    from(table: string) {
      const result =
        table === 'pipeline_runs'
          ? { data: mocks.runs, error: null }
          : { data: mocks.sends, error: null };
      const builder = {
        select: () => builder,
        eq: () => builder,
        order: () => builder,
        limit: async () => result,
        maybeSingle: async () => ({ data: mocks.sendRow, error: null }),
      };
      return builder;
    },
    async rpc(fn: string, args: Record<string, unknown>) {
      mocks.order.push('rpc');
      mocks.rpcCalls.push({ fn, args });
      return { data: { status: 'cancelled' }, error: null };
    },
  }),
}));

vi.mock('@/lib/mailchimp/campaigns', () => ({
  unscheduleCampaign: async () => {
    mocks.order.push('unschedule');
    if (mocks.unscheduleThrows) throw mocks.unscheduleThrows;
  },
}));

vi.mock('next/headers', () => ({
  headers: async () => new Map([['x-forwarded-for', '127.0.0.1']]),
}));

const { loadQueueAction, cancelScheduledSendAction } = await import('@/lib/actions/queue');
const { _resetCache } = await import('@/lib/rate-limit');

beforeEach(() => {
  _resetCache();
  process.env.QUEUE_KEY = 'letmein';
  mocks.order = [];
  mocks.runs = [];
  mocks.sends = [];
  mocks.sendRow = { id: 's-1', mailchimp_campaign_id: 'c-1' };
  mocks.unscheduleThrows = null;
  mocks.rpcCalls = [];
});

describe('loadQueueAction', () => {
  it('refuses a wrong passcode without reading anything', async () => {
    const res = await loadQueueAction('nope');
    expect(res).toEqual({ ok: false, error: 'bad_key' });
  });

  it('returns runs and sends on the right passcode', async () => {
    mocks.runs = [{ id: 'r-1', kind: 'weekly', status: 'ok' }];
    mocks.sends = [{ id: 's-1', status: 'queued' }];

    const res = await loadQueueAction('letmein');
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.runs).toHaveLength(1);
    expect(res.sends).toHaveLength(1);
  });

  it('rate limits repeated guesses', async () => {
    for (let i = 0; i < 10; i += 1) await loadQueueAction('nope');
    const res = await loadQueueAction('letmein');
    expect(res).toEqual({ ok: false, error: 'rate_limited' });
  });
});

describe('cancelScheduledSendAction', () => {
  it('refuses a wrong passcode', async () => {
    const res = await cancelScheduledSendAction('nope', 's-1', 'seats sold');
    expect(res).toEqual({ ok: false, error: 'bad_key' });
    expect(mocks.order).toEqual([]);
  });

  it('unschedules in Mailchimp BEFORE marking the row cancelled', async () => {
    const res = await cancelScheduledSendAction('letmein', 's-1', 'seats sold');
    expect(res).toEqual({ ok: true });
    expect(mocks.order).toEqual(['unschedule', 'rpc']);
    expect(mocks.rpcCalls[0].fn).toBe('cancel_scheduled_send');
    expect(mocks.rpcCalls[0].args.p_reason).toBe('seats sold');
  });

  it('leaves the row alone when Mailchimp refuses the unschedule', async () => {
    mocks.unscheduleThrows = new Error('Mailchimp 500');

    const res = await cancelScheduledSendAction('letmein', 's-1', 'seats sold');
    expect(res).toEqual({ ok: false, error: 'mailchimp' });
    expect(mocks.order).toEqual(['unschedule']);
    expect(mocks.rpcCalls).toHaveLength(0);
  });

  it('errors when the send row is unknown', async () => {
    mocks.sendRow = null;
    const res = await cancelScheduledSendAction('letmein', 's-9', 'x');
    expect(res).toEqual({ ok: false, error: 'server' });
    expect(mocks.order).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run tests/actions/queue.test.ts`
Expected: FAIL — "Failed to resolve import '@/lib/actions/queue'".

- [ ] **Step 3: Write the actions**

`lib/actions/queue.ts`:

```ts
'use server';

/**
 * /queue — the run log and the scheduled sends.
 *
 * pipeline_runs is the single thing n8n Cloud could not do: it retains only
 * the last few executions, so both August deadlocks needed a full diagnostic
 * session to reconstruct. "What happened last Monday" is answerable here
 * months later.
 *
 * Decision 8: the daily agent DETECTS a stale scheduled send and pushes
 * Eliahs. It cannot unschedule. Cancelling is a human pressing the button
 * below, which is the only place in the system that can.
 */
import { headers } from 'next/headers';

import { checkRateLimit } from '@/lib/rate-limit';
import { getAdminClient } from '@/lib/supabase/admin';
import { unscheduleCampaign } from '@/lib/mailchimp/campaigns';

export type RunRow = {
  id: string;
  kind: string;
  status: string;
  attempt: number;
  started_at: string;
  finished_at: string | null;
  error: string | null;
};

export type SendRow = {
  id: string;
  mailchimp_campaign_id: string;
  list_id: string;
  segment_id: string | null;
  scheduled_for: string;
  status: string;
  cancelled_reason: string | null;
};

type Denial = 'bad_key' | 'rate_limited' | 'server';

export type QueueResult =
  | { ok: true; runs: RunRow[]; sends: SendRow[] }
  | { ok: false; error: Denial };

export type CancelResult = { ok: true } | { ok: false; error: Denial | 'mailchimp' };

/** Rate limit first, then passcode, so guesses get throttled (mirrors bankIdeaAction). */
async function gate(key: string): Promise<Denial | null> {
  const headersList = await headers();
  const forwarded = headersList.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : '127.0.0.1';

  if (!checkRateLimit(`queue:${ip}`, { maxTries: 10, windowMs: 60_000 })) {
    return 'rate_limited';
  }
  if (!process.env.QUEUE_KEY || key !== process.env.QUEUE_KEY) return 'bad_key';
  return null;
}

export async function loadQueueAction(key: string): Promise<QueueResult> {
  const denied = await gate(key);
  if (denied) return { ok: false, error: denied };

  const admin = getAdminClient();

  const runs = await admin
    .from('pipeline_runs')
    .select('id, kind, status, attempt, started_at, finished_at, error')
    .order('started_at', { ascending: false })
    .limit(50);

  const sends = await admin
    .from('scheduled_sends')
    .select('id, mailchimp_campaign_id, list_id, segment_id, scheduled_for, status, cancelled_reason')
    .order('scheduled_for', { ascending: true })
    .limit(50);

  if (runs.error || sends.error) {
    console.error(`[queue] load failed: ${runs.error?.message ?? sends.error?.message}`);
    return { ok: false, error: 'server' };
  }

  return {
    ok: true,
    runs: (runs.data ?? []) as RunRow[],
    sends: (sends.data ?? []) as SendRow[],
  };
}

export async function cancelScheduledSendAction(
  key: string,
  id: string,
  reason: string,
): Promise<CancelResult> {
  const denied = await gate(key);
  if (denied) return { ok: false, error: denied };

  const admin = getAdminClient();

  const { data: row, error } = await admin
    .from('scheduled_sends')
    .select('id, mailchimp_campaign_id')
    .eq('id', id)
    .maybeSingle();

  if (error || !row) {
    console.error(`[queue] unknown scheduled send ${id}`);
    return { ok: false, error: 'server' };
  }

  // ORDER IS THE WHOLE POINT. Mailchimp first. If this throws we have changed
  // nothing, and the row still reads 'queued', which is true. Marking the row
  // first and failing here would leave a row saying 'cancelled' about a
  // campaign that is still armed to send.
  try {
    await unscheduleCampaign(row.mailchimp_campaign_id as string);
  } catch (err) {
    console.error(
      `[queue] unschedule failed: ${err instanceof Error ? err.message : 'unknown'}`,
    );
    return { ok: false, error: 'mailchimp' };
  }

  const { error: rpcError } = await admin.rpc('cancel_scheduled_send', {
    p_id: id,
    p_reason: reason,
  });

  if (rpcError) {
    console.error(`[queue] cancel_scheduled_send: ${rpcError.message}`);
    return { ok: false, error: 'server' };
  }

  return { ok: true };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm vitest run tests/actions/queue.test.ts`
Expected: PASS, 7 tests.

- [ ] **Step 5: Build the page**

`app/queue/page.tsx`:

```tsx
import type { Metadata } from 'next';

import { QueueClient } from './QueueClient';

export const metadata: Metadata = {
  title: 'Pipeline queue',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

/**
 * /queue — Eliahs's forensics surface. Unlisted, noindex, passcode-gated
 * inside <QueueClient> exactly like /idea.
 *
 * Two things live here: every pipeline run ever (pipeline_runs) and every
 * campaign parked in Mailchimp (scheduled_sends), with the only cancel button
 * in the system.
 */
export default function QueuePage() {
  return (
    <main className="min-h-screen bg-bg px-5 py-12">
      <div className="mx-auto w-full max-w-4xl">
        <h1 className="mb-1 text-2xl font-semibold text-ink">Pipeline queue</h1>
        <p className="mb-6 text-sm text-grayDeep">
          Every run, and every campaign waiting in Mailchimp.
        </p>
        <QueueClient />
      </div>
    </main>
  );
}
```

`app/queue/QueueClient.tsx`:

```tsx
'use client';

/**
 * Passcode gate + the two tables + the cancel button.
 *
 * The passcode is held in component state only — never localStorage. This page
 * can cancel a scheduled send, so a key persisted in a browser is a key left
 * on a phone someone else can pick up.
 */
import { useState } from 'react';

import { Pill } from '@/components/ui/Pill';
import {
  loadQueueAction,
  cancelScheduledSendAction,
  type RunRow,
  type SendRow,
} from '@/lib/actions/queue';

const when = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString('en-US', {
        dateStyle: 'short',
        timeStyle: 'short',
        timeZone: 'America/Los_Angeles',
      })
    : '—';

const DENIALS: Record<string, string> = {
  bad_key: 'Wrong passcode.',
  rate_limited: 'Too many tries. Wait a minute.',
  server: 'Could not read the queue.',
  mailchimp: 'Mailchimp refused the unschedule. Nothing was changed.',
};

export function QueueClient() {
  const [key, setKey] = useState('');
  const [runs, setRuns] = useState<RunRow[] | null>(null);
  const [sends, setSends] = useState<SendRow[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    setBusy(true);
    setError('');
    const res = await loadQueueAction(key);
    setBusy(false);
    if (!res.ok) {
      setError(DENIALS[res.error] ?? 'Something went wrong.');
      return;
    }
    setRuns(res.runs);
    setSends(res.sends);
  }

  async function cancel(id: string) {
    const reason = window.prompt('Why is this being cancelled?');
    if (!reason) return;
    setBusy(true);
    setError('');
    const res = await cancelScheduledSendAction(key, id, reason);
    setBusy(false);
    if (!res.ok) {
      setError(DENIALS[res.error] ?? 'Something went wrong.');
      return;
    }
    await load();
  }

  if (runs === null) {
    return (
      <div className="max-w-sm">
        <input
          type="password"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void load()}
          placeholder="Passcode"
          className="mb-3 w-full rounded-xl border border-inkFaint bg-card px-4 py-3 text-ink"
        />
        <Pill variant="orchid" size="md" onClick={() => void load()} disabled={busy}>
          {busy ? 'Opening…' : 'Open queue'}
        </Pill>
        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {error && <p className="text-sm text-red-600">{error}</p>}

      <section>
        <h2 className="mb-3 text-lg font-semibold text-ink">
          Scheduled sends ({sends.filter((s) => s.status === 'queued').length} queued)
        </h2>
        <div className="overflow-x-auto rounded-2xl border border-inkFaint">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead className="bg-cardSoft text-xs uppercase tracking-wide text-grayDeep">
              <tr>
                <th className="px-4 py-3">Sends</th>
                <th className="px-4 py-3">Campaign</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {sends.length === 0 && (
                <tr>
                  <td className="px-4 py-4 text-grayDeep" colSpan={4}>
                    Nothing scheduled.
                  </td>
                </tr>
              )}
              {sends.map((s) => (
                <tr key={s.id} className="border-t border-inkFaint">
                  <td className="px-4 py-3 text-ink">{when(s.scheduled_for)}</td>
                  <td className="px-4 py-3 font-mono text-xs">{s.mailchimp_campaign_id}</td>
                  <td className="px-4 py-3">
                    {s.status}
                    {s.cancelled_reason && (
                      <span className="text-grayDeep"> — {s.cancelled_reason}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {s.status === 'queued' && (
                      <button
                        type="button"
                        onClick={() => void cancel(s.id)}
                        disabled={busy}
                        className="text-sm text-red-600 underline disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-ink">Last 50 runs</h2>
        <div className="overflow-x-auto rounded-2xl border border-inkFaint">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead className="bg-cardSoft text-xs uppercase tracking-wide text-grayDeep">
              <tr>
                <th className="px-4 py-3">Started</th>
                <th className="px-4 py-3">Kind</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Error</th>
              </tr>
            </thead>
            <tbody>
              {runs.length === 0 && (
                <tr>
                  <td className="px-4 py-4 text-grayDeep" colSpan={4}>
                    No runs yet.
                  </td>
                </tr>
              )}
              {runs.map((r) => (
                <tr key={r.id} className="border-t border-inkFaint">
                  <td className="px-4 py-3 text-ink">{when(r.started_at)}</td>
                  <td className="px-4 py-3">{r.kind}</td>
                  <td className="px-4 py-3">
                    {r.status}
                    {r.attempt > 1 && (
                      <span className="text-grayDeep"> (attempt {r.attempt})</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-grayDeep">{r.error ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
```

- [ ] **Step 6: Typecheck, full suite, commit**

```bash
pnpm typecheck && pnpm test
git add lib/actions/queue.ts tests/actions/queue.test.ts app/queue/
git commit -m "feat(queue): run log, scheduled sends, and the only cancel button"
```

Then set `QUEUE_KEY` on Vercel Production.

---

## Definition of done for this plan

The foundation is complete when all of these are true:

- [ ] `pnpm typecheck && pnpm test` passes with `.env.local` present, and **no DB suite is skipped**.
- [ ] `tests/db/nicole-agent-grants.test.ts` reports `SELECT` true on six tables, `INSERT`/`UPDATE`/`DELETE` false on all seven, and `EXECUTE` false on all six site RPCs.
- [ ] `ALTER ROLE nicole_agent LOGIN PASSWORD ...` has been run out of band and the password is in the vault, not in the repo (Handled OS task 169).
- [ ] `MAILCHIMP_FROM_NAME`, `MAILCHIMP_REPLY_TO` and `QUEUE_KEY` are set on Vercel Production.
- [ ] `grep -rn "N8N_RESUME_WEBHOOK_URL" --include="*.ts" --include="*.tsx" .` returns nothing.
- [ ] `/approve` still works end to end for a single post and a single newsletter.
- [ ] `/queue` opens with the passcode and lists runs.

**Not in this plan, and deliberately so** — each is its own plan against the same spec:

1. **The agent itself.** The CMA scheduled deployment, the weekly / daily / launch-batch prompts, the voice corpus, image generation and the Vercel Blob upload. It calls the five RPCs this plan built; it cannot start until they exist.
2. **The audience merge.** The one-time scripted consolidation of the four Mailchimp lists and the 150-contact reintroduction send (spec "Audience consolidation", Handled OS task 168).
3. **ntfy notifications.** Nicole's topic, Eliahs's topic, the 24h/48h escalation ladder (Handled OS tasks 163 and 169, spec decision 6).

## Blocked on someone else, not on this plan

None of these block a single task above. They block the launch batch, which is a later plan:

- Nicole's four plan-doc answers — program name and ongoing coaching offer are required by every launch email (Handled OS task 164, due 2026-09-05). **Critical path for the Sep 22 batch.**
- An image generation API key, OpenAI `gpt-image-1` (task 166).
- The plan doc's 1,375 corrected to 960 (task 165).

## Suggested execution order

Tasks 1 → 8 in order; they build one migration file and one client, and each is
additive against a live site.

Then check the live token before Task 9. If `c723b64c`'s token is still unused
and unexpired, run **10 → 11 → 12 → 9**. Otherwise **9 → 10 → 11 → 12**.
