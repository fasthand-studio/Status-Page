import { timingSafeEqual } from 'node:crypto';
import { runScheduledChecks } from '@/lib/run-scheduled-checks';

export const dynamic = 'force-dynamic';

function isAuthorized(request: Request): boolean {
  const expected = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  const header = request.headers.get('authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!expected || token.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(token), Buffer.from(expected));
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const result = await runScheduledChecks({ source: 'pg-cron' });
    return Response.json(result);
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : 'Unknown failure';
    return Response.json({ error: message }, { status: 500 });
  }
}
