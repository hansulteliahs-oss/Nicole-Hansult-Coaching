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
                  subject: d.subject,
                  scheduled_for: d.scheduled_for,
                  mailchimp_campaign_id: d.mailchimp_campaign_id,
                }));
              return Promise.resolve({ data: rows, error: mocks.preDraftsError });
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
        insert: async () => {
          mocks.calls.push(`db:insert:${table}`);
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
      { subject: 'Doors open', scheduled_for: null, mailchimp_campaign_id: 'campaign-1' },
    ];
    mocks.batchData = [
      {
        id: 'd-1',
        subject: 'Doors open',
        preview_text: null,
        body_html: '<p>hi</p>',
        list_id: 'f531604a9a',
        segment_id: null,
        scheduled_for: null,
        mailchimp_campaign_id: 'campaign-1',
      },
    ];

    const res = await post({ token: 't' });
    expect(res.status).toBe(200);
    expect(mocks.rpcCalls).toContain('approve_batch');
    const json = await res.json();
    expect(json).toEqual({ ok: true, scheduled: 0, skipped: 1 });
  });

  it('404s on an unknown token before reading any drafts or claiming', async () => {
    mocks.tokenRow = null;

    const res = await post({ token: 'nope' });
    expect(res.status).toBe(404);
    expect(mocks.calls).not.toContain('db:select:newsletter_drafts');
    expect(mocks.rpcCalls).not.toContain('approve_batch');
  });
});
