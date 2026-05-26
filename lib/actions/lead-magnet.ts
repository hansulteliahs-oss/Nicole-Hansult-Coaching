'use server';

import { headers } from 'next/headers';
import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';
import { leadMagnetSchema, type LeadMagnetInput } from '@/lib/schemas/lead-magnet';
import { checkRateLimit } from '@/lib/rate-limit';
import { LeadMagnetEmail } from '@/components/email/LeadMagnetEmail';

const resend = new Resend(process.env.RESEND_API_KEY);

export type LeadMagnetActionResult =
  | { success: true }
  | { success: false; error: string; errors?: Record<string, string[]> };

export async function leadMagnetAction(
  data: LeadMagnetInput,
): Promise<LeadMagnetActionResult> {
  // 1. Honeypot check
  if (data._hp) {
    return { success: false, error: 'spam' };
  }

  // 2. Rate limit by IP — max 3 per 60 seconds
  const headerStore = await headers();
  const forwardedFor = headerStore.get('x-forwarded-for') ?? '';
  const ip = forwardedFor.split(',')[0].trim() || '127.0.0.1';

  const allowed = checkRateLimit(ip, { maxTries: 3, windowMs: 60_000 });
  if (!allowed) {
    return { success: false, error: 'rate_limited' };
  }

  // 3. Server-side Zod validation
  const parsed = leadMagnetSchema.safeParse(data);
  if (!parsed.success) {
    return {
      success: false,
      error: 'validation_failed',
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  // 4. Get PDF URL
  const pdfUrl = process.env.BLOB_PDF_URL;
  if (!pdfUrl) {
    console.error('[lead-magnet] BLOB_PDF_URL is not set');
    return { success: false, error: 'config_error' };
  }

  // 5. Send email via Resend
  const fromEmail =
    process.env.RESEND_FROM_EMAIL ?? 'Nicole Hansult <hello@nicolehansultcoaching.com>';

  const { error: emailError } = await resend.emails.send({
    from: fromEmail,
    to: [parsed.data.email],
    subject: 'Your free guide: How to Look and Feel Good Naked Over 40',
    react: LeadMagnetEmail({ firstName: parsed.data.firstName, pdfUrl }),
  });

  if (emailError) {
    console.error('[lead-magnet] Resend error:', emailError);
    return { success: false, error: 'email_failed' };
  }

  // 6. Supabase backup row — log but don't block on error
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SECRET_KEY;

  if (supabaseUrl && supabaseKey) {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { error: dbError } = await supabase.from('submissions').insert({
      form_type: 'lead_magnet',
      email: parsed.data.email,
      data: parsed.data,
    });
    if (dbError) {
      console.error('[lead-magnet] Supabase insert error:', dbError);
    }
  } else {
    console.warn('[lead-magnet] Supabase env vars not set — skipping DB backup');
  }

  return { success: true };
}
