/**
 * Phase 5 Plan 05 Task 3 — /vibrant40/days/[slug] lesson page (PAY-11)
 *   + markComplete Server Action (PAY-08).
 *
 * Mocks lib/mux + lib/supabase/server so no live Mux signing key / Supabase
 * connection is needed at test time. Asserts:
 *   - JWT minted per render for VIDEO lessons (no cache); text lessons skip it
 *   - unknown slug → /vibrant40 redirect
 *   - prev/next nav across the global 23-lesson order
 *   - module-level dynamic + robots metadata
 *   - markComplete returns ok=false / code=unauthorized on missing claims
 *   - markComplete upserts (user_id, day_slug, completed_at) and revalidates
 *
 * Slugs/titles/playback IDs are pulled from the real content index so the
 * tests track the rendering logic rather than hardcoded fixtures.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { LESSONS, getAdjacent } from '@/lib/content/vibrant40/lessons';

// ---- Fixtures derived from real content -----------------------------------

const firstLesson = LESSONS[0];
const lastLesson = LESSONS[LESSONS.length - 1];
// A video lesson with both a previous and a next lesson (full-render case).
const midVideoLesson = LESSONS.find(
  (l) => l.muxPlaybackId && l.order > 1 && l.order < LESSONS.length,
)!;
// A text-only lesson (no Mux player).
const textLesson = LESSONS.find((l) => !l.muxPlaybackId)!;

// ---- Mocks (hoisted) ------------------------------------------------------

const mocks = vi.hoisted(() => ({
  mintPlaybackTokens: vi.fn(),
  getClaims: vi.fn(),
  upsert: vi.fn(),
  redirect: vi.fn((_path: string) => {
    throw new Error(`__redirect__:${_path}`);
  }),
  revalidatePath: vi.fn(),
}));

vi.mock('@/lib/mux', () => ({
  mintPlaybackTokens: mocks.mintPlaybackTokens,
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: { getClaims: mocks.getClaims },
    from: (_table: string) => ({
      upsert: mocks.upsert,
    }),
  })),
}));

vi.mock('next/navigation', () => ({
  redirect: mocks.redirect,
}));

vi.mock('next/cache', () => ({
  revalidatePath: mocks.revalidatePath,
}));

beforeEach(() => {
  mocks.mintPlaybackTokens.mockReset();
  mocks.getClaims.mockReset();
  mocks.upsert.mockReset();
  mocks.redirect.mockClear();
  mocks.revalidatePath.mockClear();
});

// ---- LessonPage -----------------------------------------------------------

describe('/vibrant40/days/[slug] lesson page', () => {
  it('redirects to /vibrant40 when slug is not a known lesson', async () => {
    const { default: LessonPage } = await import('@/app/vibrant40/days/[slug]/page');

    await expect(
      LessonPage({ params: Promise.resolve({ slug: 'does-not-exist' }) }),
    ).rejects.toThrow(/__redirect__:\/vibrant40/);
    expect(mocks.redirect).toHaveBeenCalledWith('/vibrant40');
  });

  it('redirects to /login when claims are null', async () => {
    mocks.getClaims.mockResolvedValueOnce({ data: null });

    const { default: LessonPage } = await import('@/app/vibrant40/days/[slug]/page');

    await expect(
      LessonPage({ params: Promise.resolve({ slug: firstLesson.slug }) }),
    ).rejects.toThrow(/__redirect__/);
    expect(mocks.redirect).toHaveBeenCalledWith(
      `/login?next=/vibrant40/days/${firstLesson.slug}`,
    );
  });

  it('mints fresh Mux playback tokens per render with the lesson muxPlaybackId', async () => {
    mocks.getClaims.mockResolvedValueOnce({
      data: { claims: { sub: 'user-1', email: 'm@x.com' } },
    });
    mocks.mintPlaybackTokens.mockResolvedValueOnce({
      playback: 'jwt-p',
      thumbnail: 'jwt-t',
      storyboard: 'jwt-s',
    });

    const { default: LessonPage } = await import('@/app/vibrant40/days/[slug]/page');
    await LessonPage({ params: Promise.resolve({ slug: firstLesson.slug }) });

    expect(mocks.mintPlaybackTokens).toHaveBeenCalledTimes(1);
    expect(mocks.mintPlaybackTokens).toHaveBeenCalledWith(firstLesson.muxPlaybackId);
  });

  it('does not mint tokens or render a player for a text-only lesson', async () => {
    mocks.getClaims.mockResolvedValueOnce({
      data: { claims: { sub: 'user-1', email: 'm@x.com' } },
    });

    const { default: LessonPage } = await import('@/app/vibrant40/days/[slug]/page');
    const tree: any = await LessonPage({ params: Promise.resolve({ slug: textLesson.slug }) });

    expect(mocks.mintPlaybackTokens).not.toHaveBeenCalled();
    const player = findNode(
      tree,
      (n) => n?.props && 'playbackId' in n.props && 'tokens' in n.props,
    );
    expect(player).toBeNull();
  });

  it('renders the lesson title, description, MuxPlayerClient with tokens, MarkCompleteButton, and prev/next nav', async () => {
    mocks.getClaims.mockResolvedValueOnce({
      data: { claims: { sub: 'user-1', email: 'm@x.com' } },
    });
    mocks.mintPlaybackTokens.mockResolvedValueOnce({
      playback: 'jwt-p',
      thumbnail: 'jwt-t',
      storyboard: 'jwt-s',
    });

    const { prev, next } = getAdjacent(midVideoLesson.order);

    const { default: LessonPage } = await import('@/app/vibrant40/days/[slug]/page');
    const tree: any = await LessonPage({
      params: Promise.resolve({ slug: midVideoLesson.slug }),
    });

    const text = extractText(tree);
    expect(text).toContain(midVideoLesson.title);
    expect(text).toContain(midVideoLesson.description);

    // MuxPlayerClient — its props.tokens should match minted output.
    const player = findNode(
      tree,
      (n) => n?.props && 'playbackId' in n.props && 'tokens' in n.props,
    );
    expect(player).toBeTruthy();
    expect(player.props.playbackId).toBe(midVideoLesson.muxPlaybackId);
    expect(player.props.tokens).toEqual({
      playback: 'jwt-p',
      thumbnail: 'jwt-t',
      storyboard: 'jwt-s',
    });

    // MarkCompleteButton — should carry this lesson's slug.
    const button = findNode(
      tree,
      (n) => n?.props && n.props.slug === midVideoLesson.slug && typeof n?.type === 'function',
    );
    expect(button).toBeTruthy();

    // Prev/next nav across the global lesson order.
    expect(prev).not.toBeNull();
    expect(next).not.toBeNull();
    const prevLink = findNode(tree, (n) => n?.props?.href === `/vibrant40/days/${prev!.slug}`);
    const nextLink = findNode(tree, (n) => n?.props?.href === `/vibrant40/days/${next!.slug}`);
    expect(prevLink).toBeTruthy();
    expect(nextLink).toBeTruthy();
  });

  it('omits prev nav on the first lesson', async () => {
    mocks.getClaims.mockResolvedValueOnce({ data: { claims: { sub: 'user-1' } } });
    mocks.mintPlaybackTokens.mockResolvedValueOnce({ playback: 'p', thumbnail: 't', storyboard: 's' });

    const { default: LessonPage } = await import('@/app/vibrant40/days/[slug]/page');
    const tree: any = await LessonPage({ params: Promise.resolve({ slug: firstLesson.slug }) });

    // Only the "next" day-link should be present — no prev.
    const dayLinks = findAll(tree, (n) => typeof n?.props?.href === 'string' &&
      n.props.href.startsWith('/vibrant40/days/'));
    expect(dayLinks.length).toBe(1);
    expect(dayLinks[0].props.href).toBe(`/vibrant40/days/${LESSONS[1].slug}`);
  });

  it('omits next nav on the last lesson', async () => {
    mocks.getClaims.mockResolvedValueOnce({ data: { claims: { sub: 'user-1' } } });
    mocks.mintPlaybackTokens.mockResolvedValueOnce({ playback: 'p', thumbnail: 't', storyboard: 's' });

    const { default: LessonPage } = await import('@/app/vibrant40/days/[slug]/page');
    const tree: any = await LessonPage({ params: Promise.resolve({ slug: lastLesson.slug }) });

    // Only the "prev" day-link should be present — no next.
    const dayLinks = findAll(tree, (n) => typeof n?.props?.href === 'string' &&
      n.props.href.startsWith('/vibrant40/days/'));
    expect(dayLinks.length).toBe(1);
    expect(dayLinks[0].props.href).toBe(`/vibrant40/days/${LESSONS[LESSONS.length - 2].slug}`);
  });

  it('exports dynamic = "force-dynamic" + metadata.robots.index = false', async () => {
    const mod: any = await import('@/app/vibrant40/days/[slug]/page');
    expect(mod.dynamic).toBe('force-dynamic');
    expect(mod.metadata?.robots?.index).toBe(false);
  });
});

// ---- markComplete Server Action ------------------------------------------

describe('markComplete server action', () => {
  it('returns { ok: false, code: "unauthorized" } when claims is null', async () => {
    mocks.getClaims.mockResolvedValueOnce({ data: null });

    const { markComplete } = await import('@/lib/actions/lesson-progress');
    const result = await markComplete(firstLesson.slug);

    expect(result.ok).toBe(false);
    expect((result as { code: string }).code).toBe('unauthorized');
    expect(mocks.upsert).not.toHaveBeenCalled();
  });

  it('upserts a lesson_progress row keyed by (user_id, day_slug) and revalidates', async () => {
    mocks.getClaims.mockResolvedValueOnce({
      data: { claims: { sub: 'user-1' } },
    });
    mocks.upsert.mockResolvedValueOnce({ error: null });

    const { markComplete } = await import('@/lib/actions/lesson-progress');
    const result = await markComplete(firstLesson.slug);

    expect(result).toEqual({ ok: true });
    expect(mocks.upsert).toHaveBeenCalledTimes(1);
    const [row, opts] = mocks.upsert.mock.calls[0];
    expect(row).toMatchObject({ user_id: 'user-1', day_slug: firstLesson.slug });
    expect(typeof row.completed_at).toBe('string');
    expect(opts).toEqual({ onConflict: 'user_id,day_slug' });

    expect(mocks.revalidatePath).toHaveBeenCalledWith('/vibrant40');
    expect(mocks.revalidatePath).toHaveBeenCalledWith(`/vibrant40/days/${firstLesson.slug}`);
  });

  it('returns { ok: false, code: "db_error" } when upsert fails', async () => {
    mocks.getClaims.mockResolvedValueOnce({
      data: { claims: { sub: 'user-1' } },
    });
    mocks.upsert.mockResolvedValueOnce({ error: { message: 'duplicate key' } });

    const { markComplete } = await import('@/lib/actions/lesson-progress');
    const result = await markComplete(firstLesson.slug);

    expect(result.ok).toBe(false);
    expect((result as { code: string }).code).toBe('db_error');
  });
});

// ---- helpers --------------------------------------------------------------

function findNode(node: any, predicate: (n: any) => boolean): any {
  if (node == null) return null;
  if (typeof node === 'object' && predicate(node)) return node;
  if (Array.isArray(node)) {
    for (const c of node) {
      const found = findNode(c, predicate);
      if (found) return found;
    }
    return null;
  }
  if (typeof node === 'object' && node.props) {
    return findNode(node.props.children, predicate);
  }
  return null;
}

function findAll(node: any, predicate: (n: any) => boolean, acc: any[] = []): any[] {
  if (node == null) return acc;
  if (typeof node === 'object' && !Array.isArray(node) && predicate(node)) acc.push(node);
  if (Array.isArray(node)) {
    for (const c of node) findAll(c, predicate, acc);
    return acc;
  }
  if (typeof node === 'object' && node.props) findAll(node.props.children, predicate, acc);
  return acc;
}

function extractText(node: any): string {
  if (node == null || node === false) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(extractText).join(' ');
  if (typeof node === 'object' && node.props) return extractText(node.props.children);
  return '';
}
