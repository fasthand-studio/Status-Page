import { z } from 'zod';
import { getAdminContext } from '@/lib/auth';
import { draftThrottle } from '@/lib/draft-throttle';
import {
  draftIncidentCopy,
  isWriterConfigured,
  NOTES_LIMIT,
  TITLE_LIMIT,
  WriterError,
} from '@/lib/incident-writer';
import { INCIDENT_IMPACTS, INCIDENT_STATUSES, MAINTENANCE_STATUSES } from '@/lib/validation';

export const dynamic = 'force-dynamic';

const MAX_BODY_BYTES = 8 * 1024;

const notes = z
  .string()
  .trim()
  .min(12, 'Describe the issue in a sentence first.')
  .max(NOTES_LIMIT, `Keep the notes under ${NOTES_LIMIT} characters.`);

const draftSchema = z.discriminatedUnion('mode', [
  z.object({
    mode: z.enum(['incident', 'update']),
    notes,
    status: z.enum(INCIDENT_STATUSES),
    impact: z.enum(INCIDENT_IMPACTS).optional(),
    services: z.array(z.string().trim().max(80)).max(20).optional(),
    incidentTitle: z.string().trim().max(TITLE_LIMIT).optional(),
  }),
  z.object({
    mode: z.literal('maintenance'),
    notes,
    status: z.enum(MAINTENANCE_STATUSES),
    services: z.array(z.string().trim().max(80)).max(20).optional(),
    scheduledFor: z.string().trim().max(160).optional(),
  }),
]);

const STATUS_BY_FAILURE = {
  'missing-key': 503,
  unauthorized: 502,
  'rate-limited': 429,
  timeout: 504,
  'bad-output': 502,
  'model-unavailable': 502,
  'provider-error': 502,
} as const;

function isSameOrigin(request: Request): boolean {
  const site = request.headers.get('sec-fetch-site');
  if (site) return site === 'same-origin' || site === 'same-site';

  const origin = request.headers.get('origin');
  if (!origin) return true;
  try {
    return new URL(origin).host === new URL(request.url).host;
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  const context = await getAdminContext();
  if (context.status !== 'admin') {
    return Response.json({ error: 'Sign in as an admin to draft copy.' }, { status: 401 });
  }

  if (!isWriterConfigured()) {
    return Response.json(
      { error: 'The draft writer is not configured. Add the GROQ environment variable.' },
      { status: 503 },
    );
  }

  if (!isSameOrigin(request)) {
    return Response.json({ error: 'Draft requests must come from the ops desk.' }, { status: 403 });
  }

  const declaredSize = Number(request.headers.get('content-length') ?? '0');
  if (declaredSize > MAX_BODY_BYTES) {
    return Response.json({ error: 'That description is too long to draft from.' }, { status: 413 });
  }

  const throttle = draftThrottle(context.userId);
  if (throttle.limited) {
    return Response.json(
      { error: 'Too many drafts in a row. Wait before writing another one.' },
      { status: 429, headers: { 'retry-after': String(throttle.retryAfterSeconds) } },
    );
  }

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) {
    return Response.json({ error: 'That description is too long to draft from.' }, { status: 413 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return Response.json({ error: 'Send a JSON body.' }, { status: 400 });
  }

  const parsed = draftSchema.safeParse(payload);
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? 'Check the draft request.' },
      { status: 400 },
    );
  }

  try {
    const draft = await draftIncidentCopy(parsed.data);
    return Response.json(draft, { headers: { 'cache-control': 'no-store' } });
  } catch (caught) {
    if (caught instanceof WriterError) {
      return Response.json(
        { error: caught.message },
        { status: STATUS_BY_FAILURE[caught.code], headers: { 'cache-control': 'no-store' } },
      );
    }
    console.error('[writer] unexpected failure:', caught instanceof Error ? caught.message : caught);
    return Response.json({ error: 'Could not draft the copy.' }, { status: 500 });
  }
}
