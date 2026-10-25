import { Brand } from './brand';
import { SiteNav } from './site-nav';

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-line bg-paper">
      <div className="mx-auto flex h-14 max-w-[1180px] items-center gap-4 px-4 sm:px-6">
        <Brand />
        <div className="hidden md:block">
          <SiteNav />
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
