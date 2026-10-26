import { z } from 'zod';
import { getAdminContext } from '@/lib/auth';
import {
  draftIncidentCopy,
  isWriterConfigured,
  NOTES_LIMIT,
  TITLE_LIMIT,
  WriterError,
} from '@/lib/incident-writer';
import { INCIDENT_IMPACTS, INCIDENT_STATUSES } from '@/lib/validation';

export const dynamic = 'force-dynamic';

const draftSchema = z.object({
  mode: z.enum(['incident', 'update']),
  notes: z
    .string()
    .trim()
    .min(12, 'Describe the issue in a sentence first.')
    .max(NOTES_LIMIT, `Keep the notes under ${NOTES_LIMIT} characters.`),
  status: z.enum(INCIDENT_STATUSES),
  impact: z.enum(INCIDENT_IMPACTS).optional(),
  services: z.array(z.string().trim().max(80)).max(20).optional(),
  incidentTitle: z.string().trim().max(TITLE_LIMIT).optional(),
});

const STATUS_BY_FAILURE = {
  'missing-key': 503,
  unauthorized: 502,
  'rate-limited': 429,
  timeout: 504,
  'bad-output': 502,
  'provider-error': 502,
} as const;

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

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: 'Send a JSON body.' }, { status: 400 });
  }

  const parsed = draftSchema.safeParse(payload);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? 'Check the draft request.' }, { status: 400 });
  }

  try {
    const draft = await draftIncidentCopy(parsed.data);
    return Response.json(draft);
  } catch (caught) {
    if (caught instanceof WriterError) {
      return Response.json({ error: caught.message }, { status: STATUS_BY_FAILURE[caught.code] });
    }
    console.error('[writer] unexpected failure:', caught instanceof Error ? caught.message : caught);
    return Response.json({ error: 'Could not draft the copy.' }, { status: 500 });
  }
}
