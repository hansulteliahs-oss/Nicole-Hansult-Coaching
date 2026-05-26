'use client';

import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { contactSchema } from '@/lib/schemas/contact';
import type { ContactInput } from '@/lib/schemas/contact';
import { contactAction } from '@/lib/actions/contact';
import { offers } from '@/lib/content/offers';

export function ContactForm() {
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ContactInput>({
    resolver: zodResolver(contactSchema),
    defaultValues: { _hp: '' },
  });

  const onSubmit = (data: ContactInput) => {
    setServerError(null);
    startTransition(async () => {
      const result = await contactAction(data);
      if (result.success) {
        setSubmitted(true);
      } else if ('error' in result && result.error === 'rate_limited') {
        setServerError('Too many submissions. Please wait a minute and try again.');
      } else {
        setServerError(
          'Something went wrong. Please try again or email nicole@nicolehansultcoaching.com directly.',
        );
      }
    });
  };

  // Success state — replaces the form entirely
  if (submitted) {
    return (
      <div className="rounded-2xl bg-cardSoft px-8 py-12 text-center">
        <p className="text-ink text-lg font-medium">
          Thanks! Nicole will be in touch within 1&ndash;2 business days.
        </p>
      </div>
    );
  }

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

      {/* First Name + Last Name — side by side on md+ */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="firstName" className={labelClass}>
            First Name
          </label>
          <input
            id="firstName"
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
          <label htmlFor="lastName" className={labelClass}>
            Last Name
          </label>
          <input
            id="lastName"
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
        <label htmlFor="email" className={labelClass}>
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="jane@example.com"
          className={fieldClass}
          {...register('email')}
        />
        {errors.email && (
          <p className={errorClass}>{errors.email.message}</p>
        )}
      </div>

      {/* Phone (optional) */}
      <div>
        <label htmlFor="phone" className={labelClass}>
          Phone <span className="font-normal text-grayDeep">(optional)</span>
        </label>
        <input
          id="phone"
          type="tel"
          autoComplete="tel"
          placeholder="+1 (760) 555-0100"
          className={fieldClass}
          {...register('phone')}
        />
        {errors.phone && (
          <p className={errorClass}>{errors.phone.message}</p>
        )}
      </div>

      {/* Service dropdown (optional) */}
      <div>
        <label htmlFor="service" className={labelClass}>
          Service <span className="font-normal text-grayDeep">(optional)</span>
        </label>
        <select
          id="service"
          className={`${fieldClass} cursor-pointer`}
          {...register('service')}
        >
          <option value="">Which service interests you?</option>
          {offers.map((o) => (
            <option key={o.id} value={o.name}>
              {o.name}
            </option>
          ))}
        </select>
        {errors.service && (
          <p className={errorClass}>{errors.service.message}</p>
        )}
      </div>

      {/* Message */}
      <div>
        <label htmlFor="message" className={labelClass}>
          Message
        </label>
        <textarea
          id="message"
          rows={5}
          placeholder="Tell Nicole a bit about what you're looking for..."
          className={`${fieldClass} resize-none`}
          {...register('message')}
        />
        {errors.message && (
          <p className={errorClass}>{errors.message.message}</p>
        )}
      </div>

      {/* Server-level error (email_failed or unexpected) */}
      {serverError && (
        <p className="text-sm text-red-600">{serverError}</p>
      )}

      {/* Submit button */}
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
            Sending...
          </>
        ) : (
          'Send Message'
        )}
      </button>
    </form>
  );
}
