import { formatRelativeTime } from '@/lib/format';
import { isMaintenanceActive } from '@/lib/status';
import type { MaintenanceStatus, MaintenanceWithServices } from '@/lib/types';

export type MaintenancePhaseKey = MaintenanceStatus | 'ended';

export const MAINTENANCE_PHASE_TONE: Record<MaintenancePhaseKey, string> = {
  scheduled: 'bg-info-soft text-info',
  in_progress: 'bg-warn-soft text-warn',
  completed: 'bg-ok-soft text-ok',
  cancelled: 'bg-surface-soft text-muted',
  ended: 'bg-surface-soft text-muted',
};

export function maintenancePhase(
  window: MaintenanceWithServices,
  now: Date,
): { key: MaintenancePhaseKey; label: string; note: string } {
  if (window.status === 'completed') {
    return { key: 'completed', label: 'Completed', note: `Ended ${formatRelativeTime(window.scheduled_end, now)}` };
  }
  if (window.status === 'cancelled') {
    return { key: 'cancelled', label: 'Cancelled', note: 'Window cancelled' };
  }
  if (isMaintenanceActive(window, now)) {
    return { key: 'in_progress', label: 'In progress', note: `Ends ${formatRelativeTime(window.scheduled_end, now)}` };
  }
  if (new Date(window.scheduled_start).getTime() > now.getTime()) {
    return { key: 'scheduled', label: 'Scheduled', note: `Starts ${formatRelativeTime(window.scheduled_start, now)}` };
  }
  return { key: 'ended', label: 'Window ended', note: 'Not marked complete' };
}
