'use client';

import { useSearchParams } from 'next/navigation';

/**
 * Shown on /login when ?reset=success is present.
 * Wrap in <Suspense> in app/login/page.tsx — useSearchParams requires it.
 */
export function ResetSuccessBanner() {
  const params = useSearchParams();
  if (params.get('reset') !== 'success') return null;
  return (
    <p className="mb-4 rounded-lg bg-green-50 px-3 py-2 text-center text-sm text-green-700">
      Password updated. Log in with your new password.
    </p>
  );
}
