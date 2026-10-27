export type IncidentStatus = 'investigating' | 'identified' | 'monitoring' | 'resolved';
export type IncidentImpact = 'none' | 'minor' | 'major' | 'critical';
export type MaintenanceStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

export type HealthState =
  | 'operational'
  | 'degraded'
  | 'outage'
  | 'maintenance'
  | 'unknown'
  | 'unmonitored';

export interface ServiceGroup {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sort_order: number;
}

export interface Service {
  id: string;
  group_id: string;
  monitor_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  is_public: boolean;
  sort_order: number;
}

export interface Monitor {
  id: string;
  name: string;
  url: string;
  method: 'GET' | 'HEAD';
  expected_status_min: number;
  expected_status_max: number;
  expected_text: string | null;
  timeout_ms: number;
  check_interval_seconds: number;
  failure_threshold: number;
  recovery_threshold: number;
  incident_impact: IncidentImpact;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface MonitorStatus {
  id: string;
  name: string;
  enabled: boolean;
  check_interval_seconds: number;
  checked_at: string | null;
  ok: boolean | null;
  status_code: number | null;
  response_time_ms: number | null;
}

export interface CheckResult {
  id: number;
  monitor_id: string;
  checked_at: string;
  ok: boolean;
  status_code: number | null;
  response_time_ms: number | null;
  error: string | null;
  body_excerpt: string | null;
}

export interface MonitorRun {
  id: string;
  started_at: string;
  finished_at: string | null;
  checks_run: number;
  failures: number;
  source: string;
}

export interface DailyStat {
  service_id: string;
  day: string;
  checks: number;
  ok_checks: number;
  avg_response_ms: number | null;
}

export interface Incident {
  id: string;
  title: string;
  status: IncidentStatus;
  impact: IncidentImpact;
  started_at: string;
  resolved_at: string | null;
  auto_detected: boolean;
  monitor_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface IncidentUpdate {
  id: string;
  incident_id: string;
  status: IncidentStatus;
  body: string;
  author: string;
  created_at: string;
}

export interface IncidentWithRelations extends Incident {
  incident_updates: IncidentUpdate[];
  incident_services: { service_id: string }[];
}

export interface MaintenanceWindow {
  id: string;
  title: string;
  body: string;
  status: MaintenanceStatus;
  scheduled_start: string;
  scheduled_end: string;
  created_at: string;
  updated_at: string;
}

export interface MaintenanceWithServices extends MaintenanceWindow {
  maintenance_services: { service_id: string }[];
}

export interface StatusSnapshot {
  configured: boolean;
  error?: string;
  generatedAt: string;
  groups: ServiceGroup[];
  services: Service[];
  monitors: MonitorStatus[];
  dailyStats: DailyStat[];
  openIncidents: IncidentWithRelations[];
  recentIncidents: IncidentWithRelations[];
  /** Every incident overlapping the 90-day stats window, including old resolved ones. */
  windowIncidents: IncidentWithRelations[];
  maintenance: MaintenanceWithServices[];
  lastRun: MonitorRun | null;
}

export interface UptimeWindow {
  checks: number;
  okChecks: number;
  percent: number | null;
}

/** A light projection of an incident onto one UTC day of the uptime bars. */
export interface BarIncident {
  id: string;
  title: string;
  status: IncidentStatus;
  impact: IncidentImpact;
  ongoing: boolean;
}

export interface DailyBar {
  day: string;
  checks: number;
  okChecks: number;
  percent: number | null;
  incidents: BarIncident[];
}
