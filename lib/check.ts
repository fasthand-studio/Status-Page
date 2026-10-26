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
const MAX_REDIRECTS = 5;

const REQUEST_HEADERS = {
  accept: 'text/plain,text/html;q=0.9,*/*;q=0.8',
  'user-agent': 'FastHand-Status-Monitor/1.0 (+https://status.fasthandstudio.asia)',
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

const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'metadata',
  'metadata.goog',
  'metadata.google.internal',
  'instance-data',
]);

const BLOCKED_HOST_SUFFIXES = ['.local', '.internal', '.localhost', '.home.arpa'];

/*
 * Monitors are fetched from the same runtime that holds the service-role key, so
 * a monitor URL is an SSRF vector even though only admins can set one. Block
 * loopback, private, link-local, metadata and reserved ranges. A public hostname
 * that resolves into one of those ranges is not caught here: resolving DNS first
 * would make a DNS outage look like a service outage.
 */
export function isPrivateTarget(rawHostname: string): boolean {
  const host = rawHostname.replace(/^\[|\]$/g, '').toLowerCase().replace(/\.$/, '');
  if (BLOCKED_HOSTNAMES.has(host)) return true;
  if (BLOCKED_HOST_SUFFIXES.some((suffix) => host.endsWith(suffix))) return true;

  const candidate = /^::ffff:(.+)$/.exec(host)?.[1] ?? host;

  const ipv4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(candidate);
  if (ipv4) {
    const octets = ipv4.slice(1).map(Number);
    if (octets.some((part) => part > 255)) return true;
    const [first, second] = octets;
    if (first === 0 || first === 10 || first === 127) return true;
    if (first === 100 && second >= 64 && second <= 127) return true;
    if (first === 169 && second === 254) return true;
    if (first === 172 && second >= 16 && second <= 31) return true;
    if (first === 192 && second === 168) return true;
    if (first === 198 && (second === 18 || second === 19)) return true;
    return first >= 224;
  }

  if (candidate.includes(':')) {
    if (candidate === '::' || candidate === '::1') return true;
    if (/^f[cd][0-9a-f]{2}:/i.test(candidate)) return true;
    if (/^fe[89ab][0-9a-f]:/i.test(candidate)) return true;
    if (/^ff/i.test(candidate)) return true;
  }

  return false;
}

function isHttpProtocol(protocol: string): boolean {
  return protocol === 'https:' || protocol === 'http:';
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

  const refused = (error: string): CheckOutcome => ({
    ok: false,
    statusCode: null,
    responseTimeMs: 0,
    error,
    bodyExcerpt: null,
    checkedAt: now.toISOString(),
  });

  let parsed: URL;
  try {
    parsed = new URL(target.url);
  } catch {
    return refused('Invalid monitor URL.');
  }

  if (!isHttpProtocol(parsed.protocol)) {
    return refused('Monitor URL must use http or https.');
  }
  if (isPrivateTarget(parsed.hostname)) {
    return refused('Monitor URL points at a private or reserved address.');
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const request = (url: URL) =>
      fetchImpl(url, {
        method,
        redirect: 'manual',
        signal: controller.signal,
        headers: REQUEST_HEADERS,
        cache: 'no-store',
      });

    let url = parsed;
    let response = await request(url);
    let hops = 0;

    // Follow redirects by hand so every hop is checked, not only the first URL.
    while (response.status >= 300 && response.status <= 399) {
      const location = response.headers.get('location');
      if (!location) break;
      if (hops >= MAX_REDIRECTS) {
        return refused(`The site redirected more than ${MAX_REDIRECTS} times.`);
      }

      await response.body?.cancel().catch(() => undefined);

      let next: URL;
      try {
        next = new URL(location, url);
      } catch {
        return refused('The site redirected to a URL that is not valid.');
      }
      if (!isHttpProtocol(next.protocol)) {
        return refused('The site redirected away from http or https.');
      }
      if (isPrivateTarget(next.hostname)) {
        return refused('The site redirects to a private or reserved address.');
      }

      url = next;
      hops += 1;
      response = await request(url);
    }

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
