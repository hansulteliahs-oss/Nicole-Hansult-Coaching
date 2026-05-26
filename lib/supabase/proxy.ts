import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Refresh the Supabase session cookie on every matched request and gate
 * /vibrant40/* on Vibrant40 membership.
 *
 * Wired in proxy.ts at the project root.
 *
 * CRITICAL: getClaims() must run immediately after createServerClient.
 * It refreshes the session token via the signed JWT claims; without it,
 * users get randomly logged out mid-session as the access token expires.
 *
 * Gating model (Phase 5 — PAY-06):
 *   - Anonymous + /vibrant40/* OR /account/*   → /login?next=<path>
 *   - Authenticated + /vibrant40/* + no active member row → /services/vibrant40-jumpstart
 *   - Authenticated + /vibrant40/* + active member row    → pass through
 *   - /account/* never runs the membership query (Phase 4 behavior preserved)
 *   - Public paths are matched out at the proxy.ts matcher level.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // CRITICAL: refreshes the session — do not remove or reorder.
  // Must run BEFORE the membership query (PITFALL 6 — session must be
  // refreshed first or the access token expiry can race the DB lookup).
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims ?? null;

  const path = request.nextUrl.pathname;
  const isGated = path.startsWith('/vibrant40') || path.startsWith('/account');

  // ANONYMOUS GUARD — covers BOTH /vibrant40 + /account (extends Phase 4 /account guard)
  if (!claims && isGated) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', path);
    return NextResponse.redirect(url);
  }

  // MEMBERSHIP GATE — only /vibrant40, only when authenticated.
  // /account is intentionally exempt: Phase 4 behavior is auth-gated, not member-gated.
  if (claims && path.startsWith('/vibrant40')) {
    const { data: member } = await supabase
      .from('vibrant40_members')
      .select('status')
      .eq('user_id', claims.sub)
      .maybeSingle();

    if (!member || member.status !== 'active') {
      const url = request.nextUrl.clone();
      url.pathname = '/services/vibrant40-jumpstart';
      url.search = '';
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
