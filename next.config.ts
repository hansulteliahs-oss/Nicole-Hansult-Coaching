import type { NextConfig } from 'next';
import { site } from './lib/content/site';

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  async redirects() {
    return [
      // Fixed redirects — always present
      // Generated/verified by: node scripts/crawl-redirects.mjs
      { source: '/start-here',                                 destination: '/services',                    permanent: true },
      { source: '/services/vibrant40-jumpstart-enroll',         destination: '/services',                    permanent: true },
      { source: '/services/vibrant40-jumpstart-enroll/:path*', destination: '/services',                    permanent: true },
      { source: '/vibrant40-jumpstart',                         destination: '/services',                    permanent: true },
      // Vibrant40 taken off sale 2026-09-30; it lives in the paid Skool community now
      { source: '/services/vibrant40-jumpstart',                destination: '/services',                    permanent: true },
      { source: '/services/clinical-longevity-evaluation',     destination: '/services',                    permanent: true },
      // Additional old Squarespace paths discovered via crawl
      { source: '/cart',                                        destination: '/',                            permanent: true },
      // Free guide moved into the free Skool group's Classroom 2026-09-30. Temporary (307):
      // the Skool URL can change if the group is renamed, and a 308 would stick in browsers.
      { source: '/look-and-feel-good-naked',        destination: site.freeCommunity.url, permanent: false },
      { source: '/look-and-feel-good-naked/:path*', destination: site.freeCommunity.url, permanent: false },
      // Squarespace posts, bodies not recovered (SEO audit 2026-09-30). Each points at the
      // closest live page. Delete the line if a post is republished at its old slug.
      { source: '/insights/the-fascia-factor-what-it-is-and-why-it-could-be-the-reason-you-feel-stiff', destination: '/insights/the-fascia-factor-why-you-feel-stiff-after-40', permanent: true },
      { source: '/insights/3-daily-stretches-that-take-you-from-stiff-and-sore-to-confident-and-strong', destination: '/insights/the-fascia-factor-why-you-feel-stiff-after-40', permanent: true },
      { source: '/insights/2025/why-mobility-matters-more', destination: '/insights/why-mobility-matters-more-than-intense-workouts-after-40', permanent: true },
      { source: '/insights/the-power-of-mobility', destination: '/insights/why-mobility-matters-more-than-intense-workouts-after-40', permanent: true },
      { source: '/insights/im-too-old-to-start-exercising-or-am-i', destination: '/insights/why-mobility-matters-more-than-intense-workouts-after-40', permanent: true },
      { source: '/insights/the-3-biggest-mistakes-people-make-when-trying-to-get-back-in-shape-after-40', destination: '/insights/why-mobility-matters-more-than-intense-workouts-after-40', permanent: true },
      { source: '/insights/why-the-scale-isnt-telling-the-whole-story-about-your-body-after-40', destination: '/insights/am-i-losing-muscle-on-a-glp-1', permanent: true },
      { source: '/insights/the-confidence-connection-how-better-posture-changes-how-others-see-you', destination: '/insights/your-body-is-talking-are-you-listening', permanent: true },
      { source: '/insights/reclaiming-strength-after-50', destination: '/testimonials', permanent: true },
      { source: '/insights/december-reset-how-to-take-care-of-yourself-without-opting-out-during-the-holidays', destination: '/insights', permanent: true },
      { source: '/insights/smart-people-over-40-rethinking-water-habits', destination: '/insights', permanent: true },
    ];
  },
  images: {
    // Phase 1 serves migrated images from /public/images/ — local.
    // Phase 6: blog hero images are uploaded to Vercel Blob, so allow that host.
    remotePatterns: [
      { protocol: 'https', hostname: '*.public.blob.vercel-storage.com' },
    ],
    // Components pass quality={85}; Next 16 requires explicit allowlist.
    qualities: [75, 85],
  },
};

export default nextConfig;
