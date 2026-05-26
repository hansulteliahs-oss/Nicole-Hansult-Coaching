import type { Metadata } from 'next';
import { Suspense } from 'react';
import { CheckEmailBody } from './CheckEmailBody';

export const metadata: Metadata = {
  title: 'Check your email | Nicole Hansult Coaching',
  robots: { index: false },
};

export default function CheckEmailPage() {
  return (
    <main className="flex min-h-[70vh] items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm rounded-2xl bg-[var(--color-bgAlt)] p-8 text-center shadow-md">
        <h1 className="mb-3 text-2xl font-semibold text-[var(--color-text)]">
          Check your inbox
        </h1>
        <Suspense
          fallback={<p className="text-[var(--color-textMuted)]">Loading…</p>}
        >
          <CheckEmailBody />
        </Suspense>
      </div>
    </main>
  );
}
