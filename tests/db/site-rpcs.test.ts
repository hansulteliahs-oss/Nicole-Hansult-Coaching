/**
 * Migration 004 — the six RPCs only the site may call.
 *
 * The scenario that matters most is the last one: a Mailchimp failure after
 * the token is claimed must RELEASE the draft, not strand it. That is root
 * cause 1, and three real drafts are stranded by it today.
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

const LINKED = '<p><a href="https://nicolehansultcoaching.com/insights/x">read</a></p>';

let admin: SupabaseClient;
const trash: { table: string; column: string; value: string }[] = [];

async function stagePost(slug: string) {
  const { data, error } = await admin.rpc('stage_post_draft', {
    p_run_id: null,
    p_plan_id: null,
    p_title: 'probe',
    p_slug: slug,
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
  if (error) throw new Error(error.message);
  if (!row) throw new Error('stage_post_draft returned no row');
  return row as { post_id: string; slug: string; token: string };
}

async function stageNewsletter() {
  const { data, error } = await admin.rpc('stage_newsletter_draft', {
    p_run_id: null,
    p_plan_id: null,
    p_subject: 'probe',
    p_preview_text: null,
    p_body_html: LINKED,
    p_list_id: 'f531604a9a',
    p_segment_id: null,
    p_type: 'tip',
  });
  const row = data?.[0];
  if (row) {
    trash.push({ table: 'approval_tokens', column: 'token_hash', value: row.token });
    trash.push({ table: 'newsletter_drafts', column: 'id', value: row.draft_id });
  }
  if (error) throw new Error(error.message);
  if (!row) throw new Error('stage_newsletter_draft returned no row');
  return row as { draft_id: string; token: string };
}

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

describeIf('approve_and_publish', () => {
  it('publishes the post and claims the token together', async () => {
    const staged = await stagePost(`site-rpc-publish-${Date.now()}`);

    const { data, error } = await admin.rpc('approve_and_publish', {
      p_token: staged.token,
    });
    expect(error).toBeNull();
    expect(data[0].slug).toBe(staged.slug);
    expect(data[0].already).toBe(false);

    const { data: post } = await admin
      .from('posts')
      .select('status, published_at')
      .eq('id', staged.post_id)
      .single();
    expect(post!.status).toBe('published');
    expect(post!.published_at).toBeTruthy();

    const { data: tok } = await admin
      .from('approval_tokens')
      .select('used')
      .eq('token_hash', staged.token)
      .single();
    expect(tok!.used).toBe(true);
  });

  it('is idempotent — a second tap reports already, not an error', async () => {
    const staged = await stagePost(`site-rpc-idem-${Date.now()}`);
    await admin.rpc('approve_and_publish', { p_token: staged.token });

    const { data, error } = await admin.rpc('approve_and_publish', {
      p_token: staged.token,
    });
    expect(error).toBeNull();
    expect(data[0].slug).toBe(staged.slug);
    expect(data[0].already).toBe(true);
  });

  it('refuses an expired token and leaves the post a draft', async () => {
    const staged = await stagePost(`site-rpc-expired-${Date.now()}`);
    await admin
      .from('approval_tokens')
      .update({ expires_at: '2020-01-01T00:00:00Z' })
      .eq('token_hash', staged.token);

    const { error } = await admin.rpc('approve_and_publish', { p_token: staged.token });
    expect(error).not.toBeNull();
    expect(error!.message).toMatch(/expired/i);

    const { data: post } = await admin
      .from('posts')
      .select('status')
      .eq('id', staged.post_id)
      .single();
    expect(post!.status).toBe('draft');
  });

  it('refuses an unknown token', async () => {
    const { error } = await admin.rpc('approve_and_publish', { p_token: 'nope' });
    expect(error).not.toBeNull();
  });

  it('refuses a newsletter token — wrong door', async () => {
    const staged = await stageNewsletter();
    const { error } = await admin.rpc('approve_and_publish', { p_token: staged.token });
    expect(error).not.toBeNull();
    expect(error!.message).toMatch(/not a post token/i);
  });
});

describeIf('claim_for_send / mark_sent / release_for_retry', () => {
  it('claims the draft into sending and hands back everything the sender needs', async () => {
    const staged = await stageNewsletter();

    const { data, error } = await admin.rpc('claim_for_send', { p_token: staged.token });
    expect(error).toBeNull();

    const claim = data[0];
    expect(claim.draft_id).toBe(staged.draft_id);
    expect(claim.subject).toBe('probe');
    expect(claim.body_html).toBe(LINKED);
    expect(claim.list_id).toBe('f531604a9a');
    expect(claim.already).toBe(false);

    const { data: draft } = await admin
      .from('newsletter_drafts')
      .select('status')
      .eq('id', staged.draft_id)
      .single();
    expect(draft!.status).toBe('sending');
  });

  it('mark_sent completes the draft with its campaign id', async () => {
    const staged = await stageNewsletter();
    await admin.rpc('claim_for_send', { p_token: staged.token });

    const sentAt = '2099-01-01T00:00:00Z';
    const { error } = await admin.rpc('mark_sent', {
      p_draft_id: staged.draft_id,
      p_campaign_id: 'probe-campaign-1',
      p_sent_at: sentAt,
    });
    expect(error).toBeNull();

    const { data: draft } = await admin
      .from('newsletter_drafts')
      .select('status, mailchimp_campaign_id, sent_at')
      .eq('id', staged.draft_id)
      .single();
    expect(draft!.status).toBe('sent');
    expect(draft!.mailchimp_campaign_id).toBe('probe-campaign-1');
    expect(draft!.sent_at).toBeTruthy();
  });

  it('ROOT CAUSE 1: a Mailchimp failure releases the draft instead of stranding it', async () => {
    const staged = await stageNewsletter();
    await admin.rpc('claim_for_send', { p_token: staged.token });

    // release_for_retry writes a pipeline_runs row as a side effect; register it
    // for cleanup or every run of this suite leaks one into the forensics table.
    trash.push({ table: 'pipeline_runs', column: 'produced_draft_id', value: staged.draft_id });

    // Mailchimp times out here in real life.
    const { error } = await admin.rpc('release_for_retry', {
      p_draft_id: staged.draft_id,
      p_error: 'Mailchimp 504',
    });
    expect(error).toBeNull();

    const { data: draft } = await admin
      .from('newsletter_drafts')
      .select('status')
      .eq('id', staged.draft_id)
      .single();
    expect(draft!.status).toBe('approved');

    const { data: tok } = await admin
      .from('approval_tokens')
      .select('used')
      .eq('token_hash', staged.token)
      .single();
    expect(tok!.used).toBe(false);

    // And the whole thing is retryable from the same link.
    const { data: again, error: e2 } = await admin.rpc('claim_for_send', {
      p_token: staged.token,
    });
    expect(e2).toBeNull();
    expect(again[0].already).toBe(false);
  });

  it('a second claim on an already-sent draft reports already, and does not resend', async () => {
    const staged = await stageNewsletter();
    await admin.rpc('claim_for_send', { p_token: staged.token });
    await admin.rpc('mark_sent', {
      p_draft_id: staged.draft_id,
      p_campaign_id: 'probe-campaign-2',
      p_sent_at: '2099-01-01T00:00:00Z',
    });

    const { data, error } = await admin.rpc('claim_for_send', { p_token: staged.token });
    expect(error).toBeNull();
    expect(data[0].already).toBe(true);
    expect(data[0].draft_id).toBe(staged.draft_id);
  });

  it('release_for_retry does not un-claim the token when the draft was not sending', async () => {
    const staged = await stageNewsletter();
    await admin.rpc('claim_for_send', { p_token: staged.token });
    await admin.rpc('mark_sent', {
      p_draft_id: staged.draft_id,
      p_campaign_id: 'probe-campaign-guard',
      p_sent_at: '2099-01-01T00:00:00Z',
    });

    trash.push({ table: 'pipeline_runs', column: 'produced_draft_id', value: staged.draft_id });
    const { error } = await admin.rpc('release_for_retry', {
      p_draft_id: staged.draft_id,
      p_error: 'late failure after send',
    });
    expect(error).toBeNull();

    // The draft was 'sent', not 'sending', so nothing should have been reverted
    // and the token must stay claimed.
    const { data: draft } = await admin
      .from('newsletter_drafts').select('status').eq('id', staged.draft_id).single();
    expect(draft!.status).toBe('sent');

    const { data: tok } = await admin
      .from('approval_tokens').select('used').eq('token_hash', staged.token).single();
    expect(tok!.used).toBe(true);
  });
});

describeIf('approve_batch', () => {
  const batchId = '00000000-0000-0000-0000-0000000000c1';

  async function stageBatchPair() {
    const rows = [];
    trash.push({ table: 'approval_tokens', column: 'batch_id', value: batchId });
    for (const subject of ['Launch A', 'Launch B']) {
      const { data, error } = await admin.rpc('stage_newsletter_draft', {
        p_run_id: null,
        p_plan_id: null,
        p_subject: subject,
        p_preview_text: null,
        p_body_html: LINKED,
        p_list_id: 'f531604a9a',
        p_segment_id: null,
        p_type: 'offer',
        p_scheduled_for: '2099-09-28T16:00:00Z',
        p_batch_id: batchId,
      });
      const row = data?.[0];
      if (row) trash.push({ table: 'newsletter_drafts', column: 'id', value: row.draft_id });
      if (error) throw new Error(error.message);
      if (!row) throw new Error('stage_newsletter_draft returned no row');
      rows.push(row);
    }
    return rows;
  }

  it('approves every draft in the batch on one token', async () => {
    const rows = await stageBatchPair();

    const { data, error } = await admin.rpc('approve_batch', { p_token: rows[0].token });
    expect(error).toBeNull();
    expect(data).toHaveLength(2);
    expect(data.every((d: { status: string }) => d.status === 'approved')).toBe(true);

    const { data: tok } = await admin
      .from('approval_tokens')
      .select('used')
      .eq('batch_id', batchId)
      .single();
    expect(tok!.used).toBe(true);
  });

  it('is idempotent — a retry returns the same rows and re-approves nothing', async () => {
    const { data: first } = await admin
      .from('approval_tokens')
      .select('token_hash')
      .eq('batch_id', batchId)
      .single();

    // Simulate the route getting halfway: one draft already has a campaign.
    const { data: drafts } = await admin
      .from('newsletter_drafts')
      .select('id')
      .eq('batch_id', batchId)
      .order('subject');
    await admin
      .from('newsletter_drafts')
      .update({ mailchimp_campaign_id: 'probe-batch-campaign' })
      .eq('id', drafts![0].id);

    const { data, error } = await admin.rpc('approve_batch', {
      p_token: first!.token_hash,
    });
    expect(error).toBeNull();
    expect(data).toHaveLength(2);
    // The already-created campaign is preserved, so the route can skip it.
    const withCampaign = data.filter(
      (d: { mailchimp_campaign_id: string | null }) => d.mailchimp_campaign_id !== null,
    );
    expect(withCampaign).toHaveLength(1);
  });

  it('refuses a single-draft token', async () => {
    const staged = await stageNewsletter();
    const { error } = await admin.rpc('approve_batch', { p_token: staged.token });
    expect(error).not.toBeNull();
    expect(error!.message).toMatch(/not a batch token/i);
  });
});

describeIf('cancel_scheduled_send', () => {
  async function seedScheduled() {
    const staged = await stageNewsletter();
    const { data, error } = await admin
      .from('scheduled_sends')
      .insert({
        newsletter_draft_id: staged.draft_id,
        mailchimp_campaign_id: 'probe-sched-1',
        list_id: 'f531604a9a',
        scheduled_for: '2099-09-28T16:00:00Z',
      })
      .select('id')
      .single();
    const row = data ?? null;
    if (row) trash.push({ table: 'scheduled_sends', column: 'id', value: row.id });
    if (error) throw new Error(error.message);
    if (!row) throw new Error('scheduled_sends insert returned no row');
    return row.id as string;
  }

  it('cancels a queued send with a reason', async () => {
    const id = await seedScheduled();

    const { data, error } = await admin.rpc('cancel_scheduled_send', {
      p_id: id,
      p_reason: 'seats sold out',
    });
    expect(error).toBeNull();
    expect(data.status).toBe('cancelled');
    expect(data.cancelled_reason).toBe('seats sold out');
  });

  it('a second cancel reads as already cancelled, not an error', async () => {
    const id = await seedScheduled();
    await admin.rpc('cancel_scheduled_send', { p_id: id, p_reason: 'first' });

    const { data, error } = await admin.rpc('cancel_scheduled_send', {
      p_id: id,
      p_reason: 'second',
    });
    expect(error).toBeNull();
    expect(data.status).toBe('cancelled');
    expect(data.cancelled_reason).toBe('first');
  });

  it('raises on an unknown id', async () => {
    const { error } = await admin.rpc('cancel_scheduled_send', {
      p_id: '00000000-0000-0000-0000-0000000000ff',
      p_reason: 'x',
    });
    expect(error).not.toBeNull();
  });
});
