'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/cn';

const ITEMS = [
  { href: '/', label: 'Status' },
  { href: '/services', label: 'Services' },
  { href: '/incidents', label: 'Incidents' },
  { href: '/maintenance', label: 'Maintenance' },
  { href: '/history', label: 'History' },
];

export function SiteNav({ compact = false }: { compact?: boolean }) {
  const pathname = usePathname();
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const nav = navRef.current;
    const active = nav?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!compact || !nav || !active) return;
    nav.scrollLeft = active.offsetLeft - (nav.clientWidth - active.clientWidth) / 2;
  }, [compact, pathname]);

  return (
    <nav
      ref={navRef}
      aria-label="Status sections"
      className={cn(
        'flex items-center',
        compact ? 'gap-0.5 overflow-x-auto no-scrollbar' : 'gap-1.5',
      )}
    >
      {ITEMS.map((item) => {
        const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'fh-pill-lg shrink-0 justify-center transition-colors',
              compact ? 'px-2 text-[14px]' : 'px-3',
              active
                ? 'bg-primary/[0.08] text-primary'
                : 'bg-transparent text-muted hover:bg-surface-soft hover:text-ink',
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
