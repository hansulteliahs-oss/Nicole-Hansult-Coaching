export type OfferModality = 'in-person' | 'online-self-paced' | 'zoom';
export type OfferKind = 'product' | 'application-gate';

export interface Offer {
  id: 'cle' | 'vibrant40' | 'strategy' | 'three-month' | 'everyday-training';
  slug: string;
  name: string;
  price: number;
  priceLabel: string;
  modality: OfferModality;
  kind: OfferKind;
  blurb: string;
  ctaLabel: string;
  ctaHref: string;
}

export const offers: ReadonlyArray<Offer> = [
  {
    id: 'cle',
    slug: 'clinical-longevity-evaluation',
    name: 'Clinical Longevity Evaluation',
    price: 295,
    priceLabel: '$295',
    modality: 'in-person',
    kind: 'product',
    blurb:
      'A single-session baseline — Seca body composition + movement screen + plan.',
    ctaLabel: 'Book the CLE',
    ctaHref: '/booking-appointment',
  },
  {
    id: 'vibrant40',
    slug: 'vibrant40-jumpstart',
    name: 'Vibrant40 Jumpstart',
    price: 88,
    priceLabel: '$88',
    modality: 'online-self-paced',
    kind: 'product',
    blurb: 'Eight-day self-paced foundation for functional longevity over 40.',
    ctaLabel: 'Start Vibrant40',
    ctaHref: '/services/vibrant40-jumpstart',
  },
  {
    id: 'strategy',
    slug: 'strategy-session',
    name: '45-Minute Strategy Session',
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
    ctaLabel: 'Apply for the 3-Month Program',
    ctaHref: '/services/three-month-coaching',
  },
  {
    id: 'everyday-training',
    slug: 'everyday-training',
    name: 'Everyday Training',
    price: 165,
    priceLabel: '$165/hr',
    modality: 'in-person',
    kind: 'product',
    blurb: 'Drop-in hourly training for existing clients — no commitment.',
    ctaLabel: 'Book Everyday Training',
    ctaHref: '/booking-appointment',
  },
];
