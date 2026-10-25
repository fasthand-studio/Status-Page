'use client';

import type { ReactNode } from 'react';
import { useFormStatus } from 'react-dom';
import { cn } from '@/lib/cn';
import { primaryButtonClass, secondaryButtonClass } from './ui';

export function SubmitButton({
  children,
  pendingLabel = 'Saving…',
  variant = 'primary',
  className,
}: {
  children: ReactNode;
  pendingLabel?: string;
  variant?: 'primary' | 'secondary';
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={cn(variant === 'primary' ? primaryButtonClass : secondaryButtonClass, className)}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
