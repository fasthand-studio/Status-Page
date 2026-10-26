import type { Metadata } from 'next';
import Link from 'next/link';
import { requireAdminContext } from '@/lib/auth';
import { loadAdminServices } from '@/lib/admin-data';
import { createServiceAction } from '@/app/admin/actions';
import { ServiceForm } from '@/components/admin/service-form';
import { AdminPageHeader, Notice } from '@/components/admin/ui';
import { ArrowLeftIcon } from '@/components/icons';

export const metadata: Metadata = { title: 'New service — FastHand Ops' };

export default async function NewServicePage() {
  const context = await requireAdminContext();

  let data;
  try {
    data = await loadAdminServices(context.supabase);
  } catch (caught) {
    return (
      <div className="mx-auto max-w-3xl">
        <AdminPageHeader title="New service" />
        <Notice tone="bad">{caught instanceof Error ? caught.message : 'Could not load the form data.'}</Notice>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href="/admin/services" className="inline-flex items-center gap-1.5 text-[12.5px] text-muted hover:text-ink">
        <ArrowLeftIcon className="h-3.5 w-3.5" />
        All services
      </Link>

      <AdminPageHeader
        title="Add a service"
        description="A row on the public page. Attach a verified monitor to give it real uptime."
      />

      <ServiceForm
        action={createServiceAction}
        groups={data.groups}
        monitors={data.monitors}
        submitLabel="Create service"
      />
    </div>
  );
}
