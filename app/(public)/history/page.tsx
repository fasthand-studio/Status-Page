import type { Metadata } from 'next';
import Link from 'next/link';
import { cn } from '@/lib/cn';
import { ChevronDownIcon, SearchIcon } from '@/components/icons';
import { ImpactBadge } from '@/components/incident-status-badge';
import { Markdown } from '@/components/markdown';
import { PageHeader } from '@/components/page-header';
import { SetupNotice } from '@/components/setup-notice';
import { getHistory, getServiceDirectory } from '@/lib/data';
import {
  formatClock,
  formatDateTime,
  formatDuration,
  formatMonthLabel,
  formatShortDate,
  formatWindowShort,
} from '@/lib/format';
import { maintenancePhase, MAINTENANCE_PHASE_TONE } from '@/lib/maintenance';
import type { IncidentWithRelations, MaintenanceWithServices } from '@/lib/types';

export const metadata: Metadata = {
  title: 'History',
  description: 'The full public incident and maintenance archive for FastHand services.',
};

type HistoryType = 'all' | 'incidents' | 'maintenance';

type HistoryEvent =
  | { kind: 'incident'; at: string; incident: IncidentWithRelations }
  | { kind: 'maintenance'; at: string; window: MaintenanceWithServices };

type ServiceName = { id: string; name: string; slug: string };

const TYPE_OPTIONS: { value: HistoryType; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'incidents', label: 'Incidents' },
  { value: 'maintenance', label: 'Maintenance' },
];

function parseType(value: string | string[] | undefined): HistoryType {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === 'incidents' || raw === 'maintenance' ? raw : 'all';
}

function parseQuery(value: string | string[] | undefined): string {
  const raw = Array.isArray(value) ? value[0] : value;
  return (raw ?? '').trim();
}

function hrefFor(type: HistoryType, query: string): string {
  const params = new URLSearchParams();
  if (type !== 'all') params.set('type', type);
  if (query) params.set('q', query);
  const search = params.toString();
  return search ? `/history?${search}` : '/history';
}

