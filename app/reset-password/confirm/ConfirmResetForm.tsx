'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { confirmResetAction } from './actions';

const schema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
});
type Fields = z.infer<typeof schema>;

export function ConfirmResetForm() {
  const [showPwd, setShowPwd] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [pwdValue, setPwdValue] = useState('');
  const hasEightChars = pwdValue.length >= 8;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Fields>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(data: Fields) {
    setServerError(null);
    const result = await confirmResetAction(data.password);
    if (!result.ok) setServerError(result.error);
    // On success, confirmResetAction redirects to /login
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      <div>
        <label
          htmlFor="password"
          className="mb-1 block text-sm font-medium text-[var(--color-text)]"
        >
          New password
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
            className="absolute inset-y-0 right-3 flex items-center text-[var(--color-textMuted)]"
          >
            {showPwd ? 'Hide' : 'Show'}
          </button>
        </div>
        <ul className="mt-2">
          <li
            className={`flex items-center gap-1 text-xs ${
              hasEightChars
                ? 'text-green-600'
                : 'text-[var(--color-textMuted)]'
            }`}
          >
            <span>{hasEightChars ? '✓' : '○'}</span> At least 8 characters
          </li>
        </ul>
        {errors.password && (
          <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>
        )}
      </div>
      {serverError && <p className="text-sm text-red-600">{serverError}</p>}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-lg bg-[var(--color-orchidDeep)] py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
      >
        {isSubmitting ? 'Updating…' : 'Set new password'}
      </button>
    </form>
  );
}
