import { describe, it, expect } from 'vitest';
import { validateSameOriginNext } from './same-origin';

describe('validateSameOriginNext', () => {
  it('accepts valid same-origin paths', () => {
    expect(validateSameOriginNext('/account')).toBe('/account');
    expect(validateSameOriginNext('/vibrant40/module-3')).toBe(
      '/vibrant40/module-3',
    );
  });

  it('rejects absolute URLs', () => {
    expect(validateSameOriginNext('https://evil.com')).toBe('/account');
    expect(validateSameOriginNext('http://evil.com')).toBe('/account');
  });

  it('rejects protocol-relative URLs', () => {
    expect(validateSameOriginNext('//evil.com')).toBe('/account');
  });

  it('handles undefined/null', () => {
    expect(validateSameOriginNext(undefined)).toBe('/account');
    expect(validateSameOriginNext(null)).toBe('/account');
  });
});
