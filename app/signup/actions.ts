'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export type SignupResult =
  | { ok: true }
  | { ok: false; code: string; error: string };

export async function signupAction(
  email: string,
  password: string,
): Promise<SignupResult> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    },
  });

  if (error) {
    if (error.code === 'user_already_exists' || error.code === 'email_exists') {
      return {
        ok: false,
        code: error.code,
        error: 'An account with this email already exists. Log in instead?',
      };
    }
    if (error.code === 'weak_password') {
      return {
        ok: false,
        code: 'weak_password',
        error: 'Password must be at least 8 characters.',
      };
    }
    return {
      ok: false,
      code: error.code ?? 'unknown',
      error: 'Could not create account. Please try again.',
    };
  }

  // Supabase sends verification email automatically — redirect to check-email
  redirect(`/signup/check-email?email=${encodeURIComponent(email)}`);
}

export async function resendVerificationAction(
  email: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    },
  });
  return error
    ? { ok: false, error: 'Could not resend. Please wait a moment.' }
    : { ok: true };
}
