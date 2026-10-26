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
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search services or groups"
            aria-label="Search services"
            className="fh-field w-full border border-line bg-surface pl-8 pr-16 text-[15px] text-ink placeholder:text-muted/70 focus:border-primary focus:outline-none"
          />
          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2">
            {query ? (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="fh-pill pointer-events-auto px-2 text-[14px] text-muted hover:bg-surface-soft hover:text-ink"
              >
                Clear
              </button>
            ) : (
              <kbd className="fh-pill border border-line bg-surface-soft px-2 text-[14px] text-muted">/</kbd>
            )}
          </span>
        </div>

        <div className="flex items-center gap-3 self-end text-[14px] text-muted sm:self-auto">
          <button type="button" onClick={expandAll} className="hover:text-ink">
            Expand all
          </button>
          <span className="h-3 w-px bg-line" aria-hidden="true" />
          <button type="button" onClick={collapseAll} className="hover:text-ink">
            Collapse all
          </button>
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between text-[14px] text-muted">
        <span>
          {normalizedQuery
            ? `${matchCount} match${matchCount === 1 ? '' : 'es'} for “${query.trim()}”`
            : `${totalServices} services · ${totalMonitored} with automated checks`}
        </span>
        <span className="hidden sm:inline">Each bar is one UTC day</span>
      </div>

      {filteredGroups.length === 0 ? (
        <EmptyState
          className="mt-3"
          title="No services match"
          description={`Nothing under “${query.trim()}”. Clear the search to see every FastHand service.`}
        />
      ) : (
        <div className="mt-3 space-y-3">
          {filteredGroups.map((group) => {
            const isOpen = normalizedQuery ? true : openGroups.has(group.id);
            return (
              <section
                key={group.id}
                id={`group-${group.slug}`}
                className="scroll-mt-24 overflow-hidden fh-panel border border-line bg-surface"
              >
                <button
                  type="button"
                  onClick={() => toggleGroup(group.id)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left transition-colors hover:bg-surface-soft"
                >
                  <h2 className="text-[17px] font-semibold">{group.name}</h2>
                  <StatusPill state={group.worst} />
                  {group.description && (
                    <span className="hidden min-w-0 truncate text-[14px] text-muted lg:inline">
                      {group.description}
                    </span>
                  )}
                  <span className="ml-auto hidden shrink-0 text-[14px] text-muted sm:inline">
                    {group.monitoredCount}/{group.services.length} checked
                  </span>
                  <ChevronDownIcon
                    className={cn(
                      'ml-1 h-3.5 w-3.5 shrink-0 text-muted transition-transform duration-200',
                      isOpen && 'rotate-180',
                    )}
                  />
                </button>

                {isOpen && (
                  <div className="border-t border-line">
                    {group.services.map((service) => (
                      <details
                        key={service.id}
                        id={`service-${service.slug}`}
                        className="group scroll-mt-24 border-b border-line last:border-b-0"
                      >
                        <summary className="grid cursor-pointer list-none grid-cols-[20px_minmax(0,1fr)_16px] items-center gap-x-2.5 px-3 py-2.5 transition-colors sm:px-3.5 sm:py-3 hover:bg-surface-soft md:grid-cols-[20px_minmax(0,1fr)_262px_88px_16px] [&::-webkit-details-marker]:hidden">
                          <ServiceIcon slug={service.slug} />
                          <div className="min-w-0">
                            <span className="block truncate text-[17px] font-medium">{service.name}</span>
                            <div className="mt-1">
                              <StatusPill state={service.health.state} />
                            </div>
                            <span className="mt-1 block truncate text-[14px] text-muted">
                              {service.lastCheckAt
                                ? `Checked ${formatRelativeTime(service.lastCheckAt, now)}`
                                : 'No checks recorded'}
                            </span>
                          </div>
                          <div className="hidden md:block">
                            <UptimeBars bars={service.bars} label={service.name} compact showLabels={false} />
                          </div>
                          <div className="hidden text-right md:block">
                            <span className="fh-num block text-[15px] text-ink/85">
                              {formatUptime(service.uptime90.percent)}
                            </span>
                            <span className="block text-[14px] text-muted">90d</span>
                          </div>
                          <ChevronDownIcon className="h-3.5 w-3.5 text-muted transition-transform group-open:rotate-180" />
                        </summary>

                        <div className="border-t border-line bg-surface-soft px-3.5 py-3 md:pl-[44px]">
                          {service.description && (
                            <p className="text-[15px] leading-relaxed text-muted">{service.description}</p>
                          )}
                          <p className="mt-1 text-[14px] leading-relaxed text-ink/75">{service.health.detail}</p>
                          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[14px] text-muted">
                            {windows(service).map(({ label, window }) => (
                              <span key={label} className="inline-flex items-baseline gap-1">
                                <span className="fh-num text-[15px] text-ink/85">
                                  {formatUptime(window.percent)}
                                </span>
                                {label}
                              </span>
                            ))}
                            <span className="ml-auto">
                              {service.lastCheckAt
                                ? `Last check ${formatRelativeTime(service.lastCheckAt, now)}`
                                : 'No verified monitor'}
                            </span>
                          </div>
                          <div className="mt-2 md:hidden">
                            <UptimeBars bars={service.bars} label={service.name} compact showLabels={false} />
                          </div>
                        </div>
                      </details>
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
