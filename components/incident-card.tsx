import Link from 'next/link';
import { cn } from '@/lib/cn';
import { formatDateTime, formatDuration, formatRelativeTime, markdownExcerpt } from '@/lib/format';
import { latestIncidentUpdate } from '@/lib/status';
import type { IncidentWithRelations } from '@/lib/types';
import { ImpactBadge, IncidentStatusBadge } from './incident-status-badge';

const ACCENT: Record<string, string> = {
  critical: 'bg-bad',
  major: 'bg-bad/80',
  minor: 'bg-warn',
  none: 'bg-line',
};

export function IncidentCard({
  incident,
  affectedServices,
  now,
}: {
  incident: IncidentWithRelations;
  affectedServices: string[];
  now: Date;
}) {
  const open = incident.resolved_at === null;
  const latest = latestIncidentUpdate(incident);
  const end = incident.resolved_at ? new Date(incident.resolved_at) : now;
  const duration = Math.max(0, (end.getTime() - new Date(incident.started_at).getTime()) / 1000);

  return (
    <article className="relative fh-card border border-line bg-surface p-5 transition-colors hover:border-ink/20 sm:p-6">
      <span
        className={cn('absolute inset-y-5 left-0 w-[3px] fh-bar', ACCENT[incident.impact])}
        aria-hidden="true"
      />

      <div className="flex flex-wrap items-center gap-2">
        <IncidentStatusBadge status={incident.status} />
        <ImpactBadge impact={incident.impact} />
        {incident.auto_detected && (
          <span className="fh-round border border-dashed border-line px-2 py-[3px] font-sans text-[13px] text-muted">
            Automated
          </span>
        )}
        <time
          dateTime={incident.started_at}
          className="ml-auto font-sans text-[13px] text-muted"
        >
          {formatDateTime(incident.started_at)}
        </time>
      </div>

      <h3 className="mt-3 font-sans text-[19px] font-semibold leading-tight tracking-[-0.03em]">
        <Link href={`/incidents/${incident.id}`} className="hover:underline decoration-primary-deep decoration-2 underline-offset-4">
          {incident.title}
        </Link>
      </h3>

      {latest && (
        <p className="mt-2 line-clamp-2 max-w-3xl text-[15px] leading-relaxed text-muted">
          {markdownExcerpt(latest.body, 220)}
        </p>
      )}

      {affectedServices.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {affectedServices.map((name) => (
            <span
              key={name}
              className="fh-round border border-line bg-paper/60 px-2 py-0.5 font-sans text-[13px] text-muted"
            >
              {name}
            </span>
          ))}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line/70 pt-3">
        <span className="text-[15px] text-muted">
          {open ? (
            <>Ongoing for {formatDuration(duration)}</>
          ) : (
            <>
              Resolved {formatRelativeTime(incident.resolved_at, now)} · lasted {formatDuration(duration)}
            </>
          )}
        </span>
        <Link
          href={`/incidents/${incident.id}`}
          className="font-sans text-[13px] text-ink underline decoration-primary-deep decoration-2 underline-offset-4 hover:opacity-70"
        >
          Read updates →
        </Link>
      </div>
    </article>
  );
}
