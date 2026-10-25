import type { Metadata } from 'next';
import Link from 'next/link';
import { requireAdminContext } from '@/lib/auth';
import { loadAdminMaintenance } from '@/lib/admin-data';
import { formatWindow } from '@/lib/format';
import {
  AdminMaintenanceBadge,
  AdminPageHeader,
  adminCardClass,
  EmptyAdminState,
  linkClass,
  Notice,
  primaryButtonClass,
} from '@/components/admin/ui';
import { PlusIcon } from '@/components/icons';

export const metadata: Metadata = { title: 'Maintenance — FastHand Ops' };

export default async function AdminMaintenancePage() {
  const context = await requireAdminContext();

  let data;
  try {
    data = await loadAdminMaintenance(context.supabase);
  } catch (caught) {
    return (
      <div className="mx-auto max-w-3xl">
        <AdminPageHeader title="Maintenance" />
        <Notice tone="bad">{caught instanceof Error ? caught.message : 'Could not load maintenance windows.'}</Notice>
      </div>
    );
  }

  const now = Date.now();
  const upcoming = data.windows.filter(
    (window) =>
      (window.status === 'scheduled' || window.status === 'in_progress') &&
      new Date(window.scheduled_end).getTime() >= now,
  );
  const past = data.windows.filter((window) => !upcoming.includes(window));

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Maintenance"
        description="Scheduled windows appear on the public maintenance page and can mark affected services as in maintenance."
        actions={
          <Link href="/admin/maintenance/new" className={primaryButtonClass}>
            <PlusIcon className="h-4 w-4" />
            Schedule maintenance
          </Link>
        }
      />

      <section className="space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-sans text-[18px] font-semibold">Upcoming & active</h2>
          <p className="font-sans text-[13px] text-muted">{upcoming.length}</p>
        </div>
        {upcoming.length === 0 ? (
          <Notice tone="info">No upcoming maintenance windows.</Notice>
        ) : (
          <div className="space-y-2">
            {upcoming.map((window) => (
              <Link
                key={window.id}
                href={`/admin/maintenance/${window.id}`}
                className={`${adminCardClass} block p-4 transition hover:border-ink/25`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <AdminMaintenanceBadge status={window.status} />
                  <span className="text-[15px] text-muted">{window.maintenance_services.length} services</span>
                </div>
                <p className="mt-2 font-medium text-ink">{window.title}</p>
                <p className="mt-1 text-[15px] text-muted">{formatWindow(window.scheduled_start, window.scheduled_end)}</p>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-sans text-[18px] font-semibold">Archive</h2>
          <p className="font-sans text-[13px] text-muted">{past.length}</p>
        </div>
        {past.length === 0 ? (
          <EmptyAdminState title="No past maintenance">
            Completed and cancelled windows remain visible in the public archive.
          </EmptyAdminState>
        ) : (
          <div className={`${adminCardClass} overflow-x-auto`}>
            <table className="w-full min-w-[760px] text-left text-[17px]">
              <thead>
                <tr className="border-b border-line font-sans text-[13px] text-muted">
                  <th className="px-4 py-2.5 font-medium">Window</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 font-medium">Scheduled</th>
                  <th className="px-4 py-2.5 font-medium">Services</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {past.map((window) => (
                  <tr key={window.id} className="transition hover:bg-ink/[0.03]">
                    <td className="px-4 py-3 font-medium text-ink/85">{window.title}</td>
                    <td className="px-4 py-3">
                      <AdminMaintenanceBadge status={window.status} />
                    </td>
                    <td className="px-4 py-3 text-[15px] text-muted">
                      {formatWindow(window.scheduled_start, window.scheduled_end)}
                    </td>
                    <td className="px-4 py-3 font-sans text-[15px] text-muted">
                      {window.maintenance_services.length}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/admin/maintenance/${window.id}`} className={linkClass}>
                        Open
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
