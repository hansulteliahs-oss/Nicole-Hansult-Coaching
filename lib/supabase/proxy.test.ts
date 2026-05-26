/**
 * Phase 5 Plan 04 — extends Phase 4's proxy.ts with /vibrant40 membership check.
 *
 * Stub created in Plan 01 Wave 0. PAY-06.
 *
 * Existing Phase 4 behavior covered by lib/supabase/client.test.ts; this file
 * focuses on the new gating logic.
 */
import { describe, it } from 'vitest';

describe('lib/supabase/proxy — updateSession (Phase 5 gating extension)', () => {
  it.todo('anonymous request to /vibrant40/* redirects to /login?next=<path>');
  it.todo('anonymous request to /account/* redirects to /login?next=<path>');
  it.todo('authenticated non-member request to /vibrant40/* redirects to /services/vibrant40-jumpstart');
  it.todo('authenticated active member request to /vibrant40/* passes through (NextResponse.next)');
  it.todo('authenticated refunded member request to /vibrant40/* redirects to /services/vibrant40-jumpstart');
  it.todo('calls getClaims() BEFORE the membership query (session refresh first)');
  it.todo('non-gated paths skip the membership query entirely');
});
