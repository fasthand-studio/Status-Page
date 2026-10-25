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
    <svg viewBox="0 0 12 12" aria-hidden="true" className={cn('h-3 w-3 shrink-0', className)}>
      <circle cx="6" cy="6" r="6" fill="currentColor" />
    </svg>
  );
}

function Fact({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <dt className="text-[13px] text-muted">{label}</dt>
      <dd className="mt-0.5 text-[17px] font-semibold leading-tight tracking-[-0.01em]">{value}</dd>
    </div>
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
    <section className="fh-panel border border-line bg-surface px-5 py-5 sm:px-6 sm:py-6">
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <h1 className="flex items-center gap-2.5 text-[clamp(1.4rem,2.4vw,1.85rem)] font-semibold leading-tight tracking-[-0.03em]">
            <StatusDot className={tone} />
            <span>{overall.label}</span>
          </h1>
          <p className="mt-2 max-w-2xl text-[17px] leading-relaxed text-muted">{overall.detail}</p>
        </div>
        <div className="flex flex-col gap-1 text-[15px] text-muted sm:items-end">
          <AutoRefresh />
          <span>Checks every 5 min · all times UTC</span>
        </div>
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3 border-t border-line pt-4 sm:grid-cols-4">
        <Fact
          label="Monitored"
          value={
            <>
              {overall.monitoredCount}
              <span className="font-normal text-muted/60"> / {overall.totalServices}</span>
            </>
          }
        />
        <Fact
          label="Fresh checks"
          value={
            <>
              {overall.freshCount}
              <span className="font-normal text-muted/60"> / {overall.monitoredCount}</span>
            </>
          }
        />
        <Fact label="Stale checks" value={overall.staleCount} />
        <Fact label="Open incidents" value={openIncidents} />
      </dl>

      <CheckRunnerNote
        lastRun={lastRun}
        now={now}
        lastCheckAt={lastCheckAt}
        className="mt-3"
      />
    </section>
  );
}
