/**
 * /vibrant40/days/[slug] lesson page (PAY-11).
 *
 * Server Component:
 *   1. Resolve slug → Lesson (redirect to /vibrant40 if unknown).
 *   2. Auth guard (AUTH-08: getClaims; redirect to /login if null).
 *   3. If the lesson has a video, mint fresh signed playback tokens
 *      server-side (PITFALL 7 — never cached) and render the Mux player.
 *      Text lessons skip the player entirely.
 *   4. Render Markdown body + mark-complete + prev/next across all lessons.
 *
 * PITFALL 6: `dynamic = 'force-dynamic'`.
 * PITFALL 9: DisclaimerBand cascades from root layout.
 */
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { LessonBody } from '@/components/vibrant40/LessonBody';
import { MarkCompleteButton } from '@/components/vibrant40/MarkCompleteButton';
import { MuxPlayerClient } from '@/components/vibrant40/MuxPlayerClient';
import { getAdjacent, getLesson } from '@/lib/content/vibrant40/lessons';
import { mintPlaybackTokens } from '@/lib/mux';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const metadata = { robots: { index: false } };

export default async function LessonPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const lesson = getLesson(slug);
  if (!lesson) {
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

  // Fresh JWT trio every render — never cached (PITFALL 7). Video lessons only.
  const tokens = lesson.muxPlaybackId
    ? await mintPlaybackTokens(lesson.muxPlaybackId)
    : null;

  const { prev, next } = getAdjacent(lesson.order);

  return (
    <article className="mx-auto max-w-3xl px-6">
      <p className="text-xs uppercase tracking-[0.14em] text-grayDeep mb-2">
        {lesson.moduleTitle}
      </p>
      <h1 className="font-serif text-4xl text-ink mb-6">{lesson.title}</h1>

      {lesson.muxPlaybackId && tokens && (
        <div className="mb-8 overflow-hidden rounded-2xl bg-ink">
          <MuxPlayerClient playbackId={lesson.muxPlaybackId} tokens={tokens} />
        </div>
      )}

      <p className="text-base text-inkSoft mb-6">{lesson.description}</p>

      <LessonBody body={lesson.body} />

      <div className="mb-10">
        <MarkCompleteButton slug={slug} />
      </div>

      <nav className="flex items-center justify-between border-t border-inkFaint pt-6 text-sm">
        {prev ? (
          <Link
            href={`/vibrant40/days/${prev.slug}`}
            className="max-w-[45%] truncate text-inkSoft hover:text-ink"
          >
            ← {prev.title}
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link
            href={`/vibrant40/days/${next.slug}`}
            className="max-w-[45%] truncate text-right text-inkSoft hover:text-ink"
          >
            {next.title} →
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </article>
  );
}
