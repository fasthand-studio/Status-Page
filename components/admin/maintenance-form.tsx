'use client';

import { useState } from 'react';
import type { ActionState } from '@/lib/action-state';
import type { MaintenanceWithServices, MaintenanceStatus, Service } from '@/lib/types';
import { ActionForm } from './action-form';
import { DraftWriter } from './draft-writer';
import { MarkdownField } from './markdown-field';
import { ServiceCheckboxes } from './service-checkboxes';
import { SubmitButton } from './submit-button';
import { adminCardClass, adminInputClass, adminSelectClass, Field } from './ui';
import {
  formatUtcInput,
  MAINTENANCE_STATUS_LABELS,
  MAINTENANCE_STATUSES,
  parseUtcInput,
} from '@/lib/validation';
import { formatDuration, formatWindowShort } from '@/lib/format';

function describeWindow(start: string, end: string): string | undefined {
  const from = parseUtcInput(start);
  const to = parseUtcInput(end);
  if (!from || !to) return undefined;
  const length = (to.getTime() - from.getTime()) / 1000;
  if (length <= 0) return undefined;
  return `${formatWindowShort(from.toISOString(), to.toISOString())}, ${formatDuration(length)} long`;
}

export function MaintenanceForm({
  action,
  window,
  services,
  submitLabel,
  writerEnabled,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  window?: MaintenanceWithServices;
  services: Service[];
  submitLabel: string;
  writerEnabled: boolean;
}) {
  const [title, setTitle] = useState(window?.title ?? '');
  const [body, setBody] = useState(window?.body ?? '');
  const [status, setStatus] = useState<MaintenanceStatus>(window?.status ?? 'scheduled');
  const [start, setStart] = useState(
    window ? formatUtcInput(window.scheduled_start) : formatUtcInput(new Date().toISOString()),
  );
  const [end, setEnd] = useState(
    window
      ? formatUtcInput(window.scheduled_end)
      : formatUtcInput(new Date(Date.now() + 60 * 60 * 1000).toISOString()),
  );
  const [serviceIds, setServiceIds] = useState<string[]>(
    window?.maintenance_services.map((row) => row.service_id) ?? [],
  );

  const selectedNames = services
    .filter((service) => serviceIds.includes(service.id))
    .map((service) => service.name);

  return (
    <ActionForm action={action} className={`${adminCardClass} px-3 py-2 sm:p-4`}>
      {window ? <input type="hidden" name="maintenance_id" value={window.id} /> : null}

      {writerEnabled ? (
        <DraftWriter
          mode="maintenance"
          status={status}
          services={selectedNames}
          scheduledFor={describeWindow(start, end)}
          onDraft={(draft) => {
            if (draft.title) setTitle(draft.title);
            setBody(draft.body);
          }}
        />
      ) : null}

      <div className="grid gap-3 sm:grid-cols-[1.4fr_0.6fr]">
        <Field label="Title" htmlFor="title" required>
          <input
            id="title"
            name="title"
            required
            maxLength={140}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Database maintenance in the Dhaka region"
            className={adminInputClass}
          />
        </Field>
        <Field label="Status" htmlFor="status" required>
          <select
            id="status"
            name="status"
            value={status}
            onChange={(event) => setStatus(event.target.value as MaintenanceStatus)}
            className={adminSelectClass}
          >
            {MAINTENANCE_STATUSES.map((option) => (
              <option key={option} value={option}>
                {MAINTENANCE_STATUS_LABELS[option]}
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
            value={start}
            onChange={(event) => setStart(event.target.value)}
            required
            className={adminInputClass}
          />
        </Field>
        <Field label="Ends (UTC)" htmlFor="scheduled_end" required>
          <input
            id="scheduled_end"
            name="scheduled_end"
            type="datetime-local"
            value={end}
            onChange={(event) => setEnd(event.target.value)}
            required
            className={adminInputClass}
          />
        </Field>
      </div>

      <ServiceCheckboxes
        services={services.map((service) => ({ id: service.id, name: service.name }))}
        defaultSelected={serviceIds}
        onSelectionChange={setServiceIds}
        label="Services affected"
      />

      <MarkdownField
        name="body"
        label="Public notice"
        value={body}
        onValueChange={setBody}
        placeholder="What will change, what customers may notice, and how long it should take."
        hint="Optional. Markdown is supported; raw HTML is shown as text."
      />

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
        <p className="text-[15px] text-muted">
          Cancelled and completed windows stay in the public archive.
        </p>
        <SubmitButton pendingLabel="Saving…">{submitLabel}</SubmitButton>
      </div>
    </ActionForm>
  );
}
