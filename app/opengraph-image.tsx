import { ImageResponse } from 'next/og';
import { getStatusSnapshot } from '@/lib/data';
import { dayKey, daysAgo } from '@/lib/format';
import {
  barTone,
  deriveOverallStatus,
  deriveServiceHealth,
  groupWorstHealth,
  HEALTH_LABEL,
  type ServiceHealth,
} from '@/lib/status';
import type { DailyBar, DailyStat, HealthState } from '@/lib/types';

export const dynamic = 'force-dynamic';

export const alt = 'FastHand Status — live uptime and incident history';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const INK = '#15191F';
const MUTED = '#5A6470';
const LINE = '#E1E4E8';
const PAPER = '#FFFFFF';
const PRIMARY = '#5200FE';

const TONE_COLOR = {
  ok: '#137A3F',
  warn: '#8A5A00',
  bad: '#B3261E',
  muted: '#5A6470',
  info: '#42526B',
} as const;

const STATE_COLOR: Record<HealthState, string> = {
  operational: '#137A3F',
  degraded: '#8A5A00',
  outage: '#B3261E',
  maintenance: '#42526B',
  unknown: '#5A6470',
  unmonitored: '#5A6470',
};

const BAR_COLOR = {
  ok: '#137A3F',
  'ok-soft': '#4E9A6A',
  warn: '#8A5A00',
  bad: '#B3261E',
  empty: '#DFE3E8',
} as const;

function aggregateBars(dailyStats: DailyStat[], now: Date): DailyBar[] {
  const totals = new Map<string, { checks: number; okChecks: number }>();
  for (const stat of dailyStats) {
    const row = totals.get(stat.day) ?? { checks: 0, okChecks: 0 };
    row.checks += stat.checks;
    row.okChecks += stat.ok_checks;
    totals.set(stat.day, row);
  }

  const start = daysAgo(89, now);
  const bars: DailyBar[] = [];

  for (let index = 0; index < 90; index += 1) {
    const date = new Date(start);
    date.setUTCDate(date.getUTCDate() + index);
    const day = dayKey(date);
    const row = totals.get(day);
    bars.push({
      day,
      checks: row?.checks ?? 0,
      okChecks: row?.okChecks ?? 0,
      percent: row && row.checks > 0 ? (row.okChecks / row.checks) * 100 : null,
    });
  }

  return bars;
}

