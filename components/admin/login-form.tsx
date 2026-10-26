'use client';

import { useActionState } from 'react';
import { idleActionState } from '@/lib/action-state';
import { signInAction } from '@/app/admin/login/actions';
import { adminInputClass, Notice } from '@/components/admin/ui';
import { SubmitButton } from '@/components/admin/submit-button';

export function LoginForm() {
  const [state, formAction] = useActionState(signInAction, idleActionState);

  return (
    <form action={formAction} className="space-y-4">
      {state.error ? <Notice tone="bad">{state.error}</Notice> : null}

      <div className="space-y-1.5">
        <label
          htmlFor="email"
          className="flex items-baseline gap-2 text-[12.5px] font-medium text-ink"
        >
          Email
          <span className="text-[11.5px] font-normal text-ink/70">
            Required
          </span>
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@fasthandstudio.asia"
          className={adminInputClass}
        />
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="password"
          className="flex items-baseline gap-2 text-[12.5px] font-medium text-ink"
        >
          Password
          <span className="text-[11.5px] font-normal text-ink/70">
            Required
          </span>
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className={adminInputClass}
        />
      </div>

      <SubmitButton pendingLabel="Signing in…" className="w-full">
        Sign in
      </SubmitButton>

      <p className="text-[12.5px] leading-relaxed text-muted">
        Accounts are created in Supabase Authentication and must be granted admin access separately. There is no
        self-service sign-up on this page.
      </p>
    </form>
  );
}
