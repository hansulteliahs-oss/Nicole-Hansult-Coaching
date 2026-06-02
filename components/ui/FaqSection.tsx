/**
 * FaqSection — accessible FAQ accordion.
 *
 * Uses native <details>/<summary> so it works without client JS and is
 * keyboard- and screen-reader-friendly out of the box. Styled to match the
 * card system (rounded-2xl, bg-card, border-inkFaint).
 */
import { cn } from '@/lib/cn';

import type { Faq } from '@/lib/content/faqs';

export function FaqSection({
  items,
  heading = 'Frequently Asked Questions',
  className,
}: {
  items: ReadonlyArray<Faq>;
  heading?: string;
  className?: string;
}) {
  return (
    <section className={cn('space-y-6', className)}>
      <h2 className="text-ink text-2xl font-light">{heading}</h2>
      <div className="space-y-3">
        {items.map((faq) => (
          <details
            key={faq.question}
            className="group rounded-2xl bg-card border border-inkFaint px-6 py-5"
          >
            <summary className="flex cursor-pointer items-center justify-between gap-4 list-none text-ink text-lg font-light [&::-webkit-details-marker]:hidden">
              <span>{faq.question}</span>
              <span className="shrink-0 text-grayDeep text-2xl leading-none transition-transform duration-200 group-open:rotate-45">
                +
              </span>
            </summary>
            <p className="mt-4 text-inkSoft text-base leading-relaxed">{faq.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
