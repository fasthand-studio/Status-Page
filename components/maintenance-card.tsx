import { cn } from '@/lib/cn';
import { formatRelativeTime, formatWindow } from '@/lib/format';
import { isMaintenanceActive } from '@/lib/status';
import type { MaintenanceStatus, MaintenanceWithServices } from '@/lib/types';
import { Markdown } from './markdown';
import { WrenchIcon } from './icons';

const PHASE_TONE = {
  scheduled: 'border-info/20 bg-info-soft text-info',
  in_progress: 'border-info/25 bg-info-soft text-info',
  completed: 'border-ok/25 bg-ok-soft text-ok',
  cancelled: 'border-line bg-ink/[0.04] text-muted',
  ended: 'border-line bg-ink/[0.04] text-muted',
} as const;

function phase(window: MaintenanceWithServices, now: Date): {
  key: MaintenanceStatus | 'ended';
  label: string;
  note: string;
} {
  if (window.status === 'completed') {
    return { key: 'completed', label: 'Completed', note: `Ended ${formatRelativeTime(window.scheduled_end, now)}` };
  }
  if (window.status === 'cancelled') {
    return { key: 'cancelled', label: 'Cancelled', note: 'This window was cancelled.' };
  }
  if (isMaintenanceActive(window, now)) {
    return { key: 'in_progress', label: 'In progress', note: `Ends ${formatRelativeTime(window.scheduled_end, now)}` };
  }
  if (new Date(window.scheduled_start).getTime() > now.getTime()) {
    return { key: 'scheduled', label: 'Scheduled', note: `Starts ${formatRelativeTime(window.scheduled_start, now)}` };
  }
  return { key: 'ended', label: 'Window ended', note: 'The window passed without being marked complete.' };
}

export function MaintenanceCard({
  window,
  affectedServices,
  now,
}: {
  window: MaintenanceWithServices;
  affectedServices: string[];
  now: Date;
}) {
  const current = phase(window, now);

  return (
    <article className="relative fh-card border border-line bg-surface p-5 sm:p-6">
      <span
        className={cn(
          'absolute inset-y-5 left-0 w-[3px] fh-bar',
          current.key === 'in_progress' ? 'bg-info' : current.key === 'completed' ? 'bg-ok' : 'bg-line',
        )}
        aria-hidden="true"
      />
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={cn(
            'inline-flex items-center gap-1.5 fh-round border px-2.5 py-1 font-sans text-[13px] font-medium',
            PHASE_TONE[current.key],
          )}
        >
          <WrenchIcon className="h-3 w-3" />
          {current.label}
        </span>
        <span className="ml-auto font-sans text-[13px] text-muted">
          {current.note}
        </span>
      </div>

      <h3 className="mt-3 font-sans text-[20px] font-semibold leading-tight tracking-[-0.03em]">
        {window.title}
      </h3>
      <p className="mt-1 font-sans text-[13px] text-muted">
        {formatWindow(window.scheduled_start, window.scheduled_end)}
      </p>

      {window.body && <Markdown className="mt-3 max-w-3xl">{window.body}</Markdown>}

      {affectedServices.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {affectedServices.map((name) => (
            <span
              key={name}
              className="fh-round border border-line bg-paper/60 px-2 py-0.5 font-sans text-[13px] text-muted"
            >
              {name}
            </span>
          ))}
        </div>
      )}
    </article>
  );
}
