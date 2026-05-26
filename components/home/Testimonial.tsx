/**
 * Testimonial — design-2.md §4 home composition, section 7.
 *
 * FloatingCard with quote overlay (children prop becomes absolute overlay).
 * Placeholder quote — Phase 2 ports the real 4-client video testimonial set
 * (or whichever ones are ready by then).
 */
import { FloatingCard } from '@/components/ui/FloatingCard';
import { Label } from '@/components/ui/Label';
import { Pill } from '@/components/ui/Pill';
import { image } from '@/lib/images';

export function Testimonial() {
  return (
    <section className="bg-bg px-6 py-24">
      <div className="mx-auto max-w-5xl space-y-8">
        <Label>What clients say</Label>
        <div className="h-[420px]">
          <FloatingCard
            imageSrc={image(
              'https://images.squarespace-cdn.com/content/v1/5b83975d45776e48dcfe0f15/fae3d33a-daa5-4bcc-bf3c-5b4bec2bc31c/Nicole+yellow+top+DSC04555.jpg',
            )}
            alt="Client and Nicole"
          >
            <blockquote className="text-bg text-2xl font-serif italic max-w-xl">
              &ldquo;Phase 1 placeholder testimonial — Phase 2 ports the real
              4-client video set.&rdquo;
              <footer className="text-bg/70 text-sm mt-3 not-italic font-sans">
                — Client name
              </footer>
            </blockquote>
          </FloatingCard>
        </div>
        <Pill href="/testimonials" variant="ghost" size="md">
          See all testimonials
        </Pill>
      </div>
    </section>
  );
}
