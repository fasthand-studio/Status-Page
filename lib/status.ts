import { dayKey, daysAgo, formatRelativeTime } from './format';
import type {
  DailyBar,
  DailyStat,
  HealthState,
  IncidentImpact,
  IncidentWithRelations,
  MaintenanceWithServices,
  MonitorStatus,
  Service,
  StatusSnapshot,
  UptimeWindow,
} from './types';

export const HEALTH_LABEL: Record<HealthState, string> = {
  operational: 'Operational',
  degraded: 'Degraded',
  outage: 'Outage',
  maintenance: 'Maintenance',
  unknown: 'Unknown',
  unmonitored: 'No check',
};

export const IMPACT_LABEL: Record<IncidentImpact, string> = {
  none: 'None',
  minor: 'Minor',
  major: 'Major',
  critical: 'Critical',
};

export interface ServiceHealth {
  state: HealthState;
  label: string;
  detail: string;
}

export interface OverallStatus {
  state: HealthState | 'setup';
  label: string;
  detail: string;
  tone: 'ok' | 'warn' | 'bad' | 'muted' | 'info';
  monitoredCount: number;
  totalServices: number;
  freshCount: number;
  staleCount: number;
}

const IMPACT_RANK: Record<IncidentImpact, number> = {
  none: 0,
  minor: 1,
  major: 2,
  critical: 3,
};

export function maxIncidentImpact(incidents: IncidentWithRelations[]): IncidentImpact {
  return incidents.reduce<IncidentImpact>((worst, incident) => {
    return IMPACT_RANK[incident.impact] > IMPACT_RANK[worst] ? incident.impact : worst;
  }, 'none');
}

export function latestIncidentUpdate(incident: IncidentWithRelations) {
  if (!incident.incident_updates?.length) return null;
  return [...incident.incident_updates].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )[0];
}

export function incidentAffectsService(incident: IncidentWithRelations, serviceId: string): boolean {
  return incident.incident_services.some((row) => row.service_id === serviceId);
}

export function isMonitorStale(monitor: MonitorStatus, now: Date = new Date()): boolean {
  if (!monitor.checked_at) return false;
  const ageSeconds = (now.getTime() - new Date(monitor.checked_at).getTime()) / 1000;
  const tolerance = Math.max(monitor.check_interval_seconds * 3, 900);
  return ageSeconds > tolerance;
}

export function isMaintenanceActive(window: MaintenanceWithServices, now: Date = new Date()): boolean {
  if (window.status === 'completed' || window.status === 'cancelled') return false;
  const start = new Date(window.scheduled_start).getTime();
  const end = new Date(window.scheduled_end).getTime();
  if (window.status === 'in_progress') return true;
  return start <= now.getTime() && now.getTime() <= end;
}

export function deriveServiceHealth(input: {
  service: Service;
  monitor: MonitorStatus | null;
  incidents: IncidentWithRelations[];
  maintenance: MaintenanceWithServices[];
  now: Date;
}): ServiceHealth {
  const { service, monitor, incidents, maintenance, now } = input;

  const affecting = incidents.filter((incident) => incidentAffectsService(incident, service.id));
  const impact = maxIncidentImpact(affecting);
  if (IMPACT_RANK[impact] >= 2) {
    return {
      state: 'outage',
      label: HEALTH_LABEL.outage,
      detail: affecting.find((incident) => incident.impact === impact)?.title ?? 'Active incident',
    };
  }
  if (impact === 'minor') {
    return {
      state: 'degraded',
      label: HEALTH_LABEL.degraded,
      detail: affecting[0]?.title ?? 'Active incident',
    };
  }

  const activeMaintenance = maintenance.find(
    (window) =>
      isMaintenanceActive(window, now) &&
      window.maintenance_services.some((row) => row.service_id === service.id),
  );
  if (activeMaintenance) {
    return { state: 'maintenance', label: HEALTH_LABEL.maintenance, detail: activeMaintenance.title };
  }

  if (!service.monitor_id || !monitor) {
    return {
      state: 'unmonitored',
      label: HEALTH_LABEL.unmonitored,
      detail: 'No automated health check is attached.',
    };
  }
  if (!monitor.enabled) {
    return {
      state: 'unmonitored',
      label: 'Paused',
      detail: 'The automated check is paused.',
    };
  }
  if (!monitor.checked_at) {
    return {
      state: 'unknown',
      label: HEALTH_LABEL.unknown,
      detail: 'Waiting for the first automated check.',
    };
  }
  if (isMonitorStale(monitor, now)) {
    return {
      state: 'unknown',
      label: HEALTH_LABEL.unknown,
      detail: `Last check was ${formatRelativeTime(monitor.checked_at, now)}. We do not assume this service is healthy.`,
    };
  }
  if (monitor.ok === false) {
    return {
      state: 'outage',
      label: 'Failing check',
      detail: 'The most recent automated check did not pass.',
    };
  }
  return {
    state: 'operational',
    label: HEALTH_LABEL.operational,
    detail: `Last check passed ${formatRelativeTime(monitor.checked_at, now)}.`,
  };
}

