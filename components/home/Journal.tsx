/**
 * Journal — design-2.md §4 home composition, section 8.
 *
 * Three JournalCards (placeholder posts) + "All insights" Pill.
 * Real posts arrive in Phase 2 via verbatim audit copy port.
 */
import { Label } from '@/components/ui/Label';
import { JournalCard } from '@/components/ui/JournalCard';
import { Pill } from '@/components/ui/Pill';

const POSTS = [
  {
    title: 'Phase 1 placeholder post about strength',
    category: 'Strength',
    date: 'May 2026',
    href: '/insights',
  },
  {
    title: 'Phase 1 placeholder post about recovery',
    category: 'Recovery',
    date: 'May 2026',
    href: '/insights',
  },
  {
    title: 'Phase 1 placeholder post about nutrition',
    category: 'Nutrition',
    date: 'May 2026',
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
              Notes from the{' '}
              <span className="font-serif italic">studio</span>.
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
