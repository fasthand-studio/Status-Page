import test from 'node:test';
import assert from 'node:assert/strict';
import { performHttpCheck } from '../lib/check';

const now = new Date('2026-10-25T12:00:00.000Z');

function fakeFetch(handler: () => Promise<Response> | Response): typeof fetch {
  return (async () => handler()) as typeof fetch;
}

test('passes when the status and expected phrase match', async () => {
  const outcome = await performHttpCheck(
    {
      url: 'https://example.com/isitonline',
      expectedText: 'Hey bro iam online',
      timeoutMs: 1000,
    },
    {
      fetchImpl: fakeFetch(() => new Response('Hey   bro\niam online', { status: 200 })),
      now,
    },
  );
  assert.equal(outcome.ok, true);
  assert.equal(outcome.statusCode, 200);
  assert.equal(outcome.error, null);
  assert.equal(outcome.checkedAt, now.toISOString());
});

test('fails when the expected phrase is missing and keeps a short excerpt', async () => {
  const outcome = await performHttpCheck(
    {
      url: 'https://example.com/isitonline',
      expectedText: 'Hey bro iam online',
      timeoutMs: 1000,
    },
    {
      fetchImpl: fakeFetch(() => new Response('maintenance in progress', { status: 200 })),
      now,
    },
  );
  assert.equal(outcome.ok, false);
  assert.match(outcome.error ?? '', /did not match/);
  assert.equal(outcome.bodyExcerpt, 'maintenance in progress');
});

test('fails when the status is outside the expected range', async () => {
  const outcome = await performHttpCheck(
    { url: 'https://example.com/health', expectedStatusMin: 200, expectedStatusMax: 299 },
    { fetchImpl: fakeFetch(() => new Response('bad gateway', { status: 503 })), now },
  );
  assert.equal(outcome.ok, false);
  assert.match(outcome.error ?? '', /HTTP 503/);
});

test('records a network failure without throwing', async () => {
  const outcome = await performHttpCheck(
    { url: 'https://example.com/health' },
    {
      fetchImpl: fakeFetch(() => Promise.reject(new Error('ECONNREFUSED'))),
      now,
    },
  );
  assert.equal(outcome.ok, false);
  assert.match(outcome.error ?? '', /Network error: ECONNREFUSED/);
  assert.equal(outcome.statusCode, null);
});

test('times out after the configured budget', async () => {
  const hang = ((_: unknown, init?: RequestInit) =>
    new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new Error('aborted')));
    })) as typeof fetch;

  const outcome = await performHttpCheck(
    { url: 'https://example.com/health', timeoutMs: 20 },
    { fetchImpl: hang, now },
  );
  assert.equal(outcome.ok, false);
  assert.match(outcome.error ?? '', /timed out after 20 ms/);
});

test('rejects an invalid URL before making a request', async () => {
  const outcome = await performHttpCheck({ url: 'not-a-url' }, { now });
  assert.equal(outcome.ok, false);
  assert.equal(outcome.error, 'Invalid monitor URL.');
});
