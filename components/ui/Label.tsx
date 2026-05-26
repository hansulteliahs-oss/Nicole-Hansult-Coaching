/**
 * Label — design-2.md §3.5
 *
 * Section eyebrow. Per design-2.md §2.2:
 *   - ALWAYS text-grayDeep
 *   - NEVER text-inkSoft
 *
 * Uppercase, tracked, 11px Manrope semibold.
 */
import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';

export function Label({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <p
      className={cn(
        'text-grayDeep text-[11px] font-semibold uppercase tracking-[0.18em]',
        className,
      )}
    >
      {children}
    </p>
  );
}
