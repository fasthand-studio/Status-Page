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
      className={cn('flex items-center gap-1', compact && 'w-full overflow-x-auto py-1.5 no-scrollbar')}
    >
      {ITEMS.map((item) => {
        const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'fh-pill-lg relative whitespace-nowrap transition-colors',
              active ? 'bg-lime font-semibold text-ink' : 'text-muted hover:bg-ink/[0.05] hover:text-ink',
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
