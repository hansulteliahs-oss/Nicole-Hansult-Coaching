/**
 * Phase 5 Plan 05 Task 1 — Vibrant40 daily-lesson index.
 *
 * Single source of truth: the 8 MDX files in `lib/content/vibrant40/days/`.
 * This module reads their YAML front-matter at module load time (server-only)
 * and exposes the typed array + lookup helper.
 *
 * Why MDX front-matter instead of a hardcoded array?
 *   - Eliahs/Nicole port real lesson copy into the MDX bodies during this plan.
 *   - The body text lives next to the title/description/playbackId so editors
 *     never have to keep two files in sync.
 *   - `getDay()` exposes the body to the day-page renderer as plain text
 *     (split on \n\n for paragraph rendering).
 *
 * Slugs are stable identifiers ("day-1" … "day-8") used as:
 *   - URL segment under /vibrant40/days/[slug]
 *   - lesson_progress.day_slug primary-key component
 *
 * NOTE: muxPlaybackId values ship as PLACEHOLDER_DAY_N. Replace with real
 * Mux playback IDs once Nicole's videos are uploaded with
 * playback_policy = ['signed'].
 */
import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';

export type Day = {
  /** URL slug — stable identifier; do not rename without a redirect. */
  slug: string;
  /** Title shown on course home card + module page H1 */
  title: string;
  /** 1–3 sentence summary shown on course home card */
  description: string;
  /** Mux playback ID — replace `PLACEHOLDER_DAY_*` once videos are uploaded */
  muxPlaybackId: string;
  /** MDX body (plain text — render as paragraph blocks split on \n\n) */
  body: string;
  /** 1-indexed display order */
  order: number;
};

const SLUGS = [
  'day-1',
  'day-2',
  'day-3',
  'day-4',
  'day-5',
  'day-6',
  'day-7',
  'day-8',
] as const;

const DAYS_DIR = path.join(process.cwd(), 'lib/content/vibrant40/days');

function loadDay(slug: string): Day {
  const raw = fs.readFileSync(path.join(DAYS_DIR, `${slug}.mdx`), 'utf8');
  const { data, content } = matter(raw);

  if (typeof data.title !== 'string') {
    throw new Error(`[vibrant40/days] ${slug}.mdx missing string "title" front-matter`);
  }
  if (typeof data.description !== 'string') {
    throw new Error(`[vibrant40/days] ${slug}.mdx missing string "description" front-matter`);
  }
  if (typeof data.muxPlaybackId !== 'string') {
    throw new Error(`[vibrant40/days] ${slug}.mdx missing string "muxPlaybackId" front-matter`);
  }
  if (typeof data.order !== 'number') {
    throw new Error(`[vibrant40/days] ${slug}.mdx missing numeric "order" front-matter`);
  }

  return {
    slug,
    title: data.title,
    description: data.description,
    muxPlaybackId: data.muxPlaybackId,
    body: content.trim(),
    order: data.order,
  };
}

export const DAYS: ReadonlyArray<Day> = SLUGS.map(loadDay).sort(
  (a, b) => a.order - b.order,
);

/** Look up a day by slug. Returns undefined for unknown slugs. */
export function getDay(slug: string): Day | undefined {
  return DAYS.find((d) => d.slug === slug);
}
