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

describe('DraftPreview', () => {
  it('renders a post title and its markdown body as real HTML', () => {
    const html = renderToStaticMarkup(
      <DraftPreview
        draft={{
          kind: 'post',
          title: 'Why mobility matters',
          body_md: '## Intro\n\nSome body text.',
        }}
      />,
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
