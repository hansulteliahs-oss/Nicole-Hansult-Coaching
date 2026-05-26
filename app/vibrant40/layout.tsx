/**
 * Phase 5 Plan 05 Task 1 — Gated /vibrant40/* segment layout.
 *
 * Renders the same chrome as the Phase 4 /account surface (Nav + Footer) so
 * members get a consistent logged-in shell across /account and /vibrant40/*.
 *
 * The medical DisclaimerBand is already rendered by the root layout
 * (app/layout.tsx) on every page in the app — re-rendering it here would
 * double it. The layout still satisfies PITFALL 9 because DisclaimerBand
 * cascades from the root.
 *
 * PITFALL 6 — declares `force-dynamic` at the segment level so /vibrant40,
 * /vibrant40/welcome, and /vibrant40/days/[slug] all read cookies/session
 * per request (Phase 4 + 5 auth pattern).
 */
import { Nav } from '@/components/layout/Nav';
import { Footer } from '@/components/layout/Footer';

export const dynamic = 'force-dynamic';

export const metadata = {
  robots: { index: false },
};

export default function Vibrant40Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Nav />
      <main className="pt-24 pb-16">{children}</main>
      <Footer />
    </>
  );
}
