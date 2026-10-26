import Link from 'next/link';
import { formatDateTime, formatDuration, formatRelativeTime, markdownExcerpt } from '@/lib/format';
import { latestIncidentUpdate } from '@/lib/status';
import type { IncidentWithRelations } from '@/lib/types';
import { ImpactBadge, IncidentStatusBadge } from './incident-status-badge';

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
    <article className="fh-card border border-line bg-surface px-4 py-3 transition-colors hover:border-line-strong">
      <h3 className="text-[17px] font-semibold leading-snug">
        <Link href={`/incidents/${incident.id}`} className="hover:text-primary">
          {incident.title}
        </Link>
      </h3>

      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
        <IncidentStatusBadge status={incident.status} />
        <ImpactBadge impact={incident.impact} />
        {incident.auto_detected && (
          <span className="text-[14px] text-muted">Automated</span>
        )}
        <time dateTime={incident.started_at} className="fh-num ml-auto text-[14px] text-muted">
          {formatDateTime(incident.started_at)}
        </time>
      </div>

      {latest && (
        <p className="mt-1 line-clamp-2 max-w-3xl text-[15px] leading-relaxed text-muted">
          {markdownExcerpt(latest.body, 220)}
        </p>
      )}

      {affectedServices.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {affectedServices.map((name) => (
            <span
              key={name}
              className="fh-pill border border-line bg-surface text-muted"
            >
              {name}
            </span>
          ))}
        </div>
      )}

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-2 text-[14px] text-muted">
        <span className="fh-num">
          {open ? (
            <>Ongoing for {formatDuration(duration)}</>
          ) : (
            <>Resolved {formatRelativeTime(incident.resolved_at, now)} · lasted {formatDuration(duration)}</>
          )}
        </span>
        <Link href={`/incidents/${incident.id}`} className="font-medium text-primary hover:underline">
          Read updates
        </Link>
      </div>
    </article>
  );
}
