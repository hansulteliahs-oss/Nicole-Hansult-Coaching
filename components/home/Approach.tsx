/**
 * Approach — design-2.md §4 home composition, section 5.
 *
 * Four numbered ApproachCards in a row: Assess / Plan / Train / Adjust.
 * Step blurbs are PLACEHOLDER — Phase 2 ports verbatim audit copy.
 */
import { Label } from '@/components/ui/Label';
import { ApproachCard } from '@/components/ui/ApproachCard';

const STEPS = [
  { number: '01', title: 'Assess', blurb: 'Body composition + movement screen.' },
  { number: '02', title: 'Plan', blurb: 'A protocol you can actually run.' },
  { number: '03', title: 'Train', blurb: 'Weekly programming and check-ins.' },
  { number: '04', title: 'Adjust', blurb: 'Re-test, refine, repeat.' },
];

export function Approach() {
  return (
    <section className="bg-bg px-6 py-24">
      <div className="mx-auto max-w-6xl space-y-12">
        <div className="space-y-4 max-w-2xl">
          <Label>The approach</Label>
          <h2 className="text-ink text-4xl md:text-5xl font-light leading-tight">
            Slow,{' '}
            <span className="font-serif italic">deliberate</span>, repeatable.
          </h2>
        </div>
        <div className="grid md:grid-cols-4 gap-4">
          {STEPS.map((s) => (
            <ApproachCard key={s.number} {...s} />
          ))}
        </div>
      </div>
    </section>
  );
}
