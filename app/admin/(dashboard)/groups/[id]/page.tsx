import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAdminContext } from '@/lib/auth';
import { loadAdminGroup } from '@/lib/admin-data';
import { deleteGroupAction, updateGroupAction } from '@/app/admin/actions';
import { isUuid } from '@/lib/validation';
import { GroupForm } from '@/components/admin/group-form';
import { DeleteButton } from '@/components/admin/delete-button';
import { AdminPageHeader, adminCardClass, linkClass, Notice } from '@/components/admin/ui';
import { ArrowLeftIcon } from '@/components/icons';

export const metadata: Metadata = { title: 'Service group — FastHand Ops' };

export default async function AdminGroupPage({
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
    data = await loadAdminGroup(context.supabase, id);
  } catch (caught) {
    return (
      <div className="mx-auto max-w-3xl">
        <AdminPageHeader title="Service group" />
        <Notice tone="bad">{caught instanceof Error ? caught.message : 'Could not load the group.'}</Notice>
      </div>
    );
  }

  if (!data.group) notFound();
  const { group, services } = data;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link
        href="/admin/groups"
        className="inline-flex items-center gap-1.5 text-[15px] text-muted hover:text-ink"
      >
        <ArrowLeftIcon className="h-3.5 w-3.5" />
        All groups
      </Link>

      {query.created ? <Notice tone="ok">Group created. Add services to it next.</Notice> : null}
      {query.saved ? <Notice tone="ok">Group saved. The public pages update immediately.</Notice> : null}

      <AdminPageHeader
        title={group.name}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-sans text-[15px] text-muted">/{group.slug}</span>
            <span className="text-ink/20">·</span>
            <span className="text-[15px] text-muted">
              {services.length} {services.length === 1 ? 'service' : 'services'}
            </span>
          </span>
        }
      />

      <div className="grid gap-3 xl:grid-cols-[1.5fr_0.7fr]">
        <GroupForm action={updateGroupAction} group={group} submitLabel="Save group" />

        <aside className="space-y-3">
          <div className={`${adminCardClass} px-3 py-2`}>
            <p className="font-sans text-[14px] text-muted">Services in this group</p>
            {services.length === 0 ? (
              <p className="mt-2 text-[15px] leading-relaxed text-muted">
                None yet. Add one under{' '}
                <Link href="/admin/services/new" className={linkClass}>
                  New service
                </Link>
                .
              </p>
            ) : (
              <ul className="mt-2 space-y-1.5 text-[15px]">
                {services.map((service) => (
                  <li key={service.id}>
                    <Link href={`/admin/services/${service.id}`} className={linkClass}>
                      {service.name}
                    </Link>
                    <span className="ml-2 font-sans text-[14px] text-muted">{service.slug}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className={`${adminCardClass} px-3 py-2`}>
            <p className="font-sans text-[14px] text-muted">Renaming and deleting</p>
            <ul className="mt-2 space-y-2 text-[15px] leading-relaxed text-muted">
              <li>Renaming a group keeps every service attached; the public heading changes with it.</li>
              <li>
                Changing the slug only changes the identifier. Public pages link to services, not to group
                slugs.
              </li>
              <li>A group with services cannot be deleted until they are moved or removed.</li>
            </ul>
            <div className="mt-2 flex justify-end">
              <DeleteButton
                action={deleteGroupAction}
                fields={{ group_id: group.id }}
                description="Delete this group? Move its services to another group first."
              />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
