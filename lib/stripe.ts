/**
 * Phase 5 Plan 01 Task 2 — lazily-constructed singleton Stripe Node SDK client.
 *
 * Used by:
 *   - app/api/checkout/route.ts          (Plan 02)
 *   - app/api/webhooks/stripe/route.ts   (Plan 03)
 *
 * Constructed on the FIRST call (not at module load) so a missing
 * STRIPE_SECRET_KEY surfaces at request time, not at import/build time — mirrors
 * the getAdminClient() pattern in lib/supabase/admin.ts. This keeps `next build`
 * from failing to "collect page data" for /api/checkout when the key isn't in
 * the build environment (e.g. Preview deploys, where the key is Production-only).
 *
 * Pin `apiVersion` to the dated release current at install time so silent
 * Stripe-side schema changes don't break us mid-month. Bump deliberately.
 */
import Stripe from 'stripe';

let client: Stripe | null = null;

export function getStripe(): Stripe {
  if (client) return client;

  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) {
    throw new Error(
      'STRIPE_SECRET_KEY is required (server-only env var). ' +
        'Set it in .env.local for dev and in Vercel env for production.',
    );
  }

  client = new Stripe(secret, {
    apiVersion: '2026-04-22.dahlia',
    typescript: true,
  });
  return client;
}
