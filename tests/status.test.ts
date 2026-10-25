import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildDailyBars,
  deriveOverallStatus,
  deriveServiceHealth,
  isMonitorStale,
  summarizeUptime,
} from '../lib/status';
import { formatUptime } from '../lib/format';
import type {
  DailyStat,
  IncidentWithRelations,
  MonitorStatus,
  Service,
} from '../lib/types';

const now = new Date('2026-10-25T12:00:00.000Z');

const service: Service = {
  id: 'service-1',
  group_id: 'group-1',
  monitor_id: 'monitor-1',
  name: 'Data Center',
  slug: 'data-center',
  description: null,
  is_public: true,
  sort_order: 0,
};

const passingMonitor: MonitorStatus = {
  id: 'monitor-1',
  name: 'Data center heartbeat',
  enabled: true,
  check_interval_seconds: 300,
  checked_at: '2026-10-25T11:58:00.000Z',
  ok: true,
  status_code: 200,
  response_time_ms: 42,
};

function makeIncident(overrides: Partial<IncidentWithRelations> = {}): IncidentWithRelations {
  return {
    id: 'incident-1',
    title: 'Elevated errors',
    status: 'investigating',
    impact: 'major',
    started_at: '2026-10-25T11:00:00.000Z',
    resolved_at: null,
    auto_detected: false,
    monitor_id: null,
    created_at: '2026-10-25T11:00:00.000Z',
    updated_at: '2026-10-25T11:00:00.000Z',
    incident_updates: [],
    incident_services: [{ service_id: service.id }],
    ...overrides,
  };
}

test('a fresh passing check is operational', () => {
  const health = deriveServiceHealth({
    service,
    monitor: passingMonitor,
    incidents: [],
    maintenance: [],
    now,
  });
  assert.equal(health.state, 'operational');
});

test('an open major incident overrides a passing monitor', () => {
  const health = deriveServiceHealth({
    service,
    monitor: passingMonitor,
    incidents: [makeIncident()],
    maintenance: [],
    now,
  });
  assert.equal(health.state, 'outage');
});

test('a minor incident shows degraded, not outage', () => {
  const health = deriveServiceHealth({
    service,
    monitor: passingMonitor,
    incidents: [makeIncident({ impact: 'minor' })],
    maintenance: [],
    now,
  });
  assert.equal(health.state, 'degraded');
});

test('a stale check is unknown, never operational', () => {
  const health = deriveServiceHealth({
    service,
    monitor: {
      ...passingMonitor,
      checked_at: '2026-10-25T10:00:00.000Z',
    },
    incidents: [],
    maintenance: [],
    now,
  });
  assert.equal(health.state, 'unknown');
  assert.match(health.detail, /do not assume/i);
});

test('a service without a monitor is unmonitored, not green', () => {
  const health = deriveServiceHealth({
    service: { ...service, monitor_id: null },
    monitor: null,
    incidents: [],
    maintenance: [],
    now,
  });
  assert.equal(health.state, 'unmonitored');
});

test('a paused monitor is labelled paused', () => {
  const health = deriveServiceHealth({
    service,
    monitor: { ...passingMonitor, enabled: false },
    incidents: [],
    maintenance: [],
    now,
  });
  assert.equal(health.state, 'unmonitored');
  assert.equal(health.label, 'Paused');
});

test('isMonitorStale tolerates 3 intervals with a 15 minute floor', () => {
  const fresh = { ...passingMonitor, checked_at: '2026-10-25T11:55:00.000Z' };
  const stale = { ...passingMonitor, checked_at: '2026-10-25T11:44:00.000Z' };
  assert.equal(isMonitorStale(fresh, now), false);
  assert.equal(isMonitorStale(stale, now), true);
});

test('overall status refuses to be operational with no monitors', () => {
  const overall = deriveOverallStatus({
    configured: true,
    services: [{ ...service, monitor_id: null }],
    monitors: [],
    openIncidents: [],
    maintenance: [],
    now,
  });
  assert.equal(overall.state, 'unknown');
  assert.equal(overall.label, 'No automated checks are running');
});

test('overall status waits honestly for the first check', () => {
  const overall = deriveOverallStatus({
    configured: true,
    services: [service],
    monitors: [{ ...passingMonitor, checked_at: null, ok: null, status_code: null, response_time_ms: null }],
    openIncidents: [],
    maintenance: [],
    now,
  });
  assert.equal(overall.label, 'Waiting for the first check');
  assert.equal(overall.state, 'unknown');
});

test('overall status can be operational but says green is not proof', () => {
  const overall = deriveOverallStatus({
    configured: true,
    services: [service],
    monitors: [passingMonitor],
    openIncidents: [],
    maintenance: [],
    now,
  });
  assert.equal(overall.state, 'operational');
  assert.equal(overall.label, 'All systems operational');
  assert.match(overall.detail, /not proof/i);
});

test('uptime sums only stored checks in the requested window', () => {
  const stats: DailyStat[] = [
    { service_id: service.id, day: '2026-10-20', checks: 100, ok_checks: 99, avg_response_ms: 40 },
    { service_id: service.id, day: '2026-09-01', checks: 500, ok_checks: 0, avg_response_ms: null },
  ];
  const uptime = summarizeUptime(stats, service.id, 30, now);
  assert.equal(uptime.checks, 100);
  assert.equal(uptime.okChecks, 99);
  assert.equal(uptime.percent, 99);
});

test('missing days produce empty bars instead of invented uptime', () => {
  const bars = buildDailyBars([], service.id, now, 90);
  assert.equal(bars.length, 90);
  assert.ok(bars.every((bar) => bar.percent === null));
  assert.equal(bars[89].day, '2026-10-25');
});

test('formatUptime truncates instead of rounding up to a false 100%', () => {
  assert.equal(formatUptime(99.999), '99.99%');
  assert.equal(formatUptime(99.994), '99.99%');
  assert.equal(formatUptime(100), '100%');
  assert.equal(formatUptime(null), '—');
});
