/**
 * Phase 5 Plan 05 Task 2 — /vibrant40/welcome (PAY-09).
 *
 * First-login orientation. Reachable in two states:
 *   (a) Buyer following Stripe `success_url=/vibrant40/welcome` — usually
 *       unauthenticated at that moment (set-password email just sent).
 *       proxy.ts bounces them to /login?next=/vibrant40/welcome; after they
 *       set their password + log in they land back here.
 *   (b) Authed member arriving via /account "Go to Course" link or a future
 *       first-login flow.
 *
 * We avoid surfacing `claims.email` on this page because migrated members'
 * claims may not have email populated reliably — the orientation copy reads
 * fine without a name and we sidestep the empty-greeting edge case.
 */
import { redirect } from 'next/navigation';

import { Pill } from '@/components/ui/Pill';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const metadata = { robots: { index: false } };

export default async function WelcomePage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims ?? null;
  if (!claims) redirect('/login?next=/vibrant40/welcome');

  return (
    <article className="mx-auto max-w-2xl px-6">
      <p className="text-xs uppercase tracking-[0.14em] text-grayDeep mb-3">
        Welcome
      </p>
      <h1 className="font-serif text-4xl text-ink mb-6">
        Welcome to Vibrant40
      </h1>
      <p className="text-base text-inkSoft mb-4">
        Your 8-day program is ready. One short lesson per day — eating, movement,
        sleep, stress, hormones, and the rhythm that holds it all together.
      </p>
      <p className="text-base text-inkSoft mb-8">
        Take it at your own pace. Mark each day complete when you finish so you
        always know where to pick up.
      </p>
      <Pill href="/vibrant40" variant="dark" size="lg">
        Start with Day 1 →
      </Pill>
    </article>
  );
}
