'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { setPasswordAction } from './actions';

const schema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
});
type Fields = z.infer<typeof schema>;

interface Props {
  token: string;
}

export function SetPasswordForm({ token }: Props) {
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
    const result = await setPasswordAction(token, data.password);
    if (!result.ok) {
      if (
        result.code === 'expired' ||
        result.code === 'used' ||
        result.code === 'not_found'
      ) {
        window.location.href = '/set-password/expired';
        return;
      }
      setServerError(result.error);
    }
    // On success the Server Action redirects to /account?welcome=migration.
  }

  const passwordRegister = register('password', {
    onChange: (e) => setPwdValue(e.target.value),
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      <div>
        <label
          htmlFor="password"
          className="block text-sm font-medium text-[var(--color-text)] mb-1"
        >
          Create a password
        </label>
        <div className="relative">
          <input
            id="password"
            type={showPwd ? 'text' : 'password'}
            autoComplete="new-password"
            {...passwordRegister}
            className="w-full border border-[var(--color-border)] rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-orchidDeep)]"
          />
          <button
            type="button"
            onClick={() => setShowPwd((v) => !v)}
            aria-label={showPwd ? 'Hide password' : 'Show password'}
            className="absolute inset-y-0 right-3 flex items-center text-[var(--color-textMuted)] text-sm"
          >
            {showPwd ? 'Hide' : 'Show'}
          </button>
        </div>
        <ul className="mt-2">
          <li
            className={`text-xs flex items-center gap-1 ${
              hasEightChars ? 'text-green-600' : 'text-[var(--color-textMuted)]'
            }`}
          >
            <span>{hasEightChars ? '✓' : '○'}</span> At least 8 characters
          </li>
        </ul>
        {errors.password && (
          <p className="text-red-600 text-xs mt-1">{errors.password.message}</p>
        )}
      </div>
      {serverError && <p className="text-red-600 text-sm">{serverError}</p>}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-[var(--color-orchidDeep)] text-white rounded-lg py-2.5 text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition"
      >
        {isSubmitting ? 'Setting password…' : 'Set password and sign in'}
      </button>
    </form>
  );
}
