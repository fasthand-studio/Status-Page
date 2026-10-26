import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAdminContext } from '@/lib/auth';
import { loadAdminMaintenanceItem } from '@/lib/admin-data';
import { updateMaintenanceAction } from '@/app/admin/actions';
import { formatDateTime, formatWindow } from '@/lib/format';
import { isUuid } from '@/lib/validation';
import { MaintenanceForm } from '@/components/admin/maintenance-form';
import {
  AdminMaintenanceBadge,
  AdminPageHeader,
  adminCardClass,
  linkClass,
  Notice,
} from '@/components/admin/ui';
import { ArrowLeftIcon, ArrowUpRightIcon } from '@/components/icons';

export const metadata: Metadata = { title: 'Maintenance window — FastHand Ops' };

export default async function AdminMaintenanceItemPage({
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
    data = await loadAdminMaintenanceItem(context.supabase, id);
  } catch (caught) {
    return (
      <div className="mx-auto max-w-3xl">
        <AdminPageHeader title="Maintenance window" />
        <Notice tone="bad">{caught instanceof Error ? caught.message : 'Could not load the window.'}</Notice>
      </div>
    );
  }

  if (!data.window) notFound();
  const { window, services } = data;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link
        href="/admin/maintenance"
        className="inline-flex items-center gap-1.5 text-[12.5px] text-muted hover:text-ink"
      >
        <ArrowLeftIcon className="h-3.5 w-3.5" />
        All maintenance
      </Link>

      {query.created ? <Notice tone="ok">Maintenance window published.</Notice> : null}
      {query.saved ? <Notice tone="ok">Maintenance window saved.</Notice> : null}

      <AdminPageHeader
        title={window.title}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <AdminMaintenanceBadge status={window.status} />
            <span className="text-[12.5px] text-muted">{formatWindow(window.scheduled_start, window.scheduled_end)}</span>
          </span>
        }
        actions={
          <Link
            href="/maintenance"
            target="_blank"
            className="inline-flex items-center gap-1.5 fh-round border border-line px-3 py-1.5 text-[12.5px] text-ink/85 transition hover:border-ink/25 hover:bg-ink/5"
          >
            Public page
            <ArrowUpRightIcon className="h-3.5 w-3.5" />
          </Link>
        }
      />

      <div className="grid gap-3 xl:grid-cols-[1.5fr_0.7fr]">
        <MaintenanceForm
          action={updateMaintenanceAction}
          window={window}
          services={services}
          submitLabel="Save window"
        />

        <aside className="space-y-3">
          <div className={`${adminCardClass} px-3 py-2`}>
            <p className="font-sans text-[11.5px] text-muted">Record</p>
            <dl className="mt-2 space-y-2 text-[12.5px]">
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Created</dt>
                <dd className="text-right text-muted">{formatDateTime(window.created_at)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Updated</dt>
                <dd className="text-right text-muted">{formatDateTime(window.updated_at)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Window ID</dt>
                <dd className="truncate font-sans text-[11.5px] text-muted">{window.id}</dd>
              </div>
            </dl>
          </div>

          <div className={`${adminCardClass} px-3 py-2`}>
            <p className="font-sans text-[11.5px] text-muted">Status meaning</p>
            <ul className="mt-2 space-y-2 text-[12.5px] leading-relaxed text-muted">
              <li>
                <strong className="text-ink/85">Scheduled</strong> shows ahead of time and marks services as
                maintenance while the window is open.
              </li>
              <li>
                <strong className="text-ink/85">In progress</strong> is active immediately, regardless of the start
                time.
              </li>
              <li>
                <strong className="text-ink/85">Completed</strong> and <strong className="text-ink/85">cancelled</strong>{' '}
                stop affecting service health but stay in the archive.
              </li>
            </ul>
            <Link href="/maintenance" className={`${linkClass} mt-2 inline-block text-[12.5px]`}>
              View public maintenance
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
