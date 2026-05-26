/**
 * POST /api/checkout — Phase 5 Plan 02 (PAY-03)
 *
 * Creates a Stripe Checkout Session for Vibrant40 ($88 one-time) and 303-redirects
 * the browser to the hosted Stripe page. Public route — no auth check. Stripe
 * Checkout collects the buyer's email; the webhook (Plan 03) is the source of
 * truth for "who bought what."
 *
 * - runtime: 'nodejs' — Stripe Node SDK is incompatible with the Edge runtime.
 * - dynamic: 'force-dynamic' — reads request headers (origin) per call.
 * - allow_promotion_codes: false — V40 is a fixed-price launch; revisit later.
 * - metadata.offer: 'vibrant40' — webhook keys off this to know which member
 *   row to create.
 *
 * Errors:
 *   - missing STRIPE_PRICE_VIBRANT40 → 500 (config error, logged)
 *   - stripe.checkout.sessions.create throws → 500 (logged; Sentry will capture)
 *
 * Non-POST verbs are not exported, so Next.js returns 405 automatically.
 */
import { NextResponse } from 'next/server';

import { stripe } from '@/lib/stripe';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: Request): Promise<Response> {
  const priceId = process.env.STRIPE_PRICE_VIBRANT40;
  if (!priceId) {
    console.error(
      '[/api/checkout] STRIPE_PRICE_VIBRANT40 is not set. Cannot create checkout session.',
    );
    return new NextResponse('Checkout temporarily unavailable.', {
      status: 500,
    });
  }

  const origin =
    req.headers.get('origin') ??
    (req.headers.get('host') ? `https://${req.headers.get('host')}` : '');

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/vibrant40/welcome`,
      cancel_url: `${origin}/services/vibrant40-jumpstart`,
      allow_promotion_codes: false,
      metadata: { offer: 'vibrant40' },
    });

    if (!session.url) {
      console.error('[/api/checkout] Stripe returned a session without a url.');
      return new NextResponse('Checkout temporarily unavailable.', {
        status: 500,
      });
    }

    return NextResponse.redirect(session.url, { status: 303 });
  } catch (err) {
    console.error('[/api/checkout] stripe.checkout.sessions.create failed', err);
    // Sentry instrumentation captures unhandled errors in Route Handlers.
    return new NextResponse('Checkout temporarily unavailable.', {
      status: 500,
    });
  }
}
