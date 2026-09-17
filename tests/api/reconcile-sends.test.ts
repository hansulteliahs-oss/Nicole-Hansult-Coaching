/**
 * GET /api/cron/reconcile-sends — the daily sweep that flips queued sends to
 * sent once Mailchimp has actually sent them.
 *
 * A scheduled campaign fires inside Mailchimp with no callback to the site,
 * so without this the /queue page and content_plan would show a launch email
 * as "queued" forever. mark_sent is the site RPC that completes the draft,
 * the plan slot and the sends row in one statement; this route only decides
 * which rows to hand it.
 *
 * Auth is Vercel's cron convention: `Authorization: Bearer $CRON_SECRET`.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  queued: [] as Record<string, unknown>[],
  queuedError: null as { message: string } | null,
  campaigns: {} as Record<string, { status: string; sendTime: string | null }>,
  rpcCalls: [] as { fn: string; args: Record<string, unknown> }[],
  rpcError: null as { message: string } | null,
}));

vi.mock('@/lib/supabase/admin', () => ({
  getAdminClient: () => ({
    from() {
      return {
        select: () => ({
          eq: () => ({
            lt: async () => ({ data: mocks.queued, error: mocks.queuedError }),
          }),
        }),
      };
    },
    async rpc(fn: string, args: Record<string, unknown>) {
      mocks.rpcCalls.push({ fn, args });
      return { data: null, error: mocks.rpcError };
    },
  }),
}));

vi.mock('@/lib/mailchimp/campaigns', () => ({
  getCampaign: async (id: string) => {
    const c = mocks.campaigns[id];
    if (!c) throw new Error(`Mailchimp GET /campaigns/${id} failed (404)`);
    return { id, ...c };
  },
}));

const { GET } = await import('@/app/api/cron/reconcile-sends/route');

const get = (auth?: string) =>
  GET(
    new Request('http://localhost/api/cron/reconcile-sends', {
      method: 'GET',
      headers: auth ? { authorization: auth } : {},
    }),
  );

const row = (over: Record<string, unknown> = {}) => ({
  id: 's-1',
  newsletter_draft_id: 'd-1',
  mailchimp_campaign_id: 'campaign-1',
  scheduled_for: '2026-10-12T15:00:00+00:00',
  ...over,
});

beforeEach(() => {
  process.env.CRON_SECRET = 'cron-secret';
  mocks.queued = [];
  mocks.queuedError = null;
  mocks.campaigns = {};
  mocks.rpcCalls = [];
  mocks.rpcError = null;
});

describe('GET /api/cron/reconcile-sends', () => {
  it('401s without the bearer secret', async () => {
    expect((await get()).status).toBe(401);
    expect((await get('Bearer wrong')).status).toBe(401);
    expect(mocks.rpcCalls).toHaveLength(0);
  });

  it('401s when CRON_SECRET is unset, rather than running open', async () => {
    delete process.env.CRON_SECRET;
    expect((await get('Bearer ')).status).toBe(401);
  });

  it('marks a queued send whose campaign Mailchimp reports as sent', async () => {
    mocks.queued = [row()];
    mocks.campaigns['campaign-1'] = { status: 'sent', sendTime: '2026-10-12T15:00:12+00:00' };

    const res = await get('Bearer cron-secret');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, checked: 1, marked: 1, pending: 0, errors: 0 });
    expect(mocks.rpcCalls).toEqual([
      {
        fn: 'mark_sent',
        args: {
          p_draft_id: 'd-1',
          p_campaign_id: 'campaign-1',
          p_sent_at: '2026-10-12T15:00:12+00:00',
        },
      },
    ]);
  });

  it('leaves a send alone while Mailchimp still says schedule or sending', async () => {
    mocks.queued = [row({ id: 's-1', mailchimp_campaign_id: 'c-1' }), row({ id: 's-2', newsletter_draft_id: 'd-2', mailchimp_campaign_id: 'c-2' })];
    mocks.campaigns['c-1'] = { status: 'schedule', sendTime: null };
    mocks.campaigns['c-2'] = { status: 'sending', sendTime: null };

    const res = await get('Bearer cron-secret');
    expect(await res.json()).toEqual({ ok: true, checked: 2, marked: 0, pending: 2, errors: 0 });
    expect(mocks.rpcCalls).toHaveLength(0);
  });

  it('falls back to the scheduled time when Mailchimp gives no send time', async () => {
    mocks.queued = [row()];
    mocks.campaigns['campaign-1'] = { status: 'sent', sendTime: null };
    await get('Bearer cron-secret');
    expect(mocks.rpcCalls[0].args.p_sent_at).toBe('2026-10-12T15:00:00+00:00');
  });

  it('counts a Mailchimp lookup failure and keeps going with the rest', async () => {
    mocks.queued = [row({ id: 's-1', mailchimp_campaign_id: 'gone' }), row({ id: 's-2', newsletter_draft_id: 'd-2', mailchimp_campaign_id: 'c-2' })];
    mocks.campaigns['c-2'] = { status: 'sent', sendTime: null };

    const res = await get('Bearer cron-secret');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, checked: 2, marked: 1, pending: 0, errors: 1 });
    expect(mocks.rpcCalls.map((c) => c.args.p_draft_id)).toEqual(['d-2']);
  });

  it('502s when the queued rows cannot be read', async () => {
    mocks.queuedError = { message: 'db down' };
    expect((await get('Bearer cron-secret')).status).toBe(502);
  });
});
