/**
 * Footer — minimal NAP + privacy/terms/medical-disclaimer links.
 *
 * Reads NAP + contact email from lib/content/site.ts so prices/contact updates
 * only ever change in one place.
 */
import { site } from '@/lib/content/site';

export function Footer() {
  return (
    <footer className="bg-bgAlt border-t border-inkFaint mt-24 px-6 py-12">
      <div className="mx-auto max-w-6xl flex flex-col md:flex-row md:justify-between gap-6 text-sm text-ink">
        <div>
          <p className="font-semibold">{site.nap.name}</p>
          <p className="text-inkSoft">
            {site.nap.city}, {site.nap.region}
          </p>
          <p className="text-inkSoft">
            <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a>
          </p>
        </div>
        <ul className="flex gap-6">
          <li>
            <a
              href="/privacy-policy"
              className="text-inkSoft hover:text-ink"
            >
              Privacy
            </a>
          </li>
          <li>
            <a
              href="/terms-conditions"
              className="text-inkSoft hover:text-ink"
            >
              Terms
            </a>
          </li>
          <li>
            <a
              href="/medical-disclaimer"
              className="text-inkSoft hover:text-ink"
            >
              Medical disclaimer
            </a>
          </li>
        </ul>
      </div>
    </footer>
  );
}
