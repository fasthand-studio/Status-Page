'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/cn';
import { formatRelativeTime, formatUptime } from '@/lib/format';
import type { ServiceHealth } from '@/lib/status';
import type { DailyBar, HealthState, UptimeWindow } from '@/lib/types';
import { EmptyState } from './empty-state';
import { ChevronDownIcon, SearchIcon } from './icons';
import { ServiceIcon } from './service-icon';
import { StatusPill } from './status-pill';
import { UptimeBars } from './uptime-bars';

export interface ExplorerService {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  health: ServiceHealth;
  uptime1: UptimeWindow;
  uptime7: UptimeWindow;
  uptime30: UptimeWindow;
  uptime90: UptimeWindow;
  bars: DailyBar[];
  lastCheckAt: string | null;
  monitored: boolean;
}

export interface ExplorerGroup {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  worst: HealthState;
  monitoredCount: number;
  services: ExplorerService[];
}

function windows(service: ExplorerService) {
  return [
    { label: '24h', window: service.uptime1 },
    { label: '7d', window: service.uptime7 },
    { label: '30d', window: service.uptime30 },
    { label: '90d', window: service.uptime90 },
  ];
}

export function ServicesExplorer({
  groups,
  totalServices,
  totalMonitored,
  now,
}: {
  groups: ExplorerGroup[];
  totalServices: number;
  totalMonitored: number;
  now: Date;
}) {
  const [query, setQuery] = useState('');
  const [openGroups, setOpenGroups] = useState<Set<string>>(() => new Set(groups.map((group) => group.id)));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable;
      if (event.key === '/' && !typing) {
        event.preventDefault();
        inputRef.current?.focus();
      }
      if (event.key === 'Escape' && typing) {
        setQuery('');
        inputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const normalizedQuery = query.trim().toLowerCase();

  const filteredGroups = useMemo(() => {
    if (!normalizedQuery) return groups;

    return groups
      .map((group) => {
        const groupMatches = `${group.name} ${group.description ?? ''}`.toLowerCase().includes(normalizedQuery);
        const services = groupMatches
          ? group.services
          : group.services.filter((service) =>
              `${service.name} ${service.description ?? ''}`.toLowerCase().includes(normalizedQuery),
            );
        return { ...group, services };
      })
      .filter((group) => group.services.length > 0);
  }, [groups, normalizedQuery]);

  const matchCount = filteredGroups.reduce((total, group) => total + group.services.length, 0);

  const toggleGroup = (id: string) => {
    setOpenGroups((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAll = () => setOpenGroups(new Set(groups.map((group) => group.id)));
  const collapseAll = () => setOpenGroups(new Set());

  return (
    <div>
      <div className="flex flex-col gap-4 fh-panel border border-line bg-surface p-4 sm:flex-row sm:items-center sm:gap-3">
        <div className="relative flex-1">
          <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search services or groups"
            aria-label="Search services"
            className="fh-field w-full border border-line bg-paper/70 pl-10 pr-20 text-[17px] text-ink placeholder:text-muted/70 focus:border-ink focus:outline-none"
          />
          <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[13px] text-muted">
            {query ? (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="pointer-events-auto fh-pill px-2 hover:bg-ink/5"
              >
                Clear
              </button>
            ) : (
              <kbd className="fh-r-xs border border-line bg-surface px-1.5 py-0.5">/</kbd>
            )}
          </span>
        </div>

        <div className="flex items-center gap-1 self-end sm:self-auto">
          <button
            type="button"
            onClick={expandAll}
            className="fh-btn px-3 text-muted transition-colors hover:bg-ink/5 hover:text-ink"
          >
            Expand all
          </button>
          <button
            type="button"
            onClick={collapseAll}
            className="fh-btn px-3 text-muted transition-colors hover:bg-ink/5 hover:text-ink"
          >
            Collapse
          </button>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between px-1 font-sans text-[13px] text-muted">
        <span>
          {normalizedQuery
            ? `${matchCount} match${matchCount === 1 ? '' : 'es'} for “${query.trim()}”`
            : `${totalServices} services · ${totalMonitored} with automated checks`}
        </span>
        <span className="hidden sm:inline">UTC day buckets</span>
      </div>

      {filteredGroups.length === 0 ? (
        <EmptyState
          className="mt-4"
          title="No services match"
          description={`Nothing under “${query.trim()}”. Clear the search to see every FastHand service.`}
        />
      ) : (
        <div className="mt-4 space-y-5">
          {filteredGroups.map((group) => {
            const isOpen = normalizedQuery ? true : openGroups.has(group.id);
            return (
              <section
                key={group.id}
                id={`group-${group.slug}`}
                className="scroll-mt-28 overflow-visible fh-panel border border-line bg-surface"
              >
                <button
                  type="button"
                  onClick={() => toggleGroup(group.id)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center gap-4 px-4 py-4 text-left sm:px-5"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-sans text-[18px] font-semibold tracking-[-0.03em]">
                        {group.name}
                      </h2>
                      <StatusPill state={group.worst} size="sm" />
                    </div>
                    {group.description && (
                      <p className="mt-1 text-[15px] leading-relaxed text-muted">{group.description}</p>
                    )}
                  </div>
                  <span className="hidden shrink-0 font-sans text-[13px] text-muted sm:inline">
                    {group.monitoredCount}/{group.services.length} checked
                  </span>
                  <ChevronDownIcon
                    className={cn(
                      'h-4 w-4 shrink-0 text-muted transition-transform duration-200',
                      isOpen && 'rotate-180',
                    )}
                  />
                </button>

                {isOpen && (
                  <div className="border-t border-line/70">
                    {group.services.map((service) => (
                      <div
                        key={service.id}
                        id={`service-${service.slug}`}
                        className="scroll-mt-28 border-b border-line/60 px-4 py-5 last:border-b-0 sm:px-5"
                      >
                        <div className="grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(340px,1.05fr)] xl:items-center xl:gap-8">
                          <div className="flex min-w-0 items-start gap-3">
                            <ServiceIcon slug={service.slug} />
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="text-[16px] font-medium tracking-[-0.01em]">
                                  {service.name}
                                </h3>
                                <StatusPill state={service.health.state} size="sm" />
                              </div>
                              {service.description && (
                                <p className="mt-1 text-[15px] leading-relaxed text-muted">
                                  {service.description}
                                </p>
                              )}
                              <p className="mt-1.5 text-[15px] text-muted/90">{service.health.detail}</p>
                            </div>
                          </div>

                          <div>
                            <UptimeBars bars={service.bars} label={service.name} />

                            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5">
                              {windows(service).map(({ label, window }) => (
                                <span key={label} className="inline-flex items-baseline gap-1">
                                  <span className="font-sans text-[15px] text-ink/85">
                                    {formatUptime(window.percent)}
                                  </span>
                                  <span className="font-sans text-[13px] text-muted">
                                    {label}
                                  </span>
                                </span>
                              ))}
                              <span className="ml-auto text-[13px] text-muted">
                                {service.lastCheckAt
                                  ? `Checked ${formatRelativeTime(service.lastCheckAt, now)}`
                                  : 'No checks recorded'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
