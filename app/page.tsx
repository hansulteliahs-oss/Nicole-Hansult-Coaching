/**
 * Home page — Mist composition per design-2.md §4.
 *
 * Server component. Composes Nav + 9 home sections + Footer.
 * Phase 1 ships with placeholder copy; Phase 2 swaps verbatim audit copy
 * on top of this composition without changing layout.
 */
import type { Metadata } from 'next';

import { Nav } from '@/components/layout/Nav';
import { Footer } from '@/components/layout/Footer';
import { Hero } from '@/components/home/Hero';
import { Mantra } from '@/components/home/Mantra';
import { About } from '@/components/home/About';
import { Services } from '@/components/home/Services';
import { Approach } from '@/components/home/Approach';
import { Pricing } from '@/components/home/Pricing';
import { Testimonial } from '@/components/home/Testimonial';
import { Journal } from '@/components/home/Journal';
import { DarkCta } from '@/components/home/DarkCta';

export const metadata: Metadata = {
  title: 'Nicole Hansult Coaching',
  description:
    'Functional longevity coaching in Carlsbad, CA. Train for the decades ahead.',
};

export default function HomePage() {
  return (
    <>
      <Nav />
      <main className="bg-bg">
        <Hero />
        <Mantra />
        <About />
        <Services />
        <Approach />
        <Pricing />
        <Testimonial />
        <Journal />
        <DarkCta />
      </main>
      <Footer />
    </>
  );
}
