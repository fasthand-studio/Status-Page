import { cn } from '@/lib/cn';
import { HEALTH_LABEL } from '@/lib/status';
import type { HealthState } from '@/lib/types';
import { AlertIcon, CheckIcon, CrossIcon, MinusIcon, WrenchIcon } from './icons';

const ICONS: Record<HealthState | 'setup', typeof CheckIcon> = {
  operational: CheckIcon,
  degraded: AlertIcon,
  outage: CrossIcon,
  maintenance: WrenchIcon,
  unknown: MinusIcon,
  unmonitored: MinusIcon,
  setup: MinusIcon,
};

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
  const Icon = ICONS[state];

  return (
    <span className={cn('fh-pill font-medium', TONES[state], className)}>
      <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={2.3} aria-hidden="true" />
      {label ?? LABELS[state]}
    </span>
  );
}
