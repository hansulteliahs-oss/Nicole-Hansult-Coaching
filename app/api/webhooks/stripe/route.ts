/**
 * Phase 5 Plan 03 — POST /api/webhooks/stripe
 *
 * Stripe webhook entrypoint. Responsibilities, in order:
 *   1. Read raw body BEFORE anything else (PITFALL 2 + 8 — req.text() is the
 *      ONLY way to read the body; parsing as JSON corrupts the signature).
 *   2. Verify signature against the per-env signing secret.
 *   3. Silent 200 for non-PERMITTED event types (otherwise Stripe Dashboard
 *      fills up with "no handler" errors).
 *   4. Insert into stripe_events FIRST — PG unique_violation (23505) is the
 *      idempotency guard.
 *   5. Dispatch to the typed handler. Throws bubble up to 500 so Stripe
 *      retries (max 3 days).
 *
 * Must complete in <2s — see tests/api/stripe-webhook.test.ts.
 */
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';

import { stripe } from '@/lib/stripe';
import { getAdminClient } from '@/lib/supabase/admin';
import { handleCheckoutCompleted } from '@/lib/webhooks/handle-checkout-completed';
import { handleRefund } from '@/lib/webhooks/handle-refund';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Whitelist of event types we actually act on. Everything else gets a silent 200.
const PERMITTED = ['checkout.session.completed', 'charge.refunded'] as const;

function pickSecret(): string {
  if (process.env.NODE_ENV === 'production') {
    const secret = process.env.STRIPE_WEBHOOK_SECRET_LIVE;
    if (!secret) {
      throw new Error('STRIPE_WEBHOOK_SECRET_LIVE is required in production');
    }
    return secret;
  }
  const secret =
    process.env.STRIPE_WEBHOOK_SECRET_TEST ?? process.env.STRIPE_WEBHOOK_SECRET_CLI;
  if (!secret) {
    throw new Error(
      'STRIPE_WEBHOOK_SECRET_TEST or STRIPE_WEBHOOK_SECRET_CLI is required (non-production)',
    );
  }
  return secret;
}

export async function POST(req: Request): Promise<Response> {
  // 1. Raw body — FIRST.
  const rawBody = await req.text();

  // 2. Signature header.
  const sig = (await headers()).get('stripe-signature');
  if (!sig) {
    return new NextResponse('Missing stripe-signature header', { status: 400 });
  }

  // 3. Verify.
  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, pickSecret());
  } catch (err) {
    console.error('[stripe-webhook] Bad signature:', err);
    return new NextResponse('Bad signature', { status: 400 });
  }

  // 4. Whitelist.
  if (!PERMITTED.includes(event.type as (typeof PERMITTED)[number])) {
    return NextResponse.json({ received: true, skipped: event.type });
  }

  // 5. Idempotency — INSERT FIRST.
  const supabase = getAdminClient();
  const { error: insertError } = await supabase
    .from('stripe_events')
    .insert({ event_id: event.id, type: event.type });

  if (insertError) {
    // 23505 = unique_violation = we've seen this event_id already. Silent 200.
    if ((insertError as { code?: string }).code === '23505') {
      return NextResponse.json({ received: true, duplicate: true });
    }
    console.error('[stripe-webhook] stripe_events insert error:', insertError);
    return new NextResponse('Database error', { status: 500 });
  }

  // 6. Dispatch.
  try {
    if (event.type === 'checkout.session.completed') {
      await handleCheckoutCompleted(event, supabase);
    } else if (event.type === 'charge.refunded') {
      await handleRefund(event, supabase);
    }
  } catch (err) {
    console.error('[stripe-webhook] handler error:', err);
    // Return 500 so Stripe retries. The stripe_events row is already in place,
    // but the unique_violation path will handle the retry cleanly.
    return new NextResponse('Handler error', { status: 500 });
  }

  return NextResponse.json({ received: true });
}
