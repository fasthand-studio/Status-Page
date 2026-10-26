const WINDOW_MS = 10 * 60 * 1000;
const MAX_DRAFTS_PER_WINDOW = 10;

/*
 * Groq bills per call, so the draft endpoint is capped per admin. This tracks
 * hits in the process, which on serverless means per warm instance: it stops a
 * stuck or enthusiastic operator, it does not replace Groq's own limits.
 */
const hits = new Map<string, number[]>();

export function draftThrottle(
  key: string,
  now: number = Date.now(),
): { limited: boolean; retryAfterSeconds: number } {
  const recent = (hits.get(key) ?? []).filter((at) => now - at < WINDOW_MS);

  if (recent.length >= MAX_DRAFTS_PER_WINDOW) {
    hits.set(key, recent);
    return {
      limited: true,
      retryAfterSeconds: Math.max(1, Math.ceil((WINDOW_MS - (now - recent[0])) / 1000)),
    };
  }

  recent.push(now);
  hits.set(key, recent);
  return { limited: false, retryAfterSeconds: 0 };
}
