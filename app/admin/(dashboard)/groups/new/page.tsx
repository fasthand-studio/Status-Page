import type { Metadata } from 'next';
import Link from 'next/link';
import { requireAdminContext } from '@/lib/auth';
import { createGroupAction } from '@/app/admin/actions';
import { GroupForm } from '@/components/admin/group-form';
import { AdminPageHeader } from '@/components/admin/ui';
import { ArrowLeftIcon } from '@/components/icons';

export const metadata: Metadata = { title: 'New group — FastHand Ops' };

export default async function NewGroupPage() {
  await requireAdminContext();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/admin/groups"
        className="inline-flex items-center gap-1.5 text-[15px] text-muted hover:text-ink"
      >
        <ArrowLeftIcon className="h-3.5 w-3.5" />
        All groups
      </Link>

      <AdminPageHeader
        title="New service group"
        description="Groups order the public directory and the service pickers in the ops desk."
      />

      <GroupForm action={createGroupAction} submitLabel="Create group" />
    </div>
  );
}
