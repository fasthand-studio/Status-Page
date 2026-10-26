import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAdminContext } from '@/lib/auth';
import { loadAdminMonitor } from '@/lib/admin-data';
import { toggleMonitorAction, runMonitorNowAction, updateMonitorAction } from '@/app/admin/actions';
import { formatDateTime, formatRelativeTime } from '@/lib/format';
import { isUuid } from '@/lib/validation';
import { MonitorForm } from '@/components/admin/monitor-form';
import {
  AdminPageHeader,
  adminCardClass,
  linkClass,
  Notice,
} from '@/components/admin/ui';
import { InlineActionButton } from '@/components/admin/inline-action-button';
import { MonitorState } from '@/components/admin/monitor-state';
import { ArrowLeftIcon } from '@/components/icons';

export const metadata: Metadata = { title: 'Monitor — FastHand Ops' };

function excerpt(value: string | null, maxLength = 160): string | null {
  if (!value) return null;
  return value.length > maxLength ? `${value.slice(0, maxLength)}…` : value;
}

export default async function AdminMonitorPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string; saved?: string; ran?: string }>;
}) {
  const { id } = await params;
  if (!isUuid(id)) notFound();

  const context = await requireAdminContext();
  const query = await searchParams;

  let data;
  try {
    data = await loadAdminMonitor(context.supabase, id);
  } catch (caught) {
    return (
      <div className="mx-auto max-w-3xl">
        <AdminPageHeader title="Monitor" />
        <Notice tone="bad">{caught instanceof Error ? caught.message : 'Could not load the monitor.'}</Notice>
      </div>
    );
  }

  if (!data) notFound();
  const { monitor, status, recent } = data;

  return (
    <div className="space-y-6">
      <Link href="/admin/monitors" className="inline-flex items-center gap-1.5 text-[15px] text-muted hover:text-ink">
        <ArrowLeftIcon className="h-3.5 w-3.5" />
        All monitors
      </Link>

      {query.created ? <Notice tone="ok">Monitor created. The next scheduled run will pick it up.</Notice> : null}
      {query.saved ? <Notice tone="ok">Monitor saved.</Notice> : null}
      {query.ran === 'ok' ? (
        <Notice tone="ok">The check passed and was stored. Its result is the newest entry below.</Notice>
      ) : null}
      {query.ran === 'fail' ? (
        <Notice tone="warn">
          The check failed and was stored. Automation may open an incident once the failure threshold is reached.
        </Notice>
      ) : null}

      <AdminPageHeader
        title={monitor.name}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <MonitorState status={status} />
            <span className="break-all font-sans text-[15px] text-muted">{monitor.url}</span>
          </span>
        }
        actions={
          <>
            <InlineActionButton
              action={runMonitorNowAction}
              fields={{ monitor_id: monitor.id }}
              label="Run check now"
              pendingLabel="Checking…"
            />
            <InlineActionButton
              action={toggleMonitorAction}
              fields={{ monitor_id: monitor.id }}
              label={monitor.enabled ? 'Pause monitor' : 'Resume monitor'}
              pendingLabel="Working…"
            />
          </>
        }
      />

      <div className="grid gap-3 xl:grid-cols-[1.25fr_0.9fr]">
        <MonitorForm action={updateMonitorAction} monitor={monitor} submitLabel="Save monitor" />

        <aside className="space-y-4">
          <section className={`${adminCardClass} px-3 py-2`}>
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="font-sans text-[17px] font-semibold">Recent checks</h2>
              <Link href="/admin/services" className={linkClass}>
                Services
              </Link>
            </div>
            {recent.length === 0 ? (
              <p className="mt-2 text-[14px] leading-relaxed text-muted">
                No checks stored yet. Use “Run check now” once the URL is verified.
              </p>
            ) : (
              <div className="mt-2 overflow-x-auto">
                <table className="w-full min-w-[520px] text-left text-[15px]">
                  <thead>
                    <tr className="border-b border-line font-sans text-[14px] text-muted">
                      <th className="py-2 pr-2 font-medium">Time</th>
                      <th className="py-2 pr-2 font-medium">Result</th>
                      <th className="py-2 pr-2 font-medium">HTTP</th>
                      <th className="py-2 pr-2 font-medium">ms</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {recent.map((check) => (
                      <tr key={check.id}>
                        <td className="py-2 pr-2 align-top text-muted" title={formatDateTime(check.checked_at)}>
                          {formatRelativeTime(check.checked_at)}
                        </td>
                        <td className="py-2 pr-2 align-top">
                          <span
                            className={`font-sans text-[14px] ${
                              check.ok ? 'text-ok' : 'text-bad'
                            }`}
                          >
                            {check.ok ? 'Pass' : 'Fail'}
                          </span>
                        </td>
                        <td className="py-2 pr-2 align-top font-sans text-muted">{check.status_code ?? '—'}</td>
                        <td className="py-2 pr-2 align-top font-sans text-muted">
                          {check.response_time_ms ?? '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {recent.some((check) => check.error || check.body_excerpt) ? (
              <div className="mt-2 space-y-2 border-t border-line pt-3">
                {recent
                  .filter((check) => check.error || check.body_excerpt)
                  .slice(0, 3)
                  .map((check) => (
                    <div key={`detail-${check.id}`} className="text-[15px] leading-relaxed text-muted">
                      <span className="font-sans text-[14px] text-muted">
                        {formatDateTime(check.checked_at)}
                      </span>
                      {check.error ? <p className="text-bad">{check.error}</p> : null}
                      {check.body_excerpt ? (
                        <p className="mt-0.5 font-sans text-muted">{excerpt(check.body_excerpt)}</p>
                      ) : null}
                    </div>
                  ))}
              </div>
            ) : null}
          </section>

          <section className={`${adminCardClass} px-3 py-2`}>
            <p className="font-sans text-[14px] text-muted">How automation behaves</p>
            <ul className="mt-2 space-y-2 text-[15px] leading-relaxed text-muted">
              <li>
                Opens an incident after <strong className="text-ink/85">{monitor.failure_threshold}</strong> consecutive
                failures, once no other incident is open for this monitor.
              </li>
              <li>
                Resolves it after <strong className="text-ink/85">{monitor.recovery_threshold}</strong> consecutive
                passes, with an automated closing update.
              </li>
              <li>Paused monitors still accept manual “Run check now” results but do not open or resolve incidents.</li>
              <li>Check errors and URLs are admin-only; the public sees only status and timing.</li>
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}
