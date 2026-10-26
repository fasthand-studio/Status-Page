import type { Metadata } from 'next';
import Link from 'next/link';
import { requireAdminContext } from '@/lib/auth';
import { createMonitorAction } from '@/app/admin/actions';
import { MonitorForm } from '@/components/admin/monitor-form';
import { AdminPageHeader, Notice } from '@/components/admin/ui';
import { ArrowLeftIcon } from '@/components/icons';

export const metadata: Metadata = { title: 'New monitor — FastHand Ops' };

export default async function NewMonitorPage() {
  await requireAdminContext();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href="/admin/monitors" className="inline-flex items-center gap-1.5 text-[12.5px] text-muted hover:text-ink">
        <ArrowLeftIcon className="h-3.5 w-3.5" />
        All monitors
      </Link>

      <AdminPageHeader
        title="Add a health check"
        description="Only add an endpoint when you have confirmed it reflects the health of that service."
      />

      <Notice tone="warn">
        A monitor that returns HTTP 200 while the database is down makes the status page lie. Verify the response
        body or a dedicated health route before attributing it to a service.
      </Notice>

      <MonitorForm action={createMonitorAction} submitLabel="Create monitor" />
    </div>
  );
}
