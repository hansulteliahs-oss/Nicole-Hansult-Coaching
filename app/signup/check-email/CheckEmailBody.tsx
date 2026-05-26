'use client';

import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { resendVerificationAction } from '../actions';

export function CheckEmailBody() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email') ?? 'your inbox';
  const [resendState, setResendState] = useState<'idle' | 'sent' | 'error'>(
    'idle',
  );

  async function handleResend() {
    const result = await resendVerificationAction(email);
    setResendState(result.ok ? 'sent' : 'error');
  }

  return (
    <>
      <p className="mb-6 text-[var(--color-textMuted)]">
        Click the link we sent to{' '}
        <strong className="text-[var(--color-text)]">{email}</strong> to finish
        creating your account.
      </p>
      {resendState === 'sent' ? (
        <p className="text-sm text-green-700">
          Verification email resent — check your inbox.
        </p>
      ) : resendState === 'error' ? (
        <p className="text-sm text-red-600">
          Could not resend. Please wait a moment and try again.
        </p>
      ) : (
        <button
          onClick={handleResend}
          className="text-sm text-[var(--color-orchidDeep)] underline hover:opacity-80"
        >
          Resend verification email
        </button>
      )}
      <p className="mt-6 text-xs text-[var(--color-textMuted)]">
        <a href="/login" className="underline">
          Back to login
        </a>
      </p>
    </>
  );
}
