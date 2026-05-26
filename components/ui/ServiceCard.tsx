/**
 * ServiceCard — design-2.md §3.7
 *
 * Service tier card with bullets, blurb, price chip, CTA.
 * Tint drives the price Chip (sky / orchid / gray).
 */
import { cn } from '@/lib/cn';

import { Chip, type ChipTint } from './Chip';
import { Pill } from './Pill';

export function ServiceCard({
  title,
  blurb,
  bullets,
  priceLabel,
  ctaLabel,
  ctaHref,
  tint = 'gray',
  className,
}: {
  title: string;
  blurb: string;
  bullets: string[];
  priceLabel: string;
  ctaLabel: string;
  ctaHref: string;
  tint?: ChipTint;
  className?: string;
}) {
  return (
    <article
      className={cn(
        'rounded-2xl bg-card p-8 border border-inkFaint',
        'flex flex-col gap-6',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-4">
        <Chip tint={tint}>{priceLabel}</Chip>
      </div>
      <h3 className="text-ink text-2xl font-light leading-tight">{title}</h3>
      <p className="text-inkSoft text-base">{blurb}</p>
      <ul className="space-y-2 text-ink text-sm">
        {bullets.map((b) => (
          <li key={b} className="flex gap-2">
            <span className="text-grayDeep">•</span>
            <span>{b}</span>
          </li>
        ))}
      </ul>
      <Pill href={ctaHref} variant="dark" size="md" className="self-start">
        {ctaLabel}
      </Pill>
    </article>
  );
}
