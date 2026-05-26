#!/usr/bin/env node
// scripts/crawl-redirects.mjs
// Usage: node scripts/crawl-redirects.mjs
// Output: JSON array of { source, destination, permanent } to stdout
// Paste the output into next.config.ts redirects()

import https from 'https';

const LIVE_DOMAIN = 'nicolehansultcoaching.com';
const BASE = `https://${LIVE_DOMAIN}`;

// Known fixed redirects (always included regardless of crawl results)
const FIXED_REDIRECTS = [
  { source: '/start-here',                                   destination: '/services',                    permanent: true },
  { source: '/services/vibrant40-jumpstart-enroll',           destination: '/services',                    permanent: true },
  { source: '/services/vibrant40-jumpstart-enroll/:path*',   destination: '/services',                    permanent: true },
  { source: '/vibrant40-jumpstart',                           destination: '/services/vibrant40-jumpstart', permanent: true },
  { source: '/services/clinical-longevity-evaluation',       destination: '/services',                    permanent: true },
];

function fetchHtml(url) {
  return new Promise((resolve, reject) => {
    https
      .get(
        url,
        { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; redirect-crawler/1.0)' } },
        (res) => {
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () =>
            resolve({ html: data, status: res.statusCode, finalUrl: res.headers.location || url })
          );
        }
      )
      .on('error', reject);
  });
}

// Extract all internal href values from anchor tags
function extractLinks(html) {
  const links = new Set();
  const hrefRegex = /href="(\/[^"?#]*)/g;
  let match;
  while ((match = hrefRegex.exec(html)) !== null) {
    const path = match[1];
    if (path && !path.startsWith('/static') && !path.startsWith('/_')) {
      links.add(path.replace(/\/$/, '') || '/');
    }
  }
  return [...links];
}

const NEW_ROUTES = new Set([
  '/',
  '/about',
  '/services',
  '/services/vibrant40-jumpstart',
  '/services/three-month-coaching',
  '/testimonials',
  '/insights',
  '/booking-appointment',
  '/look-and-feel-good-naked',
  '/medical-disclaimer',
  '/privacy-policy',
  '/terms-conditions',
]);

async function crawl() {
  let html = '';
  try {
    const result = await fetchHtml(BASE);
    html = result.html;
  } catch (err) {
    process.stderr.write(`Crawl failed (network error): ${err.message}\n`);
    process.stderr.write('Outputting fixed redirects only.\n');
    process.stdout.write(JSON.stringify(FIXED_REDIRECTS, null, 2) + '\n');
    return;
  }

  const links = extractLinks(html);

  const crawlRedirects = [];
  for (const link of links) {
    if (!NEW_ROUTES.has(link) && !FIXED_REDIRECTS.some((r) => r.source === link)) {
      // Old URL not present in new site -> redirect to / (catch-all)
      // Customize below for specific mappings
      crawlRedirects.push({ source: link, destination: '/', permanent: true });
    }
  }

  const allRedirects = [...FIXED_REDIRECTS, ...crawlRedirects];
  process.stdout.write(JSON.stringify(allRedirects, null, 2) + '\n');
}

crawl().catch(console.error);
