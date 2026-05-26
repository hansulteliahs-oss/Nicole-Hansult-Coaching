import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/proxy';

/**
 * Next.js 16 proxy.ts — intercepts gated routes to refresh the Supabase
 * session cookie and enforce auth + Vibrant40 membership checks.
 *
 * This file lives at the project root (NOT inside app/) and exports
 * `proxy`, not `middleware` — Next.js 16 renamed the API.
 *
 * Matcher scope (Phase 5 PAY-06):
 *  - /account/:path*   → auth required (Phase 4 behavior preserved)
 *  - /vibrant40/:path* → auth + active vibrant40_members.status='active'
 *
 * Deliberately narrow: avoids running session refresh against /api/webhooks/*
 * (Stripe etc.), Sentry tunnel, static assets, and unrelated public pages.
 * Plan-05 PAY-04 webhook lives at /api/webhooks/stripe and is NOT matched.
 */
export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: ['/account/:path*', '/vibrant40/:path*'],
};
