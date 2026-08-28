/**
 * POST /api/approve — the route that does the irreversible thing.
 *
 * Supabase and Mailchimp are both mocked. The case worth the most is the last
 * two: when Mailchimp fails, the route's response depends on WHERE it failed.
 * A throw from createCampaign/setCampaignContent means nothing was sent, so
 * the draft is released and the same link works again. A throw from
 * sendCampaign is ambiguous — Mailchimp may have accepted and sent while the
 * response was lost — so releasing there would hand back a live link whose
 * next tap sends to the whole list a second time. That is root cause 1
 * rebuilt in TypeScript, just moved one function later.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  tokenRow: null as Record<string, unknown> | null,
  tokenError: null as { message: string } | null,
  rpcResults: {} as Record<string, { data: unknown; error: { message: string } | null }>,
  rpcCalls: [] as { fn: string; args: Record<string, unknown> }[],
  previewText: null as string | null,
  createThrows: null as Error | null,
  contentThrows: null as Error | null,
  sendThrows: null as Error | null,
  mailchimpCalls: [] as string[],
  revalidated: [] as string[],
  inserts: [] as { table: string; payload: Record<string, unknown> }[],
}));

vi.mock('@/lib/supabase/admin', () => ({
  getAdminClient: () => ({
    from(table: string) {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () =>
              table === 'approval_tokens'
                ? { data: mocks.tokenRow, error: mocks.tokenError }
                : { data: { preview_text: mocks.previewText }, error: null },
          }),
        }),
        insert: async (payload: Record<string, unknown>) => {
          mocks.inserts.push({ table, payload });
          return { data: null, error: null };
        },
      };
    },
    async rpc(fn: string, args: Record<string, unknown>) {
      mocks.rpcCalls.push({ fn, args });
      return mocks.rpcResults[fn] ?? { data: null, error: null };
    },
  }),
}));

vi.mock('@/lib/mailchimp/campaigns', () => ({
  createCampaign: async () => {
    mocks.mailchimpCalls.push('create');
    if (mocks.createThrows) throw mocks.createThrows;
    return 'campaign-1';
  },
  setCampaignContent: async () => {
    mocks.mailchimpCalls.push('content');
    if (mocks.contentThrows) throw mocks.contentThrows;
  },
  sendCampaign: async () => {
    mocks.mailchimpCalls.push('send');
    if (mocks.sendThrows) throw mocks.sendThrows;
  },
}));

vi.mock('next/cache', () => ({
  revalidateTag: (tag: string) => mocks.revalidated.push(`tag:${tag}`),
  revalidatePath: (p: string) => mocks.revalidated.push(`path:${p}`),
}));

const { POST } = await import('@/app/api/approve/route');

const post = (body: unknown) =>
  POST(
    new Request('http://localhost/api/approve', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }),
  );

beforeEach(() => {
  mocks.tokenRow = null;
  mocks.tokenError = null;
  mocks.rpcResults = {};
  mocks.rpcCalls = [];
  mocks.previewText = null;
  mocks.createThrows = null;
  mocks.contentThrows = null;
  mocks.sendThrows = null;
  mocks.mailchimpCalls = [];
  mocks.revalidated = [];
  mocks.inserts = [];
});

describe('POST /api/approve', () => {
  it('rejects a body with no token', async () => {
    const res = await post({});
    expect(res.status).toBe(400);
  });

  it('404s an unknown token', async () => {
    const res = await post({ token: 'nope' });
    expect(res.status).toBe(404);
    expect(mocks.rpcCalls).toHaveLength(0);
  });

  it('sends a batch token to the batch page instead of approving anything', async () => {
    mocks.tokenRow = { draft_kind: 'newsletter', batch_id: 'b-1' };
    const res = await post({ token: 't' });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/batch/i);
    expect(mocks.rpcCalls).toHaveLength(0);
  });

  it('publishes a post and revalidates the blog in-process', async () => {
    mocks.tokenRow = { draft_kind: 'post', batch_id: null };
    mocks.rpcResults.approve_and_publish = {
      data: [{ slug: 'knee-pain-stairs', already: false }],
      error: null,
    };

    const res = await post({ token: 't' });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      ok: true,
      already: false,
      slug: 'knee-pain-stairs',
    });

    expect(mocks.rpcCalls[0].fn).toBe('approve_and_publish');
    expect(mocks.revalidated).toEqual([
      'tag:blog',
      'tag:blog:knee-pain-stairs',
      'path:/insights/knee-pain-stairs',
      'path:/insights',
    ]);
  });

  it('reports a second post tap as already, without erroring', async () => {
    mocks.tokenRow = { draft_kind: 'post', batch_id: null };
    mocks.rpcResults.approve_and_publish = {
      data: [{ slug: 'knee-pain-stairs', already: true }],
      error: null,
    };

    const res = await post({ token: 't' });
    expect(res.status).toBe(200);
    expect((await res.json()).already).toBe(true);
  });

  it('surfaces an expired token as 409, not 500', async () => {
    mocks.tokenRow = { draft_kind: 'post', batch_id: null };
    mocks.rpcResults.approve_and_publish = {
      data: null,
      error: { message: 'approve_and_publish: token expired' },
    };

    const res = await post({ token: 't' });
    expect(res.status).toBe(409);
  });

  it('creates, fills and sends a newsletter, then marks it sent', async () => {
    mocks.tokenRow = { draft_kind: 'newsletter', batch_id: null };
    mocks.rpcResults.claim_for_send = {
      data: [
        {
          draft_id: 'd-1',
          subject: 'Stairs',
          body_html: '<p><a href="https://x.com">read</a></p>',
          list_id: 'f531604a9a',
          segment_id: null,
          already: false,
        },
      ],
      error: null,
    };

    const res = await post({ token: 't' });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      ok: true,
      already: false,
      campaignId: 'campaign-1',
    });

    expect(mocks.mailchimpCalls).toEqual(['create', 'content', 'send']);
    expect(mocks.rpcCalls.map((c) => c.fn)).toEqual(['claim_for_send', 'mark_sent']);
    expect(mocks.rpcCalls[1].args.p_campaign_id).toBe('campaign-1');
  });

  it('reports success when mark_sent fails after the send actually went out', async () => {
    mocks.tokenRow = { draft_kind: 'newsletter', batch_id: null };
    mocks.rpcResults.claim_for_send = {
      data: [
        {
          draft_id: 'd-1',
          subject: 'Stairs',
          body_html: '<p>x</p>',
          list_id: 'f531604a9a',
          segment_id: null,
          already: false,
        },
      ],
      error: null,
    };
    mocks.rpcResults.mark_sent = { data: null, error: { message: 'boom' } };

    const res = await post({ token: 't' });
    // The send DID happen — Mailchimp already sent it. Telling the operator
    // it failed would be a lie that invites a retry, and a retry here is a
    // duplicate send to the whole list.
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.already).toBe(false);
    expect(body.campaignId).toBe('campaign-1');
    expect(body.warning).toBeTruthy();

    expect(mocks.mailchimpCalls).toEqual(['create', 'content', 'send']);
  });

  it('does not touch Mailchimp when the claim reports already', async () => {
    mocks.tokenRow = { draft_kind: 'newsletter', batch_id: null };
    mocks.rpcResults.claim_for_send = {
      data: [{ draft_id: 'd-1', already: true }],
      error: null,
    };

    const res = await post({ token: 't' });
    expect(res.status).toBe(200);
    expect((await res.json()).already).toBe(true);
    expect(mocks.mailchimpCalls).toEqual([]);
  });

  it('ROOT CAUSE 1 (before dispatch): releases the draft when createCampaign throws', async () => {
    mocks.tokenRow = { draft_kind: 'newsletter', batch_id: null };
    mocks.rpcResults.claim_for_send = {
      data: [
        {
          draft_id: 'd-1',
          subject: 'Stairs',
          body_html: '<p>x</p>',
          list_id: 'f531604a9a',
          segment_id: null,
          already: false,
        },
      ],
      error: null,
    };
    mocks.createThrows = new Error('Mailchimp 504');

    const res = await post({ token: 't' });
    expect(res.status).toBe(502);

    const fns = mocks.rpcCalls.map((c) => c.fn);
    expect(fns).toEqual(['claim_for_send', 'release_for_retry']);
    expect(fns).not.toContain('mark_sent');
    expect(mocks.rpcCalls[1].args.p_error).toMatch(/504/);
  });

  it('releases the draft when setCampaignContent throws — the split keys on reaching the send call, not on which function threw', async () => {
    mocks.tokenRow = { draft_kind: 'newsletter', batch_id: null };
    mocks.rpcResults.claim_for_send = {
      data: [
        {
          draft_id: 'd-1',
          subject: 'Stairs',
          body_html: '<p>x</p>',
          list_id: 'f531604a9a',
          segment_id: null,
          already: false,
        },
      ],
      error: null,
    };
    mocks.contentThrows = new Error('Mailchimp 500');

    const res = await post({ token: 't' });
    expect(res.status).toBe(502);

    const fns = mocks.rpcCalls.map((c) => c.fn);
    expect(fns).toEqual(['claim_for_send', 'release_for_retry']);
    expect(mocks.mailchimpCalls).toEqual(['create', 'content']);
  });

  it('AMBIGUOUS SEND: holds the draft and does NOT release when sendCampaign throws', async () => {
    mocks.tokenRow = { draft_kind: 'newsletter', batch_id: null };
    mocks.rpcResults.claim_for_send = {
      data: [
        {
          draft_id: 'd-1',
          subject: 'Stairs',
          body_html: '<p>x</p>',
          list_id: 'f531604a9a',
          segment_id: null,
          already: false,
        },
      ],
      error: null,
    };
    mocks.sendThrows = new Error('timeout');

    const res = await post({ token: 't' });
    expect(res.status).toBe(502);

    const fns = mocks.rpcCalls.map((c) => c.fn);
    expect(fns).not.toContain('release_for_retry');
    expect(fns).toEqual(['claim_for_send']);
    expect(mocks.mailchimpCalls).toEqual(['create', 'content', 'send']);

    expect(mocks.inserts).toHaveLength(1);
    expect(mocks.inserts[0].table).toBe('pipeline_runs');
    expect(mocks.inserts[0].payload.notes).toMatchObject({ send_outcome: 'unknown' });
  });
});
