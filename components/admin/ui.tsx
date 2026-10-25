import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

const fieldBase =
  'w-full border border-line bg-surface px-4 text-[17px] text-ink placeholder:text-muted/70 transition-colors focus:border-ink focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink';

export const adminInputClass = cn(fieldBase, 'fh-field');

export const adminSelectClass = cn(adminInputClass, 'appearance-none pr-10');

export const adminTextareaClass = cn(
  fieldBase,
  'fh-field-area min-h-[9rem] py-3 leading-relaxed',
);

export const adminLabelClass = 'flex flex-wrap items-baseline gap-2 text-[15px] font-medium text-ink';

export const adminHintClass = 'mt-1.5 text-[15px] leading-relaxed text-muted';

export const adminCardClass = 'fh-card border border-line bg-surface';

export const primaryButtonClass =
  'fh-btn-lg bg-primary text-white transition-opacity hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-not-allowed disabled:opacity-50';

export const secondaryButtonClass =
  'fh-btn border border-line bg-surface text-ink transition-colors hover:border-ink/30 hover:bg-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-not-allowed disabled:opacity-50';

export const smallButtonClass =
  'fh-btn border border-line bg-surface px-3 text-ink transition-colors hover:border-ink/30 hover:bg-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-not-allowed disabled:opacity-50';

export const dangerButtonClass =
  'fh-btn border border-bad/40 bg-surface px-3 text-bad transition-colors hover:bg-bad-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bad disabled:cursor-not-allowed disabled:opacity-50';

export const dangerSolidButtonClass =
  'fh-btn bg-bad px-3 text-white transition-opacity hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bad disabled:cursor-not-allowed disabled:opacity-50';

export const linkClass = 'text-ink underline decoration-primary-deep decoration-2 underline-offset-4 hover:decoration-ink';

export function Field({
  label,
  htmlFor,
  hint,
  required = false,
  className,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={htmlFor} className={adminLabelClass}>
        <span>{label}</span>
        <span className={cn('text-[15px] font-normal', required ? 'text-ink/70' : 'text-muted')}>
          {required ? 'Required' : 'Optional'}
        </span>
      </label>
      {children}
      {hint ? <p className={adminHintClass}>{hint}</p> : null}
    </div>
  );
}

export function Notice({
  tone = 'info',
  children,
  className,
}: {
  tone?: 'info' | 'ok' | 'warn' | 'bad';
  children: ReactNode;
  className?: string;
}) {
  const tones = {
    info: 'border-info/25 bg-info-soft/70',
    ok: 'border-ok/25 bg-ok-soft/70',
    warn: 'border-warn/30 bg-warn-soft/70',
    bad: 'border-bad/30 bg-bad-soft/70',
  } as const;

  return (
    <div
      role={tone === 'bad' ? 'alert' : 'status'}
      className={cn(
        'fh-r-sm border px-4 py-3 text-[15px] leading-relaxed text-ink/85',
        tones[tone],
        className,
      )}
    >
      {children}
    </div>
  );
}

export function AdminPageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-2xl">
        <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-ink">{title}</h1>
        {description ? (
          <p className="mt-1.5 text-[17px] leading-relaxed text-muted">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function StatCard({
  label,
  value,
  detail,
  tone = 'neutral',
}: {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
  tone?: 'neutral' | 'ok' | 'warn' | 'bad';
}) {
  const tones = {
    neutral: 'text-ink',
    ok: 'text-ok',
    warn: 'text-warn',
    bad: 'text-bad',
  } as const;
  return (
    <div className={cn(adminCardClass, 'p-4')}>
      <p className="text-[15px] text-muted">{label}</p>
      <p className={cn('mt-1.5 text-[24px] font-semibold tracking-[-0.02em]', tones[tone])}>
        {value}
      </p>
      {detail ? <p className="mt-1 text-[15px] leading-relaxed text-muted">{detail}</p> : null}
    </div>
  );
}

const STATUS_TONES = {
  investigating: 'border-bad/25 bg-bad-soft text-bad',
  identified: 'border-warn/25 bg-warn-soft text-warn',
  monitoring: 'border-info/20 bg-info-soft text-info',
  resolved: 'border-ok/25 bg-ok-soft text-ok',
} as const;

const IMPACT_TONES = {
  none: 'border-line bg-paper text-muted',
  minor: 'border-info/20 bg-info-soft text-info',
  major: 'border-warn/25 bg-warn-soft text-warn',
  critical: 'border-bad/25 bg-bad-soft text-bad',
} as const;

const badgeClass = 'fh-pill border font-medium';

export function AdminStatusBadge({ status }: { status: keyof typeof STATUS_TONES }) {
  const labels = {
    investigating: 'Investigating',
    identified: 'Identified',
    monitoring: 'Monitoring',
    resolved: 'Resolved',
  } as const;
  return <span className={cn(badgeClass, STATUS_TONES[status])}>{labels[status]}</span>;
}

export function AdminImpactBadge({ impact }: { impact: keyof typeof IMPACT_TONES }) {
  const labels = {
    none: 'No impact',
    minor: 'Minor',
    major: 'Major',
    critical: 'Critical',
  } as const;
  return <span className={cn(badgeClass, IMPACT_TONES[impact])}>{labels[impact]}</span>;
}

export function AdminMaintenanceBadge({ status }: { status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' }) {
  const labels = {
    scheduled: 'Scheduled',
    in_progress: 'In progress',
    completed: 'Completed',
    cancelled: 'Cancelled',
  } as const;
  const tones = {
    scheduled: IMPACT_TONES.minor,
    in_progress: IMPACT_TONES.major,
    completed: IMPACT_TONES.none,
    cancelled: IMPACT_TONES.none,
  } as const;
  return <span className={cn(badgeClass, tones[status])}>{labels[status]}</span>;
}

export function EmptyAdminState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className={cn(adminCardClass, 'border-dashed p-8 text-center')}>
      <p className="text-[18px] font-semibold text-ink">{title}</p>
      {children ? <div className="mt-1.5 text-[15px] leading-relaxed text-muted">{children}</div> : null}
    </div>
  );
}
