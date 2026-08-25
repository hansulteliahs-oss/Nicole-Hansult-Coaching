/**
 * lib/observability/scrub — keeps approval tokens out of Sentry.
 *
 * The property under test: no matter which field the SDK put it in, a raw
 * approval token must never survive into an outbound event. It is a bearer
 * credential for an irreversible send to roughly 1,110 people.
 */
import { describe, it, expect } from 'vitest';

import {
  scrubUrl,
  scrubEvent,
  REDACTED,
} from '@/lib/observability/scrub';

const TOKEN = 'a1b2c3d4e5f6a7b8c9d0a1b2c3d4e5f6a7b8c9d0';

describe('scrubUrl', () => {
  it('redacts the token from an absolute approve URL', () => {
    const out = scrubUrl(
      `https://www.nicolehansultcoaching.com/approve?token=${TOKEN}&kind=newsletter`,
    );
    expect(out).not.toContain(TOKEN);
    expect(out).toContain(REDACTED);
  });

  it('keeps the rest of the URL intact', () => {
    const out = scrubUrl(
      `https://www.nicolehansultcoaching.com/approve?token=${TOKEN}&kind=newsletter`,
    );
    expect(out).toContain('/approve');
    expect(out).toContain('kind=newsletter');
    expect(out).toContain('www.nicolehansultcoaching.com');
  });

  it('redacts the token from a relative URL without inventing an origin', () => {
    const out = scrubUrl(`/approve?token=${TOKEN}&kind=post`);
    expect(out).not.toContain(TOKEN);
    expect(out.startsWith('/approve')).toBe(true);
    expect(out).not.toContain('scrub.invalid');
  });

  it('redacts the token when it is not the first param', () => {
    const out = scrubUrl(`/approve?kind=post&token=${TOKEN}`);
    expect(out).not.toContain(TOKEN);
  });

  it('preserves the fragment', () => {
    const out = scrubUrl(`/approve?token=${TOKEN}#body`);
    expect(out).not.toContain(TOKEN);
    expect(out).toContain('#body');
  });

  it('leaves a URL with no token exactly as it was', () => {
    const url = 'https://www.nicolehansultcoaching.com/insights/mobility?utm=x';
    expect(scrubUrl(url)).toBe(url);
  });

  it('handles an empty string', () => {
    expect(scrubUrl('')).toBe('');
  });

  it('redacts even from a string that is not a parseable URL', () => {
    const out = scrubUrl(`not a url at all ?token=${TOKEN} trailing`);
    expect(out).not.toContain(TOKEN);
  });
});

describe('scrubEvent', () => {
  it('redacts the token from request.url', () => {
    const event = scrubEvent({
      request: { url: `https://x.test/approve?token=${TOKEN}`, method: 'GET' },
    });
    expect(event.request?.url).not.toContain(TOKEN);
    // Untouched fields survive.
    expect(event.request?.method).toBe('GET');
  });

  it('redacts the token from navigation breadcrumbs', () => {
    const event = scrubEvent({
      breadcrumbs: [
        { category: 'navigation', data: { from: '/', to: `/approve?token=${TOKEN}` } },
      ],
    });
    expect(JSON.stringify(event)).not.toContain(TOKEN);
  });

  it('redacts the token from fetch breadcrumbs', () => {
    const event = scrubEvent({
      breadcrumbs: [
        { category: 'fetch', data: { url: `/api/approve?token=${TOKEN}` } },
      ],
    });
    expect(JSON.stringify(event)).not.toContain(TOKEN);
  });

  it('survives an event with no request and no breadcrumbs', () => {
    expect(() => scrubEvent({})).not.toThrow();
    expect(() => scrubEvent({ breadcrumbs: undefined, request: undefined })).not.toThrow();
  });

  it('survives breadcrumbs that carry no data', () => {
    expect(() =>
      scrubEvent({ breadcrumbs: [{ category: 'ui.click' }, { data: undefined }] }),
    ).not.toThrow();
  });

  it('returns the same object, as Sentry beforeSend expects', () => {
    const event = { request: { url: '/x' } };
    expect(scrubEvent(event)).toBe(event);
  });

  it('leaves an event carrying no token completely alone', () => {
    const event = {
      request: { url: 'https://x.test/insights/mobility' },
      breadcrumbs: [{ data: { to: '/insights/mobility' } }],
    };
    expect(scrubEvent(event)).toEqual({
      request: { url: 'https://x.test/insights/mobility' },
      breadcrumbs: [{ data: { to: '/insights/mobility' } }],
    });
  });
});
