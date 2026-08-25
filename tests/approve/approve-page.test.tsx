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
    // renderToStaticMarkup HTML-escapes apostrophes in text nodes (React's
    // standard escapeHtml maps ' -> &#x27;), so the copy's apostrophe shows
    // up escaped here even though a browser renders it as a plain '.
    expect(html).toContain('We can&#x27;t find this draft');
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
      draft: { kind: 'post', title: 'Mobility', body_md: 'Body text here.' },
    });
    const html = await render({ token: 'tok-1', kind: 'post' });
    expect(html).toContain('Mobility');
    expect(html).toContain('Body text here.');
    expect(html).toContain('data-approve-client');
    expect(mocks.clientProps).toEqual({ token: 'tok-1', kind: 'post' });
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
      draft: { kind: 'post', title: 'T', body_md: 'B' },
    });
    await render({ token: 'RaW-ToKeN-123' });
    expect(mocks.resolve).toHaveBeenCalledWith('RaW-ToKeN-123');
    expect(mocks.clientProps?.token).toBe('RaW-ToKeN-123');
  });
});