function servicesFor(event: HistoryEvent, serviceById: Map<string, ServiceName>): string[] {
  const rows =
    event.kind === 'incident' ? event.incident.incident_services : event.window.maintenance_services;
  return rows
    .map((row) => serviceById.get(row.service_id)?.name)
    .filter((name): name is string => Boolean(name));
}

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const history = await getHistory();

  if (!history.configured) {
    return (
      <div className="mx-auto max-w-[1100px] px-4 pt-4 sm:px-6">
        <PageHeader
          title="History"
          description="The public archive starts after Supabase is connected. Nothing is backfilled or invented."
        />
        <div className="mt-4">
          <SetupNotice />
        </div>
      </div>
    );
  }

  const params = await searchParams;
  const activeType = parseType(params.type);
  const query = parseQuery(params.q);

  const services = await getServiceDirectory();
  const serviceById = new Map(services.map((service) => [service.id, service]));

  const events: HistoryEvent[] = [
    ...history.incidents.map((incident) => ({
      kind: 'incident' as const,
      at: incident.resolved_at ?? incident.started_at,
      incident,
    })),
    ...history.maintenance.map((window) => ({
      kind: 'maintenance' as const,
      at: window.scheduled_start,
      window,
    })),
  ].sort((a, b) => +new Date(b.at) - +new Date(a.at));

  const normalizedQuery = query.toLowerCase();
  const textMatched = normalizedQuery
    ? events.filter((event) => {
        const affected = servicesFor(event, serviceById).join(' ');
        const body =
          event.kind === 'incident'
            ? [
                event.incident.title,
                ...event.incident.incident_updates.map((update) => update.body),
              ].join(' ')
            : `${event.window.title} ${event.window.body}`;
        return `${body} ${affected}`.toLowerCase().includes(normalizedQuery);
      })
    : events;

  const counts = {
    all: textMatched.length,
    incidents: textMatched.filter((event) => event.kind === 'incident').length,
    maintenance: textMatched.filter((event) => event.kind === 'maintenance').length,
  };

  const visible = textMatched.filter(
    (event) =>
      activeType === 'all' ||
      (activeType === 'incidents' && event.kind === 'incident') ||
      (activeType === 'maintenance' && event.kind === 'maintenance'),
  );

  const byMonth = new Map<string, HistoryEvent[]>();
  for (const event of visible) {
    const key = formatMonthLabel(event.at);
    const bucket = byMonth.get(key) ?? [];
    bucket.push(event);
    byMonth.set(key, bucket);
  }

  const firstEvent = events.at(-1);

  return (
    <div className="mx-auto max-w-[1100px] px-4 pb-8 pt-4 sm:px-6">
      <PageHeader
        title="History"
        description="Every resolved incident and maintenance window, newest first. The archive starts when this status page began recording — earlier gaps are left empty."
        aside={
          <span className="fh-num">
            {events.length} events
            {firstEvent ? ` · since ${formatMonthLabel(firstEvent.at)}` : ''}
          </span>
        }
      />

      {events.length === 0 ? (
        <div className="mt-5 fh-card border border-line bg-surface px-3.5 py-2.5 text-[12.5px] text-muted">
          <span className="font-medium text-ink">Nothing archived yet.</span> Resolved incidents and
          maintenance windows appear here once they happen.
        </div>
      ) : (
        <>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
            <form action="/history" method="get" className="relative flex-1">
              {activeType !== 'all' && <input type="hidden" name="type" value={activeType} />}
              <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
              <input
                type="search"
                name="q"
                defaultValue={query}
                placeholder="Search titles, notes, or services"
                aria-label="Search history"
                className="fh-field w-full border border-line bg-surface pl-8 pr-[70px] text-[13px] text-ink placeholder:text-muted/70 focus:border-primary focus:outline-none"
              />
              <button
                type="submit"
                className="absolute right-1 top-1/2 h-6 -translate-y-1/2 fh-r-xs px-2 text-[11.5px] font-medium text-muted hover:bg-surface-soft hover:text-ink"
              >
                Search
              </button>
            </form>

            <nav
              aria-label="Filter history"
              className="inline-flex self-start overflow-hidden fh-r-sm divide-x divide-line border border-line bg-surface"
            >
              {TYPE_OPTIONS.map((option) => {
                const active = option.value === activeType;
                const count =
                  option.value === 'incidents'
                    ? counts.incidents
                    : option.value === 'maintenance'
                      ? counts.maintenance
                      : counts.all;
                return (
                  <Link
                    key={option.value}
                    href={hrefFor(option.value, query)}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'px-2.5 py-1.5 text-[12px] transition-colors',
                      active
                        ? 'bg-primary font-medium text-white'
                        : 'text-muted hover:bg-surface-soft hover:text-ink',
                    )}
                  >
                    {option.label}
                    <span className={cn('fh-num ml-1.5 text-[11px]', active ? 'text-white/70' : 'text-muted/70')}>
                      {count}
                    </span>
                  </Link>
                );
              })}
            </nav>
          </div>

          <p className="mt-2 text-[11.5px] text-muted">
            {normalizedQuery ? (
              <>
                {visible.length} match{visible.length === 1 ? '' : 'es'} for “{query}”
                {' · '}
                <Link href={hrefFor(activeType, '')} className="fh-link">
                  Clear search
                </Link>
              </>
            ) : (
              `${visible.length} events · newest first`
            )}
          </p>

          {visible.length === 0 ? (
            <div className="mt-3 fh-card border border-line bg-surface px-3.5 py-2.5 text-[12.5px] text-muted">
              <span className="font-medium text-ink">No events match.</span> Try a different search or
              filter.
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              {[...byMonth.entries()].map(([month, monthEvents]) => (
                <section key={month}>
                  <div className="mb-1.5 flex items-baseline justify-between px-0.5">
                    <h2 className="text-[11.5px] font-semibold uppercase tracking-[0.05em] text-muted">
                      {month}
                    </h2>
                    <span className="fh-num text-[11px] text-muted">
                      {monthEvents.length} event{monthEvents.length === 1 ? '' : 's'}
                    </span>
                  </div>
                  <div className="overflow-hidden fh-panel border border-line bg-surface">
                    {monthEvents.map((event) =>
                      event.kind === 'incident' ? (
                        <IncidentHistoryRow
                          key={`incident-${event.incident.id}`}
                          incident={event.incident}
                          affected={servicesFor(event, serviceById)}
                        />
                      ) : (
                        <MaintenanceHistoryRow
                          key={`maintenance-${event.window.id}`}
                          window={event.window}
                          affected={servicesFor(event, serviceById)}
                        />
                      ),
                    )}
                  </div>
                </section>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

const ROW_GRID =
  'grid grid-cols-[62px_minmax(0,1fr)_auto] items-center gap-x-3 px-3.5 py-2.5 sm:grid-cols-[86px_minmax(0,1fr)_104px_72px]';

function EventTime({ iso }: { iso: string }) {
  return (
    <time dateTime={iso} className="fh-num text-[11px] leading-tight text-muted">
      <span className="block text-[11.5px] text-ink/70">{formatShortDate(iso)}</span>
      {formatClock(iso)}
    </time>
  );
}

function EventTitle({
  title,
  affected,
  kind,
}: {
  title: string;
  affected: string[];
  kind: 'Incident' | 'Maintenance';
}) {
  return (
    <div className="min-w-0">
      <p className="truncate text-[13px] font-medium">{title}</p>
      <p className="mt-0.5 truncate text-[11.5px] text-muted">
        {kind} · {affected.length > 0 ? affected.join(' · ') : 'no services linked'}
      </p>
    </div>
  );
}

function IncidentHistoryRow({
  incident,
  affected,
}: {
  incident: IncidentWithRelations;
  affected: string[];
}) {
  const started = new Date(incident.started_at).getTime();
  const ended = new Date(incident.resolved_at ?? incident.started_at).getTime();
  const duration = Math.max(0, (ended - started) / 1000);

  return (
    <Link
      href={`/incidents/${incident.id}`}
      className={cn(ROW_GRID, 'border-b border-line transition-colors last:border-b-0 hover:bg-surface-soft')}
    >
      <EventTime iso={incident.resolved_at ?? incident.started_at} />
      <EventTitle title={incident.title} affected={affected} kind="Incident" />
      <span className="hidden justify-self-end sm:block">
        <ImpactBadge impact={incident.impact} />
      </span>
      <span className="fh-num justify-self-end text-[11.5px] text-muted">{formatDuration(duration)}</span>
    </Link>
  );
}

function MaintenanceHistoryRow({
  window,
  affected,
}: {
  window: MaintenanceWithServices;
  affected: string[];
}) {
  const phase = maintenancePhase(window, new Date());

  return (
    <details className="group border-b border-line last:border-b-0">
      <summary
        className={cn(
          ROW_GRID,
          'cursor-pointer list-none transition-colors hover:bg-surface-soft [&::-webkit-details-marker]:hidden',
        )}
      >
        <EventTime iso={window.scheduled_start} />
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-[13px] font-medium">{window.title}</p>
            <span className="shrink-0 sm:hidden">
              <span className={cn('fh-pill font-medium', MAINTENANCE_PHASE_TONE[phase.key])}>{phase.label}</span>
            </span>
          </div>
          <p className="mt-0.5 truncate text-[11.5px] text-muted">
            Maintenance · {affected.length > 0 ? affected.join(' · ') : 'no services linked'}
          </p>
        </div>
        <span className="hidden justify-self-end sm:block">
          <span className={cn('fh-pill font-medium', MAINTENANCE_PHASE_TONE[phase.key])}>{phase.label}</span>
        </span>
        <span className="flex items-center justify-self-end text-muted">
          <ChevronDownIcon className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />
        </span>
      </summary>
      <div className="border-t border-line bg-surface-soft px-3.5 py-3 sm:pl-[102px]">
        <p className="fh-num text-[11.5px] text-muted">
          {formatWindowShort(window.scheduled_start, window.scheduled_end)} · Recorded{' '}
          {formatDateTime(window.created_at)}
        </p>
        {window.body ? (
          <Markdown className="mt-1.5 max-w-3xl">{window.body}</Markdown>
        ) : (
          <p className="mt-1.5 text-[12px] text-muted">No notes were attached to this window.</p>
        )}
      </div>
    </details>
  );
}
