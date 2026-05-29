/**
 * Nav — design-2.md §3.11 + §6
 *
 * Single client component (locked decision: see CONTEXT.md — do NOT split
 * into a server wrapper + client menu).
 *
 *   Desktop (≥768): floating pill chrome over hero, links + "Book a call" Pill.
 *   Mobile  (<768): top bar with logo + Menu button → full-screen pill menu.
 *
 * Mobile menu open/close is state in this component (useState). No framer-motion
 * — CSS transitions only per design-2.md §7.
 */
'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

import { cn } from '@/lib/cn';
import { createClient } from '@/lib/supabase/client';

const LOGO_SRC = '/images/nicolehansult-logo-edit.png';
const LOGO_ALT = 'Nicole Hansult';

const LINKS = [
  { label: 'About', href: '/about' },
  { label: 'Services', href: '/#services' },
  { label: 'Testimonials', href: '/testimonials' },
  { label: 'Insights', href: '/insights' },
  { label: 'Contact', href: '/contact' },
];

function isActive(pathname: string, href: string): boolean {
  if (href === '/#services') return false;
  return pathname === href;
}

export function Nav({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Auth-aware login control: while a session exists, the button reads
  // "Account" → /account and stays that way (onAuthStateChange keeps it in
  // sync across login/logout and reloads). UI-only — real gating is the
  // server proxy. getSession (cookie read) is sufficient here.
  const [loggedIn, setLoggedIn] = useState(false);
  useEffect(() => {
    const supabase = createClient();
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active) setLoggedIn(!!data.session);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setLoggedIn(!!session);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const accountHref = loggedIn ? '/account' : '/login';
  const accountLabel = loggedIn ? 'Account' : 'Login';

  return (
    <>
      {/* Desktop — floating pill */}
      <nav
        className={cn(
          'hidden md:flex fixed top-6 left-1/2 -translate-x-1/2 z-40',
          'items-center gap-1 rounded-pill bg-card/85 backdrop-blur px-2 py-2 shadow-card border border-inkFaint',
          className,
        )}
        aria-label="Primary"
      >
        <ul className="flex items-center">
          {LINKS.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                className={cn(
                  'px-3 py-2 text-ink text-sm hover:text-skyDeep transition-colors whitespace-nowrap',
                  isActive(pathname, l.href) ? 'font-semibold' : 'font-normal',
                )}
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* Desktop — floating Logo top-left */}
      <Link
        href="/"
        className="hidden md:flex fixed top-4 left-6 z-40 items-center rounded-pill bg-card/85 backdrop-blur border border-inkFaint shadow-card px-4 py-2"
        aria-label={LOGO_ALT}
      >
        <Image
          src={LOGO_SRC}
          alt={LOGO_ALT}
          width={1107}
          height={863}
          priority
          className="h-16 w-auto"
        />
      </Link>

      {/* Desktop — floating Login/Account top-right */}
      <Link
        href={accountHref}
        className="hidden md:inline-flex fixed top-6 right-6 z-40 items-center rounded-pill bg-card/85 backdrop-blur border border-inkFaint shadow-card px-4 py-2 text-ink text-sm hover:text-skyDeep transition-colors"
      >
        {accountLabel}
      </Link>

      {/* Mobile — top bar */}
      <div className="md:hidden fixed top-0 inset-x-0 z-40 flex items-center justify-between px-5 py-4 bg-bg/85 backdrop-blur">
        <Link href="/" className="flex items-center" aria-label={LOGO_ALT}>
          <Image
            src={LOGO_SRC}
            alt={LOGO_ALT}
            width={1107}
            height={863}
            priority
            className="h-12 w-auto"
          />
        </Link>
        <button
          type="button"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          onClick={() => setOpen(!open)}
          className="rounded-pill border border-ink px-4 py-2 text-ink text-xs font-semibold"
        >
          {open ? 'Close' : 'Menu'}
        </button>
      </div>

      {/* Mobile — full-screen menu */}
      {open && (
        <div className="md:hidden fixed inset-0 z-30 bg-bg pt-20 px-6 flex flex-col gap-2">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className={cn(
                'rounded-pill border border-inkFaint px-6 py-4 text-ink text-base',
                isActive(pathname, l.href) ? 'font-semibold' : 'font-medium',
              )}
            >
              {l.label}
            </Link>
          ))}
          <Link
            href={accountHref}
            onClick={() => setOpen(false)}
            className={cn(
              'rounded-pill border border-inkFaint px-6 py-4 text-ink text-base',
              isActive(pathname, accountHref) ? 'font-semibold' : 'font-medium',
            )}
          >
            {accountLabel}
          </Link>
        </div>
      )}
    </>
  );
}
