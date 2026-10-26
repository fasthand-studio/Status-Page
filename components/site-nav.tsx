'use client';

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

  return (
    <nav
      aria-label="Status sections"
      className={cn(
        'flex items-stretch',
        compact ? 'gap-0.5 overflow-x-auto no-scrollbar' : 'h-full gap-5',
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
              'relative flex shrink-0 items-center whitespace-nowrap font-medium transition-colors',
              compact ? 'h-9 px-2 text-[12.5px]' : 'h-12 text-[13px]',
              active ? 'text-primary' : 'text-muted hover:text-ink',
            )}
          >
            {item.label}
            <span
              className={cn(
                'absolute inset-x-0 bottom-0 h-[2px] transition-colors',
                compact && 'inset-x-1.5',
                active ? 'bg-primary' : 'bg-transparent',
              )}
              aria-hidden="true"
            />
          </Link>
        );
      })}
    </nav>
  );
}
