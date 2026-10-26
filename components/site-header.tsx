import { Brand } from './brand';
import { SiteNav } from './site-nav';

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-line bg-paper">
      <div className="mx-auto flex h-12 max-w-[1100px] items-center gap-4 px-4 sm:gap-6 sm:px-6">
        <Brand className="shrink-0" />
        <div className="hidden min-w-0 md:block">
          <SiteNav />
        </div>
        <span className="ml-auto hidden shrink-0 text-[14px] text-muted lg:block">All times UTC</span>
      </div>
      <div className="border-t border-line md:hidden">
        <div className="mx-auto max-w-[1100px] px-2 py-1">
          <SiteNav compact />
        </div>
      </div>
    </header>
  );
}
