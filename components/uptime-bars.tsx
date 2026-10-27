'use client';

import { useEffect, useRef, useState } from 'react';
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

interface Tip {
  bar: DailyBar;
  left: number;
  top: number;
  align: keyof typeof ANCHOR_CLASS;
}

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
  const rowRef = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<Tip | null>(null);
  const totalChecks = bars.reduce((total, bar) => total + bar.checks, 0);
  const okChecks = bars.reduce((total, bar) => total + bar.okChecks, 0);
  const percent = totalChecks > 0 ? (okChecks / totalChecks) * 100 : null;

  useEffect(() => {
    if (!tip) return;
    const clear = () => setTip(null);
    window.addEventListener('scroll', clear, { passive: true, capture: true });
    return () => window.removeEventListener('scroll', clear, { capture: true });
  }, [tip]);

  // The card is fixed to the viewport because the group panel clips with
  // overflow-hidden, which cut the card off for the first service in a group.
  const showTip = (index: number, target: HTMLElement) => {
    const bar = target.getBoundingClientRect();
    const row = rowRef.current?.getBoundingClientRect();
    const centre = (bar.left + bar.right) / 2;
    const ratio = row ? (centre - row.left) / Math.max(1, row.width) : 0.5;
    const align = ratio < 0.25 ? 'start' : ratio > 0.75 ? 'end' : 'center';
    const left = align === 'start' ? bar.left : align === 'end' ? bar.right : centre;
    setTip({
      bar: bars[index],
      left: Math.min(Math.max(left, 8), window.innerWidth - 8),
      top: bar.top - 6,
      align,
    });
  };

  const openIncident = (incident: BarIncident) => (event: React.MouseEvent) => {
    event.stopPropagation();
    router.push(`/incidents/${incident.id}`);
  };

  return (
    <div onMouseLeave={() => setTip(null)}>
      {tip && (
        <div
          className={cn(
            'fixed z-50 -translate-y-full w-max max-w-[min(340px,calc(100vw-16px))] break-words fh-r-sm border border-line bg-surface px-2 py-1.5 text-[14px] leading-snug text-ink',
            ANCHOR_CLASS[tip.align],
            tip.bar.incidents.length > 0 ? 'pointer-events-auto' : 'pointer-events-none',
          )}
          style={{ left: tip.left, top: tip.top }}
          role="status"
        >
          <span className="block text-muted">{formatDayLabel(tip.bar.day)}</span>
          <span className={cn('mt-0.5 block fh-num', TONE_TEXT[barTone(tip.bar)])}>
            {TONE_WORD[barTone(tip.bar)]}
            {tip.bar.percent !== null && ` · ${formatUptime(tip.bar.percent)} uptime`}
          </span>
          {tip.bar.incidents.length > 0 && (
            <span className="mt-1.5 block border-t border-line pt-1.5">
              {tip.bar.incidents.slice(0, MAX_INCIDENT_ROWS).map((incident) => (
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
              {tip.bar.incidents.length > MAX_INCIDENT_ROWS && (
                <span className="block text-muted">
                  +{tip.bar.incidents.length - MAX_INCIDENT_ROWS} more incident
                  {tip.bar.incidents.length - MAX_INCIDENT_ROWS === 1 ? '' : 's'}
                </span>
              )}
            </span>
          )}
        </div>
      )}

      <div
        ref={rowRef}
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
                onMouseEnter={(event) => showTip(index, event.currentTarget)}
                onClick={(event) => showTip(index, event.currentTarget)}
                className={shared}
              />
            );
          }

          const primary = bar.incidents[0];
          return (
            <button
              key={bar.day}
              type="button"
              onMouseEnter={(event) => showTip(index, event.currentTarget)}
              onFocus={(event) => showTip(index, event.currentTarget)}
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
