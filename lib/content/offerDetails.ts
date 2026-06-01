/**
 * offerDetails — presentation metadata for the five offers.
 *
 * Single source of truth for the per-offer copy that surrounds the raw offer
 * data in offers.ts: deliverable bullets, badges, modality/duration labels, and
 * the funnel grouping that drives the CLE-hero layout on the home Pricing
 * section AND the /services page.
 *
 * Both surfaces import from here so they never drift. Prices, names, blurbs, and
 * CTAs still come from offers.ts — this file only holds the display details.
 */
import type { Offer } from './offers';

type OfferId = Offer['id'];

/** Deliverable bullets per offer (the "what you get" layer of each card). */
export const offerFeatures: Record<OfferId, string[]> = {
  cle: [
    'Seca mBCA Phase Angle Protocol: Evaluates cellular health, membrane integrity, and your true metabolic vitality.',
    'Precise Body Composition Analysis: Differentiates exact skeletal muscle mass, fat mass, and total body water distribution.',
    'Structural & Mobility Assessment: Reviews key posture, joint mechanics, and recovery indicators to optimize movement.',
  ],
  vibrant40: [
    'Eight days of self-paced online content',
    'Guided movement programming',
    'Nutrition and lifestyle foundations',
    'Accessible for adults 40+ starting from any fitness level',
  ],
  strategy: [
    'Focused 30-minute planning call via Zoom',
    'Personalized strategy for your goals and schedule',
    'Accountability and direction',
    '$88 credits toward the 3-Month Program if booked after',
  ],
  'three-month': [
    'Twelve weeks of in-person coaching in Carlsbad, CA',
    'Weekly sessions tailored to your Longevity Roadmap',
    'Nutrition, movement, lifestyle, and mindset support',
    'Application only — not a cart checkout',
  ],
  'everyday-training': [
    "Custom sessions tailored to your body's daily needs.",
    'Includes hands-on structural adjustments and movement optimization.',
    'Available exclusively to active clients by invite or referral.',
  ],
};

/** Badge label per offer (only some offers carry a badge). */
export const offerBadge: Partial<Record<OfferId, string>> = {
  cle: 'Most Personalized',
  strategy: 'Best Next Step',
  'three-month': 'Application Only',
};

/** Modality + duration eyebrow per offer. */
export const offerModality: Record<OfferId, string> = {
  cle: 'In person · Carlsbad · 75 minutes',
  vibrant40: 'Online · 8-day self-paced',
  strategy: 'Zoom · 30 minutes',
  'three-month': 'In person · Carlsbad',
  'everyday-training': 'In person · Carlsbad',
};

/**
 * Funnel grouping for the CLE-hero layout:
 *   HERO (CLE)
 *     → "Coaching that continues" (the in-person paid coaching — the revenue)
 *     → "Prefer to start gently?"  (lower-commitment entry points)
 * The Free Guide is rendered separately as a secondary banner, not a tier.
 */
export const HERO_ID: OfferId = 'cle';
export const CONTINUE_IDS: OfferId[] = ['everyday-training', 'three-month'];
export const GENTLE_IDS: OfferId[] = ['strategy', 'vibrant40'];

/**
 * Offers whose price is NOT shown on the card. Personalized Training is for existing
 * clients with a plan; the 3-Month Program is application-only — both are framed
 * as "let's talk" rather than a posted price.
 */
export const HIDE_PRICE_IDS: OfferId[] = ['everyday-training', 'three-month'];

/** CLE hero "who it's for" one-liner (audience framing above the deliverables). */
export const HERO_WHO_FOR =
  'Best if you want elite, medical-grade data and absolute clarity on your health baseline before mapping out your long-term longevity strategy.';

/**
 * Render order for the offer ladder (hero first, then the two funnel groups).
 * Drives the alternating image side: even index → image left, odd index → right.
 */
export const ORDERED_OFFER_IDS: OfferId[] = [HERO_ID, ...CONTINUE_IDS, ...GENTLE_IDS];

/** Which side an offer's image sits on (desktop), alternating down the ladder. */
export function offerImageSide(id: OfferId): 'left' | 'right' {
  return ORDERED_OFFER_IDS.indexOf(id) % 2 === 0 ? 'left' : 'right';
}

/**
 * Image (src + alt) per offer for the image+content card.
 * Only CLE has an image today; the other four render a placeholder block until
 * supplied. To add one, drop the file in /public/images and fill its entry here.
 */
export const offerImage: Partial<Record<OfferId, { src: string; alt: string }>> = {
  cle: {
    src: '/images/clinical-longevity-consultation-carlsbad.jpg',
    alt: 'Nicole Hansult conducting a clinical longevity evaluation in Carlsbad, CA',
  },
  'everyday-training': {
    src: '/images/personalized-training-movement-coaching-carlsbad.jpg',
    alt: 'Nicole Hansult coaching a client through a movement session in Carlsbad, CA',
  },
  vibrant40: {
    src: '/images/vibrant40-jumpstart-online-program-over-40.jpg',
    alt: 'Nicole Hansult guiding a client on nutrition during the Vibrant40 Jumpstart',
  },
  'three-month': {
    src: '/images/nicole-portrait-living-room.jpg',
    alt: 'Nicole Hansult, longevity coach for the 3-Month Coaching Program in Carlsbad, CA',
  },
  strategy: {
    src: '/images/strategy-session-online-planning-call-carlsbad.jpg',
    alt: 'Nicole Hansult reviewing a plan with a client on a laptop during a strategy session',
  },
};
