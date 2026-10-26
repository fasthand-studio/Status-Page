import { Brand } from './brand';
import { SiteNav } from './site-nav';

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-line bg-paper">
      <div className="mx-auto flex h-12 max-w-[1100px] items-center gap-6 px-4 sm:px-6">
        <Brand />
        <div className="hidden h-full md:block">
          <SiteNav />
        </div>
        <span className="ml-auto hidden text-[14px] text-muted md:block">All times UTC</span>
      </div>
      <div className="border-t border-line md:hidden">
        <div className="mx-auto max-w-[1100px] px-2">
          <SiteNav compact />
        </div>
      </div>
    </header>
  );
}
