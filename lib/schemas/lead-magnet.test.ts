import { describe, it, expect } from 'vitest';
import { leadMagnetSchema } from './lead-magnet';

describe('leadMagnetSchema', () => {
  const validData = {
    firstName: 'Jane',
    lastName: 'Doe',
    email: 'jane@example.com',
    _hp: '',
  };

  it('accepts valid data', () => {
    const result = leadMagnetSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('rejects missing email', () => {
    const result = leadMagnetSchema.safeParse({ ...validData, email: '' });
    expect(result.success).toBe(false);
    const issues = result.success ? [] : result.error.issues;
    expect(issues.some((i) => i.path.includes('email'))).toBe(true);
  });

  it('rejects missing firstName', () => {
    const result = leadMagnetSchema.safeParse({ ...validData, firstName: '' });
    expect(result.success).toBe(false);
  });

  it('rejects non-empty honeypot (_hp)', () => {
    const result = leadMagnetSchema.safeParse({ ...validData, _hp: 'bot' });
    expect(result.success).toBe(false);
  });
});
