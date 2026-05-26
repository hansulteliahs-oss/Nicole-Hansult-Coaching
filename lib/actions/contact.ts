'use server';

import { headers } from 'next/headers';
import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';

import { contactSchema } from '@/lib/schemas/contact';
import type { ContactInput } from '@/lib/schemas/contact';
import { checkRateLimit } from '@/lib/rate-limit';
import { ContactNotification } from '@/components/email/ContactNotification';

// Initialised once at module level — avoids re-instantiation on every call.
const resend = new Resend(process.env.RESEND_API_KEY);

export type ContactActionResult =
  | { success: true }
  | { success: false; error: string }
  | { success: false; errors: { fieldErrors: Record<string, string[] | undefined>; formErrors: string[] } };

export async function contactAction(data: ContactInput): Promise<ContactActionResult> {
  // 1. Honeypot check — bots fill hidden fields; humans don't
  if (data._hp && data._hp.length > 0) {
    return { success: false, error: 'spam' };
  }

  // 2. Rate limit by IP — 5 submissions per 60 seconds
  const headersList = await headers();
  const forwarded = headersList.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : '127.0.0.1';

  const allowed = checkRateLimit(ip, { maxTries: 5, windowMs: 60_000 });
  if (!allowed) {
    return { success: false, error: 'rate_limited' };
  }

  // 3. Server-side Zod validation
  const parsed = contactSchema.safeParse(data);
  if (!parsed.success) {
    return {
      success: false,
      errors: parsed.error.flatten() as { fieldErrors: Record<string, string[] | undefined>; formErrors: string[] },
    };
  }

  // 4. Send email via Resend — reply-to set to visitor's email so Nicole can reply directly
  const { error: emailError } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL ?? 'Nicole Hansult Coaching <notifications@mail.nicolehansultcoaching.com>',
    to: ['nicole@nicolehansultcoaching.com'],
    replyTo: parsed.data.email,
    subject: `New contact from ${parsed.data.firstName} ${parsed.data.lastName}`,
    react: ContactNotification(parsed.data),
  });

  if (emailError) {
    console.error('[contactAction] Resend error:', emailError);
    return { success: false, error: 'email_failed' };
  }

  // 5. Supabase backup row — service role key bypasses RLS (Phase 3 — no auth yet)
  // Non-fatal: email delivered = primary goal; log Supabase errors but still return success
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SECRET_KEY!,
    );

    const { error: dbError } = await supabase
      .from('submissions')
      .insert({
        form_type: 'contact',
        email: parsed.data.email,
        data: parsed.data,
      });

    if (dbError) {
      console.error('[contactAction] Supabase insert error:', dbError);
    }
  } catch (err) {
    console.error('[contactAction] Supabase unexpected error:', err);
  }

  return { success: true };
}
