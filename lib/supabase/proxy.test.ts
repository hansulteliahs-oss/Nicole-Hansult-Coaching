/**
 * Phase 5 Plan 04 — extends Phase 4's proxy.ts with /vibrant40 membership check.
 *
 * Plan 01 created the stub with .todo placeholders; Plan 04 fills them in.
 * PAY-06.
 *
 * Mocks @supabase/ssr's createServerClient so getClaims() and the
 * vibrant40_members lookup are deterministic. NextRequest is used directly with
 * a constructed URL.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

type MockClaims = { sub: string; email?: string } | null;
type MockMember = { status: 'active' | 'refunded' | 'revoked' } | null;

// Hoisted shared state for the mock so each test can configure it.
const mockState = vi.hoisted(() => ({
  claims: null as MockClaims,
  member: null as MockMember,
  // call order tracking (PITFALL 6 — getClaims must run BEFORE membership query)
  callOrder: [] as string[],
  // capture whether the membership query was issued at all
  membershipQueryIssued: false,
}));

vi.mock('@supabase/ssr', () => {
  return {
    createServerClient: vi.fn(() => ({
      auth: {
        getClaims: vi.fn(async () => {
          mockState.callOrder.push('getClaims');
          if (mockState.claims === null) {
            return { data: null, error: null };
          }
          return {
            data: { claims: mockState.claims, header: {}, signature: '' },
            error: null,
          };
        }),
      },
      from: vi.fn((table: string) => {
        mockState.callOrder.push(`from:${table}`);
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(async () => {
                mockState.membershipQueryIssued = true;
                return { data: mockState.member, error: null };
              }),
            })),
          })),
        };
      }),
    })),
  };
});

// Stub the Supabase env vars so updateSession doesn't blow up on import.
beforeEach(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'test-publishable-key';
  mockState.claims = null;
  mockState.member = null;
  mockState.callOrder = [];
  mockState.membershipQueryIssued = false;
});

afterEach(() => {
  vi.clearAllMocks();
});

// Lazy import so the mock is in place before module evaluation.
async function loadUpdateSession() {
  const mod = await import('./proxy');
  return mod.updateSession;
}

function makeRequest(pathname: string): NextRequest {
  return new NextRequest(new URL(pathname, 'https://nicolehansultcoaching.com'));
}

describe('lib/supabase/proxy — updateSession (Phase 5 gating extension)', () => {
  it('anonymous request to /vibrant40 redirects to /login?next=/vibrant40', async () => {
    const updateSession = await loadUpdateSession();
    mockState.claims = null;

    const res = await updateSession(makeRequest('/vibrant40'));
    expect(res.status).toBe(307);
    const location = res.headers.get('location') ?? '';
    expect(location).toContain('/login');
    expect(location).toContain('next=%2Fvibrant40');
  });

  it('anonymous request to /vibrant40/days/day-1 redirects to /login?next=/vibrant40/days/day-1', async () => {
    const updateSession = await loadUpdateSession();
    mockState.claims = null;

    const res = await updateSession(makeRequest('/vibrant40/days/day-1'));
    expect(res.status).toBe(307);
    const location = res.headers.get('location') ?? '';
    expect(location).toContain('/login');
    expect(location).toContain('next=%2Fvibrant40%2Fdays%2Fday-1');
  });

  it('anonymous request to /account redirects to /login?next=/account (Phase 4 behavior preserved)', async () => {
    const updateSession = await loadUpdateSession();
    mockState.claims = null;

    const res = await updateSession(makeRequest('/account'));
    expect(res.status).toBe(307);
    const location = res.headers.get('location') ?? '';
    expect(location).toContain('/login');
    expect(location).toContain('next=%2Faccount');
  });

  it('authenticated request to /vibrant40 with no member row redirects to /services/vibrant40-jumpstart', async () => {
    const updateSession = await loadUpdateSession();
    mockState.claims = { sub: 'user-uuid', email: 'nonmember@example.com' };
    mockState.member = null;

    const res = await updateSession(makeRequest('/vibrant40'));
    expect(res.status).toBe(307);
    const location = res.headers.get('location') ?? '';
    expect(location).toContain('/services/vibrant40-jumpstart');
  });

  it('authenticated request to /vibrant40 with status=refunded redirects to /services/vibrant40-jumpstart', async () => {
    const updateSession = await loadUpdateSession();
    mockState.claims = { sub: 'user-uuid', email: 'refunded@example.com' };
    mockState.member = { status: 'refunded' };

    const res = await updateSession(makeRequest('/vibrant40'));
    expect(res.status).toBe(307);
    const location = res.headers.get('location') ?? '';
    expect(location).toContain('/services/vibrant40-jumpstart');
  });

  it('authenticated active member request to /vibrant40 passes through (NextResponse.next)', async () => {
    const updateSession = await loadUpdateSession();
    mockState.claims = { sub: 'user-uuid', email: 'member@example.com' };
    mockState.member = { status: 'active' };

    const res = await updateSession(makeRequest('/vibrant40'));
    // NextResponse.next() has no redirect status (no Location header set).
    expect(res.headers.get('location')).toBeNull();
    expect(res.status).toBe(200);
  });

  it('authenticated request to /account (no membership check) passes through regardless of vibrant40_members status', async () => {
    const updateSession = await loadUpdateSession();
    mockState.claims = { sub: 'user-uuid', email: 'acct@example.com' };
    mockState.member = null; // would block /vibrant40 but /account is exempt

    const res = await updateSession(makeRequest('/account'));
    expect(res.headers.get('location')).toBeNull();
    expect(res.status).toBe(200);
    // Critically: no membership query should have been issued for /account.
    expect(mockState.membershipQueryIssued).toBe(false);
  });

  it('public path / passes through and skips the membership query entirely', async () => {
    const updateSession = await loadUpdateSession();
    mockState.claims = null;

    const res = await updateSession(makeRequest('/'));
    expect(res.headers.get('location')).toBeNull();
    expect(res.status).toBe(200);
    expect(mockState.membershipQueryIssued).toBe(false);
  });

  it('calls getClaims() BEFORE the membership query (session refresh first — PITFALL 6)', async () => {
    const updateSession = await loadUpdateSession();
    mockState.claims = { sub: 'user-uuid', email: 'order@example.com' };
    mockState.member = { status: 'active' };

    await updateSession(makeRequest('/vibrant40/days/day-3'));

    const claimsIdx = mockState.callOrder.indexOf('getClaims');
    const queryIdx = mockState.callOrder.indexOf('from:vibrant40_members');
    expect(claimsIdx).toBeGreaterThanOrEqual(0);
    expect(queryIdx).toBeGreaterThan(claimsIdx);
  });
});
