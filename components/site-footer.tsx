import Link from 'next/link';
import { Brand } from './brand';
import { ArrowUpRightIcon } from './icons';

export function SiteFooter() {
  const year = new Date().getUTCFullYear();

  return (
    <footer className="mt-16 border-t border-line bg-surface/60">
      <div className="mx-auto max-w-[1180px] px-5 py-10 sm:px-6">
        <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Brand />
            <p className="mt-3 max-w-sm text-[15px] leading-relaxed text-muted">
              Every uptime figure on this page is calculated from stored checks. Services without a
              verified monitor stay grey and are never assumed healthy.
            </p>
          </div>
          <div>
            <p className="text-[15px] font-semibold">Status</p>
            <ul className="mt-2 space-y-1.5 text-[15px] text-muted">
              <li><Link className="hover:text-ink" href="/services">Services</Link></li>
              <li><Link className="hover:text-ink" href="/incidents">Incidents</Link></li>
              <li><Link className="hover:text-ink" href="/maintenance">Maintenance</Link></li>
              <li><Link className="hover:text-ink" href="/history">History</Link></li>
            </ul>
          </div>
          <div>
            <p className="text-[15px] font-semibold">Monitoring</p>
            <ul className="mt-2 space-y-1.5 text-[15px] text-muted">
              <li>Checks every 5 minutes</li>
              <li>Times shown in UTC</li>
              <li>Uptime from stored checks</li>
              <li>Stale data shown as unknown</li>
            </ul>
          </div>
          <div>
            <p className="text-[15px] font-semibold">FastHand</p>
            <ul className="mt-2 space-y-1.5 text-[15px] text-muted">
              <li>
                <a
                  className="inline-flex items-center gap-1 hover:text-ink"
                  href="https://fasthandstudio.asia"
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  fasthandstudio.asia
                  <ArrowUpRightIcon className="h-3.5 w-3.5" />
                </a>
              </li>
              <li><Link className="hover:text-ink" href="/admin/login">Operations desk</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-8 flex flex-col gap-2 border-t border-line pt-4 text-[15px] text-muted sm:flex-row sm:items-center sm:justify-between">
          <span>© {year} FastHand Studio</span>
          <span>Automated checks, not assumptions.</span>
        </div>
      </div>
    </footer>
  );
}
