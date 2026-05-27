/**
 * Phase 5 Plan 05 Task 2 — DayCard.
 *
 * Server Component (no interactivity). One card per Vibrant40 day on the
 * course home grid. Shows order number, title, short description, and a
 * Start/Resume link to the module page. Completed days get a filled green
 * dot; not-yet-started days get an empty circle (inline SVG — no emoji
 * dependency, per Phase 4 convention).
 */
import Link from 'next/link';

import type { Day } from '@/lib/content/vibrant40/days';
import { cn } from '@/lib/cn';

export function DayCard({ day, completed }: { day: Day; completed: boolean }) {
  return (
    <Link
      href={`/vibrant40/days/${day.slug}`}
      className={cn(
        'group block rounded-2xl border bg-card p-6 transition-colors',
        'border-inkFaint hover:border-orchidDeep',
      )}
    >
      <div className="mb-3 flex items-center gap-3">
        {completed ? (
          // Filled check
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
          // Empty circle
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
        <p className="text-xs uppercase tracking-[0.14em] text-grayDeep">
          Day {day.order}
        </p>
      </div>

      <h3 className="font-serif text-xl text-ink mb-2">{day.title}</h3>
      <p className="text-sm text-inkSoft mb-4">{day.description}</p>

      <span className="text-sm font-semibold text-orchidDeep group-hover:underline">
        {completed ? 'Review →' : 'Start →'}
      </span>
    </Link>
  );
}
