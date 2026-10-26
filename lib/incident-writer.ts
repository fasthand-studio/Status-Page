import type { IncidentImpact, IncidentStatus } from './types';
import { INCIDENT_IMPACT_LABELS, INCIDENT_STATUS_LABELS } from './validation';

const CHAT_URL = 'https://api.groq.com/openai/v1/chat/completions';
const FALLBACK_MODEL = 'llama-3.1-8b-instant';
const TIMEOUT_MS = 20_000;

export const NOTES_LIMIT = 1500;
export const TITLE_LIMIT = 140;
export const BODY_LIMIT = 4000;

export type DraftMode = 'incident' | 'update';

export interface DraftInput {
  mode: DraftMode;
  notes: string;
  status: IncidentStatus;
  impact?: IncidentImpact;
  services?: string[];
  incidentTitle?: string;
}

export interface DraftResult {
  title: string | null;
  body: string;
}

export type WriterFailure =
  | 'missing-key'
  | 'unauthorized'
  | 'rate-limited'
  | 'timeout'
  | 'bad-output'
  | 'provider-error';

const FAILURES: Record<WriterFailure, string> = {
  'missing-key': 'The draft writer has no Groq key, so it cannot answer.',
  unauthorized: 'Groq rejected the key. Check the GROQ environment variable in Vercel.',
  'rate-limited': 'Groq is rate limiting this workspace. Try again in a minute.',
  timeout: 'Groq did not answer in time. Try again.',
  'bad-output': 'The draft came back unreadable. Add a little more detail and try again.',
  'provider-error': 'Groq refused the request.',
};

export class WriterError extends Error {
  readonly code: WriterFailure;

  constructor(code: WriterFailure, detail?: string) {
    super(detail ? `${FAILURES[code]} (${detail})` : FAILURES[code]);
    this.name = 'WriterError';
    this.code = code;
  }
}

export function writerModel(): string {
  return process.env.GROQ_MODEL?.trim() || FALLBACK_MODEL;
}

export function isWriterConfigured(): boolean {
  return Boolean(process.env.GROQ?.trim());
}

const VOICE: Record<IncidentStatus, string> = {
  investigating:
    'Say what customers are seeing and that the team is looking into it. Do not name a cause unless the notes do.',
  identified:
    'Say the cause only if the notes state it, what is being done now, and what customers should expect.',
  monitoring:
    'Say a fix has been applied and results are being watched. Do not promise it will hold.',
  resolved:
    'Say the problem is fixed and what to do if the customer is still affected. No future promises.',
};

export function buildMessages(input: DraftInput): { role: string; content: string }[] {
  const lines = [
    `Mode: ${input.mode === 'incident' ? 'new incident' : 'timeline update'}`,
    `Status: ${INCIDENT_STATUS_LABELS[input.status]}`,
  ];

  if (input.mode === 'update' && input.incidentTitle) {
    lines.push(`Incident: ${input.incidentTitle}`);
  }
  if (input.impact) {
    lines.push(`Impact: ${INCIDENT_IMPACT_LABELS[input.impact]}`);
  }
  const services = (input.services ?? []).filter((name) => name.trim()).slice(0, 20);
  if (services.length > 0) {
    lines.push(`Affected services: ${services.join(', ')}`);
  }
  lines.push(`Voice for this status: ${VOICE[input.status]}`);
  lines.push(`Operator notes (the only facts available): ${input.notes.trim()}`);

  const replyFormat =
    input.mode === 'incident'
      ? 'Reply in plain text with exactly two blocks, no code fences:\nTITLE: <title on one line>\nBODY: <the update>'
      : 'Reply in plain text with exactly one block, no code fences:\nBODY: <the update>';

  return [
    {
      role: 'system',
      content: [
        'You write public status-page copy for FastHand, a marketplace for digital services.',
        '',
        'Rules:',
        '- Use only the facts in the operator notes. Never invent a cause, component, duration, error rate, percentage, customer count, or next-update time.',
        '- If the notes do not explain why something broke, say the cause is still being determined. Do not guess.',
        '- Write for a customer reading the page in the middle of the problem: plain sentences, present tense, second person for what they see, no jargon, no blame, no emoji, no exclamation marks.',
        '- No markdown headings, links, or bullet lists. One short paragraph of two to four sentences.',
        '- The title names the affected service and the symptom, sentence case, under 140 characters, and does not contain a status word.',
        '',
        replyFormat,
      ].join('\n'),
    },
    { role: 'user', content: lines.join('\n') },
  ];
}

function clean(value: string, limit: number): string {
  return value
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, limit);
}

export function parseDraft(raw: string, mode: DraftMode): DraftResult {
  const text = raw.replace(/^[ \t]*```[a-z]*[ \t]*$/gim, '').trim();

  const bodyMatch = /BODY\s*:([\s\S]*)$/im.exec(text);
  const titleMatch = /^[ \t]*TITLE\s*:([^\n]*)/im.exec(text);

  const bodySource =
    bodyMatch?.[1] ??
    (titleMatch ? text.slice(titleMatch.index + titleMatch[0].length) : text);

  const body = clean(bodySource, BODY_LIMIT);
  if (!body) throw new WriterError('bad-output');
  if (mode !== 'incident') return { title: null, body };

  const title = clean(titleMatch?.[1] ?? '', TITLE_LIMIT);
  if (title.length < 3) throw new WriterError('bad-output');

  return { title, body };
}

async function readFailure(response: Response): Promise<string> {
  const body = (await response.text().catch(() => '')).slice(0, 500);
  let message = body.trim();
  try {
    const parsed = JSON.parse(body) as { error?: { message?: string; code?: string } };
    message = [parsed.error?.message, parsed.error?.code].filter(Boolean).join(' · ');
  } catch {
    // Groq answered with a non-JSON body; the raw text is the best clue.
  }
  return `Groq HTTP ${response.status}${message ? `: ${message.slice(0, 200)}` : ''}`;
}

export async function draftIncidentCopy(input: DraftInput): Promise<DraftResult> {
  const apiKey = process.env.GROQ?.trim() ?? '';
  if (!apiKey) throw new WriterError('missing-key');

  let response: Response;
  try {
    response = await fetch(CHAT_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: writerModel(),
        messages: buildMessages(input),
        temperature: 0.2,
        max_tokens: 500,
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (caught) {
    const timedOut = caught instanceof Error && caught.name === 'TimeoutError';
    if (timedOut) throw new WriterError('timeout');
    throw new WriterError('provider-error', caught instanceof Error ? caught.message : 'fetch failed');
  }

  if (response.status === 401 || response.status === 403) throw new WriterError('unauthorized');
  if (response.status === 429) throw new WriterError('rate-limited');
  if (!response.ok) {
    const detail = await readFailure(response);
    console.error(`[writer] ${detail}`);
    throw new WriterError('provider-error', detail);
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new WriterError('bad-output');
  }

  const content = (payload as { choices?: { message?: { content?: unknown } }[] })?.choices?.[0]?.message
    ?.content;
  if (typeof content !== 'string') throw new WriterError('bad-output');

  return parseDraft(content, input.mode);
}
