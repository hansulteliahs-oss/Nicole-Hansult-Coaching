import { describe, it, expect } from 'vitest';
import { wrapEmail } from '@/lib/mailchimp/emailLayout';

describe('wrapEmail', () => {
  const body =
    '<p>Hi everyone,</p><h2>A heading</h2><ul><li><strong>One.</strong> two</li></ul>' +
    '<p>Read <a href="https://www.nicolehansultcoaching.com/insights/x">this</a>.</p>' +
    '<p>This is general education, not medical advice.</p>';

  it('keeps every word and link of the body', () => {
    const out = wrapEmail(body);
    for (const s of ['Hi everyone,', 'A heading', 'One.', 'href="https://www.nicolehansultcoaching.com/insights/x"', 'not medical advice.']) {
      expect(out).toContain(s);
    }
  });

  it('inlines styles on body tags and sets the disclaimer as fine print', () => {
    const out = wrapEmail(body);
    expect(out).toMatch(/<h2 style="[^"]*Georgia/);
    expect(out).toMatch(/<a href="[^"]*" style="[^"]*color:#9B5292/);
    expect(out).toMatch(/<p style="[^"]*font-size:13px[^"]*">This is general education/);
    expect(out).not.toMatch(/<p>|<h2>|<li>/);
  });

  it('leaves tags that already carry a style alone and does not touch <pre>', () => {
    const out = wrapEmail('<p style="color:red">x</p><pre>y</pre>');
    expect(out).toContain('<p style="color:red">x</p>');
    expect(out).toContain('<pre>y</pre>');
  });

  it('is idempotent', () => {
    const once = wrapEmail(body);
    expect(wrapEmail(once)).toBe(once);
  });

  it('carries the logo and signature from the live site', () => {
    const out = wrapEmail(body);
    expect(out).toContain('https://www.nicolehansultcoaching.com/images/email/logo.png');
    expect(out).toContain('https://www.nicolehansultcoaching.com/images/email/nicole-signature.jpg');
  });
});