export function deriveOverallStatus(input: {
  configured: boolean;
  services: Service[];
  monitors: MonitorStatus[];
  openIncidents: IncidentWithRelations[];
  maintenance: MaintenanceWithServices[];
  now: Date;
}): OverallStatus {
  const { configured, services, monitors, openIncidents, maintenance, now } = input;
  const monitorById = new Map(monitors.map((monitor) => [monitor.id, monitor]));
  const monitoredServices = services.filter((service) => {
    if (!service.monitor_id) return false;
    return monitorById.get(service.monitor_id)?.enabled === true;
  });
  const freshCount = monitoredServices.filter((service) => {
    const monitor = monitorById.get(service.monitor_id!);
    return Boolean(monitor?.checked_at) && !isMonitorStale(monitor!, now);
  }).length;
  const staleCount = monitoredServices.filter((service) => {
    const monitor = monitorById.get(service.monitor_id!);
    return Boolean(monitor?.checked_at) && isMonitorStale(monitor!, now);
  }).length;
  const awaitingFirstCheck = monitoredServices.filter((service) => {
    const monitor = monitorById.get(service.monitor_id!);
    return !monitor?.checked_at;
  }).length;

  const counts = {
    monitoredCount: monitoredServices.length,
    totalServices: services.length,
    freshCount,
    staleCount,
  };

  if (!configured) {
    return {
      state: 'setup',
      label: 'Monitoring is not connected yet',
      detail:
        'Add the Supabase project URL and anon key, apply the migrations, then run the check workflow. No uptime is shown until real checks exist.',
      tone: 'muted',
      ...counts,
    };
  }

  if (openIncidents.length > 0) {
    const impact = maxIncidentImpact(openIncidents);
    if (impact === 'critical') {
      return {
        state: 'outage',
        label: 'Major system-wide outage',
        detail: `${openIncidents.length} active incident${openIncidents.length === 1 ? '' : 's'}. The team is posting updates on the incident page.`,
        tone: 'bad',
        ...counts,
      };
    }
    if (impact === 'major') {
      return {
        state: 'outage',
        label: 'Partial outage',
        detail: `${openIncidents.length} active incident${openIncidents.length === 1 ? '' : 's'}. Some services are affected right now.`,
        tone: 'bad',
        ...counts,
      };
    }
    if (impact === 'minor') {
      return {
        state: 'degraded',
        label: 'Degraded performance',
        detail: `${openIncidents.length} active incident${openIncidents.length === 1 ? '' : 's'} with limited impact.`,
        tone: 'warn',
        ...counts,
      };
    }
  }

  if (monitoredServices.length === 0) {
    return {
      state: 'unknown',
      label: 'No automated checks are running',
      detail:
        'Unmonitored services are shown as unknown, never green. Attach a verified health endpoint in the admin panel to measure uptime.',
      tone: 'muted',
      ...counts,
    };
  }

  if (awaitingFirstCheck === monitoredServices.length) {
    return {
      state: 'unknown',
      label: 'Waiting for the first check',
      detail:
        'The monitor is configured but has not reported yet. Uptime will appear after the scheduled workflow runs.',
      tone: 'muted',
      ...counts,
    };
  }

  const healths = services.map((service) =>
    deriveServiceHealth({
      service,
      monitor: service.monitor_id ? monitorById.get(service.monitor_id) ?? null : null,
      incidents: openIncidents,
      maintenance,
      now,
    }),
  );
  const failing = healths.filter((health) => health.state === 'outage').length;
  const degraded = healths.filter((health) => health.state === 'degraded').length;
  const unknown = healths.filter(
    (health) => health.state === 'unknown' && health.label === HEALTH_LABEL.unknown,
  ).length;

  if (failing > 0) {
    return {
      state: 'outage',
      label: failing === monitoredServices.length ? 'Monitored services are down' : 'A monitored service is failing',
      detail: `${failing} of ${monitoredServices.length} monitored services failed their most recent check. Automated incidents open after sustained failures.`,
      tone: 'bad',
      ...counts,
    };
  }

  if (degraded > 0) {
    return {
      state: 'degraded',
      label: 'Degraded performance',
      detail: `${degraded} service${degraded === 1 ? '' : 's'} affected by an open incident.`,
      tone: 'warn',
      ...counts,
    };
  }

  const activeMaintenance = maintenance.find((window) => isMaintenanceActive(window, now));
  if (activeMaintenance) {
    return {
      state: 'maintenance',
      label: 'Maintenance in progress',
      detail: activeMaintenance.title,
      tone: 'info',
      ...counts,
    };
  }

  if (staleCount > 0 && freshCount === 0) {
    return {
      state: 'unknown',
      label: 'Status unknown',
      detail: `${staleCount} monitored service${staleCount === 1 ? '' : 's'} missed the expected check window. We will not show a green status without fresh evidence.`,
      tone: 'muted',
      ...counts,
    };
  }

  if (staleCount > 0 || unknown > 0) {
    return {
      state: 'unknown',
      label: 'Some systems cannot be verified',
      detail: `${staleCount + unknown} monitored service${staleCount + unknown === 1 ? '' : 's'} have stale or missing checks. The rest are responding.`,
      tone: 'warn',
      ...counts,
    };
  }

  return {
    state: 'operational',
    label:
      monitoredServices.length === services.length
        ? 'All systems operational'
        : 'All monitored systems operational',
    detail: 'Green means stored checks passed — not proof of overall health.',
    tone: 'ok',
    ...counts,
  };
}

