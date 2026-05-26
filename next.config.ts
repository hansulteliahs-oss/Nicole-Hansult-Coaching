import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // Fixed redirects — always present
      // Generated/verified by: node scripts/crawl-redirects.mjs
      { source: '/start-here',                                 destination: '/services',                    permanent: true },
      { source: '/services/vibrant40-jumpstart-enroll',         destination: '/services',                    permanent: true },
      { source: '/services/vibrant40-jumpstart-enroll/:path*', destination: '/services',                    permanent: true },
      { source: '/vibrant40-jumpstart',                         destination: '/services/vibrant40-jumpstart', permanent: true },
      { source: '/services/clinical-longevity-evaluation',     destination: '/services',                    permanent: true },
      // Additional old Squarespace paths discovered via crawl
      { source: '/cart',                                        destination: '/',                            permanent: true },
      { source: '/contact',                                     destination: '/',                            permanent: true },
    ];
  },
  images: {
    // Phase 1 serves migrated images from /public/images/ — local, no remotePatterns needed yet.
  },
};

export default nextConfig;
