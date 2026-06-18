import type { MetadataRoute } from 'next';

import { getPublishedSlugs } from '@/lib/content/posts';

const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://nicole-hansult-coaching.vercel.app';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await getPublishedSlugs();

  return [
    { url: BASE_URL, changeFrequency: 'weekly', priority: 1.0 },
    { url: `${BASE_URL}/about`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE_URL}/services`, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${BASE_URL}/services/vibrant40-jumpstart`, priority: 0.8 },
    { url: `${BASE_URL}/services/three-month-coaching`, priority: 0.8 },
    { url: `${BASE_URL}/testimonials`, priority: 0.7 },
    { url: `${BASE_URL}/insights`, priority: 0.6 },
    ...posts.map((p) => ({
      url: `${BASE_URL}/insights/${p.slug}`,
      lastModified: p.published_at ? new Date(p.published_at) : undefined,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    })),
    { url: `${BASE_URL}/booking-appointment`, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${BASE_URL}/look-and-feel-good-naked`, priority: 0.7 },
    { url: `${BASE_URL}/medical-disclaimer`, priority: 0.3 },
    { url: `${BASE_URL}/privacy-policy`, priority: 0.2 },
    { url: `${BASE_URL}/terms-conditions`, priority: 0.2 },
  ];
}
