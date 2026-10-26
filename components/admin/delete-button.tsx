'use client';

import { useActionState, useState } from 'react';
import { idleActionState, type ActionState } from '@/lib/action-state';
import { cn } from '@/lib/cn';
import { dangerButtonClass, dangerSolidButtonClass, smallButtonClass } from './ui';

export function DeleteButton({
  action,
  fields,
  label = 'Delete',
  description = 'This cannot be undone.',
  className,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  fields: Record<string, string>;
  label?: string;
  description?: string;
  className?: string;
}) {
  const [armed, setArmed] = useState(false);
  const [state, formAction, pending] = useActionState(action, idleActionState);

  if (!armed) {
    return (
      <button type="button" onClick={() => setArmed(true)} className={cn(dangerButtonClass, className)}>
        {label}
      </button>
    );
  }

  return (
    <form action={formAction} className={cn('flex flex-wrap items-center gap-2', className)}>
      {Object.entries(fields).map(([key, value]) => (
        <input key={key} type="hidden" name={key} value={value} />
      ))}
      <span aria-live="polite" className="max-w-[22rem] text-[12.5px] leading-tight text-bad">
        {state.error ?? description}
      </span>
      <button type="submit" disabled={pending} aria-busy={pending} className={dangerSolidButtonClass}>
        {pending ? 'Deleting…' : 'Confirm delete'}
      </button>
      <button type="button" onClick={() => setArmed(false)} disabled={pending} className={smallButtonClass}>
        Cancel
      </button>
    </form>
  );
}
