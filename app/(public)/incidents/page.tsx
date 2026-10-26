import type { Metadata } from 'next';
import { DataError } from '@/components/data-error';
import { IncidentCard } from '@/components/incident-card';
import { IncidentRow } from '@/components/incident-row';
import { PageHeader } from '@/components/page-header';
import { SectionHeading } from '@/components/section-heading';
import { SetupNotice } from '@/components/setup-notice';
import { getStatusSnapshot } from '@/lib/data';
import { formatMonthLabel, formatRelativeTime } from '@/lib/format';
import type { IncidentWithRelations } from '@/lib/types';

export const metadata: Metadata = {
  title: 'Incidents',
  description: 'Active FastHand incidents and recent resolutions with public timelines.',
};

const IMPACT_ORDER = { critical: 4, major: 3, minor: 2, none: 1 } as const;

export default async function IncidentsPage() {
  const snapshot = await getStatusSnapshot();
  const now = new Date();

  if (snapshot.error) {
    return (
      <div className="mx-auto max-w-[1100px] px-4 pt-4 sm:px-6">
        <PageHeader title="Incidents" description="Active and recently resolved incidents." />
        <div className="mt-4">
          <DataError description={snapshot.error} />
        </div>
      </div>
    );
  }

  if (!snapshot.configured) {
    return (
      <div className="mx-auto max-w-[1100px] px-4 pt-4 sm:px-6">
        <PageHeader
          title="Incidents"
          description="Incident history starts after the monitoring database is connected."
        />
        <div className="mt-4">
          <SetupNotice />
        </div>
      </div>
    );
  }

  const serviceById = new Map(snapshot.services.map((service) => [service.id, service]));
  const affected = (incident: IncidentWithRelations) =>
    incident.incident_services
      .map((row) => serviceById.get(row.service_id)?.name)
      .filter((name): name is string => Boolean(name));

  const active = [...snapshot.openIncidents].sort(
    (a, b) => IMPACT_ORDER[b.impact] - IMPACT_ORDER[a.impact] || +new Date(b.started_at) - +new Date(a.started_at),
  );
  const resolved = snapshot.recentIncidents;

  const resolvedByMonth = new Map<string, IncidentWithRelations[]>();
  for (const incident of resolved) {
    const key = formatMonthLabel(incident.resolved_at ?? incident.started_at);
    const bucket = resolvedByMonth.get(key) ?? [];
    bucket.push(incident);
    resolvedByMonth.set(key, bucket);
  }

  return (
    <div className="mx-auto max-w-[1100px] px-4 pb-8 pt-4 sm:px-6">
      <PageHeader
        title="Incidents"
        description="Every incident is a public record: what changed, when we noticed, and what we did."
        aside={
          <span className="fh-num">
            {active.length} open · {resolved.length} resolved
          </span>
        }
      />

      <section className="mt-5">
        <SectionHeading title="Active" />
        {active.length > 0 ? (
          <div className="grid gap-2">
            {active.map((incident) => (
              <IncidentCard key={incident.id} incident={incident} affectedServices={affected(incident)} now={now} />
            ))}
          </div>
        ) : (
          <div className="fh-card border border-line bg-surface px-3.5 py-2.5">
            <p className="text-[15px] text-muted">
              <span className="font-medium text-ink">No active incidents.</span>{' '}
              {resolved[0]
                ? `The last incident was resolved ${formatRelativeTime(resolved[0].resolved_at, now)}.`
                : 'No incident has been recorded yet.'}
            </p>
          </div>
        )}
      </section>

      <section className="mt-6">
        <SectionHeading title="Resolved" />
        {resolved.length > 0 ? (
          <div className="space-y-3">
            {[...resolvedByMonth.entries()].map(([month, incidents]) => (
              <div key={month}>
                <h3 className="mb-1 px-1 text-[14px] font-semibold uppercase tracking-[0.05em] text-muted">
                  {month}
                </h3>
                <div className="overflow-hidden fh-panel border border-line bg-surface">
                  {incidents.map((incident) => (
                    <IncidentRow
                      key={incident.id}
                      incident={incident}
                      affectedServices={affected(incident)}
                      now={now}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="fh-card border border-dashed border-line bg-surface-soft px-4 py-6 text-center">
            <p className="text-[15px] font-medium">Nothing resolved yet.</p>
            <p className="mt-0.5 text-[14px] text-muted">
              The archive starts when this page begins recording incidents.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
