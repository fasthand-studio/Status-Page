'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/cn';

const ITEMS = [
  { href: '/admin', label: 'Overview' },
  { href: '/admin/incidents', label: 'Incidents' },
  { href: '/admin/services', label: 'Services' },
  { href: '/admin/monitors', label: 'Monitors' },
  { href: '/admin/maintenance', label: 'Maintenance' },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Admin sections" className="no-scrollbar -mx-1 flex gap-1 overflow-x-auto lg:flex-col">
      {ITEMS.map((item) => {
        const active =
          item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(`${item.href}/`) || pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'fh-pill-lg shrink-0 justify-start px-3 transition-colors',
              active
                ? 'bg-lime font-semibold text-ink'
                : 'font-medium text-muted hover:bg-ink/5 hover:text-ink',
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
