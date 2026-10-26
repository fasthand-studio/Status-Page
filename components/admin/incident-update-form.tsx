'use client';

import { useState } from 'react';
import type { ActionState } from '@/lib/action-state';
import type { IncidentStatus } from '@/lib/types';
import { ActionForm } from './action-form';
import { DraftWriter } from './draft-writer';
import { MarkdownField } from './markdown-field';
import { SubmitButton } from './submit-button';
import { adminSelectClass, Field } from './ui';
import { INCIDENT_STATUS_LABELS, INCIDENT_STATUSES } from '@/lib/validation';

export function IncidentUpdateForm({
  action,
  incidentId,
  incidentTitle,
  currentStatus,
  writerEnabled,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  incidentId: string;
  incidentTitle: string;
  currentStatus: IncidentStatus;
  writerEnabled: boolean;
}) {
  const [status, setStatus] = useState<IncidentStatus>(currentStatus);
  const [body, setBody] = useState('');

  return (
    <ActionForm action={action}>
      <input type="hidden" name="incident_id" value={incidentId} />

      {writerEnabled ? (
        <DraftWriter
          mode="update"
          status={status}
          incidentTitle={incidentTitle}
          onDraft={(draft) => setBody(draft.body)}
        />
      ) : null}

      <div className="grid gap-3 sm:grid-cols-[minmax(0,220px)_1fr] sm:items-start">
        <Field label="New status" htmlFor="update_status" required>
          <select
            id="update_status"
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
        <MarkdownField
          name="body"
          label="Update"
          required
          value={body}
          onValueChange={setBody}
          placeholder={
            currentStatus === 'resolved'
              ? 'This incident is resolved. The service has stayed healthy since…'
              : 'We have identified the cause and are…'
          }
          rows={6}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
        <p className="text-[15px] text-muted">
          Choosing a non-resolved status on a resolved incident reopens it.
        </p>
        <SubmitButton pendingLabel="Publishing…">Publish update</SubmitButton>
      </div>
    </ActionForm>
  );
}
