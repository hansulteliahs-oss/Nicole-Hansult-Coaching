'use server';

import { createClient } from '@/lib/supabase/server';

export async function requestResetAction(
  email: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=/reset-password/confirm`,
  });
  // Always return ok: true to avoid leaking which emails have accounts.
  // Supabase silently no-ops when the email doesn't exist.
  if (error) console.error('[resetPasswordForEmail]', error.message);
  return { ok: true };
}
