/**
 * About — design-2.md §4 home composition, section 3.
 *
 * Two-column on desktop, stacked on mobile.
 *   Left:  portrait (4:5 aspect, rounded card, cardSoft fallback bg)
 *   Right: eyebrow Label + heading (italic-serif on "middle") + two bio paragraphs + ghost Pill
 *
 * Bio paragraphs are PLACEHOLDER — Phase 2 ports verbatim audit copy.
 */
import Image from 'next/image';

import { Label } from '@/components/ui/Label';
import { Pill } from '@/components/ui/Pill';
import { image } from '@/lib/images';

export function About() {
  return (
    <section className="bg-bg px-6 py-24">
      <div className="mx-auto max-w-6xl grid md:grid-cols-2 gap-12 items-center">
        <div className="relative aspect-[4/5] rounded-2xl overflow-hidden bg-cardSoft">
          <Image
            src={image(
              'https://images.squarespace-cdn.com/content/v1/5b83975d45776e48dcfe0f15/2a3795b1-b0cb-4def-b530-f842bbe048b2/BrandPortraits%40MarcyBrowePhoto-256.jpg',
            )}
            alt="Nicole Hansult portrait"
            fill
            quality={85}
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover"
          />
        </div>
        <div className="space-y-6">
          <Label>Meet Nicole</Label>
          <h2 className="text-ink text-4xl md:text-5xl font-light leading-tight">
            A coach for the{' '}
            <span className="font-serif italic">middle</span> of life.
          </h2>
          <p className="text-inkSoft text-base">
            Phase 1 placeholder bio paragraph one. Phase 2 ports the verbatim
            audit copy from the About page.
          </p>
          <p className="text-inkSoft text-base">
            Phase 1 placeholder bio paragraph two. Continued context about
            Nicole&apos;s approach, certifications, and practice in Carlsbad.
          </p>
          <Pill href="/about" variant="ghost" size="md">
            Read more about Nicole
          </Pill>
        </div>
      </div>
    </section>
  );
}
