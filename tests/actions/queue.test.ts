/**
 * /queue server actions — passcode gate and the cancel ordering.
 *
 * The ordering assertion is the point of this file: unschedule in Mailchimp,
 * THEN mark the row cancelled. Reversed, a Mailchimp failure leaves a row
 * claiming a campaign is cancelled while it is still armed to send.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  order: [] as string[],
  runs: [] as unknown[],
  sends: [] as unknown[],
  sendRow: null as Record<string, unknown> | null,
  unscheduleThrows: null as Error | null,
  rpcCalls: [] as { fn: string; args: Record<string, unknown> }[],
}));

vi.mock('@/lib/supabase/admin', () => ({
  getAdminClient: () => ({
    from(table: string) {
      const result =
        table === 'pipeline_runs'
          ? { data: mocks.runs, error: null }
          : { data: mocks.sends, error: null };
      const builder = {
        select: () => builder,
        eq: () => builder,
        order: () => builder,
        limit: async () => result,
        maybeSingle: async () => ({ data: mocks.sendRow, error: null }),
      };
      return builder;
    },
    async rpc(fn: string, args: Record<string, unknown>) {
      mocks.order.push('rpc');
      mocks.rpcCalls.push({ fn, args });
      return { data: { status: 'cancelled' }, error: null };
    },
  }),
}));

vi.mock('@/lib/mailchimp/campaigns', () => ({
  unscheduleCampaign: async () => {
    mocks.order.push('unschedule');
    if (mocks.unscheduleThrows) throw mocks.unscheduleThrows;
  },
}));

vi.mock('next/headers', () => ({
  headers: async () => new Map([['x-forwarded-for', '127.0.0.1']]),
}));

const { loadQueueAction, cancelScheduledSendAction } = await import('@/lib/actions/queue');
const { _resetCache } = await import('@/lib/rate-limit');

beforeEach(() => {
  _resetCache();
  process.env.QUEUE_KEY = 'letmein';
  mocks.order = [];
  mocks.runs = [];
  mocks.sends = [];
  mocks.sendRow = { id: 's-1', mailchimp_campaign_id: 'c-1' };
  mocks.unscheduleThrows = null;
  mocks.rpcCalls = [];
});

describe('loadQueueAction', () => {
  it('refuses a wrong passcode without reading anything', async () => {
    const res = await loadQueueAction('nope');
    expect(res).toEqual({ ok: false, error: 'bad_key' });
  });

  it('returns runs and sends on the right passcode', async () => {
    mocks.runs = [{ id: 'r-1', kind: 'weekly', status: 'ok' }];
    mocks.sends = [{ id: 's-1', status: 'queued' }];

    const res = await loadQueueAction('letmein');
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.runs).toHaveLength(1);
    expect(res.sends).toHaveLength(1);
  });

  it('rate limits repeated guesses', async () => {
    for (let i = 0; i < 10; i += 1) await loadQueueAction('nope');
    const res = await loadQueueAction('letmein');
    expect(res).toEqual({ ok: false, error: 'rate_limited' });
  });
});

describe('cancelScheduledSendAction', () => {
  it('refuses a wrong passcode', async () => {
    const res = await cancelScheduledSendAction('nope', 's-1', 'seats sold');
    expect(res).toEqual({ ok: false, error: 'bad_key' });
    expect(mocks.order).toEqual([]);
  });

  it('unschedules in Mailchimp BEFORE marking the row cancelled', async () => {
    const res = await cancelScheduledSendAction('letmein', 's-1', 'seats sold');
    expect(res).toEqual({ ok: true });
    expect(mocks.order).toEqual(['unschedule', 'rpc']);
    expect(mocks.rpcCalls[0].fn).toBe('cancel_scheduled_send');
    expect(mocks.rpcCalls[0].args.p_reason).toBe('seats sold');
  });

  it('leaves the row alone when Mailchimp refuses the unschedule', async () => {
    mocks.unscheduleThrows = new Error('Mailchimp 500');

    const res = await cancelScheduledSendAction('letmein', 's-1', 'seats sold');
    expect(res).toEqual({ ok: false, error: 'mailchimp' });
    expect(mocks.order).toEqual(['unschedule']);
    expect(mocks.rpcCalls).toHaveLength(0);
  });

  it('errors when the send row is unknown', async () => {
    mocks.sendRow = null;
    const res = await cancelScheduledSendAction('letmein', 's-9', 'x');
    expect(res).toEqual({ ok: false, error: 'server' });
    expect(mocks.order).toEqual([]);
  });
});
