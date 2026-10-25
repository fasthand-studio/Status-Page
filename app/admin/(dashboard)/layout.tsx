import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { requireAdminContext } from '@/lib/auth';
import { AdminNav } from '@/components/admin/nav';
import { Brand } from '@/components/brand';
import { signOutAction } from '../actions';
import { secondaryButtonClass } from '@/components/admin/ui';
import { ArrowUpRightIcon, LogOutIcon } from '@/components/icons';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const context = await requireAdminContext();

  return (
    <div className="admin-shell min-h-screen bg-paper text-ink">
      <div className="mx-auto flex min-h-screen w-full max-w-[1400px] flex-col lg:flex-row">
        <aside className="flex shrink-0 flex-col gap-5 border-b border-line px-4 py-4 lg:w-56 lg:border-b-0 lg:border-r lg:px-5 lg:py-6">
          <Brand label="Ops" className="text-ink" markClassName="h-8 w-8" />

          <AdminNav />

          <div className="mt-auto hidden space-y-3 lg:block">
            <div className="fh-r-sm border border-line bg-surface p-3">
              <p className="text-[13px] text-muted">Signed in</p>
              <p className="mt-0.5 truncate text-[15px]">{context.email}</p>
            </div>
            <p className="px-1 text-[15px] leading-relaxed text-muted">
              Public numbers come from stored checks. Never publish an uptime figure you cannot point to
              in check_results.
            </p>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-2.5 lg:px-8">
            <p className="text-[15px] text-muted">FastHand ops desk</p>
            <div className="flex items-center gap-2">
              <Link href="/" target="_blank" className={secondaryButtonClass}>
                Public page
                <ArrowUpRightIcon className="h-4 w-4" />
              </Link>
              <form action={signOutAction}>
                <button type="submit" className={secondaryButtonClass}>
                  <LogOutIcon className="h-4 w-4" />
                  Sign out
                </button>
              </form>
            </div>
          </header>

          <main className="flex-1 px-4 py-6 lg:px-8 lg:py-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
