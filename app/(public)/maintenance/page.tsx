import type { Metadata } from 'next';
import { DataError } from '@/components/data-error';
import { MaintenanceCard } from '@/components/maintenance-card';
import { PageHeader } from '@/components/page-header';
import { SetupNotice } from '@/components/setup-notice';
import { getMaintenanceHistory, getServiceDirectory } from '@/lib/data';
import { formatDateTime } from '@/lib/format';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import type { MaintenanceWithServices } from '@/lib/types';

export const metadata: Metadata = {
  title: 'Maintenance',
  description: 'Scheduled and completed maintenance windows for FastHand services, in UTC.',
};

export default async function MaintenancePage() {
  const configured = isSupabaseConfigured;
  const [windows, services] = configured
    ? await Promise.all([getMaintenanceHistory(), getServiceDirectory()])
    : [[], []];

  if (!configured) {
    return (
      <div className="mx-auto max-w-[1180px] px-4 pt-6 sm:px-6">
        <PageHeader
          title="Maintenance"
          description="Maintenance announcements appear once the monitoring database is connected."
        />
        <div className="mt-6">
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
    <div className="mx-auto max-w-[1180px] px-4 pb-8 pt-6 sm:px-6">
      <PageHeader
        title="Maintenance"
        description="Announced work that may briefly affect a service. Windows and timestamps are shown in UTC; the page never hides an expired window."
        aside={
          <div className="flex gap-6 fh-card border border-line bg-surface px-5 py-4">
            <div>
              <p className="font-sans text-[13px] text-muted">Upcoming</p>
              <p className="mt-1 font-sans text-[22px] font-semibold leading-none tracking-[-0.04em]">
                {openWindows.length}
              </p>
            </div>
            <span className="w-px bg-line" aria-hidden="true" />
            <div>
              <p className="font-sans text-[13px] text-muted">Archive</p>
              <p className="mt-1 font-sans text-[22px] font-semibold leading-none tracking-[-0.04em]">
                {pastWindows.length}
              </p>
            </div>
          </div>
        }
      />

      <section className="mt-9">
        <h2 className="font-sans text-[13px] text-muted">Scheduled</h2>
        {openWindows.length > 0 ? (
          <div className="mt-3 grid gap-4 lg:grid-cols-2">
            {openWindows.map((window) => (
              <MaintenanceCard key={window.id} window={window} affectedServices={names(window)} now={now} />
            ))}
          </div>
        ) : (
          <div className="mt-3 fh-card border border-line bg-surface px-5 py-4">
            <p className="text-[16px] font-medium">No maintenance is scheduled.</p>
            <p className="mt-0.5 text-[15px] text-muted">
              When a window is announced it appears here with its UTC start and end.
            </p>
          </div>
        )}
      </section>

      <section className="mt-12">
        <h2 className="font-sans text-[13px] text-muted">Past windows</h2>
        {pastWindows.length > 0 ? (
          <div className="mt-3 grid gap-4 lg:grid-cols-2">
            {pastWindows.map((window) => (
              <div key={window.id}>
                <MaintenanceCard window={window} affectedServices={names(window)} now={now} />
                <p className="mt-1.5 px-1 font-sans text-[13px] text-muted">
                  Recorded {formatDateTime(window.created_at)}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-3 fh-card border border-dashed border-line bg-surface/50 px-5 py-8 text-center">
            <p className="text-[16px] font-medium">No past maintenance windows.</p>
            <p className="mt-1 text-[15px] text-muted">The archive starts when the first window is announced.</p>
          </div>
        )}
      </section>
    </div>
  );
}
