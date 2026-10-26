import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  CheckResult,
  IncidentWithRelations,
  MaintenanceWithServices,
  Monitor,
  MonitorRun,
  MonitorStatus,
  Service,
  ServiceGroup,
} from './types';

const INCIDENT_SELECT = '*, incident_updates(*), incident_services(service_id)';

function unwrap<T>(result: { data: T; error: { message: string } | null }): T {
  if (result.error) throw new Error(`Admin query failed: ${result.error.message}`);
  return result.data;
}

function normalizeIncident(row: unknown): IncidentWithRelations {
  const incident = row as IncidentWithRelations;
  return {
    ...incident,
    incident_updates: [...(incident.incident_updates ?? [])].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    ),
    incident_services: incident.incident_services ?? [],
  };
}

export interface AdminOverview {
  groups: ServiceGroup[];
  services: Service[];
  monitors: Monitor[];
  statuses: MonitorStatus[];
  openIncidents: IncidentWithRelations[];
  recentIncidents: IncidentWithRelations[];
  runs: MonitorRun[];
  checks24h: number;
}

export async function loadAdminOverview(client: SupabaseClient): Promise<AdminOverview> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const [groupsResult, servicesResult, monitorsResult, statusesResult, openResult, recentResult, runsResult, checksResult] =
    await Promise.all([
      client.from('service_groups').select('*').order('sort_order'),
      client.from('services').select('*').order('sort_order'),
      client.from('monitors').select('*').order('name'),
      client.from('monitor_status').select('*'),
      client.from('incidents').select(INCIDENT_SELECT).is('resolved_at', null).order('started_at', { ascending: false }),
      client
        .from('incidents')
        .select(INCIDENT_SELECT)
        .not('resolved_at', 'is', null)
        .order('resolved_at', { ascending: false })
        .limit(6),
      client.from('monitor_runs').select('*').order('started_at', { ascending: false }).limit(6),
      client.from('check_results').select('id', { count: 'exact', head: true }).gte('checked_at', since),
    ]);

  return {
    groups: (unwrap(groupsResult) ?? []) as ServiceGroup[],
    services: (unwrap(servicesResult) ?? []) as Service[],
    monitors: (unwrap(monitorsResult) ?? []) as Monitor[],
    statuses: (unwrap(statusesResult) ?? []) as MonitorStatus[],
    openIncidents: (unwrap(openResult) ?? []).map(normalizeIncident),
    recentIncidents: (unwrap(recentResult) ?? []).map(normalizeIncident),
    runs: (unwrap(runsResult) ?? []) as MonitorRun[],
    checks24h: checksResult.count ?? 0,
  };
}

export interface AdminServiceListItem extends Service {
  group_name: string;
  monitor_name: string | null;
  status: MonitorStatus | null;
}

export async function loadAdminServices(client: SupabaseClient): Promise<{
  groups: ServiceGroup[];
  services: AdminServiceListItem[];
  monitors: Pick<Monitor, 'id' | 'name' | 'enabled'>[];
}> {
  const [groupsResult, servicesResult, monitorsResult, statusesResult] = await Promise.all([
    client.from('service_groups').select('*').order('sort_order'),
    client.from('services').select('*').order('sort_order'),
    client.from('monitors').select('id, name, enabled').order('name'),
    client.from('monitor_status').select('*'),
  ]);

  const groups = (unwrap(groupsResult) ?? []) as ServiceGroup[];
  const services = (unwrap(servicesResult) ?? []) as Service[];
  const monitors = (unwrap(monitorsResult) ?? []) as Pick<Monitor, 'id' | 'name' | 'enabled'>[];
  const statuses = (unwrap(statusesResult) ?? []) as MonitorStatus[];

  return {
    groups,
    monitors,
    services: services.map((service) => ({
      ...service,
      group_name: groups.find((group) => group.id === service.group_id)?.name ?? 'Ungrouped',
      monitor_name: monitors.find((monitor) => monitor.id === service.monitor_id)?.name ?? null,
      status: statuses.find((status) => status.id === service.monitor_id) ?? null,
    })),
  };
}

export async function loadAdminService(client: SupabaseClient, id: string) {
  const [serviceResult, groupsResult, monitorsResult] = await Promise.all([
    client.from('services').select('*').eq('id', id).maybeSingle(),
    client.from('service_groups').select('*').order('sort_order'),
    client.from('monitors').select('id, name, enabled').order('name'),
  ]);
  const service = (unwrap(serviceResult) as Service | null) ?? null;

  let status: MonitorStatus | null = null;
  if (service?.monitor_id) {
    const statusResult = await client.from('monitor_status').select('*').eq('id', service.monitor_id).maybeSingle();
    status = (unwrap(statusResult) as MonitorStatus | null) ?? null;
  }

  return {
    service,
    groups: (unwrap(groupsResult) ?? []) as ServiceGroup[],
    monitors: (unwrap(monitorsResult) ?? []) as Pick<Monitor, 'id' | 'name' | 'enabled'>[],
    status,
  };
}

export interface AdminGroupListItem extends ServiceGroup {
  serviceCount: number;
}

