import type { Metadata } from 'next';

import { SetPasswordForm } from './SetPasswordForm';

export const metadata: Metadata = {
  title: 'Set your password | Nicole Hansult Coaching',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

interface Props {
  searchParams: Promise<{ token?: string }>;
}

export default async function SetPasswordPage({ searchParams }: Props) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <main className="min-h-[70vh] flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-sm bg-[var(--color-bgAlt)] rounded-2xl shadow-md p-8 text-center">
          <h1 className="text-2xl font-semibold text-[var(--color-text)] mb-3">
            Invalid link
          </h1>
          <p className="text-[var(--color-textMuted)] mb-6">
            This link is missing a token. Please use the link from your email.
          </p>
          <a
            href="/set-password/expired"
            className="text-[var(--color-orchidDeep)] underline text-sm"
          >
            Request a new link
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[70vh] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm bg-[var(--color-bgAlt)] rounded-2xl shadow-md p-8">
        {/* Warm orchid header strip */}
        <div className="bg-[var(--color-orchidDeep)] -mx-8 -mt-8 mb-6 px-8 py-4 rounded-t-2xl text-center">
          <span className="text-white text-sm font-medium">
            Nicole Hansult Coaching
          </span>
        </div>
        <h1 className="text-2xl font-semibold text-[var(--color-text)] mb-2 text-center">
          Welcome to your new home
        </h1>
        <p className="text-sm text-[var(--color-textMuted)] text-center mb-6">
          Set a password to access your Vibrant40 content on the new site.
        </p>
        <SetPasswordForm token={token} />
      </div>
    </main>
  );
}
