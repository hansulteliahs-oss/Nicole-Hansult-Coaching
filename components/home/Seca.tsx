/**
 * Seca — home page section: SECA medical-grade body composition scanner.
 *
 * Sits between Services and Approach. Two-column on desktop, stacked on
 * mobile. Image left, text right (mirrors About).
 *
 * Featured during the Clinical Longevity Evaluation. Replaces the Squarespace
 * site's mention of clinical-grade body composition technology on the home page.
 */
import Image from 'next/image';

import { Label } from '@/components/ui/Label';
import { Pill } from '@/components/ui/Pill';
import { image } from '@/lib/images';
import { IMG_SECA_SCANNER } from '@/lib/images/keys';

export function Seca() {
  return (
    <section className="bg-bg px-6 py-24">
      <div className="mx-auto max-w-6xl grid md:grid-cols-2 gap-12 items-center">
        <div className="relative aspect-[4/5] rounded-2xl overflow-hidden bg-cardSoft">
          <Image
            src={image(IMG_SECA_SCANNER)}
            alt="SECA medical-grade body composition analysis in Carlsbad, CA"
            fill
            quality={85}
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-contain"
          />
        </div>
        <div className="space-y-6">
          <Label>Clinical technology</Label>
          <h2 className="text-ink text-4xl md:text-5xl font-light leading-tight">
            Stop Guessing What Your Body Needs
          </h2>
          <p className="text-inkSoft text-base">
            Most people rely on a bathroom scale to measure their progress.
            But weight alone doesn&apos;t tell the whole story.
          </p>
          <p className="text-inkSoft text-base">
            I use medical-grade body composition analysis (Seca mBCA) to
            understand what is actually happening inside your body.
          </p>
          <p className="text-ink text-base font-medium">This scan measures:</p>
          <ul className="space-y-2 text-inkSoft text-base">
            <li className="flex gap-2">
              <span className="text-grayDeep">•</span>
              <span>muscle mass and imbalances</span>
            </li>
            <li className="flex gap-2">
              <span className="text-grayDeep">•</span>
              <span>fat distribution</span>
            </li>
            <li className="flex gap-2">
              <span className="text-grayDeep">•</span>
              <span>visceral fat</span>
            </li>
            <li className="flex gap-2">
              <span className="text-grayDeep">•</span>
              <span>metabolic health</span>
            </li>
            <li className="flex gap-2">
              <span className="text-grayDeep">•</span>
              <span>cellular health</span>
            </li>
            <li className="flex gap-2">
              <span className="text-grayDeep">•</span>
              <span>hydration status</span>
            </li>
          </ul>
          <p className="text-inkSoft text-base">
            This information becomes the foundation of your Clinical Longevity
            Evaluation, allowing us to stop guessing and build a strategy based
            on how your body is currently functioning.
          </p>
          <Pill href="/booking-appointment" variant="orchid" size="md">
            Start with a Clinical Longevity Evaluation
          </Pill>
        </div>
      </div>
    </section>
  );
}
