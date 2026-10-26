import Link from 'next/link';
import { formatDuration, formatShortDate } from '@/lib/format';
import type { IncidentWithRelations } from '@/lib/types';
import { ImpactBadge } from './incident-status-badge';

export function IncidentRow({
  incident,
  affectedServices,
  now,
}: {
  incident: IncidentWithRelations;
  affectedServices: string[];
  now: Date;
}) {
  const end = incident.resolved_at ? new Date(incident.resolved_at) : now;
  const duration = Math.max(0, (end.getTime() - new Date(incident.started_at).getTime()) / 1000);

  return (
    <Link
      href={`/incidents/${incident.id}`}
      className="grid grid-cols-[56px_minmax(0,1fr)_auto] items-center gap-x-3 border-b border-line px-3.5 py-2.5 transition-colors last:border-b-0 hover:bg-surface-soft"
    >
      <time
        dateTime={incident.resolved_at ?? incident.started_at}
        className="fh-num text-[11.5px] text-muted"
      >
        {formatShortDate(incident.resolved_at ?? incident.started_at)}
      </time>
      <div className="min-w-0">
        <p className="truncate text-[13px] font-medium">{incident.title}</p>
        <p className="truncate text-[11.5px] text-muted">
          {affectedServices.length > 0 ? affectedServices.join(' · ') : 'No services linked'}
          {incident.resolved_at ? '' : ' · ongoing'}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <span className="hidden sm:inline-flex">
          <ImpactBadge impact={incident.impact} />
        </span>
        <span className="fh-num w-14 text-right text-[11.5px] text-muted">
          {incident.resolved_at ? formatDuration(duration) : '—'}
        </span>
      </div>
    </Link>
  );
}
