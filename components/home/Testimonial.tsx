/**
 * Testimonial — home page section 7: social proof teaser.
 *
 * 2 pull-quote testimonials, social proof badges, CTA to /testimonials.
 * Attribution uses Carlsbad CA — not the old city name.
 *
 * Copy: verbatim from CONTENT-AUDIT.md §Testimonials Page §Real Recovery Stories
 * and §Strength, Confidence & Energy sections.
 *
 * Images: /images/nicole-portrait-marcy-browe.jpg for the FloatingCard portrait.
 * Full video testimonials live on /testimonials — not repeated here.
 */
import Image from 'next/image';

import { FloatingCard } from '@/components/ui/FloatingCard';
import { Label } from '@/components/ui/Label';
import { Pill } from '@/components/ui/Pill';

export function Testimonial() {
  return (
    <section className="bg-bg px-6 py-24">
      <div className="mx-auto max-w-5xl space-y-12">
        <div className="space-y-4">
          <Label>What clients say</Label>
        </div>

        {/* Two pull-quote testimonials */}
        <div className="grid md:grid-cols-2 gap-6">
          <blockquote className="rounded-2xl bg-card border border-inkFaint p-8 space-y-4">
            <p className="text-ink text-xl font-serif italic leading-relaxed">
              &ldquo;Nicole guided me through every step of my recovery after hip
              replacement surgery.&rdquo;
            </p>
            <footer className="text-grayDeep text-sm not-italic">
              — Mike S., Carlsbad, CA
            </footer>
          </blockquote>

          <blockquote className="rounded-2xl bg-card border border-inkFaint p-8 space-y-4">
            <p className="text-ink text-xl font-serif italic leading-relaxed">
              &ldquo;What I learned from Nicole completely changed my life for the long
              haul.&rdquo;
            </p>
            <footer className="text-grayDeep text-sm not-italic">
              — Brie M., Carlsbad, CA
            </footer>
          </blockquote>
        </div>

        {/* Review platforms + award badges on the same row */}
        <div className="flex flex-wrap gap-8 items-center">
          <a
            href="https://www.google.com/maps?cid=2333186323496371205"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Read Nicole Hansult's 5-star Google reviews"
            className="transition-opacity hover:opacity-80"
          >
            <Image
              src="/images/google-reviews-nicole-hansult.png"
              alt="Read Nicole Hansult's 5-star Google reviews"
              width={120}
              height={107}
              className="h-16 w-auto object-contain"
            />
          </a>
          <a
            href="https://www.yelp.com/biz/nicole-hansult-coaching-encinitas"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Read Nicole Hansult's 5-star Yelp reviews"
            className="transition-opacity hover:opacity-80"
          >
            <Image
              src="/images/yelp-reviews-nicole-hansult.png"
              alt="Read Nicole Hansult's 5-star Yelp reviews"
              width={106}
              height={106}
              className="h-16 w-auto object-contain"
            />
          </a>
          <Image
            src="/images/best-personal-trainer-north-county-2024-nicole-hansult.png"
            alt="Best Personal Trainer North County 2024"
            width={120}
            height={120}
            className="h-28 w-28 md:h-32 md:w-32 object-contain"
          />
          <Image
            src="/images/best-local-fitness-influencer-2024-nicole-hansult.png"
            alt="Best Local Fitness Influencer 2024"
            width={120}
            height={120}
            className="h-28 w-28 md:h-32 md:w-32 object-contain"
          />
        </div>

        {/* Video testimonial preview card */}
        <div className="aspect-[1600/1067]">
          <FloatingCard
            imageSrc="/images/nicole-clients-highfive.jpg"
            alt="Nicole Hansult high-fiving a client in Carlsbad CA"
            objectFit="cover"
          />
        </div>

        <Pill href="/testimonials" variant="ghost" size="md">
          See all client results
        </Pill>
      </div>
    </section>
  );
}
