import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAdminContext } from '@/lib/auth';
import { loadAdminIncident } from '@/lib/admin-data';
import { postIncidentUpdateAction, updateIncidentAction } from '@/app/admin/actions';
import { formatDateTime, formatRelativeTime } from '@/lib/format';
import { isUuid } from '@/lib/validation';
import { ActionForm } from '@/components/admin/action-form';
import { IncidentUpdateForm } from '@/components/admin/incident-update-form';
import { ServiceCheckboxes } from '@/components/admin/service-checkboxes';
import { SubmitButton } from '@/components/admin/submit-button';
import {
  AdminImpactBadge,
  AdminPageHeader,
  AdminStatusBadge,
  adminCardClass,
  adminInputClass,
  adminSelectClass,
  Field,
  linkClass,
  Notice,
} from '@/components/admin/ui';
import { ArrowLeftIcon, ArrowUpRightIcon } from '@/components/icons';
import { Markdown } from '@/components/markdown';
import { isWriterConfigured } from '@/lib/incident-writer';
import {
  formatUtcInput,
  INCIDENT_IMPACT_LABELS,
  INCIDENT_IMPACTS,
} from '@/lib/validation';

export const metadata: Metadata = { title: 'Incident — FastHand Ops' };

export default async function AdminIncidentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string; saved?: string; posted?: string }>;
}) {
  const { id } = await params;
  if (!isUuid(id)) notFound();

  const context = await requireAdminContext();
  const query = await searchParams;

  let data;
  try {
    data = await loadAdminIncident(context.supabase, id);
  } catch (caught) {
    return (
      <div className="mx-auto max-w-3xl">
        <AdminPageHeader title="Incident" />
        <Notice tone="bad">{caught instanceof Error ? caught.message : 'Could not load the incident.'}</Notice>
      </div>
    );
  }

  const { incident, services } = data;
  if (!incident) notFound();

  const selectedServiceIds = incident.incident_services.map((row) => row.service_id);
  const serviceOptions = services.map((service) => ({ id: service.id, name: service.name }));

  return (
    <div className="space-y-6">
      <Link
        href="/admin/incidents"
        className="inline-flex items-center gap-1.5 text-[15px] text-muted hover:text-ink"
      >
        <ArrowLeftIcon className="h-3.5 w-3.5" />
        All incidents
      </Link>

      {query.created ? (
        <Notice tone="ok">Incident published. It is now visible on the public status page.</Notice>
      ) : null}
      {query.saved ? <Notice tone="ok">Incident details saved.</Notice> : null}
      {query.posted ? <Notice tone="ok">Update published to the timeline.</Notice> : null}

      <AdminPageHeader
        title={incident.title}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <AdminStatusBadge status={incident.status} />
            <AdminImpactBadge impact={incident.impact} />
            <span className="text-[15px] text-muted">
              Started {formatDateTime(incident.started_at)}
              {incident.resolved_at ? ` · Resolved ${formatDateTime(incident.resolved_at)}` : ''}
            </span>
          </span>
        }
        actions={
          <Link
            href={`/incidents/${incident.id}`}
            target="_blank"
            className="fh-btn border border-line bg-surface text-[15px] font-medium text-ink/85 hover:bg-ink/5"
          >
            Public page
            <ArrowUpRightIcon className="h-3.5 w-3.5" />
          </Link>
        }
      />

      {incident.auto_detected ? (
        <Notice tone="info">
          This incident was opened by automated monitoring. Posting here does not change the monitor; the incident
          closes after sustained successful checks or when you publish a <strong>Resolved</strong> update.
        </Notice>
      ) : null}

      <div className="grid gap-3 xl:grid-cols-[1.4fr_0.85fr]">
        <div className="space-y-6">
          <section className={`${adminCardClass} px-3 py-2`}>
            <h2 className="font-sans text-[17px] font-semibold">Post an update</h2>
            <p className="mt-1 text-[15px] leading-relaxed text-muted">
              Updates are public immediately. The status you choose here also changes the incident state; choosing
              Resolved sets the resolution time.
            </p>

            <div className="mt-4">
              <IncidentUpdateForm
                action={postIncidentUpdateAction}
                incidentId={incident.id}
                incidentTitle={incident.title}
                currentStatus={incident.status}
                writerEnabled={isWriterConfigured()}
              />
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="font-sans text-[17px] font-semibold">Timeline</h2>
            {incident.incident_updates.length === 0 ? (
              <Notice tone="warn">This incident has no updates. Add one so the public page has something to show.</Notice>
            ) : (
              <ol className="space-y-3">
                {incident.incident_updates.map((update) => (
                  <li key={update.id} className={`${adminCardClass} px-3 py-2`}>
                    <div className="flex flex-wrap items-center gap-2">
                      <AdminStatusBadge status={update.status} />
                      <span className="font-sans text-[14px] text-muted">
                        {update.author}
                      </span>
                      <span className="text-[15px] text-muted">{formatDateTime(update.created_at)}</span>
                    </div>
                    <Markdown invert className="mt-2">
                      {update.body}
                    </Markdown>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>

        <aside className="space-y-6">
          <section className={`${adminCardClass} px-3 py-2`}>
            <h2 className="font-sans text-[17px] font-semibold">Details</h2>
            <div className="mt-4">
              <ActionForm action={updateIncidentAction}>
                <input type="hidden" name="incident_id" value={incident.id} />

                <Field label="Title" htmlFor="title" required>
                  <input
                    id="title"
                    name="title"
                    defaultValue={incident.title}
                    required
                    maxLength={140}
                    className={adminInputClass}
                  />
                </Field>

                <Field label="Impact" htmlFor="impact" required>
                  <select
                    id="impact"
                    name="impact"
                    defaultValue={incident.impact}
                    className={adminSelectClass}
                  >
                    {INCIDENT_IMPACTS.map((impact) => (
                      <option key={impact} value={impact}>
                        {INCIDENT_IMPACT_LABELS[impact]}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Started at (UTC)" htmlFor="started_at" required>
                  <input
                    id="started_at"
                    name="started_at"
                    type="datetime-local"
                    defaultValue={formatUtcInput(incident.started_at)}
                    required
                    className={adminInputClass}
                  />
                </Field>

                <ServiceCheckboxes
                  services={serviceOptions}
                  defaultSelected={selectedServiceIds}
                  label="Affected services"
                />

                <SubmitButton pendingLabel="Saving…" variant="primary">
                  Save details
                </SubmitButton>
              </ActionForm>
            </div>
          </section>

          <section className={`${adminCardClass} px-3 py-2`}>
            <h2 className="font-sans text-[17px] font-semibold">Record</h2>
            <dl className="mt-2 space-y-2 text-[15px]">
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Created</dt>
                <dd className="text-right text-muted">{formatDateTime(incident.created_at)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Last changed</dt>
                <dd className="text-right text-muted">{formatRelativeTime(incident.updated_at)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Source</dt>
                <dd className="text-right text-muted">
                  {incident.auto_detected ? 'Automated monitoring' : 'Manual'}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Incident ID</dt>
                <dd className="truncate font-sans text-[14px] text-muted">{incident.id}</dd>
              </div>
              {incident.monitor_id ? (
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">Monitor</dt>
                  <dd>
                    <Link href={`/admin/monitors/${incident.monitor_id}`} className={linkClass}>
                      Open monitor
                    </Link>
                  </dd>
                </div>
              ) : null}
            </dl>
          </section>
        </aside>
      </div>
    </div>
  );
}
