/**
 * The security property this whole rebuild rests on: nicole_agent can read six
 * tables and call five functions, and can do nothing else. Migration 006 adds
 * the role-shape rows: authenticator may SET to it, it cannot log in, it
 * inherits nothing, and no function outside the five is executable.
 *
 * Asserted through agent_grant_report(), which wraps has_table_privilege /
 * has_function_privilege / has_schema_privilege. PostgREST cannot query
 * information_schema, and information_schema.role_table_grants would not
 * show another role's grants to service_role anyway.
 *
 * All eleven RPCs (five agent, six site) exist now, so every assertion below
 * is a real "is/is not granted" check — none of them is "never true" against
 * a not-yet-created function anymore.
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
      expect(find(fn, 'EXECUTE')?.granted, fn).toBe(false);
    }
  });

  // F13 / deferred 9: has_table_privilege and has_function_privilege say
  // nothing about schema-level USAGE. If a future edit ever dropped
  // `GRANT USAGE ON SCHEMA public TO nicole_agent`, every table SELECT and
  // every RPC EXECUTE above would still report exactly as granted while the
  // agent broke at runtime with "permission denied for schema public". This
  // is the one grant those checks cannot see.
  it('has USAGE on the public schema — without it, every grant above is inert', () => {
    expect(find('public', 'USAGE')?.granted).toBe(true);
  });

  // Migration 006: the agent reaches the DB only through PostgREST, which
  // connects as `authenticator` and switches to the JWT's role. That switch is
  // a SET privilege on the membership, granted with INHERIT FALSE so
  // authenticator never picks up the agent's grants itself.
  it('lets authenticator SET ROLE to nicole_agent, so a role-claim JWT works', () => {
    expect(find('nicole_agent', 'SET')?.granted).toBe(true);
  });

  it('cannot log in — no password exists, PostgREST is the only door', () => {
    expect(find('nicole_agent', 'LOGIN')?.granted).toBe(false);
  });

  it('cannot bypass RLS and is not a superuser', () => {
    expect(find('nicole_agent', 'BYPASSRLS')?.granted).toBe(false);
    expect(find('nicole_agent', 'SUPERUSER')?.granted).toBe(false);
  });

  it('is a member of no other role — nothing to inherit from', () => {
    expect(find('nicole_agent', 'MEMBER OF ANY ROLE')?.granted).toBe(false);
  });

  it('runs under a 15s statement_timeout', () => {
    expect(find('nicole_agent', 'statement_timeout=15s')?.granted).toBe(true);
  });

  // Every new function grants EXECUTE to PUBLIC by default. The named list
  // above cannot see a function it does not know about, so this row asks the
  // catalog directly: is there any function in public, outside the five, that
  // nicole_agent could execute? The backfill trigger function was the first
  // one caught by this check.
  it('cannot execute the backfill trigger function', () => {
    expect(find('public.backfill_vibrant40_user_id()', 'EXECUTE')?.granted).toBe(false);
  });

  it('cannot execute any public function outside the five staging RPCs', () => {
    expect(find('public.<any function outside the five>', 'EXECUTE')?.granted).toBe(false);
  });
});
