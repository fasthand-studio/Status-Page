import Link from 'next/link';
import { formatRelativeTime, formatUptime } from '@/lib/format';
import type { ServiceHealth } from '@/lib/status';
import type { DailyBar, Service, UptimeWindow } from '@/lib/types';
import { ServiceIcon } from './service-icon';
import { StatusPill } from './status-pill';
import { UptimeBars } from './uptime-bars';

export function ServiceSummaryRow({
  service,
  health,
  bars,
  uptime,
  lastCheckAt,
  now,
}: {
  service: Service;
  health: ServiceHealth;
  bars: DailyBar[];
  uptime: UptimeWindow;
  lastCheckAt: string | null;
  now: Date;
}) {
  return (
    <Link
      href={`/services#service-${service.slug}`}
      className="group flex items-center gap-3 px-4 py-4 transition-colors hover:bg-ink/[0.025] sm:gap-4 sm:px-5"
    >
      <ServiceIcon slug={service.slug} />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-[16px] font-medium tracking-[-0.01em]">{service.name}</h3>
          <StatusPill state={health.state} size="sm" />
        </div>
        <p className="mt-1 truncate text-[15px] text-muted">{health.detail}</p>
      </div>

      <div className="hidden w-[150px] shrink-0 sm:block">
        <UptimeBars bars={bars} label={service.name} compact showLabels={false} />
      </div>

      <div className="hidden w-[74px] shrink-0 text-right md:block">
        <p className="font-sans text-[15px] text-ink/85">{formatUptime(uptime.percent)}</p>
        <p className="mt-0.5 font-sans text-[13px] text-muted">30 days</p>
      </div>

      <div className="hidden w-24 shrink-0 text-right lg:block">
        <p className="text-[15px] text-muted">
          {lastCheckAt ? formatRelativeTime(lastCheckAt, now) : 'No check'}
        </p>
      </div>
    </Link>
  );
}
