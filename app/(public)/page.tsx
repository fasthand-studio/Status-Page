import Link from 'next/link';
import { DataError } from '@/components/data-error';
import { CheckIcon, WrenchIcon } from '@/components/icons';
import { IncidentCard } from '@/components/incident-card';
import { IncidentRow } from '@/components/incident-row';
import { MaintenanceCard } from '@/components/maintenance-card';
import { PageHeader } from '@/components/page-header';
import { SectionHeading } from '@/components/section-heading';
import { ServiceSummaryRow } from '@/components/service-summary-row';
import { SetupNotice } from '@/components/setup-notice';
import { StatusHero } from '@/components/status-hero';
import { StatusPill } from '@/components/status-pill';
import { getStatusSnapshot } from '@/lib/data';
import { formatRelativeTime } from '@/lib/format';
import {
  buildDailyBars,
  deriveOverallStatus,
  deriveServiceHealth,
  groupWorstHealth,
  summarizeUptime,
  type ServiceHealth,
} from '@/lib/status';
import type { IncidentWithRelations, MaintenanceWithServices, StatusSnapshot } from '@/lib/types';

const IMPACT_ORDER = { critical: 4, major: 3, minor: 2, none: 1 } as const;

function lastCheckAt(snapshot: StatusSnapshot): string | null {
  return snapshot.monitors.reduce<string | null>((latest, monitor) => {
    if (!monitor.checked_at) return latest;
    if (!latest) return monitor.checked_at;
    return new Date(monitor.checked_at) > new Date(latest) ? monitor.checked_at : latest;
  }, null);
}

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
      <div className="mx-auto max-w-[1100px] space-y-4 px-4 pt-4 sm:px-6 sm:pt-5">
        <StatusHero
          overall={deriveOverallStatus({
            configured: false,
            services: [],
            monitors: [],
            openIncidents: [],
            maintenance: [],
            now,
          })}
          lastRun={null}
          lastCheckAt={null}
          openIncidents={0}
          now={now}
        />
        <SetupNotice />
      </div>
    );
  }

  const monitorById = new Map(snapshot.monitors.map((monitor) => [monitor.id, monitor]));
  const serviceById = new Map(snapshot.services.map((service) => [service.id, service]));
  const overall = deriveOverallStatus({
    configured: true,
    services: snapshot.services,
    monitors: snapshot.monitors,
    openIncidents: snapshot.openIncidents,
    maintenance: snapshot.maintenance,
    now,
  });

  const healths = new Map<string, ServiceHealth>(
    snapshot.services.map((service) => [
      service.id,
      deriveServiceHealth({
        service,
        monitor: service.monitor_id ? monitorById.get(service.monitor_id) ?? null : null,
        incidents: snapshot.openIncidents,
        maintenance: snapshot.maintenance,
        now,
      }),
    ]),
  );

  const groups = snapshot.groups
    .map((group) => ({
      ...group,
      services: snapshot.services
        .filter((service) => service.group_id === group.id)
        .sort((a, b) => a.sort_order - b.sort_order),
    }))
    .filter((group) => group.services.length > 0);

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

  const latest = lastCheckAt(snapshot);

  return (
    <div className="mx-auto max-w-[1100px] px-4 pb-8 pt-4 sm:px-6 sm:pt-5">
      <StatusHero
        overall={overall}
        lastRun={snapshot.lastRun}
        lastCheckAt={latest}
        openIncidents={snapshot.openIncidents.length}
        now={now}
      />

      <div className="mt-6 space-y-6">
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
            <div className="flex items-center gap-2.5 fh-card border border-line bg-surface px-3.5 py-2.5">
              <CheckIcon className="h-4 w-4 shrink-0 text-ok" />
              <p className="min-w-0 text-[15px] text-muted">
                <span className="font-medium text-ink">No incidents reported.</span>{' '}
                {snapshot.recentIncidents[0]
                  ? `Last incident resolved ${formatRelativeTime(snapshot.recentIncidents[0].resolved_at, now)}.`
                  : 'Nothing has been recorded yet.'}
              </p>
            </div>
          )}
        </section>

        <section>
          <SectionHeading title="Components" href="/services" linkLabel="All services" />
          <div className="space-y-3">
            {groups.map((group) => {
              const groupHealths = group.services.map(
                (service) => healths.get(service.id) ?? { state: 'unknown' as const, label: 'Unknown', detail: '' },
              );
              return (
                <div key={group.id} className="overflow-hidden fh-panel border border-line bg-surface">
                  <div className="flex items-center gap-2 border-b border-line bg-surface-soft px-3.5 py-2">
                    <h3 className="text-[15px] font-semibold">{group.name}</h3>
                    <StatusPill state={groupWorstHealth(groupHealths)} />
                    <Link
                      href={`/services#group-${group.slug}`}
                      className="ml-auto text-[14px] text-primary hover:underline"
                    >
                      Details
                    </Link>
                  </div>
                  <div>
                    {group.services.map((service) => {
                      const monitor = service.monitor_id ? monitorById.get(service.monitor_id) ?? null : null;
                      return (
                        <ServiceSummaryRow
                          key={service.id}
                          service={service}
                          health={
                            healths.get(service.id) ?? { state: 'unknown', label: 'Unknown', detail: '' }
                          }
                          bars={buildDailyBars(snapshot.dailyStats, service.id, now, 30)}
                          uptime={summarizeUptime(snapshot.dailyStats, service.id, 30, now)}
                          lastCheckAt={monitor?.checked_at ?? null}
                          now={now}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section>
          <SectionHeading
            title="Scheduled maintenance"
            href="/maintenance"
            linkLabel="All maintenance"
          />
          {upcomingMaintenance.length > 0 ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {upcomingMaintenance.map((window) => (
                <MaintenanceCard
                  key={window.id}
                  window={window}
                  affectedServices={maintenanceNames(window)}
                  now={now}
                />
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2.5 fh-card border border-line bg-surface px-3.5 py-2.5">
              <WrenchIcon className="h-4 w-4 shrink-0 text-muted" />
              <p className="text-[15px] text-muted">
                <span className="font-medium text-ink">No planned maintenance.</span> New windows are
                announced here before work starts.
              </p>
            </div>
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
