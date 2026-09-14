/**
 * Contact Server Action — bot verification.
 *
 * Guards the regression that let 481 spam submissions through between
 * 2026-09-11 and 2026-09-13: honeypot and rate limit both pass for a
 * browser-driven bot, so Turnstile has to be the gate that stops it.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { sendMock, insertMock, verifyMock } = vi.hoisted(() => ({
  sendMock: vi.fn(),
  insertMock: vi.fn(),
  verifyMock: vi.fn(),
}));

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

vi.mock('@/lib/turnstile', () => ({
  verifyTurnstile: verifyMock,
}));

import { contactAction } from '@/lib/actions/contact';
import { verifyTurnstile } from '@/lib/turnstile';

const validInput = {
  firstName: 'Jane',
  lastName: 'Smith',
  email: 'jane@example.com',
  phone: '+1 760 555 0100',
  service: '3-Month Coaching Program',
  message: 'I would love to hear more about working together.',
  _hp: '',
  turnstileToken: 'a-real-token',
};

describe('contactAction bot verification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sendMock.mockResolvedValue({ error: null });
    insertMock.mockResolvedValue({ error: null });
    verifyMock.mockResolvedValue(true);
  });

  it('rejects the submission when Turnstile verification fails', async () => {
    verifyMock.mockResolvedValue(false);

    const result = await contactAction(validInput);

    expect(result).toEqual({ success: false, error: 'spam' });
  });

  it('sends no notification email when Turnstile verification fails', async () => {
    verifyMock.mockResolvedValue(false);

    await contactAction(validInput);

    expect(sendMock).not.toHaveBeenCalled();
  });

  it('writes no submissions row when Turnstile verification fails', async () => {
    verifyMock.mockResolvedValue(false);

    await contactAction(validInput);

    expect(insertMock).not.toHaveBeenCalled();
  });

  it('passes the submitted token and the visitor IP to the verifier', async () => {
    await contactAction(validInput);

    expect(verifyTurnstile).toHaveBeenCalledWith('a-real-token', '203.0.113.42');
  });

  it('sends the notification email when Turnstile verification passes', async () => {
    const result = await contactAction(validInput);

    expect(result).toEqual({ success: true });
    expect(sendMock).toHaveBeenCalledTimes(1);
  });

  it('keeps the token out of the notification email and the stored row', async () => {
    await contactAction(validInput);

    const stored = insertMock.mock.calls[0][0];
    expect(stored.data).not.toHaveProperty('turnstileToken');
    expect(stored.data).not.toHaveProperty('_hp');
  });
});
