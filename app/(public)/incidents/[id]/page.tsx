import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { DataError } from '@/components/data-error';
import { ArrowLeftIcon, ClockIcon, LinkIcon, WrenchIcon } from '@/components/icons';
import { ImpactBadge, IncidentStatusBadge } from '@/components/incident-status-badge';
import { IncidentTimeline } from '@/components/incident-timeline';
import { getIncidentDetail, getServiceDirectory } from '@/lib/data';
import { formatDateTime, formatDuration } from '@/lib/format';
import { getPublicClient } from '@/lib/supabase/public';

type Params = { id: string };

const loadIncident = cache(getIncidentDetail);
const loadServices = cache(getServiceDirectory);

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { id } = await params;
  const { incident } = await loadIncident(id);
  if (!incident) return { title: 'Incident not found' };
  return { title: incident.title, description: incident.title };
}

export default async function IncidentDetailPage({ params }: { params: Promise<Params> }) {
  const { id } = await params;

  if (!getPublicClient()) {
    return (
      <div className="mx-auto max-w-[900px] px-4 pt-6 sm:px-6">
        <PageBack />
        <div className="mt-6">
          <DataError
            title="Incident history is not connected"
            description="Connect Supabase to load public incident timelines."
          />
        </div>
      </div>
    );
  }

  const { incident, error } = await loadIncident(id);
  if (!incident && error) {
    return (
      <div className="mx-auto max-w-[900px] px-4 pt-6 sm:px-6">
        <PageBack />
        <div className="mt-6">
          <DataError description={error} />
        </div>
      </div>
    );
  }
  if (!incident) notFound();

  const services = await loadServices();
  const serviceById = new Map(services.map((service) => [service.id, service]));
  const affected = incident.incident_services
    .map((row) => serviceById.get(row.service_id))
    .filter((service): service is NonNullable<typeof service> => Boolean(service));

  const end = incident.resolved_at ? new Date(incident.resolved_at) : new Date();
  const duration = Math.max(0, (end.getTime() - new Date(incident.started_at).getTime()) / 1000);

  return (
    <div className="mx-auto max-w-[1060px] px-4 pb-8 pt-6 sm:px-6">
      <PageBack />

      <div className="mt-7 flex flex-wrap items-center gap-2">
        <IncidentStatusBadge status={incident.status} />
        <ImpactBadge impact={incident.impact} />
        {incident.auto_detected && (
          <span className="fh-round border border-dashed border-line px-2.5 py-1 font-sans text-[13px] text-muted">
            Found by automated monitoring
          </span>
        )}
      </div>

      <h1 className="mt-4 max-w-3xl text-balance text-[clamp(1.9rem,3.6vw,2.6rem)] font-semibold leading-[1.05] tracking-[-0.03em]">
        {incident.title}
      </h1>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[15px] text-muted">
        <span>Started {formatDateTime(incident.started_at)}</span>
        <span className="h-3 w-px bg-line" aria-hidden="true" />
        <span>
          {incident.resolved_at
            ? `Resolved ${formatDateTime(incident.resolved_at)} · lasted ${formatDuration(duration)}`
            : `Ongoing for ${formatDuration(duration)}`}
        </span>
        {affected.length > 0 && (
          <>
            <span className="h-3 w-px bg-line" aria-hidden="true" />
            <span className="inline-flex items-center gap-1">
              <LinkIcon className="h-3.5 w-3.5" />
              {affected.length} affected service{affected.length === 1 ? '' : 's'}
            </span>
          </>
        )}
        <span className="h-3 w-px bg-line" aria-hidden="true" />
        <span>All times UTC</span>
      </div>

      {affected.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {affected.map((service) => (
            <Link
              key={service.id}
              href={`/services#service-${service.slug}`}
              className="fh-round border border-line bg-surface px-2.5 py-1 font-sans text-[13px] text-muted transition-colors hover:border-ink/25 hover:text-ink"
            >
              {service.name}
            </Link>
          ))}
        </div>
      )}

      <div className="mt-9 grid gap-6 lg:grid-cols-[minmax(0,1.65fr)_minmax(260px,1fr)]">
        <section className="fh-panel border border-line bg-surface p-5 sm:p-7">
          <div className="flex items-center gap-2">
            <h2 className="font-sans text-[20px] font-semibold tracking-[-0.03em]">Timeline</h2>
            <span className="fh-round border border-line px-2 py-0.5 font-sans text-[13px] text-muted">
              {incident.incident_updates.length}
            </span>
          </div>
          <div className="mt-6">
            <IncidentTimeline updates={incident.incident_updates} />
          </div>
        </section>

        <aside className="space-y-4">
          <div className="fh-panel border border-line bg-surface p-5">
            <h2 className="font-sans text-[13px] text-muted">Summary</h2>
            <dl className="mt-4 space-y-3 text-[15px]">
              <SummaryRow label="Status" value={<IncidentStatusBadge status={incident.status} size="sm" />} />
              <SummaryRow label="Impact" value={<ImpactBadge impact={incident.impact} size="sm" />} />
              <SummaryRow label="Started" value={formatDateTime(incident.started_at)} />
              <SummaryRow label="Resolved" value={incident.resolved_at ? formatDateTime(incident.resolved_at) : 'Not yet'} />
              <SummaryRow label="Duration" value={formatDuration(duration)} />
              <SummaryRow label="Detection" value={incident.auto_detected ? 'Automated monitor' : 'Team report'} />
            </dl>
          </div>

          <div
            className={
              incident.resolved_at
                ? 'fh-panel border border-ok/25 bg-ok-soft/60 p-5'
                : 'fh-panel border border-warn/30 bg-warn-soft/60 p-5'
            }
          >
            <div className="flex items-center gap-2">
              {incident.resolved_at ? (
                <ClockIcon className="h-4 w-4 text-ok" />
              ) : (
                <WrenchIcon className="h-4 w-4 text-warn" />
              )}
              <p className="font-medium">
                {incident.resolved_at ? 'Resolved' : 'Still working on it'}
              </p>
            </div>
            <p className="mt-1.5 text-[15px] leading-relaxed text-ink/70">
              {incident.resolved_at
                ? 'This incident is closed. Updates stay public as part of the record.'
                : 'New updates are posted here. Automated monitors also update this incident when checks recover.'}
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function PageBack() {
  return (
    <Link
      href="/incidents"
      className="inline-flex items-center gap-1.5 font-sans text-[13px] text-muted hover:text-ink"
    >
      <ArrowLeftIcon className="h-3.5 w-3.5" />
      Incident log
    </Link>
  );
}

function SummaryRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-line/60 pb-3 last:border-0 last:pb-0">
      <dt className="shrink-0 text-muted">{label}</dt>
      <dd className="text-right text-ink/85">{value}</dd>
    </div>
  );
}
