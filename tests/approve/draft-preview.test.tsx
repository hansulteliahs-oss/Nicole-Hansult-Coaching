/**
 * app/approve/DraftPreview — renders the draft above the approve button.
 *
 * Posts reuse the site's shared markdown renderer. Newsletters are raw
 * email HTML, so they render inside a sandboxed iframe: the email carries its
 * own <style> and table layout, and letting that loose in the page would both
 * break the site's styling and render nothing like the real email.
 */
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

import { DraftPreview } from '@/app/approve/DraftPreview';
import type { ApprovalDraft } from '@/lib/content/approvals';

type PostDraft = Extract<ApprovalDraft, { kind: 'post' }>;

/** A fully-populated post; override only what a test is about. */
const postDraft = (over: Partial<PostDraft> = {}): PostDraft => ({
  kind: 'post',
  title: 'Why mobility matters',
  slug: 'why-mobility-matters',
  body_md: '## Intro\n\nSome body text.',
  seo_title: 'Why Mobility Matters After 40',
  meta_description: 'Stiffness is a signal, not a sentence.',
  category: 'Movement',
  hero_image_url: 'https://cdn.test/hero.jpg',
  faq: [],
  ...over,
});

describe('DraftPreview', () => {
  it('renders a post title and its markdown body as real HTML', () => {
    const html = renderToStaticMarkup(
      <DraftPreview draft={postDraft()} />,
    );
    expect(html).toContain('Why mobility matters');
    expect(html).toContain('<h2');
    expect(html).toContain('Intro');
    expect(html).toContain('Some body text.');
  });

  it('renders a newsletter subject and preview text', () => {
    const html = renderToStaticMarkup(
      <DraftPreview
        draft={{
          kind: 'newsletter',
          subject: 'Your body is talking',
          preview_text: 'Signals, not sentences.',
          body_html: '<p>Hello list</p>',
        }}
      />,
    );
    expect(html).toContain('Your body is talking');
    expect(html).toContain('Signals, not sentences.');
  });

  it('renders newsletter html inside a sandboxed iframe, not into the page', () => {
    const html = renderToStaticMarkup(
      <DraftPreview
        draft={{
          kind: 'newsletter',
          subject: 'S',
          preview_text: null,
          body_html: '<p id="needle">Hello list</p>',
        }}
      />,
    );
    expect(html).toContain('<iframe');
    expect(html).toContain('sandbox=""');
    // The body html must be carried by srcdoc (escaped), never injected raw.
    expect(html).toMatch(/srcdoc=/i);
    expect(html).not.toContain('<p id="needle">');
  });

  it('omits the preview-text line when there is none', () => {
    const html = renderToStaticMarkup(
      <DraftPreview
        draft={{ kind: 'newsletter', subject: 'S', preview_text: null, body_html: '<p>x</p>' }}
      />,
    );
    expect(html).not.toContain('Preview text');
  });
});

describe('DraftPreview post metadata', () => {
  it('shows the public URL the post will live at', () => {
    const html = renderToStaticMarkup(
      <DraftPreview draft={postDraft({ slug: 'why-mobility-matters' })} />,
    );
    expect(html).toContain('/insights/why-mobility-matters');
  });

  it('shows the search title and description that publish under her name', () => {
    const html = renderToStaticMarkup(<DraftPreview draft={postDraft()} />);
    expect(html).toContain('Why Mobility Matters After 40');
    expect(html).toContain('Stiffness is a signal, not a sentence.');
  });

  it('shows the category', () => {
    const html = renderToStaticMarkup(<DraftPreview draft={postDraft({ category: 'Movement' })} />);
    expect(html).toContain('Movement');
  });

  it('renders the share image when there is one', () => {
    const html = renderToStaticMarkup(
      <DraftPreview draft={postDraft({ hero_image_url: 'https://cdn.test/hero.jpg' })} />,
    );
    expect(html).toContain('https://cdn.test/hero.jpg');
  });

  it('says so, with the consequence, when the search description is missing', () => {
    const html = renderToStaticMarkup(
      <DraftPreview draft={postDraft({ meta_description: null })} />,
    );
    expect(html).toContain('Not set');
    expect(html).toContain('Google will pick its own snippet');
  });

  it('says so when there is no share image', () => {
    const html = renderToStaticMarkup(
      <DraftPreview draft={postDraft({ hero_image_url: null })} />,
    );
    expect(html).toContain('Not set');
    expect(html).toContain('no picture');
  });

  it('shows the published default category rather than hiding a null', () => {
    const html = renderToStaticMarkup(<DraftPreview draft={postDraft({ category: null })} />);
    // app/insights/[slug]/page.tsx falls back to this, so the preview must too.
    expect(html).toContain('Functional Longevity');
    expect(html).toContain('default');
  });

  it('falls back to the post title for the search title, and says it is a fallback', () => {
    const html = renderToStaticMarkup(<DraftPreview draft={postDraft({ seo_title: null })} />);
    expect(html).toContain('Why mobility matters');
    expect(html).toContain('falls back to the post title');
  });

  it('still renders the body alongside the metadata', () => {
    const html = renderToStaticMarkup(<DraftPreview draft={postDraft()} />);
    expect(html).toContain('Some body text.');
    expect(html).toContain('<h2');
  });

  it('shows no metadata block for a newsletter', () => {
    const html = renderToStaticMarkup(
      <DraftPreview
        draft={{
          kind: 'newsletter',
          subject: 'S',
          preview_text: null,
          body_html: '<p>x</p>',
        }}
      />,
    );
    expect(html).not.toContain('Public URL');
    expect(html).not.toContain('Search description');
  });
});
