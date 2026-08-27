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
