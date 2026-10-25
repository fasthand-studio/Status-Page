import { cn } from '@/lib/cn';
import { isMonitorStale } from '@/lib/status';
import type { MonitorStatus } from '@/lib/types';

export type MonitorStateKey = 'ok' | 'fail' | 'stale' | 'waiting' | 'paused' | 'none';

export function monitorStateKey(status: MonitorStatus | null): MonitorStateKey {
  if (!status) return 'none';
  if (!status.enabled) return 'paused';
  if (!status.checked_at) return 'waiting';
  if (isMonitorStale(status)) return 'stale';
  return status.ok ? 'ok' : 'fail';
}

const COPY: Record<MonitorStateKey, { label: string; dot: string; text: string }> = {
  ok: { label: 'Operational', dot: 'bg-ok', text: 'text-ok' },
  fail: { label: 'Failing', dot: 'bg-bad', text: 'text-bad' },
  stale: { label: 'Stale', dot: 'bg-warn', text: 'text-warn' },
  waiting: { label: 'Waiting for first check', dot: 'bg-muted/50', text: 'text-muted' },
  paused: { label: 'Paused', dot: 'bg-muted/40', text: 'text-muted' },
  none: { label: 'No monitor', dot: 'bg-muted/30', text: 'text-muted' },
};

export function MonitorState({ status, className }: { status: MonitorStatus | null; className?: string }) {
  const key = monitorStateKey(status);
  const copy = COPY[key];
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-[15px] font-medium', copy.text, className)}>
      <span className={cn('h-1.5 w-1.5 shrink-0 fh-round', copy.dot)} aria-hidden="true" />
      {copy.label}
    </span>
  );
}

export function monitorStateLabel(status: MonitorStatus | null): string {
  return COPY[monitorStateKey(status)].label;
}
