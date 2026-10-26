'use client';

import { useState } from 'react';
import type { DraftMode } from '@/lib/incident-writer';
import type { IncidentImpact, IncidentStatus } from '@/lib/types';
import { PencilIcon } from '@/components/icons';
import { cn } from '@/lib/cn';
import { adminHintClass, adminLabelClass, secondaryButtonClass } from './ui';

export interface WrittenDraft {
  title: string | null;
  body: string;
  model?: string;
}

export function DraftWriter({
  mode,
  status,
  impact,
  services,
  incidentTitle,
  onDraft,
}: {
  mode: DraftMode;
  status: IncidentStatus;
  impact?: IncidentImpact;
  services?: string[];
  incidentTitle?: string;
  onDraft: (draft: WrittenDraft) => void;
}) {
  const [notes, setNotes] = useState('');
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ tone: 'ok' | 'bad'; text: string } | null>(null);

  async function write() {
    setPending(true);
    setMessage(null);
    try {
      const response = await fetch('/api/incident-draft', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ mode, status, impact, services, incidentTitle, notes }),
      });
      const payload = (await response.json()) as WrittenDraft & { error?: string };
      if (!response.ok) {
        setMessage({ tone: 'bad', text: payload.error ?? 'Could not reach the draft writer.' });
        return;
      }
      onDraft({ title: payload.title ?? null, body: payload.body });
      setMessage({
        tone: 'ok',
        text: `Written into the fields by ${payload.model ?? 'Groq'}. Correct anything that is not true before publishing.`,
      });
    } catch {
      setMessage({ tone: 'bad', text: 'Could not reach the draft writer. Try again.' });
    } finally {
      setPending(false);
    }
  }

  const ready = notes.trim().length >= 12;

  return (
    <div className="fh-r-sm border border-line bg-paper px-2.5 py-2">
      <label htmlFor="draft-notes" className={adminLabelClass}>
        <span>What is the issue?</span>
        <span className="text-[14px] font-normal text-ink/70">Required</span>
      </label>
      <textarea
        id="draft-notes"
        rows={3}
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
        placeholder="Write it the way you would tell a colleague. The draft turns that into customer-facing copy."
        className="mt-1.5 w-full fh-r-sm border border-line bg-surface px-2.5 py-2 text-[15px] leading-relaxed text-ink placeholder:text-muted/70 transition-colors focus:border-primary focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      />
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={write}
          disabled={pending || !ready}
          className={cn(secondaryButtonClass, 'px-2.5 text-[15px]')}
        >
          <PencilIcon className="h-3.5 w-3.5" />
          {pending ? 'Drafting…' : 'Draft the copy'}
        </button>
        {message ? (
          <p
            role={message.tone === 'bad' ? 'alert' : 'status'}
            className={cn(
              'text-[14px] leading-relaxed',
              message.tone === 'bad' ? 'text-bad' : 'text-muted',
              'min-w-0 flex-1',
            )}
          >
            {message.text}
          </p>
        ) : (
          <p className={cn(adminHintClass, 'min-w-0 flex-1')}>
            Drafting only fills the fields. Nothing is published until you press Publish.
          </p>
        )}
      </div>
    </div>
  );
}
