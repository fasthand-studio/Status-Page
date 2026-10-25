import type { Metadata } from 'next';
import { DataError } from '@/components/data-error';
import { IncidentCard } from '@/components/incident-card';
import { PageHeader } from '@/components/page-header';
import { SetupNotice } from '@/components/setup-notice';
import { getStatusSnapshot } from '@/lib/data';
import { formatRelativeTime } from '@/lib/format';
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
      <div className="mx-auto max-w-[1180px] px-4 pt-6 sm:px-6">
        <PageHeader title="Incidents" description="Active and recently resolved incidents." />
        <div className="mt-6">
          <DataError description={snapshot.error} />
        </div>
      </div>
    );
  }

  if (!snapshot.configured) {
    return (
      <div className="mx-auto max-w-[1180px] px-4 pt-6 sm:px-6">
        <PageHeader
          title="Incidents"
          description="Incident history starts after the monitoring database is connected."
        />
        <div className="mt-6">
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

  return (
    <div className="mx-auto max-w-[1180px] px-4 pb-8 pt-6 sm:px-6">
      <PageHeader
        title="Incidents"
        description="Every incident is a public record: what changed, when we noticed, and what we did. Automated discoveries are labelled."
        aside={
          <div className="flex gap-6 fh-card border border-line bg-surface px-5 py-4">
            <div>
              <p className="font-sans text-[13px] text-muted">Open</p>
              <p className="mt-1 font-sans text-[22px] font-semibold leading-none tracking-[-0.04em]">
                {active.length}
              </p>
            </div>
            <span className="w-px bg-line" aria-hidden="true" />
            <div>
              <p className="font-sans text-[13px] text-muted">Recent</p>
              <p className="mt-1 font-sans text-[22px] font-semibold leading-none tracking-[-0.04em]">
                {resolved.length}
              </p>
            </div>
          </div>
        }
      />

      <section className="mt-9">
        <h2 className="font-sans text-[13px] text-muted">Active</h2>
        {active.length > 0 ? (
          <div className="mt-3 grid gap-4">
            {active.map((incident) => (
              <IncidentCard key={incident.id} incident={incident} affectedServices={affected(incident)} now={now} />
            ))}
          </div>
        ) : (
          <div className="mt-3 fh-card border border-line bg-surface px-5 py-4">
            <p className="text-[16px] font-medium">No active incidents.</p>
            <p className="mt-0.5 text-[15px] text-muted">
              {resolved[0]
                ? `The last incident was resolved ${formatRelativeTime(resolved[0].resolved_at, now)}.`
                : 'No incident has been recorded on this status page yet.'}
            </p>
          </div>
        )}
      </section>

      <section className="mt-12">
        <h2 className="font-sans text-[13px] text-muted">Recently resolved</h2>
        {resolved.length > 0 ? (
          <div className="mt-3 grid gap-4 lg:grid-cols-2">
            {resolved.map((incident) => (
              <IncidentCard key={incident.id} incident={incident} affectedServices={affected(incident)} now={now} />
            ))}
          </div>
        ) : (
          <div className="mt-3 fh-card border border-dashed border-line bg-surface/50 px-5 py-8 text-center">
            <p className="text-[16px] font-medium">Nothing resolved yet.</p>
            <p className="mt-1 text-[15px] text-muted">
              The archive starts when this page begins recording incidents.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
