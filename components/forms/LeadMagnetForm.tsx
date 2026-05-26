'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { leadMagnetSchema, type LeadMagnetInput } from '@/lib/schemas/lead-magnet';
import { leadMagnetAction } from '@/lib/actions/lead-magnet';

export function LeadMagnetForm() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LeadMagnetInput>({
    resolver: zodResolver(leadMagnetSchema),
    defaultValues: { _hp: '' },
  });

  function onSubmit(data: LeadMagnetInput) {
    setServerError(null);
    startTransition(async () => {
      const result = await leadMagnetAction(data);
      if (result.success) {
        router.push('/look-and-feel-good-naked/thank-you');
      } else if (result.error === 'rate_limited') {
        setServerError('Too many submissions. Please wait a minute and try again.');
      } else {
        setServerError('Something went wrong. Please try again.');
      }
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      {/* Honeypot — hidden from real users, catches bots */}
      <div aria-hidden="true" style={{ display: 'none' }}>
        <label htmlFor="lm-hp">Leave this blank</label>
        <input id="lm-hp" type="text" tabIndex={-1} autoComplete="off" {...register('_hp')} />
      </div>

      {/* First Name + Last Name */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="lm-firstName" className="block text-sm font-medium text-ink mb-1">
            First Name
          </label>
          <input
            id="lm-firstName"
            type="text"
            placeholder="First Name"
            autoComplete="given-name"
            aria-invalid={!!errors.firstName}
            aria-describedby={errors.firstName ? 'lm-firstName-error' : undefined}
            className="w-full bg-card border border-inkFaint rounded-xl px-4 py-3 text-ink placeholder-inkSoft focus:outline-none focus:ring-2 focus:ring-orchid"
            {...register('firstName')}
          />
          {errors.firstName && (
            <p id="lm-firstName-error" role="alert" className="mt-1 text-xs text-red-600">
              {errors.firstName.message}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="lm-lastName" className="block text-sm font-medium text-ink mb-1">
            Last Name
          </label>
          <input
            id="lm-lastName"
            type="text"
            placeholder="Last Name"
            autoComplete="family-name"
            aria-invalid={!!errors.lastName}
            aria-describedby={errors.lastName ? 'lm-lastName-error' : undefined}
            className="w-full bg-card border border-inkFaint rounded-xl px-4 py-3 text-ink placeholder-inkSoft focus:outline-none focus:ring-2 focus:ring-orchid"
            {...register('lastName')}
          />
          {errors.lastName && (
            <p id="lm-lastName-error" role="alert" className="mt-1 text-xs text-red-600">
              {errors.lastName.message}
            </p>
          )}
        </div>
      </div>

      {/* Email */}
      <div>
        <label htmlFor="lm-email" className="block text-sm font-medium text-ink mb-1">
          Email Address
        </label>
        <input
          id="lm-email"
          type="email"
          placeholder="Email Address"
          autoComplete="email"
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? 'lm-email-error' : undefined}
          className="w-full bg-card border border-inkFaint rounded-xl px-4 py-3 text-ink placeholder-inkSoft focus:outline-none focus:ring-2 focus:ring-orchid"
          {...register('email')}
        />
        {errors.email && (
          <p id="lm-email-error" role="alert" className="mt-1 text-xs text-red-600">
            {errors.email.message}
          </p>
        )}
      </div>

      {/* Server error message */}
      {serverError && (
        <p role="alert" className="text-sm text-red-600">
          {serverError}
        </p>
      )}

      {/* Submit button */}
      <button
        type="submit"
        disabled={isPending}
        className="w-full inline-flex items-center justify-center rounded-pill bg-orchid text-white font-semibold px-6 py-4 text-[15px] tracking-[0.01em] transition-colors duration-180 hover:bg-orchidDeep disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {isPending ? (
          <>
            {/* Spinner */}
            <svg
              className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            Sending&hellip;
          </>
        ) : (
          'Get Your Free Guide'
        )}
      </button>

      <p className="text-xs text-inkSoft text-center">
        Download link will be sent to your inbox.
      </p>
    </form>
  );
}
