import type { Metadata } from 'next';
import Link from 'next/link';
import { requireAdminContext } from '@/lib/auth';
import { loadAdminMaintenance } from '@/lib/admin-data';
import { createMaintenanceAction } from '@/app/admin/actions';
import { MaintenanceForm } from '@/components/admin/maintenance-form';
import { AdminPageHeader, Notice } from '@/components/admin/ui';
import { ArrowLeftIcon } from '@/components/icons';

export const metadata: Metadata = { title: 'New maintenance — FastHand Ops' };

export default async function NewMaintenancePage() {
  const context = await requireAdminContext();

  let data;
  try {
    data = await loadAdminMaintenance(context.supabase);
  } catch (caught) {
    return (
      <div className="mx-auto max-w-3xl">
        <AdminPageHeader title="Schedule maintenance" />
        <Notice tone="bad">{caught instanceof Error ? caught.message : 'Could not load services.'}</Notice>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/admin/maintenance"
        className="inline-flex items-center gap-1.5 text-[12.5px] text-muted hover:text-ink"
      >
        <ArrowLeftIcon className="h-3.5 w-3.5" />
        All maintenance
      </Link>

      <AdminPageHeader
        title="Schedule maintenance"
        description="Publish the window before it starts. Times are UTC."
      />

      <MaintenanceForm
        action={createMaintenanceAction}
        services={data.services}
        submitLabel="Publish window"
      />
    </div>
  );
}
