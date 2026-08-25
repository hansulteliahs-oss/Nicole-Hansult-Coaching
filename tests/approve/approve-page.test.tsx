/**
 * app/approve/page — token resolution and branch selection.
 *
 * Mocks the resolver, Nav/Footer (they pull site chrome that is irrelevant
 * here) and ApproveClient (a client component; we assert the props the page
 * hands it rather than its internals).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

const mocks = vi.hoisted(() => ({
  resolve: vi.fn(),
  clientProps: null as Record<string, unknown> | null,
}));

vi.mock('@/lib/content/approvals', () => ({
  resolveApprovalToken: mocks.resolve,
}));
vi.mock('@/components/layout/Nav', () => ({ Nav: () => null }));
vi.mock('@/components/layout/Footer', () => ({ Footer: () => null }));
vi.mock('@/app/approve/ApproveClient', () => ({
  ApproveClient: (props: Record<string, unknown>) => {
    mocks.clientProps = props;
    return <div data-approve-client="1" />;
  },
}));

const ApprovePage = (await import('@/app/approve/page')).default;

/**
 * The resolver mock is untyped, so an incomplete fixture would silently render
 * `slug: undefined` into the public-URL row. Build post drafts from here.
 */
const postDraft = (over: Record<string, unknown> = {}) => ({
  kind: 'post',
  title: 'Mobility',
  slug: 'mobility',
  body_md: 'Body text here.',
  seo_title: 'Mobility After 40',
  meta_description: 'A signal, not a sentence.',
  category: 'Movement',
  hero_image_url: null,
  ...over,
});

async function render(params: { token?: string; kind?: string }) {
  const el = await ApprovePage({ searchParams: Promise.resolve(params) });
  return renderToStaticMarkup(el);
}

beforeEach(() => {
  mocks.resolve.mockReset();
  mocks.clientProps = null;
});

describe('/approve', () => {
  it('is never statically cached', async () => {
    const mod = await import('@/app/approve/page');
    expect(mod.dynamic).toBe('force-dynamic');
  });

  it('stays out of search results', async () => {
    const mod = await import('@/app/approve/page');
    expect(mod.metadata.robots).toEqual({ index: false });
  });

  it('asks for a token when the link carries none, without mentioning email', async () => {
    const html = await render({});
    expect(html).toContain('missing its approval token');
    expect(html.toLowerCase()).not.toContain('preview email');
    expect(mocks.resolve).not.toHaveBeenCalled();
  });

  it('gives an unknown token its own copy', async () => {
    mocks.resolve.mockResolvedValue({ ok: false, reason: 'missing' });
    const html = await render({ token: 'x' });
    // renderToStaticMarkup HTML-escapes apostrophes in text nodes, so the
    // copy's apostrophe may show up as &#x27; or raw here even though a
    // browser always renders it as a plain '. Accept either so this test
    // tracks the copy, not the renderer's escaping choice.
    expect(html).toMatch(/We can(?:&#x27;|')t find this draft/);
    expect(html).not.toContain('data-approve-client');
  });

  it('gives an already-used token its own copy', async () => {
    mocks.resolve.mockResolvedValue({ ok: false, reason: 'used' });
    const html = await render({ token: 'x' });
    expect(html).toContain('already approved');
    expect(html).not.toContain('data-approve-client');
  });

  it('gives an expired token its own copy', async () => {
    mocks.resolve.mockResolvedValue({ ok: false, reason: 'expired' });
    const html = await render({ token: 'x' });
    expect(html).toContain('link has expired');
    expect(html).not.toContain('data-approve-client');
  });

  it('renders the post and the button on a valid token', async () => {
    mocks.resolve.mockResolvedValue({
      ok: true,
      draft: postDraft(),
    });
    const html = await render({ token: 'tok-1', kind: 'post' });
    expect(html).toContain('Mobility');
    expect(html).toContain('Body text here.');
    expect(html).toContain('data-approve-client');
    expect(mocks.clientProps).toEqual({ token: 'tok-1', kind: 'post' });
  });

  it('renders the metadata that publishes, not just the body', async () => {
    mocks.resolve.mockResolvedValue({ ok: true, draft: postDraft() });
    const html = await render({ token: 'tok-1' });
    // Everything here goes public under Nicole's name and is LLM-written.
    expect(html).toContain('/insights/mobility');
    expect(html).toContain('Mobility After 40');
    expect(html).toContain('A signal, not a sentence.');
    expect(html).toContain('Movement');
    expect(html).not.toContain('/insights/undefined');
  });

  it('renders the newsletter body through the page, not just its subject', async () => {
    mocks.resolve.mockResolvedValue({
      ok: true,
      draft: {
        kind: 'newsletter',
        subject: 'Your body is talking',
        preview_text: 'Signals, not sentences.',
        body_html: '<p>Hello list</p>',
      },
    });
    const html = await render({ token: 'tok-3' });
    expect(html).toContain('Your body is talking');
    expect(html).toContain('Signals, not sentences.');
    expect(html).toMatch(/srcdoc=/i);
    expect(html).not.toContain('<p>Hello list</p>');
  });

  it('takes kind from the database, not from the url', async () => {
    mocks.resolve.mockResolvedValue({
      ok: true,
      draft: { kind: 'newsletter', subject: 'S', preview_text: null, body_html: '<p>x</p>' },
    });
    // URL lies about the kind; the DB row is authoritative.
    await render({ token: 'tok-2', kind: 'post' });
    expect(mocks.clientProps).toEqual({ token: 'tok-2', kind: 'newsletter' });
  });

  it('passes the raw token through untouched', async () => {
    mocks.resolve.mockResolvedValue({
      ok: true,
      draft: postDraft({ title: 'T', body_md: 'B' }),
    });
    await render({ token: 'RaW-ToKeN-123' });
    expect(mocks.resolve).toHaveBeenCalledWith('RaW-ToKeN-123');
    expect(mocks.clientProps?.token).toBe('RaW-ToKeN-123');
  });
});
