/**
 * Phase 5 Plan 05 Task 2 — /vibrant40 course home (PAY-10).
 *
 * Lists 8 day cards in order, with a "N of 8 days complete" counter at top.
 * Cards reflect completion state from the per-user `lesson_progress` table.
 *
 * Auth pattern (Phase 4 plan 04-05 verbatim):
 *   createClient → getClaims → null-check → redirect → render
 *
 * proxy.ts (Phase 5 plan 04) already enforces V40 membership on this route;
 * the claims null-check here is defense-in-depth.
 */
import { redirect } from 'next/navigation';

import { DayCard } from '@/components/vibrant40/DayCard';
import { DAYS } from '@/lib/content/vibrant40/days';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const metadata = { robots: { index: false } };

export default async function CourseHome() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims ?? null;
  if (!claims) redirect('/login?next=/vibrant40');

  const { data: rows } = await supabase
    .from('lesson_progress')
    .select('day_slug')
    .eq('user_id', claims.sub as string);

  const completed = new Set<string>((rows ?? []).map((r: { day_slug: string }) => r.day_slug));

  return (
    <article className="mx-auto max-w-3xl px-6">
      <header className="mb-10">
        <p className="text-xs uppercase tracking-[0.14em] text-grayDeep mb-2">
          Your program
        </p>
        <h1 className="font-serif text-4xl text-ink mb-3">Vibrant40 — 8-day program</h1>
        <p className="text-sm text-inkSoft">
          {completed.size} of 8 days complete
        </p>
      </header>

      <ul className="grid gap-4">
        {DAYS.map((day) => (
          <li key={day.slug}>
            <DayCard day={day} completed={completed.has(day.slug)} />
          </li>
        ))}
      </ul>
    </article>
  );
}
