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
