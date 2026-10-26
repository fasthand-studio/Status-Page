import { cn } from '@/lib/cn';
import { formatWindow } from '@/lib/format';
import { maintenancePhase, MAINTENANCE_PHASE_TONE } from '@/lib/maintenance';
import type { MaintenanceWithServices } from '@/lib/types';

export function MaintenanceCard({
  window,
  affectedServices,
  now,
}: {
  window: MaintenanceWithServices;
  affectedServices: string[];
  now: Date;
}) {
  const current = maintenancePhase(window, now);

  return (
    <article className="fh-card border border-line bg-surface px-4 py-3">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className={cn('fh-pill font-medium', MAINTENANCE_PHASE_TONE[current.key])}>{current.label}</span>
        <span className="ml-auto text-[14px] text-muted">{current.note}</span>
      </div>

      <h3 className="mt-1.5 text-[17px] font-semibold leading-snug">{window.title}</h3>
      <p className="fh-num mt-0.5 text-[14px] text-muted">
        {formatWindow(window.scheduled_start, window.scheduled_end)}
      </p>

      {affectedServices.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {affectedServices.map((name) => (
            <span key={name} className="fh-pill border border-line text-[14px] text-muted">
              {name}
            </span>
          ))}
        </div>
      )}
    </article>
  );
}
