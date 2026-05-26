'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export type ConfirmResetResult = { ok: true } | { ok: false; error: string };

export async function confirmResetAction(
  password: string,
): Promise<ConfirmResetResult> {
  const supabase = await createClient();
  // User has a session established by /auth/callback redirect — updateUser is safe.
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    if (error.code === 'weak_password') {
      return { ok: false, error: 'Password must be at least 8 characters.' };
    }
    return {
      ok: false,
      error: 'Could not update password. The link may have expired.',
    };
  }
  redirect('/login?reset=success');
}
