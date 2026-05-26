import type { Metadata } from 'next';
import { Nav } from '@/components/layout/Nav';
import { Footer } from '@/components/layout/Footer';
import { Pill } from '@/components/ui/Pill';
import { offers } from '@/lib/content/offers';

const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://nicole-hansult-coaching.vercel.app';

export const metadata: Metadata = {
  title: 'Vibrant40 Jumpstart',
  description: 'Eight-week self-paced functional longevity program for adults 40+. $88 one-time.',
  alternates: { canonical: `${BASE_URL}/services/vibrant40-jumpstart` },
  openGraph: {
    title: 'Vibrant40 Jumpstart — Nicole Hansult Coaching',
    description:
      'Eight-week self-paced functional longevity program for adults 40+. $88 one-time.',
  },
};

const vibrant40 = offers.find((o) => o.id === 'vibrant40')!;

export default function Vibrant40JumpstartPage() {
  return (
    <>
      <Nav />
      <main className="bg-bg">
        <section className="mx-auto max-w-3xl px-6 pt-24 pb-16">
          {/* Hero */}
          <h1 className="text-4xl font-light mb-3">{vibrant40.name}</h1>
          <p className="text-sm uppercase tracking-[0.14em] text-grayDeep mb-10">
            {vibrant40.priceLabel} &middot; Online &middot; Self-paced &middot; 8 weeks
          </p>

          {/* Body — audit copy from CONTENT-AUDIT.md §Vibrant40 Jumpstart */}
          <div className="space-y-6 text-inkSoft text-base leading-relaxed">
            <p>
              A simple way to reconnect with your body.
            </p>
            <p>
              If you prefer to start on your own, the Vibrant40 Jumpstart is a short guided program
              designed to help you improve mobility, feel less stiff, and build simple daily
              consistency.
            </p>
            <p className="font-medium text-ink">This is ideal if:</p>
            <ul className="space-y-2 text-inkSoft">
              <li className="flex gap-2"><span>&bull;</span><span>You&apos;re new to movement or returning after a long break</span></li>
              <li className="flex gap-2"><span>&bull;</span><span>You want something simple and manageable</span></li>
              <li className="flex gap-2"><span>&bull;</span><span>You&apos;re not ready for 1:1 support yet</span></li>
            </ul>

            <p className="font-medium text-ink">What&apos;s included:</p>
            <ul className="space-y-2 text-inkSoft">
              <li className="flex gap-2"><span>&bull;</span><span>Eight weeks of self-paced online content</span></li>
              <li className="flex gap-2"><span>&bull;</span><span>Guided movement programming</span></li>
              <li className="flex gap-2"><span>&bull;</span><span>Nutrition and lifestyle foundations</span></li>
              <li className="flex gap-2"><span>&bull;</span><span>Accessible for adults 40+ starting from any fitness level</span></li>
            </ul>

            <p className="text-xl font-light text-ink">Investment: {vibrant40.priceLabel}</p>
          </div>

          {/* Phase 5 Plan 02 CTA — form POST to /api/checkout creates Stripe Checkout Session */}
          <div className="mt-10 flex flex-col items-start gap-3">
            <form action="/api/checkout" method="POST">
              <Pill variant="dark" size="md" type="submit">
                Buy Vibrant40 — $88
              </Pill>
            </form>
            <p className="text-sm text-grayDeep">
              Secure checkout via Stripe. You&apos;ll set your password after payment.
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
