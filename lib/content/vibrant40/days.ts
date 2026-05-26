/**
 * Phase 5 Plan 01 Task 2 — Vibrant40 daily-lesson index.
 *
 * Source of truth for the 8 daily lessons (Day 1 … Day 8). Plan 05 swaps
 * the `muxPlaybackId` placeholders for real values once Nicole has uploaded
 * the video files to Mux Dashboard.
 *
 * Course URL pattern: /vibrant40/days/[slug]
 * Slugs are stable identifiers ("day-1" … "day-8") used as:
 *   - URL segment
 *   - lesson_progress.day_slug primary-key component
 *
 * NOTE: titles + descriptions below are working placeholders. Final copy
 * comes from Nicole as part of the Phase 5 content port (Plan 05).
 */

export type Day = {
  /** URL slug — stable identifier; do not rename without a redirect. */
  slug: string;
  /** Title shown on course home card + module page H1 */
  title: string;
  /** 1–3 sentence summary shown on course home card */
  description: string;
  /** Mux playback ID — replace `PLACEHOLDER_DAY_*` once videos are uploaded */
  muxPlaybackId: string;
  /** 1-indexed display order */
  order: number;
};

export const DAYS: ReadonlyArray<Day> = [
  {
    slug: 'day-1',
    title: 'Day 1: Welcome to Vibrant40',
    description:
      'Set the foundation: what the next 8 days look like, how to use the program, and the one mindset shift that makes everything else work.',
    muxPlaybackId: 'PLACEHOLDER_DAY_1',
    order: 1,
  },
  {
    slug: 'day-2',
    title: 'Day 2: Eating to Feel Vibrant',
    description:
      'The everyday food framework — protein, plants, and timing — built for women over 40 who are done with restrictive diets.',
    muxPlaybackId: 'PLACEHOLDER_DAY_2',
    order: 2,
  },
  {
    slug: 'day-3',
    title: 'Day 3: Movement That Works',
    description:
      'Strength + zone-2 cardio: the minimum-effective-dose routine that protects bone density and metabolic health without burning you out.',
    muxPlaybackId: 'PLACEHOLDER_DAY_3',
    order: 3,
  },
  {
    slug: 'day-4',
    title: 'Day 4: Sleep & Recovery',
    description:
      'How sleep changes after 40 and the small, durable habits that move the needle on energy, mood, and overnight repair.',
    muxPlaybackId: 'PLACEHOLDER_DAY_4',
    order: 4,
  },
  {
    slug: 'day-5',
    title: 'Day 5: Stress, Cortisol, and the Nervous System',
    description:
      'Why "just relax" fails — and the practical regulation tools that actually quiet the cortisol surge driving belly fat and 3 a.m. wake-ups.',
    muxPlaybackId: 'PLACEHOLDER_DAY_5',
    order: 5,
  },
  {
    slug: 'day-6',
    title: 'Day 6: Hormones & Hot Flashes',
    description:
      'Perimenopause and menopause without panic: what is happening, what is normal, and where to push back on your doctor.',
    muxPlaybackId: 'PLACEHOLDER_DAY_6',
    order: 6,
  },
  {
    slug: 'day-7',
    title: 'Day 7: Body Image at Midlife',
    description:
      'Rebuilding the relationship with your body when it is changing. Less war, more partnership — without giving up on feeling strong.',
    muxPlaybackId: 'PLACEHOLDER_DAY_7',
    order: 7,
  },
  {
    slug: 'day-8',
    title: 'Day 8: Your Next 90 Days',
    description:
      'How to keep this going. A simple weekly rhythm plus what to do when (not if) you fall off — so you stay vibrant for the long run.',
    muxPlaybackId: 'PLACEHOLDER_DAY_8',
    order: 8,
  },
];

/** Look up a day by slug. Returns undefined for unknown slugs. */
export function getDay(slug: string): Day | undefined {
  return DAYS.find((d) => d.slug === slug);
}
