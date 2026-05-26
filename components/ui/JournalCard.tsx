/**
 * JournalCard — design-2.md §3.10
 *
 * Insights/journal post card with image, category chip, date, title.
 * Whole card is a link. Hover lifts shadow + tints title skyDeep.
 *
 * Image uses `aspect-[4/3]` so the parent doesn't need to set a height.
 */
import Image from 'next/image';

import { cn } from '@/lib/cn';

import { Chip } from './Chip';

export function JournalCard({
  title,
  category,
  date,
  imageSrc,
  href,
  className,
}: {
  title: string;
  category: string;
  date: string;
  imageSrc?: string;
  href: string;
  className?: string;
}) {
  return (
    <a
      href={href}
      className={cn(
        'group block rounded-2xl bg-card overflow-hidden border border-inkFaint',
        'hover:shadow-card transition-shadow duration-180',
        className,
      )}
    >
      <div className="relative aspect-[4/3] w-full">
        {imageSrc ? (
          <Image
            src={imageSrc}
            alt=""
            fill
            quality={75}
            sizes="(max-width: 768px) 100vw, 33vw"
            className="object-cover"
          />
        ) : (
          <div className="placeholder-stripes h-full w-full" />
        )}
      </div>
      <div className="p-6 space-y-3">
        <div className="flex items-center gap-3">
          <Chip tint="sky">{category}</Chip>
          <span className="text-grayDeep text-xs">{date}</span>
        </div>
        <h3 className="text-ink text-lg font-medium leading-snug group-hover:text-skyDeep">
          {title}
        </h3>
      </div>
    </a>
  );
}
