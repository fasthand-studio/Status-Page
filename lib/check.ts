export interface CheckTarget {
  url: string;
  method?: 'GET' | 'HEAD';
  expectedStatusMin?: number;
  expectedStatusMax?: number;
  expectedText?: string | null;
  timeoutMs?: number;
}

export interface CheckOutcome {
  ok: boolean;
  statusCode: number | null;
  responseTimeMs: number;
  error: string | null;
  bodyExcerpt: string | null;
  checkedAt: string;
}

const MAX_BODY_BYTES = 64 * 1024;
const EXCERPT_LENGTH = 280;

// Data-center endpoints sit behind Cloudflare, which challenges non-browser
// clients from CI IP ranges. Send a normal browser request instead.
const REQUEST_HEADERS = {
  accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'accept-language': 'en-US,en;q=0.9',
  'user-agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
};

function normalizeText(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

async function readBodyCapped(response: Response): Promise<string> {
  if (!response.body) return '';
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let result = '';
  let bytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      result += decoder.decode(value, { stream: true });
      if (bytes >= MAX_BODY_BYTES) {
        await reader.cancel();
        break;
      }
    }
  } finally {
    reader.releaseLock();
  }

  return result + decoder.decode();
}

export async function performHttpCheck(
  target: CheckTarget,
  options: { fetchImpl?: typeof fetch; now?: Date } = {},
): Promise<CheckOutcome> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const now = options.now ?? new Date();
  const timeoutMs = target.timeoutMs ?? 10000;
  const expectedMin = target.expectedStatusMin ?? 200;
  const expectedMax = target.expectedStatusMax ?? 299;
  const method = target.method ?? 'GET';
  const started = Date.now();

  let parsed: URL;
  try {
    parsed = new URL(target.url);
  } catch {
    return {
      ok: false,
      statusCode: null,
      responseTimeMs: 0,
      error: 'Invalid monitor URL.',
      bodyExcerpt: null,
      checkedAt: now.toISOString(),
    };
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return {
      ok: false,
      statusCode: null,
      responseTimeMs: 0,
      error: 'Monitor URL must use http or https.',
      bodyExcerpt: null,
      checkedAt: now.toISOString(),
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchImpl(parsed, {
      method,
      redirect: 'follow',
      signal: controller.signal,
      headers: REQUEST_HEADERS,
      cache: 'no-store',
    });

    const body = method === 'HEAD' ? '' : await readBodyCapped(response);
    const responseTimeMs = Date.now() - started;
    const statusOk = response.status >= expectedMin && response.status <= expectedMax;

    let error: string | null = null;
    if (!statusOk) {
      error = `HTTP ${response.status} outside expected range ${expectedMin}–${expectedMax}.`;
    }

    if (!error && target.expectedText) {
      const expected = normalizeText(target.expectedText);
      const matches = normalizeText(body).includes(expected);
      if (!matches) {
        error = 'Response text did not match the expected phrase.';
      }
    }

    return {
      ok: error === null,
      statusCode: response.status,
      responseTimeMs,
      error,
      bodyExcerpt: error === null ? null : normalizeText(body).slice(0, EXCERPT_LENGTH) || null,
      checkedAt: now.toISOString(),
    };
  } catch (caught) {
    const responseTimeMs = Date.now() - started;
    const timedOut = controller.signal.aborted;
    const message =
      caught instanceof Error ? caught.message.slice(0, 200) : 'Unknown network failure.';
    return {
      ok: false,
      statusCode: null,
      responseTimeMs,
      error: timedOut ? `Check timed out after ${timeoutMs} ms.` : `Network error: ${message}`,
      bodyExcerpt: null,
      checkedAt: now.toISOString(),
    };
  } finally {
    clearTimeout(timer);
  }
}
