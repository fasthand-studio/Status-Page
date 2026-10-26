import type { ActionState } from '@/lib/action-state';
import type { MaintenanceWithServices, Service } from '@/lib/types';
import { ActionForm } from './action-form';
import { MarkdownField } from './markdown-field';
import { ServiceCheckboxes } from './service-checkboxes';
import { SubmitButton } from './submit-button';
import {
  adminCardClass,
  adminInputClass,
  adminSelectClass,
  Field,
} from './ui';
import {
  formatUtcInput,
  MAINTENANCE_STATUS_LABELS,
  MAINTENANCE_STATUSES,
} from '@/lib/validation';

export function MaintenanceForm({
  action,
  window,
  services,
  submitLabel,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  window?: MaintenanceWithServices;
  services: Service[];
  submitLabel: string;
}) {
  const start = window
    ? formatUtcInput(window.scheduled_start)
    : formatUtcInput(new Date().toISOString());
  const end = window
    ? formatUtcInput(window.scheduled_end)
    : formatUtcInput(new Date(Date.now() + 60 * 60 * 1000).toISOString());

  const selected = window?.maintenance_services.map((row) => row.service_id) ?? [];

  return (
    <ActionForm action={action} className={`${adminCardClass} px-3 py-2 sm:p-4`}>
      {window ? <input type="hidden" name="maintenance_id" value={window.id} /> : null}

      <div className="grid gap-3 sm:grid-cols-[1.4fr_0.6fr]">
        <Field label="Title" htmlFor="title" required>
          <input
            id="title"
            name="title"
            defaultValue={window?.title ?? ''}
            required
            maxLength={140}
            placeholder="Database maintenance in the Dhaka region"
            className={adminInputClass}
          />
        </Field>
        <Field label="Status" htmlFor="status" required>
          <select
            id="status"
            name="status"
            defaultValue={window?.status ?? 'scheduled'}
            className={adminSelectClass}
          >
            {MAINTENANCE_STATUSES.map((status) => (
              <option key={status} value={status}>
                {MAINTENANCE_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Starts (UTC)" htmlFor="scheduled_start" required>
          <input
            id="scheduled_start"
            name="scheduled_start"
            type="datetime-local"
            defaultValue={start}
            required
            className={adminInputClass}
          />
        </Field>
        <Field label="Ends (UTC)" htmlFor="scheduled_end" required>
          <input
            id="scheduled_end"
            name="scheduled_end"
            type="datetime-local"
            defaultValue={end}
            required
            className={adminInputClass}
          />
        </Field>
      </div>

      <ServiceCheckboxes
        services={services.map((service) => ({ id: service.id, name: service.name }))}
        defaultSelected={selected}
        label="Services affected"
      />

      <MarkdownField
        name="body"
        label="Public notice"
        defaultValue={window?.body ?? ''}
        placeholder="What will change, what customers may notice, and how long it should take."
        hint="Optional. Markdown is supported; raw HTML is shown as text."
      />

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
        <p className="text-[12.5px] text-muted">
          Cancelled and completed windows stay in the public archive.
        </p>
        <SubmitButton pendingLabel="Saving…">{submitLabel}</SubmitButton>
      </div>
    </ActionForm>
  );
}
