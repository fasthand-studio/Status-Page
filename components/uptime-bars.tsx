'use client';

import { useState } from 'react';
import { cn } from '@/lib/cn';
import { formatDayLabel, formatUptime } from '@/lib/format';
import { barTone } from '@/lib/status';
import type { DailyBar } from '@/lib/types';

const TONE_CLASS = {
  ok: 'bg-ok',
  'ok-soft': 'bg-ok/70',
  warn: 'bg-warn',
  bad: 'bg-bad',
  empty: 'bg-[#dfe3e8]',
} as const;

export function UptimeBars({ bars, label }: { bars: DailyBar[]; label: string }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const totalChecks = bars.reduce((total, bar) => total + bar.checks, 0);
  const okChecks = bars.reduce((total, bar) => total + bar.okChecks, 0);
  const percent = totalChecks > 0 ? (okChecks / totalChecks) * 100 : null;
  const active = hovered !== null ? bars[hovered] : null;
  const left = hovered !== null ? Math.min(Math.max((hovered / Math.max(1, bars.length - 1)) * 100, 10), 90) : 0;

  return (
    <div className="w-full">
      <div className="relative" onMouseLeave={() => setHovered(null)}>
        {active && (
          <div
            className="pointer-events-none absolute -top-10 z-20 -translate-x-1/2 whitespace-nowrap fh-r-sm border border-line bg-surface px-2 py-1 text-[14px] leading-tight text-ink"
            style={{ left: `${left}%` }}
            role="status"
          >
            <span className="block text-muted">{formatDayLabel(active.day)}</span>
            <span className="mt-0.5 block fh-num">
              {active.percent === null ? 'No checks recorded' : `${formatUptime(active.percent)} uptime`}
              {active.checks > 0 && ` · ${active.checks} checks`}
            </span>
          </div>
        )}

        <div
          role="img"
          aria-label={`${label}: ${formatUptime(percent)} uptime across ${bars.length} UTC days, ${totalChecks} checks recorded`}
          className="fh-bars"
        >
          {bars.map((bar, index) => (
            <div
              key={bar.day}
              onMouseEnter={() => setHovered(index)}
              onClick={() => setHovered(index)}
              className={cn(
                'min-w-0 flex-1 fh-bar transition-opacity hover:opacity-70',
                TONE_CLASS[barTone(bar)],
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
