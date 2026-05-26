/**
 * Phase 5 Plan 01 Task 2 — singleton Stripe Node SDK client.
 *
 * Used by:
 *   - app/api/checkout/route.ts          (Plan 02)
 *   - app/api/webhooks/stripe/route.ts   (Plan 03)
 *
 * Pin `apiVersion` to the dated release current at install time so silent
 * Stripe-side schema changes don't break us mid-month. Bump deliberately.
 */
import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error(
    'STRIPE_SECRET_KEY is required (server-only env var). ' +
      'Set it in .env.local for dev and in Vercel env for production.',
  );
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2026-04-22.dahlia',
  typescript: true,
});
