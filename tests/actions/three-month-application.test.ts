/**
 * Phase 5 Plan 06 — 3-Month Program application Server Action (FORM-03).
 *
 * Reuses Phase 3 infra (rate limit, honeypot, Resend ContactNotification template).
 * Discriminator: `kind: 'three-month-application'` on submissions row (added by
 * 002_paywall.sql in Plan 05-01).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ──────────────────────────────────────────────────────────────────
const sendMock = vi.fn();
const insertMock = vi.fn();

vi.mock('next/headers', () => ({
  headers: async () => new Map([['x-forwarded-for', '203.0.113.42']]),
}));

vi.mock('resend', () => ({
  Resend: class {
    emails = { send: sendMock };
  },
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: () => ({ insert: insertMock }),
  }),
}));

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn(() => true),
}));

// Spy on ContactNotification to assert it was passed to react:
vi.mock('@/components/email/ContactNotification', async () => {
  const actual = await vi.importActual<typeof import('@/components/email/ContactNotification')>(
    '@/components/email/ContactNotification',
  );
  return {
    ...actual,
    ContactNotification: vi.fn((props) => actual.ContactNotification(props)),
  };
});

// ─── Imports under test (after mocks) ───────────────────────────────────────
import { applicationAction } from '@/lib/actions/three-month-application';
import {
  threeMonthApplicationSchema,
  type ThreeMonthApplicationInput,
} from '@/lib/schemas/three-month-application';
import { checkRateLimit } from '@/lib/rate-limit';
import { ContactNotification } from '@/components/email/ContactNotification';

const validInput: ThreeMonthApplicationInput = {
  firstName: 'Jane',
  lastName: 'Smith',
  email: 'jane@example.com',
  phone: '+1 760 555 0100',
  goals: 'I want to rebuild strength after menopause and feel confident in my body again.',
  _hp: '',
};

beforeEach(() => {
  vi.clearAllMocks();
  sendMock.mockResolvedValue({ data: { id: 'msg_123' }, error: null });
  insertMock.mockResolvedValue({ error: null });
  vi.mocked(checkRateLimit).mockReturnValue(true);

  // Env stubs
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SECRET_KEY = 'sb_secret_test';
  process.env.RESEND_API_KEY = 're_test';
  process.env.RESEND_FROM_EMAIL =
    'Nicole Hansult Coaching <notifications@mail.nicolehansultcoaching.com>';
});

// ─── Schema sanity ──────────────────────────────────────────────────────────
describe('threeMonthApplicationSchema', () => {
  it('accepts valid input', () => {
    const result = threeMonthApplicationSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it('rejects empty firstName', () => {
    const result = threeMonthApplicationSchema.safeParse({ ...validInput, firstName: '' });
    expect(result.success).toBe(false);
  });

  it('rejects malformed email', () => {
    const result = threeMonthApplicationSchema.safeParse({ ...validInput, email: 'not-an-email' });
    expect(result.success).toBe(false);
  });

  it('rejects short goals', () => {
    const result = threeMonthApplicationSchema.safeParse({ ...validInput, goals: 'short' });
    expect(result.success).toBe(false);
  });

  it('rejects non-empty honeypot at schema layer', () => {
    const result = threeMonthApplicationSchema.safeParse({ ...validInput, _hp: 'spam' });
    expect(result.success).toBe(false);
  });
});

// ─── Server Action behavior ────────────────────────────────────────────────
describe('applicationAction', () => {
  it('returns { success: true } on valid input', async () => {
    const result = await applicationAction(validInput);
    expect(result).toEqual({ success: true });
  });

  it('rejects submissions missing required fields (firstName)', async () => {
    const result = await applicationAction({ ...validInput, firstName: '' });
    expect(result.success).toBe(false);
    if (!result.success && 'errors' in result && result.errors) {
      expect(result.errors.fieldErrors.firstName).toBeDefined();
    }
    expect(sendMock).not.toHaveBeenCalled();
    expect(insertMock).not.toHaveBeenCalled();
  });

  it('rejects submissions with malformed email', async () => {
    const result = await applicationAction({ ...validInput, email: 'nope' });
    expect(result.success).toBe(false);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('silently drops submissions with non-empty honeypot _hp field', async () => {
    const result = await applicationAction({ ...validInput, _hp: 'bot-fill' });
    // Phase 3 contact pattern returns { success: false, error: 'spam' } — silent
    // in the sense that no email/DB call is made.
    expect(result.success).toBe(false);
    expect(sendMock).not.toHaveBeenCalled();
    expect(insertMock).not.toHaveBeenCalled();
  });

  it('returns rate_limited when checkRateLimit returns false', async () => {
    vi.mocked(checkRateLimit).mockReturnValue(false);
    const result = await applicationAction(validInput);
    expect(result.success).toBe(false);
    if (!result.success && 'error' in result) {
      expect(result.error).toBe('rate_limited');
    }
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('rate-limit key namespaces three-month applications (so it does not collide with /contact)', async () => {
    await applicationAction(validInput);
    // checkRateLimit signature: (key, { maxTries, windowMs })
    const callArgs = vi.mocked(checkRateLimit).mock.calls[0];
    expect(callArgs[0]).toMatch(/three-month/);
  });

  it('sends Resend email with "New 3-Month Program application" subject', async () => {
    await applicationAction(validInput);
    expect(sendMock).toHaveBeenCalledTimes(1);
    const sendCall = sendMock.mock.calls[0][0];
    expect(sendCall.subject).toContain('New 3-Month Program application');
    expect(sendCall.subject).toContain('Jane Smith');
  });

  it('sends to nicole@nicolehansultcoaching.com with replyTo = applicant email', async () => {
    await applicationAction(validInput);
    const sendCall = sendMock.mock.calls[0][0];
    expect(sendCall.to).toEqual(expect.arrayContaining(['nicole@nicolehansultcoaching.com']));
    expect(sendCall.replyTo).toBe('jane@example.com');
  });

  it('passes ContactNotification component to Resend react: prop', async () => {
    await applicationAction(validInput);
    const sendCall = sendMock.mock.calls[0][0];
    expect(sendCall.react).toBeDefined();
    // ContactNotification was invoked during send composition
    expect(vi.mocked(ContactNotification)).toHaveBeenCalled();
  });

  it('writes a submissions row with kind = "three-month-application"', async () => {
    await applicationAction(validInput);
    expect(insertMock).toHaveBeenCalledTimes(1);
    const row = insertMock.mock.calls[0][0];
    expect(row.kind).toBe('three-month-application');
    expect(row.email).toBe('jane@example.com');
  });

  it('does NOT call Stripe (application gate, never auto-checkout)', async () => {
    // No Stripe import in module under test = the contract. The grep below
    // guards against accidental future imports.
    const source = await import('fs').then((fs) =>
      fs.readFileSync(
        new URL('../../lib/actions/three-month-application.ts', import.meta.url),
        'utf8',
      ),
    );
    expect(source).not.toMatch(/['"]stripe['"]/);
    expect(source).not.toMatch(/@\/lib\/stripe/);
  });

  it('does not bubble Supabase insert failures to the user (non-blocking pattern)', async () => {
    insertMock.mockResolvedValue({ error: { message: 'db down' } });
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const result = await applicationAction(validInput);
    expect(result).toEqual({ success: true });
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('returns email_failed when Resend send errors', async () => {
    sendMock.mockResolvedValue({ data: null, error: { message: 'resend down' } });
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const result = await applicationAction(validInput);
    expect(result.success).toBe(false);
    if (!result.success && 'error' in result) {
      expect(result.error).toBe('email_failed');
    }
    expect(insertMock).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
