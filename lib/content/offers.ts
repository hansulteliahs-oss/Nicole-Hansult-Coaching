import { site } from './site';

export type OfferModality = 'in-person' | 'online-community' | 'zoom';
export type OfferKind = 'product' | 'application-gate';

export interface Offer {
  id: 'cle' | 'community' | 'strategy' | 'three-month' | 'everyday-training';
  slug: string;
  name: string;
  price: number;
  priceLabel: string;
  modality: OfferModality;
  kind: OfferKind;
  blurb: string;
  ctaLabel: string;
  ctaHref: string;
  /** CTA leaves the site (opens in a new tab). */
  external?: boolean;
}

export const offers: ReadonlyArray<Offer> = [
  {
    id: 'cle',
    slug: 'clinical-longevity-evaluation',
    name: 'Clinical Longevity Assessment',
    price: 295,
    priceLabel: '$295',
    modality: 'in-person',
    kind: 'product',
    blurb:
      'A single-session baseline — Seca body composition + movement screen + plan.',
    ctaLabel: 'Book the Assessment',
    ctaHref: '/booking-appointment',
  },
  {
    id: 'community',
    slug: 'keep-your-muscle',
    name: 'Keep Your Muscle',
    price: 0,
    priceLabel: 'Free',
    modality: 'online-community',
    kind: 'product',
    // GLP-1 wording is the approved claim (client-nicole/agent/claim-rules.md).
    // The disclaimer is covered by the site-wide DisclaimerBand in the root layout.
    blurb:
      "On a GLP-1, up to 40% of the weight lost can be muscle. Your doctor manages the medication; Nicole's free group shows you what to do alongside it.",
    ctaLabel: 'Join free',
    ctaHref: site.community.url,
    external: true,
  },
  {
    id: 'strategy',
    slug: 'strategy-session',
    name: '30-Minute Strategy Session',
    price: 88,
    priceLabel: '$88',
    modality: 'zoom',
    kind: 'product',
    blurb:
      'A focused planning call — $88 credits toward the 3-Month Program if booked after.',
    ctaLabel: 'Book a Strategy Session',
    ctaHref: '/booking-appointment',
  },
  {
    id: 'three-month',
    slug: 'three-month-coaching',
    name: '3-Month Coaching Program',
    price: 5500,
    priceLabel: '$5,500',
    modality: 'in-person',
    kind: 'application-gate',
    blurb:
      'Twelve weeks of in-person coaching — application only, not a checkout.',
    ctaLabel: 'Apply for Premium Coaching',
    ctaHref: '/services/three-month-coaching',
  },
  {
    id: 'everyday-training',
    slug: 'everyday-training',
    name: 'Personalized Training & Movement',
    price: 165,
    priceLabel: '$165/hr',
    modality: 'in-person',
    kind: 'product',
    blurb:
      'Private 1-on-1 coaching combining personalized strength training, Pilates, and corrective exercise with integrated lifestyle and nutrition support.',
    ctaLabel: 'Apply for Eligibility',
    ctaHref: '/services/three-month-coaching',
  },
];
