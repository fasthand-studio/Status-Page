import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { DataError } from '@/components/data-error';
import { ChevronDownIcon } from '@/components/icons';
import { Markdown } from '@/components/markdown';
import { PageHeader } from '@/components/page-header';
import { SectionHeading } from '@/components/section-heading';
import { SetupNotice } from '@/components/setup-notice';
import { getMaintenanceHistory, getServiceDirectory } from '@/lib/data';
import { formatDateTime, formatWindowShort } from '@/lib/format';
import { maintenancePhase, MAINTENANCE_PHASE_TONE } from '@/lib/maintenance';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import type { MaintenanceWithServices } from '@/lib/types';

export const metadata: Metadata = {
  title: 'Maintenance',
  description: 'Scheduled and completed maintenance windows for FastHand services, in UTC.',
};

function MaintenanceRow({
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
      <summary className="grid cursor-pointer list-none grid-cols-[minmax(0,1fr)_auto_14px] items-center gap-x-3 px-3.5 py-2.5 transition-colors hover:bg-surface-soft sm:grid-cols-[150px_minmax(0,1fr)_auto_14px] [&::-webkit-details-marker]:hidden">
        <span className="fh-num hidden text-[11.5px] text-muted sm:block">
          {formatWindowShort(window.scheduled_start, window.scheduled_end)}
        </span>
        <div className="min-w-0">
          <p className="truncate text-[13px] font-medium">{window.title}</p>
          <p className="mt-0.5 truncate text-[11.5px] text-muted">
            <span className="fh-num sm:hidden">
              {formatWindowShort(window.scheduled_start, window.scheduled_end)} ·{' '}
            </span>
            {affected.length > 0 ? affected.join(' · ') : 'No services linked'}
          </p>
        </div>
        <span className={`fh-pill font-medium ${MAINTENANCE_PHASE_TONE[current.key]}`}>{current.label}</span>
        <ChevronDownIcon className="h-3.5 w-3.5 text-muted transition-transform group-open:rotate-180" />
      </summary>
      <div className="border-t border-line bg-surface-soft px-3.5 py-3 sm:pl-[162px]">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-muted">
          <span className="fh-num">{current.note}</span>
          <span className="h-3 w-px bg-line" aria-hidden="true" />
          <span className="fh-num">Recorded {formatDateTime(window.created_at)}</span>
        </div>
        <div className="mt-1.5">
          {window.body ? (
            <Markdown className="max-w-3xl">{window.body}</Markdown>
          ) : (
            <p className="text-[12px] text-muted">No notes were attached beyond the window itself.</p>
          )}
        </div>
        {affected.length > 0 && (
          <p className="mt-2 text-[12px] text-muted">Affects {affected.join(', ')}.</p>
        )}
      </div>
    </details>
  );
}

function EmptyRow({ children }: { children: ReactNode }) {
  return (
    <div className="fh-card border border-line bg-surface px-3.5 py-2.5 text-[12.5px] text-muted">
      {children}
    </div>
  );
}

export default async function MaintenancePage() {
  const configured = isSupabaseConfigured;
  const [windows, services] = configured
    ? await Promise.all([getMaintenanceHistory(), getServiceDirectory()])
    : [[], []];

  if (!configured) {
    return (
      <div className="mx-auto max-w-[1100px] px-4 pt-4 sm:px-6">
        <PageHeader
          title="Maintenance"
          description="Maintenance announcements appear once the monitoring database is connected."
        />
        <div className="mt-4">
          <SetupNotice />
        </div>
      </div>
    );
  }

  const now = new Date();
  const serviceById = new Map(services.map((service) => [service.id, service]));
  const names = (window: MaintenanceWithServices) =>
    window.maintenance_services
      .map((row) => serviceById.get(row.service_id)?.name)
      .filter((name): name is string => Boolean(name));

  const openWindows = windows
    .filter(
      (window) =>
        window.status !== 'completed' &&
        window.status !== 'cancelled' &&
        new Date(window.scheduled_end) >= now,
    )
    .sort(
      (a, b) =>
        Number(b.status === 'in_progress') - Number(a.status === 'in_progress') ||
        +new Date(a.scheduled_start) - +new Date(b.scheduled_start),
    );

  const pastWindows = windows
    .filter((window) => !openWindows.some((open) => open.id === window.id))
    .sort((a, b) => +new Date(b.scheduled_start) - +new Date(a.scheduled_start));

  return (
    <div className="mx-auto max-w-[1100px] px-4 pb-8 pt-4 sm:px-6">
      <PageHeader
        title="Maintenance"
        description="Announced work that may briefly affect a service. Windows and timestamps are UTC."
        aside={
          <span className="fh-num">
            {openWindows.length} upcoming · {pastWindows.length} archived
          </span>
        }
      />

      <section className="mt-5">
        <SectionHeading title="Scheduled" />
        {openWindows.length > 0 ? (
          <div className="overflow-hidden fh-panel border border-line bg-surface">
            {openWindows.map((window) => (
              <MaintenanceRow key={window.id} window={window} affected={names(window)} now={now} />
            ))}
          </div>
        ) : (
          <EmptyRow>
            <span className="font-medium text-ink">No maintenance is scheduled.</span> Announced
            windows appear here with their UTC start and end.
          </EmptyRow>
        )}
      </section>

      <section className="mt-6">
        <SectionHeading title="Past windows" />
        {pastWindows.length > 0 ? (
          <div className="overflow-hidden fh-panel border border-line bg-surface">
            {pastWindows.map((window) => (
              <MaintenanceRow key={window.id} window={window} affected={names(window)} now={now} />
            ))}
          </div>
        ) : (
          <EmptyRow>
            <span className="font-medium text-ink">No past maintenance windows.</span> The archive
            starts when the first window is announced.
          </EmptyRow>
        )}
      </section>
    </div>
  );
}
