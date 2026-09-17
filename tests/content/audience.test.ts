/**
 * lib/content/audience — who a newsletter goes to, as a label and a size.
 *
 * The approve pages used to hardcode ~1,110 for every send. With segmented
 * sends (engaged, cold, Sugar Cravings) that number is wrong more often than
 * right, and "how many people does this press reach" is the one thing the
 * confirm step exists to say. Sizes are config, not live Mailchimp calls: the
 * page must not depend on Mailchimp being reachable.
 */
import { describe, it, expect } from 'vitest';

import { describeAudience, audienceSentence, audienceSizes } from '@/lib/content/audience';

describe('describeAudience', () => {
  it('names the main list with its default size', () => {
    expect(describeAudience('f531604a9a', null)).toEqual({
      label: 'Main list',
      approx: 1157,
    });
  });

  it('names the Sugar Cravings list, which is a different audience from the segment of the same name', () => {
    expect(describeAudience('ecacfdabed', null)).toEqual({
      label: 'Sugar Cravings list',
      approx: 150,
    });
  });

  it('labels a segment and reports its size as unknown when nothing says otherwise', () => {
    expect(describeAudience('f531604a9a', '12345')).toEqual({
      label: 'Main list · segment 12345',
      approx: null,
    });
  });

  it('takes a segment size from the sizes map keyed list:segment', () => {
    expect(describeAudience('f531604a9a', '12345', { 'f531604a9a:12345': 610 })).toEqual({
      label: 'Main list · segment 12345',
      approx: 610,
    });
  });

  it('lets the sizes map override a list default', () => {
    expect(describeAudience('f531604a9a', null, { f531604a9a: 1200 }).approx).toBe(1200);
  });

  it('shows a raw id for an unknown list rather than guessing', () => {
    expect(describeAudience('deadbeef00', null)).toEqual({ label: 'list deadbeef00', approx: null });
  });
});

describe('audienceSizes', () => {
  it('parses MAILCHIMP_AUDIENCE_SIZES JSON', () => {
    expect(audienceSizes('{"f531604a9a":1200,"f531604a9a:1":50}')).toEqual({
      f531604a9a: 1200,
      'f531604a9a:1': 50,
    });
  });

  it('ignores malformed or non-numeric input instead of throwing on a page render', () => {
    expect(audienceSizes('not json')).toEqual({});
    expect(audienceSizes('{"a":"lots"}')).toEqual({});
    expect(audienceSizes(undefined)).toEqual({});
  });
});

describe('audienceSentence', () => {
  it('says about how many people when the size is known', () => {
    expect(audienceSentence({ label: 'Main list', approx: 1157 })).toBe('Main list (about 1,157 people)');
  });

  it('says the size is not known rather than inventing one', () => {
    expect(audienceSentence({ label: 'Main list · segment 12345', approx: null })).toBe(
      'Main list · segment 12345 (size not known here)',
    );
  });
});
