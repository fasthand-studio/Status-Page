import type { Metadata } from 'next';
import Link from 'next/link';
import { requireAdminContext } from '@/lib/auth';
import { loadAdminServices } from '@/lib/admin-data';
import { createIncidentAction } from '@/app/admin/actions';
import { ActionForm } from '@/components/admin/action-form';
import { MarkdownField } from '@/components/admin/markdown-field';
import { ServiceCheckboxes } from '@/components/admin/service-checkboxes';
import { SubmitButton } from '@/components/admin/submit-button';
import {
  AdminPageHeader,
  adminCardClass,
  adminInputClass,
  adminSelectClass,
  Field,
  linkClass,
  Notice,
} from '@/components/admin/ui';
import { ArrowLeftIcon } from '@/components/icons';
import {
  formatUtcInput,
  INCIDENT_IMPACT_LABELS,
  INCIDENT_IMPACTS,
  INCIDENT_STATUS_LABELS,
  INCIDENT_STATUSES,
} from '@/lib/validation';

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

      <ActionForm action={createIncidentAction} className={`${adminCardClass} p-5 sm:p-6`}>
        <Field label="Title" htmlFor="title" required hint="Short and factual, e.g. “Seller panel login is slow”.">
          <input id="title" name="title" required maxLength={140} className={adminInputClass} />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Impact" htmlFor="impact" required hint="Drives the public severity label.">
            <select id="impact" name="impact" defaultValue="major" className={adminSelectClass}>
              {INCIDENT_IMPACTS.map((impact) => (
                <option key={impact} value={impact}>
                  {INCIDENT_IMPACT_LABELS[impact]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Status" htmlFor="status" required>
            <select id="status" name="status" defaultValue="investigating" className={adminSelectClass}>
              {INCIDENT_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {INCIDENT_STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field
          label="Started at (UTC)"
          htmlFor="started_at"
          required
          hint="Entered in UTC. The public timeline uses this time."
        >
          <input
            id="started_at"
            name="started_at"
            type="datetime-local"
            defaultValue={now}
            required
            className={adminInputClass}
          />
        </Field>

        <ServiceCheckboxes services={services} />

        <MarkdownField
          name="body"
          label="First update"
          required
          placeholder="We are investigating reports that…"
          hint="This becomes the opening entry in the public timeline. Markdown is supported; raw HTML is shown as text."
        />

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
          <p className="text-[15px] text-muted">
            Resolved incidents still appear under{' '}
            <Link href="/history" className={linkClass}>
              history
            </Link>
            .
          </p>
          <SubmitButton pendingLabel="Publishing…">Publish incident</SubmitButton>
        </div>
      </ActionForm>
    </div>
  );
}
