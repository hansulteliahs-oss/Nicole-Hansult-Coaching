import { type EmailOtpType } from '@supabase/supabase-js';
import { type NextRequest, NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';

/**
 * GET /auth/callback
 *
 * Target of Supabase email confirmation links (signup verification, password
 * recovery, magic links). Exchanges the one-time `token_hash` for a session
 * cookie, then redirects to the same-origin `?next=` path (or /account).
 *
 * Supabase email templates (configured in dashboard) must point here, e.g.:
 *   {{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=email
 *   {{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=recovery&next=/reset-password/confirm
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const nextParam = searchParams.get('next') ?? '/account';

  // Same-origin guard: only allow paths starting with a single `/`.
  const safeNext =
    nextParam.startsWith('/') && !nextParam.startsWith('//')
      ? nextParam
      : '/account';
  const redirectTo = new URL(safeNext, origin);

  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      return NextResponse.redirect(redirectTo);
    }
  }

  // Verification failed — redirect to the expired-link page.
  const errorUrl = new URL('/auth/error', origin);
  return NextResponse.redirect(errorUrl);
}
