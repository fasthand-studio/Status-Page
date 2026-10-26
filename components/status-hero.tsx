import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import type { OverallStatus } from '@/lib/status';
import type { MonitorRun } from '@/lib/types';
import { AutoRefresh } from './auto-refresh';
import { CheckRunnerNote } from './check-runner-note';
import { AlertIcon, CheckIcon, CrossIcon, MinusIcon, WrenchIcon } from './icons';

const TONE = {
  ok: 'text-ok',
  warn: 'text-warn',
  bad: 'text-bad',
  muted: 'text-muted',
  info: 'text-info',
} as const;

const ICON = {
  ok: CheckIcon,
  warn: AlertIcon,
  bad: CrossIcon,
  muted: MinusIcon,
  info: WrenchIcon,
} as const;

function StatusIcon({ tone, className }: { tone: keyof typeof ICON; className?: string }) {
  const Icon = ICON[tone];
  return <Icon aria-hidden="true" strokeWidth={2.4} className={className} />;
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
    <section className="fh-panel border border-line bg-surface-soft">
      <div className="px-4 py-7 text-center sm:px-6">
        <StatusIcon tone={overall.tone} className={cn('mx-auto h-7 w-7', tone)} />
        <h2 className="mt-2.5 text-[20px] font-semibold leading-tight tracking-[-0.01em]">
          {overall.label}
        </h2>
        {overall.detail && (
          <p className="mx-auto mt-2 max-w-[520px] text-[15px] leading-relaxed text-muted">
            {overall.detail}
          </p>
        )}
        <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[14px] text-muted">
          <AutoRefresh />
          <span>Checks every 5 min</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 border-t border-line px-4 py-2 text-[14px] text-muted sm:px-5">
        <Fact label="Monitored" value={`${overall.monitoredCount} / ${overall.totalServices}`} />
        <Fact label="Fresh" value={`${overall.freshCount} / ${overall.monitoredCount}`} />
        <Fact label="Stale" value={overall.staleCount} />
        <Fact label="Open incidents" value={openIncidents} />
      </div>

      <CheckRunnerNote
        lastRun={lastRun}
        now={now}
        lastCheckAt={lastCheckAt}
        className="border-t border-line px-4 py-2 text-center sm:px-5"
      />
    </section>
  );
}
