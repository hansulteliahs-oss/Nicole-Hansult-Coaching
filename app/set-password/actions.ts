'use server';

import { redirect } from 'next/navigation';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

import { createClient } from '@/lib/supabase/server';
import { validateMigrationToken } from '@/lib/migration/token';
import type { MigrationTokenRow } from '@/lib/migration/token';

// Service role client — reads migration_tokens (bypasses RLS) and performs admin auth ops.
// Constructed per-call (not module-level) so missing env vars surface at request time, not import.
function getAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
  );
}

export type SetPasswordResult =
  | { ok: true }
  | { ok: false; code: 'expired' | 'not_found' | 'used' | 'error'; error: string };

export async function setPasswordAction(
  token: string,
  password: string,
): Promise<SetPasswordResult> {
  if (!token || typeof token !== 'string') {
    return { ok: false, code: 'not_found', error: 'Missing token.' };
  }
  if (!password || password.length < 8) {
    return { ok: false, code: 'error', error: 'Password must be at least 8 characters.' };
  }

  const admin = getAdminClient();

  // 1. Look up the migration token (service role bypasses RLS).
  const { data: row, error: fetchError } = await admin
    .from('migration_tokens')
    .select('*')
    .eq('token', token)
    .maybeSingle<MigrationTokenRow>();

  if (fetchError) {
    console.error('[setPasswordAction] fetch error:', fetchError);
    return { ok: false, code: 'error', error: 'Something went wrong. Please try again.' };
  }

  const result = validateMigrationToken(row ?? null);
  if (!result.ok) {
    return {
      ok: false,
      code: result.reason,
      error: 'This link has expired or has already been used.',
    };
  }

  const email = result.row.email;

  // 2. Find or create the auth user, then set password + email_confirm atomically.
  const { data: userList, error: listError } = await admin.auth.admin.listUsers();
  if (listError) {
    console.error('[setPasswordAction] listUsers error:', listError);
    return { ok: false, code: 'error', error: 'Could not look up your account. Please try again.' };
  }

  const authUser = userList?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase());

  if (!authUser) {
    // Migration path: user has no Supabase auth row yet. Create + set password + confirm in one call.
    const { data: newUser, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (createError || !newUser?.user) {
      console.error('[setPasswordAction] createUser error:', createError);
      return { ok: false, code: 'error', error: 'Could not create account. Please contact support.' };
    }
  } else {
    // Existing user: update password + mark email confirmed atomically (Pitfall 5 guard).
    const { error: updateError } = await admin.auth.admin.updateUserById(authUser.id, {
      password,
      email_confirm: true,
    });
    if (updateError) {
      console.error('[setPasswordAction] updateUserById error:', updateError);
      return { ok: false, code: 'error', error: 'Could not set password. Please try again.' };
    }
  }

  // 3. Mark token as used (best-effort — failure here does not block sign-in).
  const { error: markError } = await admin
    .from('migration_tokens')
    .update({ used_at: new Date().toISOString() })
    .eq('token', token);
  if (markError) {
    console.error('[setPasswordAction] mark used error:', markError);
  }

  // 4. Sign in via server-side cookie-aware client so the proxy session is set.
  const supabase = await createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
  if (signInError) {
    console.error('[setPasswordAction] signIn error:', signInError);
    // Password is set; user can sign in manually from /login.
    redirect('/login?welcome=migration');
  }

  redirect('/account?welcome=migration');
}
