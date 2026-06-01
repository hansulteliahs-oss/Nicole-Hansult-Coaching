/**
 * OfferLadderCard — one image+content offer card, driven by offer id.
 *
 * Shared by the home Pricing section and the /services page so the offer ladder
 * never drifts between the two surfaces. Pulls raw data from offers.ts and all
 * presentation copy/grouping from offerDetails.ts, then renders a HeroOfferCard.
 * The image side alternates down the ladder via offerImageSide().
 */
import { HeroOfferCard } from '@/components/ui/HeroOfferCard';
import { offers, type Offer } from '@/lib/content/offers';
import {
  offerFeatures,
  offerBadge,
  offerModality,
  offerImage,
  offerImageSide,
  HERO_ID,
  HERO_WHO_FOR,
  HIDE_PRICE_IDS,
} from '@/lib/content/offerDetails';

function offerById(id: Offer['id']): Offer {
  const offer = offers.find((o) => o.id === id);
  if (!offer) throw new Error(`Unknown offer id: ${id}`);
  return offer;
}

export function OfferLadderCard({ id }: { id: Offer['id'] }) {
  const offer = offerById(id);
  // Phase 5 Plan 02: Vibrant40 CTA POSTs to /api/checkout (Stripe Checkout).
  const isVibrant40 = id === 'vibrant40';
  const image = offerImage[id];

  return (
    <HeroOfferCard
      name={offer.name}
      priceLabel={HIDE_PRICE_IDS.includes(id) ? undefined : offer.priceLabel}
      modality={offerModality[id]}
      blurb={id === HERO_ID ? HERO_WHO_FOR : offer.blurb}
      features={offerFeatures[id].slice(0, 3)}
      badge={offerBadge[id]}
      ctaLabel={isVibrant40 ? 'Buy Vibrant40 — $88' : offer.ctaLabel}
      ctaHref={offer.ctaHref}
      ctaFormAction={isVibrant40 ? '/api/checkout' : undefined}
      imageSrc={image?.src}
      imageAlt={image?.alt}
      imagePosition={offerImageSide(id)}
    />
  );
}
