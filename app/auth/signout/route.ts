import { revalidatePath } from 'next/cache';
import { type NextRequest, NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';

/**
 * POST /auth/signout
 *
 * Clears the Supabase session, revalidates the layout cache (so any
 * authenticated-only nav state re-renders), and redirects to /login.
 *
 * Idempotent: if there's no active session, just redirects.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  // AUTH-08: identity check via signed JWT claims — never the unverified
  // cookie helper. Idempotent: no claims = nothing to clear, just redirect.
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims ?? null;

  if (claims) {
    await supabase.auth.signOut();
  }

  revalidatePath('/', 'layout');
  return NextResponse.redirect(new URL('/login', req.url), { status: 302 });
}
