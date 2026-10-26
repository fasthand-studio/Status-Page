'use client';

import { useActionState } from 'react';
import { idleActionState, type ActionState } from '@/lib/action-state';
import { cn } from '@/lib/cn';
import { smallButtonClass } from './ui';

export function InlineActionButton({
  action,
  fields,
  label,
  pendingLabel = 'Working…',
  className,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  fields: Record<string, string>;
  label: string;
  pendingLabel?: string;
  className?: string;
}) {
  const [state, formAction, pending] = useActionState(action, idleActionState);

  return (
    <form action={formAction} className={cn('inline-flex flex-col items-start gap-1', className)}>
      {Object.entries(fields).map(([key, value]) => (
        <input key={key} type="hidden" name={key} value={value} />
      ))}
      <button type="submit" disabled={pending} aria-busy={pending} className={smallButtonClass}>
        {pending ? pendingLabel : label}
      </button>
      {state.error ? <span className="max-w-[16rem] text-[12.5px] leading-tight text-bad">{state.error}</span> : null}
      {state.success ? <span className="max-w-[16rem] text-[12.5px] leading-tight text-ok">{state.success}</span> : null}
    </form>
  );
}
