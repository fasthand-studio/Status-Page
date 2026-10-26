import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import type { OverallStatus } from '@/lib/status';
import type { MonitorRun } from '@/lib/types';
import { AutoRefresh } from './auto-refresh';
import { CheckRunnerNote } from './check-runner-note';

const TONE = {
  ok: 'text-ok',
  warn: 'text-warn',
  bad: 'text-bad',
  muted: 'text-muted',
  info: 'text-info',
} as const;

function StatusDot({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 12 12" aria-hidden="true" className={cn('h-2.5 w-2.5 shrink-0', className)}>
      <circle cx="6" cy="6" r="6" fill="currentColor" />
    </svg>
  );
}

function Fact({ label, value }: { label: string; value: ReactNode }) {
  return (
    <span className="inline-flex items-baseline gap-1">
      <span>{label}</span>
      <strong className="fh-num font-medium text-ink/80">{value}</strong>
    </span>
  );
}

export function StatusHero({
  overall,
  lastRun,
  lastCheckAt,
  openIncidents,
  now,
}: {
  overall: OverallStatus;
  lastRun: MonitorRun | null;
  lastCheckAt: string | null;
  openIncidents: number;
  now: Date;
}) {
  const tone = TONE[overall.tone];

  return (
    <section className="fh-panel border border-line bg-surface">
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2 px-4 py-3.5 sm:px-5">
        <div className="flex min-w-0 items-start gap-2.5">
          <StatusDot className={cn('mt-1.5', tone)} />
          <div className="min-w-0">
            <h1 className="text-[18px] font-semibold leading-tight tracking-[-0.01em]">
              {overall.label}
            </h1>
            {overall.detail && (
              <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-muted">{overall.detail}</p>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-0.5 text-[11.5px] text-muted sm:items-end">
          <AutoRefresh />
          <span>Checks every 5 min</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line px-4 py-2 text-[11.5px] text-muted sm:px-5">
        <Fact label="Monitored" value={`${overall.monitoredCount} / ${overall.totalServices}`} />
        <Fact label="Fresh" value={`${overall.freshCount} / ${overall.monitoredCount}`} />
        <Fact label="Stale" value={overall.staleCount} />
        <Fact label="Open incidents" value={openIncidents} />
      </div>

      <CheckRunnerNote
        lastRun={lastRun}
        now={now}
        lastCheckAt={lastCheckAt}
        className="border-t border-line px-4 py-2 sm:px-5"
      />
    </section>
  );
}
