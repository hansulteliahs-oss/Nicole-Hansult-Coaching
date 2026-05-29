/**
 * Vibrant40 Jumpstart — lesson + module index.
 *
 * Mirrors the real live course: 8 modules ("Days"), 23 lessons total.
 * Each lesson is its own MDX file in `lib/content/vibrant40/lessons/`,
 * read at module load time (server-only).
 *
 * A lesson is EITHER a video lesson (muxPlaybackId set, signed-policy) OR a
 * text lesson (muxPlaybackId null). The lesson page renders the Mux player
 * only when a playback ID is present.
 *
 * Front-matter contract (validated below):
 *   title        string   — lesson title (module-page H1 + card)
 *   slug         string   — URL segment + lesson_progress.day_slug key
 *   description  string   — 1-line card summary
 *   module       number   — 1..8, which Day this lesson belongs to
 *   moduleTitle  string   — display title for that Day
 *   order        number   — global 1..23 ordering across the whole course
 *   muxPlaybackId string? — Mux signed playback ID, omitted/empty for text lessons
 *
 * Body is plain Markdown (rendered with react-markdown on the lesson page).
 */
import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';

export type Lesson = {
  slug: string;
  title: string;
  description: string;
  /** Mux signed playback ID, or null for a text-only lesson. */
  muxPlaybackId: string | null;
  /** Markdown body. */
  body: string;
  /** Global 1-indexed order across all 23 lessons. */
  order: number;
  /** Module (Day) number, 1..8. */
  module: number;
  /** Display title for the module this lesson belongs to. */
  moduleTitle: string;
};

export type CourseModule = {
  number: number;
  title: string;
  lessons: Lesson[];
};

const LESSONS_DIR = path.join(process.cwd(), 'lib/content/vibrant40/lessons');

function loadLesson(file: string): Lesson {
  const raw = fs.readFileSync(path.join(LESSONS_DIR, file), 'utf8');
  const { data, content } = matter(raw);

  const req = (key: string, type: 'string' | 'number') => {
    if (typeof data[key] !== type) {
      throw new Error(`[vibrant40/lessons] ${file} missing ${type} "${key}" front-matter`);
    }
  };
  req('title', 'string');
  req('slug', 'string');
  req('description', 'string');
  req('module', 'number');
  req('moduleTitle', 'string');
  req('order', 'number');

  const pb = data.muxPlaybackId;
  const muxPlaybackId = typeof pb === 'string' && pb.trim().length > 0 ? pb.trim() : null;

  return {
    slug: data.slug,
    title: data.title,
    description: data.description,
    muxPlaybackId,
    body: content.trim(),
    order: data.order,
    module: data.module,
    moduleTitle: data.moduleTitle,
  };
}

export const LESSONS: ReadonlyArray<Lesson> = fs
  .readdirSync(LESSONS_DIR)
  .filter((f) => f.endsWith('.mdx'))
  .map(loadLesson)
  .sort((a, b) => a.order - b.order);

export const MODULES: ReadonlyArray<CourseModule> = (() => {
  const map = new Map<number, CourseModule>();
  for (const l of LESSONS) {
    let m = map.get(l.module);
    if (!m) {
      m = { number: l.module, title: l.moduleTitle, lessons: [] };
      map.set(l.module, m);
    }
    m.lessons.push(l);
  }
  return [...map.values()].sort((a, b) => a.number - b.number);
})();

export const TOTAL_LESSONS = LESSONS.length;

/** Look up a lesson by slug. Returns undefined for unknown slugs. */
export function getLesson(slug: string): Lesson | undefined {
  return LESSONS.find((l) => l.slug === slug);
}

/** Previous / next lesson in global order (null at the ends). */
export function getAdjacent(order: number): { prev: Lesson | null; next: Lesson | null } {
  const idx = LESSONS.findIndex((l) => l.order === order);
  return {
    prev: idx > 0 ? LESSONS[idx - 1] : null,
    next: idx >= 0 && idx < LESSONS.length - 1 ? LESSONS[idx + 1] : null,
  };
}
