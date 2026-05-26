import { describe, it, expect } from 'vitest';
import { contactSchema } from './contact';

describe('contactSchema', () => {
  const validData = {
    firstName: 'Jane',
    lastName: 'Doe',
    email: 'jane@example.com',
    message: 'Hello, I am interested.',
    _hp: '',
  };

  it('accepts valid data', () => {
    const result = contactSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('rejects missing firstName', () => {
    const result = contactSchema.safeParse({ ...validData, firstName: '' });
    expect(result.success).toBe(false);
    const issues = result.success ? [] : result.error.issues;
    expect(issues.some((i) => i.path.includes('firstName'))).toBe(true);
  });

  it('rejects invalid email', () => {
    const result = contactSchema.safeParse({ ...validData, email: 'not-an-email' });
    expect(result.success).toBe(false);
    const issues = result.success ? [] : result.error.issues;
    expect(issues.some((i) => i.path.includes('email'))).toBe(true);
  });

  it('rejects non-empty honeypot (_hp)', () => {
    const result = contactSchema.safeParse({ ...validData, _hp: 'bot' });
    expect(result.success).toBe(false);
    const issues = result.success ? [] : result.error.issues;
    expect(issues.some((i) => i.path.includes('_hp'))).toBe(true);
  });

  it('accepts optional phone absent', () => {
    const { phone: _unused, ...withoutPhone } = { ...validData, phone: undefined };
    const result = contactSchema.safeParse(withoutPhone);
    expect(result.success).toBe(true);
  });

  it('accepts optional service absent', () => {
    const { service: _unused, ...withoutService } = { ...validData, service: undefined };
    const result = contactSchema.safeParse(withoutService);
    expect(result.success).toBe(true);
  });
});
