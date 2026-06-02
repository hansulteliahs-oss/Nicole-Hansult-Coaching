'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import {
  threeMonthApplicationSchema,
  CONSISTENCY_BLOCKERS,
  COMMITMENT_LEVELS,
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

  type OpenQuestion = {
    name:
      | 'struggle'
      | 'desiredFeeling'
      | 'coachingHistory'
      | 'mobilityLimits'
      | 'additionalInfo';
    label: string;
    placeholder?: string;
    required?: boolean;
  };

  // Open-ended intake questions shown before the consistency radio.
  const questionsBefore: OpenQuestion[] = [
    {
      name: 'struggle',
      label:
        'What is the #1 struggle you are dealing with right now (physically, mentally, or emotionally) that led you to apply?',
      placeholder:
        "Tell Nicole what's bringing you here right now — the thing you most want to change.",
      required: true,
    },
    {
      name: 'desiredFeeling',
      label:
        'What would you love to feel or experience differently in your body in the next 30–90 days?',
    },
    {
      name: 'coachingHistory',
      label:
        "Have you previously worked with a fitness professional, physical therapist, life or health coach before? What worked well and what didn't?",
    },
    {
      name: 'mobilityLimits',
      label:
        'When it comes to movement or mobility, what currently feels limited or challenging for you?',
    },
  ];

  // Open-ended intake questions shown after the commitment dropdown.
  const questionsAfter: OpenQuestion[] = [
    {
      name: 'additionalInfo',
      label:
        'Is there anything else Nicole should know about your health history, injuries, lifestyle, or goals before you begin?',
    },
  ];

  const renderQuestion = (q: OpenQuestion) => (
    <div key={q.name}>
      <label htmlFor={`apply-${q.name}`} className={labelClass}>
        {q.label}
        {q.required && <span className="text-orchidMid"> *</span>}
      </label>
      <textarea
        id={`apply-${q.name}`}
        rows={4}
        placeholder={q.placeholder}
        className={`${fieldClass} resize-none`}
        {...register(q.name)}
      />
      {errors[q.name] && <p className={errorClass}>{errors[q.name]?.message}</p>}
    </div>
  );

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

      {/* Intake questions — open-ended (part 1) */}
      {questionsBefore.map(renderQuestion)}

      {/* Consistency blocker — required radio */}
      <fieldset>
        <legend className={labelClass}>
          What tends to get in the way of staying consistent with your health or
          wellness routine?
          <span className="text-orchidMid"> *</span>
        </legend>
        <div className="mt-2 space-y-2">
          {CONSISTENCY_BLOCKERS.map((option) => (
            <label
              key={option}
              className="flex items-center gap-3 text-sm text-ink"
            >
              <input
                type="radio"
                value={option}
                className="h-4 w-4 border-inkFaint text-orchidMid focus:ring-orchidMid"
                {...register('consistencyBlocker')}
              />
              {option}
            </label>
          ))}
        </div>
        {errors.consistencyBlocker && (
          <p className={errorClass}>{errors.consistencyBlocker.message}</p>
        )}
      </fieldset>

      {/* Commitment — required dropdown */}
      <div>
        <label htmlFor="apply-commitment" className={labelClass}>
          How committed are you to investing in your health and long-term results
          right now?
          <span className="text-orchidMid"> *</span>
        </label>
        <select
          id="apply-commitment"
          defaultValue=""
          className={fieldClass}
          {...register('commitment')}
        >
          <option value="" disabled>
            Select one…
          </option>
          {COMMITMENT_LEVELS.map((level) => (
            <option key={level} value={level}>
              {level}
            </option>
          ))}
        </select>
        {errors.commitment && (
          <p className={errorClass}>{errors.commitment.message}</p>
        )}
      </div>

      {/* Intake questions — open-ended (part 2) */}
      {questionsAfter.map(renderQuestion)}

      {serverError && <p className="text-sm text-red-600">{serverError}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="flex w-full items-center justify-center gap-2 rounded-full bg-orchid px-8 py-3 text-base font-medium text-white transition hover:bg-orchidDeep disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? (
          <>
            <span
              className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
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
