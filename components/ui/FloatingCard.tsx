/**
 * FloatingCard — design-2.md §3.6
 *
 * Hero-accent floating card. Image slot with placeholder-stripes fallback.
 * Children render as an absolutely-positioned overlay (e.g., "Featured by" badge).
 *
 * NOTE: <Image fill> requires the PARENT to set a defined height (e.g., h-[400px]
 * or aspect-[4/3]). FloatingCard itself is `relative` but does not impose a height —
 * consumers wrap it in a sized container.
 */
import Image from 'next/image';
import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';

export function FloatingCard({
  imageSrc,
  alt = '',
  className,
  children,
  objectFit = 'cover',
}: {
  imageSrc?: string;
  alt?: string;
  className?: string;
  children?: ReactNode;
  objectFit?: 'cover' | 'contain';
}) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl shadow-card bg-cardSoft h-full w-full',
        className,
      )}
    >
      {imageSrc ? (
        <Image
          src={imageSrc}
          alt={alt}
          fill
          quality={85}
          sizes="(max-width: 768px) 100vw, 50vw"
          className={objectFit === 'contain' ? 'object-contain' : 'object-cover'}
        />
      ) : (
        <div className="placeholder-stripes h-full w-full" />
      )}
      {children && (
        <div className="absolute inset-x-6 bottom-6">{children}</div>
      )}
    </div>
  );
}
