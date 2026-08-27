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
