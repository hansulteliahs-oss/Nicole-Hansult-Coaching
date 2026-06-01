/**
 * HeroOfferCard — the featured offer treatment.
 *
 * A full-width, image + content card used to make ONE offer (the Clinical
 * Longevity Evaluation) the visual hero of the offer ladder on both the home
 * Pricing section and the /services page. Deliberately distinct from the dark
 * `highlighted` PricingCard (reserved for the 3-Month Program) so the two
 * featured treatments don't clash: the hero earns prominence through scale +
 * imagery on a light `bg-card`, not a dark fill.
 *
 * Presentational only — all copy is passed in by the caller.
 */
import Image from 'next/image';

import { cn } from '@/lib/cn';

import { Chip } from './Chip';
import { Pill } from './Pill';

export function HeroOfferCard({
  name,
  priceLabel,
  modality,
  blurb,
  features,
  badge,
  ctaLabel,
  ctaHref,
  ctaFormAction,
  imageSrc,
  imageAlt,
  imagePosition = 'left',
  className,
}: {
  name: string;
  /** Omit to hide the price entirely (e.g. application-only / existing-client offers). */
  priceLabel?: string;
  modality: string;
  /** One-line "who it's for" audience framing. */
  blurb: string;
  features: string[];
  badge?: string;
  ctaLabel: string;
  ctaHref: string;
  /**
   * If provided, the CTA renders as `<form action={ctaFormAction} method="POST">`
   * wrapping a submit-style Pill, instead of an `<a href={ctaHref}>` Pill.
   * Used by the Vibrant40 card to POST to /api/checkout (Stripe Checkout).
   */
  ctaFormAction?: string;
  /** Omit to render a neutral placeholder block until a real image is supplied. */
  imageSrc?: string;
  imageAlt?: string;
  /** Which side the image sits on (desktop only). Drives the alternating ladder. */
  imagePosition?: 'left' | 'right';
  className?: string;
}) {
  const imageRight = imagePosition === 'right';
  return (
    <article
      className={cn(
        'overflow-hidden rounded-2xl border border-inkFaint bg-card shadow-card',
        'grid md:grid-cols-2',
        className,
      )}
    >
      {/* Image — top on mobile, left/right on desktop per imagePosition */}
      <div
        className={cn(
          'relative min-h-[260px] md:min-h-full',
          imageRight && 'md:order-2',
        )}
      >
        {imageSrc ? (
          <Image
            src={imageSrc}
            alt={imageAlt ?? name}
            fill
            quality={85}
            sizes="(min-width: 768px) 50vw, 100vw"
            className="object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-cardSoft">
            <span className="text-grayDeep text-xs uppercase tracking-[0.14em]">
              Image coming soon
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div
        className={cn(
          'flex flex-col gap-5 p-8 md:p-12',
          imageRight && 'md:order-1',
        )}
      >
        {badge && (
          <div>
            <Chip tint="orchid">{badge}</Chip>
          </div>
        )}
        <p className="text-grayDeep text-xs uppercase tracking-[0.14em]">
          {modality}
        </p>
        <h3 className="text-ink text-3xl md:text-4xl font-light leading-tight">
          {name}
        </h3>
        {priceLabel && <p className="text-ink text-5xl font-light">{priceLabel}</p>}
        <p className="text-inkSoft text-base">{blurb}</p>
        <ul className="space-y-2 text-ink text-sm">
          {features.map((f) => (
            <li key={f} className="flex gap-2">
              <span className="text-grayDeep">•</span>
              <span>{f}</span>
            </li>
          ))}
        </ul>
        {ctaFormAction ? (
          <form action={ctaFormAction} method="POST" className="self-start mt-auto">
            <Pill variant="orchid" size="lg" type="submit">
              {ctaLabel}
            </Pill>
          </form>
        ) : (
          <Pill
            href={ctaHref}
            variant="orchid"
            size="lg"
            className="self-start mt-auto"
          >
            {ctaLabel}
          </Pill>
        )}
      </div>
    </article>
  );
}
