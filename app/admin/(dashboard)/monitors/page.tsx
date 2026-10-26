import type { Metadata } from 'next';
import Link from 'next/link';
import { requireAdminContext } from '@/lib/auth';
import { loadAdminMonitors } from '@/lib/admin-data';
import { toggleMonitorAction, runMonitorNowAction, deleteMonitorAction } from '@/app/admin/actions';
import { formatRelativeTime } from '@/lib/format';
import { isMonitorStale } from '@/lib/status';
import {
  AdminPageHeader,
  adminCardClass,
  EmptyAdminState,
  linkClass,
  Notice,
  primaryButtonClass,
  secondaryButtonClass,
} from '@/components/admin/ui';
import { InlineActionButton } from '@/components/admin/inline-action-button';
import { DeleteButton } from '@/components/admin/delete-button';
import { MonitorState } from '@/components/admin/monitor-state';
import { PlayIcon, PlusIcon } from '@/components/icons';

export const metadata: Metadata = { title: 'Monitors — FastHand Ops' };

export default async function AdminMonitorsPage({
  searchParams,
}: {
  searchParams: Promise<{ deleted?: string }>;
}) {
  const context = await requireAdminContext();
  const query = await searchParams;

  let data;
  try {
    data = await loadAdminMonitors(context.supabase);
  } catch (caught) {
    return (
      <div className="mx-auto max-w-3xl">
        <AdminPageHeader title="Monitors" />
        <Notice tone="bad">{caught instanceof Error ? caught.message : 'Could not load monitors.'}</Notice>
      </div>
    );
  }

  const enabled = data.monitors.filter((monitor) => monitor.enabled);
  const lastRun = data.runs[0] ?? null;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Monitors"
        description="Every monitor points at a real endpoint. Checks are stored; uptime is derived from them."
        actions={
          <Link href="/admin/monitors/new" className={primaryButtonClass}>
            <PlusIcon className="h-4 w-4" />
            New monitor
          </Link>
        }
      />

      {query.deleted ? <Notice tone="ok">Monitor deleted.</Notice> : null}

      <Notice tone={enabled.length === 0 ? 'warn' : 'info'}>
        {enabled.length === 0
          ? 'No monitors are enabled. The public page will report unknown health rather than show green.'
          : `${enabled.length} monitor${enabled.length === 1 ? '' : 's'} enabled. The scheduled checker runs every 5 minutes; “Run check now” stores an extra result immediately.`}
        {lastRun ? ` Last run ${formatRelativeTime(lastRun.finished_at ?? lastRun.started_at)}.` : ''}
      </Notice>

      {data.monitors.length === 0 ? (
        <EmptyAdminState title="No monitors configured">
          Start with the data-center heartbeat, then add endpoints only when they genuinely prove health.
        </EmptyAdminState>
      ) : (
        <div className="space-y-3">
          {data.monitors.map((monitor) => {
            const stale = monitor.status ? monitor.status.enabled && isMonitorStale(monitor.status) : false;
            return (
              <article key={monitor.id} className={`${adminCardClass} px-3 py-2`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-sans text-[13.5px] font-semibold text-ink">{monitor.name}</h2>
                      <MonitorState status={monitor.status} />
                      {!monitor.enabled ? (
                        <span className="font-sans text-[11.5px] text-muted">Paused</span>
                      ) : null}
                    </div>
                    <p className="mt-1 break-all font-sans text-[12.5px] text-muted">{monitor.url}</p>
                  </div>
                  <Link href={`/admin/monitors/${monitor.id}`} className={`${linkClass} text-[12.5px]`}>
                    Open
                  </Link>
                </div>

                <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div>
                    <dt className="font-sans text-[11.5px] text-muted">Last check</dt>
                    <dd className="mt-0.5 text-[12.5px] text-muted">
                      {monitor.status?.checked_at ? formatRelativeTime(monitor.status.checked_at) : 'Never'}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-sans text-[11.5px] text-muted">HTTP / time</dt>
                    <dd className="mt-0.5 font-sans text-[12.5px] text-muted">
                      {monitor.latest
                        ? `${monitor.latest.status_code ?? '—'} · ${monitor.latest.response_time_ms ?? '—'} ms`
                        : '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-sans text-[11.5px] text-muted">Cadence</dt>
                    <dd className="mt-0.5 text-[12.5px] text-muted">{Math.round(monitor.check_interval_seconds / 60)} min</dd>
                  </div>
                  <div>
                    <dt className="font-sans text-[11.5px] text-muted">Thresholds</dt>
                    <dd className="mt-0.5 text-[12.5px] text-muted">
                      {monitor.failure_threshold} fail / {monitor.recovery_threshold} pass
                    </dd>
                  </div>
                </dl>

                {stale ? (
                  <p className="mt-2 text-[12.5px] leading-relaxed text-warn">
                    The last check is older than the expected window. The public page shows this service as unknown.
                  </p>
                ) : null}

                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-3">
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
                  <Link href={`/admin/monitors/${monitor.id}`} className={`${secondaryButtonClass} px-3 py-1.5 text-[12.5px]`}>
                    <PlayIcon className="h-3 w-3" />
                    Check history
                  </Link>
                  <DeleteButton
                    action={deleteMonitorAction}
                    fields={{ monitor_id: monitor.id }}
                    description="Delete this monitor and all stored check results? Attached services become No check."
                    className="ml-auto"
                  />
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
