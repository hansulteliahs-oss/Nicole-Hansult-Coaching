import type { Metadata } from 'next';
import { ConfirmResetForm } from './ConfirmResetForm';

export const metadata: Metadata = {
  title: 'Set new password | Nicole Hansult Coaching',
  robots: { index: false },
};
export const dynamic = 'force-dynamic';

export default function ConfirmResetPage() {
  return (
    <main className="flex min-h-[70vh] items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm rounded-2xl bg-[var(--color-bgAlt)] p-8 shadow-md">
        <h1 className="mb-6 text-center text-2xl font-semibold text-[var(--color-text)]">
          Set a new password
        </h1>
        <ConfirmResetForm />
      </div>
    </main>
  );
}
