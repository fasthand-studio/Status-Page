import type { Metadata } from 'next';
import Link from 'next/link';
import { requireAdminContext } from '@/lib/auth';
import { loadAdminOverview } from '@/lib/admin-data';
import { formatDateTime, formatRelativeTime, secondsSince } from '@/lib/format';
import { isMonitorStale, latestIncidentUpdate } from '@/lib/status';
import {
  AdminImpactBadge,
  AdminPageHeader,
  AdminStatusBadge,
  adminCardClass,
  EmptyAdminState,
  linkClass,
  Notice,
  primaryButtonClass,
  secondaryButtonClass,
  StatCard,
} from '@/components/admin/ui';
import { MonitorState } from '@/components/admin/monitor-state';
import { PlusIcon } from '@/components/icons';

export const metadata: Metadata = { title: 'Overview — FastHand Ops' };

export default async function AdminOverviewPage() {
  const context = await requireAdminContext();

  let data;
  try {
    data = await loadAdminOverview(context.supabase);
  } catch (caught) {
    return (
      <div className="mx-auto max-w-3xl">
        <AdminPageHeader title="Overview" />
        <Notice tone="bad">
          {caught instanceof Error ? caught.message : 'Could not load the operations overview.'} Apply the migrations
          if this is a fresh project.
        </Notice>
      </div>
    );
  }

  const enabled = data.statuses.filter((status) => status.enabled);
  const failing = enabled.filter((status) => status.checked_at && status.ok === false && !isMonitorStale(status));
  const stale = enabled.filter((status) => !status.checked_at || isMonitorStale(status));
  const latestRun = data.runs[0] ?? null;
  const runAge = latestRun ? secondsSince(latestRun.finished_at ?? latestRun.started_at) : null;
  const runnerStale = runAge === null || runAge > 20 * 60;
  const attentionCount = failing.length + stale.length + data.openIncidents.length;

  return (
    <div className="space-y-5">
      <AdminPageHeader
        title="Overview"
        description="Real checks, real incidents. Nothing here is inferred from the last good result."
        actions={
          <>
            <Link href="/admin/incidents/new" className={primaryButtonClass}>
              <PlusIcon className="h-4 w-4" />
              New incident
            </Link>
            <Link href="/admin/maintenance/new" className={secondaryButtonClass}>
              Schedule maintenance
            </Link>
          </>
        }
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Open incidents"
          value={data.openIncidents.length}
          detail={data.openIncidents.length ? 'Visible on the public page' : 'Nothing published right now'}
          tone={data.openIncidents.length ? 'bad' : 'ok'}
        />
        <StatCard
          label="Monitors passing"
          value={`${enabled.filter((status) => status.checked_at && status.ok && !isMonitorStale(status)).length}/${enabled.length}`}
          detail={enabled.length ? 'Enabled monitors with a fresh passing check' : 'No monitors are enabled'}
          tone={failing.length ? 'bad' : 'ok'}
        />
        <StatCard
          label="Stale or waiting"
          value={stale.length}
          detail="No recent evidence — shown as unknown publicly"
          tone={stale.length ? 'warn' : 'neutral'}
        />
        <StatCard
          label="Checks stored (24h)"
          value={data.checks24h.toLocaleString('en-US')}
          detail={latestRun ? `Last run ${formatRelativeTime(latestRun.finished_at ?? latestRun.started_at)}` : 'No run recorded yet'}
          tone="neutral"
        />
      </section>

      {runnerStale ? (
        <Notice tone="warn">
          <strong className="font-semibold">The scheduled checker has not reported recently.</strong>{' '}
          {latestRun
            ? `Last run finished ${formatRelativeTime(latestRun.finished_at ?? latestRun.started_at)}.`
            : 'No monitor run has ever been recorded.'}{' '}
          Check the pg_cron schedule and the vault secret used by the check endpoint. Until it runs again, the public
          page will mark monitored services as unknown rather than green.
        </Notice>
      ) : null}

      <section className="grid gap-3 xl:grid-cols-[1.35fr_0.65fr]">
        <div className="space-y-3">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="font-sans text-[18px] font-semibold tracking-[-0.02em]">Needs attention</h2>
            <p className="font-sans text-[14px] text-muted">
              {attentionCount} item{attentionCount === 1 ? '' : 's'}
            </p>
          </div>

          {attentionCount === 0 ? (
            <Notice tone="ok">
              No failing monitors, no stale checks, no open incidents. This covers the monitors listed below — it is
              not proof that every FastHand surface is healthy.
            </Notice>
          ) : (
            <div className="space-y-2">
              {data.openIncidents.map((incident) => {
                const update = latestIncidentUpdate(incident);
                return (
                  <Link
                    key={incident.id}
                    href={`/admin/incidents/${incident.id}`}
                    className={`${adminCardClass} block px-3 py-2 transition hover:border-ink/25`}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <AdminStatusBadge status={incident.status} />
                      <AdminImpactBadge impact={incident.impact} />
                      {incident.auto_detected ? (
                        <span className="font-sans text-[14px] text-muted">
                          Auto-detected
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-2 font-medium text-ink">{incident.title}</p>
                    <p className="mt-1 text-[15px] text-muted">
                      Started {formatRelativeTime(incident.started_at)}
                      {update ? ` · Latest update ${formatRelativeTime(update.created_at)}` : ''}
                    </p>
                  </Link>
                );
              })}

              {failing.map((status) => (
                <Link
                  key={status.id}
                  href={`/admin/monitors/${status.id}`}
                  className={`${adminCardClass} flex flex-wrap items-center justify-between gap-3 px-3 py-2 transition hover:border-ink/25`}
                >
                  <div>
                    <p className="font-medium text-ink">{status.name}</p>
                    <p className="mt-1 text-[15px] text-muted">
                      Last check failed {formatRelativeTime(status.checked_at)}
                      {status.status_code ? ` · HTTP ${status.status_code}` : ''}
                    </p>
                  </div>
                  <span className="font-sans text-[14px] text-bad">
                    Failing
                  </span>
                </Link>
              ))}

              {stale.map((status) => (
                <Link
                  key={status.id}
                  href={`/admin/monitors/${status.id}`}
                  className={`${adminCardClass} flex flex-wrap items-center justify-between gap-3 px-3 py-2 transition hover:border-ink/25`}
                >
                  <div>
                    <p className="font-medium text-ink">{status.name}</p>
                    <p className="mt-1 text-[15px] text-muted">
                      {status.checked_at
                        ? `Last check ${formatRelativeTime(status.checked_at)} · expected every ${Math.round(status.check_interval_seconds / 60)} min`
                        : 'No check has been stored yet'}
                    </p>
                  </div>
                  <span className="font-sans text-[14px] text-warn">
                    {status.checked_at ? 'Stale' : 'Waiting'}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        <aside className="space-y-3">
          <h2 className="font-sans text-[18px] font-semibold tracking-[-0.02em]">Runner</h2>
          <div className={`${adminCardClass} divide-y divide-line`}>
            {data.runs.length === 0 ? (
              <p className="px-3 py-2 text-[14px] text-muted">
                No monitor runs yet. Trigger the scheduled check from the database, or run{' '}
                <span className="font-sans text-ink/85">npm run checks</span> locally with the service-role key.
              </p>
            ) : (
              data.runs.map((run) => (
                <div key={run.id} className="flex items-center justify-between gap-3 px-3 py-2">
                  <div>
                    <p className="text-[14px] text-ink/85">{formatDateTime(run.started_at)}</p>
                    <p className="mt-0.5 font-sans text-[14px] text-muted">
                      {run.source}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-sans text-[15px] text-ink/85">
                      {run.checks_run} check{run.checks_run === 1 ? '' : 's'}
                    </p>
                    <p className={`font-sans text-[14px] ${run.failures > 0 ? 'text-bad' : 'text-muted'}`}>
                      {run.failures} failed
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
          <p className="text-[15px] leading-relaxed text-muted">
            Default cadence is every 5 minutes via pg_cron. Postgres can delay jobs under load; the public page treats
            late checks as unknown instead of assuming health.
          </p>
        </aside>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="font-sans text-[18px] font-semibold tracking-[-0.02em]">Monitors</h2>
          <Link href="/admin/monitors" className={linkClass}>
            Manage monitors
          </Link>
        </div>

        {data.statuses.length === 0 ? (
          <EmptyAdminState title="No monitors configured">
            The public page shows services without health checks as “No check”, never green.
          </EmptyAdminState>
        ) : (
          <div className={`${adminCardClass} overflow-x-auto`}>
            <table className="w-full min-w-[760px] text-left text-[15px]">
              <thead>
                <tr className="border-b border-line font-sans text-[14px] text-muted">
                  <th className="px-3 py-2 font-medium">Monitor</th>
                  <th className="px-3 py-2 font-medium">State</th>
                  <th className="px-3 py-2 font-medium">Last check</th>
                  <th className="px-3 py-2 font-medium">Response</th>
                  <th className="px-3 py-2 font-medium">Cadence</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {data.statuses.map((status) => (
                  <tr key={status.id} className="transition hover:bg-ink/[0.03]">
                    <td className="px-3 py-2 font-medium text-ink/85">{status.name}</td>
                    <td className="px-3 py-2">
                      <MonitorState status={status} />
                    </td>
                    <td className="px-3 py-2 text-muted">
                      {status.checked_at ? formatRelativeTime(status.checked_at) : 'Never'}
                    </td>
                    <td className="px-3 py-2 font-sans text-[15px] text-muted">
                      {status.response_time_ms === null ? '—' : `${status.response_time_ms} ms`}
                    </td>
                    <td className="px-3 py-2 font-sans text-[15px] text-muted">
                      {Math.round(status.check_interval_seconds / 60)} min
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Link href={`/admin/monitors/${status.id}`} className={linkClass}>
                        Open
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {data.recentIncidents.length > 0 ? (
        <section className="space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="font-sans text-[18px] font-semibold tracking-[-0.02em]">Recently resolved</h2>
            <Link href="/admin/incidents" className={linkClass}>
              All incidents
            </Link>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            {data.recentIncidents.map((incident) => (
              <Link
                key={incident.id}
                href={`/admin/incidents/${incident.id}`}
                className={`${adminCardClass} px-3 py-2 transition hover:border-ink/25`}
              >
                <p className="font-medium text-ink/85">{incident.title}</p>
                <p className="mt-1 text-[15px] text-muted">
                  Resolved {formatRelativeTime(incident.resolved_at)} · {incident.incident_updates.length} update
                  {incident.incident_updates.length === 1 ? '' : 's'}
                </p>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <p className="text-[15px] leading-relaxed text-muted">
        This page is private, excluded from search engines, and never linked from the public status page.
      </p>
    </div>
  );
}
