/**
 * PricingCard — design-2.md §3.9
 *
 * Default + `highlighted` variant. Highlighted = dark ink background, light text.
 * Used in the pricing section row; one card per tier.
 *
 * Note: design-2.md §3.9 doesn't enumerate exact variants beyond default vs featured —
 * we infer the two-variant surface (default + highlighted) as the most useful starting
 * point for Phase 2 pricing pages. Add more variants later if a page needs them.
 */
import { cn } from '@/lib/cn';

import { Pill } from './Pill';

export function PricingCard({
  name,
  priceLabel,
  modality,
  blurb,
  features,
  ctaLabel,
  ctaHref,
  ctaFormAction,
  highlighted = false,
  className,
}: {
  name: string;
  priceLabel: string;
  modality: string;
  blurb: string;
  features: string[];
  ctaLabel: string;
  ctaHref: string;
  /**
   * Phase 5: if provided, the CTA renders as `<form action={ctaFormAction} method="POST">`
   * wrapping a `<button>`-style Pill, instead of an `<a href={ctaHref}>` Pill.
   * Used by the Vibrant40 card to POST to /api/checkout (Stripe Checkout).
   */
  ctaFormAction?: string;
  highlighted?: boolean;
  className?: string;
}) {
  return (
    <article
      className={cn(
        'rounded-2xl p-8 flex flex-col gap-6 border',
        highlighted
          ? 'bg-ink text-bg border-ink shadow-card'
          : 'bg-card text-ink border-inkFaint',
        className,
      )}
    >
      <header className="space-y-2">
        <h3 className="text-2xl font-light">{name}</h3>
        <p
          className={cn(
            'text-xs uppercase tracking-[0.14em]',
            highlighted ? 'text-bg/70' : 'text-grayDeep',
          )}
        >
          {modality}
        </p>
      </header>
      <p
        className={cn(
          'text-4xl font-light',
          highlighted ? 'text-bg' : 'text-ink',
        )}
      >
        {priceLabel}
      </p>
      <p
        className={cn(
          'text-base',
          highlighted ? 'text-bg/80' : 'text-inkSoft',
        )}
      >
        {blurb}
      </p>
      <ul
        className={cn(
          'space-y-2 text-sm',
          highlighted ? 'text-bg/90' : 'text-ink',
        )}
      >
        {features.map((f) => (
          <li key={f} className="flex gap-2">
            <span>•</span>
            <span>{f}</span>
          </li>
        ))}
      </ul>
      {ctaFormAction ? (
        <form action={ctaFormAction} method="POST" className="self-start">
          <Pill
            variant={highlighted ? 'sky' : 'dark'}
            size="md"
            type="submit"
          >
            {ctaLabel}
          </Pill>
        </form>
      ) : (
        <Pill
          href={ctaHref}
          variant={highlighted ? 'sky' : 'dark'}
          size="md"
          className="self-start"
        >
          {ctaLabel}
        </Pill>
      )}
    </article>
  );
}
