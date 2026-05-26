/**
 * Approach — home page section 5: "A Practical Approach to Longevity".
 *
 * Four pillar cards (Movement, Fuel, Lifestyle, Mindset) with verbatim
 * descriptions. Closing copy about the holistic approach.
 *
 * Copy: verbatim from CONTENT-AUDIT.md §Home Page §A Practical Approach to Longevity.
 */
import { Label } from '@/components/ui/Label';
import { ApproachCard } from '@/components/ui/ApproachCard';

const PILLARS = [
  {
    number: '01',
    title: 'Movement',
    blurb:
      'Restore mobility, posture, flexibility, and strength so your body moves well again.',
  },
  {
    number: '02',
    title: 'Fuel',
    blurb:
      'Understand how nutrition supports energy, metabolism, and body composition.',
  },
  {
    number: '03',
    title: 'Lifestyle',
    blurb: 'Sleep, stress management, and daily habits that support longevity.',
  },
  {
    number: '04',
    title: 'Mindset',
    blurb: 'Build consistency and confidence so progress lasts.',
  },
];

export function Approach() {
  return (
    <section className="bg-bg px-6 py-24">
      <div className="mx-auto max-w-6xl space-y-12">
        <div className="space-y-4 max-w-2xl">
          <Label>The approach</Label>
          <h2 className="text-ink text-4xl md:text-5xl font-light leading-tight">
            A Practical Approach to Longevity
          </h2>
          <p className="text-inkSoft text-base">
            My work focuses on helping people become the strongest, most capable
            version of themselves — not someone else&apos;s version of fitness.
          </p>
          <p className="text-inkSoft text-base">
            Lasting results come from balancing four key areas of health:
          </p>
        </div>

        <div className="grid md:grid-cols-4 gap-4">
          {PILLARS.map((p) => (
            <ApproachCard key={p.number} {...p} />
          ))}
        </div>

        <div className="max-w-2xl space-y-4">
          <p className="text-ink text-base font-medium">
            No single area works in isolation.
          </p>
          <p className="text-inkSoft text-base">
            You might be eating well, but not building enough strength. Or
            focusing on cardio and weight loss while ignoring mobility, recovery,
            or muscle preservation. Or trying to stay consistent without
            understanding what your body actually needs at this stage of life.
          </p>
          <p className="text-inkSoft text-base">
            Many people are working hard, but following a strategy that&apos;s
            incomplete, imbalanced, or no longer effective for their body.
          </p>
          <p className="text-ink text-base font-medium">
            This is where most people get stuck.
          </p>
          <p className="text-inkSoft text-base">
            Because it&apos;s not about doing more — it&apos;s about understanding what
            your body needs right now and bringing these elements back into
            balance. That&apos;s what makes a holistic approach so effective.
          </p>
        </div>
      </div>
    </section>
  );
}
