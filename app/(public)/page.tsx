import Link from 'next/link';
import { DataError } from '@/components/data-error';
import { CheckIcon, WrenchIcon } from '@/components/icons';
import { IncidentCard } from '@/components/incident-card';
import { MaintenanceCard } from '@/components/maintenance-card';
import { PageHeader } from '@/components/page-header';
import { SectionHeading } from '@/components/section-heading';
import { ServiceSummaryRow } from '@/components/service-summary-row';
import { SetupNotice } from '@/components/setup-notice';
import { StatusHero } from '@/components/status-hero';
import { StatusPill } from '@/components/status-pill';
import { getStatusSnapshot } from '@/lib/data';
import { formatDateTime, formatRelativeTime } from '@/lib/format';
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
      <div className="mx-auto max-w-[1180px] px-4 pt-6 sm:px-6">
        <PageHeader
          title="Status unavailable"
          description="The page will not guess. Fix the data connection and reload."
        />
        <div className="mt-6">
          <DataError description={snapshot.error} />
        </div>
      </div>
    );
  }

  if (!snapshot.configured) {
    return (
      <div className="mx-auto max-w-[1180px] space-y-5 px-4 pt-6 sm:px-6 sm:pt-8">
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
  const recentResolved = snapshot.recentIncidents.slice(0, 2);

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
    <div className="mx-auto max-w-[1180px] px-5 pb-10 pt-8 sm:px-8 sm:pt-10">
      <StatusHero
        overall={overall}
        lastRun={snapshot.lastRun}
        lastCheckAt={latest}
        openIncidents={snapshot.openIncidents.length}
        now={now}
      />

      <div className="mt-8 space-y-8">
        <section>
          <SectionHeading
            title={activeIncidents.length > 0 ? 'Active incidents' : 'No active incidents'}
            description={
              activeIncidents.length > 0
                ? 'What is broken right now, what we know, and what we are doing about it.'
                : 'When something fails sustained checks, the incident appears here with a running timeline.'
            }
            href="/incidents"
            linkLabel="Incident history"
          />
          {activeIncidents.length > 0 ? (
            <div className="grid gap-4">
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
            <div className="flex flex-wrap items-center gap-4 fh-card border border-line bg-surface px-5 py-4">
              <CheckIcon className="h-5 w-5 shrink-0 text-ok" />
              <div className="min-w-0 flex-1">
                <p className="text-[16px] font-medium">Nothing is open right now.</p>
                <p className="mt-0.5 text-[15px] text-muted">
                  {snapshot.recentIncidents[0]
                    ? `Last incident resolved ${formatRelativeTime(snapshot.recentIncidents[0].resolved_at, now)}.`
                    : 'No incidents have been recorded on this status page yet.'}
                </p>
              </div>
              <Link
                href="/history"
                className="text-[15px] text-muted underline decoration-lime-deep decoration-2 underline-offset-4 hover:text-ink"
              >
                Archive
              </Link>
            </div>
          )}
        </section>

        <section>
          <SectionHeading
            title="Every service, as measured"
            description="Green means the latest check passed. Grey means no verified check exists — not that the service is down."
            href="/services"
            linkLabel="Full service view"
          />
          <div className="space-y-4">
            {groups.map((group) => {
              const groupHealths = group.services.map(
                (service) => healths.get(service.id) ?? { state: 'unknown' as const, label: 'Unknown', detail: '' },
              );
              return (
                <div key={group.id} className="fh-panel border border-line bg-surface">
                  <div className="flex flex-wrap items-center gap-3 px-4 py-4 sm:px-5">
                    <h3 className="font-sans text-[18px] font-semibold tracking-[-0.03em]">
                      {group.name}
                    </h3>
                    <StatusPill state={groupWorstHealth(groupHealths)} size="sm" />
                    <Link
                      href={`/services#group-${group.slug}`}
                      className="ml-auto font-sans text-[13px] text-muted hover:text-ink"
                    >
                      Open group →
                    </Link>
                  </div>
                  <div className="divide-y divide-line/60 border-t border-line/70">
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
            title="Maintenance windows"
            description="Announced work that may briefly affect a service. All windows are shown in UTC."
            href="/maintenance"
            linkLabel="All maintenance"
          />
          {upcomingMaintenance.length > 0 ? (
            <div className="grid gap-4 lg:grid-cols-2">
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
            <div className="flex flex-wrap items-center gap-4 fh-card border border-line bg-surface px-5 py-4">
              <WrenchIcon className="h-5 w-5 shrink-0 text-muted" />
              <div>
                <p className="text-[16px] font-medium">No planned maintenance.</p>
                <p className="mt-0.5 text-[15px] text-muted">
                  New windows are announced here before work starts.
                </p>
              </div>
            </div>
          )}
        </section>

        {recentResolved.length > 0 && (
          <section>
            <SectionHeading
              title="Resolved incidents"
              description="Automated incidents close after sustained successful checks; humans can close them too."
              href="/history"
              linkLabel="Full archive"
            />
            <div className="grid gap-4 lg:grid-cols-2">
              {recentResolved.map((incident) => (
                <IncidentCard
                  key={incident.id}
                  incident={incident}
                  affectedServices={serviceNames(incident)}
                  now={now}
                />
              ))}
            </div>
          </section>
        )}

        <section className="fh-panel border border-line bg-surface p-5 sm:p-7">
          <h2 className="max-w-lg text-2xl font-semibold leading-tight tracking-[-0.02em]">
            Measured, not implied.
          </h2>
          <p className="mt-1.5 max-w-2xl text-[17px] leading-relaxed text-muted">
            How to read the numbers on this page.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="fh-r-sm border border-line bg-paper/60 p-4">
              <p className="text-[13px] font-semibold text-muted">1</p>
              <h3 className="mt-1 font-semibold">Green is a measurement</h3>
              <p className="mt-1 text-[15px] leading-relaxed text-muted">
                A green row means the most recent heartbeat passed. It is not a claim that every part
                of that product is healthy.
              </p>
            </div>
            <div className="fh-r-sm border border-line bg-paper/60 p-4">
              <p className="text-[13px] font-semibold text-muted">2</p>
              <h3 className="mt-1 font-semibold">Grey is not healthy</h3>
              <p className="mt-1 text-[15px] leading-relaxed text-muted">
                No verified monitor means no uptime number. Days without checks stay grey and are not
                counted as uptime.
              </p>
            </div>
            <div className="fh-r-sm border border-line bg-paper/60 p-4">
              <p className="text-[13px] font-semibold text-muted">3</p>
              <h3 className="mt-1 font-semibold">Incidents are explicit</h3>
              <p className="mt-1 text-[15px] leading-relaxed text-muted">
                A monitor opens an incident after sustained failures and closes it after sustained
                success. A person can post updates at any time.
              </p>
            </div>
            <div className="fh-r-sm border border-line bg-paper/60 p-4">
              <p className="text-[13px] font-semibold text-muted">4</p>
              <h3 className="mt-1 font-semibold">Checks run every five minutes</h3>
              <p className="mt-1 text-[15px] leading-relaxed text-muted">
                If the runner stops, this page says so and the status falls back to unknown instead of
                staying green.
              </p>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line pt-4 text-[15px] text-muted">
            <span>Coverage {overall.monitoredCount}/{overall.totalServices}</span>
            <span className="h-4 w-px bg-line" aria-hidden="true" />
            <span>Last runner {formatRelativeTime(snapshot.lastRun?.finished_at ?? snapshot.lastRun?.started_at ?? null, now)}</span>
            <span className="h-4 w-px bg-line" aria-hidden="true" />
            <span>Snapshot {formatDateTime(snapshot.generatedAt)}</span>
            <span className="h-4 w-px bg-line" aria-hidden="true" />
            <span>All times UTC</span>
          </div>
        </section>
      </div>
    </div>
  );
}
