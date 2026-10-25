import type { ActionState } from '@/lib/action-state';
import type { Monitor, Service } from '@/lib/types';
import { ActionForm } from './action-form';
import { SubmitButton } from './submit-button';
import {
  adminCardClass,
  adminInputClass,
  adminSelectClass,
  Field,
  Notice,
} from './ui';

export function ServiceForm({
  action,
  service,
  groups,
  monitors,
  submitLabel,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  service?: Service;
  groups: { id: string; name: string }[];
  monitors: Pick<Monitor, 'id' | 'name' | 'enabled'>[];
  submitLabel: string;
}) {
  if (groups.length === 0) {
    return (
      <Notice tone="warn">
        No service groups exist. Apply the seed migration (<span className="font-sans">0002_seed.sql</span>) before
        creating services.
      </Notice>
    );
  }

  return (
    <ActionForm action={action} className={`${adminCardClass} p-5 sm:p-6`}>
      {service ? <input type="hidden" name="service_id" value={service.id} /> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" htmlFor="name" required>
          <input
            id="name"
            name="name"
            defaultValue={service?.name ?? ''}
            required
            maxLength={80}
            className={adminInputClass}
          />
        </Field>
        <Field
          label="Slug"
          htmlFor="slug"
          hint="Leave blank to derive it from the name. Lowercase letters, numbers, and hyphens."
        >
          <input
            id="slug"
            name="slug"
            defaultValue={service?.slug ?? ''}
            maxLength={60}
            placeholder="seller-panel"
            className={adminInputClass}
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Group" htmlFor="group_id" required>
          <select
            id="group_id"
            name="group_id"
            defaultValue={service?.group_id ?? groups[0]?.id}
            className={adminSelectClass}
          >
            {groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Monitor" htmlFor="monitor_id" hint="Without a monitor the service is public as “No check”.">
          <select
            id="monitor_id"
            name="monitor_id"
            defaultValue={service?.monitor_id ?? ''}
            className={adminSelectClass}
          >
            <option value="">No monitor</option>
            {monitors.map((monitor) => (
              <option key={monitor.id} value={monitor.id}>
                {monitor.name}
                {monitor.enabled ? '' : ' (paused)'}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field
        label="Description"
        htmlFor="description"
        hint="One sentence shown under the service name. Plain text, not Markdown."
      >
        <textarea
          id="description"
          name="description"
          rows={3}
          defaultValue={service?.description ?? ''}
          maxLength={400}
          className={adminInputClass}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-[minmax(0,160px)_1fr] sm:items-center">
        <Field label="Sort order" htmlFor="sort_order" hint="Lower numbers appear first.">
          <input
            id="sort_order"
            name="sort_order"
            type="number"
            defaultValue={service?.sort_order ?? 0}
            className={adminInputClass}
          />
        </Field>
        <label className="flex items-center gap-3 fh-r-sm border border-line bg-paper px-3 py-2.5 text-[17px] text-ink/85">
          <input
            type="checkbox"
            name="is_public"
            defaultChecked={service?.is_public ?? true}
            className="h-4 w-4 accent-lime"
          />
          Show this service on the public status page
        </label>
      </div>

      <div className="flex justify-end border-t border-line pt-4">
        <SubmitButton pendingLabel="Saving…">{submitLabel}</SubmitButton>
      </div>
    </ActionForm>
  );
}
