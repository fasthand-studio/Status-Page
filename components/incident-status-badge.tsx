import { cn } from '@/lib/cn';
import { IMPACT_LABEL } from '@/lib/status';
import type { IncidentImpact, IncidentStatus } from '@/lib/types';

const STATUS_TONE: Record<IncidentStatus, string> = {
  investigating: 'bg-bad-soft text-bad',
  identified: 'bg-warn-soft text-warn',
  monitoring: 'bg-info-soft text-info',
  resolved: 'bg-ok-soft text-ok',
};

const STATUS_LABEL: Record<IncidentStatus, string> = {
  investigating: 'Investigating',
  identified: 'Identified',
  monitoring: 'Monitoring',
  resolved: 'Resolved',
};

const IMPACT_TONE: Record<IncidentImpact, string> = {
  critical: 'bg-bad-soft text-bad',
  major: 'bg-warn-soft text-warn',
  minor: 'bg-info-soft text-info',
  none: 'bg-surface-soft text-muted',
};

export function IncidentStatusBadge({
  status,
}: {
  status: IncidentStatus;
  size?: 'sm' | 'md';
}) {
  return (
    <span className={cn('fh-pill font-medium', STATUS_TONE[status])}>
      {STATUS_LABEL[status]}
    </span>
  );
}

export function ImpactBadge({ impact }: { impact: IncidentImpact; size?: 'sm' | 'md' }) {
  return (
    <span className={cn('fh-pill font-medium', IMPACT_TONE[impact])}>
      {impact === 'none' ? 'No impact' : `${IMPACT_LABEL[impact]} impact`}
    </span>
  );
}

export const INCIDENT_STATUS_OPTIONS = Object.entries(STATUS_LABEL) as [IncidentStatus, string][];
export const INCIDENT_IMPACT_OPTIONS = Object.entries(IMPACT_LABEL) as [IncidentImpact, string][];
