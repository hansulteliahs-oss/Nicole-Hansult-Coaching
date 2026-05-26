import type { Metadata } from 'next';
import { SignupForm } from './SignupForm';

export const metadata: Metadata = {
  title: 'Create account | Nicole Hansult Coaching',
  robots: { index: false },
};
export const dynamic = 'force-dynamic';

export default function SignupPage() {
  return (
    <main className="flex min-h-[70vh] items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm rounded-2xl bg-[var(--color-bgAlt)] p-8 shadow-md">
        <h1 className="mb-6 text-center text-2xl font-semibold text-[var(--color-text)]">
          Create your account
        </h1>
        <SignupForm />
      </div>
    </main>
  );
}
