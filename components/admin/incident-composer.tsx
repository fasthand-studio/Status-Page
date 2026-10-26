'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { ActionState } from '@/lib/action-state';
import { ActionForm } from './action-form';
import { DraftWriter } from './draft-writer';
import { MarkdownField } from './markdown-field';
import { ServiceCheckboxes } from './service-checkboxes';
import { SubmitButton } from './submit-button';
import {
  adminCardClass,
  adminInputClass,
  adminSelectClass,
  Field,
  linkClass,
} from './ui';
import {
  INCIDENT_IMPACT_LABELS,
  INCIDENT_IMPACTS,
  INCIDENT_STATUS_LABELS,
  INCIDENT_STATUSES,
} from '@/lib/validation';
import type { IncidentImpact, IncidentStatus } from '@/lib/types';

export function IncidentComposer({
  action,
  services,
  startedAt,
  writerEnabled,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  services: { id: string; name: string; groupName: string }[];
  startedAt: string;
  writerEnabled: boolean;
}) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [status, setStatus] = useState<IncidentStatus>('investigating');
  const [impact, setImpact] = useState<IncidentImpact>('major');
  const [serviceIds, setServiceIds] = useState<string[]>([]);

  const selectedNames = services
    .filter((service) => serviceIds.includes(service.id))
    .map((service) => service.name);

  return (
    <ActionForm action={action} className={`${adminCardClass} px-3 py-2 sm:p-4`}>
      {writerEnabled ? (
        <DraftWriter
          mode="incident"
          status={status}
          impact={impact}
          services={selectedNames}
          onDraft={(draft) => {
            if (draft.title) setTitle(draft.title);
            setBody(draft.body);
          }}
        />
      ) : null}

      <Field
        label="Title"
        htmlFor="title"
        required
        hint="Short and factual, e.g. “Seller panel login is slow”."
      >
        <input
          id="title"
          name="title"
          required
          maxLength={140}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className={adminInputClass}
        />
      </Field>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Impact" htmlFor="impact" required hint="Drives the public severity label.">
          <select
            id="impact"
            name="impact"
            value={impact}
            onChange={(event) => setImpact(event.target.value as IncidentImpact)}
            className={adminSelectClass}
          >
            {INCIDENT_IMPACTS.map((option) => (
              <option key={option} value={option}>
                {INCIDENT_IMPACT_LABELS[option]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Status" htmlFor="status" required>
          <select
            id="status"
            name="status"
            value={status}
            onChange={(event) => setStatus(event.target.value as IncidentStatus)}
            className={adminSelectClass}
          >
            {INCIDENT_STATUSES.map((option) => (
              <option key={option} value={option}>
                {INCIDENT_STATUS_LABELS[option]}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Started at (UTC)" htmlFor="started_at" required hint="Entered in UTC. The public timeline uses this time.">
        <input
          id="started_at"
          name="started_at"
          type="datetime-local"
          defaultValue={startedAt}
          required
          className={adminInputClass}
        />
      </Field>

      <ServiceCheckboxes services={services} onSelectionChange={setServiceIds} />

      <MarkdownField
        name="body"
        label="First update"
        required
        value={body}
        onValueChange={setBody}
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
  );
}
