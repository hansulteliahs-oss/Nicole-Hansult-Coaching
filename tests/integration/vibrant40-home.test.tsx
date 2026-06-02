/**
 * Phase 5 Plan 05 Task 2 — /vibrant40 course home (PAY-10) + /vibrant40/welcome (PAY-09).
 *
 * Tests render the Server Components directly with mocked Supabase + content.
 * react-server output is awaited and inspected as a tree (no DOM needed).
 *
 * Course model: 8 modules ("Days"), 23 lessons total. Each module renders as
 * a <section> with its lessons in a <ul> of <LessonCard>s. Completion reflects
 * the per-user `lesson_progress` table, keyed by lesson slug (column day_slug).
 * Expectations are derived from the real content index so these tests track the
 * rendering logic rather than hardcoded counts.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { LESSONS, MODULES, TOTAL_LESSONS } from '@/lib/content/vibrant40/lessons';

// ---- Mocks (must be hoisted before component imports) ---------------------

const mocks = vi.hoisted(() => ({
  // Supabase client returned by createClient()
  getClaims: vi.fn(),
  from: vi.fn(),
  // next/navigation.redirect
  redirect: vi.fn((_path: string) => {
    throw new Error(`__redirect__:${_path}`);
  }),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: { getClaims: mocks.getClaims },
    from: mocks.from,
  })),
}));

vi.mock('next/navigation', () => ({
  redirect: mocks.redirect,
}));

beforeEach(() => {
  mocks.getClaims.mockReset();
  mocks.from.mockReset();
  mocks.redirect.mockClear();
});

// Build a chainable `from(...).select(...).eq(...)` mock returning `rows`.
function mockLessonProgress(rows: Array<{ day_slug: string }>) {
  mocks.from.mockImplementation((table: string) => {
    if (table !== 'lesson_progress') throw new Error(`Unexpected table: ${table}`);
    return {
      select: () => ({
        eq: async () => ({ data: rows, error: null }),
      }),
    };
  });
}

// ----  /vibrant40 course home (PAY-10) -------------------------------------

describe('/vibrant40 course home page', () => {
  it('redirects to /login when there is no authenticated claim', async () => {
    mocks.getClaims.mockResolvedValueOnce({ data: null });

    const { default: CourseHome } = await import('@/app/vibrant40/page');

    await expect(CourseHome()).rejects.toThrow(/__redirect__:\/login/);
    expect(mocks.redirect).toHaveBeenCalledWith(
      expect.stringMatching(/^\/login\?next=\/vibrant40$/),
    );
  });

  it('renders every lesson, grouped into one module section per Day, in global order', async () => {
    mocks.getClaims.mockResolvedValueOnce({
      data: { claims: { sub: 'user-1', email: 'member@example.com' } },
    });
    mockLessonProgress([]);

    const { default: CourseHome } = await import('@/app/vibrant40/page');
    const tree: any = await CourseHome();

    // One <ul> per module (Day).
    const lists = findAll(tree, (n) => n?.type === 'ul');
    expect(lists.length).toBe(MODULES.length);

    // Every lesson rendered as a LessonCard, in global order.
    const cards = lessonCards(tree);
    expect(cards.length).toBe(TOTAL_LESSONS);
    cards.forEach((card, idx) => {
      expect(card.props.lesson.slug).toBe(LESSONS[idx].slug);
    });
  });

  it('marks completed lessons with `completed: true` from lesson_progress rows', async () => {
    const doneA = LESSONS[0].slug;
    const doneB = LESSONS[2].slug;
    mocks.getClaims.mockResolvedValueOnce({
      data: { claims: { sub: 'user-1', email: 'member@example.com' } },
    });
    mockLessonProgress([{ day_slug: doneA }, { day_slug: doneB }]);

    const { default: CourseHome } = await import('@/app/vibrant40/page');
    const tree: any = await CourseHome();

    const completedMap: Record<string, boolean> = {};
    lessonCards(tree).forEach((card) => {
      completedMap[card.props.lesson.slug] = card.props.completed;
    });

    expect(completedMap[doneA]).toBe(true);
    expect(completedMap[doneB]).toBe(true);
    expect(completedMap[LESSONS[1].slug]).toBe(false);
    expect(completedMap[LESSONS[3].slug]).toBe(false);
  });

  it(`shows counter "2 of ${TOTAL_LESSONS} lessons complete" when 2 rows returned`, async () => {
    mocks.getClaims.mockResolvedValueOnce({
      data: { claims: { sub: 'user-1', email: 'member@example.com' } },
    });
    mockLessonProgress([{ day_slug: LESSONS[0].slug }, { day_slug: LESSONS[4].slug }]);

    const { default: CourseHome } = await import('@/app/vibrant40/page');
    const tree: any = await CourseHome();

    const text = extractText(tree);
    expect(text).toMatch(new RegExp(`2\\s+of\\s+${TOTAL_LESSONS}\\s+lessons complete`));
  });

  it(`shows counter "0 of ${TOTAL_LESSONS} lessons complete" when no progress rows`, async () => {
    mocks.getClaims.mockResolvedValueOnce({
      data: { claims: { sub: 'user-1', email: 'member@example.com' } },
    });
    mockLessonProgress([]);

    const { default: CourseHome } = await import('@/app/vibrant40/page');
    const tree: any = await CourseHome();

    const text = extractText(tree);
    expect(text).toMatch(new RegExp(`0\\s+of\\s+${TOTAL_LESSONS}\\s+lessons complete`));
  });

  it('exports dynamic = "force-dynamic" (PITFALL 6 guard)', async () => {
    const mod = await import('@/app/vibrant40/page');
    expect(mod.dynamic).toBe('force-dynamic');
  });
});

// ---- /vibrant40/welcome (PAY-09) -----------------------------------------

describe('/vibrant40/welcome orientation page', () => {
  it('redirects unauthenticated visitors to /login?next=/vibrant40/welcome', async () => {
    mocks.getClaims.mockResolvedValueOnce({ data: null });

    const { default: WelcomePage } = await import('@/app/vibrant40/welcome/page');

    await expect(WelcomePage()).rejects.toThrow(/__redirect__/);
    expect(mocks.redirect).toHaveBeenCalledWith('/login?next=/vibrant40/welcome');
  });

  it('renders a CTA linking to /vibrant40 for authed members', async () => {
    mocks.getClaims.mockResolvedValueOnce({
      data: { claims: { sub: 'user-1', email: 'member@example.com' } },
    });

    const { default: WelcomePage } = await import('@/app/vibrant40/welcome/page');
    const tree: any = await WelcomePage();

    const cta = findNode(
      tree,
      (n) => typeof n === 'object' && n?.props?.href === '/vibrant40',
    );
    expect(cta).toBeTruthy();
  });

  it('exports dynamic = "force-dynamic"', async () => {
    const mod = await import('@/app/vibrant40/welcome/page');
    expect(mod.dynamic).toBe('force-dynamic');
  });
});

// ---- helpers --------------------------------------------------------------

/** Every <LessonCard> element in the tree (carries lesson + completed props). */
function lessonCards(tree: any): any[] {
  return findAll(
    tree,
    (n) => typeof n === 'object' && n?.props && 'lesson' in n.props && 'completed' in n.props,
  );
}

function findNode(node: any, predicate: (n: any) => boolean): any {
  if (node == null) return null;
  if (predicate(node)) return node;
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
