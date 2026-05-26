'use server';

import { randomBytes } from 'node:crypto';

import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

import { AuthMigrationWelcome } from '@/components/email/AuthMigrationWelcome';
import { checkRateLimit } from '@/lib/rate-limit';

// Single Resend instance reused across calls — matches Phase 3 pattern.
const resend = new Resend(process.env.RESEND_API_KEY);

export type ReissueTokenResult = { ok: true } | { ok: false; error: string };

/**
 * Self-service re-issue: if `email` matches an existing migration_tokens row,
 * insert a fresh 30-day token and send a new "set password" email.
 *
 * For privacy, the action returns `{ ok: true }` even when the email is
 * unknown — we never leak whether a given address is a migration user.
 */
export async function reissueTokenAction(email: string): Promise<ReissueTokenResult> {
  if (!email || typeof email !== 'string') {
    return { ok: false, error: 'Enter a valid email address.' };
  }

  const normalised = email.trim().toLowerCase();

  // Rate-limit per email: at most 1 request per 2 minutes.
  if (!checkRateLimit(`reissue:${normalised}`, { maxTries: 1, windowMs: 120_000 })) {
    return { ok: false, error: 'Please wait 2 minutes before requesting another link.' };
  }

  const admin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
  );

  // Look up whether any migration_tokens row exists for this email.
  const { data: existing, error: lookupError } = await admin
    .from('migration_tokens')
    .select('email')
    .eq('email', normalised)
    .limit(1)
    .maybeSingle();

  if (lookupError) {
    console.error('[reissueTokenAction] lookup error:', lookupError);
    // Still return ok=true so we don't leak existence.
    return { ok: true };
  }

  if (!existing) {
    // Don't leak whether email is a migration user — always appear successful.
    return { ok: true };
  }

  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  const { error: insertError } = await admin.from('migration_tokens').insert({
    token,
    email: normalised,
    expires_at: expiresAt,
  });

  if (insertError) {
    console.error('[reissueTokenAction] insert error:', insertError);
    return { ok: false, error: 'Could not generate a new link. Please try again.' };
  }

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    'https://nicole-hansult-coaching.vercel.app';
  const setPasswordUrl = `${siteUrl}/set-password?token=${token}`;

  const { error: emailError } = await resend.emails.send({
    from:
      process.env.RESEND_FROM_EMAIL ??
      'Nicole Hansult Coaching <notifications@mail.nicolehansultcoaching.com>',
    to: normalised,
    subject: 'Your new link to set a password',
    react: AuthMigrationWelcome({ setPasswordUrl }),
  });

  if (emailError) {
    console.error('[reissueTokenAction] Resend error:', emailError);
    return { ok: false, error: 'Could not send email. Please try again.' };
  }

  return { ok: true };
}
