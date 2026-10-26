'use client';

import { useState } from 'react';
import { cn } from '@/lib/cn';

export interface ServiceOption {
  id: string;
  name: string;
  groupName?: string;
}

export function ServiceCheckboxes({
  services,
  defaultSelected = [],
  name = 'service_ids',
  label = 'Affected services',
}: {
  services: ServiceOption[];
  defaultSelected?: string[];
  name?: string;
  label?: string;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set(defaultSelected));

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function setAll(values: string[]) {
    setSelected(new Set(values));
  }

  const grouped = new Map<string, ServiceOption[]>();
  for (const service of services) {
    const key = service.groupName ?? '';
    grouped.set(key, [...(grouped.get(key) ?? []), service]);
  }

  if (services.length === 0) {
    return (
      <div className="fh-r-sm border border-dashed border-line px-3 py-2 text-[14px] text-muted">
        No services exist yet. Create a service first, then link it here.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-sans text-[14px] text-muted">
          {label}
          <span className="ml-2 font-sans text-[14px] font-semibold text-muted">
            {selected.size} selected
          </span>
        </p>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setAll(services.map((service) => service.id))}
            className="fh-btn px-2 text-muted transition-colors hover:bg-ink/5 hover:text-ink"
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setAll([])}
            className="fh-btn px-2 text-muted transition-colors hover:bg-ink/5 hover:text-ink"
          >
            None
          </button>
        </div>
      </div>

      <div className="grid gap-3 fh-r-sm border border-line bg-paper p-3 sm:grid-cols-2">
        {[...grouped.entries()].map(([groupName, groupServices]) => (
          <div key={groupName || 'ungrouped'} className="min-w-0">
            {groupName ? (
              <p className="mb-1.5 font-sans text-[14px] text-muted">
                {groupName}
              </p>
            ) : null}
            <div className="space-y-1">
              {groupServices.map((service) => {
                const checked = selected.has(service.id);
                return (
                  <label
                    key={service.id}
                    className={cn(
                      'fh-pill-lg w-full cursor-pointer justify-start gap-2.5 px-3 text-[15px] transition',
                      checked ? 'bg-primary/10 text-ink' : 'text-muted hover:bg-ink/5',
                    )}
                  >
                    <input
                      type="checkbox"
                      name={name}
                      value={service.id}
                      checked={checked}
                      onChange={() => toggle(service.id)}
                      className="h-4 w-4 shrink-0 accent-primary"
                    />
                    <span className="truncate">{service.name}</span>
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
