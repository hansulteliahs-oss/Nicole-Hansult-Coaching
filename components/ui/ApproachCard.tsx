/**
 * ApproachCard — design-2.md §3.8
 *
 * Numbered principle card used in the row-of-4 approach section.
 * Number renders as a grayDeep eyebrow (Label-style), title in light serif weight,
 * blurb in inkSoft body.
 */
import { cn } from '@/lib/cn';

export function ApproachCard({
  number,
  title,
  blurb,
  className,
}: {
  number: string;
  title: string;
  blurb: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'rounded-2xl bg-orchidSoft p-6 border border-orchid/20',
        'flex flex-col gap-3',
        className,
      )}
    >
      <span className="text-grayDeep text-[11px] font-semibold uppercase tracking-[0.18em]">
        {number}
      </span>
      <h4 className="text-ink text-xl font-light">{title}</h4>
      <p className="text-inkSoft text-sm">{blurb}</p>
    </div>
  );
}
