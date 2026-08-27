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
