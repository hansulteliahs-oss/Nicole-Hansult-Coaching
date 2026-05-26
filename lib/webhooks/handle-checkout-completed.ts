/**
 * Phase 5 Plan 03 — checkout.session.completed handler.
 *
 * Triggered by /api/webhooks/stripe AFTER stripe_events idempotency insert.
 * Performs the three writes the buyer cares about, in order:
 *   1. vibrant40_members upsert (status='active') — opens the paywall
 *   2. migration_tokens insert (single-use, 30-day expiry) — issues the set-password link
 *   3. Resend send — delivers the link
 *
 * If step 3 throws, the route handler returns 500 so Stripe retries; the
 * stripe_events row has already locked the event_id, so the retry path will
 * hit duplicate:true and skip everything — meaning a transient Resend outage
 * leaves the member created but un-emailed. Acceptable trade-off vs. the
 * alternative (no member row + Stripe retries forever).
 */
import { randomBytes } from 'node:crypto';
import type Stripe from 'stripe';
import { Resend } from 'resend';
import type { SupabaseClient } from '@supabase/supabase-js';

import { PurchaseConfirmation } from '@/components/email/PurchaseConfirmation';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://nicolehansultcoaching.com';
const FROM = process.env.RESEND_FROM_EMAIL ?? 'Nicole <nicole@mail.nicolehansultcoaching.com>';
const REPLY_TO = 'nicole@nicolehansultcoaching.com';
const THIRTY_DAYS_MS = 30 * 86_400_000;

export async function handleCheckoutCompleted(
  event: Stripe.Event,
  supabase: SupabaseClient,
): Promise<void> {
  const session = event.data.object as Stripe.Checkout.Session;
  const rawEmail = session.customer_details?.email;
  if (!rawEmail) {
    throw new Error(
      `[handleCheckoutCompleted] No customer_details.email on session ${session.id}`,
    );
  }
  const email = rawEmail.trim().toLowerCase();

  // 1. Upsert member — onConflict email so a re-purchase by the same address
  // refreshes status/session/customer rather than duplicating.
  const { error: memberError } = await supabase.from('vibrant40_members').upsert(
    {
      email,
      status: 'active',
      stripe_session_id: session.id,
      stripe_customer_id:
        typeof session.customer === 'string' ? session.customer : session.customer?.id ?? null,
      purchased_at: new Date().toISOString(),
    },
    { onConflict: 'email' },
  );
  if (memberError) {
    throw new Error(`vibrant40_members upsert failed: ${memberError.message}`);
  }

  // 2. Issue a single-use migration token (re-uses the Phase 4 table — same
  // 30-day TTL, same /set-password landing page).
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + THIRTY_DAYS_MS).toISOString();
  const { error: tokenError } = await supabase.from('migration_tokens').insert({
    email,
    token,
    expires_at: expiresAt,
  });
  if (tokenError) {
    throw new Error(`migration_tokens insert failed: ${tokenError.message}`);
  }

  // 3. Send the welcome email via Resend.
  const resend = new Resend(process.env.RESEND_API_KEY);
  const url = `${SITE_URL}/set-password?token=${token}`;
  const { error: emailError } = await resend.emails.send({
    from: FROM,
    to: [email],
    replyTo: REPLY_TO,
    subject: 'Welcome to Vibrant40 — set your password',
    react: PurchaseConfirmation({ email, url, kind: 'purchase' }),
  });
  if (emailError) {
    throw new Error(`Resend send failed: ${emailError.message ?? 'unknown'}`);
  }
}
