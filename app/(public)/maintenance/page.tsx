import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { DataError } from '@/components/data-error';
import { MaintenanceRow } from '@/components/maintenance-row';
import { PageHeader } from '@/components/page-header';
import { SectionHeading } from '@/components/section-heading';
import { SetupNotice } from '@/components/setup-notice';
import { getMaintenanceHistory, getServiceDirectory } from '@/lib/data';
import { ogImage } from '@/lib/seo';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import type { MaintenanceWithServices } from '@/lib/types';

const description =
  'Scheduled and completed maintenance windows for FastHand services, in UTC.';

export const metadata: Metadata = {
  title: 'Maintenance',
  description,
  alternates: { canonical: '/maintenance' },
  openGraph: {
    type: 'website',
    url: '/maintenance',
    siteName: 'FastHand Status',
    title: 'FastHand maintenance windows',
    description,
    locale: 'en_US',
    images: [ogImage],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FastHand maintenance windows',
    description,
  },
};

function EmptyRow({ children }: { children: ReactNode }) {
  return (
    <div className="fh-card border border-line bg-surface px-3.5 py-2.5 text-[15px] text-muted">
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
