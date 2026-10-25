import Link from 'next/link';
import { cn } from '@/lib/cn';
import { formatRelativeTime } from '@/lib/format';
import type { OverallStatus } from '@/lib/status';
import type { MonitorRun } from '@/lib/types';
import { AutoRefresh } from './auto-refresh';
import { CheckRunnerNote } from './check-runner-note';

const TONE = {
  ok: { dot: 'text-ok', strip: 'bg-ok' },
  warn: { dot: 'text-warn', strip: 'bg-warn' },
  bad: { dot: 'text-bad', strip: 'bg-bad' },
  muted: { dot: 'text-muted', strip: 'bg-muted' },
  info: { dot: 'text-info', strip: 'bg-info' },
} as const;

function StatusDot({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 12 12" aria-hidden="true" className={cn('h-3 w-3 shrink-0', className)}>
      <circle cx="6" cy="6" r="6" fill="currentColor" />
    </svg>
  );
}

function Stat({
  label,
  value,
  hint,
  href,
}: {
  label: string;
  value: React.ReactNode;
  hint: string;
  href?: string;
}) {
  const body = (
    <>
      <p className="text-[15px] text-muted">{label}</p>
      <p className="mt-1 text-[24px] font-semibold leading-none tracking-[-0.02em]">{value}</p>
      <p className="mt-1 text-[15px] leading-snug text-muted">{hint}</p>
    </>
  );

  const className = cn(
    'fh-card border border-line bg-paper/60 p-4 transition-colors',
    href && 'hover:border-ink/25 hover:bg-paper',
  );

  return href ? (
    <Link href={href} className={className}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
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
    <section className="fh-panel overflow-hidden border border-line bg-surface">
      <div className="grid gap-7 p-5 sm:p-7 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)] lg:p-8">
        <div className="flex flex-col justify-center">
          <h1 className="flex items-start gap-3 text-balance text-[clamp(1.9rem,3.6vw,2.75rem)] font-semibold leading-[1.05] tracking-[-0.03em]">
            <span className="mt-2 sm:mt-2.5">
              <StatusDot className={tone.dot} />
            </span>
            <span>{overall.label}</span>
          </h1>

          <p className="mt-3 max-w-xl text-[17px] leading-relaxed text-muted">{overall.detail}</p>

          <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 text-[15px] text-muted">
            <AutoRefresh />
            <span className="h-4 w-px bg-line" aria-hidden="true" />
            <span>
              {overall.monitoredCount} of {overall.totalServices} services covered
            </span>
            <span className="h-4 w-px bg-line" aria-hidden="true" />
            <span>Checks every 5 min</span>
            <span className="h-4 w-px bg-line" aria-hidden="true" />
            <span>All times UTC</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 self-center">
          <Stat
            label="Monitored"
            value={
              <>
                {overall.monitoredCount}
                <span className="text-muted/60"> / {overall.totalServices}</span>
              </>
            }
            hint="services with an automated check"
            href="/services"
          />
          <Stat
            label="Open incidents"
            value={openIncidents}
            hint="being posted on the incident log"
            href="/incidents"
          />
          <Stat
            label="Last check"
            value={
              <span className="text-[18px] tracking-[-0.01em]">
                {formatRelativeTime(lastCheckAt ?? lastRun?.finished_at ?? lastRun?.started_at ?? null, now)}
              </span>
            }
            hint="most recent recorded heartbeat"
          />
          <Stat
            label="Fresh checks"
            value={
              <>
                {overall.freshCount}
                <span className="text-muted/60"> / {overall.monitoredCount}</span>
              </>
            }
            hint={overall.staleCount > 0 ? `${overall.staleCount} stale` : 'reporting on schedule'}
          />
        </div>
      </div>

      <div className={cn('h-1.5 w-full', tone.strip)} aria-hidden="true" />
      <div className="border-t border-line px-3 py-2.5 sm:px-5">
        <CheckRunnerNote lastRun={lastRun} now={now} className="border-0 bg-transparent px-1 py-0" />
      </div>
    </section>
  );
}
