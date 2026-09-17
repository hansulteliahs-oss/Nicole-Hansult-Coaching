/**
 * POST /api/approve/batch — the campaign id must be persisted before
 * anything else can fail, and that persist's own failure must not be ignored.
 *
 * A campaign that exists and is scheduled in Mailchimp but is unknown to the
 * database is the one state a retry turns into a duplicate send to the whole
 * list: the route's retry-safety only skips a draft that already carries a
 * mailchimp_campaign_id, so an armed-but-unrecorded campaign gets re-created
 * and re-scheduled on the next press. Two tests here defend that:
 *   - the id write happens before setCampaignContent, so a mid-flight
 *     Mailchimp failure there cannot leave that state behind;
 *   - the id write's own `{ error }` result is checked and thrown on, because
 *     supabase-js RESOLVES on a failed write rather than throwing, and an
 *     unchecked failure would fall straight through to scheduling anyway.
 *
 * I2: the undated-draft check must run BEFORE approve_batch claims the token,
 * or one missing send time burns the batch token and schedules nothing. Two
 * more tests below defend that ordering directly, not just the status code.
 *
 * Supabase and Mailchimp are both mocked, same posture as tests/api/approve.test.ts.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  // Pre-claim reads. tokenRow defaults to a valid batch token so the existing
  // scheduling tests below don't need to know about the new pre-claim step.
  tokenRow: { batch_id: 'b-1' } as Record<string, unknown> | null,
  tokenError: null as { message: string } | null,
  // null = derive from batchData (same subject/scheduled_for/campaign id the
  // approve_batch mock returns) — set explicitly to test the pre-claim check
  // seeing something approve_batch's response never will.
  preDrafts: null as Record<string, unknown>[] | null,
  preDraftsError: null as { message: string } | null,
  batchData: [] as Record<string, unknown>[],
  batchError: null as { message: string } | null,
  rpcCalls: [] as string[],
  calls: [] as string[],
  contentThrows: null as Error | null,
  updateError: null as { message: string } | null,
  insertError: null as { message: string } | null,
  inserts: [] as { table: string; payload: Record<string, unknown> }[],
  // Drafts that already have a scheduled_sends row (by draft id).
  sendRows: [] as string[],
  // Mailchimp GET /campaigns/{id} answers, keyed by campaign id.
  campaigns: {} as Record<string, { status: string; sendTime: string | null }>,
  publishedSlugs: [] as string[],
}));

vi.mock('@/lib/supabase/admin', () => ({
  getAdminClient: () => ({
    async rpc(fn: string) {
      mocks.rpcCalls.push(fn);
      if (fn === 'approve_batch') {
        return { data: mocks.batchData, error: mocks.batchError };
      }
      return { data: null, error: null };
    },
    from(table: string) {
      return {
        select() {
          return {
            eq() {
              if (table === 'approval_tokens') {
                return {
                  maybeSingle: async () => ({
                    data: mocks.tokenRow,
                    error: mocks.tokenError,
                  }),
                };
              }
              // newsletter_drafts pre-claim read.
              mocks.calls.push('db:select:newsletter_drafts');
              const rows =
                mocks.preDrafts ??
                mocks.batchData.map((d) => ({
                  id: d.id,
                  subject: d.subject,
                  body_html: d.body_html,
                  scheduled_for: d.scheduled_for,
                  mailchimp_campaign_id: d.mailchimp_campaign_id,
                }));
              return Promise.resolve({ data: rows, error: mocks.preDraftsError });
            },
            in(_col: string, values: string[]) {
              if (table === 'scheduled_sends') {
                mocks.calls.push('db:select:scheduled_sends');
                return Promise.resolve({
                  data: mocks.sendRows
                    .filter((id) => values.includes(id))
                    .map((id) => ({ newsletter_draft_id: id })),
                  error: null,
                });
              }
              // posts: published slugs among the requested ones.
              return {
                eq: async () => ({
                  data: mocks.publishedSlugs.filter((x) => values.includes(x)).map((slug) => ({ slug })),
                  error: null,
                }),
              };
            },
          };
        },
        update() {
          return {
            eq: async () => {
              mocks.calls.push(`db:update:${table}`);
              return { data: null, error: mocks.updateError };
            },
          };
        },
        insert: async (payload: Record<string, unknown>) => {
          mocks.calls.push(`db:insert:${table}`);
          mocks.inserts.push({ table, payload });
          return { data: null, error: mocks.insertError };
        },
      };
    },
  }),
}));

vi.mock('@/lib/mailchimp/campaigns', () => ({
  createCampaign: async () => {
    mocks.calls.push('mailchimp:create');
    return 'campaign-1';
  },
  setCampaignContent: async () => {
    mocks.calls.push('mailchimp:content');
    if (mocks.contentThrows) throw mocks.contentThrows;
  },
  scheduleCampaign: async () => {
    mocks.calls.push('mailchimp:schedule');
  },
  getCampaign: async (id: string) => {
    mocks.calls.push(`mailchimp:get:${id}`);
    const c = mocks.campaigns[id];
    if (!c) throw new Error(`Mailchimp GET /campaigns/${id} failed (404)`);
    return { id, ...c };
  },
}));

const { POST } = await import('@/app/api/approve/batch/route');

const post = (body: unknown) =>
  POST(
    new Request('http://localhost/api/approve/batch', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }),
  );

beforeEach(() => {
  mocks.tokenRow = { batch_id: 'b-1' };
  mocks.tokenError = null;
  mocks.preDrafts = null;
  mocks.preDraftsError = null;
  mocks.batchData = [];
  mocks.batchError = null;
  mocks.rpcCalls = [];
  mocks.calls = [];
  mocks.contentThrows = null;
  mocks.updateError = null;
  mocks.insertError = null;
  mocks.inserts = [];
  mocks.sendRows = [];
  mocks.campaigns = {};
  mocks.publishedSlugs = [];
});

const draft = (over: Record<string, unknown> = {}) => ({
  id: 'd-1',
  subject: 'Doors open',
  preview_text: null,
  body_html: '<p>hi</p>',
  list_id: 'f531604a9a',
  segment_id: null,
  scheduled_for: '2026-10-12T15:00:00Z',
  mailchimp_campaign_id: null,
  ...over,
});

describe('POST /api/approve/batch', () => {
  it('persists the campaign id before setting content, so a mid-flight failure cannot duplicate a send', async () => {
    mocks.batchData = [
      {
        id: 'd-1',
        subject: 'Doors open',
        preview_text: null,
        body_html: '<p>hi</p>',
        list_id: 'f531604a9a',
        segment_id: null,
        scheduled_for: '2026-09-28T16:00:00Z',
        mailchimp_campaign_id: null,
      },
    ];
    mocks.contentThrows = new Error('mailchimp down');

    const res = await post({ token: 't' });
    expect(res.status).toBe(502);

    const updateIdx = mocks.calls.indexOf('db:update:newsletter_drafts');
    const contentIdx = mocks.calls.indexOf('mailchimp:content');

    // The ordering assertion is the whole point — a test that only checks
    // the 502 would pass even with the old, dangerous order.
    expect(updateIdx).toBeGreaterThan(-1);
    expect(contentIdx).toBeGreaterThan(-1);
    expect(updateIdx).toBeLessThan(contentIdx);
  });

  it('does not schedule a campaign when the id could not be recorded', async () => {
    mocks.batchData = [
      {
        id: 'd-1',
        subject: 'Doors open',
        preview_text: null,
        body_html: '<p>hi</p>',
        list_id: 'f531604a9a',
        segment_id: null,
        scheduled_for: '2026-09-28T16:00:00Z',
        mailchimp_campaign_id: null,
      },
    ];
    // supabase-js resolves with { error } on a failed write — it does not
    // throw. That is the whole point of this test.
    mocks.updateError = { message: 'boom' };

    const res = await post({ token: 't' });
    expect(res.status).toBe(502);

    // The assertion that matters: a campaign the database never recorded
    // must never be scheduled. A test checking only the 502 would pass even
    // if the campaign got scheduled.
    expect(mocks.calls).not.toContain('mailchimp:schedule');
  });

  it('I2: rejects an undated draft WITHOUT ever claiming the token', async () => {
    mocks.preDrafts = [
      { subject: 'Doors open', scheduled_for: null, mailchimp_campaign_id: null },
    ];

    const res = await post({ token: 't' });
    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.error).toMatch(/Doors open/);

    // The whole point of I2: approve_batch must never run when the pre-claim
    // check already knows scheduling is impossible. If this were called, the
    // token would be burnt and every draft flipped to 'approved' for nothing.
    expect(mocks.rpcCalls).not.toContain('approve_batch');
  });

  it('an undated draft that already has a campaign id does not block the retry', async () => {
    // Mirrors approve_batch's own skip rule: a draft already scheduled in
    // Mailchimp doesn't need a scheduled_for re-check on a retry.
    mocks.preDrafts = [
      { id: 'd-1', subject: 'Doors open', body_html: '<p>hi</p>', scheduled_for: null, mailchimp_campaign_id: 'campaign-1' },
    ];
    mocks.batchData = [draft({ scheduled_for: null, mailchimp_campaign_id: 'campaign-1' })];
    mocks.sendRows = ['d-1'];

    const res = await post({ token: 't' });
    expect(res.status).toBe(200);
    expect(mocks.rpcCalls).toContain('approve_batch');
    const json = await res.json();
    expect(json).toEqual({ ok: true, scheduled: 0, skipped: 1, resumed: 0 });
  });

  // BATCH RETRY BUG. The old rule skipped any draft with a campaign id. But
  // the id is persisted BEFORE content and schedule on purpose, so a failure
  // in either left a draft with an id, no content, no schedule, and a retry
  // that skipped it forever. Only a scheduled_sends row proves the draft is
  // actually parked in Mailchimp; anything else is resumed from Mailchimp's
  // own view of the campaign.
  it('RETRY: skips only drafts with a scheduled_sends row', async () => {
    mocks.batchData = [
      draft({ id: 'd-1', mailchimp_campaign_id: 'campaign-1' }),
      draft({ id: 'd-2', subject: 'Second', mailchimp_campaign_id: 'campaign-2' }),
    ];
    mocks.sendRows = ['d-1'];
    mocks.campaigns['campaign-2'] = { status: 'save', sendTime: null };

    const res = await post({ token: 't' });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, scheduled: 0, skipped: 1, resumed: 1 });
    expect(mocks.calls).not.toContain('mailchimp:get:campaign-1');
    expect(mocks.calls).toContain('mailchimp:get:campaign-2');
  });

  it('RETRY: a campaign still in save gets content, schedule and a sends row, with no second create', async () => {
    mocks.batchData = [draft({ mailchimp_campaign_id: 'campaign-1' })];
    mocks.campaigns['campaign-1'] = { status: 'save', sendTime: null };

    const res = await post({ token: 't' });
    expect(res.status).toBe(200);
    expect(mocks.calls).not.toContain('mailchimp:create');
    expect(mocks.calls).toContain('mailchimp:content');
    expect(mocks.calls).toContain('mailchimp:schedule');
    expect(mocks.calls).toContain('db:insert:scheduled_sends');
    expect(mocks.inserts[0].payload).toMatchObject({
      newsletter_draft_id: 'd-1',
      mailchimp_campaign_id: 'campaign-1',
    });
  });

  it('RETRY: a campaign already scheduled in Mailchimp only gets its sends row', async () => {
    mocks.batchData = [draft({ mailchimp_campaign_id: 'campaign-1' })];
    mocks.campaigns['campaign-1'] = { status: 'schedule', sendTime: '2026-10-12T15:00:00+00:00' };

    const res = await post({ token: 't' });
    expect(res.status).toBe(200);
    expect(mocks.calls.filter((c) => c.startsWith('mailchimp:'))).toEqual(['mailchimp:get:campaign-1']);
    expect(mocks.calls).toContain('db:insert:scheduled_sends');
    expect(await res.json()).toEqual({ ok: true, scheduled: 0, skipped: 0, resumed: 1 });
  });

  it('RETRY: a campaign Mailchimp already sent is recorded as sent, never rescheduled', async () => {
    mocks.batchData = [draft({ mailchimp_campaign_id: 'campaign-1' })];
    mocks.campaigns['campaign-1'] = { status: 'sent', sendTime: '2026-10-12T15:00:12+00:00' };

    const res = await post({ token: 't' });
    expect(res.status).toBe(200);
    expect(mocks.calls).not.toContain('mailchimp:schedule');
    expect(mocks.inserts[0].payload).toMatchObject({ newsletter_draft_id: 'd-1', status: 'sent' });
  });

  it('RETRY: an unknown campaign status stops the batch with a 502 and touches nothing else', async () => {
    mocks.batchData = [draft({ mailchimp_campaign_id: 'campaign-1' })];
    mocks.campaigns['campaign-1'] = { status: 'archived', sendTime: null };

    const res = await post({ token: 't' });
    expect(res.status).toBe(502);
    expect((await res.json()).error).toMatch(/archived/);
    expect(mocks.calls).not.toContain('db:insert:scheduled_sends');
  });

  it('refuses a batch whose draft links to an unpublished /insights/ post, before claiming', async () => {
    mocks.batchData = [
      draft({
        body_html: '<p><a href="https://www.nicolehansultcoaching.com/insights/grip-strength">read</a></p>',
      }),
    ];
    mocks.publishedSlugs = [];

    const res = await post({ token: 't' });
    expect(res.status).toBe(422);
    expect((await res.json()).error).toMatch(/grip-strength/);
    expect(mocks.rpcCalls).not.toContain('approve_batch');
  });

  it('lets a batch through when its /insights/ links are published', async () => {
    mocks.batchData = [
      draft({
        body_html: '<p><a href="https://www.nicolehansultcoaching.com/insights/grip-strength">read</a></p>',
      }),
    ];
    mocks.publishedSlugs = ['grip-strength'];

    const res = await post({ token: 't' });
    expect(res.status).toBe(200);
    expect(mocks.rpcCalls).toContain('approve_batch');
  });

  it('404s on an unknown token before reading any drafts or claiming', async () => {
    mocks.tokenRow = null;

    const res = await post({ token: 'nope' });
    expect(res.status).toBe(404);
    expect(mocks.calls).not.toContain('db:select:newsletter_drafts');
    expect(mocks.rpcCalls).not.toContain('approve_batch');
  });
});
