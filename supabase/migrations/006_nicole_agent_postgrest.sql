-- ============================================================================
-- 006 — nicole_agent over PostgREST.
--
-- Applied to production 2026-09-16 via the Supabase MCP (apply_migration),
-- the same day the Step 1 spike proved a locally minted `role: nicole_agent`
-- JWT is accepted by PostgREST (it answered 42501 "permission denied to set
-- role", i.e. good signature, missing membership).
--
-- Decision 5 of the launch-agent plan (agent/DESIGN.md in client-nicole):
-- the agent never gets a password. `nicole_agent` stays NOLOGIN; the agent
-- presents a JWT whose `role` claim is nicole_agent, PostgREST connects as
-- `authenticator` and runs SET ROLE. That needs exactly one thing 004 did
-- not grant: SET on the membership. INHERIT FALSE keeps authenticator from
-- picking up the agent's SELECTs itself.
--
-- Kill switch, one statement, every agent token at once:
--     REVOKE nicole_agent FROM authenticator;
-- ============================================================================

-- 1. authenticator may become nicole_agent, and nothing more.
GRANT nicole_agent TO authenticator WITH INHERIT FALSE, SET TRUE;

-- 2. The backfill trigger function (002) was created with the default
--    EXECUTE-to-PUBLIC, so agent_grant_report's new catch-all row flagged it.
--    Triggers check EXECUTE at CREATE TRIGGER time, not when they fire, so
--    the auth.users trigger keeps working. It returns `trigger`, so it was
--    never callable over RPC anyway; this is hygiene, not a hole.
REVOKE EXECUTE ON FUNCTION public.backfill_vibrant40_user_id() FROM PUBLIC, anon, authenticated;

-- 3. A runaway agent query stops itself. PostgREST applies ALTER ROLE ... SET
--    settings after it switches role, so this lands on every agent request.
--    authenticator's own 8s applies to the connection before the switch.
ALTER ROLE nicole_agent SET statement_timeout = '15s';

-- 4. The Dec 14 reopen routine opens its run as 'reopen_batch'. 004's CHECK
--    listed four kinds and run_start() would have failed with 23514.
ALTER TABLE public.pipeline_runs DROP CONSTRAINT IF EXISTS pipeline_runs_kind_check;
ALTER TABLE public.pipeline_runs
  ADD CONSTRAINT pipeline_runs_kind_check
  CHECK (kind IN ('weekly', 'daily', 'launch_batch', 'send', 'reopen_batch'));

-- 5. agent_grant_report, extended. Same shape as 004 §8 (object, privilege,
--    granted), with the role-shape rows tests/db/nicole-agent-grants.test.ts
--    now asserts:
--      nicole_agent / SET                  true   authenticator may switch to it
--      nicole_agent / LOGIN                false  no password, ever
--      nicole_agent / BYPASSRLS            false
--      nicole_agent / SUPERUSER            false
--      nicole_agent / MEMBER OF ANY ROLE   false  nothing to inherit from
--      nicole_agent / statement_timeout=15s true
--      public.backfill_vibrant40_user_id() / EXECUTE          false
--      public.<any function outside the five> / EXECUTE       false
--    The last row asks the catalog rather than a name list, so a future
--    function created without REVOKE FROM PUBLIC fails the test the day it
--    lands, not the day someone thinks to add it to the list.
CREATE OR REPLACE FUNCTION public.agent_grant_report()
RETURNS TABLE(object text, privilege text, granted boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $fn$
  SELECT 'public', 'USAGE', has_schema_privilege('nicole_agent', 'public', 'USAGE')
  UNION ALL
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
      ('public.cancel_scheduled_send(uuid,text)'),
      ('public.backfill_vibrant40_user_id()')
    ) AS f(fn)
  UNION ALL
  -- Role shape (006).
  SELECT 'nicole_agent', 'SET', pg_has_role('authenticator', 'nicole_agent', 'SET')
  UNION ALL
  SELECT 'nicole_agent', 'LOGIN', r.rolcanlogin FROM pg_roles r WHERE r.rolname = 'nicole_agent'
  UNION ALL
  SELECT 'nicole_agent', 'BYPASSRLS', r.rolbypassrls FROM pg_roles r WHERE r.rolname = 'nicole_agent'
  UNION ALL
  SELECT 'nicole_agent', 'SUPERUSER', r.rolsuper FROM pg_roles r WHERE r.rolname = 'nicole_agent'
  UNION ALL
  SELECT 'nicole_agent', 'MEMBER OF ANY ROLE',
         EXISTS (SELECT 1 FROM pg_auth_members m WHERE m.member = 'nicole_agent'::regrole)
  UNION ALL
  SELECT 'nicole_agent', 'statement_timeout=15s',
         EXISTS (SELECT 1 FROM pg_roles r
                  WHERE r.rolname = 'nicole_agent'
                    AND 'statement_timeout=15s' = ANY (r.rolconfig))
  UNION ALL
  -- Catch-all: any function in public, outside the five, that the agent could
  -- execute. Default EXECUTE-to-PUBLIC on a new function trips this.
  SELECT 'public.<any function outside the five>', 'EXECUTE',
         EXISTS (
           SELECT 1
             FROM pg_proc p
             JOIN pg_namespace n ON n.oid = p.pronamespace
            WHERE n.nspname = 'public'
              AND has_function_privilege('nicole_agent', p.oid, 'EXECUTE')
              AND p.oid NOT IN (
                SELECT to_regprocedure(a.fn)::oid
                  FROM (VALUES
                    ('public.run_start(text)'),
                    ('public.run_finish(uuid,text,text,jsonb)'),
                    ('public.plan_upsert(date,text,text,text,text,text,text)'),
                    ('public.stage_post_draft(uuid,uuid,text,text,text,text,text,text,text,jsonb,text,uuid)'),
                    ('public.stage_newsletter_draft(uuid,uuid,text,text,text,text,text,text,uuid,timestamptz,uuid)')
                  ) AS a(fn)
                 WHERE to_regprocedure(a.fn) IS NOT NULL
              )
         );
$fn$;

REVOKE EXECUTE ON FUNCTION public.agent_grant_report() FROM PUBLIC, anon, authenticated, nicole_agent;
GRANT  EXECUTE ON FUNCTION public.agent_grant_report() TO service_role;
