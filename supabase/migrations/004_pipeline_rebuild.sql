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

  UPDATE public.approval_tokens
     SET used = false
   WHERE draft_id = p_draft_id AND draft_kind = 'newsletter';

  INSERT INTO public.pipeline_runs (kind, status, finished_at, produced_draft_id, error, notes)
  VALUES ('send', 'failed', now(), p_draft_id, p_error,
          jsonb_build_object('released', true));
END;
$fn$;

REVOKE EXECUTE ON FUNCTION public.release_for_retry(uuid,text) FROM PUBLIC, anon, authenticated, nicole_agent;
GRANT  EXECUTE ON FUNCTION public.release_for_retry(uuid,text) TO service_role;
