/**
 * Journal — home page section 8: "Insights" preview.
 *
 * 3 preview cards linking to /insights (non-linked state per CONTEXT.md —
 * no /insights/[slug] routes in Phase 2). Post titles from CONTENT-AUDIT.md
 * §Insights Blog Post Index.
 *
 * CTA: "All insights" → "/insights"
 */
import { Label } from '@/components/ui/Label';
import { JournalCard } from '@/components/ui/JournalCard';
import { Pill } from '@/components/ui/Pill';

const POSTS = [
  {
    title:
      'The 3 Biggest Mistakes People Make When Trying to "Get Back in Shape" After 40',
    category: 'Functional Longevity',
    date: 'Apr 2026',
    href: '/insights',
  },
  {
    title: 'Why the Scale Isn\'t Telling the Whole Story About Your Body After 40',
    category: 'Body Composition',
    date: 'Jan 2026',
    href: '/insights',
  },
  {
    title: 'Your Body Is Talking. Are You Listening?',
    category: 'Mobility',
    date: 'Feb 2026',
    href: '/insights',
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
