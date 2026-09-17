/**
 * The agent's real door, exercised end to end: a JWT whose `role` claim is
 * nicole_agent, presented to PostgREST with the publishable apikey. Migration
 * 006 granted authenticator SET on the role; this file proves what that
 * token can and cannot do from outside the database.
 *
 * Needs NICOLE_AGENT_JWT (or the file the spike wrote it to,
 * ~/.config/nicole-agent/agent.jwt). Skips without it. Mint one with
 * ~/.config/nicole-agent/spike-jwt.mjs and the legacy JWT secret on stdin.
 *
 * No successful stage_* call is made here: each one mints a live approval
 * token, and with the Mailchimp env set on Vercel a live link sends real
 * email. The one stage_* call below fails on purpose, before any insert.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { config as loadEnv } from 'dotenv';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

loadEnv({ path: path.resolve(__dirname, '../../.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const PUBLISHABLE = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const SUPABASE_SECRET = process.env.SUPABASE_SECRET_KEY;

function loadAgentJwt(): string | undefined {
  if (process.env.NICOLE_AGENT_JWT) return process.env.NICOLE_AGENT_JWT.trim();
  const file = path.join(os.homedir(), '.config', 'nicole-agent', 'agent.jwt');
  try {
    return fs.readFileSync(file, 'utf8').trim() || undefined;
  } catch {
    return undefined;
  }
}
const AGENT_JWT = loadAgentJwt();

const RUN = Boolean(SUPABASE_URL && PUBLISHABLE && SUPABASE_SECRET && AGENT_JWT);
const describeIf = RUN ? describe : describe.skip;

const TAG = { test: 'nicole-agent-postgrest' };

let agent: SupabaseClient;
let admin: SupabaseClient;
const runIds: string[] = [];

beforeAll(() => {
  if (!RUN) return;
  agent = createClient(SUPABASE_URL!, PUBLISHABLE!, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${AGENT_JWT}` } },
  });
  admin = createClient(SUPABASE_URL!, SUPABASE_SECRET!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
});

afterAll(async () => {
  if (!RUN) return;
  // The agent cannot delete its own runs (SELECT only), so the service role
  // sweeps every row this file opened.
  for (const id of runIds) {
    await admin.from('pipeline_runs').delete().eq('id', id);
  }
});

describeIf('nicole_agent over PostgREST — allowed', () => {
  it('opens and closes a run through run_start / run_finish', async () => {
    const { data: run, error } = await agent.rpc('run_start', { p_kind: 'daily' });
    expect(error).toBeNull();
    runIds.push(run.id);
    expect(run.status).toBe('running');

    const { data: done, error: e2 } = await agent.rpc('run_finish', {
      p_run_id: run.id,
      p_status: 'ok',
      p_notes: TAG,
    });
    expect(e2).toBeNull();
    expect(done.status).toBe('ok');
    expect(done.notes).toEqual(TAG);
  });

  it('reads content_plan', async () => {
    const { data, error } = await agent.from('content_plan').select('id').limit(1);
    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
  });

  it('reads its own pipeline_runs rows back', async () => {
    const { data: run } = await agent.rpc('run_start', { p_kind: 'daily' });
    runIds.push(run.id);
    const { data, error } = await agent.from('pipeline_runs').select('id, kind').eq('id', run.id);
    expect(error).toBeNull();
    expect(data).toEqual([{ id: run.id, kind: 'daily' }]);
  });
});

describeIf('nicole_agent over PostgREST — denied with 42501', () => {
  it('cannot read approval_tokens', async () => {
    // '*' on purpose: Postgres resolves column names before privileges, so a
    // guessed column would fail with 42703 and prove nothing.
    const { error } = await agent.from('approval_tokens').select('*').limit(1);
    expect(error?.code).toBe('42501');
  });

  it('cannot read vibrant40_members', async () => {
    const { error } = await agent.from('vibrant40_members').select('*').limit(1);
    expect(error?.code).toBe('42501');
  });

  it('cannot insert into posts', async () => {
    const { error } = await agent
      .from('posts')
      .insert({ slug: 'agent-should-not-write-this', title: 'x', body_md: 'x' });
    expect(error?.code).toBe('42501');
  });

  it('cannot call approve_and_publish', async () => {
    const { error } = await agent.rpc('approve_and_publish', { p_token: 'not-a-token' });
    expect(error?.code).toBe('42501');
  });

  it('cannot call claim_for_send', async () => {
    const { error } = await agent.rpc('claim_for_send', { p_token: 'not-a-token' });
    expect(error?.code).toBe('42501');
  });
});

describeIf('nicole_agent over PostgREST — the DB link rule holds for the agent too', () => {
  it('rejects a link-less newsletter with 23514 before any row or token exists', async () => {
    const { data: run } = await agent.rpc('run_start', { p_kind: 'daily' });
    runIds.push(run.id);

    const { error } = await agent.rpc('stage_newsletter_draft', {
      p_run_id: run.id,
      p_plan_id: null,
      p_subject: 'no link in here',
      p_preview_text: 'preview',
      p_body_html: '<p>Hi everyone,</p><p>Nothing to click.</p>',
      p_list_id: 'f531604a9a',
      p_segment_id: null,
      p_type: 'weekly',
    });
    expect(error?.code).toBe('23514');

    const { data: drafts } = await admin
      .from('newsletter_drafts')
      .select('id')
      .eq('subject', 'no link in here');
    expect(drafts).toEqual([]);
  });
});
