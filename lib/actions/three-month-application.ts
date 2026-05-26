'use server';

import { headers } from 'next/headers';
import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';

import {
  threeMonthApplicationSchema,
  type ThreeMonthApplicationInput,
} from '@/lib/schemas/three-month-application';
import { checkRateLimit } from '@/lib/rate-limit';
import { ContactNotification } from '@/components/email/ContactNotification';

// Initialised once at module level — avoids re-instantiation on every call.
const resend = new Resend(process.env.RESEND_API_KEY);

export type ApplicationActionResult =
  | { success: true }
  | { success: false; error: string }
  | { success: false; errors: { fieldErrors: Record<string, string[] | undefined>; formErrors: string[] } };

/**
 * FORM-03 — 3-Month Program application.
 *
 * Reuses Phase 3 infra verbatim with two twists:
 *   1. Subject prefix "New 3-Month Program application" — keeps Nicole's inbox sortable.
 *   2. Discriminator `kind: 'three-month-application'` on the submissions row
 *      (column added by `002_paywall.sql`).
 *
 * The 3-Month tier ($5,500) is application-gated, NOT Stripe checkout. This
 * module deliberately imports no Stripe modules.
 */
export async function applicationAction(
  data: ThreeMonthApplicationInput,
): Promise<ApplicationActionResult> {
  // 1. Honeypot check — bots fill hidden fields; humans don't.
  // Returns failure (matches Phase 3 contactAction shape) but never sends email
  // or writes to DB. The client treats this as a silent drop (no error UI).
  if (data._hp && data._hp.length > 0) {
    return { success: false, error: 'spam' };
  }

  // 2. Rate limit by IP — 5 submissions per 60s. Namespaced key prevents
  //    collisions with /contact or /look-and-feel-good-naked rate windows.
  const headersList = await headers();
  const forwarded = headersList.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : '127.0.0.1';

  const allowed = checkRateLimit(`three-month-app:${ip}`, {
    maxTries: 5,
    windowMs: 60_000,
  });
  if (!allowed) {
    return { success: false, error: 'rate_limited' };
  }

  // 3. Server-side Zod validation
  const parsed = threeMonthApplicationSchema.safeParse(data);
  if (!parsed.success) {
    return {
      success: false,
      errors: parsed.error.flatten() as {
        fieldErrors: Record<string, string[] | undefined>;
        formErrors: string[];
      },
    };
  }

  // 4. Send email via Resend — reply-to set to applicant's email so Nicole
  //    can reply directly from Gmail.
  //
  //    ContactNotification is reused verbatim — its semi-generic copy ("New
  //    Contact Form Submission") still fits an application heading, and the
  //    subject line carries the discriminator ("New 3-Month Program
  //    application from {name}") for inbox triage. Extending the template
  //    with a `kind` prop is deferred: the subject does the sorting work and
  //    avoids modifying a Phase 3 component currently in production warm-up.
  const { firstName, lastName, email, phone, goals } = parsed.data;

  const { error: emailError } = await resend.emails.send({
    from:
      process.env.RESEND_FROM_EMAIL ??
      'Nicole Hansult Coaching <notifications@mail.nicolehansultcoaching.com>',
    to: ['nicole@nicolehansultcoaching.com'],
    replyTo: email,
    subject: `New 3-Month Program application from ${firstName} ${lastName}`,
    react: ContactNotification({
      firstName,
      lastName,
      email,
      phone,
      service: '3-Month Coaching Program',
      message: goals,
      _hp: '',
    }),
  });

  if (emailError) {
    console.error('[applicationAction] Resend error:', emailError);
    return { success: false, error: 'email_failed' };
  }

  // 5. Supabase backup row — service role key bypasses RLS.
  //    Non-blocking: email delivered = primary goal. Schema columns are
  //    form_type/email/data/kind (from 001_submissions.sql + 002_paywall.sql).
  //    Structured fields live inside `data` jsonb; `kind` discriminates.
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SECRET_KEY;

    if (supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey);
      const { error: dbError } = await supabase.from('submissions').insert({
        form_type: 'contact', // closest existing form_type CHECK value
        kind: 'three-month-application', // discriminator added by 002_paywall.sql
        email,
        data: { firstName, lastName, email, phone, goals },
      });
      if (dbError) {
        console.error('[applicationAction] Supabase insert error:', dbError);
      }
    } else {
      console.warn('[applicationAction] Supabase env vars not set — skipping DB backup');
    }
  } catch (err) {
    console.error('[applicationAction] Supabase unexpected error:', err);
  }

  return { success: true };
}
