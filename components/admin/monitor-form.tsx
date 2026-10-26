import type { ActionState } from '@/lib/action-state';
import type { Monitor } from '@/lib/types';
import { ActionForm } from './action-form';
import { SubmitButton } from './submit-button';
import {
  adminCardClass,
  adminHintClass,
  adminInputClass,
  adminSelectClass,
  Field,
  Notice,
} from './ui';
import { INCIDENT_IMPACT_LABELS, INCIDENT_IMPACTS } from '@/lib/validation';

export function MonitorForm({
  action,
  monitor,
  submitLabel,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  monitor?: Monitor;
  submitLabel: string;
}) {
  return (
    <ActionForm action={action} className={`${adminCardClass} px-3 py-2 sm:p-4`}>
      {monitor ? <input type="hidden" name="monitor_id" value={monitor.id} /> : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Name" htmlFor="name" required>
          <input
            id="name"
            name="name"
            defaultValue={monitor?.name ?? ''}
            required
            maxLength={80}
            className={adminInputClass}
          />
        </Field>
        <Field label="Method" htmlFor="method" required>
          <select id="method" name="method" defaultValue={monitor?.method ?? 'GET'} className={adminSelectClass}>
            <option value="GET">GET — read the body</option>
            <option value="HEAD">HEAD — headers only</option>
          </select>
        </Field>
      </div>

      <Field
        label="Health-check URL"
        htmlFor="url"
        required
        hint="Only use an endpoint that actually proves this service is healthy. HTTP 2xx alone is not a health check unless you say so."
      >
        <input
          id="url"
          name="url"
          type="url"
          defaultValue={monitor?.url ?? ''}
          required
          placeholder="https://example.com/isitonline"
          className={adminInputClass}
        />
      </Field>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Expected status from" htmlFor="expected_status_min" required>
          <input
            id="expected_status_min"
            name="expected_status_min"
            type="number"
            min={100}
            max={599}
            defaultValue={monitor?.expected_status_min ?? 200}
            required
            className={adminInputClass}
          />
        </Field>
        <Field label="Expected status to" htmlFor="expected_status_max" required>
          <input
            id="expected_status_max"
            name="expected_status_max"
            type="number"
            min={100}
            max={599}
            defaultValue={monitor?.expected_status_max ?? 299}
            required
            className={adminInputClass}
          />
        </Field>
      </div>

      <Field
        label="Expected text"
        htmlFor="expected_text"
        hint='Optional exact phrase after whitespace normalisation, e.g. "Hey bro iam online". Leave blank to check the status code only.'
      >
        <input
          id="expected_text"
          name="expected_text"
          defaultValue={monitor?.expected_text ?? ''}
          maxLength={500}
          className={adminInputClass}
        />
      </Field>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Timeout (ms)" htmlFor="timeout_ms" required>
          <input
            id="timeout_ms"
            name="timeout_ms"
            type="number"
            min={1000}
            max={60000}
            step={500}
            defaultValue={monitor?.timeout_ms ?? 10000}
            required
            className={adminInputClass}
          />
        </Field>
        <Field
          label="Check interval (seconds)"
          htmlFor="check_interval_seconds"
          required
          hint="Scheduled checks run every 300 seconds. A shorter value is not honoured automatically."
        >
          <input
            id="check_interval_seconds"
            name="check_interval_seconds"
            type="number"
            min={60}
            max={86400}
            step={60}
            defaultValue={monitor?.check_interval_seconds ?? 300}
            required
            className={adminInputClass}
          />
        </Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Open after failures" htmlFor="failure_threshold" required hint="Consecutive failed checks.">
          <input
            id="failure_threshold"
            name="failure_threshold"
            type="number"
            min={1}
            max={12}
            defaultValue={monitor?.failure_threshold ?? 3}
            required
            className={adminInputClass}
          />
        </Field>
        <Field label="Resolve after passes" htmlFor="recovery_threshold" required hint="Consecutive passing checks.">
          <input
            id="recovery_threshold"
            name="recovery_threshold"
            type="number"
            min={1}
            max={12}
            defaultValue={monitor?.recovery_threshold ?? 3}
            required
            className={adminInputClass}
          />
        </Field>
        <Field
          label="Auto-incident impact"
          htmlFor="incident_impact"
          required
          className="sm:col-span-2"
        >
          <select
            id="incident_impact"
            name="incident_impact"
            defaultValue={monitor?.incident_impact ?? 'major'}
            className={adminSelectClass}
          >
            {INCIDENT_IMPACTS.map((impact) => (
              <option key={impact} value={impact}>
                {INCIDENT_IMPACT_LABELS[impact]}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="space-y-2 fh-r-sm border border-line bg-paper px-3 py-2">
        <label className="flex items-center gap-3 text-[11.5px] text-ink/85">
          <input
            type="checkbox"
            name="enabled"
            defaultChecked={monitor?.enabled ?? true}
            className="h-4 w-4 accent-primary"
          />
          Run this monitor on the scheduled check
        </label>
        <p className={adminHintClass}>
          Pausing stops new checks. The public page keeps the last evidence and marks it stale rather than assuming
          the service recovered.
        </p>
      </div>

      <div className="flex justify-end border-t border-line pt-4">
        <SubmitButton pendingLabel="Saving…">{submitLabel}</SubmitButton>
      </div>
    </ActionForm>
  );
}
