'use server';

import { headers } from 'next/headers';

import { ideaSchema, type IdeaInput } from '@/lib/schemas/idea';
import { checkRateLimit } from '@/lib/rate-limit';
import { getAdminClient } from '@/lib/supabase/admin';

export type BankIdeaResult =
  | { success: true }
  | { success: false; error: 'bad_key' | 'rate_limited' | 'spam' | 'invalid' | 'server' };

// Only accept image URLs we minted ourselves via the Blob upload route.
const BLOB_HOST = /\.public\.blob\.vercel-storage\.com$/;

/**
 * Entry 1 — bank an idea into Supabase `content_ideas` (status='available').
 *
 * Called by the /idea form. Order of guards: honeypot (silent) -> IP rate-limit
 * -> passcode (so guesses get throttled) -> Zod validation -> insert. No email,
 * no LLM — the tag comes structured from the form. The scheduled Pick Idea node
 * reads whatever this writes.
 */
export async function bankIdeaAction(data: IdeaInput): Promise<BankIdeaResult> {
  // 1. Honeypot — bots fill hidden fields; humans don't. Silent drop.
  if (data._hp && data._hp.length > 0) {
    return { success: false, error: 'spam' };
  }

  // 2. Rate limit by IP — spam backstop, namespaced to avoid colliding with the
  //    site's other form windows.
  const headersList = await headers();
  const forwarded = headersList.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : '127.0.0.1';
  if (!checkRateLimit(`idea:${ip}`, { maxTries: 10, windowMs: 60_000 })) {
    return { success: false, error: 'rate_limited' };
  }

  // 3. Passcode gate — mom-grade privacy so only Nicole can write to the bank.
  if (data.key !== process.env.IDEA_BANK_KEY) {
    return { success: false, error: 'bad_key' };
  }

  // 4. Validate the payload.
  const parsed = ideaSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: 'invalid' };
  }
  const { topic, notes, tag, imageUrls } = parsed.data;

  // 5. Defence in depth — keep only our own Vercel Blob URLs (the upload route
  //    already gates who can mint them).
  const image_urls = imageUrls.filter((u) => {
    try {
      return BLOB_HOST.test(new URL(u).host);
    } catch {
      return false;
    }
  });

  // 6. Bank it.
  const { error } = await getAdminClient()
    .from('content_ideas')
    .insert({
      topic,
      raw_notes: notes.length > 0 ? notes : null,
      tag,
      image_urls,
      status: 'available',
    });

  if (error) {
    console.error('[bankIdeaAction] insert error:', error);
    return { success: false, error: 'server' };
  }

  return { success: true };
}
