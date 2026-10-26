import { cn } from '@/lib/cn';
import { HEALTH_LABEL } from '@/lib/status';
import type { HealthState } from '@/lib/types';

const TONES: Record<HealthState | 'setup', string> = {
  operational: 'bg-ok-soft text-ok',
  degraded: 'bg-warn-soft text-warn',
  outage: 'bg-bad-soft text-bad',
  maintenance: 'bg-info-soft text-info',
  unknown: 'bg-surface-soft text-muted',
  unmonitored: 'bg-surface-soft text-muted',
  setup: 'bg-surface-soft text-muted',
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
    <span className={cn('fh-pill font-medium', TONES[state], className)}>
      <span className="h-1.5 w-1.5 fh-round bg-current" aria-hidden="true" />
      {label ?? LABELS[state]}
    </span>
  );
}
