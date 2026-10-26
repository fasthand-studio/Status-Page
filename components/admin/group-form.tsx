import type { ActionState } from '@/lib/action-state';
import type { ServiceGroup } from '@/lib/types';
import { ActionForm } from './action-form';
import { SubmitButton } from './submit-button';
import { adminCardClass, adminInputClass, Field } from './ui';

export function GroupForm({
  action,
  group,
  submitLabel,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  group?: ServiceGroup;
  submitLabel: string;
}) {
  return (
    <ActionForm action={action} className={`${adminCardClass} px-3 py-2 sm:p-4`}>
      {group ? <input type="hidden" name="group_id" value={group.id} /> : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Name" htmlFor="name" required>
          <input
            id="name"
            name="name"
            defaultValue={group?.name ?? ''}
            required
            maxLength={80}
            placeholder="Marketplace"
            className={adminInputClass}
          />
        </Field>
        <Field label="Slug" htmlFor="slug" hint="Leave blank to derive it from the name. Lowercase letters, numbers, and hyphens.">
          <input
            id="slug"
            name="slug"
            defaultValue={group?.slug ?? ''}
            maxLength={60}
            placeholder="marketplace"
            className={adminInputClass}
          />
        </Field>
      </div>

      <Field
        label="Description"
        htmlFor="description"
        hint="Optional. One sentence describing what belongs in this group."
      >
        <textarea
          id="description"
          name="description"
          rows={3}
          defaultValue={group?.description ?? ''}
          maxLength={400}
          className={adminInputClass}
        />
      </Field>

      <Field label="Sort order" htmlFor="sort_order" hint="Lower numbers appear first on the public pages.">
        <input
          id="sort_order"
          name="sort_order"
          type="number"
          defaultValue={group?.sort_order ?? 0}
          className={`${adminInputClass} sm:w-[160px]`}
        />
      </Field>

      <div className="flex justify-end border-t border-line pt-4">
        <SubmitButton pendingLabel="Saving…">{submitLabel}</SubmitButton>
      </div>
    </ActionForm>
  );
}
