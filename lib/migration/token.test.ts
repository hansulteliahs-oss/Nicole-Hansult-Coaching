import { describe, it, expect } from 'vitest';
import { validateMigrationToken } from './token';

const future = new Date(Date.now() + 86_400_000).toISOString();
const past = new Date(Date.now() - 86_400_000).toISOString();

describe('validateMigrationToken', () => {
  it('returns ok for valid, unused, unexpired token', () => {
    const row = {
      token: 'abc',
      email: 'test@example.com',
      expires_at: future,
      used_at: null,
    };
    expect(validateMigrationToken(row)).toEqual({ ok: true, row });
  });

  it('returns not_found for null row', () => {
    expect(validateMigrationToken(null)).toEqual({
      ok: false,
      reason: 'not_found',
    });
  });

  it('returns used for token with used_at', () => {
    const row = {
      token: 'abc',
      email: 'test@example.com',
      expires_at: future,
      used_at: past,
    };
    expect(validateMigrationToken(row)).toEqual({
      ok: false,
      reason: 'used',
    });
  });

  it('returns expired for past expires_at', () => {
    const row = {
      token: 'abc',
      email: 'test@example.com',
      expires_at: past,
      used_at: null,
    };
    expect(validateMigrationToken(row)).toEqual({
      ok: false,
      reason: 'expired',
    });
  });
});
