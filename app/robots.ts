import type { MetadataRoute } from 'next';

const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://nicole-hansult-coaching.vercel.app';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', disallow: ['/dev/'] },
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
