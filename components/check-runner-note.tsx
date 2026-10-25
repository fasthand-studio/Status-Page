import { cn } from '@/lib/cn';
import { formatDuration, formatRelativeTime } from '@/lib/format';
import type { MonitorRun } from '@/lib/types';
import { AlertIcon, ClockIcon, PlayIcon } from './icons';

export function CheckRunnerNote({
  lastRun,
  now,
  className,
}: {
  lastRun: MonitorRun | null;
  now: Date;
  className?: string;
}) {
  if (!lastRun) {
    return (
      <div
        className={cn(
          'flex flex-wrap items-center gap-2 fh-r-sm border border-line/80 bg-surface/60 px-4 py-3 text-[15px] text-muted',
          className,
        )}
      >
        <ClockIcon className="h-4 w-4" />
        <span>No automated check pass has been recorded yet. This page will stay honest until one runs.</span>
      </div>
    );
  }

  const reference = lastRun.finished_at ?? lastRun.started_at;
  const ageSeconds = Math.max(0, (now.getTime() - new Date(reference).getTime()) / 1000);
  const delayed = ageSeconds > 15 * 60;

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-x-4 gap-y-2 fh-r-sm border px-4 py-3 text-[15px]',
        delayed
          ? 'border-warn/30 bg-warn-soft/60 text-ink/80'
          : 'border-line/80 bg-surface/60 text-muted',
        className,
      )}
    >
      {delayed ? <AlertIcon className="h-4 w-4 text-warn" /> : <PlayIcon className="h-4 w-4" />}
      <span>
        {delayed ? 'Check runner delayed — last pass ' : 'Last runner pass '}
        <strong className={delayed ? 'font-medium text-warn' : 'font-medium text-ink/80'}>
          {formatRelativeTime(reference, now)}
        </strong>
      </span>
      <span className="hidden h-3 w-px bg-line sm:block" />
      <span>
        {lastRun.checks_run} checks · {lastRun.failures} failed
      </span>
      <span className="hidden h-3 w-px bg-line sm:block" />
      <span>{lastRun.source}</span>
      <span className="hidden h-3 w-px bg-line sm:block" />
      <span className="font-sans text-[13px]">pass took {formatDuration(Math.max(0, (new Date(lastRun.finished_at ?? reference).getTime() - new Date(lastRun.started_at).getTime()) / 1000))}</span>
    </div>
  );
}
