export const metadata = {
  title: 'Link expired | Nicole Hansult Coaching',
  robots: { index: false },
};

export default function AuthErrorPage() {
  return (
    <main className="min-h-[60vh] flex flex-col items-center justify-center px-4 py-16">
      <h1 className="text-2xl font-semibold text-ink mb-3">
        Link expired or invalid
      </h1>
      <p className="text-inkSoft mb-6 text-center max-w-sm">
        This verification link has expired or has already been used. Request a
        new one from the login page.
      </p>
      <a href="/login" className="text-orchidDeep underline">
        Back to login
      </a>
    </main>
  );
}
