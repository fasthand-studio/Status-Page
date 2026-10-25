import type { Metadata } from 'next';
import Link from 'next/link';
import { ImpactBadge } from '@/components/incident-status-badge';
import { Markdown } from '@/components/markdown';
import { PageHeader } from '@/components/page-header';
import { SetupNotice } from '@/components/setup-notice';
import { getHistory, getServiceDirectory } from '@/lib/data';
import {
  formatDateTime,
  formatDuration,
  formatMonthLabel,
  formatShortDate,
  formatWindow,
  markdownExcerpt,
} from '@/lib/format';
import type { IncidentWithRelations, MaintenanceWithServices } from '@/lib/types';

export const metadata: Metadata = {
  title: 'History',
  description: 'The full public incident and maintenance archive for FastHand services.',
};

export default async function HistoryPage() {
  const history = await getHistory();

  if (!history.configured) {
    return (
      <div className="mx-auto max-w-[1180px] px-4 pt-6 sm:px-6">
        <PageHeader
          title="History"
          description="The public archive starts after Supabase is connected. Nothing is backfilled or invented."
        />
        <div className="mt-6">
          <SetupNotice />
        </div>
      </div>
    );
  }

  const services = await getServiceDirectory();
  const serviceById = new Map(services.map((service) => [service.id, service]));

  const byMonth = new Map<string, IncidentWithRelations[]>();
  for (const incident of history.incidents) {
    const key = formatMonthLabel(incident.resolved_at ?? incident.started_at);
    const bucket = byMonth.get(key) ?? [];
    bucket.push(incident);
    byMonth.set(key, bucket);
  }

  const pastMaintenance = history.maintenance
    .filter((window) => window.status === 'completed' || window.status === 'cancelled' || new Date(window.scheduled_end) < new Date())
    .sort((a, b) => +new Date(b.scheduled_start) - +new Date(a.scheduled_start));

  const totalEvents = history.incidents.length + pastMaintenance.length;

  return (
    <div className="mx-auto max-w-[1180px] px-4 pb-8 pt-6 sm:px-6">
      <PageHeader
        title="History"
        description="A permanent public record of incidents and maintenance. The archive begins when this status page started recording — earlier gaps are left empty, not filled in."
        aside={
          <div className="fh-card border border-line bg-surface px-5 py-4">
            <p className="font-sans text-[13px] text-muted">Recorded</p>
            <p className="mt-1 font-sans text-[22px] font-semibold leading-none tracking-[-0.04em]">
              {totalEvents}
            </p>
            <p className="mt-1 text-[13px] text-muted">events in the archive</p>
          </div>
        }
      />

      {totalEvents === 0 ? (
        <div className="mt-8 fh-panel border border-dashed border-line bg-surface/50 px-6 py-14 text-center">
          <p className="font-sans text-[20px] font-semibold tracking-[-0.03em]">Nothing archived yet.</p>
          <p className="mx-auto mt-2 max-w-md text-[15px] leading-relaxed text-muted">
            Resolved incidents and completed maintenance windows will appear here. Until then, an empty
            archive means exactly that.
          </p>
        </div>
      ) : (
        <div className="mt-7 space-y-8">
          {history.incidents.length > 0 && (
            <section>
              <h2 className="font-sans text-[13px] text-muted">Incidents</h2>
              <div className="mt-3 space-y-6">
                {[...byMonth.entries()].map(([month, incidents]) => (
                  <div key={month}>
                    <h3 className="mb-2 px-1 font-sans text-[17px] font-semibold tracking-[-0.03em] text-ink/80">
                      {month}
                    </h3>
                    <div className="overflow-hidden fh-panel border border-line bg-surface">
                      {incidents.map((incident) => {
                        const affected = incident.incident_services
                          .map((row) => serviceById.get(row.service_id)?.name)
                          .filter((name): name is string => Boolean(name));
                        const duration = incident.resolved_at
                          ? Math.max(
                              0,
                              (new Date(incident.resolved_at).getTime() - new Date(incident.started_at).getTime()) / 1000,
                            )
                          : 0;

                        return (
                          <Link
                            key={incident.id}
                            href={`/incidents/${incident.id}`}
                            className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line/60 px-4 py-4 transition-colors last:border-b-0 hover:bg-ink/[0.025] sm:px-5"
                          >
                            <span className="w-14 shrink-0 font-sans text-[13px] text-muted">
                              {formatShortDate(incident.resolved_at ?? incident.started_at)}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[17px] font-medium">{incident.title}</p>
                              <p className="mt-0.5 truncate text-[15px] text-muted">
                                {affected.length > 0 ? affected.join(' · ') : 'No services linked'}
                              </p>
                            </div>
                            <ImpactBadge impact={incident.impact} size="sm" />
                            <span className="w-20 text-right font-sans text-[13px] text-muted">
                              {formatDuration(duration)}
                            </span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {pastMaintenance.length > 0 && (
            <section>
              <h2 className="font-sans text-[13px] text-muted">
                Maintenance
              </h2>
              <div className="mt-3 overflow-hidden fh-panel border border-line bg-surface">
                {pastMaintenance.map((window) => (
                  <MaintenanceArchiveRow key={window.id} window={window} serviceById={serviceById} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function MaintenanceArchiveRow({
  window,
  serviceById,
}: {
  window: MaintenanceWithServices;
  serviceById: Map<string, { id: string; name: string; slug: string }>;
}) {
  const affected = window.maintenance_services
    .map((row) => serviceById.get(row.service_id)?.name)
    .filter((name): name is string => Boolean(name));

  return (
    <details className="group border-b border-line/60 last:border-b-0">
      <summary className="flex cursor-pointer flex-wrap items-center gap-x-4 gap-y-2 px-4 py-4 list-none transition-colors hover:bg-ink/[0.025] sm:px-5 [&::-webkit-details-marker]:hidden">
        <span className="w-14 shrink-0 font-sans text-[13px] text-muted">
          {formatShortDate(window.scheduled_start)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[17px] font-medium">{window.title}</p>
          <p className="mt-0.5 truncate text-[15px] text-muted">
            {formatWindow(window.scheduled_start, window.scheduled_end)}
          </p>
        </div>
        <span className="fh-round border border-line px-2 py-0.5 font-sans text-[13px] text-muted">
          {window.status === 'completed' ? 'Completed' : window.status === 'cancelled' ? 'Cancelled' : 'Ended'}
        </span>
        <span className="font-sans text-[13px] text-muted group-open:hidden">Open</span>
        <span className="hidden font-sans text-[13px] text-muted group-open:inline">Close</span>
      </summary>
      <div className="border-t border-line/60 bg-paper/40 px-4 py-4 sm:px-5">
        <p className="font-sans text-[13px] text-muted">
          Recorded {formatDateTime(window.created_at)}
        </p>
        {window.body ? (
          <Markdown className="mt-2 max-w-3xl">{window.body}</Markdown>
        ) : (
          <p className="mt-2 text-[15px] text-muted">
            No notes were attached beyond the window itself.
          </p>
        )}
        {affected.length > 0 && (
          <p className="mt-3 text-[15px] text-muted">
            {markdownExcerpt(affected.join(', '), 200)} affected.
          </p>
        )}
      </div>
    </details>
  );
}
