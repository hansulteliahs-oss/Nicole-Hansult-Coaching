'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { requestResetAction } from './actions';

const schema = z.object({
  email: z.string().email('Enter a valid email address'),
});
type Fields = z.infer<typeof schema>;

export function RequestResetForm() {
  const [submitted, setSubmitted] = useState(false);
  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<Fields>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(data: Fields) {
    await requestResetAction(data.email);
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="space-y-3 text-center">
        <p className="text-[var(--color-text)]">
          If an account exists for{' '}
          <strong>{getValues('email')}</strong>, you'll receive a reset link
          shortly.
        </p>
        <a
          href="/login"
          className="text-xs text-[var(--color-orchidDeep)] underline"
        >
          Back to login
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      <div>
        <label
          htmlFor="email"
          className="mb-1 block text-sm font-medium text-[var(--color-text)]"
        >
          Email address
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          {...register('email')}
          className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--color-orchidDeep)] focus:outline-none"
        />
        {errors.email && (
          <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>
        )}
      </div>
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-lg bg-[var(--color-orchidDeep)] py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
      >
        {isSubmitting ? 'Sending…' : 'Send reset link'}
      </button>
      <p className="text-center text-xs text-[var(--color-textMuted)]">
        <a href="/login" className="underline">
          Back to login
        </a>
      </p>
    </form>
  );
}
