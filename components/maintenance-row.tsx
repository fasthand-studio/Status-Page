import { ChevronDownIcon } from '@/components/icons';
import { Markdown } from '@/components/markdown';
import { formatDateTime, formatWindowShort } from '@/lib/format';
import { maintenancePhase, MAINTENANCE_PHASE_TONE } from '@/lib/maintenance';
import type { MaintenanceWithServices } from '@/lib/types';

export function MaintenanceRow({
  window,
  affected,
  now,
}: {
  window: MaintenanceWithServices;
  affected: string[];
  now: Date;
}) {
  const current = maintenancePhase(window, now);

  return (
    <details className="group border-b border-line last:border-b-0">
      <summary className="grid cursor-pointer list-none grid-cols-[minmax(0,1fr)_auto_16px] items-center gap-x-3 px-3 py-2.5 transition-colors hover:bg-surface-soft sm:grid-cols-[196px_minmax(0,1fr)_auto_16px] sm:px-3.5 sm:py-3 [&::-webkit-details-marker]:hidden">
        <span className="fh-num hidden text-[14px] text-muted sm:block">
          {formatWindowShort(window.scheduled_start, window.scheduled_end)}
        </span>
        <div className="min-w-0">
          <p className="truncate text-[15px] font-medium">{window.title}</p>
          <p className="mt-0.5 truncate text-[14px] text-muted">
            <span className="fh-num sm:hidden">
              {formatWindowShort(window.scheduled_start, window.scheduled_end)} ·{' '}
            </span>
            {affected.length > 0 ? affected.join(' · ') : 'No services linked'}
          </p>
        </div>
        <span className={`fh-pill font-medium ${MAINTENANCE_PHASE_TONE[current.key]}`}>{current.label}</span>
        <ChevronDownIcon className="h-3.5 w-3.5 -rotate-90 text-muted transition-transform group-open:rotate-0" />
      </summary>
      <div className="border-t border-line bg-surface-soft px-3.5 py-3 sm:pl-[162px]">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[14px] text-muted">
          <span className="fh-num">{current.note}</span>
          <span className="h-3 w-px bg-line" aria-hidden="true" />
          <span className="fh-num">Recorded {formatDateTime(window.created_at)}</span>
        </div>
        <div className="mt-1.5">
          {window.body ? (
            <Markdown className="max-w-3xl">{window.body}</Markdown>
          ) : (
            <p className="text-[14px] text-muted">No notes were attached beyond the window itself.</p>
          )}
        </div>
        {affected.length > 0 && <p className="mt-2 text-[14px] text-muted">Affects {affected.join(', ')}.</p>}
      </div>
    </details>
  );
}
