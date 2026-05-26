import type { Metadata } from 'next';

import { RequestNewTokenForm } from './RequestNewTokenForm';

export const metadata: Metadata = {
  title: 'Link expired | Nicole Hansult Coaching',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default function SetPasswordExpiredPage() {
  return (
    <main className="min-h-[70vh] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm bg-[var(--color-bgAlt)] rounded-2xl shadow-md p-8">
        <h1 className="text-2xl font-semibold text-[var(--color-text)] mb-3 text-center">
          This link has expired
        </h1>
        <p className="text-sm text-[var(--color-textMuted)] text-center mb-6">
          Enter your email to get a fresh link — no support ticket needed.
        </p>
        <RequestNewTokenForm />
      </div>
    </main>
  );
}
