import { redirect } from 'next/navigation';

import { offers } from '@/lib/content/offers';
import { createClient } from '@/lib/supabase/server';

export const metadata = {
  title: 'My Account | Nicole Hansult Coaching',
  robots: { index: false },
};

// /account reads cookies/session — must never be statically generated.
// Pitfall 7 guard: also keeps welcome=* banner reads honest on each request.
export const dynamic = 'force-dynamic';

interface Props {
  searchParams: Promise<{ welcome?: string }>;
}

export default async function AccountPage({ searchParams }: Props) {
  const supabase = await createClient();
  // AUTH-08: identity comes from getClaims() — the signed JWT payload —
  // never from the unverified cookie helper. See Phase 4 plan 04-05.
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims ?? null;

  if (!claims) redirect('/login');

  const { welcome } = await searchParams;
  const vibrant40 = offers.find((o) => o.id === 'vibrant40')!;

  return (
    <main className="max-w-lg mx-auto px-4 py-16">
      {/* Welcome banners — read from URL searchParam (no cookie state for Phase 4) */}
      {welcome === 'migration' && (
        <div className="bg-orchidDeep text-white rounded-xl px-5 py-4 mb-6">
          <p className="font-semibold mb-1">
            Welcome back — your Vibrant40 access carried over.
          </p>
          <a
            href={vibrant40.ctaHref}
            className="text-white underline text-sm"
          >
            Explore your Vibrant40 content
          </a>
        </div>
      )}
      {welcome === 'new' && (
        <div className="bg-green-50 border border-green-200 text-green-800 rounded-xl px-5 py-4 mb-6">
          <p className="font-semibold">Welcome — your account is ready.</p>
        </div>
      )}

      <h1 className="text-3xl font-semibold text-ink mb-8">My account</h1>

      {/* Email */}
      <section className="bg-bgAlt rounded-xl p-6 mb-4">
        <p className="text-xs text-inkSoft uppercase tracking-wide mb-1">
          Email
        </p>
        <p className="text-ink font-medium">{claims.email as string}</p>
      </section>

      {/* Vibrant40 status — Phase 4 placeholder. Phase 5 replaces with real DB read. */}
      <section className="bg-bgAlt rounded-xl p-6 mb-8">
        <p className="text-xs text-inkSoft uppercase tracking-wide mb-1">
          Vibrant40 membership
        </p>
        <p className="text-ink mb-3">Not a Vibrant40 member yet.</p>
        <a
          href={vibrant40.ctaHref}
          className="inline-block bg-orchidDeep text-white rounded-lg px-4 py-2 text-sm font-semibold hover:opacity-90 transition"
        >
          {vibrant40.ctaLabel} — {vibrant40.priceLabel}
        </a>
      </section>

      {/* Logout */}
      <form action="/auth/signout" method="post">
        <button
          type="submit"
          className="text-sm text-inkSoft underline hover:text-ink"
        >
          Log out
        </button>
      </form>
    </main>
  );
}
