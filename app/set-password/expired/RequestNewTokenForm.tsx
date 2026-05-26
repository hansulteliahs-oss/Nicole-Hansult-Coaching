'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { reissueTokenAction } from './actions';

const schema = z.object({
  email: z.string().email('Enter a valid email address'),
});
type Fields = z.infer<typeof schema>;

export function RequestNewTokenForm() {
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Fields>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(data: Fields) {
    setServerError(null);
    const result = await reissueTokenAction(data.email);
    if (!result.ok) {
      setServerError(result.error);
      return;
    }
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <p className="text-center text-[var(--color-text)]">
        If your email is registered, a new link is on its way. Check your inbox.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      <div>
        <label
          htmlFor="email"
          className="block text-sm font-medium text-[var(--color-text)] mb-1"
        >
          Your email address
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          {...register('email')}
          className="w-full border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-orchidDeep)]"
        />
        {errors.email && (
          <p className="text-red-600 text-xs mt-1">{errors.email.message}</p>
        )}
      </div>
      {serverError && <p className="text-red-600 text-sm">{serverError}</p>}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-[var(--color-orchidDeep)] text-white rounded-lg py-2.5 text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition"
      >
        {isSubmitting ? 'Sending…' : 'Send new link'}
      </button>
    </form>
  );
}
