/**
 * Footer — rebuild spec §Site-Wide Navigation (CONTENT-AUDIT.md)
 *
 * 4 link groups:
 *   1. Home / About / Testimonials / Insights / Contact
 *   2. Services / Clinical Longevity Evaluation / Vibrant40 Jumpstart
 *   3. Download Guide / Book a Session
 *   4. Privacy Policy / Terms & Conditions
 *
 * Reads NAP + contact email from lib/content/site.ts.
 * All internal links use next/link. No inline styles — Mist tokens only.
 */
import Link from 'next/link';
import { site } from '@/lib/content/site';

const FOOTER_GROUPS = [
  {
    label: 'Navigate',
    links: [
      { label: 'Home', href: '/' },
      { label: 'About', href: '/about' },
      { label: 'Testimonials', href: '/testimonials' },
      { label: 'Insights', href: '/insights' },
      { label: 'Contact', href: '/contact' },
    ],
  },
  {
    label: 'Services',
    links: [
      { label: 'Services', href: '/services' },
      { label: 'Clinical Longevity Evaluation', href: '/services/clinical-longevity-evaluation' },
      { label: 'Vibrant40 Jumpstart', href: '/services/vibrant40-jumpstart' },
    ],
  },
  {
    label: 'Resources',
    links: [
      { label: 'Download Guide', href: '/look-and-feel-good-naked' },
      { label: 'Book a Session', href: '/booking-appointment' },
    ],
  },
  {
    label: 'Legal',
    links: [
      { label: 'Privacy Policy', href: '/privacy-policy' },
      { label: 'Terms & Conditions', href: '/terms-conditions' },
    ],
  },
];

export function Footer() {
  return (
    <footer className="bg-bgAlt border-t border-inkFaint mt-24 px-6 py-12">
      <div className="mx-auto max-w-6xl">
        {/* NAP */}
        <div className="mb-10">
          <p className="font-semibold text-ink">{site.nap.name}</p>
          <p className="text-sm text-inkSoft">
            {site.nap.city}, {site.nap.region}
          </p>
          <p className="text-sm text-inkSoft">
            <a href={`mailto:${site.contactEmail}`} className="hover:text-ink">
              {site.contactEmail}
            </a>
          </p>
        </div>

        {/* Link groups */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          {FOOTER_GROUPS.map((group) => (
            <div key={group.label}>
              <p className="text-xs font-semibold text-inkSoft uppercase tracking-wide mb-3">
                {group.label}
              </p>
              <ul className="flex flex-col gap-2">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-inkSoft hover:text-ink transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Copyright */}
        <p className="text-xs text-inkSoft border-t border-inkFaint pt-6">
          &copy; Nicole Hansult Coaching 2026 &middot; Carlsbad, CA
        </p>
      </div>
    </footer>
  );
}
