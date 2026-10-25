'use client';

import { useActionState } from 'react';
import type { ReactNode } from 'react';
import { idleActionState, type ActionState } from '@/lib/action-state';
import { cn } from '@/lib/cn';
import { Notice } from './ui';

export function ActionForm({
  action,
  children,
  className,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  children: ReactNode;
  className?: string;
}) {
  const [state, formAction] = useActionState(action, idleActionState);

  return (
    <form action={formAction} className={cn('space-y-5', className)}>
      {state.error ? <Notice tone="bad">{state.error}</Notice> : null}
      {state.success ? <Notice tone="ok">{state.success}</Notice> : null}
      {children}
    </form>
  );
}
