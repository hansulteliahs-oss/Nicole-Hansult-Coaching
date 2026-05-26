import { Suspense } from 'react';

import { LoginForm } from './LoginForm';
import { ResetSuccessBanner } from './ResetSuccessBanner';

export const metadata = {
  title: 'Log in | Nicole Hansult Coaching',
  robots: { index: false },
};

// useSearchParams() inside LoginForm requires this page to be dynamic.
export const dynamic = 'force-dynamic';

export default function LoginPage() {
  return (
    <main className="min-h-[70vh] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm bg-bgAlt rounded-2xl shadow-md p-8">
        <h1 className="text-2xl font-semibold text-ink mb-6 text-center">
          Welcome back
        </h1>
        <Suspense>
          <ResetSuccessBanner />
        </Suspense>
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
