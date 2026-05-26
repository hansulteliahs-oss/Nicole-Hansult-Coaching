/**
 * Phase 5 Plan 06 — 3-Month Program application Server Action (FORM-03).
 *
 * Stub created in Plan 01 Wave 0. Reuses Phase 3 infra (rate limit, honeypot,
 * Resend ContactNotification template) with kind: 'three-month-application'.
 */
import { describe, it } from 'vitest';

describe('lib/actions/three-month-application', () => {
  it.todo('rejects submissions missing required fields (firstName/lastName/email/phone/goals)');
  it.todo('rejects submissions with non-empty honeypot _hp field (silent drop)');
  it.todo('rate-limits to 5 attempts per IP per 60s (reuses lib/rate-limit)');
  it.todo('writes a submissions row with kind = "three-month-application"');
  it.todo('sends Resend email to nicole@nicolehansultcoaching.com via ContactNotification template');
  it.todo('sets reply_to = applicant email on the Resend send');
  it.todo('does NOT call Stripe (3-Month is application-gated, never auto-checkout)');
  it.todo('returns { ok: true } on success and redirects client to /services/three-month-coaching/thank-you');
});
