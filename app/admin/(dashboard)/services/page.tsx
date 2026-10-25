import type { Metadata } from 'next';
import Link from 'next/link';
import { requireAdminContext } from '@/lib/auth';
import { loadAdminServices } from '@/lib/admin-data';
import {
  AdminPageHeader,
  adminCardClass,
  EmptyAdminState,
  linkClass,
  Notice,
  primaryButtonClass,
} from '@/components/admin/ui';
import { MonitorState } from '@/components/admin/monitor-state';
import { PlusIcon } from '@/components/icons';

export const metadata: Metadata = { title: 'Services — FastHand Ops' };

export default async function AdminServicesPage() {
  const context = await requireAdminContext();

  let data;
  try {
    data = await loadAdminServices(context.supabase);
  } catch (caught) {
    return (
      <div className="mx-auto max-w-3xl">
        <AdminPageHeader title="Services" />
        <Notice tone="bad">{caught instanceof Error ? caught.message : 'Could not load services.'}</Notice>
      </div>
    );
  }

  const monitored = data.services.filter((service) => service.monitor_id).length;
  const publicCount = data.services.filter((service) => service.is_public).length;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Services"
        description={`${data.services.length} services · ${publicCount} public · ${monitored} with a monitor.`}
        actions={
          <Link href="/admin/services/new" className={primaryButtonClass}>
            <PlusIcon className="h-4 w-4" />
            New service
          </Link>
        }
      />

      <Notice tone="info">
        A service is only shown as operational when an attached monitor has a fresh passing check. Services without a
        monitor render as <strong>No check</strong>; they are never assumed healthy.
      </Notice>

      {data.services.length === 0 ? (
        <EmptyAdminState title="No services yet">
          Apply the seed migration to create the initial groups and services, or add one manually.
        </EmptyAdminState>
      ) : (
        <div className={`${adminCardClass} overflow-x-auto`}>
          <table className="w-full min-w-[820px] text-left text-[17px]">
            <thead>
              <tr className="border-b border-line font-sans text-[13px] text-muted">
                <th className="px-4 py-2.5 font-medium">Service</th>
                <th className="px-4 py-2.5 font-medium">Group</th>
                <th className="px-4 py-2.5 font-medium">Monitor</th>
                <th className="px-4 py-2.5 font-medium">Health</th>
                <th className="px-4 py-2.5 font-medium">Visible</th>
                <th className="px-4 py-2.5 font-medium">Order</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data.services.map((service) => (
                <tr key={service.id} className="transition hover:bg-ink/[0.03]">
                  <td className="px-4 py-3">
                    <p className="font-medium text-ink/85">{service.name}</p>
                    <p className="font-sans text-[13px] text-muted">{service.slug}</p>
                  </td>
                  <td className="px-4 py-3 text-muted">{service.group_name}</td>
                  <td className="px-4 py-3 text-muted">{service.monitor_name ?? '—'}</td>
                  <td className="px-4 py-3">
                    {service.monitor_id ? (
                      <MonitorState status={service.status} />
                    ) : (
                      <span className="text-[15px] text-muted">No check</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`font-sans text-[13px] ${
                        service.is_public ? 'text-ok' : 'text-muted'
                      }`}
                    >
                      {service.is_public ? 'Public' : 'Hidden'}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-sans text-[15px] text-muted">{service.sort_order}</td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/admin/services/${service.id}`} className={linkClass}>
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data.monitors.length === 0 ? (
        <Notice tone="warn">
          No monitors exist yet. Create one under{' '}
          <Link href="/admin/monitors/new" className={linkClass}>
            Monitors
          </Link>{' '}
          before attaching health checks to services.
        </Notice>
      ) : null}
    </div>
  );
}
