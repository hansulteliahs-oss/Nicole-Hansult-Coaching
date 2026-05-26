'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { validateSameOriginNext } from '@/lib/auth/same-origin';
import { checkRateLimit } from '@/lib/rate-limit';
import { createClient } from '@/lib/supabase/server';

export type LoginResult =
  | { ok: true }
  | { ok: false; code: string; error: string };

export type ResendResult = { ok: true } | { ok: false; error: string };

/**
 * Server Action: sign in with email + password.
 *
 * On success: revalidates layout cache and redirects to validated `?next=` path
 * (defaults to /account). On failure: returns a discriminated result so the
 * client form can render an inline error and decide whether to surface the
 * resend-verification button (only when code === 'email_not_confirmed').
 *
 * Generic messaging on auth failure — never echo "user not found" vs
 * "wrong password" separately (user enumeration prevention).
 */
export async function loginAction(
  email: string,
  password: string,
  next?: string,
): Promise<LoginResult> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    if (error.code === 'email_not_confirmed') {
      return {
        ok: false,
        code: 'email_not_confirmed',
        error: 'Please verify your email before logging in.',
      };
    }
    return {
      ok: false,
      code: error.code ?? 'unknown',
      error: 'Email or password is incorrect.',
    };
  }

  revalidatePath('/', 'layout');
  redirect(validateSameOriginNext(next));
}

/**
 * Server Action: resend the signup verification email.
 *
 * Rate-limited per email address: 1 request per 60 seconds. Uses
 * NEXT_PUBLIC_SITE_URL as the redirect base so production and preview
 * environments each generate links pointing back to themselves.
 */
export async function resendVerificationAction(
  email: string,
): Promise<ResendResult> {
  if (!email || !email.includes('@')) {
    return { ok: false, error: 'Enter a valid email address first.' };
  }

  if (!checkRateLimit(`resend:${email.toLowerCase()}`, { maxTries: 1, windowMs: 60_000 })) {
    return {
      ok: false,
      error: 'Please wait 60 seconds before requesting another verification email.',
    };
  }

  const supabase = await createClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? '';
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email,
    options: {
      emailRedirectTo: siteUrl ? `${siteUrl}/auth/callback` : undefined,
    },
  });

  if (error) {
    return { ok: false, error: 'Could not resend. Please try again.' };
  }
  return { ok: true };
}