export default async function OpengraphImage() {
  const now = new Date();
  const snapshot = await getStatusSnapshot();

  const unavailable = Boolean(snapshot.error);
  const overall = deriveOverallStatus({
    configured: snapshot.configured,
    services: snapshot.services,
    monitors: snapshot.monitors,
    openIncidents: snapshot.openIncidents,
    maintenance: snapshot.maintenance,
    now,
  });
  const monitorById = new Map(snapshot.monitors.map((monitor) => [monitor.id, monitor]));

  const healths = snapshot.services.map((service) =>
    deriveServiceHealth({
      service,
      monitor: service.monitor_id ? monitorById.get(service.monitor_id) ?? null : null,
      incidents: snapshot.openIncidents,
      maintenance: snapshot.maintenance,
      now,
    }),
  );
  const healthByService = new Map(snapshot.services.map((service, index) => [service.id, healths[index]]));

  const groups = snapshot.groups.map((group) => {
    const inGroup = snapshot.services
      .filter((service) => service.group_id === group.id)
      .map((service) => healthByService.get(service.id))
      .filter((health): health is ServiceHealth => Boolean(health));
    return {
      id: group.id,
      name: group.name,
      state: (inGroup.length ? groupWorstHealth(inGroup) : 'unknown') as HealthState,
    };
  });
  const shownGroups = groups.slice(0, 4);
  const extraGroups = groups.length - shownGroups.length;

  const bars = aggregateBars(snapshot.dailyStats, now);
  const checkedDays = bars.filter((bar) => bar.checks > 0).length;
  const showHistory = checkedDays >= 7;

  const tone = unavailable ? 'muted' : overall.tone;
  const label = unavailable ? 'Status unavailable' : overall.label;
  const detail = unavailable
    ? 'The page will not guess when the checks cannot be read.'
    : overall.detail;

  const facts = [
    { label: 'Monitored', value: `${overall.monitoredCount} / ${overall.totalServices}` },
    { label: 'Fresh checks', value: `${overall.freshCount} / ${overall.monitoredCount}` },
    { label: 'Stale', value: String(overall.staleCount) },
    { label: 'Open incidents', value: String(snapshot.openIncidents.length) },
  ];

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: PAPER,
          color: INK,
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', height: 6, backgroundColor: PRIMARY }} />

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            height: 86,
            padding: '0 52px',
            borderBottom: `1px solid ${LINE}`,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 42,
              height: 42,
              borderRadius: 12,
              backgroundColor: PRIMARY,
              color: PAPER,
              fontSize: 24,
              fontWeight: 700,
            }}
          >
            F
          </div>
          <div style={{ display: 'flex', marginLeft: 14, fontSize: 22, fontWeight: 600 }}>FastHand Status</div>
          <div style={{ display: 'flex', width: 1, height: 22, backgroundColor: LINE, margin: '0 18px' }} />
          <div style={{ display: 'flex', fontSize: 17, color: MUTED }}>status.fasthandstudio.asia</div>
          <div style={{ display: 'flex', flexGrow: 1 }} />
          <div style={{ display: 'flex', fontSize: 16, color: MUTED }}>Uptime from stored checks</div>
        </div>

        <div style={{ display: 'flex', flexGrow: 1, padding: '38px 52px 0', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', width: 636, marginRight: 56, paddingTop: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div
                style={{
                  display: 'flex',
                  width: 14,
                  height: 14,
                  borderRadius: 7,
                  backgroundColor: TONE_COLOR[tone],
                  marginRight: 12,
                }}
              />
              <div style={{ display: 'flex', fontSize: 18, color: MUTED }}>
                {unavailable ? 'Status' : 'Overall status'}
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                marginTop: 16,
                fontSize: 70,
                fontWeight: 700,
                lineHeight: 1.06,
                letterSpacing: -2.4,
              }}
            >
              {label}
            </div>

            <div style={{ display: 'flex', marginTop: 18, width: 560, fontSize: 21, lineHeight: 1.45, color: MUTED }}>
              {detail}
            </div>

            {showHistory && (
              <div style={{ display: 'flex', flexDirection: 'column', marginTop: 34 }}>
                <div style={{ display: 'flex', height: 28 }}>
                  {bars.map((bar) => (
                    <div
                      key={bar.day}
                      style={{
                        display: 'flex',
                        width: 5,
                        height: 28,
                        marginRight: 2,
                        borderRadius: 2,
                        backgroundColor: BAR_COLOR[barTone(bar)],
                      }}
                    />
                  ))}
                </div>
                <div style={{ display: 'flex', marginTop: 10, fontSize: 15, color: MUTED }}>
                  Last 90 days · one bar per UTC day · measured checks only
                </div>
              </div>
            )}
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              width: 400,
              border: `1px solid ${LINE}`,
              borderRadius: 24,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 20px',
                borderBottom: `1px solid ${LINE}`,
                backgroundColor: '#F6F7F9',
              }}
            >
              <div style={{ display: 'flex', fontSize: 17, color: MUTED }}>Service groups</div>
              <div style={{ display: 'flex', fontSize: 16, color: MUTED }}>{groups.length}</div>
            </div>

            {shownGroups.length === 0 && (
              <div style={{ display: 'flex', padding: '18px 20px', fontSize: 18, color: MUTED }}>
                No public groups yet
              </div>
            )}

            {shownGroups.map((group) => (
              <div
                key={group.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '15px 20px',
                  borderBottom: `1px solid ${LINE}`,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    width: 10,
                    height: 10,
                    borderRadius: 5,
                    backgroundColor: STATE_COLOR[group.state],
                    marginRight: 12,
                  }}
                />
                <div style={{ display: 'flex', fontSize: 20, fontWeight: 500 }}>{group.name}</div>
                <div style={{ display: 'flex', flexGrow: 1 }} />
                <div style={{ display: 'flex', fontSize: 16, color: MUTED }}>{HEALTH_LABEL[group.state]}</div>
              </div>
            ))}

            {extraGroups > 0 && (
              <div style={{ display: 'flex', padding: '14px 20px', fontSize: 16, color: MUTED }}>
                + {extraGroups} more {extraGroups === 1 ? 'group' : 'groups'}
              </div>
            )}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            padding: '24px 52px 36px',
            borderTop: `1px solid ${LINE}`,
          }}
        >
          {facts.map((fact) => (
            <div key={fact.label} style={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
              <div style={{ display: 'flex', fontSize: 36, fontWeight: 600, letterSpacing: -1 }}>{fact.value}</div>
              <div style={{ display: 'flex', marginTop: 4, fontSize: 15, color: MUTED }}>{fact.label}</div>
            </div>
          ))}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <div style={{ display: 'flex', fontSize: 16, color: MUTED }}>Measured, never estimated</div>
            <div style={{ display: 'flex', marginTop: 4, fontSize: 15, color: MUTED }}>
              {unavailable ? 'Data unavailable' : 'Public status page'}
            </div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
