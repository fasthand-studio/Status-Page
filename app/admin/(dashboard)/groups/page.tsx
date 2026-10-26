import type { Metadata } from 'next';
import Link from 'next/link';
import { requireAdminContext } from '@/lib/auth';
import { loadAdminGroups } from '@/lib/admin-data';
import { deleteGroupAction } from '@/app/admin/actions';
import {
  AdminPageHeader,
  adminCardClass,
  EmptyAdminState,
  linkClass,
  Notice,
  primaryButtonClass,
} from '@/components/admin/ui';
import { DeleteButton } from '@/components/admin/delete-button';
import { PlusIcon } from '@/components/icons';

export const metadata: Metadata = { title: 'Groups — FastHand Ops' };

export default async function AdminGroupsPage({
  searchParams,
}: {
  searchParams: Promise<{ deleted?: string }>;
}) {
  const context = await requireAdminContext();
  const query = await searchParams;

  let groups;
  try {
    groups = await loadAdminGroups(context.supabase);
  } catch (caught) {
    return (
      <div className="mx-auto max-w-3xl">
        <AdminPageHeader title="Service groups" />
        <Notice tone="bad">{caught instanceof Error ? caught.message : 'Could not load groups.'}</Notice>
      </div>
    );
  }

  const grouped = groups.reduce((total, group) => total + group.serviceCount, 0);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Service groups"
        description={`${groups.length} groups · ${grouped} ${grouped === 1 ? 'service' : 'services'} placed.`}
        actions={
          <Link href="/admin/groups/new" className={primaryButtonClass}>
            <PlusIcon className="h-4 w-4" />
            New group
          </Link>
        }
      />

      {query.deleted ? <Notice tone="ok">Group deleted.</Notice> : null}

      <Notice tone="info">
        A group is only a label and an order. Services, monitors and checks belong to the service rows under{' '}
        <Link href="/admin/services" className={linkClass}>
          Services
        </Link>
        .
      </Notice>

      {groups.length === 0 ? (
        <EmptyAdminState title="No groups yet">
          Every service must sit in a group, so create one before adding a service.
        </EmptyAdminState>
      ) : (
        <div className={`${adminCardClass} overflow-x-auto`}>
          <table className="w-full min-w-[720px] text-left text-[15px]">
            <thead>
              <tr className="border-b border-line font-sans text-[14px] text-muted">
                <th className="px-3 py-2 font-medium">Group</th>
                <th className="px-3 py-2 font-medium">Description</th>
                <th className="px-3 py-2 font-medium">Services</th>
                <th className="px-3 py-2 font-medium">Order</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {groups.map((group) => (
                <tr key={group.id} className="transition hover:bg-ink/[0.03]">
                  <td className="px-3 py-2">
                    <p className="font-medium text-ink/85">{group.name}</p>
                    <p className="font-sans text-[14px] text-muted">{group.slug}</p>
                  </td>
                  <td className="max-w-[24rem] px-3 py-2 text-muted">
                    {group.description || <span className="text-muted/70">—</span>}
                  </td>
                  <td className="px-3 py-2 font-sans text-[15px] text-muted">{group.serviceCount}</td>
                  <td className="px-3 py-2 font-sans text-[15px] text-muted">{group.sort_order}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap items-center justify-end gap-3">
                      <Link href={`/admin/groups/${group.id}`} className={linkClass}>
                        Edit
                      </Link>
                      <DeleteButton
                        action={deleteGroupAction}
                        fields={{ group_id: group.id }}
                        description="Delete this group? Move its services to another group first."
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
