import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAdminContext } from '@/lib/auth';
import { loadAdminService } from '@/lib/admin-data';
import { updateServiceAction } from '@/app/admin/actions';
import { formatRelativeTime } from '@/lib/format';
import { isUuid } from '@/lib/validation';
import { ServiceForm } from '@/components/admin/service-form';
import { MonitorState } from '@/components/admin/monitor-state';
import {
  AdminPageHeader,
  adminCardClass,
  linkClass,
  Notice,
} from '@/components/admin/ui';
import { ArrowLeftIcon } from '@/components/icons';

export const metadata: Metadata = { title: 'Service — FastHand Ops' };

export default async function AdminServicePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string; saved?: string }>;
}) {
  const { id } = await params;
  if (!isUuid(id)) notFound();

  const context = await requireAdminContext();
  const query = await searchParams;

  let data;
  try {
    data = await loadAdminService(context.supabase, id);
  } catch (caught) {
    return (
      <div className="mx-auto max-w-3xl">
        <AdminPageHeader title="Service" />
        <Notice tone="bad">{caught instanceof Error ? caught.message : 'Could not load the service.'}</Notice>
      </div>
    );
  }

  if (!data.service) notFound();
  const { service, groups, monitors, status } = data;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link href="/admin/services" className="inline-flex items-center gap-1.5 text-[12.5px] text-muted hover:text-ink">
        <ArrowLeftIcon className="h-3.5 w-3.5" />
        All services
      </Link>

      {query.created ? <Notice tone="ok">Service created.</Notice> : null}
      {query.saved ? <Notice tone="ok">Service saved. The public page updates immediately.</Notice> : null}

      <AdminPageHeader
        title={service.name}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-sans text-[12.5px] text-muted">/{service.slug}</span>
            <span className="text-ink/20">·</span>
            {service.monitor_id ? <MonitorState status={status} /> : <span className="text-[12.5px] text-muted">No check</span>}
          </span>
        }
        actions={
          <Link href="/services" target="_blank" className={`${linkClass} text-[12.5px]`}>
            Public directory
          </Link>
        }
      />

      <div className="grid gap-3 xl:grid-cols-[1.5fr_0.7fr]">
        <ServiceForm
          action={updateServiceAction}
          service={service}
          groups={groups}
          monitors={monitors}
          submitLabel="Save service"
        />

        <aside className="space-y-3">
          <div className={`${adminCardClass} px-3 py-2`}>
            <p className="font-sans text-[11.5px] text-muted">Health evidence</p>
            {service.monitor_id && status ? (
              <div className="mt-2 space-y-2 text-[12.5px]">
                <MonitorState status={status} />
                <p className="text-muted">
                  Last check {formatRelativeTime(status.checked_at)}
                  {status.response_time_ms !== null ? ` · ${status.response_time_ms} ms` : ''}
                </p>
                <Link href={`/admin/monitors/${service.monitor_id}`} className={linkClass}>
                  Open monitor
                </Link>
              </div>
            ) : (
              <p className="mt-2 text-[12.5px] leading-relaxed text-muted">
                No monitor is attached. The public row says “No check” and contributes no uptime history.
              </p>
            )}
          </div>

          <div className={`${adminCardClass} px-3 py-2`}>
            <p className="font-sans text-[11.5px] text-muted">Notes</p>
            <ul className="mt-2 space-y-2 text-[12.5px] leading-relaxed text-muted">
              <li>Hiding a service removes it from the public page but keeps its history.</li>
              <li>Unattaching a monitor does not delete stored results.</li>
              <li>Uptime is computed from check history, never typed in.</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
