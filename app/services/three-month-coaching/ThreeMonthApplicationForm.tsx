'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import {
  threeMonthApplicationSchema,
  type ThreeMonthApplicationInput,
} from '@/lib/schemas/three-month-application';
import { applicationAction } from '@/lib/actions/three-month-application';

/**
 * FORM-03 — 3-Month Program application form.
 *
 * Mounted inline at the `#apply` anchor on /services/three-month-coaching.
 * Patterns mirror Phase 3 ContactForm.tsx (Mist tokens, honeypot via
 * absolute-position hidden input, RHF + zodResolver, useTransition for
 * pending UI). On success redirects to /services/three-month-coaching/
 * thank-you (no inline success state — the thank-you page does that work
 * and is non-indexed).
 */
export function ThreeMonthApplicationForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ThreeMonthApplicationInput>({
    resolver: zodResolver(threeMonthApplicationSchema),
    defaultValues: { _hp: '' },
  });

  const onSubmit = (data: ThreeMonthApplicationInput) => {
    setServerError(null);
    startTransition(async () => {
      const result = await applicationAction(data);
      if (result.success) {
        router.push('/services/three-month-coaching/thank-you');
        return;
      }
      if ('error' in result && result.error === 'rate_limited') {
        setServerError(
          "You're submitting too quickly. Please wait a minute and try again.",
        );
      } else if ('error' in result && result.error === 'spam') {
        // Honeypot trip — silent in UX terms; just clear the in-flight state.
        // No alarm to the bot.
        router.push('/services/three-month-coaching/thank-you');
      } else {
        setServerError(
          'Something went wrong sending your application. Please try again or email nicole@nicolehansultcoaching.com directly.',
        );
      }
    });
  };

  const fieldClass =
    'w-full rounded-xl border border-inkFaint bg-bg px-4 py-3 text-ink placeholder:text-grayDeep focus:outline-none focus:ring-2 focus:ring-orchidMid transition';
  const labelClass = 'block text-sm font-medium text-ink mb-1';
  const errorClass = 'mt-1 text-sm text-red-600';

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
      {/* Honeypot — invisible to humans, filled by bots */}
      <input
        {...register('_hp')}
        type="text"
        tabIndex={-1}
        aria-hidden="true"
        autoComplete="off"
        style={{
          position: 'absolute',
          width: '1px',
          height: '1px',
          opacity: 0,
          left: '-9999px',
        }}
      />

      {/* First / Last side by side on sm+ */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="apply-firstName" className={labelClass}>
            First name
          </label>
          <input
            id="apply-firstName"
            type="text"
            autoComplete="given-name"
            placeholder="Jane"
            className={fieldClass}
            {...register('firstName')}
          />
          {errors.firstName && (
            <p className={errorClass}>{errors.firstName.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="apply-lastName" className={labelClass}>
            Last name
          </label>
          <input
            id="apply-lastName"
            type="text"
            autoComplete="family-name"
            placeholder="Smith"
            className={fieldClass}
            {...register('lastName')}
          />
          {errors.lastName && (
            <p className={errorClass}>{errors.lastName.message}</p>
          )}
        </div>
      </div>

      {/* Email */}
      <div>
        <label htmlFor="apply-email" className={labelClass}>
          Email
        </label>
        <input
          id="apply-email"
          type="email"
          autoComplete="email"
          placeholder="jane@example.com"
          className={fieldClass}
          {...register('email')}
        />
        {errors.email && <p className={errorClass}>{errors.email.message}</p>}
      </div>

      {/* Phone */}
      <div>
        <label htmlFor="apply-phone" className={labelClass}>
          Phone
        </label>
        <input
          id="apply-phone"
          type="tel"
          autoComplete="tel"
          placeholder="+1 (760) 555-0100"
          className={fieldClass}
          {...register('phone')}
        />
        {errors.phone && <p className={errorClass}>{errors.phone.message}</p>}
      </div>

      {/* Goals textarea */}
      <div>
        <label htmlFor="apply-goals" className={labelClass}>
          What are your goals for the next twelve weeks?
        </label>
        <textarea
          id="apply-goals"
          rows={5}
          placeholder="Share what you'd like to work on — strength, body composition, energy, longevity habits, whatever feels true right now."
          className={`${fieldClass} resize-none`}
          {...register('goals')}
        />
        {errors.goals && <p className={errorClass}>{errors.goals.message}</p>}
      </div>

      {serverError && <p className="text-sm text-red-600">{serverError}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="flex w-full items-center justify-center gap-2 rounded-full bg-ink px-8 py-3 text-base font-medium text-bg transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? (
          <>
            <span
              className="h-4 w-4 animate-spin rounded-full border-2 border-bg border-t-transparent"
              aria-hidden="true"
            />
            Sending application...
          </>
        ) : (
          'Send application'
        )}
      </button>

      <p className="text-xs text-inkSoft leading-relaxed">
        Nicole reviews each application personally and replies within 48 hours.
        There is no automated checkout — this is a deliberate process.
      </p>
    </form>
  );
}
