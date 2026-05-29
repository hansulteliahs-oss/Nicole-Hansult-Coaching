/**
 * One lesson row inside a module on the Vibrant40 course home.
 *
 * Shows completion state (filled check / empty circle), the lesson title, a
 * small Video/Read tag, and a Start/Review affordance. Server Component.
 */
import Link from 'next/link';

import type { Lesson } from '@/lib/content/vibrant40/lessons';
import { cn } from '@/lib/cn';

export function LessonCard({ lesson, completed }: { lesson: Lesson; completed: boolean }) {
  const isVideo = lesson.muxPlaybackId !== null;

  return (
    <Link
      href={`/vibrant40/days/${lesson.slug}`}
      className={cn(
        'group flex items-center gap-3 rounded-xl border bg-card px-5 py-4 transition-colors',
        'border-inkFaint hover:border-orchidDeep',
      )}
    >
      {completed ? (
        <svg
          aria-label="Complete"
          role="img"
          viewBox="0 0 24 24"
          className="h-5 w-5 flex-none text-emerald-600"
          fill="currentColor"
        >
          <circle cx="12" cy="12" r="11" />
          <path
            d="M7.5 12.5l3 3 6-7"
            stroke="white"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : (
        <svg
          aria-label="Not started"
          role="img"
          viewBox="0 0 24 24"
          className="h-5 w-5 flex-none text-inkFaint"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="12" cy="12" r="10" />
        </svg>
      )}

      <span className="min-w-0 flex-1">
        <span className="block truncate font-serif text-lg text-ink">{lesson.title}</span>
        <span className="text-xs uppercase tracking-[0.12em] text-grayDeep">
          {isVideo ? 'Video' : 'Read'}
        </span>
      </span>

      <span className="flex-none text-sm font-semibold text-orchidDeep group-hover:underline">
        {completed ? 'Review →' : 'Start →'}
      </span>
    </Link>
  );
}
