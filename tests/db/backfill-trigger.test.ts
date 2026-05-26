/**
 * Phase 5 Plan 01 Task 1 — PAY-05 backfill trigger.
 *
 * Verifies that inserting an auth.users row with an email matching an existing
 * vibrant40_members row (user_id = null) backfills user_id automatically.
 * Case-insensitive on email match.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { config as loadEnv } from 'dotenv';
import path from 'node:path';

loadEnv({ path: path.resolve(__dirname, '../../.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SECRET = process.env.SUPABASE_SECRET_KEY;
const RUN = Boolean(SUPABASE_URL && SUPABASE_SECRET);
const describeIf = RUN ? describe : describe.skip;

describeIf('backfill_vibrant40_user_id_after_signup trigger (PAY-05)', () => {
  let admin: SupabaseClient;
  const createdUserIds: string[] = [];
  const seededEmails: string[] = [];

  beforeAll(() => {
    admin = createClient(SUPABASE_URL!, SUPABASE_SECRET!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  });

  afterAll(async () => {
    for (const id of createdUserIds) {
      await admin.auth.admin.deleteUser(id).catch(() => {});
    }
    for (const email of seededEmails) {
      await admin.from('vibrant40_members').delete().eq('email', email);
    }
  });

  it('populates vibrant40_members.user_id when matching auth.users row inserted', async () => {
    const email = `trigger-probe+${Date.now()}@example.test`;
    seededEmails.push(email);

    // 1. Seed a member row with user_id=null (simulates Stripe webhook write).
    const { error: seedErr } = await admin
      .from('vibrant40_members')
      .insert({ email, status: 'active', user_id: null });
    expect(seedErr).toBeNull();

    // 2. Create matching auth.users row via admin API.
    const { data: userResp, error: userErr } = await admin.auth.admin.createUser({
      email,
      password: 'test-password-1234',
      email_confirm: true,
    });
    expect(userErr).toBeNull();
    const userId = userResp?.user?.id;
    expect(userId).toBeTruthy();
    if (userId) createdUserIds.push(userId);

    // 3. Trigger should have backfilled user_id.
    const { data: member } = await admin
      .from('vibrant40_members')
      .select('user_id')
      .eq('email', email)
      .single();
    expect(member?.user_id).toBe(userId);
  });

  it('matches case-insensitively on email', async () => {
    const lowerEmail = `case-probe+${Date.now()}@example.test`;
    const upperEmail = lowerEmail.toUpperCase();
    seededEmails.push(lowerEmail);

    // Seed member with the lower-case email
    await admin
      .from('vibrant40_members')
      .insert({ email: lowerEmail, status: 'active', user_id: null });

    // Auth user with mixed case
    const { data: userResp } = await admin.auth.admin.createUser({
      email: upperEmail,
      password: 'test-password-1234',
      email_confirm: true,
    });
    const userId = userResp?.user?.id;
    if (userId) createdUserIds.push(userId);

    const { data: member } = await admin
      .from('vibrant40_members')
      .select('user_id')
      .eq('email', lowerEmail)
      .single();
    expect(member?.user_id).toBe(userId);
  });
});
