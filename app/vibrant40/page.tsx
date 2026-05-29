/**
 * /vibrant40 course home (PAY-10).
 *
 * Mirrors the live course: 8 modules ("Days"), 23 lessons. Each module is a
 * section with its lessons nested as cards. Completion reflects the per-user
 * `lesson_progress` table (keyed by lesson slug).
 *
 * Auth pattern (Phase 4 plan 04-05 verbatim):
 *   createClient → getClaims → null-check → redirect → render
 *
 * proxy.ts (Phase 5 plan 04) already enforces V40 membership on this route;
 * the claims null-check here is defense-in-depth.
 */
import { redirect } from 'next/navigation';

import { LessonCard } from '@/components/vibrant40/LessonCard';
import { MODULES, TOTAL_LESSONS } from '@/lib/content/vibrant40/lessons';
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
        <h1 className="font-serif text-4xl text-ink mb-3">Vibrant40 Jumpstart</h1>
        <p className="text-sm text-inkSoft">
          {completed.size} of {TOTAL_LESSONS} lessons complete
        </p>
      </header>

      <div className="space-y-10">
        {MODULES.map((mod) => {
          const done = mod.lessons.filter((l) => completed.has(l.slug)).length;
          return (
            <section key={mod.number}>
              <header className="mb-3">
                <h2 className="font-serif text-2xl text-ink">{mod.title}</h2>
                <p className="text-xs uppercase tracking-[0.12em] text-grayDeep mt-1">
                  {done} of {mod.lessons.length} complete
                </p>
              </header>
              <ul className="grid gap-3">
                {mod.lessons.map((lesson) => (
                  <li key={lesson.slug}>
                    <LessonCard lesson={lesson} completed={completed.has(lesson.slug)} />
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </article>
  );
}
