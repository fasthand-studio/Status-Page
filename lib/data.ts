import { daysAgo, dayKey } from './format';
import { getPublicClient } from './supabase/public';
import type {
  DailyStat,
  IncidentWithRelations,
  MaintenanceWithServices,
  MonitorRun,
  MonitorStatus,
  Service,
  ServiceGroup,
  StatusSnapshot,
} from './types';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const INCIDENT_SELECT = '*, incident_updates(*), incident_services(service_id)';

function emptySnapshot(configured: boolean): StatusSnapshot {
  return {
    configured,
    generatedAt: new Date().toISOString(),
    groups: [],
    services: [],
    monitors: [],
    dailyStats: [],
    openIncidents: [],
    recentIncidents: [],
    maintenance: [],
    lastRun: null,
  };
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

export async function getStatusSnapshot(): Promise<StatusSnapshot> {
  const client = getPublicClient();
  if (!client) return emptySnapshot(false);

  const since = dayKey(daysAgo(89));

  const [groupsResult, servicesResult, monitorsResult, dailyResult, openResult, recentResult, maintenanceResult, runResult] =
    await Promise.all([
      client.from('service_groups').select('*').order('sort_order', { ascending: true }),
      client.from('services').select('*').eq('is_public', true).order('sort_order', { ascending: true }),
      client.from('monitor_status').select('*'),
      client.from('service_daily_stats').select('*').gte('day', since),
      client
        .from('incidents')
        .select(INCIDENT_SELECT)
        .is('resolved_at', null)
        .order('started_at', { ascending: false }),
      client
        .from('incidents')
        .select(INCIDENT_SELECT)
        .not('resolved_at', 'is', null)
        .order('resolved_at', { ascending: false })
        .limit(12),
      client
        .from('maintenance_windows')
        .select('*, maintenance_services(service_id)')
        .in('status', ['scheduled', 'in_progress'])
        .order('scheduled_start', { ascending: true }),
      client.from('monitor_runs').select('*').order('started_at', { ascending: false }).limit(1).maybeSingle(),
    ]);

  const firstError =
    groupsResult.error ||
    servicesResult.error ||
    monitorsResult.error ||
    dailyResult.error ||
    openResult.error ||
    recentResult.error ||
    maintenanceResult.error ||
    runResult.error;

  if (firstError) {
    console.error('[status] public data query failed:', firstError.message);
    return {
      ...emptySnapshot(true),
      error: 'Status data could not be loaded. The monitoring database may be unavailable.',
    };
  }

  return {
    configured: true,
    generatedAt: new Date().toISOString(),
    groups: (groupsResult.data ?? []) as ServiceGroup[],
    services: (servicesResult.data ?? []) as Service[],
    monitors: (monitorsResult.data ?? []) as MonitorStatus[],
    dailyStats: (dailyResult.data ?? []) as DailyStat[],
    openIncidents: (openResult.data ?? []).map(normalizeIncident),
    recentIncidents: (recentResult.data ?? []).map(normalizeIncident),
    maintenance: (maintenanceResult.data ?? []) as MaintenanceWithServices[],
    lastRun: (runResult.data as MonitorRun | null) ?? null,
  };
}

export async function getIncidentDetail(
  id: string,
): Promise<{ incident: IncidentWithRelations | null; error?: string }> {
  const client = getPublicClient();
  if (!client) return { incident: null };
  if (!UUID_PATTERN.test(id)) return { incident: null };

  const { data, error } = await client.from('incidents').select(INCIDENT_SELECT).eq('id', id).maybeSingle();
  if (error) {
    console.error('[status] incident query failed:', error.message);
    return { incident: null, error: 'This incident could not be loaded.' };
  }
  return { incident: data ? normalizeIncident(data) : null };
}

export async function getMaintenanceHistory(): Promise<MaintenanceWithServices[]> {
  const client = getPublicClient();
  if (!client) return [];
  const { data, error } = await client
    .from('maintenance_windows')
    .select('*, maintenance_services(service_id)')
    .order('scheduled_start', { ascending: false })
    .limit(60);
  if (error) {
    console.error('[status] maintenance query failed:', error.message);
    return [];
  }
  return (data ?? []) as MaintenanceWithServices[];
}

export async function getServiceDirectory(): Promise<Pick<Service, 'id' | 'name' | 'slug'>[]> {
  const client = getPublicClient();
  if (!client) return [];
  const { data, error } = await client
    .from('services')
    .select('id, name, slug')
    .eq('is_public', true)
    .order('sort_order', { ascending: true });
  if (error) {
    console.error('[status] service directory query failed:', error.message);
    return [];
  }
  return (data ?? []) as Pick<Service, 'id' | 'name' | 'slug'>[];
}

export async function getHistory() {
  const client = getPublicClient();
  if (!client) {
    return { configured: false, incidents: [] as IncidentWithRelations[], maintenance: [] as MaintenanceWithServices[] };
  }

  const [incidentsResult, maintenanceResult] = await Promise.all([
    client
      .from('incidents')
      .select(INCIDENT_SELECT)
      .not('resolved_at', 'is', null)
      .order('resolved_at', { ascending: false })
      .limit(100),
    client
      .from('maintenance_windows')
      .select('*, maintenance_services(service_id)')
      .order('scheduled_start', { ascending: false })
      .limit(60),
  ]);

  if (incidentsResult.error || maintenanceResult.error) {
    console.error(
      '[status] history query failed:',
      incidentsResult.error?.message ?? maintenanceResult.error?.message,
    );
  }

  return {
    configured: true,
    incidents: (incidentsResult.data ?? []).map(normalizeIncident),
    maintenance: (maintenanceResult.data ?? []) as MaintenanceWithServices[],
  };
}
