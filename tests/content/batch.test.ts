/**
 * lib/content/batch — resolve a batch token into the drafts it authorises.
 *
 * Admin client mocked, same posture as tests/content/approvals.test.ts.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  tokenRow: null as Record<string, unknown> | null,
  tokenError: null as { message: string } | null,
  drafts: [] as Record<string, unknown>[],
  draftsError: null as { message: string } | null,
  selects: [] as { table: string; columns: string }[],
}));

vi.mock('@/lib/supabase/admin', () => ({
  getAdminClient: () => ({
    from(table: string) {
      return {
        select(columns: string) {
          mocks.selects.push({ table, columns });
          return {
            eq() {
              return {
                maybeSingle: async () => ({
                  data: mocks.tokenRow,
                  error: mocks.tokenError,
                }),
                order: async () => ({ data: mocks.drafts, error: mocks.draftsError }),
              };
            },
          };
        },
      };
    },
  }),
}));

const { resolveBatchToken } = await import('@/lib/content/batch');

const FUTURE = new Date(Date.now() + 7 * 86400_000).toISOString();
const PAST = new Date(Date.now() - 60_000).toISOString();

beforeEach(() => {
  mocks.tokenRow = null;
  mocks.tokenError = null;
  mocks.drafts = [];
  mocks.draftsError = null;
  mocks.selects = [];
});

describe('resolveBatchToken', () => {
  it('rejects an empty token without touching the database', async () => {
    expect(await resolveBatchToken('')).toEqual({ ok: false, reason: 'missing' });
    expect(mocks.selects).toHaveLength(0);
  });

  it('rejects an unknown token', async () => {
    expect(await resolveBatchToken('t')).toEqual({ ok: false, reason: 'missing' });
  });

  it('rejects a single-draft token — that link belongs on /approve', async () => {
    mocks.tokenRow = { batch_id: null, used: false, expires_at: FUTURE };
    expect(await resolveBatchToken('t')).toEqual({ ok: false, reason: 'missing' });
  });

  it('rejects an expired, unclaimed token', async () => {
    mocks.tokenRow = { batch_id: 'b-1', used: false, expires_at: PAST };
    expect(await resolveBatchToken('t')).toEqual({ ok: false, reason: 'expired' });
  });

  // I1: approve_batch claims the token on the FIRST press but the route can
  // still fail partway through Mailchimp. A used token must load the drafts,
  // not be rejected, so a refresh can tell the truth about what still needs
  // scheduling instead of a blanket "already approved" that may be false.
  it('loads the drafts for a used token instead of rejecting it', async () => {
    mocks.tokenRow = { batch_id: 'b-1', used: true, expires_at: FUTURE };
    mocks.drafts = [
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

    const res = await resolveBatchToken('t');
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.alreadyUsed).toBe(true);
    expect(res.drafts).toHaveLength(1);
  });

  // Expiry only gates a token that has never been claimed — a used token
  // past its 14-day window is still the operator's only way back into a
  // partially-scheduled batch.
  it('does not reject a used token even if its expiry has passed', async () => {
    mocks.tokenRow = { batch_id: 'b-1', used: true, expires_at: PAST };
    mocks.drafts = [
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

    const res = await resolveBatchToken('t');
    expect(res.ok).toBe(true);
  });

  it('returns every draft in the batch, in send order, with who each one is for', async () => {
    mocks.tokenRow = { batch_id: 'b-1', used: false, expires_at: FUTURE };
    mocks.drafts = [
      {
        id: 'd-1',
        subject: 'Doors open',
        preview_text: 'Cart is live',
        body_html: '<p><a href="https://x.com">join</a></p>',
        list_id: 'f531604a9a',
        segment_id: null,
        scheduled_for: '2026-09-28T16:00:00Z',
        mailchimp_campaign_id: null,
      },
      {
        id: 'd-2',
        subject: 'Last call',
        preview_text: null,
        body_html: '<p><a href="https://x.com">join</a></p>',
        list_id: 'ecacfdabed',
        segment_id: '127',
        scheduled_for: '2026-10-11T16:00:00Z',
        mailchimp_campaign_id: null,
      },
    ];

    const res = await resolveBatchToken('t');
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.alreadyUsed).toBe(false);
    expect(res.drafts.map((d) => d.subject)).toEqual(['Doors open', 'Last call']);
    expect(res.drafts[1].list_id).toBe('ecacfdabed');
    expect(res.drafts[1].segment_id).toBe('127');

    // The preview must carry everything that goes out, same rule as /approve
    // — and now that includes who it goes to (I4) and whether it already
    // shipped (I1).
    const draftSelect = mocks.selects.find((s) => s.table === 'newsletter_drafts')!;
    for (const column of [
      'subject',
      'preview_text',
      'body_html',
      'list_id',
      'segment_id',
      'scheduled_for',
      'mailchimp_campaign_id',
    ]) {
      expect(draftSelect.columns).toContain(column);
    }
  });

  it('rejects a batch whose drafts have vanished', async () => {
    mocks.tokenRow = { batch_id: 'b-1', used: false, expires_at: FUTURE };
    mocks.drafts = [];
    expect(await resolveBatchToken('t')).toEqual({ ok: false, reason: 'missing' });
  });
});
