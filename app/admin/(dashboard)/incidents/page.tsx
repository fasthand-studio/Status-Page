import type { Metadata } from 'next';
import Link from 'next/link';
import { requireAdminContext } from '@/lib/auth';
import { loadAdminIncidents } from '@/lib/admin-data';
import { deleteIncidentAction } from '@/app/admin/actions';
import { formatRelativeTime } from '@/lib/format';
import {
  AdminImpactBadge,
  AdminPageHeader,
  AdminStatusBadge,
  adminCardClass,
  EmptyAdminState,
  linkClass,
  Notice,
  primaryButtonClass,
} from '@/components/admin/ui';
import { DeleteButton } from '@/components/admin/delete-button';
import { PlusIcon } from '@/components/icons';

export const metadata: Metadata = { title: 'Incidents — FastHand Ops' };

export default async function AdminIncidentsPage({
  searchParams,
}: {
  searchParams: Promise<{ deleted?: string }>;
}) {
  const context = await requireAdminContext();
  const query = await searchParams;

  let incidents;
  try {
    incidents = await loadAdminIncidents(context.supabase);
  } catch (caught) {
    return (
      <div className="mx-auto max-w-3xl">
        <AdminPageHeader title="Incidents" />
        <Notice tone="bad">
          {caught instanceof Error ? caught.message : 'Could not load incidents.'}
        </Notice>
      </div>
    );
  }

  const open = incidents.filter((incident) => incident.resolved_at === null);
  const resolved = incidents.filter((incident) => incident.resolved_at !== null);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Incidents"
        description="Manual and auto-detected incidents. The newest update becomes the public summary."
        actions={
          <Link href="/admin/incidents/new" className={primaryButtonClass}>
            <PlusIcon className="h-4 w-4" />
            New incident
          </Link>
        }
      />

      {query.deleted ? <Notice tone="ok">Incident deleted.</Notice> : null}

      <section className="space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-sans text-[17px] font-semibold">Open</h2>
          <p className="font-sans text-[14px] text-muted">{open.length}</p>
        </div>
        {open.length === 0 ? (
          <Notice tone="ok">No open incidents. The public page has nothing active to announce.</Notice>
        ) : (
          <div className="space-y-2">
            {open.map((incident) => (
              <article key={incident.id} className={`${adminCardClass} px-3 py-2`}>
                <div className="flex flex-wrap items-center gap-2">
                  <AdminStatusBadge status={incident.status} />
                  <AdminImpactBadge impact={incident.impact} />
                  {incident.auto_detected ? (
                    <span className="font-sans text-[14px] text-muted">
                      Auto-detected
                    </span>
                  ) : null}
                </div>
                <p className="mt-2 font-medium text-ink">{incident.title}</p>
                <p className="mt-1 text-[15px] text-muted">
                  Started {formatRelativeTime(incident.started_at)} · {incident.incident_updates.length} update
                  {incident.incident_updates.length === 1 ? '' : 's'} ·{' '}
                  {incident.incident_services.length} affected service
                  {incident.incident_services.length === 1 ? '' : 's'}
                </p>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
                  <Link href={`/admin/incidents/${incident.id}`} className={`${linkClass} text-[15px]`}>
                    Open incident
                  </Link>
                  <DeleteButton
                    action={deleteIncidentAction}
                    fields={{ incident_id: incident.id }}
                    description="Delete this incident, its updates, and its service links?"
                  />
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-sans text-[17px] font-semibold">Resolved</h2>
          <p className="font-sans text-[14px] text-muted">{resolved.length}</p>
        </div>
        {resolved.length === 0 ? (
          <EmptyAdminState title="No incident history yet">
            Resolved incidents stay on the public history page with their full update timeline.
          </EmptyAdminState>
        ) : (
          <div className={`${adminCardClass} overflow-x-auto`}>
            <table className="w-full min-w-[800px] text-left text-[15px]">
              <thead>
                <tr className="border-b border-line font-sans text-[14px] text-muted">
                  <th className="px-3 py-2 font-medium">Incident</th>
                  <th className="px-3 py-2 font-medium">Impact</th>
                  <th className="px-3 py-2 font-medium">Started</th>
                  <th className="px-3 py-2 font-medium">Resolved</th>
                  <th className="px-3 py-2 font-medium">Source</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {resolved.map((incident) => (
                  <tr key={incident.id} className="transition hover:bg-ink/[0.03]">
                    <td className="px-3 py-2 font-medium text-ink/85">{incident.title}</td>
                    <td className="px-3 py-2">
                      <AdminImpactBadge impact={incident.impact} />
                    </td>
                    <td className="px-3 py-2 text-muted">{formatRelativeTime(incident.started_at)}</td>
                    <td className="px-3 py-2 text-muted">{formatRelativeTime(incident.resolved_at)}</td>
                    <td className="px-3 py-2 font-sans text-[14px] text-muted">
                      {incident.auto_detected ? 'Automated' : 'Manual'}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap items-center justify-end gap-3">
                        <Link href={`/admin/incidents/${incident.id}`} className={linkClass}>
                          Open
                        </Link>
                        <DeleteButton
                          action={deleteIncidentAction}
                          fields={{ incident_id: incident.id }}
                          description="Delete this incident and its updates?"
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
