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
  empty: 'bg-ink/10',
} as const;

export function UptimeBars({
  bars,
  label,
  compact = false,
  showLabels = true,
  className,
}: {
  bars: DailyBar[];
  label: string;
  compact?: boolean;
  showLabels?: boolean;
  className?: string;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const totalChecks = bars.reduce((total, bar) => total + bar.checks, 0);
  const okChecks = bars.reduce((total, bar) => total + bar.okChecks, 0);
  const percent = totalChecks > 0 ? (okChecks / totalChecks) * 100 : null;
  const active = hovered !== null ? bars[hovered] : null;
  const left = hovered !== null ? Math.min(Math.max((hovered / Math.max(1, bars.length - 1)) * 100, 9), 91) : 0;

  return (
    <div className={cn('w-full', className)}>
      <div className="relative" onMouseLeave={() => setHovered(null)}>
        {active && (
          <div
            className="pointer-events-none absolute -top-12 z-20 -translate-x-1/2 fh-r-sm border border-ink bg-ink px-2.5 py-1.5 font-sans text-[13px] leading-tight text-paper "
            style={{ left: `${left}%` }}
            role="status"
          >
            <span className="block text-[13px] text-paper/60">
              {formatDayLabel(active.day)}
            </span>
            <span className="mt-0.5 block">
              {active.percent === null ? 'No checks recorded' : `${formatUptime(active.percent)} uptime`}
              {active.checks > 0 && ` · ${active.checks} checks`}
            </span>
          </div>
        )}

        <div
          role="img"
          aria-label={`${label}: ${formatUptime(percent)} uptime across ${bars.length} UTC days, ${totalChecks} checks recorded`}
          className={cn('flex items-stretch gap-[2px]', compact ? 'h-5' : 'h-7')}
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

      {showLabels && (
        <div className="mt-1.5 flex items-center justify-between font-sans text-[13px] text-muted">
          <span>{bars.length} days ago</span>
          <span>Today</span>
        </div>
      )}
    </div>
  );
}
