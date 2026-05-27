/**
 * Phase 5 Plan 05 Task 3 — /vibrant40/days/[slug] module page (PAY-11).
 *
 * Server Component. Per RESEARCH.md § Pattern 4:
 *   1. Resolve slug → DAY (redirect to /vibrant40 if unknown).
 *   2. Auth guard (AUTH-08: getClaims; redirect to /login if null).
 *   3. Mint fresh signed playback tokens server-side (PITFALL 7 — no cache).
 *   4. Render: Mux player + title/description/body + mark-complete + prev/next.
 *
 * PITFALL 6: `dynamic = 'force-dynamic'`.
 * PITFALL 9: DisclaimerBand cascades from root layout.
 */
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { MarkCompleteButton } from '@/components/vibrant40/MarkCompleteButton';
import { MuxPlayerClient } from '@/components/vibrant40/MuxPlayerClient';
import { DAYS, getDay } from '@/lib/content/vibrant40/days';
import { mintPlaybackTokens } from '@/lib/mux';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const metadata = { robots: { index: false } };

export default async function DayPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const day = getDay(slug);
  if (!day) {
    redirect('/vibrant40');
    return null;
  }

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims ?? null;
  if (!claims) {
    redirect(`/login?next=/vibrant40/days/${slug}`);
    return null;
  }

  // Fresh JWT trio every render — never cached (PITFALL 7).
  const tokens = await mintPlaybackTokens(day.muxPlaybackId);

  const prev = day.order > 1 ? DAYS[day.order - 2] : null;
  const next = day.order < 8 ? DAYS[day.order] : null;

  return (
    <article className="mx-auto max-w-3xl px-6">
      <p className="text-xs uppercase tracking-[0.14em] text-grayDeep mb-2">
        Day {day.order} of 8
      </p>
      <h1 className="font-serif text-4xl text-ink mb-6">{day.title}</h1>

      <div className="mb-8 overflow-hidden rounded-2xl bg-ink">
        <MuxPlayerClient playbackId={day.muxPlaybackId} tokens={tokens} />
      </div>

      <p className="text-base text-inkSoft mb-6">{day.description}</p>

      {/* Body: plain text in MDX; split on \n\n into paragraph blocks. */}
      <div className="prose prose-neutral max-w-none mb-10">
        {day.body
          .split(/\n{2,}/)
          .filter(Boolean)
          .map((para, i) => (
            <p key={i} className="text-base text-ink mb-4 leading-relaxed">
              {para}
            </p>
          ))}
      </div>

      <div className="mb-10">
        <MarkCompleteButton slug={slug} />
      </div>

      <nav className="flex items-center justify-between border-t border-inkFaint pt-6 text-sm">
        {prev ? (
          <Link
            href={`/vibrant40/days/${prev.slug}`}
            className="text-inkSoft hover:text-ink"
          >
            ← Day {prev.order}
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link
            href={`/vibrant40/days/${next.slug}`}
            className="text-inkSoft hover:text-ink"
          >
            Day {next.order} →
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </article>
  );
}
