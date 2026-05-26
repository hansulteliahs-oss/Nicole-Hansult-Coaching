/**
 * Phase 5 Plan 03 — POST /api/webhooks/stripe (signature + idempotency + dispatch).
 *
 * PAY-04. Replaces the 14 .todo placeholders from Plan 01 Wave 0 with real
 * assertions. Stripe SDK + Supabase admin + Resend are all mocked so the suite
 * is hermetic — no network, no real signing keys needed.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

// ─── Mocks ──────────────────────────────────────────────────────────────────

const constructEventMock = vi.fn();
vi.mock('@/lib/stripe', () => ({
  stripe: {
    webhooks: {
      constructEvent: (...args: unknown[]) => constructEventMock(...args),
    },
  },
}));

const sendMock = vi.fn().mockResolvedValue({ data: { id: 'email_123' }, error: null });
vi.mock('resend', () => ({
  Resend: vi.fn().mockImplementation(function () {
    return { emails: { send: sendMock } };
  }),
}));

// Chainable Supabase builder factory — every test gets a fresh tracker.
type Op = {
  table: string;
  method: 'insert' | 'upsert' | 'update';
  payload: unknown;
  eq?: { col: string; val: unknown };
};

const supabaseState: {
  ops: Op[];
  insertErrors: Record<string, { code?: string; message?: string } | null>;
} = { ops: [], insertErrors: {} };

function makeBuilder(table: string) {
  let pending: Op | null = null;
  const builder: Record<string, unknown> = {};
  builder.insert = (payload: unknown) => {
    pending = { table, method: 'insert', payload };
    supabaseState.ops.push(pending);
    const err = supabaseState.insertErrors[table] ?? null;
    return Promise.resolve({ data: null, error: err });
  };
  builder.upsert = (payload: unknown, _opts?: unknown) => {
    pending = { table, method: 'upsert', payload };
    supabaseState.ops.push(pending);
    return Promise.resolve({ data: null, error: null });
  };
  builder.update = (payload: unknown) => {
    pending = { table, method: 'update', payload };
    supabaseState.ops.push(pending);
    return {
      eq: (col: string, val: unknown) => {
        if (pending) pending.eq = { col, val };
        return Promise.resolve({ data: null, error: null });
      },
    };
  };
  return builder;
}

vi.mock('@/lib/supabase/admin', () => ({
  getAdminClient: () => ({
    from: (table: string) => makeBuilder(table),
  }),
}));

// ─── Fixtures ───────────────────────────────────────────────────────────────

const CHECKOUT_EVENT = {
  id: 'evt_test_checkout_1',
  type: 'checkout.session.completed',
  data: {
    object: {
      id: 'cs_test_a1',
      customer: 'cus_test_a1',
      customer_details: { email: 'Buyer@Example.com' },
      amount_total: 8800,
    },
  },
};

const REFUND_EVENT = {
  id: 'evt_test_refund_1',
  type: 'charge.refunded',
  data: {
    object: {
      id: 'ch_test_a1',
      billing_details: { email: 'buyer@example.com' },
    },
  },
};

const UNKNOWN_EVENT = {
  id: 'evt_test_unknown_1',
  type: 'invoice.paid',
  data: { object: {} },
};

// Build a minimal Request-compatible object for our route handler.
function makeReq(rawBody: string) {
  return {
    text: async () => rawBody,
    headers: new Headers(),
  } as unknown as Request;
}

// next/headers helper — mocked per-test.
function mockNextHeaders(headers: Record<string, string>) {
  vi.doMock('next/headers', () => ({
    headers: async () => ({
      get: (name: string) => headers[name.toLowerCase()] ?? headers[name] ?? null,
    }),
  }));
}

// ─── Suite ──────────────────────────────────────────────────────────────────

describe('POST /api/webhooks/stripe', () => {
  beforeEach(() => {
    vi.resetModules();
    supabaseState.ops = [];
    supabaseState.insertErrors = {};
    constructEventMock.mockReset();
    sendMock.mockReset();
    sendMock.mockResolvedValue({ data: { id: 'email_123' }, error: null });
    process.env.STRIPE_WEBHOOK_SECRET_TEST = 'whsec_test_dummy';
    process.env.STRIPE_WEBHOOK_SECRET_LIVE = 'whsec_live_dummy';
    process.env.STRIPE_SECRET_KEY = 'sk_test_dummy';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SECRET_KEY = 'sb_secret_dummy';
    process.env.RESEND_API_KEY = 're_dummy';
    process.env.RESEND_FROM_EMAIL = 'Nicole <nicole@mail.nicolehansultcoaching.com>';
    process.env.NEXT_PUBLIC_SITE_URL = 'https://nicole-hansult-coaching.vercel.app';
    vi.stubEnv('NODE_ENV', 'test');
  });

  it('rejects requests with no stripe-signature header with 400', async () => {
    mockNextHeaders({});
    const { POST } = await import('@/app/api/webhooks/stripe/route');
    const res = await POST(makeReq('{}'));
    expect(res.status).toBe(400);
  });

  it('rejects requests with a bad signature against the env secret with 400', async () => {
    mockNextHeaders({ 'stripe-signature': 'bad_sig' });
    constructEventMock.mockImplementation(() => {
      throw new Error('No signatures found matching the expected signature');
    });
    const { POST } = await import('@/app/api/webhooks/stripe/route');
    const res = await POST(makeReq('{}'));
    expect(res.status).toBe(400);
    const body = await res.text();
    expect(body).toContain('Bad signature');
  });

  it('uses STRIPE_WEBHOOK_SECRET_LIVE in production (NODE_ENV === "production")', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    mockNextHeaders({ 'stripe-signature': 'sig' });
    constructEventMock.mockReturnValue(UNKNOWN_EVENT);
    const { POST } = await import('@/app/api/webhooks/stripe/route');
    await POST(makeReq('raw'));
    expect(constructEventMock).toHaveBeenCalledWith('raw', 'sig', 'whsec_live_dummy');
  });

  it('uses STRIPE_WEBHOOK_SECRET_TEST in non-production envs', async () => {
    mockNextHeaders({ 'stripe-signature': 'sig' });
    constructEventMock.mockReturnValue(UNKNOWN_EVENT);
    const { POST } = await import('@/app/api/webhooks/stripe/route');
    await POST(makeReq('raw'));
    expect(constructEventMock).toHaveBeenCalledWith('raw', 'sig', 'whsec_test_dummy');
  });

  it('reads the body via req.text() — never req.json()', async () => {
    mockNextHeaders({ 'stripe-signature': 'sig' });
    constructEventMock.mockReturnValue(UNKNOWN_EVENT);
    const textSpy = vi.fn().mockResolvedValue('raw-body-string');
    const jsonSpy = vi.fn();
    const req = { text: textSpy, json: jsonSpy, headers: new Headers() } as unknown as Request;
    const { POST } = await import('@/app/api/webhooks/stripe/route');
    await POST(req);
    expect(textSpy).toHaveBeenCalledTimes(1);
    expect(jsonSpy).not.toHaveBeenCalled();
  });

  it('returns 200 + { skipped } for event types not in PERMITTED', async () => {
    mockNextHeaders({ 'stripe-signature': 'sig' });
    constructEventMock.mockReturnValue(UNKNOWN_EVENT);
    const { POST } = await import('@/app/api/webhooks/stripe/route');
    const res = await POST(makeReq('raw'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.skipped).toBe('invoice.paid');
    expect(supabaseState.ops).toHaveLength(0);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('inserts a stripe_events row keyed by event.id BEFORE dispatch', async () => {
    mockNextHeaders({ 'stripe-signature': 'sig' });
    constructEventMock.mockReturnValue(CHECKOUT_EVENT);
    const { POST } = await import('@/app/api/webhooks/stripe/route');
    await POST(makeReq('raw'));
    expect(supabaseState.ops[0]).toMatchObject({
      table: 'stripe_events',
      method: 'insert',
    });
    const payload = supabaseState.ops[0].payload as { event_id: string; type: string };
    expect(payload.event_id).toBe('evt_test_checkout_1');
    expect(payload.type).toBe('checkout.session.completed');
  });

  it('returns 200 + { duplicate: true } on PG unique_violation (code 23505)', async () => {
    mockNextHeaders({ 'stripe-signature': 'sig' });
    constructEventMock.mockReturnValue(CHECKOUT_EVENT);
    supabaseState.insertErrors['stripe_events'] = { code: '23505', message: 'duplicate key' };
    const { POST } = await import('@/app/api/webhooks/stripe/route');
    const res = await POST(makeReq('raw'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.duplicate).toBe(true);
    expect(supabaseState.ops.filter((o) => o.table === 'vibrant40_members')).toHaveLength(0);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('writes a vibrant40_members row on checkout.session.completed (status: "active")', async () => {
    mockNextHeaders({ 'stripe-signature': 'sig' });
    constructEventMock.mockReturnValue(CHECKOUT_EVENT);
    const { POST } = await import('@/app/api/webhooks/stripe/route');
    await POST(makeReq('raw'));
    const memberOp = supabaseState.ops.find((o) => o.table === 'vibrant40_members');
    expect(memberOp).toBeDefined();
    expect(memberOp!.method).toBe('upsert');
    const payload = memberOp!.payload as {
      email: string;
      status: string;
      stripe_session_id: string;
    };
    expect(payload.email).toBe('buyer@example.com');
    expect(payload.status).toBe('active');
    expect(payload.stripe_session_id).toBe('cs_test_a1');
  });

  it('issues a migration_tokens row on checkout.session.completed (30-day expiry)', async () => {
    mockNextHeaders({ 'stripe-signature': 'sig' });
    constructEventMock.mockReturnValue(CHECKOUT_EVENT);
    const before = Date.now();
    const { POST } = await import('@/app/api/webhooks/stripe/route');
    await POST(makeReq('raw'));
    const tokenOp = supabaseState.ops.find((o) => o.table === 'migration_tokens');
    expect(tokenOp).toBeDefined();
    expect(tokenOp!.method).toBe('insert');
    const payload = tokenOp!.payload as { email: string; token: string; expires_at: string };
    expect(payload.email).toBe('buyer@example.com');
    expect(payload.token).toMatch(/^[a-f0-9]{64}$/);
    const expiresAt = new Date(payload.expires_at).getTime();
    const thirtyDays = 30 * 86_400_000;
    expect(expiresAt).toBeGreaterThanOrEqual(before + thirtyDays - 300_000);
    expect(expiresAt).toBeLessThanOrEqual(before + thirtyDays + 300_000);
  });

  it('sends a Resend "set your password" email on checkout.session.completed', async () => {
    mockNextHeaders({ 'stripe-signature': 'sig' });
    constructEventMock.mockReturnValue(CHECKOUT_EVENT);
    const { POST } = await import('@/app/api/webhooks/stripe/route');
    await POST(makeReq('raw'));
    expect(sendMock).toHaveBeenCalledTimes(1);
    const call = sendMock.mock.calls[0][0];
    expect(call.to).toEqual(['buyer@example.com']);
    expect(call.from).toContain('mail.nicolehansultcoaching.com');
    expect(call.replyTo).toBe('nicole@nicolehansultcoaching.com');
    expect(call.react).toBeDefined();
    expect(call.subject).toMatch(/welcome|password|vibrant40/i);
  });

  it('flips vibrant40_members.status to "refunded" on charge.refunded', async () => {
    mockNextHeaders({ 'stripe-signature': 'sig' });
    constructEventMock.mockReturnValue(REFUND_EVENT);
    const { POST } = await import('@/app/api/webhooks/stripe/route');
    const res = await POST(makeReq('raw'));
    expect(res.status).toBe(200);
    const updateOp = supabaseState.ops.find(
      (o) => o.table === 'vibrant40_members' && o.method === 'update',
    );
    expect(updateOp).toBeDefined();
    expect((updateOp!.payload as { status: string }).status).toBe('refunded');
    expect(updateOp!.eq).toEqual({ col: 'email', val: 'buyer@example.com' });
  });

  it('returns 500 on handler exception so Stripe retries', async () => {
    mockNextHeaders({ 'stripe-signature': 'sig' });
    constructEventMock.mockReturnValue(CHECKOUT_EVENT);
    sendMock.mockRejectedValueOnce(new Error('Resend network blowup'));
    const { POST } = await import('@/app/api/webhooks/stripe/route');
    const res = await POST(makeReq('raw'));
    expect(res.status).toBe(500);
  });

  it('completes within the 2s Stripe budget on the happy path', async () => {
    mockNextHeaders({ 'stripe-signature': 'sig' });
    constructEventMock.mockReturnValue(CHECKOUT_EVENT);
    const { POST } = await import('@/app/api/webhooks/stripe/route');
    const start = Date.now();
    const res = await POST(makeReq('raw'));
    const elapsed = Date.now() - start;
    expect(res.status).toBe(200);
    expect(elapsed).toBeLessThan(500);
  });
});
