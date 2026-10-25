import { cn } from '@/lib/cn';
import { HEALTH_LABEL } from '@/lib/status';
import type { HealthState } from '@/lib/types';

const TONES: Record<HealthState | 'setup', string> = {
  operational: 'border-ok/25 bg-ok-soft/80 text-ok',
  degraded: 'border-warn/25 bg-warn-soft text-warn',
  outage: 'border-bad/25 bg-bad-soft text-bad',
  maintenance: 'border-info/20 bg-info-soft text-info',
  unknown: 'border-line bg-ink/[0.04] text-muted',
  unmonitored: 'border-dashed border-line bg-transparent text-muted',
  setup: 'border-line bg-ink/[0.04] text-muted',
};

const LABELS: Record<HealthState | 'setup', string> = {
  ...HEALTH_LABEL,
  setup: 'Not connected',
};

export function StatusPill({
  state,
  label,
  className,
}: {
  state: HealthState | 'setup';
  label?: string;
  className?: string;
  size?: 'sm' | 'md';
}) {
  return (
    <span
      className={cn(
        'fh-pill border font-medium',
        TONES[state],
        className,
      )}
    >
      <span className="h-1.5 w-1.5 fh-round bg-current" aria-hidden="true" />
      {label ?? LABELS[state]}
    </span>
  );
}
