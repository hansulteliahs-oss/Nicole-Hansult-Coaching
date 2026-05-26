import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Phase 2 will add redirects() for the 301 map.
  // Phase 1: keep config minimal.
  images: {
    // Phase 1 serves migrated images from /public/images/ — local, no remotePatterns needed yet.
  },
};

export default nextConfig;
