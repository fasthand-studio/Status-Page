import test from 'node:test';
import assert from 'node:assert/strict';
import { buildMessages, draftIncidentCopy, parseDraft, WriterError } from '../lib/incident-writer';

function userPrompt(input: Parameters<typeof buildMessages>[0]): string {
  const messages = buildMessages(input);
  return messages[messages.length - 1].content;
}

test('the incident prompt carries only the operator facts', () => {
  const prompt = userPrompt({
    mode: 'incident',
    notes: 'Seller panel logins fail for users in Dhaka since 09:20 UTC.',
    status: 'investigating',
    impact: 'major',
    services: ['Seller panel', 'Authentication'],
  });

  assert.match(prompt, /new incident/);
  assert.match(prompt, /Status: Investigating/);
  assert.match(prompt, /Impact: Major impact/);
  assert.match(prompt, /Affected services: Seller panel, Authentication/);
  assert.match(prompt, /Seller panel logins fail for users in Dhaka/);
});

test('an update prompt names the incident and omits the title instruction', () => {
  const prompt = userPrompt({
    mode: 'update',
    notes: 'Failures stopped after the connection pool was raised.',
    status: 'monitoring',
    incidentTitle: 'Seller panel login is slow',
  });

  assert.match(prompt, /timeline update/);
  assert.match(prompt, /Incident: Seller panel login is slow/);
  assert.match(prompt, /Status: Monitoring/);
  assert.doesNotMatch(prompt, /Affected services/);
});

test('the system prompt forbids invented causes', () => {
  const system = buildMessages({ mode: 'incident', notes: 'x', status: 'investigating' })[0].content;

  assert.match(system, /Use only the facts in the operator notes/);
  assert.match(system, /Never invent a cause/);
  assert.match(system, /still being determined/);
});

test('incident drafts keep a usable title and trimmed body', () => {
  const draft = parseDraft(
    JSON.stringify({
      title: '  Seller panel login is failing  ',
      body: 'We are investigating.\n\n\n\nSome trailing space  ',
    }),
    'incident',
  );

  assert.equal(draft.title, 'Seller panel login is failing');
  assert.equal(draft.body, 'We are investigating.\n\nSome trailing space');
});

test('update drafts never carry a title', () => {
  const draft = parseDraft(JSON.stringify({ title: 'Ignored', body: 'Cause found.' }), 'update');

  assert.equal(draft.title, null);
  assert.equal(draft.body, 'Cause found.');
});

test('a draft over the field limit is cut, not passed through', () => {
  const draft = parseDraft(
    JSON.stringify({ title: 'a'.repeat(300), body: 'b'.repeat(9000) }),
    'incident',
  );

  assert.equal(draft.title?.length, 140);
  assert.equal(draft.body.length, 4000);
});

test('unreadable provider output fails as a draft problem', () => {
  for (const raw of ['not json at all', '{"title":"Only a title"}', '{"body":"   "}', 'null']) {
    assert.throws(() => parseDraft(raw, 'incident'), WriterError);
  }
});

const request = {
  mode: 'incident' as const,
  notes: 'Checkout is timing out for everyone since 11:40 UTC.',
  status: 'investigating' as const,
};

test('the writer sends the key it was given and returns the parsed draft', async () => {
  process.env.GROQ = 'test-key';
  const original = globalThis.fetch;
  globalThis.fetch = (async (url: unknown, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body));
    assert.equal(String(url), 'https://api.groq.com/openai/v1/chat/completions');
    assert.equal(init?.method, 'POST');
    assert.equal(new Headers(init?.headers).get('authorization'), 'Bearer test-key');
    assert.equal(body.response_format.type, 'json_object');
    assert.equal(body.messages.length, 2);

    return new Response(
      JSON.stringify({
        choices: [{ message: { content: '{"title":"Checkout is timing out","body":"We are investigating."}' } }],
      }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    );
  }) as typeof fetch;

  try {
    assert.deepEqual(await draftIncidentCopy(request), {
      title: 'Checkout is timing out',
      body: 'We are investigating.',
    });
  } finally {
    globalThis.fetch = original;
    delete process.env.GROQ;
  }
});

test('a rate limit from Groq surfaces as a retryable failure', async () => {
  process.env.GROQ = 'test-key';
  const original = globalThis.fetch;
  globalThis.fetch = (async () => new Response('{}', { status: 429 })) as typeof fetch;

  try {
    await assert.rejects(() => draftIncidentCopy(request), (caught: unknown) => {
      assert.ok(caught instanceof WriterError);
      assert.equal(caught.code, 'rate-limited');
      return true;
    });
  } finally {
    globalThis.fetch = original;
    delete process.env.GROQ;
  }
});

test('the writer refuses to call Groq without a key', async () => {
  delete process.env.GROQ;

  await assert.rejects(() => draftIncidentCopy(request), (caught: unknown) => {
    assert.ok(caught instanceof WriterError);
    assert.equal(caught.code, 'missing-key');
    return true;
  });
});