export async function loadAdminGroups(client: SupabaseClient): Promise<AdminGroupListItem[]> {
  const [groupsResult, servicesResult] = await Promise.all([
    client.from('service_groups').select('*').order('sort_order'),
    client.from('services').select('group_id'),
  ]);

  const groups = (unwrap(groupsResult) ?? []) as ServiceGroup[];
  const services = (unwrap(servicesResult) ?? []) as { group_id: string }[];
  const counts = new Map<string, number>();
  for (const service of services) {
    counts.set(service.group_id, (counts.get(service.group_id) ?? 0) + 1);
  }

  return groups.map((group) => ({ ...group, serviceCount: counts.get(group.id) ?? 0 }));
}

export async function loadAdminGroup(client: SupabaseClient, id: string) {
  const [groupResult, servicesResult] = await Promise.all([
    client.from('service_groups').select('*').eq('id', id).maybeSingle(),
    client.from('services').select('id, name, slug, sort_order').eq('group_id', id).order('sort_order'),
  ]);

  return {
    group: (unwrap(groupResult) as ServiceGroup | null) ?? null,
    services: (unwrap(servicesResult) ?? []) as Pick<Service, 'id' | 'name' | 'slug' | 'sort_order'>[],
  };
}

export interface AdminMonitorView extends Monitor {
  status: MonitorStatus | null;
  latest: CheckResult | null;
  recent: CheckResult[];
}

export async function loadAdminMonitors(client: SupabaseClient): Promise<{
  monitors: AdminMonitorView[];
  runs: MonitorRun[];
}> {
  const [monitorsResult, statusesResult, checksResult, runsResult] = await Promise.all([
    client.from('monitors').select('*').order('name'),
    client.from('monitor_status').select('*'),
    client.from('check_results').select('*').order('checked_at', { ascending: false }).limit(200),
    client.from('monitor_runs').select('*').order('started_at', { ascending: false }).limit(8),
  ]);

  const monitors = (unwrap(monitorsResult) ?? []) as Monitor[];
  const statuses = (unwrap(statusesResult) ?? []) as MonitorStatus[];
  const checks = (unwrap(checksResult) ?? []) as CheckResult[];

  return {
    monitors: monitors.map((monitor) => {
      const monitorChecks = checks.filter((check) => check.monitor_id === monitor.id);
      return {
        ...monitor,
        status: statuses.find((status) => status.id === monitor.id) ?? null,
        latest: monitorChecks[0] ?? null,
        recent: monitorChecks.slice(0, 5),
      };
    }),
    runs: (unwrap(runsResult) ?? []) as MonitorRun[],
  };
}

export async function loadAdminMonitor(client: SupabaseClient, id: string): Promise<{
  monitor: Monitor;
  status: MonitorStatus | null;
  recent: CheckResult[];
} | null> {
  const [monitorResult, statusResult, checksResult] = await Promise.all([
    client.from('monitors').select('*').eq('id', id).maybeSingle(),
    client.from('monitor_status').select('*').eq('id', id).maybeSingle(),
    client.from('check_results').select('*').eq('monitor_id', id).order('checked_at', { ascending: false }).limit(20),
  ]);

  const monitor = (unwrap(monitorResult) as Monitor | null) ?? null;
  if (!monitor) return null;

  return {
    monitor,
    status: (unwrap(statusResult) as MonitorStatus | null) ?? null,
    recent: (unwrap(checksResult) ?? []) as CheckResult[],
  };
}

export async function loadAdminIncidents(client: SupabaseClient): Promise<IncidentWithRelations[]> {
  const result = await client
    .from('incidents')
    .select(INCIDENT_SELECT)
    .order('started_at', { ascending: false })
    .limit(100);
  return (unwrap(result) ?? []).map(normalizeIncident);
}

export async function loadAdminIncident(client: SupabaseClient, id: string): Promise<{
  incident: IncidentWithRelations | null;
  services: Service[];
}> {
  const [incidentResult, servicesResult] = await Promise.all([
    client.from('incidents').select(INCIDENT_SELECT).eq('id', id).maybeSingle(),
    client.from('services').select('*').order('sort_order'),
  ]);
  const raw = unwrap(incidentResult);
  return {
    incident: raw ? normalizeIncident(raw) : null,
    services: (unwrap(servicesResult) ?? []) as Service[],
  };
}

export async function loadAdminMaintenance(client: SupabaseClient): Promise<{
  windows: MaintenanceWithServices[];
  services: Service[];
}> {
  const [windowsResult, servicesResult] = await Promise.all([
    client
      .from('maintenance_windows')
      .select('*, maintenance_services(service_id)')
      .order('scheduled_start', { ascending: false }),
    client.from('services').select('*').order('sort_order'),
  ]);
  return {
    windows: (unwrap(windowsResult) ?? []) as MaintenanceWithServices[],
    services: (unwrap(servicesResult) ?? []) as Service[],
  };
}

export async function loadAdminMaintenanceItem(client: SupabaseClient, id: string): Promise<{
  window: MaintenanceWithServices | null;
  services: Service[];
}> {
  const [windowResult, servicesResult] = await Promise.all([
    client
      .from('maintenance_windows')
      .select('*, maintenance_services(service_id)')
      .eq('id', id)
      .maybeSingle(),
    client.from('services').select('*').order('sort_order'),
  ]);
  return {
    window: (unwrap(windowResult) as MaintenanceWithServices | null) ?? null,
    services: (unwrap(servicesResult) ?? []) as Service[],
  };
}
