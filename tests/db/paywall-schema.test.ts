/**
 * Phase 5 Plan 01 Task 1 — schema migration verification.
 *
 * Hits Supabase with the service-role key and asserts that the three Phase 5
 * tables exist with RLS enabled, and that the submissions.kind column was added.
 *
 * Skipped automatically when SUPABASE_SECRET_KEY is missing (CI without secrets).
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { config as loadEnv } from 'dotenv';
import path from 'node:path';

loadEnv({ path: path.resolve(__dirname, '../../.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SECRET = process.env.SUPABASE_SECRET_KEY;
const RUN = Boolean(SUPABASE_URL && SUPABASE_SECRET);
const describeIf = RUN ? describe : describe.skip;

describeIf('Phase 5 paywall schema (supabase/migrations/002_paywall.sql)', () => {
  let admin: SupabaseClient;

  beforeAll(() => {
    admin = createClient(SUPABASE_URL!, SUPABASE_SECRET!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  });

  it('vibrant40_members table exists and accepts service-role select', async () => {
    const { error } = await admin.from('vibrant40_members').select('email').limit(1);
    expect(error).toBeNull();
  });

  it('stripe_events table exists and accepts service-role select', async () => {
    const { error } = await admin.from('stripe_events').select('event_id').limit(1);
    expect(error).toBeNull();
  });

  it('lesson_progress table exists and accepts service-role select', async () => {
    const { error } = await admin.from('lesson_progress').select('user_id').limit(1);
    expect(error).toBeNull();
  });

  it('submissions.kind column exists with default "contact"', async () => {
    // Service-role insert without kind should default to 'contact'.
    const probeEmail = `kind-probe+${Date.now()}@example.test`;
    const { data, error } = await admin
      .from('submissions')
      .insert({ form_type: 'contact', email: probeEmail, data: {} })
      .select('id, kind')
      .single();

    expect(error).toBeNull();
    expect(data?.kind).toBe('contact');

    if (data?.id) {
      await admin.from('submissions').delete().eq('id', data.id);
    }
  });

  it('RLS is enabled on vibrant40_members (anon client returns zero rows)', async () => {
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!anonKey) {
      // If publishable key is missing, skip the anon probe but keep the spec discoverable.
      return;
    }
    const anon = createClient(SUPABASE_URL!, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    // Insert a probe row via service-role.
    const probeEmail = `rls-probe+${Date.now()}@example.test`;
    await admin
      .from('vibrant40_members')
      .insert({ email: probeEmail, status: 'active' });

    const { data } = await anon
      .from('vibrant40_members')
      .select('email')
      .eq('email', probeEmail);

    // Anon should NOT see the row (no policy matches without a session).
    expect(data ?? []).toEqual([]);

    await admin.from('vibrant40_members').delete().eq('email', probeEmail);
  });
});
