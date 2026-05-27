/**
 * Phase 5 Plan 05 Task 3 — `markComplete` Server Action (PAY-08).
 *
 * Writes a (user_id, day_slug, completed_at) row to lesson_progress and
 * revalidates the course home + the day page so the cached completed-state
 * map refreshes immediately.
 *
 * Idempotent — upsert on (user_id, day_slug) primary key. Clicking
 * "Mark as complete" twice is harmless.
 *
 * Auth: getClaims() — AUTH-08 (never the unverified cookie helper).
 */
'use server';

import { revalidatePath } from 'next/cache';

import { createClient } from '@/lib/supabase/server';

export type MarkCompleteResult =
  | { ok: true }
  | { ok: false; code: 'unauthorized' | 'db_error'; error: string };

export async function markComplete(slug: string): Promise<MarkCompleteResult> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims ?? null;

  if (!claims) {
    return { ok: false, code: 'unauthorized', error: 'Please log in.' };
  }

  const { error } = await supabase.from('lesson_progress').upsert(
    {
      user_id: claims.sub as string,
      day_slug: slug,
      completed_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,day_slug' },
  );

  if (error) {
    return { ok: false, code: 'db_error', error: error.message };
  }

  revalidatePath('/vibrant40');
  revalidatePath(`/vibrant40/days/${slug}`);

  return { ok: true };
}
