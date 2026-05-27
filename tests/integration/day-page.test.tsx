/**
 * Phase 5 Plan 05 Task 3 — /vibrant40/days/[slug] module page (PAY-11)
 *   + markComplete Server Action (PAY-08).
 *
 * Mocks lib/mux + lib/supabase/server so no live Mux signing key / Supabase
 * connection is needed at test time. Asserts:
 *   - JWT minted per render (no cache)
 *   - unknown slug → /vibrant40 redirect
 *   - prev/next nav
 *   - module-level dynamic + robots metadata
 *   - markComplete returns ok=false / code=unauthorized on missing claims
 *   - markComplete upserts (user_id, day_slug, completed_at) and revalidates
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

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

// ---- DayPage --------------------------------------------------------------

describe('/vibrant40/days/[slug] module page', () => {
  it('redirects to /vibrant40 when slug is not in DAYS', async () => {
    const { default: DayPage } = await import('@/app/vibrant40/days/[slug]/page');

    await expect(
      DayPage({ params: Promise.resolve({ slug: 'day-99' }) }),
    ).rejects.toThrow(/__redirect__:\/vibrant40/);
    expect(mocks.redirect).toHaveBeenCalledWith('/vibrant40');
  });

  it('redirects to /login when claims are null', async () => {
    mocks.getClaims.mockResolvedValueOnce({ data: null });

    const { default: DayPage } = await import('@/app/vibrant40/days/[slug]/page');

    await expect(
      DayPage({ params: Promise.resolve({ slug: 'day-1' }) }),
    ).rejects.toThrow(/__redirect__/);
    expect(mocks.redirect).toHaveBeenCalledWith('/login?next=/vibrant40/days/day-1');
  });

  it('mints fresh Mux playback tokens per render with the day muxPlaybackId', async () => {
    mocks.getClaims.mockResolvedValueOnce({
      data: { claims: { sub: 'user-1', email: 'm@x.com' } },
    });
    mocks.mintPlaybackTokens.mockResolvedValueOnce({
      playback: 'jwt-p',
      thumbnail: 'jwt-t',
      storyboard: 'jwt-s',
    });

    const { default: DayPage } = await import('@/app/vibrant40/days/[slug]/page');
    await DayPage({ params: Promise.resolve({ slug: 'day-1' }) });

    expect(mocks.mintPlaybackTokens).toHaveBeenCalledTimes(1);
    expect(mocks.mintPlaybackTokens).toHaveBeenCalledWith('PLACEHOLDER_DAY_1');
  });

  it('renders the day title, description, MuxPlayerClient with tokens, MarkCompleteButton, and prev/next nav', async () => {
    mocks.getClaims.mockResolvedValueOnce({
      data: { claims: { sub: 'user-1', email: 'm@x.com' } },
    });
    mocks.mintPlaybackTokens.mockResolvedValueOnce({
      playback: 'jwt-p',
      thumbnail: 'jwt-t',
      storyboard: 'jwt-s',
    });

    const { default: DayPage } = await import('@/app/vibrant40/days/[slug]/page');
    const tree: any = await DayPage({ params: Promise.resolve({ slug: 'day-2' }) });

    const text = extractText(tree);
    expect(text).toMatch(/Day 2/);
    expect(text).toMatch(/Eating to Feel Vibrant/);

    // Find MuxPlayerClient — its props.tokens should match minted output
    const player = findNode(
      tree,
      (n) => n?.props && 'playbackId' in n.props && 'tokens' in n.props,
    );
    expect(player).toBeTruthy();
    expect(player.props.playbackId).toBe('PLACEHOLDER_DAY_2');
    expect(player.props.tokens).toEqual({
      playback: 'jwt-p',
      thumbnail: 'jwt-t',
      storyboard: 'jwt-s',
    });

    // MarkCompleteButton — should have slug=day-2 prop
    const button = findNode(
      tree,
      (n) => n?.props && n.props.slug === 'day-2' && typeof n?.type === 'function',
    );
    expect(button).toBeTruthy();

    // Prev nav: day-1, Next nav: day-3
    const prevLink = findNode(tree, (n) => n?.props?.href === '/vibrant40/days/day-1');
    const nextLink = findNode(tree, (n) => n?.props?.href === '/vibrant40/days/day-3');
    expect(prevLink).toBeTruthy();
    expect(nextLink).toBeTruthy();
  });

  it('omits prev nav on day-1', async () => {
    mocks.getClaims.mockResolvedValueOnce({
      data: { claims: { sub: 'user-1' } },
    });
    mocks.mintPlaybackTokens.mockResolvedValueOnce({
      playback: 'p',
      thumbnail: 't',
      storyboard: 's',
    });

    const { default: DayPage } = await import('@/app/vibrant40/days/[slug]/page');
    const tree: any = await DayPage({ params: Promise.resolve({ slug: 'day-1' }) });

    const prevLink = findNode(tree, (n) => n?.props?.href === '/vibrant40/days/day-0');
    expect(prevLink).toBeNull();

    const nextLink = findNode(tree, (n) => n?.props?.href === '/vibrant40/days/day-2');
    expect(nextLink).toBeTruthy();
  });

  it('omits next nav on day-8', async () => {
    mocks.getClaims.mockResolvedValueOnce({
      data: { claims: { sub: 'user-1' } },
    });
    mocks.mintPlaybackTokens.mockResolvedValueOnce({
      playback: 'p',
      thumbnail: 't',
      storyboard: 's',
    });

    const { default: DayPage } = await import('@/app/vibrant40/days/[slug]/page');
    const tree: any = await DayPage({ params: Promise.resolve({ slug: 'day-8' }) });

    const nextLink = findNode(tree, (n) => n?.props?.href === '/vibrant40/days/day-9');
    expect(nextLink).toBeNull();

    const prevLink = findNode(tree, (n) => n?.props?.href === '/vibrant40/days/day-7');
    expect(prevLink).toBeTruthy();
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
    const result = await markComplete('day-1');

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
    const result = await markComplete('day-1');

    expect(result).toEqual({ ok: true });
    expect(mocks.upsert).toHaveBeenCalledTimes(1);
    const [row, opts] = mocks.upsert.mock.calls[0];
    expect(row).toMatchObject({ user_id: 'user-1', day_slug: 'day-1' });
    expect(typeof row.completed_at).toBe('string');
    expect(opts).toEqual({ onConflict: 'user_id,day_slug' });

    expect(mocks.revalidatePath).toHaveBeenCalledWith('/vibrant40');
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/vibrant40/days/day-1');
  });

  it('returns { ok: false, code: "db_error" } when upsert fails', async () => {
    mocks.getClaims.mockResolvedValueOnce({
      data: { claims: { sub: 'user-1' } },
    });
    mocks.upsert.mockResolvedValueOnce({ error: { message: 'duplicate key' } });

    const { markComplete } = await import('@/lib/actions/lesson-progress');
    const result = await markComplete('day-1');

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

function extractText(node: any): string {
  if (node == null || node === false) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(extractText).join(' ');
  if (typeof node === 'object' && node.props) return extractText(node.props.children);
  return '';
}
