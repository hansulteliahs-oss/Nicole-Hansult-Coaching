/**
 * Phase 5 Plan 02 — POST /api/checkout (Stripe Checkout Session creation).
 *
 * Stub created in Plan 01 Wave 0 so the downstream plan has explicit
 * behaviors to fill in. PAY-03.
 */
import { describe, it } from 'vitest';

describe('POST /api/checkout', () => {
  it.todo('returns 303 redirect to a Stripe-hosted session URL');
  it.todo('rejects non-POST methods with 405');
  it.todo('passes STRIPE_PRICE_VIBRANT40 as line_items[0].price');
  it.todo('sets success_url to /vibrant40/welcome on the request origin');
  it.todo('sets cancel_url to /services/vibrant40-jumpstart on the request origin');
  it.todo('attaches metadata.offer = "vibrant40" to the session');
  it.todo('forces runtime = "nodejs" (Stripe SDK incompatible with Edge)');
});
