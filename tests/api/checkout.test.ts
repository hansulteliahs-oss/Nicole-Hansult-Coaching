/**
 * Phase 5 Plan 02 — POST /api/checkout (Stripe Checkout Session creation).
 *
 * Mocks lib/stripe.ts so no live Stripe credentials are needed. Asserts:
 *   - 303 redirect to session.url
 *   - non-POST → 405
 *   - missing STRIPE_PRICE_VIBRANT40 → 500
 *   - session created with correct line_items, mode, success/cancel URLs, metadata
 *
 * PAY-03.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ---- Mocks -----------------------------------------------------------------

const createSession = vi.fn();

vi.mock('@/lib/stripe', () => ({
  stripe: {
    checkout: {
      sessions: {
        create: createSession,
      },
    },
  },
}));

// ---- Helpers ---------------------------------------------------------------

const ORIGIN = 'https://example.test';

function buildRequest(method: 'POST' | 'GET' | 'PUT' | 'DELETE'): Request {
  return new Request(`${ORIGIN}/api/checkout`, {
    method,
    headers: {
      origin: ORIGIN,
      host: 'example.test',
    },
  });
}

// ---- Test setup ------------------------------------------------------------

beforeEach(() => {
  createSession.mockReset();
  vi.resetModules();
  process.env.STRIPE_PRICE_VIBRANT40 = 'price_test_v40_default';
});

afterEach(() => {
  delete process.env.STRIPE_PRICE_VIBRANT40;
});

// ---- Specs -----------------------------------------------------------------

describe('POST /api/checkout', () => {
  it('returns 303 redirect to a Stripe-hosted session URL', async () => {
    createSession.mockResolvedValueOnce({
      id: 'cs_test_123',
      url: 'https://checkout.stripe.com/c/pay/cs_test_123',
    });

    const { POST } = await import('@/app/api/checkout/route');
    const res = await POST(buildRequest('POST'));

    expect(res.status).toBe(303);
    expect(res.headers.get('location')).toBe(
      'https://checkout.stripe.com/c/pay/cs_test_123',
    );
  });

  it('rejects non-POST methods with 405', async () => {
    const route = await import('@/app/api/checkout/route');
    // App Router: routes only export handlers for declared verbs. Test that
    // a GET handler either does not exist OR returns 405 if defined.
    // We export only POST; assert that.
    expect(typeof route.POST).toBe('function');
    expect(
      // @ts-expect-error — confirms GET is not exported
      route.GET,
    ).toBeUndefined();
  });

  it('returns 500 when STRIPE_PRICE_VIBRANT40 is missing', async () => {
    delete process.env.STRIPE_PRICE_VIBRANT40;

    const { POST } = await import('@/app/api/checkout/route');
    const res = await POST(buildRequest('POST'));

    expect(res.status).toBe(500);
    expect(createSession).not.toHaveBeenCalled();
  });

  it('passes STRIPE_PRICE_VIBRANT40 as line_items[0].price', async () => {
    process.env.STRIPE_PRICE_VIBRANT40 = 'price_test_specific';
    createSession.mockResolvedValueOnce({
      id: 'cs_test_1',
      url: 'https://checkout.stripe.com/c/pay/cs_test_1',
    });

    const { POST } = await import('@/app/api/checkout/route');
    await POST(buildRequest('POST'));

    expect(createSession).toHaveBeenCalledOnce();
    const args = createSession.mock.calls[0][0];
    expect(args.line_items).toHaveLength(1);
    expect(args.line_items[0].price).toBe('price_test_specific');
    expect(args.line_items[0].quantity).toBe(1);
  });

  it('sets success_url to /vibrant40/welcome on the request origin', async () => {
    createSession.mockResolvedValueOnce({
      id: 'cs_test_2',
      url: 'https://checkout.stripe.com/c/pay/cs_test_2',
    });

    const { POST } = await import('@/app/api/checkout/route');
    await POST(buildRequest('POST'));

    const args = createSession.mock.calls[0][0];
    expect(args.success_url).toBe(`${ORIGIN}/vibrant40/welcome`);
  });

  it('sets cancel_url to /services/vibrant40-jumpstart on the request origin', async () => {
    createSession.mockResolvedValueOnce({
      id: 'cs_test_3',
      url: 'https://checkout.stripe.com/c/pay/cs_test_3',
    });

    const { POST } = await import('@/app/api/checkout/route');
    await POST(buildRequest('POST'));

    const args = createSession.mock.calls[0][0];
    expect(args.cancel_url).toBe(`${ORIGIN}/services/vibrant40-jumpstart`);
  });

  it('attaches metadata.offer = "vibrant40" to the session', async () => {
    createSession.mockResolvedValueOnce({
      id: 'cs_test_4',
      url: 'https://checkout.stripe.com/c/pay/cs_test_4',
    });

    const { POST } = await import('@/app/api/checkout/route');
    await POST(buildRequest('POST'));

    const args = createSession.mock.calls[0][0];
    expect(args.metadata).toMatchObject({ offer: 'vibrant40' });
    expect(args.mode).toBe('payment');
    expect(args.allow_promotion_codes).toBe(false);
  });

  it('forces runtime = "nodejs" (Stripe SDK incompatible with Edge)', async () => {
    const route = await import('@/app/api/checkout/route');
    expect(route.runtime).toBe('nodejs');
    expect(route.dynamic).toBe('force-dynamic');
  });

  it('returns 500 when stripe.checkout.sessions.create throws', async () => {
    createSession.mockRejectedValueOnce(new Error('stripe boom'));

    const { POST } = await import('@/app/api/checkout/route');
    const res = await POST(buildRequest('POST'));

    expect(res.status).toBe(500);
  });
});
