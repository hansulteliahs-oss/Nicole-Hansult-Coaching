/**
 * lib/content/approvals — server-side resolution of an approval token into
 * the draft it authorises, or a typed rejection.
 *
 * Mocks lib/supabase/admin so no live Supabase connection is needed. The
 * mock models PostgREST's maybeSingle() shape: { data, error }.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  tokenRow: null as Record<string, unknown> | null,
  tokenError: null as { message: string } | null,
  draftRow: null as Record<string, unknown> | null,
  draftError: null as { message: string } | null,
  // Records every (table, column, value) filter the resolver issues.
  calls: [] as { table: string; column: string; value: unknown }[],
}));

vi.mock('@/lib/supabase/admin', () => ({
  getAdminClient: () => ({
    from(table: string) {
      return {
        select() {
          return {
            eq(column: string, value: unknown) {
              mocks.calls.push({ table, column, value });
              return {
                maybeSingle: async () =>
                  table === 'approval_tokens'
                    ? { data: mocks.tokenRow, error: mocks.tokenError }
                    : { data: mocks.draftRow, error: mocks.draftError },
              };
            },
          };
        },
      };
    },
  }),
}));

const { resolveApprovalToken } = await import('@/lib/content/approvals');

const FUTURE = new Date(Date.now() + 7 * 86400_000).toISOString();
const PAST = new Date(Date.now() - 60_000).toISOString();

beforeEach(() => {
  mocks.tokenRow = null;
  mocks.tokenError = null;
  mocks.draftRow = null;
  mocks.draftError = null;
  mocks.calls = [];
});

describe('resolveApprovalToken', () => {
  it('rejects an empty token without touching the database', async () => {
    const res = await resolveApprovalToken('');
    expect(res).toEqual({ ok: false, reason: 'missing' });
    expect(mocks.calls).toHaveLength(0);
  });

  it('rejects an unknown token as missing', async () => {
    mocks.tokenRow = null;
    const res = await resolveApprovalToken('nope');
    expect(res).toEqual({ ok: false, reason: 'missing' });
  });

  it('rejects a database error as missing rather than throwing', async () => {
    mocks.tokenError = { message: 'boom' };
    const res = await resolveApprovalToken('tok');
    expect(res).toEqual({ ok: false, reason: 'missing' });
  });

  it('looks the token up by token_hash, because token_hash holds the raw token', async () => {
    mocks.tokenRow = {
      token_hash: 'raw-token-abc',
      draft_kind: 'post',
      draft_id: 'post-1',
      used: false,
      expires_at: FUTURE,
    };
    mocks.draftRow = { title: 'T', body_md: '# B' };
    await resolveApprovalToken('raw-token-abc');
    expect(mocks.calls[0]).toEqual({
      table: 'approval_tokens',
      column: 'token_hash',
      value: 'raw-token-abc',
    });
  });

  it('rejects an already-used token as used, even when it is also expired', async () => {
    mocks.tokenRow = {
      token_hash: 't', draft_kind: 'post', draft_id: 'p', used: true, expires_at: PAST,
    };
    const res = await resolveApprovalToken('t');
    expect(res).toEqual({ ok: false, reason: 'used' });
  });

  it('rejects an expired unused token as expired', async () => {
    mocks.tokenRow = {
      token_hash: 't', draft_kind: 'post', draft_id: 'p', used: false, expires_at: PAST,
    };
    const res = await resolveApprovalToken('t');
    expect(res).toEqual({ ok: false, reason: 'expired' });
  });

  it('resolves a valid post token to its title and markdown body', async () => {
    mocks.tokenRow = {
      token_hash: 't', draft_kind: 'post', draft_id: 'post-9', used: false, expires_at: FUTURE,
    };
    mocks.draftRow = { title: 'Why mobility matters', body_md: '## Intro\n\nText.' };
    const res = await resolveApprovalToken('t');
    expect(res).toEqual({
      ok: true,
      draft: { kind: 'post', title: 'Why mobility matters', body_md: '## Intro\n\nText.' },
    });
    expect(mocks.calls[1]).toEqual({ table: 'posts', column: 'id', value: 'post-9' });
  });

  it('resolves a valid newsletter token to its subject, preview text and html', async () => {
    mocks.tokenRow = {
      token_hash: 't', draft_kind: 'newsletter', draft_id: 'nl-3', used: false, expires_at: FUTURE,
    };
    mocks.draftRow = {
      subject: 'Your body is talking',
      preview_text: 'Signals, not sentences.',
      body_html: '<p>hello</p>',
    };
    const res = await resolveApprovalToken('t');
    expect(res).toEqual({
      ok: true,
      draft: {
        kind: 'newsletter',
        subject: 'Your body is talking',
        preview_text: 'Signals, not sentences.',
        body_html: '<p>hello</p>',
      },
    });
    expect(mocks.calls[1]).toEqual({ table: 'newsletter_drafts', column: 'id', value: 'nl-3' });
  });

  it('rejects a valid token whose draft row has gone as missing', async () => {
    mocks.tokenRow = {
      token_hash: 't', draft_kind: 'post', draft_id: 'gone', used: false, expires_at: FUTURE,
    };
    mocks.draftRow = null;
    const res = await resolveApprovalToken('t');
    expect(res).toEqual({ ok: false, reason: 'missing' });
  });

  it('rejects an unrecognised draft_kind as missing', async () => {
    mocks.tokenRow = {
      token_hash: 't', draft_kind: 'podcast', draft_id: 'x', used: false, expires_at: FUTURE,
    };
    const res = await resolveApprovalToken('t');
    expect(res).toEqual({ ok: false, reason: 'missing' });
  });
});