export function summarizeUptime(
  dailyStats: DailyStat[],
  serviceId: string,
  days: number,
  now: Date = new Date(),
): UptimeWindow {
  const cutoff = dayKey(daysAgo(days - 1, now));
  const relevant = dailyStats.filter(
    (stat) => stat.service_id === serviceId && stat.day >= cutoff && stat.day <= dayKey(now),
  );
  const checks = relevant.reduce((total, stat) => total + stat.checks, 0);
  const okChecks = relevant.reduce((total, stat) => total + stat.ok_checks, 0);
  return { checks, okChecks, percent: checks > 0 ? (okChecks / checks) * 100 : null };
}

export function buildDailyBars(
  dailyStats: DailyStat[],
  serviceId: string,
  now: Date = new Date(),
  days = 90,
): DailyBar[] {
  const byDay = new Map(
    dailyStats
      .filter((stat) => stat.service_id === serviceId)
      .map((stat) => [stat.day, stat] as const),
  );
  const start = daysAgo(days - 1, now);
  const bars: DailyBar[] = [];

  for (let index = 0; index < days; index += 1) {
    const date = new Date(start);
    date.setUTCDate(date.getUTCDate() + index);
    const day = dayKey(date);
    const stat = byDay.get(day);
    bars.push({
      day,
      checks: stat?.checks ?? 0,
      okChecks: stat?.ok_checks ?? 0,
      percent: stat && stat.checks > 0 ? (stat.ok_checks / stat.checks) * 100 : null,
    });
  }

  return bars;
}

export function barTone(bar: DailyBar): 'ok' | 'ok-soft' | 'warn' | 'bad' | 'empty' {
  if (bar.percent === null) return 'empty';
  if (bar.percent >= 99.9) return 'ok';
  if (bar.percent >= 99) return 'ok-soft';
  if (bar.percent >= 95) return 'warn';
  return 'bad';
}

export function groupWorstHealth(healths: ServiceHealth[]): HealthState {
  const rank: Record<HealthState, number> = {
    outage: 5,
    degraded: 4,
    maintenance: 3,
    unknown: 2,
    unmonitored: 1,
    operational: 0,
  };
  return healths.reduce<HealthState>(
    (worst, health) => (rank[health.state] > rank[worst] ? health.state : worst),
    'operational',
  );
}

export function snapshotCoverage(snapshot: StatusSnapshot): { monitored: number; total: number } {
  const enabled = new Set(
    snapshot.monitors.filter((monitor) => monitor.enabled).map((monitor) => monitor.id),
  );
  return {
    monitored: snapshot.services.filter(
      (service) => service.monitor_id && enabled.has(service.monitor_id),
    ).length,
    total: snapshot.services.length,
  };
}
