/**
 * Phase 5 Plan 05 Task 2 — /vibrant40 course home (PAY-10) + /vibrant40/welcome (PAY-09).
 *
 * Tests render the Server Components directly with mocked Supabase + DAYS.
 * react-server output is awaited and inspected as a tree (no DOM needed).
 *
 * Stub seeded in Plan 01 Wave 0; filled in here.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

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

  it('renders 8 day cards in order day-1 through day-8 for an authed member', async () => {
    mocks.getClaims.mockResolvedValueOnce({
      data: { claims: { sub: 'user-1', email: 'member@example.com' } },
    });
    mockLessonProgress([]);

    const { default: CourseHome } = await import('@/app/vibrant40/page');
    const tree: any = await CourseHome();

    // Find <ul> in tree, count children
    const ul = findNode(tree, (n) => n?.type === 'ul');
    expect(ul).toBeTruthy();
    const items = (Array.isArray(ul.props.children) ? ul.props.children : [ul.props.children]).filter(Boolean);
    expect(items.length).toBe(8);

    // Each item should reference day-1..day-8 in order
    items.forEach((item: any, idx: number) => {
      const expected = `day-${idx + 1}`;
      const dayCard = item.props.children;
      expect(dayCard.props.day.slug).toBe(expected);
    });
  });

  it('marks completed days with `completed: true` from lesson_progress rows', async () => {
    mocks.getClaims.mockResolvedValueOnce({
      data: { claims: { sub: 'user-1', email: 'member@example.com' } },
    });
    mockLessonProgress([{ day_slug: 'day-1' }, { day_slug: 'day-3' }]);

    const { default: CourseHome } = await import('@/app/vibrant40/page');
    const tree: any = await CourseHome();

    const ul = findNode(tree, (n) => n?.type === 'ul');
    const items = (Array.isArray(ul.props.children) ? ul.props.children : [ul.props.children]).filter(Boolean);

    const completedMap: Record<string, boolean> = {};
    items.forEach((item: any) => {
      const dc = item.props.children;
      completedMap[dc.props.day.slug] = dc.props.completed;
    });

    expect(completedMap['day-1']).toBe(true);
    expect(completedMap['day-2']).toBe(false);
    expect(completedMap['day-3']).toBe(true);
    expect(completedMap['day-4']).toBe(false);
    expect(completedMap['day-8']).toBe(false);
  });

  it('shows counter "2 of 8 days complete" when 2 rows returned', async () => {
    mocks.getClaims.mockResolvedValueOnce({
      data: { claims: { sub: 'user-1', email: 'member@example.com' } },
    });
    mockLessonProgress([{ day_slug: 'day-1' }, { day_slug: 'day-5' }]);

    const { default: CourseHome } = await import('@/app/vibrant40/page');
    const tree: any = await CourseHome();

    const counter = findNode(tree, (n) => typeof n === 'object' && /of 8 days complete/.test(extractText(n)));
    expect(extractText(counter)).toMatch(/2\s+of 8 days complete/);
  });

  it('shows counter "0 of 8 days complete" when no progress rows', async () => {
    mocks.getClaims.mockResolvedValueOnce({
      data: { claims: { sub: 'user-1', email: 'member@example.com' } },
    });
    mockLessonProgress([]);

    const { default: CourseHome } = await import('@/app/vibrant40/page');
    const tree: any = await CourseHome();

    const text = extractText(tree);
    expect(text).toMatch(/0\s+of 8 days complete/);
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

function extractText(node: any): string {
  if (node == null || node === false) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(extractText).join(' ');
  if (typeof node === 'object' && node.props) return extractText(node.props.children);
  return '';
}
