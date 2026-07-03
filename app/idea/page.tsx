import type { Metadata } from 'next';
import { IdeaForm } from './IdeaForm';

export const metadata: Metadata = {
  title: 'Idea Bank',
  robots: { index: false, follow: false },
};

/**
 * Entry 1 — Nicole's private idea-capture page.
 *
 * Unlisted + noindex; gated by a shared passcode inside <IdeaForm>. Kept minimal
 * so it feels app-like when saved to the home screen.
 */
export default function IdeaPage() {
  return (
    <main className="flex min-h-screen justify-center bg-bg px-5 py-12">
      <div className="w-full max-w-md">
        <h1 className="mb-1 text-2xl font-semibold text-ink">Idea Bank</h1>
        <p className="mb-6 text-sm text-grayDeep">
          Drop a topic whenever inspiration hits. Nothing publishes until you approve it later.
        </p>
        <IdeaForm />
      </div>
    </main>
  );
}
