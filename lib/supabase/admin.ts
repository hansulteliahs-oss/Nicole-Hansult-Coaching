/**
 * Phase 5 Plan 03 — service-role Supabase client factory.
 *
 * Centralised so webhook handlers + admin actions share one construction path.
 * Constructed per call (NOT module-level) so missing env vars surface at request
 * time, not at import — matches the Plan 04-04 pattern.
 *
 * Used by:
 *   - lib/webhooks/handle-checkout-completed.ts
 *   - lib/webhooks/handle-refund.ts
 *   - app/api/webhooks/stripe/route.ts
 *   - app/set-password/actions.ts (existing inline copy — keep until next sweep)
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export function getAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;

  if (!url || !secret) {
    throw new Error(
      'getAdminClient(): NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY are required.',
    );
  }

  return createClient(url, secret, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
