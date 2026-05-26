'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { signupAction } from './actions';

const schema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});
type Fields = z.infer<typeof schema>;

export function SignupForm() {
  const [showPwd, setShowPwd] = useState(false);
  const [serverError, setServerError] = useState<{
    code: string;
    message: string;
  } | null>(null);
  const [pwdValue, setPwdValue] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Fields>({
    resolver: zodResolver(schema),
  });

  const hasEightChars = pwdValue.length >= 8;

  async function onSubmit(data: Fields) {
    setServerError(null);
    const result = await signupAction(data.email, data.password);
    if (!result.ok) {
      setServerError({ code: result.code, message: result.error });
    }
    // On success, signupAction redirects — no client-side action needed
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      {/* Email */}
      <div>
        <label
          htmlFor="email"
          className="mb-1 block text-sm font-medium text-[var(--color-text)]"
        >
          Email
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

      {/* Password with show/hide toggle + strength checklist */}
      <div>
        <label
          htmlFor="password"
          className="mb-1 block text-sm font-medium text-[var(--color-text)]"
        >
          Password
        </label>
        <div className="relative">
          <input
            id="password"
            type={showPwd ? 'text' : 'password'}
            autoComplete="new-password"
            {...register('password', {
              onChange: (e) => setPwdValue(e.target.value),
            })}
            className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 pr-10 text-sm focus:ring-2 focus:ring-[var(--color-orchidDeep)] focus:outline-none"
          />
          <button
            type="button"
            onClick={() => setShowPwd((v) => !v)}
            aria-label={showPwd ? 'Hide password' : 'Show password'}
            className="absolute inset-y-0 right-3 flex items-center text-[var(--color-textMuted)] hover:text-[var(--color-text)]"
          >
            {showPwd ? 'Hide' : 'Show'}
          </button>
        </div>
        {/* Live password strength checklist */}
        <ul className="mt-2 space-y-1">
          <li
            className={`flex items-center gap-1 text-xs ${
              hasEightChars
                ? 'text-green-600'
                : 'text-[var(--color-textMuted)]'
            }`}
          >
            <span>{hasEightChars ? '✓' : '○'}</span>
            At least 8 characters
          </li>
        </ul>
        {errors.password && (
          <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>
        )}
      </div>

      {/* Server error */}
      {serverError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <p>{serverError.message}</p>
          {(serverError.code === 'user_already_exists' ||
            serverError.code === 'email_exists') && (
            <a
              href="/login"
              className="mt-1 block text-[var(--color-orchidDeep)] underline"
            >
              Log in instead
            </a>
          )}
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-lg bg-[var(--color-orchidDeep)] py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
      >
        {isSubmitting ? 'Creating account…' : 'Create account'}
      </button>

      {/* Switch to login */}
      <p className="text-center text-xs text-[var(--color-textMuted)]">
        Already have an account?{' '}
        <a href="/login" className="underline hover:text-[var(--color-text)]">
          Log in
        </a>
      </p>
    </form>
  );
}
