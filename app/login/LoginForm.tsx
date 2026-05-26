'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { loginAction, resendVerificationAction } from './actions';

const schema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});
type Fields = z.infer<typeof schema>;

export function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get('next') ?? undefined;

  const [showPwd, setShowPwd] = useState(false);
  const [serverError, setServerError] = useState<{
    code: string;
    message: string;
  } | null>(null);
  const [resendState, setResendState] = useState<'idle' | 'sending' | 'sent' | 'error'>(
    'idle',
  );
  const [resendError, setResendError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<Fields>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(data: Fields) {
    setServerError(null);
    const result = await loginAction(data.email, data.password, next);
    if (!result.ok) {
      setServerError({ code: result.code, message: result.error });
    }
    // On success, loginAction() calls redirect() — the navigation happens
    // server-side before this code resumes.
  }

  async function handleResend() {
    const email = getValues('email');
    setResendState('sending');
    setResendError(null);
    const result = await resendVerificationAction(email);
    if (result.ok) {
      setResendState('sent');
    } else {
      setResendState('error');
      setResendError(result.error);
    }
  }

  const fieldClass =
    'w-full rounded-xl border border-inkFaint bg-bg px-4 py-3 text-ink placeholder:text-grayDeep focus:outline-none focus:ring-2 focus:ring-orchidDeep transition';
  const labelClass = 'block text-sm font-medium text-ink mb-1';
  const errorClass = 'mt-1 text-sm text-red-600';

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      {/* Email */}
      <div>
        <label htmlFor="email" className={labelClass}>
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          {...register('email')}
          className={fieldClass}
        />
        {errors.email && <p className={errorClass}>{errors.email.message}</p>}
      </div>

      {/* Password with show/hide toggle */}
      <div>
        <label htmlFor="password" className={labelClass}>
          Password
        </label>
        <div className="relative">
          <input
            id="password"
            type={showPwd ? 'text' : 'password'}
            autoComplete="current-password"
            {...register('password')}
            className={`${fieldClass} pr-12`}
          />
          <button
            type="button"
            onClick={() => setShowPwd((v) => !v)}
            aria-label={showPwd ? 'Hide password' : 'Show password'}
            className="absolute inset-y-0 right-3 flex items-center text-inkSoft hover:text-ink text-xs font-medium"
          >
            {showPwd ? 'Hide' : 'Show'}
          </button>
        </div>
        {errors.password && (
          <p className={errorClass}>{errors.password.message}</p>
        )}
      </div>

      {/* Server error block with conditional resend / forgot-password links */}
      {serverError && (
        <div
          role="alert"
          className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 space-y-2"
        >
          <p>{serverError.message}</p>

          {serverError.code === 'email_not_confirmed' ? (
            <div>
              {resendState === 'sent' && (
                <p className="text-green-700">
                  Verification email sent — check your inbox.
                </p>
              )}
              {resendState === 'error' && (
                <p className="text-red-600">
                  {resendError ?? 'Could not resend. Please try again.'}
                </p>
              )}
              {(resendState === 'idle' || resendState === 'sending') && (
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resendState === 'sending'}
                  className="underline text-orchidDeep hover:text-orchid disabled:opacity-50"
                >
                  {resendState === 'sending'
                    ? 'Sending…'
                    : 'Resend verification email'}
                </button>
              )}
            </div>
          ) : (
            <a
              href="/reset-password"
              className="underline text-orchidDeep block"
            >
              Forgot password?
            </a>
          )}
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-xl bg-orchidDeep text-white py-3 text-sm font-semibold hover:bg-orchid disabled:opacity-50 transition"
      >
        {isSubmitting ? 'Signing in…' : 'Sign in'}
      </button>

      {/* Always-visible forgot password */}
      <p className="text-center text-xs text-inkSoft">
        <a
          href="/reset-password"
          className="underline hover:text-ink"
        >
          Forgot password?
        </a>
      </p>

      {/* Switch to signup */}
      <p className="text-center text-xs text-inkSoft">
        No account?{' '}
        <a href="/signup" className="underline hover:text-ink">
          Sign up
        </a>
      </p>
    </form>
  );
}
