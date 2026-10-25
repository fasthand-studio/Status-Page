import Link from 'next/link';
import { Brand } from './brand';
import { LockIcon } from './icons';
import { SiteNav } from './site-nav';

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-line bg-paper">
      <div className="mx-auto flex h-14 max-w-[1180px] items-center gap-4 px-4 sm:px-6">
        <Brand />
        <div className="hidden md:block">
          <SiteNav />
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Link href="/admin/login" className="fh-btn border border-line bg-surface px-3">
            <LockIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Admin</span>
          </Link>
        </div>
      </div>
      <div className="border-t border-line md:hidden">
        <div className="mx-auto max-w-[1180px] px-2">
          <SiteNav compact />
        </div>
      </div>
    </header>
  );
}
