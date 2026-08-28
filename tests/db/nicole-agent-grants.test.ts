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
