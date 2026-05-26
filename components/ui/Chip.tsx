/**
 * Chip — design-2.md §3.3
 *
 * Small inline badge with three tint/accent pairs (sky / orchid / gray).
 * Single component, tint chosen via prop (locked decision: see CONTEXT.md).
 *
 * Tint pairs (per design-2.md §3.3):
 *   - sky:    skySoft bg / skyDeep text
 *   - orchid: orchidSoft bg / orchidDeep text
 *   - gray:   graySurface bg / grayDeep text
 */
import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';

export type ChipTint = 'sky' | 'orchid' | 'gray';

const TINT_CLASSES: Record<ChipTint, string> = {
  sky: 'bg-skySoft text-skyDeep',
  orchid: 'bg-orchidSoft text-orchidDeep',
  gray: 'bg-graySurface text-grayDeep',
};

export function Chip({
  tint = 'gray',
  className,
  children,
}: {
  tint?: ChipTint;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-pill px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]',
        TINT_CLASSES[tint],
        className,
      )}
    >
      {children}
    </span>
  );
}
