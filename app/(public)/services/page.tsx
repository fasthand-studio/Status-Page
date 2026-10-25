import type { Metadata } from 'next';
import { CheckRunnerNote } from '@/components/check-runner-note';
import { DataError } from '@/components/data-error';
import { AlertIcon } from '@/components/icons';
import { PageHeader } from '@/components/page-header';
import { ServicesExplorer, type ExplorerGroup } from '@/components/services-explorer';
import { SetupNotice } from '@/components/setup-notice';
import { StatusPill } from '@/components/status-pill';
import { UptimeLegend } from '@/components/uptime-legend';
import { getStatusSnapshot } from '@/lib/data';
import {
  buildDailyBars,
  deriveOverallStatus,
  deriveServiceHealth,
  groupWorstHealth,
  summarizeUptime,
} from '@/lib/status';

export const metadata: Metadata = {
  title: 'Services',
  description: 'Every FastHand service, its current health, and 90 days of measured uptime.',
};

export default async function ServicesPage() {
  const snapshot = await getStatusSnapshot();
  const now = new Date();

  if (snapshot.error) {
    return (
      <div className="mx-auto max-w-[1180px] px-4 pt-6 sm:px-6">
        <PageHeader title="Services" description="Health and measured uptime." />
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
          title="Services"
          description="This directory fills in after the monitor database is connected. Nothing is shown as healthy without a check."
        />
        <div className="mt-6">
          <SetupNotice />
        </div>
      </div>
    );
  }

  const monitorById = new Map(snapshot.monitors.map((monitor) => [monitor.id, monitor]));
  const overall = deriveOverallStatus({
    configured: true,
    services: snapshot.services,
    monitors: snapshot.monitors,
    openIncidents: snapshot.openIncidents,
    maintenance: snapshot.maintenance,
    now,
  });

  const groups: ExplorerGroup[] = snapshot.groups
    .map((group) => {
      const services = snapshot.services
        .filter((service) => service.group_id === group.id)
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((service) => {
          const monitor = service.monitor_id ? monitorById.get(service.monitor_id) ?? null : null;
          return {
            id: service.id,
            slug: service.slug,
            name: service.name,
            description: service.description,
            health: deriveServiceHealth({
              service,
              monitor,
              incidents: snapshot.openIncidents,
              maintenance: snapshot.maintenance,
              now,
            }),
            uptime1: summarizeUptime(snapshot.dailyStats, service.id, 1, now),
            uptime7: summarizeUptime(snapshot.dailyStats, service.id, 7, now),
            uptime30: summarizeUptime(snapshot.dailyStats, service.id, 30, now),
            uptime90: summarizeUptime(snapshot.dailyStats, service.id, 90, now),
            bars: buildDailyBars(snapshot.dailyStats, service.id, now, 90),
            lastCheckAt: monitor?.checked_at ?? null,
            monitored: Boolean(monitor?.enabled && service.monitor_id),
          };
        });

      return {
        id: group.id,
        name: group.name,
        slug: group.slug,
        description: group.description,
        worst: groupWorstHealth(services.map((service) => service.health)),
        monitoredCount: services.filter((service) => service.monitored).length,
        services,
      };
    })
    .filter((group) => group.services.length > 0);

  const totalMonitored = groups.reduce((total, group) => total + group.monitoredCount, 0);

  return (
    <div className="mx-auto max-w-[1180px] px-4 pb-8 pt-6 sm:px-6">
      <PageHeader
        title="Services"
        description="Search every FastHand service. Green is the most recent check passing — grey means no verified check exists, not that the service is down."
        aside={
          <div className="flex items-center gap-5 fh-card border border-line bg-surface px-5 py-4">
            <div>
              <p className="font-sans text-[13px] text-muted">Coverage</p>
              <p className="mt-1.5 font-sans text-[24px] font-semibold leading-none tracking-[-0.04em]">
                {totalMonitored}
                <span className="text-muted/50"> / {snapshot.services.length}</span>
              </p>
              <p className="mt-1 text-[13px] text-muted">services measured</p>
            </div>
            <span className="h-12 w-px bg-line" aria-hidden="true" />
            <div className="space-y-2">
              <StatusPill state={overall.state} size="sm" />
              <p className="max-w-[150px] text-[13px] leading-snug text-muted">
                {overall.staleCount > 0
                  ? `${overall.staleCount} stale check${overall.staleCount === 1 ? '' : 's'}`
                  : 'Freshness checked on load'}
              </p>
            </div>
          </div>
        }
      />

      <div className="mt-6">
        <CheckRunnerNote lastRun={snapshot.lastRun} now={now} />
      </div>

      {overall.staleCount > 0 && (
        <div className="mt-3 flex items-start gap-2.5 fh-r-sm border border-warn/30 bg-warn-soft/60 px-4 py-3 text-[15px] text-ink/80">
          <AlertIcon className="mt-0.5 h-4 w-4 shrink-0 text-warn" />
          <p>
            {overall.staleCount} monitored service{overall.staleCount === 1 ? ' has' : 's have'} gone
            past the expected check window. Those rows are marked <strong>Unknown</strong>; stale data
            is not counted as uptime.
          </p>
        </div>
      )}

      <div className="mt-4">
        <UptimeLegend />
      </div>

      <div className="mt-6">
        <ServicesExplorer
          groups={groups}
          totalServices={snapshot.services.length}
          totalMonitored={totalMonitored}
          now={now}
        />
      </div>

      <div className="mt-8 max-w-3xl space-y-2 text-[15px] leading-relaxed text-muted">
        <p>
          Uptime is successful checks divided by recorded checks in the window, bucketed by UTC day.
          Windows are 7, 30, and 90 days; each bar is one UTC day. A service with no monitor has no
          percentage.
        </p>
        <p>
          A monitor is marked stale after three missed check intervals (or 15 minutes, whichever is
          longer). Stale and missing days are excluded from percentages, and rows switch to Unknown —
          never green.
        </p>
      </div>
    </div>
  );
}
