import Link from 'next/link';
import { Suspense } from 'react';

import { Nav } from '@/components/layout/Nav';
import { Footer } from '@/components/layout/Footer';
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
    <>
      <Nav />
      <main className="bg-bg px-4 pt-32 md:pt-40 pb-24">
        <div className="w-full max-w-sm mx-auto">
          <Link
            href="/"
            className="inline-block text-sm text-inkSoft hover:text-ink mb-6"
          >
            ← Back to home
          </Link>
          <div className="bg-bgAlt rounded-2xl shadow-md p-8">
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
        </div>
      </main>
      <Footer />
    </>
  );
}
