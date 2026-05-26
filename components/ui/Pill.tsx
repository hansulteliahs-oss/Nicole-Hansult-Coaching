/**
 * Pill — design-2.md §3.2
 *
 * Single component, 7 variants × 3 sizes via props (locked decision: see CONTEXT.md).
 * Renders <a> when `href` is provided, <button> otherwise.
 * All chrome derives from Mist @theme tokens — no inline styles.
 */
import type { ButtonHTMLAttributes, AnchorHTMLAttributes, ReactNode } from 'react';

import { cn } from '@/lib/cn';

export type PillVariant =
  | 'dark'
  | 'light'
  | 'ghost'
  | 'sky'
  | 'orchid'
  | 'gray'
  | 'grayG';

export type PillSize = 'sm' | 'md' | 'lg';

const VARIANT_CLASSES: Record<PillVariant, string> = {
  dark: 'bg-ink text-bg border border-transparent hover:bg-ink/90',
  light: 'bg-card text-ink border border-inkFaint hover:bg-cardSoft',
  ghost: 'bg-transparent text-ink border border-ink hover:bg-ink hover:text-bg',
  sky: 'bg-sky text-ink border border-transparent hover:bg-skyDeep hover:text-bg',
  orchid: 'bg-orchid text-white border border-transparent hover:bg-orchidDeep',
  gray: 'bg-gray text-card border border-transparent hover:bg-grayDeep',
  // grayG uses inkFaint as the border tint (closest Mist token to design-2.md's "rgba(142,138,148,0.4)").
  grayG:
    'bg-transparent text-grayDeep border border-inkFaint hover:bg-graySurface',
};

const SIZE_CLASSES: Record<PillSize, string> = {
  sm: 'px-[18px] py-[10px] text-[13px]',
  md: 'px-[26px] py-[16px] text-[14px]',
  lg: 'px-[32px] py-[20px] text-[15px]',
};

type PillBaseProps = {
  variant?: PillVariant;
  size?: PillSize;
  className?: string;
  children: ReactNode;
};

type PillAsButton = PillBaseProps & {
  href?: undefined;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'children'>;

type PillAsLink = PillBaseProps & {
  href: string;
} & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'className' | 'children' | 'href'>;

export function Pill(props: PillAsButton | PillAsLink) {
  const { variant = 'dark', size = 'md', className, children, ...rest } = props;
  const classes = cn(
    'inline-flex items-center justify-center gap-3 rounded-pill font-semibold tracking-[0.01em]',
    'transition-colors duration-180 ease-out',
    'focus-visible:outline-2 focus-visible:outline-skyDeep focus-visible:outline-offset-2',
    VARIANT_CLASSES[variant],
    SIZE_CLASSES[size],
    className,
  );

  if ('href' in props && props.href) {
    return (
      <a
        className={classes}
        href={props.href}
        {...(rest as AnchorHTMLAttributes<HTMLAnchorElement>)}
      >
        {children}
      </a>
    );
  }

  return (
    <button
      className={classes}
      {...(rest as ButtonHTMLAttributes<HTMLButtonElement>)}
    >
      {children}
    </button>
  );
}
