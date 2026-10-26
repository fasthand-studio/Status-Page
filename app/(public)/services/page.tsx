import type { Metadata } from 'next';
import { CheckRunnerNote } from '@/components/check-runner-note';
import { DataError } from '@/components/data-error';
import { AlertIcon } from '@/components/icons';
import { PageHeader } from '@/components/page-header';
import { ServicesExplorer, type ExplorerGroup } from '@/components/services-explorer';
import { SetupNotice } from '@/components/setup-notice';
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
      <div className="mx-auto max-w-[1100px] px-4 pt-4 sm:px-6">
        <PageHeader title="Services" description="Health and measured uptime." />
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
          title="Services"
          description="This directory fills in after the monitor database is connected. Nothing is shown as healthy without a check."
        />
        <div className="mt-4">
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
    <div className="mx-auto max-w-[1100px] px-4 pb-8 pt-4 sm:px-6">
      <PageHeader
        title="Services"
        description="Every service, its latest check, and 90 days of measured uptime."
        aside={
          <span className="fh-num">
            {totalMonitored} / {snapshot.services.length} monitored
            {overall.staleCount > 0 ? ` · ${overall.staleCount} stale` : ' · all fresh'}
          </span>
        }
      />

      <div className="mt-2 flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
        <UptimeLegend />
        <CheckRunnerNote lastRun={snapshot.lastRun} now={now} />
      </div>

      {overall.staleCount > 0 && (
        <div className="mt-3 flex items-start gap-2 fh-r-sm border border-warn/30 bg-warn-soft/60 px-3 py-2 text-[12px] text-ink/80">
          <AlertIcon className="mt-px h-3.5 w-3.5 shrink-0 text-warn" />
          <p>
            {overall.staleCount} monitored service{overall.staleCount === 1 ? ' has' : 's have'} missed
            the expected check window and {overall.staleCount === 1 ? 'is' : 'are'} marked Unknown.
            Stale data is never counted as uptime.
          </p>
        </div>
      )}

      <div className="mt-4">
        <ServicesExplorer
          groups={groups}
          totalServices={snapshot.services.length}
          totalMonitored={totalMonitored}
          now={now}
        />
      </div>

      <p className="mt-5 max-w-3xl text-[11.5px] leading-relaxed text-muted">
        Uptime is successful checks divided by recorded checks per UTC day. Missing or stale days are
        excluded; services without a monitor have no percentage.
      </p>
    </div>
  );
}
