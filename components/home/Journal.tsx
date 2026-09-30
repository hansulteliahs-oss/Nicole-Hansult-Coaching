/**
 * Journal — home page section 8: "Insights" preview.
 *
 * 3 preview cards linking to live /insights/[slug] posts. Hardcoded, so swap
 * them by hand when a newer post should lead.
 *
 * CTA: "All insights" → "/insights"
 */
import { Label } from '@/components/ui/Label';
import { JournalCard } from '@/components/ui/JournalCard';
import { Pill } from '@/components/ui/Pill';
import { image } from '@/lib/images';
import {
  IMG_JOURNAL_BODY_COMP,
  IMG_JOURNAL_MOVEMENT,
  IMG_JOURNAL_WELLNESS,
} from '@/lib/images/keys';

const POSTS = [
  {
    title: 'Am I Losing Muscle on a GLP-1?',
    category: 'Physical Health',
    date: 'Sep 2026',
    href: '/insights/am-i-losing-muscle-on-a-glp-1',
    imageSrc: image(IMG_JOURNAL_BODY_COMP),
    imageAlt: 'Seca body composition assessment in Carlsbad',
  },
  {
    title: 'Your Body Is Talking. Are You Listening?',
    category: 'Mobility',
    date: 'Aug 2026',
    href: '/insights/your-body-is-talking-are-you-listening',
    imageSrc: image(IMG_JOURNAL_WELLNESS),
    imageAlt: "Nicole Hansult's wellness studio in Carlsbad",
  },
  {
    title: 'The Fascia Factor: What It Is and Why It Could Be the Reason You Feel Stiff',
    category: 'Mobility',
    date: 'Jun 2026',
    href: '/insights/the-fascia-factor-why-you-feel-stiff-after-40',
    imageSrc: image(IMG_JOURNAL_MOVEMENT),
    imageAlt: 'Functional movement coaching for adults over 40 in Carlsbad',
  },
];

export function Journal() {
  return (
    <section className="bg-bgAlt px-6 py-24">
      <div className="mx-auto max-w-6xl space-y-12">
        <div className="flex items-end justify-between flex-wrap gap-4">
          <div className="space-y-4 max-w-2xl">
            <Label>Insights</Label>
            <h2 className="text-ink text-4xl md:text-5xl font-light leading-tight">
              Latest from Nicole
            </h2>
          </div>
          <Pill href="/insights" variant="ghost" size="md">
            All insights
          </Pill>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {POSTS.map((p) => (
            <JournalCard key={p.title} {...p} />
          ))}
        </div>
      </div>
    </section>
  );
}
