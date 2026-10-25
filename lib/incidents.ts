import { formatDateTime } from './format';
import type { IncidentImpact } from './types';

export interface RecentCheck {
  checked_at: string;
  ok: boolean;
}

export type AutomationDecision =
  | { action: 'none' }
  | { action: 'open'; consecutiveFailures: number }
  | { action: 'resolve'; consecutiveSuccesses: number; incidentId: string };

export function sortNewestFirst(checks: RecentCheck[]): RecentCheck[] {
  return [...checks].sort(
    (a, b) => new Date(b.checked_at).getTime() - new Date(a.checked_at).getTime(),
  );
}

export function trailingCount(checks: RecentCheck[], ok: boolean): number {
  let count = 0;
  for (const check of sortNewestFirst(checks)) {
    if (check.ok !== ok) break;
    count += 1;
  }
  return count;
}

export function decideAutomation(input: {
  recentChecks: RecentCheck[];
  openAutoIncidentId: string | null;
  hasOtherOpenIncident: boolean;
  failureThreshold: number;
  recoveryThreshold: number;
}): AutomationDecision {
  const {
    recentChecks,
    openAutoIncidentId,
    hasOtherOpenIncident,
    failureThreshold,
    recoveryThreshold,
  } = input;

  if (recentChecks.length === 0) return { action: 'none' };

  if (openAutoIncidentId) {
    const consecutiveSuccesses = trailingCount(recentChecks, true);
    if (consecutiveSuccesses >= recoveryThreshold) {
      return { action: 'resolve', consecutiveSuccesses, incidentId: openAutoIncidentId };
    }
    return { action: 'none' };
  }

  if (hasOtherOpenIncident) return { action: 'none' };

  const consecutiveFailures = trailingCount(recentChecks, false);
  if (consecutiveFailures >= failureThreshold) {
    return { action: 'open', consecutiveFailures };
  }

  return { action: 'none' };
}

function codeValue(value: string): string {
  return `\`${value.replace(/`/g, "'").replace(/\s+/g, ' ').slice(0, 240)}\``;
}

export function buildAutoIncidentBody(input: {
  monitorName: string;
  failureCount: number;
  error: string | null;
  statusCode: number | null;
  checkedAt: string;
}): string {
  const lines = [
    `Automated checks for **${input.monitorName}** have failed **${input.failureCount} times in a row**.`,
    '',
    `- Last HTTP status: ${input.statusCode === null ? 'no response' : codeValue(String(input.statusCode))}`,
    `- Last error: ${input.error ? codeValue(input.error) : 'the check did not pass'}`,
    `- Last check: ${formatDateTime(input.checkedAt)}`,
    '',
    'The incident opened automatically. Responding here will not stop the monitor; the incident closes after sustained successful checks or when a team member resolves it.',
  ];
  return lines.join('\n');
}

export function buildAutoRecoveryBody(input: {
  monitorName: string;
  successCount: number;
  checkedAt: string;
}): string {
  return [
    `Automated checks for **${input.monitorName}** have succeeded **${input.successCount} times in a row**.`,
    '',
    `The last successful check was at ${formatDateTime(input.checkedAt)}. This incident is resolved.`,
  ].join('\n');
}

export const DEFAULT_AUTO_IMPACT: IncidentImpact = 'major';
