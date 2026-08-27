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
    if (first) {
      trash.push({ table: 'content_plan', column: 'id', value: first.id });
    }
    expect(error).toBeNull();
    expect(first).toBeDefined();
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

    const row = data?.[0];
    if (row) {
      trash.push({ table: 'approval_tokens', column: 'token_hash', value: row.token });
      trash.push({ table: 'posts', column: 'id', value: row.post_id });
    }
    expect(error).toBeNull();
    expect(row).toBeDefined();

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

    const row = data?.[0];
    if (row) {
      trash.push({ table: 'approval_tokens', column: 'token_hash', value: row.token });
      trash.push({ table: 'posts', column: 'id', value: row.post_id });
    }
    expect(error).toBeNull();
    expect(row).toBeDefined();

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

    const row = data?.[0];
    if (row) {
      trash.push({ table: 'approval_tokens', column: 'token_hash', value: row.token });
      trash.push({ table: 'posts', column: 'id', value: row.post_id });
    }
    expect(error).toBeNull();
    expect(row).toBeDefined();

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
