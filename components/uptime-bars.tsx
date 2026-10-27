'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/cn';
import { formatDayLabel, formatUptime } from '@/lib/format';
import { IMPACT_LABEL, barTone, type BarTone } from '@/lib/status';
import type { BarIncident, DailyBar } from '@/lib/types';

const TONE_CLASS = {
  ok: 'bg-ok',
  'ok-soft': 'bg-ok/70',
  warn: 'bg-warn',
  bad: 'bg-bad',
  empty: 'bg-[#dfe3e8]',
} as const;

const TONE_WORD = { ok: 'Healthy', 'ok-soft': 'Healthy', warn: 'Degraded', bad: 'Outage', empty: 'No data' } as const;
const TONE_TEXT = {
  ok: 'text-ok',
  'ok-soft': 'text-ok',
  warn: 'text-warn',
  bad: 'text-bad',
  empty: 'text-muted',
} as const;

const MAX_INCIDENT_ROWS = 3;
const MOBILE_BARS = 30;

const ANCHOR_CLASS = {
  start: 'translate-x-0',
  center: '-translate-x-1/2',
  end: '-translate-x-full',
} as const;

export function UptimeBars({ bars, label }: { bars: DailyBar[]; label: string }) {
  return (
    <div className="w-full">
      <div className="sm:hidden">
        <BarRow bars={bars.slice(-MOBILE_BARS)} label={label} />
      </div>
      <div className="hidden sm:block">
        <BarRow bars={bars} label={label} />
      </div>
    </div>
  );
}

function BarRow({ bars, label }: { bars: DailyBar[]; label: string }) {
  const router = useRouter();
  const [hovered, setHovered] = useState<number | null>(null);
  const totalChecks = bars.reduce((total, bar) => total + bar.checks, 0);
  const okChecks = bars.reduce((total, bar) => total + bar.okChecks, 0);
  const percent = totalChecks > 0 ? (okChecks / totalChecks) * 100 : null;
  const active = hovered !== null ? bars[hovered] : null;
  const position = active ? (hovered! / Math.max(1, bars.length - 1)) * 100 : 0;
  const anchor = position < 25 ? 'start' : position > 75 ? 'end' : 'center';

  const openIncident = (incident: BarIncident) => (event: React.MouseEvent) => {
    event.stopPropagation();
    router.push(`/incidents/${incident.id}`);
  };

  return (
    <div className="relative" onMouseLeave={() => setHovered(null)}>
      {active && (
        <div
          className={cn(
            'absolute bottom-full z-20 mb-1.5 w-max max-w-[min(340px,100%)] break-words fh-r-sm border border-line bg-surface px-2 py-1.5 text-[14px] leading-snug text-ink',
            ANCHOR_CLASS[anchor],
            active.incidents.length > 0 ? 'pointer-events-auto' : 'pointer-events-none',
          )}
          style={{ left: `${position}%` }}
          role="status"
        >
          <span className="block text-muted">{formatDayLabel(active.day)}</span>
          <span className={cn('mt-0.5 block fh-num', TONE_TEXT[barTone(active)])}>
            {TONE_WORD[barTone(active)]}
            {active.percent !== null && ` · ${formatUptime(active.percent)} uptime`}
          </span>
          {active.incidents.length > 0 && (
            <span className="mt-1.5 block border-t border-line pt-1.5">
              {active.incidents.slice(0, MAX_INCIDENT_ROWS).map((incident) => (
                <button
                  type="button"
                  key={incident.id}
                  onClick={openIncident(incident)}
                  className="block w-full cursor-pointer text-left hover:underline"
                >
                  <span className="block truncate font-medium">{incident.title}</span>
                  <span className="block truncate text-muted">
                    {IMPACT_LABEL[incident.impact]} · {incident.ongoing ? 'Ongoing' : 'Resolved'}
                  </span>
                </button>
              ))}
              {active.incidents.length > MAX_INCIDENT_ROWS && (
                <span className="block text-muted">
                  +{active.incidents.length - MAX_INCIDENT_ROWS} more incident
                  {active.incidents.length - MAX_INCIDENT_ROWS === 1 ? '' : 's'}
                </span>
              )}
            </span>
          )}
        </div>
      )}

      <div
        role="group"
        aria-label={`${label}: ${formatUptime(percent)} uptime across ${bars.length} UTC days`}
        className="fh-bars"
      >
        {bars.map((bar, index) => {
          const tone: BarTone = barTone(bar);
          const shared = cn('min-w-0 flex-1 fh-bar', TONE_CLASS[tone]);

          if (bar.incidents.length === 0) {
            return (
              <div
                key={bar.day}
                onMouseEnter={() => setHovered(index)}
                onClick={() => setHovered(index)}
                className={shared}
              />
            );
          }

          const primary = bar.incidents[0];
          return (
            <button
              key={bar.day}
              type="button"
              onMouseEnter={() => setHovered(index)}
              onFocus={() => setHovered(index)}
              onClick={openIncident(primary)}
              aria-label={`${formatDayLabel(bar.day)}: ${primary.title}. Open incident details.`}
              className={cn(shared, 'cursor-pointer appearance-none border-0 p-0 text-left')}
            />
          );
        })}
      </div>
    </div>
  );
}
