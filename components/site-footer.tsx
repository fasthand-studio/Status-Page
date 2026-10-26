import Link from 'next/link';
import { Brand } from './brand';
import { ArrowUpRightIcon } from './icons';

export function SiteFooter() {
  const year = new Date().getUTCFullYear();

  return (
    <footer className="mt-10 border-t border-line">
      <div className="mx-auto max-w-[1100px] px-4 py-6 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-sm">
            <Brand />
            <p className="mt-2 text-[12px] leading-relaxed text-muted">
              Uptime is calculated from stored checks. Services without a verified monitor stay grey
              and are never assumed healthy.
            </p>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-1.5 text-[12px] text-muted">
            <Link className="hover:text-ink" href="/services">Services</Link>
            <Link className="hover:text-ink" href="/incidents">Incidents</Link>
            <Link className="hover:text-ink" href="/maintenance">Maintenance</Link>
            <Link className="hover:text-ink" href="/history">History</Link>
            <a
              className="inline-flex items-center gap-0.5 hover:text-ink"
              href="https://fasthandstudio.asia"
              target="_blank"
              rel="noreferrer noopener"
            >
              FastHand Studio
              <ArrowUpRightIcon className="h-3 w-3" />
            </a>
            <Link className="hover:text-ink" href="/admin/login">Operations desk</Link>
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-1 border-t border-line pt-3 text-[12px] text-muted sm:flex-row sm:items-center sm:justify-between">
          <span>© {year} FastHand Studio</span>
          <span>Checks every 5 minutes · all times UTC</span>
        </div>
      </div>
    </footer>
  );
}
