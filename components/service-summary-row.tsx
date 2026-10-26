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
      className="group grid grid-cols-[20px_minmax(0,1fr)_auto] items-center gap-x-2.5 px-3.5 py-2.5 transition-colors sm:px-4 sm:py-3 hover:bg-surface-soft sm:grid-cols-[20px_minmax(0,1fr)_196px_84px] sm:px-5"
    >
      <ServiceIcon slug={service.slug} />

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <h3 className="truncate text-[17px] font-medium">{service.name}</h3>
          <StatusPill state={health.state} />
        </div>
        <p className="mt-0.5 truncate text-[14px] text-muted">
          {lastCheckAt ? `Checked ${formatRelativeTime(lastCheckAt, now)}` : health.detail}
        </p>
      </div>

      <div className="hidden sm:block">
        <UptimeBars bars={bars} label={service.name} compact showLabels={false} />
      </div>

      <div className="text-right">
        <p className="fh-num text-[15px] text-ink/85">{formatUptime(uptime.percent)}</p>
        <p className="text-[14px] text-muted">30d</p>
      </div>
    </Link>
  );
}
