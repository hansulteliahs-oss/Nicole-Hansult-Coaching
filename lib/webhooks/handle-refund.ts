/**
 * Phase 5 Plan 03 — charge.refunded handler.
 *
 * Soft-revoke: flips vibrant40_members.status from 'active' to 'refunded'.
 * The Phase 4 proxy gate checks status='active', so this is enough to lock
 * the buyer out of /vibrant40 without deleting their auth account or data.
 *
 * If billing_details.email is missing (rare — happens for refunds initiated
 * via Stripe Dashboard without a saved customer), we log and return cleanly
 * instead of throwing — Stripe shouldn't retry on every dashboard refund.
 */
import type Stripe from 'stripe';
import type { SupabaseClient } from '@supabase/supabase-js';

export async function handleRefund(
  event: Stripe.Event,
  supabase: SupabaseClient,
): Promise<void> {
  const charge = event.data.object as Stripe.Charge;
  const rawEmail = charge.billing_details?.email;
  if (!rawEmail) {
    console.warn(
      `[handleRefund] charge ${charge.id} had no billing_details.email — skipping`,
    );
    return;
  }
  const email = rawEmail.trim().toLowerCase();

  const { error } = await supabase
    .from('vibrant40_members')
    .update({ status: 'refunded' })
    .eq('email', email);
  if (error) {
    throw new Error(`vibrant40_members refund update failed: ${error.message}`);
  }
}
