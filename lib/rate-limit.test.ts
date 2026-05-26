import { describe, it, expect, beforeEach } from 'vitest';
import { checkRateLimit, _resetCache } from './rate-limit';

describe('checkRateLimit', () => {
  beforeEach(() => {
    _resetCache();
  });

  it('returns true on first call for a new key', () => {
    expect(checkRateLimit('127.0.0.1', { maxTries: 5, windowMs: 60_000 })).toBe(true);
  });

  it('allows up to maxTries calls within window', () => {
    const opts = { maxTries: 5, windowMs: 60_000 };
    for (let i = 0; i < 5; i++) {
      expect(checkRateLimit('10.0.0.1', opts)).toBe(true);
    }
  });

  it('blocks the (maxTries + 1)th call within window', () => {
    const opts = { maxTries: 5, windowMs: 60_000 };
    for (let i = 0; i < 5; i++) {
      checkRateLimit('10.0.0.2', opts);
    }
    expect(checkRateLimit('10.0.0.2', opts)).toBe(false);
  });

  it('allows call after window expires', async () => {
    const opts = { maxTries: 2, windowMs: 50 }; // 50ms window
    checkRateLimit('10.0.0.3', opts);
    checkRateLimit('10.0.0.3', opts);
    // 3rd call within window — should be blocked
    expect(checkRateLimit('10.0.0.3', opts)).toBe(false);
    // Wait for window to expire
    await new Promise((r) => setTimeout(r, 60));
    // Now should be allowed (new window)
    expect(checkRateLimit('10.0.0.3', opts)).toBe(true);
  });
});
