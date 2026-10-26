import type { Metadata } from 'next';
import Link from 'next/link';
import { requireAdminContext } from '@/lib/auth';
import { loadAdminServices } from '@/lib/admin-data';
import { createIncidentAction } from '@/app/admin/actions';
import { IncidentComposer } from '@/components/admin/incident-composer';
import { AdminPageHeader, linkClass, Notice } from '@/components/admin/ui';
import { ArrowLeftIcon } from '@/components/icons';
import { isWriterConfigured } from '@/lib/incident-writer';
import { formatUtcInput } from '@/lib/validation';

export const metadata: Metadata = { title: 'New incident — FastHand Ops' };

export default async function NewIncidentPage() {
  const context = await requireAdminContext();
  const now = formatUtcInput(new Date().toISOString());

  let services: { id: string; name: string; groupName: string }[] = [];
  try {
    const data = await loadAdminServices(context.supabase);
    services = data.services.map((service) => ({
      id: service.id,
      name: service.name,
      groupName: service.group_name,
    }));
  } catch {
    services = [];
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href="/admin/incidents" className="inline-flex items-center gap-1.5 text-[15px] text-muted hover:text-ink">
        <ArrowLeftIcon className="h-3.5 w-3.5" />
        All incidents
      </Link>

      <AdminPageHeader
        title="Open an incident"
        description="This publishes immediately. Write the first update the way customers should read it."
      />

      <Notice tone="info">
        Only create an incident when you can describe what is actually happening. Automated monitors open their own
        incidents after sustained failures; you do not need to duplicate them.
      </Notice>

      <IncidentComposer
        action={createIncidentAction}
        services={services}
        startedAt={now}
        writerEnabled={isWriterConfigured()}
      />

      <p className="text-[14px] leading-relaxed text-muted">
        The draft writer turns what you type into customer-facing wording. It never sees check data, so anything it
        does not know it must not claim.
      </p>
    </div>
  );
}
