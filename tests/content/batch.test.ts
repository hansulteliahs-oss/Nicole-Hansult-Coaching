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

  it('reports used before expired, matching resolveApprovalToken', async () => {
    mocks.tokenRow = { batch_id: 'b-1', used: true, expires_at: PAST };
    expect(await resolveBatchToken('t')).toEqual({ ok: false, reason: 'used' });
  });

  it('rejects an expired token', async () => {
    mocks.tokenRow = { batch_id: 'b-1', used: false, expires_at: PAST };
    expect(await resolveBatchToken('t')).toEqual({ ok: false, reason: 'expired' });
  });

  it('returns every draft in the batch, in send order', async () => {
    mocks.tokenRow = { batch_id: 'b-1', used: false, expires_at: FUTURE };
    mocks.drafts = [
      {
        id: 'd-1',
        subject: 'Doors open',
        preview_text: 'Cart is live',
        body_html: '<p><a href="https://x.com">join</a></p>',
        scheduled_for: '2026-09-28T16:00:00Z',
      },
      {
        id: 'd-2',
        subject: 'Last call',
        preview_text: null,
        body_html: '<p><a href="https://x.com">join</a></p>',
        scheduled_for: '2026-10-11T16:00:00Z',
      },
    ];

    const res = await resolveBatchToken('t');
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.drafts.map((d) => d.subject)).toEqual(['Doors open', 'Last call']);

    // The preview must carry everything that goes out, same rule as /approve.
    const draftSelect = mocks.selects.find((s) => s.table === 'newsletter_drafts')!;
    for (const column of ['subject', 'preview_text', 'body_html', 'scheduled_for']) {
      expect(draftSelect.columns).toContain(column);
    }
  });

  it('rejects a batch whose drafts have vanished', async () => {
    mocks.tokenRow = { batch_id: 'b-1', used: false, expires_at: FUTURE };
    mocks.drafts = [];
    expect(await resolveBatchToken('t')).toEqual({ ok: false, reason: 'missing' });
  });
});
