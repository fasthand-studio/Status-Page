'use client';

import { useId, useState } from 'react';
import { Markdown } from '@/components/markdown';
import { cn } from '@/lib/cn';
import { adminHintClass, adminLabelClass, adminTextareaClass } from './ui';

type Tab = 'write' | 'preview';

export function MarkdownField({
  name,
  label,
  defaultValue = '',
  placeholder = 'What is happening, what changed, and what customers should do.',
  hint,
  required = false,
  rows = 9,
}: {
  name: string;
  label: string;
  defaultValue?: string;
  placeholder?: string;
  hint?: string;
  required?: boolean;
  rows?: number;
}) {
  const id = useId();
  const [tab, setTab] = useState<Tab>('write');
  const [value, setValue] = useState(defaultValue);

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label htmlFor={id} className={adminLabelClass}>
          <span>{label}</span>
          <span
            className={cn(
              'font-sans text-[11.5px] font-semibold',
              required ? 'text-ink' : 'text-muted',
            )}
          >
            {required ? 'Required' : 'Optional'}
          </span>
        </label>
        <div
          role="tablist"
          aria-label="Editor mode"
          className="inline-flex fh-r-sm border border-line bg-paper p-0.5"
        >
          {(['write', 'preview'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              role="tab"
              aria-selected={tab === mode}
              onClick={() => setTab(mode)}
              className={cn(
                'fh-pill-lg px-3 capitalize transition-colors',
                tab === mode ? 'bg-primary font-semibold text-white' : 'text-muted hover:text-ink',
              )}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      <textarea
        id={id}
        name={name}
        rows={rows}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={placeholder}
        className={cn(adminTextareaClass, tab === 'preview' && 'hidden')}
      />

      {tab === 'preview' ? (
        <div className="min-h-[7rem] fh-r-sm border border-line bg-paper px-3 py-2">
          {value.trim() ? (
            <Markdown>{value}</Markdown>
          ) : (
            <p className="text-[11.5px] text-muted">Nothing to preview yet.</p>
          )}
        </div>
      ) : null}

      <p className={adminHintClass}>
        {hint ?? 'Markdown is supported: **bold**, lists, `code`, and [links](https://example.com). Raw HTML renders as text.'}
      </p>
    </div>
  );
}
