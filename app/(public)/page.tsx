import type { Metadata } from 'next';
import { DataError } from '@/components/data-error';
import { ogImage } from '@/lib/seo';
import { IncidentCard } from '@/components/incident-card';
import { IncidentRow } from '@/components/incident-row';
import { MaintenanceRow } from '@/components/maintenance-row';
import { PageHeader } from '@/components/page-header';
import { SectionHeading } from '@/components/section-heading';
import { SetupNotice } from '@/components/setup-notice';
import { StatusHero } from '@/components/status-hero';
import { getStatusSnapshot } from '@/lib/data';
import { formatRelativeTime } from '@/lib/format';
import { deriveOverallStatus } from '@/lib/status';
import type { IncidentWithRelations, MaintenanceWithServices } from '@/lib/types';

const description =
  'Live health, measured uptime, incident history, and scheduled maintenance for every FastHand service. Uptime comes from real automated checks, never estimates.';

export const metadata: Metadata = {
  description,
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    url: '/',
    siteName: 'FastHand Status',
    title: 'FastHand Status — live uptime and incident history',
    description,
    locale: 'en_US',
    images: [ogImage],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FastHand Status — live uptime and incident history',
    description,
  },
};

const IMPACT_ORDER = { critical: 4, major: 3, minor: 2, none: 1 } as const;

export default async function HomePage() {
  const snapshot = await getStatusSnapshot();
  const now = new Date();

  if (snapshot.error) {
    return (
      <div className="mx-auto max-w-[1100px] px-4 pt-4 sm:px-6">
        <PageHeader
          title="Status unavailable"
          description="The page will not guess. Fix the data connection and reload."
        />
        <div className="mt-4">
          <DataError description={snapshot.error} />
        </div>
      </div>
    );
  }

  if (!snapshot.configured) {
    return (
      <div className="mx-auto max-w-[1100px] px-4 pt-5 sm:px-6 sm:pt-8">
        <h1 className="text-center text-[26px] font-semibold leading-tight tracking-[-0.015em]">
          FastHand system status
        </h1>
        <div className="mt-5">
          <StatusHero
            overall={deriveOverallStatus({
              configured: false,
              services: [],
              monitors: [],
              openIncidents: [],
              maintenance: [],
              now,
            })}
            openIncidents={0}
          />
        </div>
        <div className="mt-4">
          <SetupNotice />
        </div>
      </div>
    );
  }

  const serviceById = new Map(snapshot.services.map((service) => [service.id, service]));
  const overall = deriveOverallStatus({
    configured: true,
    services: snapshot.services,
    monitors: snapshot.monitors,
    openIncidents: snapshot.openIncidents,
    maintenance: snapshot.maintenance,
    now,
  });

  const activeIncidents = [...snapshot.openIncidents].sort(
    (a, b) => IMPACT_ORDER[b.impact] - IMPACT_ORDER[a.impact] || +new Date(b.started_at) - +new Date(a.started_at),
  );
  const upcomingMaintenance = [...snapshot.maintenance]
    .filter((window) => new Date(window.scheduled_end) >= now)
    .sort(
      (a, b) =>
        Number(b.status === 'in_progress') - Number(a.status === 'in_progress') ||
        +new Date(a.scheduled_start) - +new Date(b.scheduled_start),
    )
    .slice(0, 2);
  const recentResolved = snapshot.recentIncidents.slice(0, 5);

  const serviceNames = (incident: IncidentWithRelations) =>
    incident.incident_services
      .map((row) => serviceById.get(row.service_id)?.name)
      .filter((name): name is string => Boolean(name));
  const maintenanceNames = (window: MaintenanceWithServices) =>
    window.maintenance_services
      .map((row) => serviceById.get(row.service_id)?.name)
      .filter((name): name is string => Boolean(name));

  return (
    <div className="mx-auto max-w-[1100px] px-4 pb-8 pt-5 sm:px-6 sm:pt-8">
      <h1 className="text-center text-[26px] font-semibold leading-tight tracking-[-0.015em]">
        FastHand system status
      </h1>

      <div className="mt-5">
        <StatusHero
          overall={overall}
          openIncidents={snapshot.openIncidents.length}
        />
      </div>

      <div className="mt-7 space-y-7">
        <section>
          <SectionHeading title="Active incidents" href="/incidents" linkLabel="Incident log" />
          {activeIncidents.length > 0 ? (
            <div className="grid gap-2">
              {activeIncidents.map((incident) => (
                <IncidentCard
                  key={incident.id}
                  incident={incident}
                  affectedServices={serviceNames(incident)}
                  now={now}
                />
              ))}
            </div>
          ) : (
            <p className="text-[15px] text-muted">
              No incidents have been reported
              {snapshot.recentIncidents[0]
                ? `; the last one resolved ${formatRelativeTime(snapshot.recentIncidents[0].resolved_at, now)}.`
                : ' yet.'}
            </p>
          )}
        </section>

        <section>
          <SectionHeading title="Active maintenance" href="/maintenance" linkLabel="All maintenance" />
          {upcomingMaintenance.length > 0 ? (
            <div className="overflow-hidden fh-panel border border-line bg-surface">
              {upcomingMaintenance.map((window) => (
                <MaintenanceRow
                  key={window.id}
                  window={window}
                  affected={maintenanceNames(window)}
                  now={now}
                />
              ))}
            </div>
          ) : (
            <p className="text-[15px] text-muted">
              No maintenance is scheduled. New windows appear here before work starts.
            </p>
          )}
        </section>

        {recentResolved.length > 0 && (
          <section>
            <SectionHeading title="Recently resolved" href="/history" linkLabel="Full history" />
            <div className="overflow-hidden fh-panel border border-line bg-surface">
              {recentResolved.map((incident) => (
                <IncidentRow
                  key={incident.id}
                  incident={incident}
                  affectedServices={serviceNames(incident)}
                  now={now}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
