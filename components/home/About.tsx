/**
 * About — home page section 3: "A Personalized Approach to Longevity".
 *
 * Two-column on desktop, stacked on mobile.
 *   Left:  portrait (4:5 aspect, rounded card, cardSoft fallback bg)
 *   Right: eyebrow Label + heading + credential bullets + closer copy + ghost Pill
 *
 * Copy: verbatim from CONTENT-AUDIT.md §Home Page §A Personalized Approach to Longevity.
 * Geography: Carlsbad only — scrub any old city references per audit resolution.
 */
import Image from 'next/image';

import { Label } from '@/components/ui/Label';
import { Pill } from '@/components/ui/Pill';
import { image } from '@/lib/images';
import { IMG_ABOUT_PORTRAIT } from '@/lib/images/keys';

export function About() {
  return (
    <section className="bg-bg px-6 py-24">
      <div className="mx-auto max-w-6xl grid md:grid-cols-2 gap-12 items-center">
        <div className="relative aspect-[4/5] rounded-2xl overflow-hidden bg-cardSoft">
          <Image
            src={image(IMG_ABOUT_PORTRAIT)}
            alt="Nicole Hansult, functional longevity coach in Carlsbad, CA"
            fill
            quality={85}
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover scale-[1.35]"
            style={{ objectPosition: '47% 38%' }}
          />
        </div>
        <div className="space-y-6">
          <Label>Meet Nicole</Label>
          <h2 className="text-ink text-4xl md:text-5xl font-light leading-tight">
            A Personalized Approach to Longevity
          </h2>
          <ul className="space-y-3 text-inkSoft text-base">
            <li className="flex gap-2">
              <span className="text-grayDeep">•</span>
              <span>25+ years helping adults move, feel, and age better</span>
            </li>
            <li className="flex gap-2">
              <span className="text-grayDeep">•</span>
              <span>Clinical-grade body composition analysis</span>
            </li>
            <li className="flex gap-2">
              <span className="text-grayDeep">•</span>
              <span>Personalized recommendations for adults 40+</span>
            </li>
            <li className="flex gap-2">
              <span className="text-grayDeep">•</span>
              <span>Focused on sustainable strength, mobility, and longevity</span>
            </li>
          </ul>
          <p className="text-inkSoft text-base">Everyone starts at a different point.</p>
          <Pill href="/about" variant="ghost" size="md">
            Read more about Nicole
          </Pill>
        </div>
      </div>
    </section>
  );
}
