import { cn } from '@/lib/cn';
import { isMonitorStale } from '@/lib/status';
import type { MonitorStatus } from '@/lib/types';
import { AlertIcon, CheckIcon, CrossIcon, MinusIcon } from '../icons';

export type MonitorStateKey = 'ok' | 'fail' | 'stale' | 'waiting' | 'paused' | 'none';

export function monitorStateKey(status: MonitorStatus | null): MonitorStateKey {
  if (!status) return 'none';
  if (!status.enabled) return 'paused';
  if (!status.checked_at) return 'waiting';
  if (isMonitorStale(status)) return 'stale';
  return status.ok ? 'ok' : 'fail';
}

const COPY: Record<MonitorStateKey, { label: string; icon: typeof CheckIcon; text: string }> = {
  ok: { label: 'Operational', icon: CheckIcon, text: 'text-ok' },
  fail: { label: 'Failing', icon: CrossIcon, text: 'text-bad' },
  stale: { label: 'Stale', icon: AlertIcon, text: 'text-warn' },
  waiting: { label: 'Waiting for first check', icon: MinusIcon, text: 'text-muted' },
  paused: { label: 'Paused', icon: MinusIcon, text: 'text-muted' },
  none: { label: 'No monitor', icon: MinusIcon, text: 'text-muted' },
};

export function MonitorState({ status, className }: { status: MonitorStatus | null; className?: string }) {
  const key = monitorStateKey(status);
  const copy = COPY[key];
  const Icon = copy.icon;
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-[15px] font-medium', copy.text, className)}>
      <Icon aria-hidden="true" strokeWidth={2.3} className="h-3.5 w-3.5 shrink-0" />
      {copy.label}
    </span>
  );
}

export function monitorStateLabel(status: MonitorStatus | null): string {
  return COPY[monitorStateKey(status)].label;
}
