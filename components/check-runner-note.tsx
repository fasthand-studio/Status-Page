import { cn } from '@/lib/cn';
import { formatDuration, formatRelativeTime } from '@/lib/format';
import type { MonitorRun } from '@/lib/types';

export function CheckRunnerNote({
  lastRun,
  lastCheckAt,
  now,
  className,
}: {
  lastRun: MonitorRun | null;
  lastCheckAt?: string | null;
  now: Date;
  className?: string;
}) {
  if (!lastRun) {
    return (
      <p className={cn('text-[15px] leading-relaxed text-muted', className)}>
        No automated check pass has been recorded yet. This page will stay honest until one runs.
      </p>
    );
  }

  const reference = lastRun.finished_at ?? lastRun.started_at;
  const ageSeconds = Math.max(0, (now.getTime() - new Date(reference).getTime()) / 1000);
  const delayed = ageSeconds > 15 * 60;
  const duration = formatDuration(
    Math.max(
      0,
      (new Date(lastRun.finished_at ?? reference).getTime() - new Date(lastRun.started_at).getTime()) / 1000,
    ),
  );

  return (
    <p className={cn('text-[15px] leading-relaxed', delayed ? 'text-warn' : 'text-muted', className)}>
      {lastCheckAt ? (
        <>
          Last check{' '}
          <strong className="font-medium text-ink/80">{formatRelativeTime(lastCheckAt, now)}</strong>
          <span aria-hidden="true"> · </span>
        </>
      ) : null}
      {delayed ? 'runner delayed — last pass ' : 'runner pass '}
      <strong className={cn('font-medium', delayed ? 'text-warn' : 'text-ink/80')}>
        {formatRelativeTime(reference, now)}
      </strong>
      <span aria-hidden="true"> · </span>
      {lastRun.source}
      <span aria-hidden="true"> · </span>
      {lastRun.checks_run} check{lastRun.checks_run === 1 ? '' : 's'},{' '}
      {lastRun.failures} failure{lastRun.failures === 1 ? '' : 's'}
      <span aria-hidden="true"> · </span>
      took {duration}
    </p>
  );
}
