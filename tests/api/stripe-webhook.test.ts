/**
 * Phase 5 Plan 03 — POST /api/webhooks/stripe (signature + idempotency + dispatch).
 *
 * Stub created in Plan 01 Wave 0. PAY-04.
 */
import { describe, it } from 'vitest';

describe('POST /api/webhooks/stripe', () => {
  it.todo('rejects requests with no stripe-signature header with 400');
  it.todo('rejects requests with a bad signature against the env secret with 400');
  it.todo('uses STRIPE_WEBHOOK_SECRET_LIVE in production (NODE_ENV === "production")');
  it.todo('uses STRIPE_WEBHOOK_SECRET_TEST in non-production envs');
  it.todo('reads the body via req.text() — never req.json()');
  it.todo('inserts a stripe_events row keyed by event.id BEFORE dispatch');
  it.todo('returns 200 + { duplicate: true } on PG unique_violation (code 23505)');
  it.todo('returns 200 + { skipped } for event types not in PERMITTED');
  it.todo('writes a vibrant40_members row on checkout.session.completed (status: "active")');
  it.todo('issues a migration_tokens row on checkout.session.completed (30-day expiry)');
  it.todo('sends a Resend "set your password" email on checkout.session.completed');
  it.todo('flips vibrant40_members.status to "refunded" on charge.refunded');
  it.todo('returns 500 on handler exception so Stripe retries');
  it.todo('completes within the 2s Stripe budget on the happy path');
});
